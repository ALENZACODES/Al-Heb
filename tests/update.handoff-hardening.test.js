// Live finding, 12 Nov 2026 (after the six-lane deploy): an update installed but never took over. Reload posted SKIP_WAITING to the
// worker the page had noted at boot, which had since been discarded and replaced by a fresh install; and the first install had failed
// silently on a file the host's edge still answered 404 for during the deploy. These tests hold the three fixes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { watchForUpdates, RELEASE_BACKGROUND_MESSAGE } from '../src/shell/update.js';

test('Reload asks the registration for its waiting worker at that moment, and first tells the running worker to drop background work', async () => {
  const sw = new EventTarget();
  const ctrl = { messages: [], postMessage(m) { this.messages.push(m); } }; sw.controller = ctrl;
  const stale = { messages: [], postMessage(m) { this.messages.push(m); } };
  const fresh = { messages: [], postMessage(m) { this.messages.push(m); } };
  const reg = new EventTarget(); reg.waiting = stale; reg.update = async () => {};
  sw.getRegistration = async () => reg;
  const h = watchForUpdates({ navigator: { serviceWorker: sw }, location: { reload() {} } }, { checkEveryMs: 0, setTimeout: () => 1, clearTimeout: () => {} });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(h.state(), 'waiting');
  reg.waiting = fresh;          // the noted worker was discarded; a newer install is the one waiting now
  await h.apply();
  assert.deepEqual(stale.messages, []);
  assert.deepEqual(fresh.messages, [{ type: 'SKIP_WAITING' }]);
  assert.deepEqual(ctrl.messages, [RELEASE_BACKGROUND_MESSAGE]);
});

const SW = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
function boot({ addAll, timers }) {
  const listeners = {};
  const cache = { addAll, async put() {}, async match() {}, async keys() { return []; }, async delete() {} };
  const self = { ALEF_VERSION: 'v9', ALEF_PRECACHE: ['index.html'], location: { origin: 'https://alef.test' },
    addEventListener(t, f) { (listeners[t] ||= []).push(f); }, skipWaiting: async () => {}, clients: { claim: async () => {} },
    caches: { async open() { return cache; }, async keys() { return []; }, async delete() { return true; }, async match() {} } };
  const ctx = { self, caches: self.caches, importScripts() {}, fetch: async () => { throw new TypeError('offline'); }, URL, Response, Promise,
    setTimeout: (f, ms) => { timers.push(ms); f(); return timers.length; } };
  ctx.globalThis = ctx;
  vm.runInNewContext(SW.replace(/importScripts\([^)]*\);/, ''), ctx);
  const fire = async (type, ev = {}) => { const w = []; for (const f of listeners[type] || []) f({ ...ev, waitUntil: (p) => w.push(p), respondWith: (p) => w.push(p) }); return Promise.allSettled(w); };
  return { ctx, fire };
}

test('install retries the shell download instead of failing on one transient 404', async () => {
  let tries = 0; const timers = [];
  const { fire } = boot({ timers, addAll: async () => { tries++; if (tries < 3) throw new TypeError('404 during deploy'); } });
  const [r] = await fire('install');
  assert.equal(r.status, 'fulfilled'); assert.equal(tries, 3); assert.deepEqual(timers.slice(0, 2), [15000, 45000]);
});

test('install still fails after the retries run out (a file really missing is not hidden)', async () => {
  const timers = [];
  const { fire } = boot({ timers, addAll: async () => { throw new TypeError('missing'); } });
  const [r] = await fire('install');
  assert.equal(r.status, 'rejected');
});

test('RELEASE_BACKGROUND lets go of bounded background work at once', async () => {
  const src = SW;
  assert.match(src, /d\.type === 'RELEASE_BACKGROUND'\) releaseBackground\(\)/);
  const ctx = { setTimeout: () => 0, Promise };
  vm.runInNewContext(src.slice(src.indexOf('const BACKGROUND_MS'), src.indexOf('// Install retries')) + ';globalThis.bounded=bounded;globalThis.release=releaseBackground;', Object.assign(ctx, { globalThis: ctx }));
  let done = false; const p = ctx.bounded(new Promise(() => {})).then(() => { done = true; });   // work that never finishes
  await new Promise((r) => setTimeout(r, 5)); assert.equal(done, false);
  ctx.release(); await p; assert.equal(done, true);
});
