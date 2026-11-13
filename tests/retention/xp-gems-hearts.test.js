import './_helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { T } from './_helpers.js';
import { defaults, CAPS } from '../../src/retention/state.js';
import { GOALS, XP, award, lessonPayout, todayXp, goalProgress, comboBonus, setGoal } from '../../src/retention/xp.js';
import { earn, spend, PRICES, CURRENCY } from '../../src/retention/gems.js';
import { HEARTS, heartsOn, loseHeart, refillByTime, practiceCard, refillByGems, canStartLesson, nextHeartInMs, REFILL_ROUTE, isLessonHash } from '../../src/retention/hearts.js';

const NOW = T('2026-11-10T19:00');
const fresh = (o = {}) => Object.assign(defaults(T('2026-11-01T10:00'), 'install-1'), o);

test('daily goals: casual 10, regular 20, serious 30, intense 50', () => {
  assert.deepEqual(GOALS.map((g) => [g.id, g.xp]), [['casual', 10], ['regular', 20], ['serious', 30], ['intense', 50]]);
  assert.equal(setGoal(fresh(), 50).goal, 50); assert.equal(setGoal(fresh(), 25).goal, 20);
});
test('a sharp lesson pays 15 XP and 2 gems, once', () => {
  const r0 = fresh({ lessonsFinished: 4 });
  const a = lessonPayout(r0, { awardId: 'L1', accuracy: 0.95, now: NOW });
  assert.equal(a.xp, 15); assert.equal(a.gems, 2); assert.equal(a.rec.lessonsFinished, 5); assert.equal(todayXp(a.rec, NOW), 15);
  const b = lessonPayout(a.rec, { awardId: 'L1', accuracy: 0.95, now: NOW });
  assert.equal(b.duplicate, true); assert.equal(b.xp, 0); assert.equal(b.rec, a.rec);
});
test('combo bonus: +2 XP per 5 right in a row, at most +6', () => {
  assert.deepEqual([0, 4, 5, 9, 10, 15, 40].map(comboBonus), [0, 0, 2, 2, 4, 6, 6]);
  const a = lessonPayout(fresh({ lessonsFinished: 1 }), { awardId: 'L2', accuracy: 0.5, maxCombo: 10, now: NOW });
  assert.equal(a.xp, XP.lesson + 4); assert.deepEqual(a.parts, { base: 10, accuracy: 0, combo: 4 });
});
test('the first lesson ever pays 50 gems', () => {
  const a = lessonPayout(fresh(), { awardId: 'L0', accuracy: 0.5, now: NOW });
  assert.equal(a.first, true); assert.equal(a.rec.gems.balance, 50); assert.equal(a.rec.gems.ledger.at(-1).why, 'first');
});
test('review XP is capped at 20 a day; game XP at 15', () => {
  let r = fresh(), paid = 0;
  for (let i = 0; i < 25; i++) { const o = award(r, { awardId: 'r' + i, kind: 'review', amount: 1, now: NOW }); r = o.rec; paid += o.paid; }
  assert.equal(paid, 20);
  for (let i = 0; i < 7; i++) { const o = award(r, { awardId: 'g' + i, kind: 'game', amount: 3, now: NOW }); r = o.rec; paid += o.paid; }
  assert.equal(paid, 35);
  const tomorrow = award(r, { awardId: 'r-next', kind: 'review', amount: 1, now: NOW + 86400000 });
  assert.equal(tomorrow.paid, 1, 'caps reset the next day');
});
test('reaching the daily goal pays 10 gems once a day, even after the goal changes', () => {
  let r = fresh({ lessonsFinished: 2 });
  let o = award(r, { awardId: 'a', amount: 10, now: NOW }); assert.equal(o.goalCrossed, false);
  o = award(o.rec, { awardId: 'b', amount: 10, now: NOW }); assert.equal(o.goalCrossed, true); assert.equal(o.rec.gems.balance, 10);
  assert.equal(goalProgress(o.rec, NOW).done, true);
  o = award(setGoal(o.rec, 30), { awardId: 'c', amount: 10, now: NOW }); assert.equal(o.goalCrossed, false); assert.equal(o.rec.gems.balance, 10);
  o = award(o.rec, { awardId: 'd', amount: 30, now: NOW + 86400000 }); assert.equal(o.goalCrossed, true); assert.equal(o.rec.gems.balance, 20);
});
test('XP never goes down; ledger and award ids are trimmed to their caps', () => {
  let r = fresh();
  for (let i = 0; i < CAPS.recentIds + 20; i++) r = award(r, { awardId: 'x' + i, amount: 1, now: NOW }).rec;
  assert.equal(r.xp.recentIds.length, CAPS.recentIds); assert.equal(r.xp.total, CAPS.recentIds + 20);
  for (let i = 0; i < CAPS.ledger + 5; i++) r = earn(r, 1, 'goal', NOW);
  assert.equal(r.gems.ledger.length, CAPS.ledger);
  assert.equal(award(r, { awardId: 'neg', amount: -5, now: NOW }).paid, 0);
});
test('gems: earned only, spending needs the balance', () => {
  assert.equal(spend(fresh(), 1, 'buy-freeze').ok, false);
  const r = earn(fresh(), 200, 'goal', NOW), s = spend(r, PRICES.freeze, 'buy-freeze', NOW);
  assert.equal(s.ok, true); assert.equal(s.rec.gems.balance, 0); assert.equal(r.gems.balance, 200, 'input untouched');
  assert.equal(CURRENCY.title, 'Gems');
});

test('hearts are off before the 3rd lesson, in calm mode, when switched off, and on reading, prayer, Torah and game routes', () => {
  assert.equal(heartsOn(fresh({ lessonsFinished: 2 })), false);
  const r = fresh({ lessonsFinished: 3 });
  assert.equal(heartsOn(r, { hash: '#/learn?lesson=r04' }), true);
  assert.equal(heartsOn(r, { calm: true }), false);
  for (const hash of ['#/torahread', '#/torahread/bereshit', '#/morning', '#/listen/shelf', '#/games', '#/firstday', '#/placement', '#/read/shema']) assert.equal(heartsOn(r, { hash }), false, hash);
  const off = fresh({ lessonsFinished: 9 }); off.hearts.enabled = false; assert.equal(heartsOn(off), false);
  assert.equal(isLessonHash('#/learn?lesson=r04'), true); assert.equal(isLessonHash('#/learn?lesson=r04&review=1'), false); assert.equal(isLessonHash('#/learn'), false);
});
test('a wrong first answer costs one heart; a wrong retry of the same question is free', () => {
  const a = loseHeart(fresh({ lessonsFinished: 3 }), 'q1', NOW);
  assert.deepEqual([a.lost, a.left], [true, 4]); assert.equal(a.rec.hearts.lastRefillAt, NOW);
  const b = loseHeart(a.rec, 'q1', NOW + 1000); assert.deepEqual([b.lost, b.left], [false, 4]);
  const c = loseHeart(b.rec, 'q2', NOW + 2000); assert.equal(c.left, 3);
});
test('zero hearts gates a new lesson but never review; XP is still paid', () => {
  let r = fresh({ lessonsFinished: 3 });
  for (let i = 0; i < 6; i++) r = loseHeart(r, 'q' + i, NOW).rec;
  assert.equal(r.hearts.n, 0);
  assert.equal(canStartLesson(r, { hash: '#/learn?lesson=r05' }, NOW), false);
  assert.equal(canStartLesson(r, { hash: '#/torahread' }, NOW), true);
  assert.equal(canStartLesson(r, { calm: true }, NOW), true);
  assert.equal(lessonPayout(r, { awardId: 'still', accuracy: 0.4, now: NOW }).xp, 10);
  assert.match(REFILL_ROUTE, /^#\/learn\?review=1/, 'practice goes to the spaced-review queue');
});
test('timed refill: one heart every 4 hours (2 hearts, 9 hours later = 4)', () => {
  const r = fresh({ lessonsFinished: 3 }); r.hearts.n = 2; r.hearts.lastRefillAt = NOW - 9 * 3600000;
  const out = refillByTime(r, NOW);
  assert.equal(out.hearts.n, 4); assert.equal(out.hearts.lastRefillAt, NOW - 3600000);
  assert.equal(nextHeartInMs(r, NOW), 3 * 3600000);
  r.hearts.lastRefillAt = NOW - 30 * 3600000; assert.equal(refillByTime(r, NOW).hearts.n, HEARTS.max);
  assert.equal(nextHeartInMs(refillByTime(r, NOW), NOW), 0);
});
test('practising old material: every 5 review cards gives a heart; 4 or more right also earns the XP', () => {
  const start = () => { const r = fresh({ lessonsFinished: 3 }); r.hearts.n = 1; r.hearts.lastRefillAt = NOW; return r; };
  let r = start(), last;
  for (const right of [true, false, true, false, true]) { last = practiceCard(r, right, NOW); r = last.rec; }
  assert.deepEqual([last.roundDone, last.heartBack, last.xpEarned, r.hearts.n], [true, true, false, 2]);
  r = start();
  for (let i = 0; i < 4; i++) { last = practiceCard(r, true, NOW); r = last.rec; assert.equal(last.roundDone, false); }
  last = practiceCard(r, true, NOW);
  assert.deepEqual([last.heartBack, last.xpEarned, last.rec.hearts.n, last.rec.hearts.refillProgress], [true, true, 2, 0]);
});
test('gems refill: 350 gems fills all five; not offered when full', () => {
  const r = fresh({ lessonsFinished: 3 }); r.hearts.n = 1; r.hearts.lastRefillAt = NOW; r.gems.balance = 400;
  const out = refillByGems(r, NOW);
  assert.equal(out.ok, true); assert.equal(out.rec.hearts.n, 5); assert.equal(out.rec.gems.balance, 50);
  assert.equal(refillByGems(out.rec, NOW).reason, 'full');
  r.gems.balance = 10; assert.equal(refillByGems(r, NOW).reason, 'balance');
});
test('a 3-minute sitting pays XP but is not a finished lesson (no unlock, no first-lesson gems)', () => {
  const a = lessonPayout(fresh(), { awardId: 'quick|r05|d', accuracy: 0, now: NOW, partial: true });
  assert.deepEqual([a.xp, a.first, a.gems, a.rec.lessonsFinished], [10, false, 0, 0]);
  const b = lessonPayout(a.rec, { awardId: 'lesson|r05', accuracy: 0, now: NOW });
  assert.deepEqual([b.xp, b.first, b.gems, b.rec.lessonsFinished], [10, true, 60, 1], 'finishing the lesson later still pays, and reaches the daily goal');
});
test('review round 4: a finished lesson pays once per end card (also across tabs) and at most twice a day', async () => {
  const { lessonAward, unlockedBy, LESSON_PAYS_PER_DAY } = await import('../../src/retention/xp.js');
  const H = '#/learn?lesson=r04';
  const a = lessonAward(fresh(), H, NOW); assert.equal(a.id, 'lesson|#/learn?lesson=r04|2026-11-10|0');
  assert.equal(lessonAward(a.rec, H, NOW + 5000).id, null, 'the same end card, here or in a second tab reading the same record');
  assert.equal(lessonAward(a.rec, '#/learn?lesson=r05', NOW + 5000).id, 'lesson|#/learn?lesson=r05|2026-11-10|0', 'another lesson is its own');
  const b = lessonAward(a.rec, H, NOW + 10 * 60000); assert.match(b.id, /\|1$/);
  const c = lessonAward(b.rec, H, NOW + 20 * 60000); assert.equal(c.id, null, 'a third run today is practice only'); assert.equal(LESSON_PAYS_PER_DAY, 2);
  assert.match(lessonAward(c.rec, H, NOW + 86400000).id, /2026-11-11\|0$/, 'tomorrow it pays again');
  assert.equal(lessonAward({ ...fresh(), lessonRuns: 'junk', lastLesson: 7 }, H, NOW).id.endsWith('|0'), true);
});
test('new parts are introduced when they open: quests at 2 lessons, hearts at 3, expeditions at 4, the league at 5', async () => {
  const { unlockedBy } = await import('../../src/retention/xp.js');
  const r = fresh();
  assert.deepEqual([unlockedBy(r, 0, 1), unlockedBy(r, 1, 2), unlockedBy(r, 2, 3), unlockedBy(r, 3, 4), unlockedBy(r, 4, 5), unlockedBy(r, 5, 6)], [[], ['quests'], ['hearts'], ['expeditions'], ['league'], []]);
  const off = fresh(); off.hearts.enabled = false; off.league.enabled = false;
  assert.deepEqual([unlockedBy(off, 2, 3), unlockedBy(off, 4, 5)], [[], []], 'nothing is announced for a part the learner switched off');
});
