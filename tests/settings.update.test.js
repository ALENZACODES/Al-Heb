// Update flow: a waiting worker shows a banner, nothing reloads by itself, and "Reload now" never fires mid-exercise.
import test from 'node:test';
import assert from 'node:assert/strict';
import { watchForUpdates, mountUpdateBanner, mountStorageNotice, isBusyDefault, markBusy } from '../src/shell/update.js';
import { createStore, createMemoryStorage } from '../src/store.js';

function el(tag) {
  const e = { tag, attrs: {}, kids: [], ls: {}, hidden: false, className: '', textContent: '', style: {},
    setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; },
    append(...k) { this.kids.push(...k); }, remove() { this.removed = true; },
    addEventListener(t, f) { (this.ls[t] ||= []).push(f); }, click() { for (const f of this.ls.click || []) f(); },
    querySelector(sel) { return find(this, sel); }, querySelectorAll() { return []; } };
  return e;
}
function find(root, sel) { const id = sel.startsWith('#') ? sel.slice(1) : null; for (const k of root.kids) { if (typeof k !== 'object') continue; if (id && k.attrs.id === id) return k; const r = find(k, sel); if (r) return r; } return null; }
function fakeDoc() {
  const body = el('body'); const win = { ls: {}, addEventListener(t, f) { (this.ls[t] ||= []).push(f); }, removeEventListener() {} };
  const doc = { body, defaultView: win, createElement: el, querySelector(sel) { return sel.includes('data-busy') && body.attrs['data-busy'] === 'true' ? body : null; }, querySelectorAll: () => [] };
  return { doc, win, bar: () => body.kids[0], fireHash: () => (win.ls.hashchange || []).forEach((f) => f()) };
}
function fakeSW({ withController = true } = {}) {
  const ls = {}; const posted = []; const reg = { waiting: null, listeners: {}, addEventListener(t, f) { this.listeners[t] = f; }, update: async () => {} };
  let reloads = 0; const sw = { controller: withController ? {} : null, addEventListener(t, f) { ls[t] = f; }, removeEventListener() {}, getRegistration: async () => reg };
  const g = { navigator: { serviceWorker: sw }, location: { reload() { reloads++; } } };
  return { g, reg, posted, ls, reloads: () => reloads, waiting: { postMessage: (m) => posted.push(m), addEventListener() {}, state: 'installed' } };
}
const tick = () => new Promise((r) => setImmediate(r));

test('a waiting worker shows the banner but never reloads or activates by itself', async () => {
  const f = fakeSW(); f.reg.waiting = f.waiting;
  const h = watchForUpdates(f.g, { checkEveryMs: 0 }); await tick();
  assert.equal(h.state(), 'waiting');
  const d = fakeDoc(); const rm = mountUpdateBanner(h, { document: d.doc, isBusy: () => false });
  assert.equal(d.bar().hidden, false); await tick(); await tick();
  assert.equal(f.reloads(), 0); assert.deepEqual(f.posted, []); // nothing happened without a click
  rm(); h.stop();
});

test('Reload now during an exercise waits; it reloads only after the exercise ends (route change), never in the middle', async () => {
  const f = fakeSW(); f.reg.waiting = f.waiting;
  const h = watchForUpdates(f.g, { checkEveryMs: 0 }); await tick();
  const d = fakeDoc(); let busy = true; let tickFn = null; const cleared = [];
  mountUpdateBanner(h, { document: d.doc, isBusy: () => busy, setInterval: (fn) => { tickFn = fn; return 7; }, clearInterval: (x) => cleared.push(x) });
  const reloadBtn = d.bar().kids[1]; reloadBtn.click();
  assert.deepEqual(f.posted, []); assert.match(d.bar().kids[0].textContent, /reload when you finish/);
  tickFn(); d.fireHash(); assert.deepEqual(f.posted, []); // still busy: nothing
  busy = false; d.fireHash(); await tick();
  assert.deepEqual(f.posted, [{ type: 'SKIP_WAITING' }]); assert.deepEqual(cleared, [7]);
});

test('Later cancels a pending reload; idle click reloads immediately', async () => {
  const f = fakeSW(); f.reg.waiting = f.waiting;
  const h = watchForUpdates(f.g, { checkEveryMs: 0 }); await tick();
  const d = fakeDoc(); let busy = true;
  mountUpdateBanner(h, { document: d.doc, isBusy: () => busy, setInterval: () => 1, clearInterval() {} });
  d.bar().kids[1].click(); d.bar().kids[2].click(); busy = false; d.fireHash(); assert.deepEqual(f.posted, []); assert.equal(d.bar().hidden, true);
  d.bar().hidden = false; d.bar().kids[1].click(); assert.equal(f.posted.length, 1);
});

test('busy detection: marked body counts, markBusy toggles, plain pages are idle', () => {
  const d = fakeDoc(); assert.equal(isBusyDefault(d.doc), false); markBusy(true, d.doc); assert.equal(isBusyDefault(d.doc), true); markBusy(false, d.doc); assert.equal(isBusyDefault(d.doc), false);
});

test('storage notice banner appears when the store cannot save and hides when it can again', () => {
  const d = fakeDoc(); const t = createStore({ storage: null, window: null });
  const rm = mountStorageNotice(t, { document: d.doc }); const bar = d.bar();
  assert.equal(bar.hidden, false); assert.match(bar.kids[0].textContent, /private browsing|memory only/);
  const ok = createStore({ storage: createMemoryStorage(), window: null }); const d2 = fakeDoc(); mountStorageNotice(ok, { document: d2.doc }); assert.equal(d2.bar().hidden, true);
  rm(); assert.equal(bar.removed, true);
});

test('boot-apply: a worker already waiting at startup is applied without a click when the option is on', async () => {
  const f = fakeSW(); f.reg.waiting = f.waiting;
  const h = watchForUpdates(f.g, { checkEveryMs: 0, applyWaitingAtBoot: true, bootApplyDelayMs: 1 }); await tick();
  assert.equal(h.state(), 'waiting');
  await new Promise((r) => setTimeout(r, 30));
  assert.deepEqual(f.posted, [{ type: 'SKIP_WAITING' }]); // applied on its own: the relaunch remedy works
  h.stop();
});

test('boot-apply stays off without the option: a waiting worker at startup is banner-only', async () => {
  const f = fakeSW(); f.reg.waiting = f.waiting;
  const h = watchForUpdates(f.g, { checkEveryMs: 0, bootApplyDelayMs: 1 }); await tick();
  await new Promise((r) => setTimeout(r, 30));
  assert.deepEqual(f.posted, []); assert.equal(f.reloads(), 0);
  h.stop();
});

test('boot-apply never touches an update that installs mid-session', async () => {
  const f = fakeSW(); // no waiting worker at startup
  const h = watchForUpdates(f.g, { checkEveryMs: 0, applyWaitingAtBoot: true, bootApplyDelayMs: 1 }); await tick();
  const w = { state: 'installing', ls: {}, addEventListener(t, fn) { (this.ls[t] ||= []).push(fn); } };
  f.reg.installing = w;
  f.reg.listeners.updatefound(); // a new worker appears during the session
  w.state = 'installed'; (w.ls.statechange || []).forEach((fn) => fn());
  assert.equal(h.state(), 'waiting');
  await new Promise((r) => setTimeout(r, 30));
  assert.deepEqual(f.posted, []); assert.equal(f.reloads(), 0); // banner path only, as designed
  h.stop();
});
