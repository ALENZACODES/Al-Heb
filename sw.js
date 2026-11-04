/* ALEF service worker. Precache list comes from the generated precache-manifest.js
   (node tools/build-precache.mjs). Strategies:
   - navigation and precached files: immutable shell for this worker version
   - audio/images: cache first, filled at runtime (Range requests bypass the cache; see docs/ARCHITECTURE.md)
   - data/audio/manifest-words-*.json (lazy per-tradition word shards, NOT precached): stale-while-revalidate into the runtime cache,
     so the learner's own shard is available offline after first use; a plain network error when neither exists (never offline.html)
   - everything else same-origin: stale-while-revalidate */
importScripts('precache-manifest.js');
const VERSION = self.ALEF_VERSION || 'dev';
const SHELL = `alef-shell-${VERSION}`;
const RUNTIME = 'alef-runtime-v1';
const PRECACHED = new Set((self.ALEF_PRECACHE || []).map((p) => new URL(p, self.registration.scope).href));

self.addEventListener('install', (event) => {
  // Updates stay waiting until the learner explicitly chooses to reload.
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(self.ALEF_PRECACHE || [])));
});
const appWindows = async () => (await self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
  .filter((client) => client.url.startsWith(self.registration.scope));
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'SKIP_WAITING' || !event.source?.url?.startsWith(self.registration.scope)) return;
  event.waitUntil((async () => {
    const windows = await appWindows();
    if (windows.some((client) => client.id !== event.source.id)) {
      event.source.postMessage({ type: 'UPDATE_BLOCKED', reason: 'other-tabs' });
      return;
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Only natural activation with no open app pages makes old caches safe
    // to remove. Never take over an uncontrolled, already-loaded document.
    if (!(await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).length) {
      for (const k of await caches.keys()) if (k.startsWith('alef-shell-') && k !== SHELL) await caches.delete(k);
    }
  })());
});

const MEDIA = /\.(mp3|m4a|ogg|wav|png|jpe?g|webp|gif|svg|woff2?|ttf|otf)$/i;

async function cacheResponse(cacheName, req, res) {
  if (!res.ok) return;
  // Cache pressure must not turn a successful network response into an error.
  try { const c = await caches.open(cacheName); await c.put(req, res.clone()); } catch { /* best effort */ }
}

function revalidate(event, req) {
  const cached = caches.open(RUNTIME).then((c) => c.match(req, { ignoreSearch: false }));
  const net = (async () => {
    try {
      const res = await fetch(req);
      await cacheResponse(RUNTIME, req, res);
      return res;
    } catch { return null; }
  })();
  // respondWith may settle immediately on a cache hit; keep the worker alive
  // until the background refresh and its cache write have both completed.
  event.waitUntil(net.then(() => {}));
  event.respondWith((async () => (await cached) || (await net) || Response.error())());
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.headers.has('range')) return; // let the network handle media range requests

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const shell = await caches.open(SHELL);
      return (await shell.match('index.html')) || (await shell.match('offline.html')) || Response.error();
    })());
    return;
  }
  const canonical = new URL(req.url); canonical.search = ''; canonical.hash = '';
  if (PRECACHED.has(canonical.href)) {
    event.respondWith(caches.open(SHELL).then(async (c) => (await c.match(canonical.href)) || Response.error()));
    return;
  }
  if (/\/data\/audio\/manifest-words-[a-z]+\.json$/.test(url.pathname)) {
    revalidate(event, req);
    return;
  }
  if (MEDIA.test(url.pathname)) {
    event.respondWith((async () => {
      const hit = await (await caches.open(RUNTIME)).match(req); if (hit) return hit;
      const res = await fetch(req);
      await cacheResponse(RUNTIME, req, res);
      return res;
    })());
    return;
  }
  revalidate(event, req);
});
