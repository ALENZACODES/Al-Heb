import test from 'node:test';
import assert from 'node:assert/strict';
import { waitFor } from './helpers/waitfor.js';
import { install, newRoot, all, sel, tick, El } from './wordtrace.fakedom.js';
import { loadTropeData } from '../src/trope/loader.js';
import * as M from '../src/trope/model.js';

const doc = install();
// the shared fake lacks append/replaceChildren, which the views use
const txt = (s) => doc.createTextNode(s);
El.prototype.append = function (...n) { for (const c of n) this.appendChild(c && c.nodeType ? c : txt(c)); };
El.prototype.replaceChildren = function (...n) { for (const c of [...this.childNodes]) this.removeChild(c); this.append(...n); };
El.prototype.remove = function () { this.parentNode?.removeChild(this); };

const data = await loadTropeData();
const seeded = (s = 3) => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
const { mount, DRAFT_NOTICE, MELODY_NOTE } = await import('../src/trope/trope.view.js');
const memStore = (init = {}) => { const m = { ...init }; return { m, get: (k) => m[k], set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); } }; };

test('model: names follow the corpus table per system; words only carry one known mark', () => {
  const a = M.nameMap(data.table, 'ashkenazi'), s = M.nameMap(data.table, 'sephardi');
  assert.equal(a.get('tipcha').name, 'Tipcha'); assert.equal(s.get('tipcha').name, 'Tarcha');
  assert.equal(M.systemFor('ashkenazi'), 'ashkenazi'); assert.equal(M.systemFor('israeli'), 'sephardi');
  const words = M.collectWords(data.passages, s);
  assert.ok(words.length > 30);
  for (const w of words) assert.ok(s.has(w.trope) && w.text.length > 0);
  const f = M.frequency(words);
  assert.ok(f.length >= 8 && f[0].n >= f[1].n);
});

test('model: questions have 4 distinct options including the answer, within the level', () => {
  const names = M.nameMap(data.table, 'sephardi'), words = M.collectWords(data.passages, names), freq = M.frequency(words);
  const rng = seeded();
  for (const level of [1, 2, 3]) for (let i = 0; i < 40; i++) {
    const q = M.buildQuestion({ words, names, freq, levels: data.levels, level, rng });
    assert.equal(q.options.length, 4); assert.equal(new Set(q.options.map((o) => o.id)).size, 4);
    assert.ok(q.options.some((o) => o.id === q.answer));
    const allowed = new Set(M.marksForLevel(freq, data.levels, level));
    assert.ok(q.options.every((o) => allowed.has(o.id)));
  }
});

test('model: state normalised and updated', () => {
  assert.deepEqual(M.normaliseState('junk'), M.emptyState());
  const s = M.applyAnswer(M.applyAnswer(null, 'tipcha', true), 'tipcha', false);
  assert.equal(s.answered, 2); assert.equal(s.correct, 1); assert.deepEqual(s.byTrope.tipcha, { seen: 2, right: 1 });
});

test('view: accessible, answers update store trope.v1, unmount works', async () => {
  const root = newRoot(doc), store = memStore();
  const un = mount(root, { tropeData: data, rng: seeded(9), store, settings: { get: () => 'ashkenazi' } });
  await waitFor(() => sel(root, 'section') && sel(root, 'h1'), { message: "trope view rendered" });
  assert.equal(sel(root, 'section').getAttribute('aria-labelledby'), 'view-title');
  assert.ok(sel(root, 'h1'));
  const he = sel(root, '[lang=he]'); assert.equal(he.getAttribute('dir'), 'rtl');
  assert.ok(root.textContent.includes(DRAFT_NOTICE) && root.textContent.includes('no recorded audio') && root.textContent.includes(MELODY_NOTE));
  assert.ok(sel(root, '#trope-level') && sel(root, 'label[for=trope-level]') || all(root, (n) => n.tagName === 'LABEL').length);
  const opts = all(root, (n) => n.tagName === 'BUTTON' && n.getAttribute('data-id'));
  assert.equal(opts.length, 4);
  assert.ok(opts.every((b) => b.getAttribute('type') === 'button' && b.textContent.length > 0));
  opts[0].click();
  assert.equal(store.m['trope.v1'].answered, 1);
  assert.ok(opts.every((b) => b.hasAttribute('disabled')));
  assert.match(sel(root, '[role=status]').textContent, /^(Right|Not yet)\./);
  sel(root, '#trope-next').click();
  assert.equal(all(root, (n) => n.tagName === 'BUTTON' && n.getAttribute('data-id') && !n.hasAttribute('disabled')).length, 4);
  un();
});

test('view: load failure shows a kind alert', async () => {
  const root = newRoot(doc);
  mount(root, { tropeData: { get table() { throw new Error('x'); } } });
  await waitFor(() => sel(root, '[role=alert]'), { message: "load-failure alert" });
  assert.ok(sel(root, '[role=alert]'));
});

test('view: the source line names the active setting, so Israeli is not shown as Sephardi/Mizrahi only', async () => {
  for (const [setting, want] of [['israeli', /Sephardi\/Mizrahi, used with your Modern Israeli setting/], ['ashkenazi', /Names: Ashkenazi \(change/]]) {
    const root = newRoot(doc);
    const un = mount(root, { tropeData: data, rng: seeded(9), store: memStore(), settings: { get: () => setting } });
    await waitFor(() => /Names:/.test(root.textContent), { message: 'names line' });
    assert.match(root.textContent, want, setting);
    un && un();
  }
});
