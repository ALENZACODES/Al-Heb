import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createMemoryStorage } from '../src/store.js';
import * as M from '../src/progress/model.js';
import { weeklySummary, weeklySentences, sparklineSVG, datedActivity, WEEKS } from '../src/progress/weekly.js';
import { GOAL_SECONDS } from '../src/curriculum/streak.js';

const fake = () => createStore({ storage: createMemoryStorage() });
const noon = (iso) => new Date(iso + 'T12:00:00').getTime();
const NOW = noon('2026-11-10'); // a Tuesday
const snap = (seed) => { const st = fake(); seed(st); return M.readSnapshot(st); };
const rec = (o) => ({ v: 2, count: 0, best: 0, last: null, todayDate: null, todaySeconds: 0, frozenDates: [], doneDates: [], freeze: false, mode: 'reform', ...o });
const card = (id, o) => [id, { id, kind: 'word', state: 'review', stability: 3, reps: 3, lapses: 0, lastReview: NOW, ...o }];

test('empty store: a week of zeros, nothing invented', () => {
  const w = weeklySummary(snap(() => {}), NOW);
  assert.equal(w.days.length, 7); assert.equal(w.from, '2026-11-04'); assert.equal(w.to, '2026-11-10');
  assert.deepEqual([w.engagedDays, w.minutesAtLeast, w.newWordsAtLeast, w.cardsReviewed, w.reads, w.lessons, w.streak.count, w.rest.total], [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(w.series, new Array(WEEKS).fill(0)); assert.equal(w.seriesTotal, 0);
});

test('minutes are a floor: 5 minutes per past day that reached the goal plus today\'s seconds so far', () => {
  const s = snap((st) => st.set('streak', rec({ count: 3, best: 3, last: '2026-11-09', doneDates: ['2026-11-07', '2026-11-08', '2026-11-09'], todayDate: '2026-11-10', todaySeconds: 125 })));
  const w = weeklySummary(s, NOW);
  assert.equal(w.engagedDays, 3); assert.equal(w.todaySeconds, 125);
  assert.equal(w.minutesAtLeast, Math.floor((3 * GOAL_SECONDS + 125) / 60)); assert.equal(w.minutesAtLeast, 17);
  assert.equal(w.streak.count, 3);
  // today completed: today's seconds are at least the goal
  const s2 = snap((st) => st.set('streak', rec({ count: 4, best: 4, last: '2026-11-10', doneDates: ['2026-11-09', '2026-11-10'], todayDate: '2026-11-10', todaySeconds: 310 })));
  const w2 = weeklySummary(s2, NOW); assert.equal(w2.engagedDays, 2); assert.equal(w2.minutesAtLeast, Math.floor((GOAL_SECONDS + 310) / 60));
  assert.match(weeklySentences(w2).minutes, /^At least 10 minutes engaged$/);
});

test('days outside the 7-day window do not count; a v1 record (no day list) still gives a week', () => {
  const s = snap((st) => st.set('streak', rec({ count: 2, best: 2, last: '2026-11-09', doneDates: ['2026-10-01', '2026-11-03', '2026-11-08', '2026-11-09'] })));
  assert.equal(weeklySummary(s, NOW).engagedDays, 2);
  const v1 = snap((st) => st.set('streak', { count: 3, best: 3, last: '2026-11-09' })); // 7, 8, 9 Nov
  assert.equal(weeklySummary(v1, NOW).engagedDays, 3);
});

test('rest days honored: Shabbat counts when the freeze setting is on, never when it is off, and declared days are counted apart', () => {
  const base = { count: 1, best: 1, last: '2026-11-08', doneDates: ['2026-11-08'] }; // Sat 7 Nov is Shabbat, Sun 8 done
  const on = weeklySummary(snap((st) => st.set('streak', rec({ ...base, freeze: true }))), NOW);
  assert.equal(on.rest.shabbat, 1); assert.equal(on.rest.total, 1);
  assert.match(weeklySentences(on).rest, /^1 rest day honored \(1 Shabbat\)$/);
  const off = weeklySummary(snap((st) => st.set('streak', rec(base))), NOW);
  assert.equal(off.rest.total, 0); assert.equal(weeklySentences(off).rest, 'no rest days in this week');
  const declared = weeklySummary(snap((st) => { st.set('streak', rec({ ...base, frozenDates: ['2026-11-05'] })); }), NOW);
  assert.deepEqual([declared.rest.declared, declared.rest.shabbat], [1, 0]);
  assert.match(weeklySentences(declared).rest, /1 you declared/);
  // Progress's own rest days are honored too
  const viaProgress = weeklySummary(snap((st) => { st.set('streak', rec(base)); st.set('progress.state', { rest: ['2026-11-06'], goal: null }); }), NOW);
  assert.equal(viaProgress.rest.declared, 1);
});

test('Yom Tov on a weekday is reported as Yom Tov, not Shabbat', () => {
  const now = noon('2026-04-03');
  const w = weeklySummary(snap((st) => st.set('streak', rec({ count: 1, best: 1, last: '2026-04-01', doneDates: ['2026-04-01'], freeze: true }))), now);
  assert.equal(w.rest.yomtov, 1); // Thu 2 April, first day of Pesach
  assert.match(weeklySentences(w).rest, /1 Yom Tov/);
});

test('a day with real activity beats a rest day: it shows as engaged, not as a rest day', () => {
  const w = weeklySummary(snap((st) => st.set('streak', rec({ count: 1, best: 1, last: '2026-11-07', doneDates: ['2026-11-07'], freeze: true }))), NOW); // studied on Shabbat
  assert.equal(w.engagedDays, 1); assert.equal(w.rest.shabbat, 0);
});

test('reviews, new words, reads and lessons in the last 7 days only (boundaries inclusive of today and day -6)', () => {
  const DAYS = 86400000;
  const s = snap((st) => {
    st.set('srs.cards', Object.fromEntries([card('letter:bet', { kind: 'letter', lastReview: NOW }), card('word:r03:1', { reps: 1, lastReview: NOW - 6 * DAYS }), card('letter:old', { lastReview: NOW - 7 * DAYS })]));
    st.set('srs.vocab', Object.fromEntries([card('vocab:1', { reps: 1, lastReview: NOW - DAYS }), card('vocab:2', { reps: 4, lastReview: NOW - DAYS }), card('vocab:3', { reps: 1, lastReview: NOW - 10 * DAYS })]));
    st.set('timedread.v1', { v: 1, reads: [{ textId: 'shema-1', lineId: 'shema-1', words: 6, ms: 9000, stumbled: 0, stumbledIdx: [], at: NOW }, { textId: 'shema-1', lineId: 'shema-1', words: 6, ms: 9000, stumbled: 0, stumbledIdx: [], at: NOW - 8 * DAYS }] });
    st.set('curriculum.progress', { completed: { r01: NOW - 2 * DAYS, r02: NOW - 20 * DAYS } });
  });
  const w = weeklySummary(s, NOW);
  assert.equal(w.cardsReviewed, 4); // bet, r03:1, vocab:1, vocab:2
  assert.equal(w.newWordsAtLeast, 2); // word:r03:1 and vocab:1 (reps 1); vocab:2 has more reps; letters are not words
  assert.equal(w.reads, 1); assert.equal(w.lessons, 1);
  assert.match(weeklySentences(w).words, /^At least 2 new words first reviewed$/); assert.match(weeklySentences(w).reads, /1 timed read \(self-reported\)/);
});

test('sparkline series: 8 weekly buckets, oldest first, from dated actions only; cards are not counted', () => {
  const DAYS = 86400000, at = (daysAgo) => NOW - daysAgo * DAYS;
  const s = snap((st) => {
    st.set('curriculum.progress', { completed: { r01: at(0), r02: at(6), r03: at(7), r04: at(55), r05: at(56), r06: at(100) } });
    st.set('speak.v1', { v: 1, attempts: [{ at: at(3), kind: 'say', outcome: 'match' }, { at: at(15), kind: 'pair', correct: true, contrast: 'resh' }] });
    st.set('timedread.v1', { v: 1, reads: [{ textId: 'shema-1', lineId: 'shema-1', words: 6, ms: 9000, stumbled: 0, stumbledIdx: [], at: at(14) }] });
    st.set('curriculum.checkpoints', { 1: { right: 9, total: 10, at: at(30) } });
    st.set('curriculum.loanwords', { a: { knew: true, at: at(30) }, b: { knew: false } });
    st.set('srs.cards', Object.fromEntries([card('letter:bet', { lastReview: at(0) })]));
  });
  assert.equal(datedActivity(s).length, 11); // 6 lessons, 2 speaking, 1 read, 1 checkpoint, 1 loanword (the unmarked one has no time)
  const w = weeklySummary(s, NOW);
  // bucket 7 (this week, days 0..6): r01, r02, speak(3) = 3 ; bucket 6 (7..13): r03 = 1 ; bucket 5 (14..20): speak(15), timed(14) = 2 ;
  // bucket 3 (28..34): checkpoint + loanword = 2 ; bucket 0 (49..55): r04 (55) = 1 ; r05 (56) and r06 (100) fall outside 8 weeks
  assert.deepEqual(w.series, [1, 0, 0, 2, 0, 2, 1, 3]); assert.equal(w.seriesTotal, 9);
});

test('sparkline SVG: valid inline markup with an accessible name carrying the numbers; flat and empty series do not break it', () => {
  const svg = sparklineSVG([0, 1, 4, 2, 0, 0, 3, 5]);
  assert.match(svg, /^<svg [^>]*role="img"[^>]*aria-label="Dated activity per week, oldest to newest: 0, 1, 4, 2, 0, 0, 3, 5"/);
  assert.match(svg, /<polyline points="(\d+\.\d,\d+\.\d ?){8}"/); assert.match(svg, /<circle /); assert.match(svg, /<\/svg>$/);
  assert.doesNotMatch(svg, /<script|onload|href=|style=/i);
  assert.doesNotMatch(sparklineSVG([0, 0, 0]), /NaN|Infinity/); assert.doesNotMatch(sparklineSVG([]), /NaN|Infinity|polyline/);
  assert.doesNotMatch(sparklineSVG([NaN, -3, Infinity, 2]), /NaN|Infinity/);
  assert.match(sparklineSVG([1], { label: 'a "b" <c>' }), /aria-label="a &quot;b&quot; &lt;c&gt;: 1"/);
  // the peak sits at the top margin, zero at the baseline
  const pts = /points="([^"]+)"/.exec(svg)[1].split(' ').map((p) => Number(p.split(',')[1]));
  assert.equal(Math.min(...pts), 4); assert.equal(Math.max(...pts), 36);
});

test('wording makes no fluency claim', () => {
  const w = weeklySummary(snap((st) => st.set('streak', rec({ count: 2, best: 2, last: '2026-11-10', doneDates: ['2026-11-09', '2026-11-10'], todayDate: '2026-11-10', todaySeconds: 400 }))), NOW);
  assert.doesNotMatch(Object.values(weeklySentences(w)).join(' '), /fluen|improv|better|level/i);
});
