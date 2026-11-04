/* ALEF service worker. Precache list comes from the generated precache-manifest.js
   (node tools/build-precache.mjs). Strategies:
   - navigation: network first, fall back to cached index.html, then offline.html
   - audio/images: cache first, filled at runtime (Range requests bypass the cache; see docs/ARCHITECTURE.md)
   - data/audio/manifest-words-*.json (lazy per-tradition word shards, NOT precached): stale-while-revalidate into the runtime cache,
     so the learner's own shard is available offline after first use; a plain network error when neither exists (never offline.html)
   - everything else same-origin: stale-while-revalidate */
importScripts('precache-manifest.js');
const VERSION = self.ALEF_VERSION || 'dev';
const SHELL = `alef-shell-${VERSION}`;
const RUNTIME = 'alef-runtime-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(self.ALEF_PRECACHE || [])).then(() => self.skipWaiting()));
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
