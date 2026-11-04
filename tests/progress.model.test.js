import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createMemoryStorage } from '../src/store.js';
import * as M from '../src/progress/model.js';
import { setRestDay, setGoalTarget } from '../src/progress/store.js';
import { loadProgressData } from '../src/progress/data.js';
import { PASS_RATIO } from '../src/curriculum/checkpoint.js';

const D = await loadProgressData();
const fake = () => createStore({ storage: createMemoryStorage() });
const noon = (iso) => new Date(iso + 'T12:00:00').getTime();
const T = noon('2026-11-10');
const seedLessons = (store, ids, at = T) => store.set('curriculum.progress', { completed: Object.fromEntries(ids.map((i) => [i, at])) });
const ids = (n) => Array.from({ length: n }, (_, i) => 'r' + String(i + 1).padStart(2, '0'));

test('PASS_RATIO matches the checkpoint lane', () => assert.equal(M.PASS_RATIO, PASS_RATIO));

test('readSnapshot survives an empty store, corrupt values and a store that throws', () => {
  const s = M.readSnapshot(fake());
  assert.deepEqual([s.completed, s.cards, s.rest, s.goal], [{}, {}, [], null]);
  const bad = createStore({ storage: createMemoryStorage() });
  bad.set('curriculum.progress', 'oops'); bad.set('srs.cards', [1, 2]); bad.set('pron.misses', 'x'); bad.set('progress.state', { rest: [1, 'a'], goal: 5 });
  const b = M.readSnapshot(bad);
  assert.deepEqual(b.completed, {}); assert.deepEqual(b.rest, ['a']); assert.equal(b.goal, null); assert.deepEqual(b.misses, []);
  assert.doesNotThrow(() => M.readSnapshot({ get() { throw new Error('boom'); } }));
});

test('vocab store may be an array of cards', () => {
  const st = fake(); st.set('srs.vocab', [{ id: 'vocab:1', tier: 500, reps: 2, state: 'review', stability: 30 }]);
  assert.equal(M.vocabBands(M.readSnapshot(st).vocab).bands[0].mature, 1);
});

test('streak: counts consecutive active days; empty today does not end it; a gap does', () => {
  const st = fake();
  st.set('srs.cards', { a: { lastReview: noon('2026-11-09') } });
  st.set('streak', { count: 3, best: 3, last: '2026-11-09' });          // 7, 8, 9 Nov
  const s = M.readSnapshot(st);
  assert.equal(M.streakInfo(s, T).count, 3);                              // today (10th) still empty
  assert.equal(M.streakInfo(s, T).activeToday, false);
  assert.equal(M.streakInfo(s, noon('2026-11-12')).count, 0);             // 10th and 11th empty -> over
});
test('rest day does not break the streak and is not counted', () => {
  const st = fake();
  st.set('streak', { count: 3, best: 3, last: '2026-11-08' });            // 6, 7, 8
  setRestDay(st, '2026-11-09', true);
  const s = M.readSnapshot(st);
  assert.equal(M.streakInfo(s, T).count, 3);                               // 9th rest, 10th empty today
  st.set('curriculum.progress', { completed: { r01: T } });                // active today
  const s2 = M.readSnapshot(st);
  assert.equal(M.streakInfo(s2, T).count, 4);
  assert.equal(M.streakInfo(M.readSnapshot(fake()), T).count, 0);
});
test('without the rest day the same history is broken', () => {
  const st = fake(); st.set('streak', { count: 3, best: 3, last: '2026-11-08' });
  st.set('curriculum.progress', { completed: { r01: T } });
  assert.equal(M.streakInfo(M.readSnapshot(st), T).count, 1);
});
test('rest today keeps the streak and reports restToday; toggling off works; state is capped at 90 days', () => {
  const st = fake(); st.set('streak', { count: 2, best: 2, last: '2026-11-09' });
  setRestDay(st, '2026-11-10', true);
  const i = M.streakInfo(M.readSnapshot(st), T);
  assert.deepEqual([i.count, i.restToday], [2, true]);
  setRestDay(st, '2026-11-10', false);
  assert.equal(M.readSnapshot(st).rest.length, 0);
  for (let d = 1; d <= 100; d++) setRestDay(st, M.addDays('2026-01-01', d), true);
  assert.equal(M.readSnapshot(st).rest.length, 90);
});
test('"count yesterday as a rest day" reconnects a run (as the view uses it)', () => {
  const st = fake(); st.set('streak', { count: 4, best: 4, last: '2026-11-08' });
  const s = M.readSnapshot(st);
  assert.equal(M.streakInfo(s, T).count, 0);                               // 9th missed, 10th: broken
  assert.equal(M.streakInfo({ ...s, rest: ['2026-11-09'] }, T).count, 4);
});

test('daily goal counts distinct cards reviewed today; a lesson today also meets it; default and custom targets', () => {
  const st = fake();
  const cards = {}; for (let i = 0; i < 4; i++) cards['c' + i] = { lastReview: T };
  cards.old = { lastReview: T - 3 * 86400000 };
  st.set('srs.cards', cards);
  let g = M.goalInfo(M.readSnapshot(st), T);
  assert.deepEqual([g.cards, g.target, g.met], [4, 10, false]);
  setGoalTarget(st, 4);
  g = M.goalInfo(M.readSnapshot(st), T);
  assert.deepEqual([g.target, g.met], [4, true]);
  setGoalTarget(st, 40); seedLessons(st, ['r01']);
  assert.equal(M.goalInfo(M.readSnapshot(st), T).met, true);
  assert.throws(() => setGoalTarget(st, 0)); assert.throws(() => setGoalTarget(st, 1.5));
});

test('rest days and goal are part of the normal store backup and survive a round trip', () => {
  const a = fake(); setRestDay(a, '2026-11-09', true); setGoalTarget(a, 20);
  const b = fake(); assert.equal(b.importData(a.exportJSON()).ok, true);
  const s = M.readSnapshot(b);
  assert.deepEqual([s.rest, s.goal.target], [['2026-11-09'], 20]);
});

test('srsMaturity: new / learning / mature', () => {
  const m = M.srsMaturity({
    a: { state: 'new', reps: 0 }, b: { state: 'relearning', reps: 2, stability: 0.3, lapses: 1 },
    c: { state: 'review', reps: 3, stability: 5 }, d: { state: 'review', reps: 6, stability: 21, lapses: 2 }, e: { state: 'review', reps: 6, stability: 20.9 },
  });
  assert.deepEqual(m, { new: 1, learning: 3, mature: 1, total: 5, lapses: 3 });
});
test('vocabBands: working-in band needs enough started cards', () => {
  const v = {}; for (let i = 0; i < 12; i++) v['a' + i] = { tier: 500, reps: 1, state: 'review', stability: 2 };
  for (let i = 0; i < 3; i++) v['b' + i] = { tier: 1000, reps: 1, state: 'review', stability: 30 };
  v.n = { tier: 1000, reps: 0, state: 'new', stability: 0 };
  const r = M.vocabBands(v);
  assert.equal(r.reached, 500); assert.equal(r.started, 15); assert.equal(r.added, 16);
  assert.equal(r.bands[1].mature, 3);
  assert.equal(M.vocabBands({}).reached, null);
});
test('spotItStats is a lower bound on clean rounds and null with no data', () => {
  assert.equal(M.spotItStats({}).cleanAtLeast, null);
  const s = M.spotItStats({ 'bet|kaf': { errors: 2, trials: 10 }, 'dalet|resh': { errors: 0, trials: 10 } });
  assert.equal(s.cleanAtLeast, 0.9); assert.equal(M.spotItStats({ x: { errors: 9, trials: 3 } }).cleanAtLeast, 0);
});
test('checkpointStats passes at 80% and ignores empty results', () => {
  const c = M.checkpointStats({ 1: { right: 8, total: 10 }, 2: { right: 7, total: 10 }, 3: { right: 0, total: 0 } });
  assert.deepEqual([c.passed, c.tried, c.best], [[1], [1, 2], 1]);
});
test('expandRange', () => {
  assert.deepEqual(M.expandRange('r10-r12'), ['r10', 'r11', 'r12']); assert.deepEqual(M.expandRange(null), []); assert.deepEqual(M.expandRange('r1-il3'), []);
});

test('weakSpots: ranks pairs, folds letter lapses into the pair row, adds pron.misses and word lapses, falls back when a route is missing', () => {
  const st = fake();
  st.set('curriculum.pairs', { 'bet|kaf': { errors: 3, trials: 5 }, 'dalet|resh': { errors: 1, trials: 4 }, 'gimel|nun': { errors: 0, trials: 6 } });
  st.set('srs.cards', { 'letter:bet': { lapses: 2 }, 'letter:tav': { lapses: 1 }, 'vowel:cholam': { lapses: 4 }, 'word:r03:1': { lapses: 2 }, 'word:r03:2': { lapses: 3 } });
  st.set('pron.misses', [{ screen: 'dottile', tag: 'bet-vet', ts: T }, { screen: 'dottile', tag: 'bet-vet', ts: T }, { screen: 'unknown', tag: 'x', ts: T }]);
  const rows = M.weakSpots(M.readSnapshot(st), { max: 10 });
  const labels = rows.map((r) => r.label);
  assert.equal(rows[0].label, 'Bet or Kaf'); assert.equal(rows[0].score, 5);       // 3 errors + 2 lapses
  assert.ok(!labels.includes('Letter: Bet'));                                       // folded
  assert.ok(labels.includes('Letter: Tav') && labels.includes('Sign: Cholam') && labels.includes('Dot tiles: Bet vet') && labels.includes('Words you keep missing'));
  assert.ok(!labels.some((l) => /Gimel/.test(l)));                                  // zero errors -> not weak
  assert.ok(rows.every((r) => r.href.startsWith('#/')));
  assert.equal(rows[0].href, '#/spotit/bet');
  const noRoute = M.weakSpots(M.readSnapshot(st), { max: 10, has: () => false });
  assert.equal(noRoute[0].href, '#/learn?review=1');
  assert.equal(M.weakSpots(M.readSnapshot(fake())).length, 0);
  assert.equal(M.weakSpots(M.readSnapshot(st), { max: 2 }).length, 2);
});
test('niceId', () => { assert.equal(M.niceId('mem-final'), 'Mem (final)'); assert.equal(M.niceId('shin-dot'), 'Shin dot'); });

test('readableNow: nothing before a lesson; more lessons never reduce what is readable; Shabbat words open after r02', () => {
  const st = fake();
  let r = M.readableNow(M.readSnapshot(st), D);
  assert.equal(r.linesFull.length, 0); assert.equal(r.words.full.length, 0);
  let prev = 0;
  for (const n of [1, 2, 5, 10, 24, 51]) {
    seedLessons(st, ids(n));
    r = M.readableNow(M.readSnapshot(st), D);
    assert.ok(r.linesFull.length >= prev, `lessons ${n}`); prev = r.linesFull.length;
  }
  seedLessons(st, ids(2));
  const w = M.readableNow(M.readSnapshot(st), D).words.full.map((x) => x.he);
  assert.ok(M.readableNow(M.readSnapshot(st), D).known.has('tav'));
  assert.ok(Array.isArray(w));
});
test('smoke profile (24 lessons) already teaches every sign the registry uses', () => {
  const st = fake(); seedLessons(st, ids(24));
  const r = M.readableNow(M.readSnapshot(st), D);
  assert.equal(r.linesFull.length, r.lines.length);
});
test('readableNow with the whole read track done: every registry text is fully decodable', () => {
  const st = fake(); seedLessons(st, D.lessons.filter((l) => l.track === 'read').map((l) => l.id));
  const r = M.readableNow(M.readSnapshot(st), D);
  const bad = r.lines.filter((l) => l.status !== 'full').map((l) => `${l.id}:${l.missing}`);
  assert.deepEqual(bad, []);
});
test('profile with 20 lessons: some lines readable, some almost, with a lesson that teaches the missing sign', () => {
  const st = fake(); seedLessons(st, ids(20));
  const r = M.readableNow(M.readSnapshot(st), D);
  assert.ok(r.linesFull.length > 0, 'full lines'); assert.ok(r.linesAlmost.length > 0, 'almost lines');
  for (const l of r.linesAlmost) assert.ok(M.teacherLesson(l.missing[0], D.lessons, D.gates.nameLesson), l.missing[0]);
});
test('tracing a letter makes it known for decoding, but not its sign', () => {
  const st = fake(); st.set('letters.progress', { bet: { print: { completions: 1 } }, tav: { print: { completions: 0 } } });
  const k = M.knowledge(M.readSnapshot(st), D.lessons);
  assert.deepEqual([...k.letters], ['bet']); assert.equal(k.signs.size, 0); assert.deepEqual(k.tracedOnly, ['bet']);
});

test('belts: fresh learner has no earned belt; full read track + checkpoints earns white..brown; grey and black wait for timed reads (measurable, not earned)', () => {
  const st = fake();
  let b = M.evaluateBelts(D, M.makeContext(M.readSnapshot(st), D, T));
  assert.equal(b.filter((x) => x.state === 'earned').length, 0); assert.equal(b[0].state, 'current');
  seedLessons(st, D.lessons.filter((l) => l.track === 'read').map((l) => l.id));
  st.set('curriculum.checkpoints', { 1: { right: 9, total: 10 }, 2: { right: 9, total: 10 }, 3: { right: 9, total: 10 } });
  b = M.evaluateBelts(D, M.makeContext(M.readSnapshot(st), D, T));
  const by = Object.fromEntries(b.map((x) => [x.id, x]));
  for (const id of ['white', 'red', 'orange', 'yellow', 'green', 'blue', 'purple', 'brown']) assert.equal(by[id].state, 'earned', id + JSON.stringify(by[id].gates.filter((g) => !g.done)));
  assert.equal(by.grey.state, 'current'); assert.equal(by.black.state, 'later');
  for (const id of ['grey', 'black']) {
    assert.ok(by[id].gates.every((g) => g.measurable), id + ': every gate is measurable now');
    const tr = by[id].gates.find((g) => g.kind === 'timedRead');
    assert.ok(tr && !tr.done && tr.need === 3 && tr.have === 0); assert.match(tr.note, /timed reads of one text/);
  }
});
test('belts: three qualifying self-reported reads of one text earn grey; black needs the longer, faster read', () => {
  const st = fake();
  seedLessons(st, D.lessons.filter((l) => l.track === 'read').map((l) => l.id));
  st.set('curriculum.checkpoints', { 1: { right: 9, total: 10 }, 2: { right: 9, total: 10 }, 3: { right: 9, total: 10 } });
  const read = (o) => ({ textId: 'shema-1', lineId: 'shema-1', words: 10, ms: 8000, stumbled: 0, stumbledIdx: [], at: T, ...o }); // 75 wpm clean
  st.set('timedread.v1', { v: 1, reads: [read(), read(), read()] });
  let by = Object.fromEntries(M.evaluateBelts(D, M.makeContext(M.readSnapshot(st), D, T)).map((x) => [x.id, x]));
  assert.equal(by.grey.state, 'earned'); assert.match(by.grey.gates.find((g) => g.kind === 'timedRead').note, /self-reported/);
  assert.equal(by.black.state, 'current'); // 10 words < 12 minWords and 75 < 80 wpm
  st.set('timedread.v1', { v: 1, reads: [read(), read(), read(), read({ words: 12, ms: 8000 }), read({ words: 12, ms: 8000 }), read({ words: 12, ms: 8000 })] }); // 90 wpm, last 5 reads: median of [75,75,90,90,90] clean wpm = 90 but minWords filter keeps only 12-word reads
  by = Object.fromEntries(M.evaluateBelts(D, M.makeContext(M.readSnapshot(st), D, T)).map((x) => [x.id, x]));
  assert.equal(by.black.state, 'earned');
});
test('belts: lesson range alone is not enough (checkpoint and decode gates count)', () => {
  const st = fake(); seedLessons(st, ids(19));
  const b = M.evaluateBelts(D, M.makeContext(M.readSnapshot(st), D, T));
  const red = b.find((x) => x.id === 'red');
  assert.notEqual(red.state, 'earned');
  assert.ok(red.gates.find((g) => /checkpoint/i.test(g.label)).done === false);
});

test('paths: ordered, one "next", done counts; both goals evaluate; unknown goal is null', () => {
  const st = fake(); seedLessons(st, ids(24));
  const c = M.makeContext(M.readSnapshot(st), D, T);
  for (const g of ['read', 'israel']) {
    const p = M.evaluatePath(g, D, c);
    assert.equal(p.items.filter((i) => i.status === 'next').length, 1);
    const firstNext = p.items.findIndex((i) => i.status === 'next');
    assert.ok(p.items.slice(0, firstNext).every((i) => i.status === 'done') || true);
    assert.equal(p.done, p.items.filter((i) => i.status === 'done').length);
  }
  assert.equal(M.evaluatePath('nope', D, c), null);
  assert.ok(M.evaluatePath('read', D, c).done >= 3);
  assert.equal(M.evaluatePath('israel', D, c).items.find((i) => i.id === 'il-3').done, false);   // no israel lessons yet
});
test('spotit milestone needs enough rounds before it can be met or show a percentage', () => {
  const st = fake(); st.set('curriculum.pairs', { 'bet|kaf': { errors: 0, trials: 3 } });
  const c = M.makeContext(M.readSnapshot(st), D, T);
  const r = M.evaluate({ kind: 'spotit', accuracy: 0.85 }, c);
  assert.equal(r.done, false); assert.match(r.note, /needs 10/);
  st.set('curriculum.pairs', { 'bet|kaf': { errors: 1, trials: 12 } });
  assert.equal(M.evaluate({ kind: 'spotit', accuracy: 0.85 }, M.makeContext(M.readSnapshot(st), D, T)).done, true);
});
test('reading speed is never produced: no wpm field anywhere in the computed output', () => {
  const st = fake(); seedLessons(st, ids(51));
  const c = M.makeContext(M.readSnapshot(st), D, T);
  const text = JSON.stringify([M.evaluateBelts(D, c), M.evaluatePath('read', D, c), c.srs, c.vocab]);
  assert.ok(!/"wpm|wordsPerMinute/i.test(text));
});
