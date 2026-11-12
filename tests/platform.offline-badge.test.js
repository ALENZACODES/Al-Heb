// J1 offline indicator: shown only while offline, with a link to the offline help page; visited pages are served by sw.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { watchOnline, OFFLINE_TEXT } from '../src/shell/offline-badge.js';

function fakeWin(online) {
  const listeners = {};
  const mk = (tag) => ({ tag, hidden: false, style: {}, attrs: {}, kids: [], textContent: '', setAttribute(k, v) { this.attrs[k] = v; }, replaceChildren(...k) { this.kids = k; this.textContent = k.map((x) => (typeof x === 'string' ? x : x.textContent)).join(''); }, remove() {} });
  const header = { after(n) { this.next = n; } };
  const win = { navigator: { onLine: online }, addEventListener: (t, f) => { listeners[t] = f; }, removeEventListener() {}, document: { createElement: mk, querySelector: () => header, body: {} } };
  return { win, header, fire: (t) => listeners[t]() };
}

test('the line appears only while offline and links to the offline help', () => {
  const f = fakeWin(true);
  const w = watchOnline(f.win);
  assert.equal(f.header.next, w.line, 'placed right under the header');
  assert.equal(w.line.hidden, true);
  assert.equal(w.line.attrs.role, 'status');
  f.win.navigator.onLine = false; f.fire('offline');
  assert.equal(w.line.hidden, false);
  assert.ok(w.line.textContent.startsWith(OFFLINE_TEXT));
  assert.equal(w.line.kids[1].href, '#/offline');
  f.win.navigator.onLine = true; f.fire('online');
  assert.equal(w.line.hidden, true); assert.equal(w.line.textContent, '');
  assert.equal(watchOnline({}), null, 'no document: nothing');
});

test('wired at boot, and the service worker keeps a copy of every same-origin page file it fetched (visited content offline)', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /watchOnline\(window\)/);
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /const c = await caches\.open\(DATA\); c\.put\(req, res\.clone\(\)\);/);
  assert.match(sw, /return hit \|\| \(await net\) \|\| \(await caches\.match\('offline\.html'\)\)/);
});
