import test from 'node:test';
import assert from 'node:assert/strict';
import { clean, cleanDay, mergeDay, wouldChange, withGoal, withRepairs, load, save, LOOPS_KEY, GOALS, DEFAULT_GOAL } from '../preview/loops/store.js';
import { dayPoints, ring, ringSVG, goalSentence, weekSummary, WEIGHTS, CAPS, PRACTICE_POINTS } from '../preview/loops/points.js';
import { rhythm, rhythmSentence, repairDays, EARN_EVERY, BANK_MAX } from '../preview/loops/rhythm.js';
import { questsFor, questSummary, hash, ALL_QUEST_IDS } from '../preview/loops/quests.js';
import { stats, statSentences, level, heatmap, heatmapSummary, heatmapRows } from '../preview/loops/stats.js';
import { deriveDays, declaredRest, engineDoneDays } from '../preview/loops/derive.js';
import { addDaysISO } from '../src/curriculum/streak.js';

const memStore = (init = {}) => { const m = { ...init }; return { m, get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); } }; };
const T = '2026-11-10'; // a Tuesday
const days = (n, from = '2026-10-01') => Array.from({ length: n }, (_, i) => addDaysISO(from, i));

test('store: corrupt, old and missing values clean to a well-formed record and never throw', () => {
  for (const bad of [null, undefined, 5, 'x', [], { days: 'no' }, { days: { nope: { r: 1 }, '2026-11-01': { r: -4, lessons: [1, 'a', 'a'] } }, goal: 7, repairs: ['x', '2026-11-01'] }]) {
    const c = clean(bad);
    assert.equal(c.v, 1); assert.ok(GOALS.includes(c.goal)); assert.ok(Array.isArray(c.repairs));
  }
  const c = clean({ days: { '2026-11-01': { r: -4, lessons: [1, 'a', 'a'] } }, goal: 7, repairs: ['x', '2026-11-01'] });
  assert.equal(c.goal, DEFAULT_GOAL); assert.deepEqual(c.days['2026-11-01'], { lessons: ['a'], r: 0, t: 0, s: 0, m: 0 }); assert.deepEqual(c.repairs, ['2026-11-01']);
});
test('store: merging keeps the larger count and unions lessons, so syncing twice never double counts', () => {
  let r = mergeDay(null, T, { lessons: ['I-01'], r: 4 });
  r = mergeDay(r, T, { lessons: ['I-01', 'r02'], r: 3, t: 1 });
  assert.deepEqual(r.days[T], { lessons: ['I-01', 'r02'], r: 4, t: 1, s: 0, m: 0 });
  assert.equal(wouldChange(r, T, { lessons: ['I-01'], r: 2 }), false); assert.equal(wouldChange(r, T, { r: 9 }), true);
  assert.equal(mergeDay(r, 'bad', { r: 1 }), r);
});
test('store: load and save survive a throwing store and round-trip', () => {
  const bad = { get() { throw new Error('x'); }, set() { throw new Error('full'); } };
  assert.equal(load(bad).goal, DEFAULT_GOAL); assert.equal(save(bad, clean(null)), false); assert.equal(load(null).v, 1);
  const s = memStore(); assert.equal(save(s, withGoal(null, 30)), true); assert.equal(load(s).goal, 30); assert.ok(LOOPS_KEY in s.m);
  assert.equal(withGoal(null, 33).goal, DEFAULT_GOAL);
});

test('points: weights, caps, ring text and the goal sentence', () => {
  assert.equal(dayPoints(null), 0);
  assert.equal(dayPoints({ lessons: ['a', 'b'], r: 5, t: 1, s: 2 }), 2 * WEIGHTS.lesson + 5 + WEIGHTS.read + 2);
  assert.equal(dayPoints({ r: 500, s: 500 }), CAPS.review + CAPS.speak, 'caps stop grinding one easy thing');
  assert.deepEqual(ring(12, 20), { points: 12, goal: 20, pct: 60, done: false, text: '12 of 20 points today' });
  assert.equal(ring(99, 20).pct, 100); assert.equal(ring(-3, 20).points, 0);
  assert.match(goalSentence(0, 20), /Any amount helps/); assert.match(goalSentence(20, 20), /good place to stop/); assert.match(goalSentence(30, 20), /never a requirement/);
  const svg = ringSVG(12, 20); assert.match(svg, /aria-label="12 of 20 points today"/); assert.doesNotMatch(svg, /animate|<style|transition/);
});
test('points: points never go down when a day is merged again with fewer actions', () => {
  const a = mergeDay(null, T, { lessons: ['x'], r: 10 }); const b = mergeDay(a, T, { r: 2 });
  assert.ok(dayPoints(b.days[T]) >= dayPoints(a.days[T]));
});
test('week summary: counts the last seven days, compares with the seven before, calm wording for an empty week', () => {
  let r = null;
  for (const d of [T, addDaysISO(T, -1), addDaysISO(T, -2), addDaysISO(T, -9)]) r = mergeDay(r, d, { lessons: ['L' + d] });
  const w = weekSummary(r.days, T, 20);
  assert.equal(w.now.practiced, 3); assert.equal(w.now.points, 30); assert.equal(w.before.points, 10);
  assert.match(w.sentences.join(' '), /3 of the last 7 days/); assert.match(w.sentences.join(' '), /at least as much as the week before/);
  const empty = weekSummary({}, T, 20); assert.match(empty.sentences[0], /quiet week/); assert.equal(empty.sentences.length, 1);
  const lower = weekSummary({ [addDaysISO(T, -8)]: { lessons: ['a', 'b', 'c'] }, [T]: { lessons: ['a'] } }, T); assert.match(lower.sentences.join(' '), /Rest weeks are part of learning/);
});

test('rhythm: consecutive practice days count; every 5th earns a rest day; the bank caps at 3', () => {
  const r = rhythm({ practice: days(5), today: '2026-10-05' });
  assert.equal(r.count, 5); assert.equal(r.bank, 1); assert.equal(r.state, 'active');
  const long = rhythm({ practice: days(25), today: '2026-10-25' }); assert.equal(long.bank, BANK_MAX); assert.equal(long.count, 25);
  assert.equal(EARN_EVERY, 5);
});
test('rhythm: a day off spends a banked rest day on its own and the run continues; today is never a gap', () => {
  const p = [...days(5), ...days(3, '2026-10-07')]; // practiced Oct 1-5, off Oct 6, practiced Oct 7-9
  const r = rhythm({ practice: p, today: '2026-10-09' });
  assert.equal(r.count, 8); assert.deepEqual(r.restUsed, ['2026-10-06']); assert.equal(r.bank, 0);
  const open = rhythm({ practice: days(3), today: '2026-10-04' }); assert.equal(open.state, 'open'); assert.equal(open.count, 3); assert.deepEqual(open.gap, []);
});
test('rhythm: a gap longer than the bank is a fresh start, best is kept, and one free repair brings the run back', () => {
  const p = [...days(3), '2026-10-10'];
  let r = rhythm({ practice: p, today: '2026-10-10' });
  assert.equal(r.count, 1); assert.equal(r.best, 3); assert.equal(r.repairable, true); assert.equal(r.priorRun, 3);
  const fix = repairDays(r); assert.deepEqual(fix, days(6, '2026-10-04'));
  r = rhythm({ practice: p, repairs: fix, today: '2026-10-10' });
  assert.equal(r.count, 4); assert.equal(r.repairable, false); assert.equal(r.gap.length, 0);
});
test('rhythm: declared rest days and engine-frozen days cover a gap without spending the bank; a brand-new learner spends nothing', () => {
  const r = rhythm({ practice: [...days(5), '2026-10-08'], cover: ['2026-10-06', '2026-10-07'], today: '2026-10-08' });
  assert.equal(r.count, 6); assert.equal(r.bank, 1); assert.deepEqual(r.restUsed, []);
  const lone = rhythm({ practice: ['2026-10-01'], today: '2026-10-05' }); assert.equal(lone.state, 'fresh'); assert.equal(lone.bank, 0);
  assert.equal(rhythm({ practice: [], today: T }).state, 'new');
});
test('rhythm: a repair older than the window is not offered; the clock going backwards does not throw', () => {
  const r = rhythm({ practice: days(3), today: '2026-12-31' }); assert.equal(r.repairable, false); assert.match(rhythmSentence(r), /fresh start/i);
  assert.equal(rhythm({ practice: ['2027-01-01'], today: T }).state, 'new');
});
test('rhythm: sentences for each state are plain and never use loss wording', () => {
  const states = [rhythm({ practice: [], today: T }), rhythm({ practice: days(3), today: '2026-10-03' }), rhythm({ practice: days(3), today: '2026-10-04' }), rhythm({ practice: [...days(3), '2026-10-10'], today: '2026-10-09' }), rhythm({ practice: days(5), today: '2026-10-07' })];
  for (const s of states) assert.ok(rhythmSentence(s).length > 10);
});

test('quests: three per day, deterministic by date, one from each tier, with honest progress', () => {
  const a = questsFor(T, null), b = questsFor(T, null);
  assert.equal(a.length, 3); assert.deepEqual(a, b); assert.ok(a.every((q) => ALL_QUEST_IDS.includes(q.id) && q.have === 0 && !q.done));
  const seen = new Set(); for (let i = 0; i < 60; i++) for (const q of questsFor(addDaysISO('2026-01-01', i), null)) seen.add(q.id);
  assert.ok(seen.size >= 6, 'the pool varies across days');
  const done = questsFor(T, { lessons: ['a', 'b'], r: 30, t: 2, s: 3 }); assert.ok(done.every((q) => q.done)); assert.match(questSummary(done), /All three/);
  assert.match(questSummary(a), /optional/); assert.equal(hash('x'), hash('x'));
});

const card = (o) => ({ state: 'review', reps: 3, lapses: 0, ...o });
test('stats: known letters and words need two right answers and not be relearning; accuracy is labelled an upper bound', () => {
  const snap = { cards: { 'letter:alef': card({}), 'letter:bet': card({ reps: 1 }), 'letter:gimel': card({ state: 'relearning' }), 'word:r01:1': card({ reps: 5, lapses: 1 }) }, vocab: { 'vocab:9': card({ kind: 'word', reps: 2, lapses: 1 }) } };
  const s = stats(snap, { a: { m: 7 }, b: { m: 5 } });
  assert.equal(s.letters, 1); assert.equal(s.lettersSeen, 3); assert.equal(s.words, 2); assert.equal(s.minutes, 12);
  assert.equal(s.reviews, 14); assert.equal(s.lapses, 2); assert.equal(s.accuracyMax, 86);
  const t = statSentences(s); assert.match(t.accuracy, /up to 86%/); assert.match(t.accuracy, /can be lower/); assert.match(t.minutes, /At least 12 minutes/);
  assert.match(statSentences(stats({}, {})).accuracy, /No review answers yet/);
  assert.equal(stats(null, null).letters, 0);
});
test('heatmap: columns run Sunday to Saturday, future days are empty, levels follow points, and the text alternative agrees', () => {
  let r = null; for (const [d, c] of [[T, { lessons: ['a', 'b'] }], [addDaysISO(T, -1), { r: 6 }], [addDaysISO(T, -2), { r: 2 }]]) r = mergeDay(r, d, c);
  const cols = heatmap(r.days, T, 20, 4);
  assert.equal(cols.length, 4); assert.ok(cols.every((c) => c.length === 7));
  assert.equal(cols[3][2].iso, T); assert.equal(cols[3][3], null, 'Wednesday is after Tuesday');
  assert.equal(cols[3][2].level, 3); assert.equal(cols[3][1].level, 2); assert.equal(cols[3][0].level, 1);
  assert.equal(level(0, 20), 0); assert.equal(level(5, 20), 2); assert.equal(level(20, 20), 3);
  assert.match(heatmapSummary(cols), /2 practice days, 1 of them reaching the daily goal/);
  const rows = heatmapRows(cols, 2); assert.equal(rows.length, 2); assert.equal(rows[0].points, 28); assert.equal(rows[0].days, 2);
});

test('derive: lessons, reads, speaking tries and cards are read from the other stores by local day; engaged minutes from the streak record', () => {
  const at = new Date('2026-11-10T09:30:00').getTime();
  const snap = { completed: { 'I-01': at, r02: at - 86400000 }, cards: { 'letter:alef': card({ lastReview: at }), 'letter:bet': card({ lastReview: at }) }, vocab: {},
    timedRead: { v: 1, reads: [{ textId: 'shema-1', lineId: 'shema-1', words: 12, ms: 8000, stumbled: 0, stumbledIdx: [], at }] }, speak: {},
    streak: { todayDate: T, todaySeconds: 190, doneDates: ['2026-11-08'], frozenDates: ['2026-11-07'] }, rest: ['2026-11-06'] };
  const d = deriveDays(snap);
  assert.deepEqual(d[T].lessons, ['I-01']); assert.equal(d[T].r, 2); assert.equal(d[T].t, 1); assert.equal(d[T].m, 3);
  assert.deepEqual(d['2026-11-09'].lessons, ['r02']); assert.equal(d['2026-11-08'].m, 5);
  assert.deepEqual([...declaredRest(snap)].sort(), ['2026-11-06', '2026-11-07']); assert.deepEqual([...engineDoneDays(snap)], ['2026-11-08']);
  assert.deepEqual(deriveDays(null), {}); assert.deepEqual(deriveDays({ timedRead: 'junk', speak: 7, cards: { x: null } }), {});
});
