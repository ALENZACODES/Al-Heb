// Nikkud-fade engine, data and view (fake DOM: view logic, not browser rendering).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N, tick, btn, memStore } from './torahread.fakedom.js';
import * as M from '../src/nikkudfade/model.js';
import { buildSet } from '../tools/nikkudfade/build.mjs';

const set = JSON.parse(readFileSync(new URL('../data/nikkudfade/reading-set.json', import.meta.url), 'utf8'));
const sched = JSON.parse(readFileSync(new URL('../data/nikkudfade/schedule.json', import.meta.url), 'utf8'));
const PLAIN = set.items.filter((i) => !i.ambiguous && i.unlock <= 10);
const item = (o = {}) => ({ id: 'w1', he: 'שָׁלוֹם', ambiguous: false, ...o });

test('stripPoints removes vowel points, dagesh and shin dot only; keeps letters and maqaf', () => {
  assert.equal(M.stripPoints('שָׁלוֹם'), 'שלום');
  assert.equal(M.stripPoints('בְּ־'), 'ב־');
  assert.equal(M.stripPoints('abc'), 'abc');
  assert.ok(M.hasPoints('שָׁלוֹם') && !M.hasPoints('שלום') && !M.hasPoints(''));
});

test('stage 1 shows every word pointed; stage 3 shows none pointed; reveal shows the stored form', () => {
  const s1 = M.defaultState(), s3 = { ...M.defaultState(), stage: 3 };
  assert.equal(M.display(s1, item()).text, 'שָׁלוֹם');
  assert.equal(M.display(s3, item()).text, 'שלום');
  assert.equal(M.display(s3, item(), { revealed: true }).text, 'שָׁלוֹם');
  assert.equal(M.display(s3, item(), { revealed: true }).revealed, true);
});

test('stage 2: points only on new or ambiguous words', () => {
  let s = { ...M.defaultState(), stage: 2, auto: false };
  assert.deepEqual(M.pointsDecision(s, item()), { pointed: true, reason: 'new' });
  assert.deepEqual(M.pointsDecision(s, item({ ambiguous: true })), { pointed: true, reason: 'ambiguous' });
  for (let i = 0; i < M.DEFAULT_SCHEDULE.newAfter; i++) s = M.recordRead(s, 'w1');
  assert.deepEqual(M.pointsDecision(s, item()), { pointed: false, reason: 'faded' });
  assert.equal(M.pointsDecision(s, item({ ambiguous: true })).pointed, true, 'look-alike words keep their points');
});

test('auto schedule advances after steady unaided reads, with the data-file thresholds', () => {
  let s = M.defaultState();
  assert.equal(M.judge(s), 'stay');
  for (let i = 0; i < sched.minReadsPerStage; i++) s = M.recordRead(s, 'w' + i, { sched });
  assert.equal(s.stage, 2); assert.equal(s.stageReads, 0); assert.equal(s.changes.at(-1).why, 'advance');
  for (let i = 0; i < sched.minReadsPerStage; i++) s = M.recordRead(s, 'x' + i, { sched });
  assert.equal(s.stage, 3);
  for (let i = 0; i < 30; i++) s = M.recordRead(s, 'y' + i, { sched });
  assert.equal(s.stage, 3, 'stage 3 is the last');
});

test('auto schedule demotes when most reads are aided, and never goes below stage 1', () => {
  let s = { ...M.defaultState(), stage: 3 };
  for (let i = 0; i < sched.window; i++) s = M.recordRead(s, 'w' + i, { aided: true, sched });
  assert.equal(s.stage, 2); assert.equal(s.changes.at(-1).why, 'demote');
  let t = M.defaultState();
  for (let i = 0; i < 30; i++) t = M.recordRead(t, 'a' + i, { aided: true, sched });
  assert.equal(t.stage, 1);
});

test('aided reads at the threshold do not advance; mixed window stays put', () => {
  let s = M.defaultState();
  for (let i = 0; i < 10; i++) s = M.recordRead(s, 'w' + i, { aided: i < 3, sched }); // 30% aided > 20%
  assert.equal(s.stage, 1);
});

test('manual stage turns auto off and the schedule never overrides it', () => {
  let s = M.setStage(M.defaultState(), 3, 5);
  assert.equal(s.stage, 3); assert.equal(s.auto, false);
  for (let i = 0; i < 30; i++) s = M.recordRead(s, 'w' + i, { aided: true, sched });
  assert.equal(s.stage, 3);
  s = M.setAuto(s, true);
  for (let i = 0; i < sched.window; i++) s = M.recordRead(s, 'q' + i, { aided: true, sched });
  assert.equal(s.stage, 2);
  assert.equal(M.setStage(s, 9), s, 'an invalid stage is ignored');
});

test('normalizeState survives junk and clamps', () => {
  for (const bad of [null, undefined, 5, 'x', [], { stage: 99, words: 'no', recent: 'no', changes: [{}] }, { words: { a: null, b: { seen: -3, aided: 'x' } } }]) {
    const s = M.normalizeState(bad);
    assert.ok(M.STAGES.includes(s.stage)); assert.equal(typeof s.words, 'object'); assert.ok(Array.isArray(s.recent) && Array.isArray(s.changes));
  }
  assert.deepEqual(M.normalizeState({ words: { b: { seen: -3 } } }).words.b, { seen: 0, aided: 0 });
  const s = M.recordRead(M.defaultState(), 'k');
  assert.deepEqual(M.normalizeState(JSON.parse(JSON.stringify(s))), s, 'round-trips through JSON');
});

test('pickSession prefers least-seen words, is deterministic, and respects size', () => {
  const items = Array.from({ length: 20 }, (_, i) => item({ id: 'w' + i }));
  let s = M.defaultState();
  for (let i = 0; i < 10; i++) for (let k = 0; k < 3; k++) s = M.recordRead({ ...s, auto: false }, 'w' + i);
  const a = M.pickSession(items, s, { size: 8, seed: 3 }), b = M.pickSession(items, s, { size: 8, seed: 3 });
  assert.deepEqual(a.map((x) => x.id), b.map((x) => x.id));
  assert.equal(a.length, 8); assert.ok(a.every((x) => Number(x.id.slice(1)) >= 10));
});

test('reading set: built only from words.json, points only removed never added, flags consistent', () => {
  assert.deepEqual(M.checkReadingSet(set), []);
  assert.equal(set.count, set.items.length);
  const words = JSON.parse(readFileSync(new URL('../data/vocab/words.json', import.meta.url), 'utf8')).words;
  const byId = new Map(words.map((w) => [w.id, w]));
  for (const it of set.items) {
    const w = byId.get(it.id); assert.ok(w, it.id + ' is in words.json');
    assert.equal(it.he, w.he); assert.equal(it.en, w.en); assert.equal(it.translit, w.translit);
  }
  assert.ok(set.items.some((i) => i.ambiguous) && set.items.some((i) => !i.ambiguous));
  assert.equal(JSON.stringify(buildSet(words), null, 1) + '\n', readFileSync(new URL('../data/nikkudfade/reading-set.json', import.meta.url), 'utf8'), 'rebuild with node tools/nikkudfade/build.mjs');
});

test('reading set honest labelling: the data note says unreviewed', () => { assert.match(set.note, /Unreviewed/); });

test('view: draft note, labelled 44px controls, tap-to-reveal records an aided read, state persisted', async () => {
  const V = await import('../src/nikkudfade/nikkudfade.view.js');
  const root = new N('main'); const store = memStore();
  store.m[M.STORE_KEY] = { stage: 3, auto: false, words: {}, recent: [] };
  const un = V.mount(root, { store, nikkudfadeData: { set: { items: PLAIN.slice(0, 5) }, schedule: sched } });
  await tick();
  assert.match(root.textContent, /Draft and unreviewed/);
  assert.match(root.textContent, /does not grade/);
  const first = root.queryAll('.nf-big')[0].textContent;
  assert.equal(first, M.stripPoints(first), 'stage 3 word has no points');
  for (const b of root.all((n) => n.tag === 'button')) assert.match(b.attrs.style || '', /min-height:44px/);
  assert.ok(root.queryAll('[role="group"]')[0].attrs['aria-label']);
  await btn(root, /^Show the vowel marks/).click(); await tick();
  assert.match(root.textContent, /You showed the vowel marks/);
  assert.ok(M.hasPoints(root.queryAll('.nf-big')[0].textContent));
  await btn(root, /^I read it/).click(); await tick();
  assert.equal(store.m[M.STORE_KEY].recent.at(-1), 1, 'revealed word is stored as aided');
  assert.match(root.textContent, /Sounds like/);
  assert.match(root.queryAll('[role="status"]')[0].textContent, /aided/);
  un();
});

test('view: reading without reveal is stored as unaided; Not yet is aided; load failure shows an alert', async () => {
  const V = await import('../src/nikkudfade/nikkudfade.view.js');
  const root = new N('main'); const store = memStore();
  const un = V.mount(root, { store, nikkudfadeData: { set: { items: PLAIN.slice(0, 3) }, schedule: sched } });
  await tick();
  await btn(root, /^I read it/).click(); await tick();
  assert.equal(store.m[M.STORE_KEY].recent.at(-1), 0);
  await btn(root, /^Next word/).click(); await tick();
  await btn(root, /^Not yet/).click(); await tick();
  assert.equal(store.m[M.STORE_KEY].recent.at(-1), 1);
  un();
  const bad = new N('main');
  const un2 = V.mount(bad, { store: memStore(), nikkudfadeData: { set: null } });
  await tick(80);
  assert.ok(bad.queryAll('[role="alert"]').length || /Draft/.test(bad.textContent));
  un2();
});

test('stripPoints agrees with heUnpointed on every vocabulary word, except prefix entries whose unpointed form drops the maqaf', () => {
  const words = JSON.parse(readFileSync(new URL('../data/vocab/words.json', import.meta.url), 'utf8')).words;
  const bad = words.filter((w) => M.stripPoints(w.he) !== w.heUnpointed);
  for (const w of bad) assert.equal(M.stripPoints(w.he).replace('־', ''), w.heUnpointed, w.id);
  assert.ok(bad.length <= 20, 'only a handful of prefix entries differ');
});

test('look-alike flags come from data: every flagged item has a rival with the same unpointed spelling, different points, within the rank cap; re-running changes nothing', () => {
  const words = JSON.parse(readFileSync(new URL('../data/vocab/words.json', import.meta.url), 'utf8')).words;
  const byId = new Map(words.map((w) => [w.id, w]));
  let flagged = 0;
  for (const it of set.items) {
    if (!it.ambiguous) { assert.equal(it.rival, undefined); continue; }
    flagged += 1;
    const r = byId.get(it.rival.id);
    assert.equal(M.stripPoints(r.he), it.unpointed); assert.notEqual(r.he, it.he); assert.ok(r.modernRank <= set.rivalRank, it.id);
    assert.equal(it.rival.he, r.he); assert.equal(it.rival.translit, r.translit);
  }
  assert.ok(flagged > 20 && flagged < set.items.length / 2);
  assert.match(set.note, new RegExp(`${flagged} of ${set.items.length} flagged`));
  // no unflagged item has a qualifying rival
  for (const it of set.items.filter((i) => !i.ambiguous)) assert.ok(!words.some((w) => w.id !== it.id && w.modernRank <= set.rivalRank && M.stripPoints(w.he) === it.unpointed && w.he !== it.he), it.id);
  assert.ok(set.items.every((i) => i.en.length <= 40));
});

test('lesson filter: nothing later than the learner has reached (floor: the first-release path r10)', () => {
  assert.equal(M.lessonReached(null), 10); assert.equal(M.lessonReached({ completed: { r03: 1 } }), 10); assert.equal(M.lessonReached({ completed: { r14: 1, r02: 1, x: 1 } }), 15);
  for (const reached of [3, 10, 15]) { const f = M.filterByLesson(set.items, reached); assert.ok(f.length > 0 && f.every((i) => i.unlock <= reached)); }
  assert.equal(M.filterByLesson(set.items, 3, true).length, set.items.length);
  const sess = M.pickSession(M.filterByLesson(set.items, 10), M.defaultState(), { size: 8, seed: 5 });
  assert.ok(sess.every((i) => i.unlock <= 10));
});

test('soundChoices: a look-alike offers its own sound and the rival sound; the right pick is graded right; plain words offer none', () => {
  const amb = set.items.find((i) => i.ambiguous && i.rival.translit !== i.translit);
  const c = M.soundChoices(amb, 3);
  assert.deepEqual(c.map((o) => o.label).sort(), [amb.translit, amb.rival.translit].sort());
  assert.equal(M.gradeSound(c.find((o) => o.label === amb.translit).id), true); assert.equal(M.gradeSound(c.find((o) => o.label === amb.rival.translit).id), false);
  assert.deepEqual(M.soundChoices(amb, 3), c);
  assert.equal(M.soundChoices(PLAIN[0]), null);
  assert.equal(M.soundChoices({ ...amb, rival: { ...amb.rival, translit: amb.translit } }), null, 'identical respellings cannot be told apart');
});

test('view: a wrong sound pick on a look-alike word is stored as aided; a right pick as unaided; practice-any-lesson toggle works', async () => {
  const V = await import('../src/nikkudfade/nikkudfade.view.js');
  const amb = set.items.find((i) => i.ambiguous && i.rival.translit !== i.translit && i.unlock <= 10);
  for (const [pickOwn, expect] of [[false, 1], [true, 0]]) {
    const root = new N('main'), store = memStore(); store.m[M.STORE_KEY] = { stage: 3, auto: false };
    const un = V.mount(root, { store, nikkudfadeData: { set: { items: [amb] }, schedule: sched } }); await tick();
    await btn(root, /^I read it/).click(); await tick();
    assert.match(root.textContent, /Which word did you read/);
    const want = pickOwn ? amb.translit : amb.rival.translit;
    await root.all((n) => n.tag === 'button' && n.textContent === want)[0].click(); await tick();
    assert.equal(store.m[M.STORE_KEY].recent.at(-1), expect); un();
  }
  const root = new N('main'), store = memStore(); store.m['curriculum.progress'] = { completed: { r20: 1 } };
  const un = V.mount(root, { store, nikkudfadeData: { set: { items: set.items }, schedule: sched } }); await tick();
  assert.match(root.textContent, /up to 21/);
  await btn(root, /^Words from any lesson: off/).click(); await tick();
  assert.match(root.textContent, /Words from every lesson/);
  assert.ok(root.queryAll('a').some((a) => a.attrs.href === '#/torahread/ladder') && root.queryAll('a').some((a) => a.attrs.href === '#/firstday/ladder')); un();
});

test('homographs lookup covers every vocabulary row with a look-alike within the rank cap, and agrees with the reading set', async () => {
  const H = JSON.parse(readFileSync(new URL('../data/nikkudfade/homographs.json', import.meta.url), 'utf8'));
  const words = JSON.parse(readFileSync(new URL('../data/vocab/words.json', import.meta.url), 'utf8')).words;
  const byId = new Map(words.map((w) => [w.id, w]));
  assert.equal(H.count, Object.keys(H.ids).length); assert.ok(H.count > 300);
  for (const [id, r] of Object.entries(H.ids)) { const w = byId.get(id), rw = byId.get(r.id); assert.equal(M.stripPoints(w.he), M.stripPoints(rw.he)); assert.notEqual(w.he, rw.he); assert.ok(rw.modernRank <= H.rivalRank); }
  for (const it of set.items) assert.equal(!!M.ambiguousFor(H, it.id), it.ambiguous, it.id);
  assert.equal(M.ambiguousFor(H, 'nope'), null); assert.equal(M.ambiguousFor(null, 'x'), null);
  const b = (await import('../tools/nikkudfade/build.mjs')).buildHomographs(words);
  assert.equal(JSON.stringify(b) + '\n', readFileSync(new URL('../data/nikkudfade/homographs.json', import.meta.url), 'utf8'), 'rebuild with node tools/nikkudfade/build.mjs');
});
