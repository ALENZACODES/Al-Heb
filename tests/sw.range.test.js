// sw.js and Range requests for audio clips: runs the real worker script in a fake ServiceWorkerGlobalScope (no browser).
// <audio> asks for clips with "Range: bytes=0-". The worker must (a) answer from a cached full copy as a 206 slice, (b) on a miss let the
// network answer and then fill the cache with a full GET in the background (small files only), (c) keep the cache bounded,
// (d) leave Range requests for other media alone, and (e) never put clips into the install-time precache.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SW = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const MAX_CLIP_BYTES = +/const MAX_CLIP_BYTES = (\d+) \* 1024/.exec(SW)[1] * 1024;
const MAX_CLIPS = +/const MAX_CLIPS = (\d+)/.exec(SW)[1];
const CLIP = 'https://alef.test/audio/m/israeli/word/il07-w6.mp3';
const BYTES = Uint8Array.from({ length: 100 }, (_, i) => i);

function fakeCache() {
  const entries = new Map();
  const key = (r) => (typeof r === 'string' ? r : r.url);
  return {
    entries,
    async addAll(urls) { for (const u of urls) entries.set(u, new Response('precached ' + u)); },
    async put(r, res) { if (res.status === 206) throw new TypeError('206 cannot be cached'); entries.set(key(r), res); },
    async match(r) { const v = entries.get(key(r)); return v ? v.clone() : undefined; },
    async keys() { return [...entries.keys()].map((url) => ({ url })); },
    async delete(r) { return entries.delete(key(r)); },
  };
}

function boot({ fetchImpl, online = false } = {}) {
  const listeners = {}; const store = new Map(); const netCalls = [];
  const caches = {
    async open(n) { if (!store.has(n)) store.set(n, fakeCache()); return store.get(n); },
    async keys() { return [...store.keys()]; },
    async delete(n) { return store.delete(n); },
    async match(r) { for (const c of store.values()) { const h = await c.match(r); if (h) return h; } return undefined; },
  };
  const self = { ALEF_VERSION: 'v2', ALEF_PRECACHE: ['index.html'], location: { origin: 'https://alef.test' }, ...(online ? { navigator: { onLine: true } } : {}), addEventListener(t, f) { (listeners[t] ||= []).push(f); }, skipWaiting: async () => {}, clients: { claim: async () => {} }, caches };
  const net = async (req, ...rest) => { netCalls.push({ url: typeof req === 'string' ? req : req.url, range: typeof req === 'string' ? null : req.headers.get('range') }); return (fetchImpl || (async () => { throw new TypeError('offline'); }))(req, ...rest); };
  const ctx = { self, caches, importScripts() {}, fetch: net, URL, Response };
  ctx.globalThis = ctx;
  vm.runInNewContext(SW.replace(/importScripts\([^)]*\);/, ''), ctx);
  /** Fire a fetch event. Returns {responded, response|error} after the response AND every waitUntil promise settled. */
  const get = async (url, headers = {}) => {
    const req = { url, method: 'GET', mode: 'no-cors', headers: new Headers(headers) };
    const waits = []; let responded = false; let p;
    const e = { request: req, respondWith: (x) => { responded = true; p = x; }, waitUntil: (x) => waits.push(x) };
    for (const f of listeners.fetch || []) f(e);
    if (!responded) return { responded: false };
    let response, error;
    try { response = await p; } catch (err) { error = err; }
    await Promise.all(waits);
    return { responded: true, response, error };
  };
  return { store, netCalls, get, caches };
}

/** A host that honours Range like a static host does. */
const rangeOf = (req) => (typeof req === 'string' ? null : req.headers.get('range')); // the worker's background fetch passes a bare URL
const host = (total = 100, { honourRange = true } = {}) => async (req) => {
  const range = rangeOf(req);
  const type = { 'content-type': 'audio/mpeg' };
  if (range && honourRange) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range); const a = +m[1]; const b = m[2] === '' ? total - 1 : Math.min(+m[2], total - 1);
    return new Response(BYTES.slice(a, b + 1), { status: 206, headers: { ...type, 'content-range': `bytes ${a}-${b}/${total}`, 'content-length': String(b - a + 1) } });
  }
  return new Response(BYTES.slice(0, total), { status: 200, headers: { ...type, 'content-length': String(total) } });
};
const bytesOf = async (res) => [...new Uint8Array(await res.arrayBuffer())];
const seed = async (w, url = CLIP) => { const c = await w.caches.open('alef-runtime-v1'); await c.put(url, new Response(BYTES, { status: 200, headers: { 'content-type': 'audio/mpeg' } })); };

test('cached clip + Range: bytes=0- is answered as a 206 slice from the cache, no network', async () => {
  const w = boot(); await seed(w);
  const r = await w.get(CLIP, { range: 'bytes=0-' });
  assert.equal(r.response.status, 206);
  assert.equal(r.response.headers.get('content-range'), 'bytes 0-99/100');
  assert.equal(r.response.headers.get('content-type'), 'audio/mpeg');
  assert.equal(r.response.headers.get('accept-ranges'), 'bytes');
  assert.deepEqual(await bytesOf(r.response), [...BYTES]);
  assert.equal(w.netCalls.length, 0, 'served offline');
});

test('cached clip: bounded, open-ended and suffix ranges slice correctly; bad ranges are handled', async () => {
  const w = boot(); await seed(w);
  const a = await w.get(CLIP, { range: 'bytes=10-19' });
  assert.equal(a.response.status, 206); assert.equal(a.response.headers.get('content-range'), 'bytes 10-19/100'); assert.equal(a.response.headers.get('content-length'), '10');
  assert.deepEqual(await bytesOf(a.response), [...BYTES.slice(10, 20)]);
  const b = await w.get(CLIP, { range: 'bytes=90-' }); assert.deepEqual(await bytesOf(b.response), [...BYTES.slice(90)]);
  const c = await w.get(CLIP, { range: 'bytes=-5' }); assert.equal(c.response.headers.get('content-range'), 'bytes 95-99/100'); assert.deepEqual(await bytesOf(c.response), [...BYTES.slice(95)]);
  const d = await w.get(CLIP, { range: 'bytes=0-9999' }); assert.equal(d.response.headers.get('content-range'), 'bytes 0-99/100', 'end is clamped');
  const e = await w.get(CLIP, { range: 'bytes=500-' }); assert.equal(e.response.status, 416); assert.equal(e.response.headers.get('content-range'), 'bytes */100');
  const f = await w.get(CLIP, { range: 'bytes=0-1,5-6' }); assert.equal(f.response.status, 200, 'multi-range is not supported: whole file instead'); assert.equal((await bytesOf(f.response)).length, 100);
  assert.equal(w.netCalls.length, 0);
});

test('uncached clip: the network answers the Range request, then the full file is fetched in the background and cached', async () => {
  const w = boot({ fetchImpl: host() });
  const r = await w.get(CLIP, { range: 'bytes=0-' });
  assert.equal(r.response.status, 206, 'the page gets the host answer');
  assert.deepEqual(w.netCalls.map((c) => c.range), ['bytes=0-', null], 'one Range request, then one plain GET');
  const cached = await (await w.caches.open('alef-runtime-v1')).match(CLIP);
  assert.equal(cached.status, 200, 'cached as a full 200, never a 206');
  assert.deepEqual(await bytesOf(cached), [...BYTES]);
  // and now it plays with the network gone
  const again = boot(); again.store.set('alef-runtime-v1', w.store.get('alef-runtime-v1'));
  const off = await again.get(CLIP, { range: 'bytes=0-' });
  assert.equal(off.response.status, 206); assert.deepEqual(await bytesOf(off.response), [...BYTES]); assert.equal(again.netCalls.length, 0);
});

test('a host that ignores Range (200 for a Range request) still gets the clip cached', async () => {
  const w = boot({ fetchImpl: host(100, { honourRange: false }) });
  const r = await w.get(CLIP, { range: 'bytes=0-' });
  assert.equal(r.response.status, 200);
  assert.equal((await (await w.caches.open('alef-runtime-v1')).match(CLIP)).status, 200);
});

test('size cap: a clip over MAX_CLIP_BYTES, or of unknown size, is passed through and never cached', async () => {
  const big = boot({ fetchImpl: async (req) => new Response(BYTES, { status: 206, headers: { 'content-range': `bytes 0-99/${MAX_CLIP_BYTES + 1}` } }) });
  const r = await big.get(CLIP, { range: 'bytes=0-' });
  assert.equal(r.response.status, 206);
  assert.equal(big.netCalls.length, 1, 'no background full GET for a big file');
  assert.equal(await (await big.caches.open('alef-runtime-v1')).match(CLIP), undefined);
  const unknown = boot({ fetchImpl: async () => new Response(BYTES, { status: 206 }) });
  await unknown.get(CLIP, { range: 'bytes=0-' });
  assert.equal(unknown.netCalls.length, 1); assert.equal(await (await unknown.caches.open('alef-runtime-v1')).match(CLIP), undefined);
  // a host that lies about the size and sends a big body on the full GET is also refused
  const liar = boot({ fetchImpl: async (req) => (rangeOf(req) ? new Response(BYTES, { status: 206, headers: { 'content-range': 'bytes 0-99/100' } }) : new Response(new Uint8Array(MAX_CLIP_BYTES + 1), { status: 200 })) });
  await liar.get(CLIP, { range: 'bytes=0-' });
  assert.equal(await (await liar.caches.open('alef-runtime-v1')).match(CLIP), undefined);
});

test('a failed background fetch is swallowed and the page still gets its answer; a later play retries', async () => {
  let n = 0;
  const w = boot({ fetchImpl: async (req) => { if (rangeOf(req)) return host()(req); n++; throw new TypeError('offline'); } });
  const r = await w.get(CLIP, { range: 'bytes=0-' });
  assert.equal(r.response.status, 206); assert.equal(n, 1);
  assert.equal(await (await w.caches.open('alef-runtime-v1')).match(CLIP), undefined);
  await w.get(CLIP, { range: 'bytes=0-' }); assert.equal(n, 2, 'in-flight marker was released');
});

test('offline and not cached: the Range request fails as before (no invented audio)', async () => {
  const w = boot();
  const r = await w.get(CLIP, { range: 'bytes=0-' });
  assert.ok(r.error, 'respondWith rejects, the media element reports an error and the app falls back to speech');
});

test('Range requests for non-audio files bypass the worker entirely (unchanged)', async () => {
  const w = boot({ fetchImpl: host() });
  for (const u of ['https://alef.test/assets/img/x.png', 'https://alef.test/data/vocab/words.json', 'https://alef.test/video/clip.mp4']) assert.equal((await w.get(u, { range: 'bytes=0-' })).responded, false, u);
  assert.equal((await w.get('https://other.test/a.mp3', { range: 'bytes=0-' })).responded, false, 'other origins never');
});

test('plain (non-Range) audio GET is still cache-first and cached; a too-large one is not cached', async () => {
  const w = boot({ fetchImpl: host() });
  const r = await w.get(CLIP); assert.equal(r.response.status, 200);
  assert.equal((await (await w.caches.open('alef-runtime-v1')).match(CLIP)).status, 200);
  const w2 = boot({ fetchImpl: async () => new Response(BYTES, { status: 200, headers: { 'content-length': String(MAX_CLIP_BYTES + 1) } }) });
  await w2.get(CLIP); assert.equal(await (await w2.caches.open('alef-runtime-v1')).match(CLIP), undefined);
});

test('the clip cache is bounded: past MAX_CLIPS the oldest are dropped', async () => {
  const w = boot({ fetchImpl: host() });
  const c = await w.caches.open('alef-runtime-v1');
  for (let i = 0; i < MAX_CLIPS; i++) await c.put(`https://alef.test/audio/old${i}.mp3`, new Response('x'));
  await w.get(CLIP, { range: 'bytes=0-' });
  const keys = (await c.keys()).map((k) => k.url);
  assert.equal(keys.length, MAX_CLIPS);
  assert.ok(keys.includes(CLIP), 'the new clip is kept');
  assert.ok(!keys.includes('https://alef.test/audio/old0.mp3'), 'the oldest went');
  assert.ok(keys.includes(`https://alef.test/audio/old${MAX_CLIPS - 1}.mp3`));
});

test('real precache manifest: no audio clip and no audio file of any kind is installed up front', () => {
  const m = readFileSync(new URL('../precache-manifest.js', import.meta.url), 'utf8');
  const list = JSON.parse(/ALEF_PRECACHE = (\[[\s\S]*?\]);/.exec(m)[1]);
  assert.ok(list.length > 100);
  assert.deepEqual(list.filter((f) => /^audio\//.test(f) || /\.(mp3|m4a|ogg|wav)$/i.test(f)), []);
});

test('a cached clip is revalidated once in the background while online; different host bytes replace the cached copy, same bytes do not', async () => {
  const NEW = new Uint8Array(100).map((_, i) => 255 - i);
  let serve = BYTES; let conditional = 0;
  const w = boot({ online: true, fetchImpl: async (req, init) => { if (init && init.headers && (init.headers['If-None-Match'] || init.headers['If-Modified-Since'])) conditional++; return new Response(serve, { status: 200, headers: { 'content-type': 'audio/mpeg', 'content-length': '100', etag: '"x"' } }); } });
  const c = await w.caches.open('alef-runtime-v1'); await c.put(CLIP, new Response(BYTES, { status: 200, headers: { 'content-type': 'audio/mpeg', etag: '"x"' } }));
  const first = await w.get(CLIP, { range: 'bytes=0-' });
  assert.equal(first.response.status, 206); assert.deepEqual(await bytesOf(first.response), [...BYTES], 'the page still gets the cached answer at once');
  assert.equal(w.netCalls.length, 1, 'one background conditional GET'); assert.equal(conditional, 1, 'sent with If-None-Match');
  assert.deepEqual(await bytesOf(await c.match(CLIP)), [...BYTES], 'same bytes: cache untouched');
  await w.get(CLIP, { range: 'bytes=0-' });
  assert.equal(w.netCalls.length, 1, 'revalidated only once per worker lifetime');
  // a fresh worker (new lifetime) finds the host has a new rendering of the same path
  const w2 = boot({ online: true, fetchImpl: async () => new Response(NEW, { status: 200, headers: { 'content-type': 'audio/mpeg', 'content-length': '100' } }) });
  w2.store.set('alef-runtime-v1', w.store.get('alef-runtime-v1'));
  const r = await w2.get(CLIP, { range: 'bytes=0-' });
  assert.deepEqual(await bytesOf(r.response), [...BYTES], 'this play still hears the old copy');
  assert.deepEqual(await bytesOf(await (await w2.caches.open('alef-runtime-v1')).match(CLIP)), [...NEW], 'the next play gets the new rendering');
  // offline worker: no revalidation call at all
  const w3 = boot(); w3.store.set('alef-runtime-v1', w.store.get('alef-runtime-v1'));
  await w3.get(CLIP, { range: 'bytes=0-' }); assert.equal(w3.netCalls.length, 0);
});

test('music (audio/music/*.mp3, up to 5.1 MB) is cached in its own cache past the clip cap, plays offline, and word clips never push it out', async () => {
  const SONG = 'https://alef.test/audio/music/cantor-strings-a.mp3';
  const big = 5120209; // the largest original bed
  assert.ok(big > MAX_CLIP_BYTES);
  const w = boot({ fetchImpl: host(big) });
  const first = await w.get(SONG, { range: 'bytes=0-' });
  assert.equal(first.response.status, 206, 'first play streams from the network');
  const music = await w.caches.open('alef-music-v1');
  assert.equal((await music.match(SONG))?.status, 200, 'then the whole file is kept in alef-music-v1');
  assert.equal(await (await w.caches.open('alef-runtime-v1')).match(SONG), undefined, 'not in the word-clip cache');
  const plain = boot({ fetchImpl: async () => new Response(BYTES, { status: 200, headers: { 'content-length': String(big) } }) });
  await plain.get(SONG); // "Download music" in the offline card fetches without Range
  assert.equal((await (await plain.caches.open('alef-music-v1')).match(SONG))?.status, 200);
  const rt = await w.caches.open('alef-runtime-v1');
  for (let i = 0; i < MAX_CLIPS + 5; i++) await rt.put(`https://alef.test/audio/w${i}.mp3`, new Response('x'));
  await w.get(CLIP, { range: 'bytes=0-' });
  assert.equal((await music.match(SONG))?.status, 200, 'still there after the clip cache trimmed');
  const offline = boot(); await (await offline.caches.open('alef-music-v1')).put(SONG, new Response(BYTES, { status: 200, headers: { 'content-type': 'audio/mpeg' } }));
  const r = await offline.get(SONG, { range: 'bytes=0-' });
  assert.equal(r.response.status, 206, 'offline: answered from alef-music-v1');
});
