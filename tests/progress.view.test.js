import test from 'node:test';
import assert from 'node:assert/strict';
import { N, tick } from './torahread.fakedom.js';
// The shared fake DOM has no Element.remove(); the Progress view removes its loading line that way.
N.prototype.remove = function remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); };
const { mount } = await import('../src/progress/progress.view.js');
const { loadProgressData } = await import('../src/progress/data.js');

const D = await loadProgressData();
const T = new Date('2026-11-10T12:00:00').getTime();
const memStore = (init = {}) => { const m = { ...init }; return { m, get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); } }; };
const readIds = D.lessons.filter((l) => l.track === 'read').map((l) => l.id);
const allRead = () => ({ 'curriculum.progress': { completed: Object.fromEntries(readIds.map((i) => [i, T])) }, 'curriculum.checkpoints': { 1: { right: 9, total: 10 }, 2: { right: 9, total: 10 }, 3: { right: 9, total: 10 } } });
const read = (o) => ({ textId: 'shema-1', lineId: 'shema-1', words: 12, ms: 8000, stumbled: 0, stumbledIdx: [], at: T, ...o }); // 90 clean wpm
async function show(init = {}, { routes = null, goal = 'read' } = {}) {
  const root = new N('div'); const store = memStore(init);
  const ctx = { store, settings: { get: (k) => (k === 'goal' ? goal : undefined) }, hasRoute: (n) => (routes ? routes.includes(n) : true) };
  const un = await mount(root, ctx);
  await tick();
  return { root, store, un, text: root.textContent };
}
const section = (root, id) => root.queryAll(`[aria-labelledby="${id}"]`)[0];

test('siddur coverage line: fresh learner shows 0% for Shabbat morning (the service default) with a link to the service screen', async () => {
  const { root } = await show();
  const line = root.querySelector('.pg-siddur');
  assert.ok(line, 'line rendered');
  assert.equal(line.attrs['data-pct'], '0'); assert.equal(line.attrs['data-order'], 'shabbat-morning');
  assert.match(line.textContent, /^Siddur coverage: 0% of the phrases in Shabbat morning you can read/);
  assert.equal(line.queryAll('a')[0].attrs.href, '#/service');
  assert.match(section(root, 'pg-h-read').textContent, /not that you read them fluently/);
});

test('siddur coverage line follows the saved service choice and rises with completed lessons', async () => {
  const { root } = await show({ ...allRead(), 'service.prefs': { order: 'friday-night' } });
  const line = root.querySelector('.pg-siddur');
  assert.equal(line.attrs['data-order'], 'friday-night');
  assert.match(line.textContent, /Siddur coverage: \d+% of the phrases in Friday evening you can read/);
  assert.ok(Number(line.attrs['data-pct']) > 0, 'all read lessons done: some lines decodable');
  const { root: r2 } = await show({ 'service.prefs': { order: 'weekday-morning' } }); // not a follow order: falls back to the default
  assert.equal(r2.querySelector('.pg-siddur').attrs['data-order'], 'shabbat-morning');
});

test('belts: grey shows its timed-read gate with the self-reported wording, a note and a link; earned once three reads qualify', async () => {
  const { root } = await show(allRead());
  const belts = section(root, 'pg-h-belts');
  assert.match(belts.textContent, /grey and black belts also ask for timed read-alouds, which you time and mark yourself \(self-reported, not measured by the app\)/i);
  assert.doesNotMatch(belts.textContent, /only a timed read is left/);
  const gate = belts.queryAll('[data-gate="timedRead"]')[0];
  assert.match(gate.textContent, /self-reported.*0 of 3 \(needs 3 timed reads of one text with 8\+ words\)/);
  assert.equal(gate.queryAll('a')[0].attrs.href, '#/timedread');
  assert.match(belts.textContent, /Grey belt: Working on/);
  const { root: r2 } = await show({ ...allRead(), 'timedread.v1': { v: 1, reads: [read(), read(), read()] } });
  const b2 = section(r2, 'pg-h-belts');
  assert.match(b2.textContent, /Grey belt: Earned/); assert.match(b2.textContent, /Black belt: Earned/);
  assert.equal(b2.queryAll('[data-gate="timedRead"] a').length, 0, 'no "Time a read" link once met');
});

test('belts: the timed-read link is hidden when the route is not in this build', async () => {
  const { root } = await show(allRead(), { routes: ['progress', 'service'] });
  assert.equal(section(root, 'pg-h-belts').queryAll('[data-gate="timedRead"] a').length, 0);
  assert.ok(root.querySelector('.pg-siddur'), 'coverage line does not depend on routes');
});

test('numbers: reading speed is self-reported and absent until a timed read exists', async () => {
  const { root } = await show();
  const num = section(root, 'pg-h-num').textContent;
  assert.match(num, /Timed reads \(self-reported\)none yet/); assert.match(num, /Reading speed \(self-reported\)not measured/);
  const { root: r2 } = await show({ 'timedread.v1': { v: 1, reads: [read(), read({ ms: 12000 })] } });
  const n2 = section(r2, 'pg-h-num').textContent;
  assert.match(n2, /2 reads of 1 text/); assert.match(n2, /about 75 clean words a minute on shema-1, median of your last reads/);
  assert.match(n2, /the app measures nothing but the clock/);
});

test('no wording claims the app measures reading, and nothing mentions the tooling that wrote it', async () => {
  const { text } = await show({ ...allRead(), 'timedread.v1': { v: 1, reads: [read(), read(), read()] } });
  assert.doesNotMatch(text, /measured by the app:|app measures your reading|fluency score/i);
  assert.doesNotMatch(text, /\bassistant\b|\bchatbot\b/i);
});
