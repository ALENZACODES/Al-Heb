// Offline QA follow-ups: shard warm-up after a fresh install, and which store writes ask for persistent storage.
import test from 'node:test';
import assert from 'node:assert/strict';
import { warmShardAfterInstall, shardPath } from '../src/shell/audio-shards.js';
import { isRealProgressWrite } from '../src/shell/persist-gate.js';

const settings = (c) => ({ get: () => c });
const okRes = { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(1) };
const mkSW = ({ controller = null, claimOnReady = true } = {}) => {
  const sw = { controller, listeners: [], addEventListener(_, fn) { this.listeners.push(fn); } };
  sw.ready = Promise.resolve().then(() => { if (claimOnReady) { sw.controller = {}; sw.listeners.forEach((f) => f()); } });
  return sw;
};

test('warm: uncontrolled fresh install fetches only the active tradition shard once the worker controls the page', async () => {
  const urls = []; const sw = mkSW();
  const r = await warmShardAfterInstall({ fetch: async (u) => { urls.push(u); return okRes; }, settings: settings('ashkenazi'), serviceWorker: sw, timeoutMs: 50 });
  assert.equal(r, 'warmed'); assert.deepEqual(urls, [shardPath('ashkenazi')]);
});
test('warm: already controlled page, no worker support, or unknown tradition does nothing', async () => {
  const fetch = async () => { throw new Error('must not fetch'); };
  assert.equal(await warmShardAfterInstall({ fetch, settings: settings('israeli'), serviceWorker: mkSW({ controller: {} }) }), 'skipped');
  assert.equal(await warmShardAfterInstall({ fetch, settings: settings('israeli'), serviceWorker: undefined }), 'skipped');
  assert.equal(await warmShardAfterInstall({ fetch, settings: settings('other'), serviceWorker: mkSW() }), 'skipped');
});
test('warm: sephardi 404 falls back to the israeli shard; network failure and a never-claiming worker are reported, never thrown', async () => {
  const urls = [];
  assert.equal(await warmShardAfterInstall({ fetch: async (u) => { urls.push(u); return u.includes('sephardi') ? { ok: false, status: 404 } : okRes; }, settings: settings('sephardi'), serviceWorker: mkSW(), timeoutMs: 50 }), 'warmed');
  assert.deepEqual(urls, [shardPath('sephardi'), shardPath('israeli')]);
  assert.equal(await warmShardAfterInstall({ fetch: async () => { throw new Error('offline'); }, settings: settings('israeli'), serviceWorker: mkSW(), timeoutMs: 50 }), 'unavailable');
  assert.equal(await warmShardAfterInstall({ fetch: async () => okRes, settings: settings('israeli'), serviceWorker: mkSW({ claimOnReady: false }), timeoutMs: 20 }), 'unavailable');
});

test('persistence gate: settings and the empty boot-time streak record do not count; real progress does', () => {
  assert.equal(isRealProgressWrite('settings', { a: 1 }), false);
  assert.equal(isRealProgressWrite('streak', { v: 2, count: 0, best: 0, todaySeconds: 0 }), false);
  assert.equal(isRealProgressWrite('streak', null), false);
  assert.equal(isRealProgressWrite('streak', { count: 0, todaySeconds: 5 }), true);
  assert.equal(isRealProgressWrite('streak', { count: 2 }), true);
  for (const k of ['curriculum.progress', 'srs.cards', 'letters.progress']) assert.equal(isRealProgressWrite(k, {}), true);
});

test('shard watch: a congregation change reloads only when enabled() says a shard was ever asked for', async () => {
  const { createShardLoader } = await import('../src/shell/audio-shards.js');
  let cb; const urls = [];
  const st = { get: () => 'ashkenazi', subscribe: (f) => { cb = f; } };
  const L = createShardLoader({ fetch: async (u) => { urls.push(u); return { ok: true, status: 200, json: async () => [] }; }, audio: { extend() {} }, settings: st });
  let asked = false; L.watch(() => asked);
  cb('x', ['congregation']); await new Promise((r) => setTimeout(r, 5)); assert.deepEqual(urls, [], 'not asked: nothing fetched');
  asked = true; cb('x', ['congregation']); await new Promise((r) => setTimeout(r, 5)); assert.equal(urls.length, 1);
});
