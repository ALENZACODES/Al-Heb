// sw.js lifecycle: runs the real worker script in a fake ServiceWorkerGlobalScope (no browser).
// Checks that install only fills the shell cache (no skipWaiting), that a SKIP_WAITING message is the only thing that calls
// skipWaiting, that activate drops old shell caches and claims clients, and that offline navigation still falls back to the cache.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SW = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');

function fakeCache(entries = new Map()) {
  return {
    entries,
    async addAll(urls) { for (const u of urls) entries.set(u, new Response('precached ' + u)); },
    async put(req, res) { entries.set(typeof req === 'string' ? req : req.url, res); },
    async match(req) { return entries.get(typeof req === 'string' ? req : req.url) || undefined; },
  };
}

/** Build a scope, run sw.js in it, return handles. `fetchImpl` answers network calls. */
function boot({ version = 'v2', precache = ['index.html', 'offline.html'], fetchImpl, caches: existing = [] } = {}) {
  const listeners = {};
  const store = new Map(existing.map((n) => [n, fakeCache()]));
  const calls = { skipWaiting: 0, claim: 0, deleted: [] };
  const self = {
    ALEF_VERSION: version, ALEF_PRECACHE: precache,
    location: { origin: 'https://alef.test' },
    addEventListener(t, f) { (listeners[t] ||= []).push(f); },
    skipWaiting: async () => { calls.skipWaiting++; },
    clients: { claim: async () => { calls.claim++; } },
    caches: {
      async open(n) { if (!store.has(n)) store.set(n, fakeCache()); return store.get(n); },
      async keys() { return [...store.keys()]; },
      async delete(n) { calls.deleted.push(n); return store.delete(n); },
      async match(req) { for (const c of store.values()) { const hit = await c.match(req); if (hit) return hit; } return undefined; },
    },
  };
  const ctx = { self, caches: self.caches, importScripts() {}, fetch: fetchImpl || (async () => { throw new TypeError('offline'); }), URL, Response };
  ctx.globalThis = ctx;
  vm.runInNewContext(SW.replace(/importScripts\([^)]*\);/, ''), ctx);
  const fire = async (type, ev = {}) => {
    const waits = [];
    const e = { ...ev, waitUntil: (p) => waits.push(p), respondWith: (p) => waits.push(p) };
    for (const f of listeners[type] || []) f(e);
    const out = await Promise.all(waits);
    return out[out.length - 1];
  };
  return { self, calls, store, fire, listeners };
}

test('install fills the versioned shell cache and does NOT call skipWaiting', async () => {
  const w = boot();
  await w.fire('install');
  assert.ok(w.store.has('alef-shell-v2'));
  assert.deepEqual([...w.store.get('alef-shell-v2').entries.keys()], ['index.html', 'offline.html']);
  assert.equal(w.calls.skipWaiting, 0, 'the new worker must wait for consent');
});

test('SKIP_WAITING message is the only path to skipWaiting; other messages are ignored', async () => {
  const w = boot();
  assert.ok(w.listeners.message?.length, 'sw.js registers a message handler');
  await w.fire('message', { data: { type: 'HELLO' } });
  await w.fire('message', { data: null });
  await w.fire('message', {});
  assert.equal(w.calls.skipWaiting, 0);
  await w.fire('message', { data: { type: 'SKIP_WAITING' } });
  assert.equal(w.calls.skipWaiting, 1);
  await w.fire('message', { data: 'SKIP_WAITING' });
  assert.equal(w.calls.skipWaiting, 2, 'the bare string form is accepted too');
});

test('the page side posts exactly the message the worker listens for', async () => {
  const U = await import('../src/shell/update.js');
  const w = boot();
  await w.fire('message', { data: U.SKIP_WAITING_MESSAGE });
  assert.equal(w.calls.skipWaiting, 1);
});

test('activate deletes older shell caches, keeps the runtime cache, and claims clients', async () => {
  const w = boot({ caches: ['alef-shell-v1', 'alef-runtime-v1'] });
  await w.fire('install');
  await w.fire('activate');
  assert.deepEqual(w.calls.deleted, ['alef-shell-v1']);
  assert.ok(w.store.has('alef-runtime-v1') && w.store.has('alef-shell-v2'));
  assert.equal(w.calls.claim, 1);
});

test('activate drops the previous version data cache and non-audio entries left in the runtime cache by older workers', async () => {
  const w = boot({ caches: ['alef-shell-v1', 'alef-data-v1', 'alef-runtime-v1'] });
  const rt = await w.self.caches.open('alef-runtime-v1');
  rt.keys = async () => [...rt.entries.keys()].map((url) => ({ url }));
  rt.delete = async (r) => rt.entries.delete(r.url);
  await rt.put('https://alef.test/data/vocab/packs/vocab5k-tier-500.json', new Response('old')); await rt.put('https://alef.test/audio/a.mp3', new Response('clip'));
  await w.fire('activate');
  assert.ok(w.calls.deleted.includes('alef-data-v1') && w.calls.deleted.includes('alef-shell-v1'));
  assert.deepEqual([...rt.entries.keys()], ['https://alef.test/audio/a.mp3']);
});

test('offline navigation falls back to the precached index.html; a missing shell gives offline.html', async () => {
  const w = boot();
  await w.fire('install');
  const nav = (url) => ({ request: { method: 'GET', url, mode: 'navigate', headers: { has: () => false } } });
  const res = await w.fire('fetch', nav('https://alef.test/#/learn'));
  assert.equal(await res.text(), 'precached index.html');
  w.store.get('alef-shell-v2').entries.delete('index.html');
  const res2 = await w.fire('fetch', nav('https://alef.test/'));
  assert.equal(await res2.text(), 'precached offline.html');
});

test('precache-manifest versioning is untouched: the shell cache name still comes from ALEF_VERSION', () => {
  assert.match(SW, /const SHELL = `alef-shell-\$\{VERSION\}`/);
  assert.match(SW, /self\.ALEF_VERSION \|\| 'dev'/);
  assert.doesNotMatch(SW.split('\n').filter((l) => /addEventListener\('install'/.test(l) || /caches\.open\(SHELL\)\.then/.test(l)).join('\n'), /skipWaiting/);
});
