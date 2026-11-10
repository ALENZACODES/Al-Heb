import './_helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { T } from './_helpers.js';
import { defaults } from '../../src/retention/state.js';
import { MONTH, monthOf, monthOn, monthXp, ensureMonth, monthProgress, monthView } from '../../src/retention/month.js';

const fresh = (o = {}) => Object.assign(defaults(T('2026-10-01T10:00'), 'install-1'), { lessonsFinished: 6 }, o);

test('the challenge follows the Hebrew month, from the app\'s own calendar', () => {
  const k1 = monthOf(T('2026-11-11T09:00'));
  assert.deepEqual([k1.key, k1.en, k1.start, k1.end, k1.day, k1.daysLeft], ['5787-kislev', 'Kislev', '2026-11-11', '2026-12-10', 1, 29]);
  assert.equal(monthOf(T('2026-11-10T23:00')).en, 'Cheshvan'); assert.equal(monthOf(T('2026-11-10T23:00')).daysLeft, 0);
  assert.equal(monthOf(T('2026-12-10T12:00')).key, '5787-kislev'); assert.equal(monthOf(T('2026-12-11T12:00')).en, 'Tevet');
  assert.equal(monthOf(T('2027-03-12T12:00')).en, 'Adar II', 'a leap year has two Adars');
  for (let i = 0; i < 400; i++) { const m = monthOf(T('2026-11-11T12:00') + i * 86400000); assert.ok(m.start <= m.end && m.day >= 1 && m.day <= 30 && m.daysLeft >= 0 && m.daysLeft <= 29 && m.he, `day ${i}`); }
});
test('the target comes from the learner\'s own goal, is set once, and is smaller for a late start', () => {
  const start = T('2026-11-11T09:00');
  assert.equal(ensureMonth(fresh(), start).month.target, 300, '20 XP a day on 15 of 30 days');
  assert.equal(ensureMonth(fresh({ goal: 50 }), start).month.target, 750);
  assert.equal(ensureMonth(fresh(), T('2026-12-06T09:00')).month.target, MONTH.minTarget, 'five days left: the smallest target');
  const set = ensureMonth(fresh(), start); set.goal = 50;
  assert.equal(ensureMonth(set, T('2026-11-20T09:00')).month.target, 300, 'changing the daily goal later does not move this month\'s target');
});
test('reaching the target pays 50 gems once; the next month starts fresh; closed before 5 lessons and in calm mode', () => {
  const now = T('2026-11-20T19:00'); let r = ensureMonth(fresh(), T('2026-11-11T09:00'));
  r.xp.days = { '2026-11-10': 500, '2026-11-12': 150, '2026-11-19': 140 }; // the 10th is still Cheshvan
  assert.equal(monthXp(r, monthOf(now)), 290);
  assert.equal(monthProgress(r, now).completed, false); assert.equal(monthView(r, now).xp, 290);
  r.xp.days['2026-11-20'] = 15;
  const done = monthProgress(r, now);
  assert.deepEqual([done.completed, done.rec.gems.balance, done.rec.gems.ledger.at(-1).why, done.rec.month.paid], [true, 50, 'month', true]);
  assert.equal(monthProgress(done.rec, now).completed, false, 'once');
  const v = monthView(done.rec, now); assert.deepEqual([v.title, v.done, v.xp, v.target, v.daysLeft], ['Kislev Challenge', true, 300, 300, 20]);
  const tevet = monthView(done.rec, T('2026-12-11T09:00')); assert.deepEqual([tevet.title, tevet.done, tevet.xp], ['Tevet Challenge', false, 0]);
  assert.equal(monthOn(fresh({ lessonsFinished: 4 })), false); assert.equal(monthOn(fresh(), { calm: true }), false);
  assert.equal(monthProgress(fresh({ lessonsFinished: 4 }), now).completed, false);
});
