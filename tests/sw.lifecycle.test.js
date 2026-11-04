import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function worker({ hit, fetch, put, precache = [], windows = [], version = 'v1' } = {}) {
  const listeners = {}, opened = [], deleted = [], messages = []; let skipped = 0, claimed = 0;
  const self = { ALEF_VERSION: version, ALEF_PRECACHE: precache, registration: { scope: 'https://alef.test/' }, location: { origin: 'https://alef.test' },
    clients: { matchAll: async () => windows, claim: async () => { claimed++; } }, skipWaiting: async () => { skipped++; },
    addEventListener: (name, fn) => { listeners[name] = fn; } };
  vm.runInNewContext(source, { self, importScripts() {}, Response, URL,
    caches: { keys: async () => ['alef-shell-old', 'alef-shell-v1', 'unrelated'], delete: async k => deleted.push(k),
      open: async name => { opened.push(name); return { put, match: async () => hit, addAll: async () => {} }; } }, fetch });
  const emit = (type, extra = {}) => {
    const waits = []; let response;
    listeners[type]({ ...extra, waitUntil: p => waits.push(p), respondWith: p => { response = p; } });
    return { waits, response };
  };
  const dispatch = (path, mode) => emit('fetch', { request: mode ? { url: 'https://alef.test' + path, method: 'GET', mode, headers: new Headers() } : new Request('https://alef.test' + path) });
  Object.assign(dispatch, { emit, opened, deleted, messages, state: () => ({ skipped, claimed }),
    update: () => emit('message', { data: { type: 'SKIP_WAITING' }, source: { id: 'current', url: 'https://alef.test/', postMessage: m => messages.push(m) } }) });
  return dispatch;
}
for (const path of ['/data/vocab/packs/one.json', '/data/audio/manifest-words-israeli.json']) {
  test('cached response keeps refresh and cache write alive: ' + path, async () => {
    const network = deferred(), write = deferred(); let putCalled = false;
    const dispatch = worker({ hit: new Response('old'), fetch: () => network.promise, put: () => { putCalled = true; return write.promise; } });
    const event = dispatch(path);
    assert.equal(await (await event.response).text(), 'old'); assert.equal(event.waits.length, 1);
    let finished = false; event.waits[0].then(() => { finished = true; });
    network.resolve(new Response('new')); await new Promise(r => setImmediate(r));
    assert.equal(putCalled, true); assert.equal(finished, false);
    write.resolve(); await event.waits[0]; assert.equal(finished, true);
    assert.ok(dispatch.opened.every(name => name === 'alef-runtime-v1'));
  });
}
test('cache quota failure preserves successful media response', async () => {
  const dispatch = worker({ fetch: async () => new Response('image'), put: async () => { throw new Error('quota'); } });
  assert.equal(await (await dispatch('/image.png').response).text(), 'image');
});
test('offline missing data returns a network error, never an HTML document', async () => {
  const dispatch = worker({ fetch: async () => { throw new Error('offline'); } });
  const event = dispatch('/data/vocab/packs/new.json');
  assert.equal((await event.response).type, 'error'); await Promise.all(event.waits);
});
test('precached modules and navigation stay on their immutable version despite a newer deployment', async () => {
  for (const [path, mode] of [['/src/app.js?reload=1'], ['/', 'navigate']]) {
    let network = 0;
    const dispatch = worker({ precache: ['src/app.js', 'index.html'], hit: new Response('old version'), fetch: async () => { network++; return new Response('new version'); } });
    const event = dispatch(path, mode);
    assert.equal(await (await event.response).text(), 'old version'); assert.equal(network, 0);
    assert.deepEqual(dispatch.opened, ['alef-shell-v1']);
  }
});
test('installation waits and never claims already-open pages', async () => {
  const dispatch = worker({ windows: [{ id: 'current', url: 'https://alef.test/' }] });
  await Promise.all(dispatch.emit('install').waits); await Promise.all(dispatch.emit('activate').waits);
  assert.deepEqual(dispatch.state(), { skipped: 0, claimed: 0 }); assert.deepEqual(dispatch.deleted, []);
});
test('explicit update is blocked by another app tab but succeeds after it closes', async () => {
  const windows = [{ id: 'current', url: 'https://alef.test/' }, { id: 'lesson', url: 'https://alef.test/#/learn' }];
  const dispatch = worker({ windows });
  await Promise.all(dispatch.update().waits);
  assert.equal(dispatch.state().skipped, 0); assert.equal(dispatch.messages[0].type, 'UPDATE_BLOCKED');
  windows.pop(); await Promise.all(dispatch.update().waits);
  assert.equal(dispatch.state().skipped, 1);
});
test('natural activation removes old shell caches only when no app pages remain', async () => {
  const dispatch = worker(); await Promise.all(dispatch.emit('activate').waits);
  assert.deepEqual(dispatch.deleted, ['alef-shell-old']); assert.equal(dispatch.state().claimed, 0);
});
