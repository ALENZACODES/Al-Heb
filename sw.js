/* Aleph service worker. Precache list comes from the generated precache-manifest.js
   (node tools/build-precache.mjs). Strategies:
   - navigation: network first, fall back to cached index.html, then offline.html
   - audio/images/fonts: cache first, filled at runtime (audio in alef-runtime-v1; the rest in the per-version alef-data-<version>, dropped on activate)
     Music (audio/music/*) goes to its own alef-music-v1 cache: larger cap (MAX_MUSIC_BYTES), never trimmed by MAX_CLIPS.
     Range requests for audio (what <audio> sends): answered from a cached full copy as a 206 slice; otherwise passed to the network and the clip is
     then fetched in full in the background and cached, small files only (MAX_CLIP_BYTES) and at most MAX_CLIPS clips (oldest dropped). Never at install.
     Range requests for anything else bypass the worker. See docs/audio/RANGE-AND-OFFLINE.md.
     A cached clip is revalidated once per worker lifetime while online (conditional GET in the background, after the cached
     answer has gone out): a clip re-rendered at the same path reaches a phone that already played the old one on the next play.
   - data/audio/manifest-words-*.json (lazy per-tradition word shards, NOT precached): stale-while-revalidate into the runtime cache,
     so the learner's own shard is available offline after first use; a plain network error when neither exists (never offline.html)
   - assets/vendor/_nmt and assets/vendor/_ort (Talk language packs, downloaded on request by the Talk screen into alef-talk-pack-v1):
     a kept copy, else the network; the worker never stores them
   - everything else same-origin: stale-while-revalidate
   Lifecycle: a new worker installs its shell cache and then WAITS. It takes over only when the page posts {type:'SKIP_WAITING'}
   (src/shell/update.js does that when the learner presses "Reload now" in the update banner) or when every Aleph tab is closed.
   So a running page is never switched to a newer cache under it. activate still claims clients so the reload lands on the new worker. */
importScripts('precache-manifest.js');
// Media hosts (media-hosts.js, generated from tools/deploy/media-hosts.json): audio folders that are also served from the media repositories.
// A missing or broken file must never stop the worker installing, so the import is guarded; without it every clip comes from this site.
try { importScripts('media-hosts.js'); } catch (e) { /* no media hosts */ }
const HOST_WAIT_MS = 4000; // how long the media host gets to start answering before this site's own copy is asked instead
/**
 * Network fetch of a clip. When the clip's folder is on a media host, the host is asked first (same bytes, checked at sync time);
 * any failure there (offline host, blocked request, a slow start, a status other than 200/206/304) falls back to this site, so
 * the answer is never worse than before. The page still asks for, and the caches still key on, this site's own address.
 */
async function clipFetch(reqOrUrl, init) {
  const own = typeof reqOrUrl === 'string' ? reqOrUrl : reqOrUrl.url;
  let alt = null;
  try { alt = typeof self.alefMediaUrl === 'function' ? self.alefMediaUrl(own, self.registration.scope) : null; } catch (e) { alt = null; }
  if (alt) {
    let timer = 0;
    try {
      const headers = Object.assign({}, (init && init.headers) || {});
      const range = typeof reqOrUrl !== 'string' && reqOrUrl.headers.get('range');
      if (range) headers.Range = range;
      const ctl = new AbortController();
      timer = setTimeout(() => ctl.abort(), HOST_WAIT_MS);
      const res = await fetch(alt, { mode: 'cors', credentials: 'omit', headers, signal: ctl.signal, cache: (init && init.cache) || 'default' });
      clearTimeout(timer);
      if (res.status === 200 || res.status === 206 || res.status === 304) return res;
    } catch (e) { clearTimeout(timer); /* fall back to this site */ }
  }
  return init ? fetch(reqOrUrl, init) : fetch(reqOrUrl);
}
self.clipFetch = clipFetch;
const VERSION = self.ALEF_VERSION || 'dev';
const SHELL = `alef-shell-${VERSION}`;
const RUNTIME = 'alef-runtime-v1'; // audio clips only (cache first, kept across versions)
const DATA = `alef-data-${VERSION}`;  // every other runtime-cached file (vocab shards, audio manifest, word shard, images, fonts): one cache per version
const AUDIO = /\.(mp3|m4a|ogg|wav)$/i;
const MAX_CLIP_BYTES = 2048 * 1024; // 2 MiB, so the longest prayer recordings (about 1.8 MiB) also work offline; a clip bigger than this is never cached by the worker (plain network, no offline copy)
const MAX_CLIPS = 600;             // audio entries kept in RUNTIME; past this the oldest-inserted are deleted
// Music beds and songs (audio/music/*.mp3, 0.2 to 5.1 MB each, 13 files) get their own cache: over MAX_CLIP_BYTES they were never
// stored (no offline music), and in RUNTIME the word clips would push them out. Not trimmed; same per-lifetime revalidation.
const MUSIC = 'alef-music-v1';
// Audio packs (src/audiolab/packs.js): clips the learner saved on purpose for a book, the prayers or a lesson set. Never trimmed here.
const PACK = 'alef-audio-pack-v1';
const MUSIC_PATH = /\/audio\/music\/[^/]+\.(mp3|ogg)$/i;
const MAX_MUSIC_BYTES = 8 * 1024 * 1024;
const isMusic = (u) => MUSIC_PATH.test(new URL(u, self.location.origin).pathname);
const capFor = (u) => (isMusic(u) ? MAX_MUSIC_BYTES : MAX_CLIP_BYTES);
const clipCache = (u) => caches.open(isMusic(u) ? MUSIC : RUNTIME);

/** Drop the oldest clips beyond MAX_CLIPS (Cache keys() is in insertion order); putClip = put + trim. */
async function trimClips() {
  try { const c = await caches.open(RUNTIME); const keys = await c.keys(); for (let i = 0; i < keys.length - MAX_CLIPS; i++) await c.delete(keys[i]); } catch { /* ignore */ }
}
async function putClip(req, res) { const u = typeof req === 'string' ? req : req.url; await (await clipCache(u)).put(req, res); if (!isMusic(u)) await trimClips(); }
const revalidated = new Set();
/** Background conditional GET for a clip served from the cache. Replaces the copy when the host has different bytes; never throws, never blocks the answer. */
async function revalidateClip(url, hit) {
  if (revalidated.has(url) || !(self.navigator && self.navigator.onLine)) return;
  revalidated.add(url);
  try {
    const headers = {};
    const etag = hit.headers.get('etag'); const lm = hit.headers.get('last-modified');
    if (etag) headers['If-None-Match'] = etag;
    if (lm) headers['If-Modified-Since'] = lm;
    const res = await clipFetch(url, { headers, cache: 'no-cache' });
    if (res.status !== 200) return; // 304: unchanged; anything else: keep what we have
    const fresh = new Uint8Array(await res.clone().arrayBuffer());
    if (fresh.byteLength > capFor(url)) { await (await clipCache(url)).delete(url); return; }
    const old = new Uint8Array(await hit.clone().arrayBuffer());
    if (old.byteLength === fresh.byteLength && old.every((b, i) => b === fresh[i])) return;
    await putClip(url, res);
  } catch { /* offline or aborted: the cached copy stays */ }
}
const inFlight = new Set();
/** Background full GET for a clip the page is reading with Range requests. Small files only; never throws. */
async function fillClip(url, total) {
  if (inFlight.has(url)) return;
  if (!(total > 0 && total <= capFor(url))) return; // unknown or too big: leave it to the network
  inFlight.add(url);
  try {
    if (await (await clipCache(url)).match(url)) return;
    const res = await clipFetch(url);
    if (res.status !== 200) return;
    const buf = await res.clone().arrayBuffer();
    if (buf.byteLength > capFor(url)) return;
    await putClip(url, res);
  } catch { /* offline or aborted: the next play tries again */ } finally { inFlight.delete(url); }
}
/** "bytes=a-b" | "bytes=a-" | "bytes=-n" against a body of `len` bytes -> {a,b} | 'bad' (ignore Range, send all) | 'unsat' (416). */
function parseRange(h, len) {
  const m = /^bytes=(\d*)-(\d*)$/.exec((h || '').trim());
  if (!m || (m[1] === '' && m[2] === '')) return 'bad';
  let a, b;
  if (m[1] === '') { const n = +m[2]; if (n === 0) return 'unsat'; a = Math.max(0, len - n); b = len - 1; }
  else { a = +m[1]; b = m[2] === '' ? len - 1 : Math.min(+m[2], len - 1); }
  return a >= len || a > b ? 'unsat' : { a, b };
}
async function audioRange(req, event) {
  const cache = await clipCache(req.url);
  const hit = (await cache.match(req.url)) || (await (await caches.open(PACK)).match(req.url)); // by URL: the Range header is not part of the key; a saved audio pack counts
  if (hit && hit.status === 200) {
    if (event) event.waitUntil(bounded(revalidateClip(req.url, hit.clone())));
    const buf = await hit.clone().arrayBuffer(); const len = buf.byteLength;
    const r = parseRange(req.headers.get('range'), len);
    const type = hit.headers.get('content-type') || 'audio/mpeg';
    if (r === 'unsat') return new Response(null, { status: 416, headers: { 'content-range': `bytes */${len}` } });
    if (r === 'bad') return new Response(buf, { status: 200, headers: { 'content-type': type, 'content-length': String(len), 'accept-ranges': 'bytes' } });
    return new Response(buf.slice(r.a, r.b + 1), { status: 206, headers: { 'content-type': type, 'content-length': String(r.b - r.a + 1), 'content-range': `bytes ${r.a}-${r.b}/${len}`, 'accept-ranges': 'bytes' } });
  }
  const res = await clipFetch(req); // not cached yet: network answers, the media host first when the folder is hosted (offline: this rejects, as before)
  const cr = /\/(\d+)$/.exec(res.headers.get('content-range') || '');
  const total = res.status === 206 && cr ? +cr[1] : res.status === 200 ? +(res.headers.get('content-length') || 0) : 0;
  return { res, total };
}

// Background clip work (finishing a download, re-checking a cached clip) is best effort: hold the worker for at most 15 s so it never
// keeps an old worker busy and holds back an update the learner asked for (the hand-over waits for the old worker's pending events).
const BACKGROUND_MS = 15000;
// Every bounded() hold can also be let go at once: the page posts RELEASE_BACKGROUND to this (the running) worker just before it asks
// the waiting worker to take over, so the hand-over does not wait out the 15 s (12 Nov 2026: an update sat waiting behind clip work).
const releases = new Set();
const bounded = (p) => {
  const work = Promise.resolve(p).catch(() => {});
  if (typeof setTimeout !== 'function') return work;
  let free; const freed = new Promise((r) => { free = r; releases.add(r); });
  return Promise.race([work, freed, new Promise((r) => setTimeout(r, BACKGROUND_MS))]).finally(() => releases.delete(free));
};
const releaseBackground = () => { for (const r of [...releases]) r(); releases.clear(); };
// Install retries the shell download: during a deploy a new file can answer 404 for a few minutes (the host's edge keeps a 404 it saw
// for up to 5 minutes), and one failed file used to fail the whole install silently, leaving an empty shell cache and no update.
const PRECACHE_RETRY_MS = [15000, 45000, 90000];
const wait = (ms) => new Promise((r) => (typeof setTimeout === 'function' ? setTimeout(r, ms) : r()));
async function fillShell() {
  const c = await caches.open(SHELL);
  for (let i = 0; ; i++) {
    try { return await c.addAll(self.ALEF_PRECACHE || []); } catch (e) { if (i >= PRECACHE_RETRY_MS.length) throw e; await wait(PRECACHE_RETRY_MS[i]); }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(fillShell());
});
// Consent-only takeover: the page's update banner posts this after the learner presses Reload (and not mid-exercise).
self.addEventListener('message', (event) => {
  const d = event.data;
  if (d && (d === 'SKIP_WAITING' || d.type === 'SKIP_WAITING')) event.waitUntil(self.skipWaiting());
  if (d && d.type === 'RELEASE_BACKGROUND') releaseBackground();
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if ((k.startsWith('alef-shell-') && k !== SHELL) || (k.startsWith('alef-data-') && k !== DATA)) await caches.delete(k);
    // older workers also put data/images in RUNTIME; those copies would win cache lookups and stay stale, so drop everything but audio clips
    try { const c = await caches.open(RUNTIME); for (const r of await c.keys()) if (!AUDIO.test(new URL(r.url).pathname)) await c.delete(r); } catch { /* ignore */ }
    await self.clients.claim();
  })());
});

const MEDIA = /\.(mp3|m4a|ogg|wav|png|jpe?g|webp|gif|svg|woff2?|ttf|otf)$/i;

// Tapping a reminder opens (or focuses) Aleph at the reminder's route. Notifications are shown by the page (src/shell/notify.js).
self.addEventListener('notificationclick', (event) => {
  const route = (event.notification && event.notification.data && event.notification.data.route) || '#/learn';
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const url = new URL('./' + (String(route).startsWith('#') ? route : '#/learn'), self.registration.scope).href;
    for (const c of list) { if ('focus' in c) { try { c.navigate && c.navigate(url); } catch (e) { /* cross-origin or old browser */ } return c.focus(); } }
    return self.clients.openWindow ? self.clients.openWindow(url) : undefined;
  }).catch(() => {}));
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Talk language pack files kept on the device, when the packs come from a pack host (data/talk/pack-host.json): serve the kept copy.
  // Nothing else from another address is ever touched here.
  if (url.origin !== self.location.origin) {
    if (/\/_(nmt|ort)\//.test(url.pathname)) event.respondWith((async () => (await caches.match(req.url)) || fetch(req))());
    return;
  }
  if (req.headers.has('range')) {
    if (!AUDIO.test(url.pathname)) return; // other media: the network handles Range as before
    event.respondWith((async () => {
      const out = await audioRange(req, event);
      if (out instanceof Response) return out;
      event.waitUntil(bounded(fillClip(req.url, out.total)));
      return out.res;
    })());
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try { const res = await fetch(req); if (res.ok) return res; } catch { /* offline */ }
      return (await caches.match('index.html')) || (await caches.match('offline.html')) || Response.error();
    })());
    return;
  }
  // Talk language packs and their runtime (assets/vendor/_nmt, assets/vendor/_ort): large files the Talk screen downloads on request
  // into its own cache (alef-talk-pack-v1, src/talk/nmt/pack.js). Serve a kept copy, else the network; never copy them into the
  // per-version data cache (that would store about 80 MB twice and throw it away at every update).
  if (/\/assets\/vendor\/_(nmt|ort)\//.test(url.pathname)) {
    event.respondWith((async () => (await caches.match(req.url)) || fetch(req))());
    return;
  }
  // The same for language packs in the newer layout (assets/vendor/_packs/<name>/, only when a deploy carries them): the pack
  // loader keeps each in its own cache (alef-pack-<name>-v1), so a part is never copied into the per-version cache as well.
  if (/\/assets\/vendor\/_packs\//.test(url.pathname)) {
    event.respondWith((async () => (await caches.match(req.url)) || fetch(req))());
    return;
  }
  if (/\/data\/audio\/manifest-words-[a-z]+\.json$/.test(url.pathname)) {
    event.respondWith((async () => {
      const hit = await caches.match(req);
      const net = fetch(req).then(async (res) => { if (res.ok) { const c = await caches.open(DATA); c.put(req, res.clone()); } return res; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
    return;
  }
  // An audio pack download (x-alef-pack): the page keeps the file in its own pack cache, so it is not copied into the runtime cache too.
  if (AUDIO.test(url.pathname) && req.headers.get('x-alef-pack') === '1') { event.respondWith(clipFetch(req.url)); return; }
  if (MEDIA.test(url.pathname)) {
    event.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) { if (AUDIO.test(url.pathname) && hit.status === 200) event.waitUntil(bounded(revalidateClip(req.url, hit.clone()))); return hit; }
      const res = AUDIO.test(url.pathname) ? await clipFetch(req) : await fetch(req);
      if (res.ok && !(AUDIO.test(url.pathname) && +(res.headers.get('content-length') || 0) > capFor(req.url))) { const name = AUDIO.test(url.pathname) ? RUNTIME : DATA; const c = await caches.open(isMusic(req.url) ? MUSIC : name); c.put(req, res.clone()); if (AUDIO.test(url.pathname) && !isMusic(req.url)) event.waitUntil(trimClips()); }
      return res;
    })());
    return;
  }
  event.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: false });
    const hitInData = hit && !!(await (await caches.open(DATA)).match(req));
    const net = fetch(req).then(async (res) => { if (res.ok) { if (!(hit && !hitInData)) { const c = await caches.open(DATA); c.put(req, res.clone()); } } return res; }).catch(() => null);
    return hit || (await net) || (await caches.match('offline.html')) || Response.error();
  })());
});

/* ---- Rimon reminders (src/retention/notify.js). No push server: the page leaves a plan in Cache Storage and, on installed
   Chromium, Periodic Background Sync wakes this worker to read it. The browser decides how often (possibly never).
   Nothing is ever shown from Friday 18:00 to Saturday 21:00 local, inside a quiet range of the plan, or after a session today. ---- */
const RIMON_CACHE = 'alef-retention';
const rimonPlanUrl = () => new URL('__alef/rimon-plan.json', self.registration.scope).href;
const RIMON_WINDOW_MS = 6 * 3600 * 1000;
function rimonShabbat(ms) { const d = new Date(ms), w = d.getDay(), m = d.getHours() * 60 + d.getMinutes(); return (w === 5 && m >= 1080) || (w === 6 && m < 1260); }
function rimonSameDay(a, b) { const x = new Date(a), y = new Date(b); return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate(); }
/** The plan entry that may be shown at `now`, or null. Pure (tests/retention/sw.test.js). */
function rimonDue(plan, now) {
  if (!plan || plan.v !== 1 || !Array.isArray(plan.entries) || rimonShabbat(now)) return null;
  const h = new Date(now).getHours(); if (h < 8 || h >= 21) return null;
  if (plan.lastSessionAt && rimonSameDay(plan.lastSessionAt, now)) return null;
  if ((plan.quiet || []).some((q) => now >= q[0] && now < q[1])) return null;
  if ((plan.shown || []).some((s) => rimonSameDay(s.at, now))) return null;
  return plan.entries.find((e) => e && now >= e.fireAt && now < e.fireAt + RIMON_WINDOW_MS) || null;
}
self.rimonDue = rimonDue;
async function rimonCheck() {
  try {
    if (!self.registration || (self.Notification && self.Notification.permission !== 'granted')) return;
    const RIMON_PLAN = rimonPlanUrl(); const cache = await caches.open(RIMON_CACHE); const hit = await cache.match(RIMON_PLAN); if (!hit) return;
    const plan = await hit.json(); const now = Date.now(); const e = rimonDue(plan, now); if (!e) return;
    await self.registration.showNotification(e.title || 'Rimon', { body: e.body, tag: 'alef-rimon', icon: 'assets/icons/icon-192.png', lang: 'en', renotify: false, data: { route: e.route || '#/', id: e.id } });
    plan.entries = plan.entries.filter((x) => x !== e); plan.shown = [...(plan.shown || []), { id: e.id, at: now }].slice(-10);
    await cache.put(RIMON_PLAN, new Response(JSON.stringify(plan), { headers: { 'content-type': 'application/json' } }));
  } catch { /* reminders are best effort */ }
}
self.addEventListener('periodicsync', (event) => { if (event.tag === 'alef-rimon') event.waitUntil(rimonCheck()); });
// A tap on any Aleph notification: close it, focus an open Aleph window (or open one) and go to the route it carries.
self.addEventListener('notificationclick', (event) => {
  const route = (event.notification && event.notification.data && event.notification.data.route) || '#/';
  event.notification.close();
  event.waitUntil((async () => {
    const target = new URL(self.registration.scope).href + (String(route).startsWith('#') ? route : '#/');
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) { if (w.url.startsWith(self.registration.scope)) { try { await w.focus(); if (w.navigate) await w.navigate(target); } catch { /* focus is best effort */ } return; } }
    try { await self.clients.openWindow(target); } catch { /* blocked */ }
  })());
});
