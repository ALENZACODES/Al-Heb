// The real service-worker fetch handler in an isolated, fake worker scope.
// No browser, network, installed PWA or visual test is implied by these checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SOURCE = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const SHORT = SOURCE.replace('const NAVIGATION_TIMEOUT_MS = 3500;', 'const NAVIGATION_TIMEOUT_MS = 25;');

function cache() {
  const entries = new Map();
  const key = (x) => typeof x === 'string' ? x : x.url;
  return {
    entries,
    async match(x) { return entries.get(key(x))?.clone(); },
    async put(x, response) { entries.set(key(x), response.clone()); },
    async keys() { return [...entries.keys()].map((url) => ({ url })); },
    async delete(x) { return entries.delete(key(x)); },
    async addAll(urls) { for (const url of urls) entries.set(url, new Response(url)); }
  };
}

function worker(fetchImpl) {
  assert.notEqual(SHORT, SOURCE, 'short timeout fixture must match the production constant');
  const listeners = {}, stores = new Map();
  const caches = {
    async open(name) { if (!stores.has(name)) stores.set(name, cache()); return stores.get(name); },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
    async match(x) {
      for (const c of stores.values()) { const match = await c.match(x); if (match) return match; }
      return undefined;
    }
  };
  const self = {
    ALEF_VERSION: 'test', ALEF_PRECACHE: [], location: { origin: 'https://alef.test' },
    addEventListener(name, fn) { (listeners[name] ||= []).push(fn); },
    skipWaiting: async () => {}, clients: { claim: async () => {} }
  };
  vm.runInNewContext(SHORT.replace(/importScripts\([^)]*\);/, ''), {
    self, caches, fetch: fetchImpl, URL, Response, Headers, setTimeout, clearTimeout, importScripts() {}
  });
  const get = async (path, mode = 'cors') => {
    const url = 'https://alef.test/' + path;
    const waits = []; let promise;
    const event = {
      request: { method: 'GET', url, mode, headers: new Headers() },
      respondWith(p) { promise = p; },
      waitUntil(p) { waits.push(p); }
    };
    for (const listener of listeners.fetch || []) listener(event);
    assert.ok(promise, 'worker should intercept same-origin GET');
    const result = await promise;
    await Promise.all(waits);
    return result;
  };
  return { get, caches };
}

test('navigation uses a fast successful network response instead of an older cached page', async () => {
  const w = worker(async () => new Response('fresh page'));
  await (await w.caches.open('alef-shell-test')).put('index.html', new Response('old shell'));
  const res = await w.get('lesson/one', 'navigate');
  assert.equal(await res.text(), 'fresh page');
});

test('stalled navigation falls back to the installed index after a bounded wait', async () => {
  const w = worker(() => new Promise(() => {}));
  await (await w.caches.open('alef-shell-test')).put('index.html', new Response('offline lesson shell'));
  const start = Date.now();
  const res = await w.get('letters', 'navigate');
  assert.equal(await res.text(), 'offline lesson shell');
  assert.ok(Date.now() - start >= 15, 'network-first timeout was exercised');
});

test('a late network reply cannot replace the already returned cached navigation', async () => {
  let resolveNetwork;
  const w = worker(() => new Promise((resolve) => { resolveNetwork = resolve; }));
  await (await w.caches.open('alef-shell-test')).put('index.html', new Response('cached page'));
  const res = await w.get('games', 'navigate');
  resolveNetwork(new Response('late network'));
  await Promise.resolve();
  assert.equal(await res.text(), 'cached page');
});

test('failed navigation uses offline.html if index is unavailable', async () => {
  const w = worker(async () => { throw new Error('offline'); });
  await (await w.caches.open('alef-shell-test')).put('offline.html', new Response('offline guidance'));
  assert.equal(await (await w.get('books', 'navigate')).text(), 'offline guidance');
});

test('failed uncached JSON and JS requests never masquerade as offline HTML', async () => {
  const w = worker(async () => { throw new Error('offline'); });
  await (await w.caches.open('alef-shell-test')).put('offline.html', new Response('<html>offline</html>', { headers: { 'content-type': 'text/html' } }));
  for (const path of ['data/vocab/bank.json', 'src/games/preview.view.js']) {
    const res = await w.get(path);
    assert.equal(res.type, 'error', path + ': resource failure must be reported as a network error');
    assert.equal(res.status, 0, path);
  }
});

test('previously cached JSON remains available when the connection fails', async () => {
  const w = worker(async () => { throw new Error('offline'); });
  await (await w.caches.open('alef-shell-test')).put('data/vocab/bank.json', new Response('{"words":[]}', { headers: { 'content-type': 'application/json' } }));
  const res = await w.get('data/vocab/bank.json');
  assert.deepEqual(await res.json(), { words: [] });
});
