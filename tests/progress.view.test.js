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

test('no wording claims the app measures reading', async () => {
  const { text } = await show({ ...allRead(), 'timedread.v1': { v: 1, reads: [read(), read(), read()] } });
  assert.doesNotMatch(text, /measured by the app:|app measures your reading|your fluency score|fluency score:/i);
});

// ---------- stage 2: unified "What can I read now?" ----------
test('unified section comes first, has one row per source, marks self-reported rows and links each to its screen', async () => {
  const { root } = await show({ ...allRead(), 'timedread.v1': { v: 1, reads: [read()] }, 'firstday.progress': { step: 3, readWords: ['shalom'], done: false } });
  const first = root.queryAll('section.card')[0];
  assert.equal(first.attrs['aria-labelledby'], 'pg-h-now');
  assert.match(first.textContent, /^What can I read now\?/);
  const rows = first.queryAll('[data-now]');
  assert.deepEqual(rows.map((r) => r.attrs['data-now']), ['letters', 'lines', 'vocab', 'timedread', 'siddur', 'firstday']);
  assert.deepEqual(rows.map((r) => r.queryAll('a')[0].attrs.href), ['#/learn', '#/read', '#/vocab', '#/timedread', '#/service', '#/firstday']);
  assert.equal(rows.filter((r) => r.queryAll('.pg-self').length).map((r) => r.attrs['data-now']).join(), 'timedread,firstday');
  assert.match(rows[0].textContent, /27 of 27 letters, 15 of 15 signs/); assert.match(rows[3].textContent, /1 read of 1 text, about 90 clean words a minute/);
  assert.match(rows[5].textContent, /1 first-day word marked read; ladder 0 of 8/);
  assert.match(first.textContent, /None of it is a fluency score/);
  assert.match(root.queryAll('section.card')[1].textContent, /^Lines and words you can sound out/);
});
test('unified section hides the links of routes missing from this build and still renders every row', async () => {
  const { root } = await show({}, { routes: ['learn', 'read'] });
  const rows = root.queryAll('[data-now]');
  assert.equal(rows.length, 6);
  assert.deepEqual(rows.map((r) => r.queryAll('a').length), [1, 1, 0, 0, 0, 0]);
});

// ---------- stage 3: progress-only export / import ----------
const { inspectProgressBackup, exportProgressJSON } = await import('../src/progress/store.js');
test('export button produces a progress file whose checksum verifies; import is checked, confirmed, then applied and the screen rebuilt', async () => {
  const { root, store } = await show({ ...allRead(), 'timedread.v1': { v: 1, reads: [read(), read(), read()] } });
  const bk = section(root, 'pg-h-bk');
  assert.match(bk.textContent, /carries a checksum/);
  await bk.querySelector('#pg-bk-export').click();
  const box = bk.querySelector('.pg-bk-text'); // shown both with a download link (Blob present) and without
  assert.ok(box, 'file text shown'); const file = inspectProgressBackup(box.value); assert.equal(file.ok, true); assert.ok(file.keys.includes('timedread.v1')); assert.ok(file.keys.includes('progress.milestones.v1'), 'reached milestones travel with the progress file');
  // import into a fresh learner, by paste
  const { root: r2, store: s2 } = await show();
  const bk2 = section(r2, 'pg-h-bk');
  bk2.querySelector('#pg-bk-paste').value = box.value;
  await bk2.querySelector('#pg-bk-check').click();
  assert.match(bk2.querySelector('#pg-bk-status').textContent, /Checked: 4 progress keys.*Checksum matches\. Nothing is changed until you confirm/);
  assert.equal(s2.m['timedread.v1'], undefined, 'nothing written before confirm');
  await bk2.querySelector('#pg-bk-go').click();
  assert.equal(s2.m['timedread.v1'].reads.length, 3);
  assert.match(r2.querySelector('#pg-bk-status').textContent, /Imported 4 keys/);
  assert.match(section(r2, 'pg-h-belts').textContent, /Grey belt: Earned/, 'screen rebuilt from the imported data');
});
test('a tampered pasted file is refused with the checksum message and no confirm button appears', async () => {
  const { root, store } = await show();
  const bk = section(root, 'pg-h-bk');
  bk.querySelector('#pg-bk-paste').value = exportProgressJSON({ get: (k, d) => (k === 'progress.state' ? { rest: [], goal: { kind: 'cards', target: 20 } } : d) }, T).replace('"target": 20', '"target": 21');
  await bk.querySelector('#pg-bk-check').click();
  assert.match(bk.querySelector('#pg-bk-status').textContent, /checksum does not match.*Nothing was imported/);
  assert.equal(bk.querySelector('#pg-bk-go'), null); assert.deepEqual(Object.keys(store.m), []);
  bk.querySelector('#pg-bk-paste').value = 'not json';
  await bk.querySelector('#pg-bk-check').click();
  assert.match(bk.querySelector('#pg-bk-status').textContent, /not valid JSON/);
});
