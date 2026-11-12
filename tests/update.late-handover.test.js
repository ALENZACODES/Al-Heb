import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { watchForUpdates, STALL_MS } from '../src/shell/update.js';

// Live finding, 2026-11-11: the old worker held the hand-over while it finished a clip download, so the new worker took over
// after the 4 s stall timer; the page had stopped waiting and stayed on "Updating now…". A requested update now reloads whenever it lands.
test('a requested update reloads even when the hand-over arrives after the stall timer', async () => {
  const sw = new EventTarget(); sw.controller = {};
  const waiting = { messages: [], postMessage(m) { this.messages.push(m); } };
  const reg = new EventTarget(); reg.waiting = waiting; reg.update = async () => {};
  sw.getRegistration = async () => reg;
  let reloads = 0; const timers = [];
  const g = { navigator: { serviceWorker: sw }, location: { reload: () => { reloads++; } } };
  const h = watchForUpdates(g, { checkEveryMs: 0, setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clearTimeout: () => {} });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(h.state(), 'waiting');
  await h.apply();
  assert.deepEqual(waiting.messages, [{ type: 'SKIP_WAITING' }]);
  const stall = timers.find((t) => t.ms === STALL_MS); stall.f();
  assert.equal(h.state(), 'stalled');
  assert.equal(reloads, 0);
  sw.controller = {}; sw.dispatchEvent(new Event('controllerchange')); // the new worker finally takes over
  assert.equal(reloads, 1, 'the page reloads into the new version');
  sw.dispatchEvent(new Event('controllerchange'));
  assert.equal(reloads, 1, 'once only');
});

test('an update nobody asked for still only offers a reload (no surprise reload)', async () => {
  const sw = new EventTarget(); sw.controller = {};
  const reg = new EventTarget(); reg.waiting = null; sw.getRegistration = async () => reg;
  let reloads = 0;
  const h = watchForUpdates({ navigator: { serviceWorker: sw }, location: { reload: () => { reloads++; } } }, { checkEveryMs: 0 });
  await new Promise((r) => setTimeout(r, 0));
  sw.dispatchEvent(new Event('controllerchange'));
  assert.equal(reloads, 0); assert.equal(h.state(), 'activated');
});

test('the service worker caps background clip work so it never holds an update back for long', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /const BACKGROUND_MS = 15000;/);
  assert.doesNotMatch(sw, /waitUntil\((?:fillClip|revalidateClip)\(/, 'background clip work goes through bounded()');
  assert.equal((sw.match(/waitUntil\(bounded\(/g) || []).length, 3);
});
