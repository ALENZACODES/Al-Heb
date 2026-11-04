/* ALEF service worker. Precache list comes from the generated precache-manifest.js
   (node tools/build-precache.mjs). Strategies:
   - navigation: network first, fall back to cached index.html, then offline.html
   - audio/images: cache first, filled at runtime (Range requests bypass the cache; see docs/ARCHITECTURE.md)
   - data/audio/manifest-words-*.json (lazy per-tradition word shards, NOT precached): stale-while-revalidate into the runtime cache,
     so the learner's own shard is available offline after first use; a plain network error when neither exists (never offline.html)
   - everything else same-origin: stale-while-revalidate
   Lifecycle: a new worker installs its shell cache and then WAITS. It takes over only when the page posts {type:'SKIP_WAITING'}
   (src/shell/update.js does that when the learner presses "Reload now" in the update banner) or when every ALEF tab is closed.
   So a running page is never switched to a newer cache under it. activate still claims clients so the reload lands on the new worker. */
importScripts('precache-manifest.js');
const VERSION = self.ALEF_VERSION || 'dev';
const SHELL = `alef-shell-${VERSION}`;
const RUNTIME = 'alef-runtime-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(self.ALEF_PRECACHE || [])));
});
// Consent-only takeover: the page's update banner posts this after the learner presses Reload (and not mid-exercise).
self.addEventListener('message', (event) => {
  const d = event.data;
  if (d && (d === 'SKIP_WAITING' || d.type === 'SKIP_WAITING')) event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('alef-shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

const MEDIA = /\.(mp3|m4a|ogg|wav|png|jpe?g|webp|gif|svg|woff2?|ttf|otf)$/i;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.headers.has('range')) return; // let the network handle media range requests

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try { const res = await fetch(req); if (res.ok) return res; } catch { /* offline */ }
      return (await caches.match('index.html')) || (await caches.match('offline.html')) || Response.error();
    })());
    return;
  }
  if (/\/data\/audio\/manifest-words-[a-z]+\.json$/.test(url.pathname)) {
    event.respondWith((async () => {
      const hit = await caches.match(req);
      const net = fetch(req).then(async (res) => { if (res.ok) { const c = await caches.open(RUNTIME); c.put(req, res.clone()); } return res; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
    return;
  }
  if (MEDIA.test(url.pathname)) {
    event.respondWith((async () => {
      const hit = await caches.match(req); if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) { const c = await caches.open(RUNTIME); c.put(req, res.clone()); }
      return res;
    })());
    return;
  }
  event.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: false });
    const net = fetch(req).then(async (res) => { if (res.ok) { const c = await caches.open(hit ? SHELL : RUNTIME); c.put(req, res.clone()); } return res; }).catch(() => null);
    return hit || (await net) || (await caches.match('offline.html')) || Response.error();
  })());
});
