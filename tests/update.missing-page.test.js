// "Page not found" on an address a newer build has: apply the waiting update at once instead of leaving the learner stuck.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { updateForMissingPage } from '../src/shell/update.js';
import { unavailableCard } from '../src/shell/ui.js';
import { t } from '../src/shell/i18n.js';

function fakeHandle(initial = 'idle') {
  let state = initial; const subs = new Set(); const calls = { apply: 0, check: 0 };
  return {
    calls, set(s) { state = s; for (const f of subs) f(s); },
    handle: { supported: true, state: () => state, onChange: (f) => { subs.add(f); return () => subs.delete(f); }, check: async () => { calls.check++; return false; }, apply: async () => { calls.apply++; } },
  };
}
const timers = () => { const q = []; return { q, setTimeout: (f) => { q.push(f); return q.length; }, clearTimeout: () => {} }; };

test('a waiting update, or a newer worker already in control, is applied at once', () => {
  for (const s of ['waiting', 'activated']) {
    const f = fakeHandle(s); let label = 0;
    updateForMissingPage(f.handle, { onUpdating: () => { label++; }, ...timers() });
    assert.equal(f.calls.apply, 1, s); assert.equal(label, 1, s);
  }
});

test('no update yet: it asks the server once and applies if one turns up; otherwise it gives up quietly', async () => {
  const f = fakeHandle('idle'); const tm = timers();
  updateForMissingPage(f.handle, tm);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(f.calls.check, 1); assert.equal(f.calls.apply, 0);
  f.set('waiting'); assert.equal(f.calls.apply, 1);
  f.set('waiting'); assert.equal(f.calls.apply, 1, 'once only');
  const g = fakeHandle('idle'); const tm2 = timers();
  updateForMissingPage(g.handle, tm2);
  tm2.q[0](); // the wait ran out
  g.set('waiting'); assert.equal(g.calls.apply, 0, 'nothing after the wait ends');
  assert.doesNotThrow(() => updateForMissingPage(null)); assert.doesNotThrow(() => updateForMissingPage({ supported: false }));
});

test('the shell calls it from Page not found, stops when the learner leaves, stores nothing, and says so on screen', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(app, /updateForMissingPage\(path, \(\) => \{ updating\.textContent = t\('notfound\.updating'\); \}\);/);
  assert.match(app, /window\.addEventListener\('hashchange', stopOnLeave\)/);
  const fn = app.slice(app.indexOf('function updateForMissingPage'), app.indexOf('function updateForMissingPage') + 900);
  assert.doesNotMatch(fn, /Storage|localStorage|sessionStorage/);
  assert.equal(t('notfound.updating'), 'A newer version has this page. Updating now…');
});

test('offline card: says the screen needs a connection the first time, with the technical detail kept', () => {
  class El { constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; } setAttribute(k, v) { this.attrs[k] = v; } append(...c) { this.children.push(...c); } appendChild(c) { this.children.push(c); return c; } replaceChildren(...c) { this.children = c; } get textContent() { return this.children.map((c) => (typeof c === 'string' ? c : c.textContent ?? c.data ?? '')).join(' '); } set textContent(v) { this.children = [String(v)]; } addEventListener() {} }
  const saved = globalThis.document;
  globalThis.document = { createElement: (x) => new El(x), createTextNode: (d) => ({ data: String(d), textContent: String(d) }) };
  try {
    const root = new El('main');
    unavailableCard(root, { title: 'Brain Lab', t, module: '../lab/lab.view.js', error: 'Failed to fetch', kind: 'offline' });
    const text = root.textContent;
    assert.match(text, /Brain Lab: Needs a connection the first time/);
    assert.match(text, /not saved on this device yet\. Connect to the internet and open it once\. After that it works offline too\./);
    assert.match(text, /Failed to fetch/);
    const root2 = new El('main'); unavailableCard(root2, { title: 'X', t, module: 'm', kind: 'error' });
    assert.match(root2.textContent, /This screen did not load/);
  } finally { globalThis.document = saved; }
});
