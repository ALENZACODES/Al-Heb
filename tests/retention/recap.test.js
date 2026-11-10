import './_helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { T } from './_helpers.js';
import { defaults } from '../../src/retention/state.js';
import { lastWeek, recapDue, recapSeen, recapLine, weekDays, welcomeBack, isComebackDay, daysSinceStudy } from '../../src/retention/recap.js';

const fresh = (o = {}) => Object.assign(defaults(T('2026-10-01T10:00'), 'install-1'), { lessonsFinished: 9 }, o);
const withWeek = () => { const r = fresh(); r.xp.days = { '2026-11-01': 10, '2026-11-03': 30, '2026-11-05': 15, '2026-11-08': 12 }; r.xp.total = 67; return r; };

test('weekly recap: last week in numbers, shown once from Sunday, never during Shabbat or in calm mode', () => {
  const r = withWeek(), mon = T('2026-11-09T09:00');
  const w = lastWeek(r, mon);
  assert.deepEqual([w.weekId, w.xp, w.days, w.best, w.thisWeekXp], ['2026-11-01', 55, 3, { name: 'Tuesday', xp: 30 }, 12]);
  assert.deepEqual(w.bars.map((b) => b.xp), [10, 0, 30, 0, 15, 0, 0]);
  assert.equal(recapLine(w), '55 XP on 3 days. Best day: Tuesday, 30 XP.');
  assert.equal(recapDue(r, mon), true); assert.equal(recapDue(r, mon, { calm: true }), false);
  assert.equal(recapDue(recapSeen(r, mon), mon), false, 'once per week');
  assert.equal(recapDue(recapSeen(r, mon), T('2026-11-16T09:00')), true, 'again next week (this week had XP)');
  assert.equal(recapDue(r, T('2026-11-13T19:00')), false, 'not on Friday night');
  assert.equal(recapDue(fresh(), mon), false, 'nothing to show after an empty week');
  r.league.history = [{ week: '2026-11-01', tier: 1, rank: 3, xp: 55, result: 'up' }]; r.league.tier = 2;
  assert.match(recapLine(lastWeek(r, mon)), /You moved up to Sprout\.$/);
  assert.equal(weekDays(r, '2026-11-08')[0].name, 'Sunday');
});
test('welcome back after a week away: hearts filled for free, once, and reminders start again', () => {
  const r = fresh({ sessions: [{ s: T('2026-11-01T19:00'), e: T('2026-11-01T19:10') }] });
  r.hearts.n = 1; r.hearts.lastRefillAt = T('2026-11-01T19:05'); r.notify.stopped = true;
  assert.equal(daysSinceStudy(r, T('2026-11-10T09:00')), 9);
  assert.equal(welcomeBack(r, T('2026-11-06T09:00')).back, false, '5 days is not a comeback');
  const out = welcomeBack(r, T('2026-11-10T09:00'));
  assert.deepEqual([out.back, out.days, out.rec.hearts.n, out.rec.notify.stopped, out.rec.comebackAway], [true, 9, 5, false, 9]);
  assert.equal(isComebackDay(out.rec, T('2026-11-10T20:00')), true); assert.equal(isComebackDay(out.rec, T('2026-11-11T09:00')), false);
  assert.equal(welcomeBack(out.rec, T('2026-11-10T12:00')).back, false, 'once per return');
  assert.equal(welcomeBack(fresh(), T('2026-11-10T09:00')).back, false, 'a new learner is not "back"');
  assert.equal(r.hearts.n, 1, 'input untouched');
});
