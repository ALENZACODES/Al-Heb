import './_helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { T, streakRec } from './_helpers.js';
import { projectStreak, yomTovDates, completeDay } from '../../src/curriculum/streak.js';
import { defaults } from '../../src/retention/state.js';
import { dayKey, localAt, weekIdOf, addDaysISO, weekdayOf, inShabbatWindow } from '../../src/retention/clock.js';
import { earn } from '../../src/retention/gems.js';
import { STREAK, applyRollover, buyFreeze, repairOffer, repairStreak, afterDayCompleted, completeLessonDay, isFreeRestDay, streakStatus } from '../../src/retention/streak.js';

const ret = (o = {}) => { const r = defaults(T('2026-11-01T10:00'), 'install-1'); r.freezes.evaluatedThrough = '2026-11-08'; Object.assign(r.freezes, o.freezes || {}); if (o.gems) r.gems.balance = o.gems; return r; };
const WED = T('2026-11-11T10:00');

test('day boundaries: local midnight decides the day, in any zone and across daylight saving', () => {
  assert.equal(dayKey(T('2026-11-10T23:59:59')), '2026-11-10');
  assert.equal(dayKey(T('2026-11-11T00:00:00')), '2026-11-11');
  // a lesson started at 23:58 and finished at 00:02 counts for the day it finished
  const s = completeLessonDay(streakRec({ last: '2026-11-10', count: 3, best: 3 }), T('2026-11-11T00:02'));
  assert.equal(s.last, '2026-11-11'); assert.equal(s.count, 4);
  // spring forward (8 March 2026) and fall back (1 November 2026): wall-clock times stay put
  assert.equal(new Date(localAt('2026-03-08', 19 * 60)).getHours(), 19);
  assert.equal(new Date(localAt('2026-11-01', 19 * 60)).getHours(), 19);
  assert.equal(addDaysISO('2026-03-07', 1), '2026-03-08'); assert.equal(addDaysISO('2026-03-08', 1), '2026-03-09');
  assert.equal(weekIdOf(T('2026-03-08T12:00')), '2026-03-08'); assert.equal(weekIdOf(T('2026-03-14T23:30')), '2026-03-08');
  assert.equal(weekdayOf('2026-11-13'), 5);
  process.env.TZ = 'Asia/Jerusalem';
  try { assert.equal(dayKey(Date.UTC(2026, 10, 10, 22, 30)), '2026-11-11', 'already tomorrow in Jerusalem'); } finally { process.env.TZ = 'America/Toronto'; }
  assert.equal(dayKey(Date.UTC(2026, 10, 10, 22, 30)), '2026-11-10');
});

test('the fixed Shabbat window is Friday 18:00 to Saturday 21:00', () => {
  assert.equal(inShabbatWindow(T('2026-11-13T17:59')), false);
  assert.equal(inShabbatWindow(T('2026-11-13T18:00')), true);
  assert.equal(inShabbatWindow(T('2026-11-14T20:59')), true);
  assert.equal(inShabbatWindow(T('2026-11-14T21:00')), false);
});

test('freeze: one missed day, one freeze held, the streak survives', () => {
  const out = applyRollover(streakRec(), ret({ freezes: { held: 1 } }), WED);
  assert.deepEqual(out.events, ['freeze_used']);
  assert.equal(out.ret.freezes.held, 0); assert.deepEqual(out.ret.freezes.used, ['2026-11-10']); assert.equal(out.ret.freezes.unseen, true);
  assert.equal(projectStreak(out.streak, WED).count, 10);
  assert.equal(streakStatus(out.streak, out.ret, WED).state, 'freeze-used');
});
test('freeze: none held means the streak breaks and nothing is spent', () => {
  const out = applyRollover(streakRec(), ret(), WED);
  assert.deepEqual(out.events, ['streak_broken']);
  assert.equal(projectStreak(out.streak, WED).count, 0); assert.equal(projectStreak(out.streak, WED).broken, true);
});
test('freeze: all or nothing (2 missed, 1 held spends none; 2 missed, 2 held covers both)', () => {
  const thu = T('2026-11-12T10:00');
  const a = applyRollover(streakRec(), ret({ freezes: { held: 1 } }), thu);
  assert.equal(a.ret.freezes.held, 1); assert.equal(projectStreak(a.streak, thu).broken, true);
  const b = applyRollover(streakRec(), ret({ freezes: { held: 2 } }), thu);
  assert.equal(b.ret.freezes.held, 0); assert.equal(projectStreak(b.streak, thu).count, 10);
});
test('Shabbat: a missed Friday and Saturday never cost a freeze and never break the streak', () => {
  const sun = T('2026-11-15T09:00');
  for (const freeze of [true, false]) {
    const out = applyRollover(streakRec({ last: '2026-11-12', freeze }), ret({ freezes: { held: 1 } }), sun);
    assert.equal(out.ret.freezes.held, 1, 'no freeze spent'); assert.equal(projectStreak(out.streak, sun).count, 10);
    assert.ok(!out.events.includes('streak_broken'));
  }
  assert.equal(isFreeRestDay('2026-11-14'), true); assert.equal(isFreeRestDay('2026-11-13'), true); assert.equal(isFreeRestDay('2026-11-12'), false);
});
test('Yom Tov: the day and its eve are free rest days', () => {
  const yt = [...yomTovDates('2027-01-01', '2027-12-31', 'reform')].find((d) => ![4, 5, 6, 0].includes(weekdayOf(d)));
  assert.ok(yt, 'a midweek Yom Tov exists in 2027');
  const last = addDaysISO(yt, -2), now = localAt(addDaysISO(yt, 1), 10 * 60);
  const r = ret({ freezes: { held: 1 } }); r.freezes.evaluatedThrough = addDaysISO(last, -1);
  const out = applyRollover(streakRec({ last }), r, now);
  assert.equal(out.ret.freezes.held, 1); assert.equal(projectStreak(out.streak, now).count, 10);
});
test('a freeze bought after a break does not repair it; rollover is idempotent', () => {
  const a = applyRollover(streakRec(), ret({ gems: 200 }), WED);
  const bought = buyFreeze(a.ret, WED); assert.equal(bought.ok, true); assert.equal(bought.rec.gems.balance, 0);
  const b = applyRollover(a.streak, bought.rec, WED);
  assert.equal(b.ret.freezes.held, 1); assert.equal(projectStreak(b.streak, WED).broken, true);
  const c = applyRollover(b.streak, b.ret, WED);
  assert.deepEqual(c.ret, b.ret); assert.deepEqual(c.streak, b.streak);
});
test('clock moved back: nothing spent, nothing broken', () => {
  const out = applyRollover(streakRec({ last: '2026-11-11' }), ret({ freezes: { held: 1, evaluatedThrough: '2026-11-10' } }), T('2026-11-10T10:00'));
  assert.deepEqual(out.events, []); assert.equal(out.ret.freezes.held, 1); assert.equal(out.ret.freezes.evaluatedThrough, '2026-11-10');
});
test('travel: a zone change with under 36 real hours covers one skipped day; 40 hours does not', () => {
  const end = T('2026-11-09T23:00'); // Monday night in Toronto
  const base = () => { const r = ret(); r.lastTz = 'America/Toronto'; r.sessions = [{ s: end - 600000, e: end }]; return r; };
  process.env.TZ = 'Asia/Jerusalem';
  try {
    const a = applyRollover(streakRec(), base(), end + 20 * 3600000, { tz: 'Asia/Jerusalem' });
    assert.deepEqual(a.events, ['travel_covered']); assert.deepEqual(a.ret.travelCovered, ['2026-11-10']); assert.equal(a.ret.lastTz, 'Asia/Jerusalem');
    assert.equal(projectStreak(a.streak, end + 20 * 3600000).count, 10);
    const b = applyRollover(streakRec(), base(), end + 40 * 3600000, { tz: 'Asia/Jerusalem' });
    assert.deepEqual(b.events, ['streak_broken']);
  } finally { process.env.TZ = 'America/Toronto'; }
});
test('a pre-v2 streak record is rolled to v2 before freezes apply', () => {
  const out = applyRollover({ count: 10, best: 10, last: '2026-11-09' }, ret({ freezes: { held: 1 } }), WED);
  assert.equal(out.streak.v, 2); assert.equal(out.ret.freezes.held, 0); assert.equal(projectStreak(out.streak, WED).count, 10);
});
test('buying: at most 2 held; 199 gems is not enough', () => {
  assert.deepEqual([buyFreeze(ret({ gems: 199 })).ok, buyFreeze(ret({ gems: 199 })).reason], [false, 'balance']);
  let r = ret({ gems: 1000 }); r = buyFreeze(r).rec; r = buyFreeze(r).rec;
  assert.equal(r.freezes.held, 2); assert.equal(buyFreeze(r).reason, 'max'); assert.equal(r.gems.balance, 600);
});
test('repair window: a broken streak can be bought back for 48 hours', () => {
  const thu = T('2026-11-05T10:00'), s0 = streakRec({ last: '2026-11-02' });
  const r0 = ret({ gems: 300 }); r0.freezes.evaluatedThrough = '2026-11-01';
  const a = applyRollover(s0, r0, thu);
  const offer = repairOffer(a.ret, thu);
  assert.deepEqual(offer.days, ['2026-11-03', '2026-11-04']); assert.equal(offer.price, 300); assert.equal(offer.hoursLeft, STREAK.repairWindowHours);
  const fixed = repairStreak(a.streak, a.ret, thu);
  assert.equal(fixed.ok, true); assert.equal(fixed.rec.gems.balance, 0); assert.equal(fixed.rec.repair, null);
  assert.equal(projectStreak(fixed.streak, thu).count, 10);
  // the learner already started again before repairing: the two chains join
  const restarted = completeDay(a.streak, thu); assert.equal(restarted.count, 1);
  const joined = repairStreak(restarted, a.ret, thu);
  assert.equal(projectStreak(joined.streak, thu).count, 11); assert.equal(joined.streak.best, 11);
  // too poor, too late
  const poor = { ...a.ret, gems: { ...a.ret.gems, balance: 10 } };
  assert.equal(repairStreak(a.streak, poor, thu).reason, 'balance');
  assert.equal(repairOffer(a.ret, thu + 49 * 3600000), null);
  assert.equal(repairStreak(a.streak, a.ret, thu + 49 * 3600000).reason, 'none');
  assert.equal(applyRollover(a.streak, a.ret, thu + 49 * 3600000).ret.repair, null, 'an expired offer is cleared');
});
test('repair is not offered for long gaps', () => {
  const r0 = ret(); r0.freezes.evaluatedThrough = '2026-10-20';
  const a = applyRollover(streakRec({ last: '2026-10-26' }), r0, T('2026-11-05T10:00'));
  assert.ok(a.events.includes('streak_broken')); assert.equal(a.ret.repair, null);
});
test('milestones 3/7/14/30/50/100/365: celebrated, gems paid once each', () => {
  assert.deepEqual(STREAK.milestones, [3, 7, 14, 30, 50, 100, 365]);
  const now = T('2026-11-10T19:00'), before = streakRec({ count: 2, best: 2, last: '2026-11-09' });
  const after = completeLessonDay(before, now);
  const m = afterDayCompleted(before, after, ret(), now);
  assert.deepEqual([m.count, m.grew, m.milestone, m.gems], [3, true, 3, 5]); assert.equal(m.rec.gems.balance, 5);
  const again = afterDayCompleted(before, after, m.rec, now);
  assert.equal(again.milestone, 3); assert.equal(again.gems, 0);
  const plain = afterDayCompleted(streakRec({ count: 4, best: 4 }), completeLessonDay(streakRec({ count: 4, best: 4 }), now), ret(), now);
  assert.equal(plain.milestone, null); assert.equal(plain.grew, true);
  let r = earn(ret(), 1, 'goal', now); r.gems.paidMilestones = [7];
  const seven = afterDayCompleted(streakRec({ count: 6 }), completeLessonDay(streakRec({ count: 6 }), now), r, now);
  assert.equal(seven.gems, 0, 'a rebuilt streak reaching 7 again pays nothing');
});
test('status: rest on Saturday, at risk in the evening, done after a lesson', () => {
  const r = ret();
  assert.equal(streakStatus(streakRec({ last: '2026-11-13' }), r, T('2026-11-14T12:00')).state, 'rest');
  assert.equal(streakStatus(streakRec({ last: '2026-11-09' }), r, T('2026-11-10T19:00')).state, 'at-risk');
  assert.equal(streakStatus(streakRec({ last: '2026-11-09' }), r, T('2026-11-10T09:00')).state, 'open');
  assert.equal(streakStatus(streakRec({ last: '2026-11-10' }), r, T('2026-11-10T19:00')).state, 'done');
  assert.equal(streakStatus({}, r, T('2026-11-10T19:00')).state, 'new');
});
test('week strip: a bought freeze shows as its own state, Shabbat as rest, never as a failure', async () => {
  const { weekDots, freezeNoteSeen } = await import('../../src/retention/streak.js');
  const sun = T('2026-11-15T10:00');
  const a = applyRollover(streakRec({ last: '2026-11-10', doneDates: ['2026-11-09', '2026-11-10'] }), ret({ freezes: { held: 2, evaluatedThrough: '2026-11-10' } }), sun);
  assert.deepEqual(a.ret.freezes.used, ['2026-11-11', '2026-11-12']);
  const dots = weekDots(a.streak, a.ret, sun);
  assert.deepEqual(dots.map((d) => d.state), ['done', 'done', 'freeze', 'freeze', 'rest', 'rest', 'today']);
  assert.equal(dots[2].label, 'Wednesday: covered by a streak freeze'); assert.equal(dots[5].label, 'Saturday: rest day');
  assert.equal(freezeNoteSeen(a.ret).freezes.unseen, false); assert.equal(a.ret.freezes.unseen, true);
});
test('streak card: every state has its line; Friday night and Yom Tov are rest, never "at risk"', async () => {
  const { streakLine } = await import('../../src/retention/streak.js');
  const r = ret(), line = (rec, at) => { const st = streakStatus(rec, r, T(at)); return [st.state, streakLine(st)]; };
  assert.deepEqual(line(streakRec({ last: '2026-11-12' }), '2026-11-13T17:59'), ['open', 'Keep your 10-day streak going.']);
  assert.deepEqual(line(streakRec({ last: '2026-11-12' }), '2026-11-13T19:00'), ['rest', 'Shabbat Shalom. Your streak rests today too.']);
  assert.deepEqual(line(streakRec({ last: '2026-11-13' }), '2026-11-14T22:00'), ['rest', 'Shabbat Shalom. Your streak rests today too.']);
  const yt = [...yomTovDates('2027-01-01', '2027-12-31', 'reform')].find((d) => [2, 3].includes(weekdayOf(d)));
  assert.deepEqual(streakStatus(streakRec({ last: addDaysISO(yt, -1) }), r, localAt(yt, 19 * 60)).restKind, 'yomtov');
  assert.match(streakLine(streakStatus(streakRec({ last: addDaysISO(yt, -1) }), r, localAt(yt, 19 * 60))), /^Chag sameach/);
  assert.deepEqual(line(streakRec({ last: '2026-11-09' }), '2026-11-10T19:00'), ['at-risk', 'Keep your 10-day streak: one 3-minute lesson does it.']);
  assert.deepEqual(line(streakRec({ last: '2026-11-10', count: 1, best: 1 }), '2026-11-10T19:00'), ['done', 'Day 1 done. See you tomorrow!']);
  assert.deepEqual(line(streakRec({ last: '2026-11-10' }), '2026-11-10T19:00'), ['done', '10 days in a row. See you tomorrow!']);
  assert.deepEqual(line(streakRec({ last: '2026-11-05' }), '2026-11-10T09:00'), ['broken', "Fresh start. Your best is 10 days. Let's build again."]);
  assert.deepEqual(line({}, '2026-11-10T09:00'), ['new', 'Finish one quick lesson to start a streak.']);
  for (const s of ['rest', 'done', 'freeze-used', 'at-risk', 'open', 'broken', 'new']) assert.doesNotMatch(streakLine({ state: s, count: 3, best: 5, held: 1 }), /undefined|NaN/);
});
