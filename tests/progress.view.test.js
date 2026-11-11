import test from 'node:test';
import assert from 'node:assert/strict';
import { waitFor } from './helpers/waitfor.js';
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
  await waitFor(() => !/Loading your progre/.test(root.textContent), { message: "progress view finished loading" });
  return { root, store, un, text: root.textContent };
}
const section = (root, id) => root.queryAll(`[aria-labelledby="${id}"]`)[0];

test('siddur coverage line: fresh learner shows 0% for Shabbat morning (the service default) with a link to the service screen', async () => {
  const { root } = await show();
  const line = root.querySelector('.pg-siddur');
  assert.ok(line, 'line rendered');
  assert.equal(line.attrs['data-pct'], '0'); assert.equal(line.attrs['data-order'], 'shabbat-morning');
  assert.match(line.textContent, /^Prayer book coverage: 0% of the phrases in Shabbat morning use signs you have practiced/);
  assert.equal(line.queryAll('a')[0].attrs.href, '#/service');
  assert.match(section(root, 'pg-h-read').textContent, /content coverage, not a reading assessment/);
});

test('siddur coverage line follows the saved service choice and rises with completed lessons', async () => {
  const { root } = await show({ ...allRead(), 'service.prefs': { order: 'friday-night' } });
  const line = root.querySelector('.pg-siddur');
  assert.equal(line.attrs['data-order'], 'friday-night');
  assert.match(line.textContent, /Prayer book coverage: \d+% of the phrases in Friday evening use signs you have practiced/);
  assert.ok(Number(line.attrs['data-pct']) > 0, 'all read lessons done: some lines decodable');
  const { root: r2 } = await show({ 'service.prefs': { order: 'weekday-morning' } }); // not a follow order: falls back to the default
  assert.equal(r2.querySelector('.pg-siddur').attrs['data-order'], 'shabbat-morning');
});

test('belts and ranks: Krav Maga style ladder in text; earned only by lessons; timed-read skill checks are self-reported, with a link', async () => {
  const { root: r0 } = await show();
  const b0 = section(r0, 'pg-h-belts');
  assert.match(b0.textContent, /Belts and ranks/); assert.match(b0.textContent, /Your rank: none yet · next: White belt · P0 \(0 of 4 lessons\)/);
  assert.match(b0.textContent, /White belt · P0: Working on/); assert.match(b0.textContent, /Yellow belt · P2: Later/);
  assert.equal(b0.queryAll('li[data-state]').length, 16);
  const badge = b0.querySelector('.alef-rank'); assert.ok(badge.attrs.title && /White belt, Practitioner 0/.test(badge.attrs.title), 'accessible description, not colour alone');
  const { root } = await show(allRead());
  const belts = section(root, 'pg-h-belts');
  assert.match(belts.textContent, /The Brown belt · G5 and Black belt · E5 skill checks include timed read-alouds, which you time and mark yourself \(self-reported, not measured by the app\)\. They do not earn or hold back a rank\./);
  const gate = belts.queryAll('[data-gate="timedRead"]')[0];
  assert.match(gate.textContent, /self-reported.*0 of 3 \(needs 3 timed reads of one text with 8\+ words\)/);
  assert.equal(gate.queryAll('a')[0].attrs.href, '#/timedread');
  assert.match(belts.textContent, /Brown belt · G5: Earned/); assert.match(belts.textContent, /Black belt · E5: Earned/, 'every reading lesson done earns every rank');
  assert.match(belts.textContent, /every rank earned/);
  const { root: r2 } = await show({ ...allRead(), 'timedread.v1': { v: 1, reads: [read(), read(), read()] } });
  const b2 = section(r2, 'pg-h-belts');
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
  assert.match(first.textContent, /^What have I practiced\?/);
  const rows = first.queryAll('[data-now]');
  assert.deepEqual(rows.map((r) => r.attrs['data-now']), ['letters', 'lines', 'vocab', 'timedread', 'siddur', 'firstday']);
  assert.deepEqual(rows.map((r) => r.queryAll('a')[0].attrs.href), ['#/learn', '#/read', '#/vocab', '#/timedread', '#/service', '#/firstday']);
  assert.equal(rows.filter((r) => r.queryAll('.pg-self').length).map((r) => r.attrs['data-now']).join(), 'timedread,firstday');
  assert.match(rows[0].textContent, /27 of 27 letters, 15 of 15 signs/); assert.match(rows[3].textContent, /1 read of 1 text, about 90 clean words a minute/);
  assert.match(rows[5].textContent, /1 first-day word marked read; ladder 0 of 8/);
  assert.match(first.textContent, /None of it is a fluency score/);
  assert.match(root.queryAll('section.card')[1].textContent, /^Lines and words using signs you have practiced/);
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
  assert.match(bk.textContent, /built-in check/);
  await bk.querySelector('#pg-bk-export').click();
  const box = bk.querySelector('.pg-bk-text'); // shown both with a download link (Blob present) and without
  assert.ok(box, 'file text shown'); const file = inspectProgressBackup(box.value); assert.equal(file.ok, true); assert.ok(file.keys.includes('timedread.v1')); assert.ok(file.keys.includes('progress.milestones.v1'), 'reached milestones travel with the progress file');
  // import into a fresh learner, by paste
  const { root: r2, store: s2 } = await show();
  const bk2 = section(r2, 'pg-h-bk');
  bk2.querySelector('#pg-bk-paste').value = box.value;
  await bk2.querySelector('#pg-bk-check').click();
  assert.match(bk2.querySelector('#pg-bk-status').textContent, /Checked: 4 saved items.*The file check passed\. Nothing is changed until you confirm/);
  assert.equal(s2.m['timedread.v1'], undefined, 'nothing written before confirm');
  await bk2.querySelector('#pg-bk-go').click();
  assert.equal(s2.m['timedread.v1'].reads.length, 3);
  assert.match(r2.querySelector('#pg-bk-status').textContent, /Imported 4 saved items/);
  assert.match(section(r2, 'pg-h-belts').textContent, /Brown belt · G5: Earned/, 'screen rebuilt from the imported data');
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

// ---------- weak report, this week, milestones ----------
const weekRec = (o) => ({ v: 2, count: 2, best: 2, last: '2026-11-10', todayDate: '2026-11-10', todaySeconds: 400, frozenDates: [], doneDates: ['2026-11-09', '2026-11-10'], freeze: true, mode: 'reform', ...o });
async function showAt(init, iso = '2026-11-10', o) {
  const real = Date.now; const at = new Date(iso + 'T12:00:00').getTime();
  Date.now = () => at;
  try { return await show(init, o); } finally { Date.now = real; }
}

test('weak report section: ten at most, each with "Do this next" and a link, merged rows, honest header', async () => {
  const cards = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`letter:l${i}`, { id: `letter:l${i}`, kind: 'letter', state: 'review', stability: 3, reps: 3, lapses: 12 - i, lastReview: T }]));
  const { root } = await show({ 'srs.cards': cards, 'letters.progress': { l0: { print: { completions: 2, perfect: 0, bestMistakes: 3 } } } });
  const sec = section(root, 'pg-h-weak');
  const items = sec.queryAll('li');
  assert.equal(items.length, 10);
  assert.equal(items[0].attrs['data-weak'], 'letter:l0');
  assert.match(items[0].textContent, /Slipped 12 times in review; Your best tracing run still had 3 slips\./);
  for (const li of items) { assert.match(li.textContent, /Do this next: .+/); assert.match(li.queryAll('a')[0].attrs.href, /^#\//); }
  assert.match(sec.textContent, /Each source counts slips its own way, so the order is a rough guide/);
  assert.match(sec.textContent, /browser recognizer or on your own marks/);
});

test('weak report: empty state is gentle, and a Hebrew word row is set as Hebrew', async () => {
  const { root } = await show();
  assert.match(section(root, 'pg-h-weak').textContent, /Nothing stands out yet/);
  const r = (o) => ({ textId: 'shema-1', lineId: 'shema-1', words: 6, ms: 9000, stumbled: 1, stumbledIdx: [1], at: T, ...o });
  const { root: r2 } = await show({ 'timedread.v1': { v: 1, reads: [r(), r()] } });
  const he = section(r2, 'pg-h-weak').queryAll('li')[0].queryAll('[lang="he"]');
  assert.equal(he.length, 1); assert.equal(he[0].attrs.dir, 'rtl');
});

test('weak report links respect hasRoute', async () => {
  const seed = { 'srs.vocab': { 'vocab:1': { id: 'vocab:1', tier: 500, topic: 'food-drink', state: 'review', reps: 3, lapses: 3, stability: 2, lastReview: T } } };
  const a = await show(seed); assert.equal(section(a.root, 'pg-h-weak').queryAll('a')[0].attrs.href, '#/vocab');
  const b = await show(seed, { routes: ['learn'] }); assert.equal(section(b.root, 'pg-h-weak').queryAll('a')[0].attrs.href, '#/learn?review=1');
});

test('this week card: engaged days, floor minutes, streak, honored rest days and the 8-week sparkline with a text alternative', async () => {
  const { root } = await showAt({ streak: weekRec({ doneDates: ['2026-11-08', '2026-11-09', '2026-11-10'], count: 3, best: 3 }), 'curriculum.progress': { completed: { r01: new Date('2026-11-09T10:00:00').getTime() } } });
  const sec = section(root, 'pg-h-week');
  assert.ok(sec);
  const t = (k) => sec.querySelector(`[data-w="${k}"]`).textContent;
  assert.match(t('days'), /^3 of 7 days reached the daily goal$/);
  assert.match(t('minutes'), /^At least 16 minutes engaged$/); // two past days at 5 minutes + 400 s today = 16.7, floored
  assert.match(t('streak'), /^Streak: 3 days$/);
  assert.match(t('rest'), /^1 rest day honored \(1 Shabbat\)$/); // Sat 7 Nov, freeze on
  assert.match(t('reads'), /self-reported/);
  const wrap = sec.querySelector('.pg-spark-wrap');
  assert.equal(wrap.attrs['data-series'], '0,0,0,0,0,0,0,1');
  assert.match(wrap.innerHTML, /^<svg [^>]*role="img"[^>]*aria-label="Dated activity per week, oldest to newest: 0, 0, 0, 0, 0, 0, 0, 1"/);
  assert.match(sec.querySelector('[data-w="series"]').textContent, /Oldest week to this week: 0, 0, 0, 0, 0, 0, 0, 1 \(1 in all\)/);
  assert.match(sec.textContent, /at least/i); assert.match(sec.textContent, /This is activity, not a measure of how well you read/);
  assert.doesNotMatch(sec.textContent, /fluen(t|cy) (score|level)/i);
});

test('this week card without any history: zeros, no invented minutes, an all-zero graph that still has a text alternative', async () => {
  const { root } = await showAt({});
  const sec = section(root, 'pg-h-week');
  assert.match(sec.querySelector('[data-w="minutes"]').textContent, /^At least 0 minutes engaged$/);
  assert.match(sec.querySelector('[data-w="rest"]').textContent, /^No rest days in this week$/);
  assert.equal(sec.querySelector('.pg-spark-wrap').attrs['data-series'], '0,0,0,0,0,0,0,0');
});

test('milestones list: certificate-free, shows reached ones with dates and the rest with progress, and records them once', async () => {
  const noon = (iso) => new Date(iso + 'T12:00:00').getTime();
  const sp = (await loadProgressData()).registry.find((e) => e.category === 'siddur').id;
  const init = { ...allRead(), 'timedread.v1': { v: 1, reads: [read({ textId: sp, lineId: sp, at: noon('2026-11-03') })] } };
  const { root, store } = await showAt(init);
  const sec = section(root, 'pg-h-ms');
  assert.match(sec.textContent, /no certificate, badge or level/);
  const row = (id) => sec.querySelector(`[data-ms="${id}"]`);
  assert.equal(row('prayer-read').attrs['data-done'], '1'); assert.match(row('prayer-read').textContent, /Reached.*\(2026-11-03\)/);
  assert.equal(row('siddur-25').attrs['data-done'], '1'); assert.match(row('siddur-25').textContent, /\(first noticed 2026-11-10\)/);
  assert.equal(row('words-100').attrs['data-done'], '0'); assert.match(row('words-100').textContent, /Not yet.*\(0 of 100\)/);
  assert.equal(row('words-100').queryAll('a')[0].attrs.href, '#/vocab');
  assert.equal(store.m['progress.milestones.v1'].achieved['prayer-read'].basis, 'dated');
  const kept = JSON.stringify(store.m['progress.milestones.v1']);
  // reopening on a later day keeps the first date
  const { root: r2 } = await showAt({ ...init, 'progress.milestones.v1': store.m['progress.milestones.v1'] }, '2026-12-05');
  assert.match(r2.querySelector('[data-ms="siddur-25"]').textContent, /first noticed 2026-11-10/);
  assert.doesNotMatch(sec.textContent, /fluen|master|champion/i);
  assert.ok(kept.includes('siddur-25'));
});

test('milestones: a store that refuses writes does not break the screen', async () => {
  const root = new N('div'); const m = { ...allRead() };
  const store = { m, get: (k, d) => (k in m ? m[k] : d), set: () => { throw new Error('quota'); } };
  const un = await mount(root, { store, settings: { get: () => 'read' } }); await waitFor(() => section(root, 'pg-h-ms') && section(root, 'pg-h-week'), { message: "milestones and week sections" });
  assert.ok(section(root, 'pg-h-ms')); assert.ok(section(root, 'pg-h-week')); un();
});
