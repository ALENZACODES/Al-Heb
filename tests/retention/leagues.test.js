import './_helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { T } from './_helpers.js';
import { defaults } from '../../src/retention/state.js';
import { leagueEnd, weekIdOf } from '../../src/retention/clock.js';
import { LEAGUE_NAMES } from '../../src/retention/league.names.js';
import { TIERS, HONESTY_LINE, cohort, standings, resultFor, addLeagueXp, settle, leagueOn, leagueView, baselineOf, timeLeftText, mulberry32, fnv1a } from '../../src/retention/leagues.js';

const WK = '2026-11-08', END = leagueEnd(WK); // Sunday 8 November; closes Friday 13 November 14:00
const fresh = (league = {}) => { const r = defaults(T('2026-11-01T10:00'), 'install-1'); Object.assign(r.league, { weekId: WK, joined: true }, league); r.lessonsFinished = 9; return r; };

test('ten tiers; the bots are plainly labelled as pretend', () => {
  assert.equal(TIERS.length, 10); assert.deepEqual([TIERS[0].demote, TIERS[9].promote], [0, 0]);
  assert.match(HONESTY_LINE, /pretend/); assert.match(HONESTY_LINE, /Practice league/);
  assert.equal(LEAGUE_NAMES.length, 120); assert.equal(new Set(LEAGUE_NAMES).size, 120);
});
test('the cohort is deterministic: same install, week and tier give the same 29 players', () => {
  const a = cohort('install-1', WK, 4, 120), b = cohort('install-1', WK, 4, 120);
  assert.deepEqual(a, b); assert.equal(a.length, 29);
  assert.equal(new Set(a.map((p) => p.name)).size, 29); assert.ok(a.every((p) => LEAGUE_NAMES.includes(p.name)));
  assert.notDeepEqual(cohort('install-2', WK, 4, 120).map((p) => p.target), a.map((p) => p.target));
  assert.notDeepEqual(cohort('install-1', '2026-11-15', 4, 120).map((p) => p.name), a.map((p) => p.name));
  assert.equal(mulberry32(fnv1a('x'))(), mulberry32(fnv1a('x'))());
  for (const p of a) assert.ok(Math.abs(p.steps.reduce((x, y) => x + y, 0) - 1) < 1e-9);
});
test('a usual week lands mid-table; a quarter more than usual moves up', () => {
  let mid = 0, up = 0;
  for (let k = 0; k < 200; k++) {
    const r1 = standings(cohort('i' + k, WK, 1, 120), 120, END, WK).find((x) => x.you).rank; if (r1 >= 10 && r1 <= 20) mid++;
    const r4 = standings(cohort('i' + k, WK, 4, 120), 156, END, WK).find((x) => x.you).rank; if (resultFor(4, r4) === 'up') up++;
  }
  assert.ok(mid >= 180, `mid-table in ${mid} of 200`); assert.ok(up >= 140, `promoted in ${up} of 200`);
});
test('pretend players earn nothing before Sunday 08:00 and reach their target by Friday 14:00; ties go to the learner', () => {
  const c = cohort('install-1', WK, 1, 120);
  assert.ok(standings(c, 0, T('2026-11-08T07:00'), WK).every((r) => r.xp === 0));
  assert.equal(standings(c, 0, T('2026-11-08T07:00'), WK)[0].you, true, 'a tie ranks the learner first');
  const end = standings(c, 0, END, WK).filter((r) => !r.you).map((r) => r.xp).sort((a, b) => a - b);
  assert.deepEqual(end, c.map((p) => p.target).sort((a, b) => a - b));
  const wed = standings(c, 0, T('2026-11-11T12:00'), WK).filter((r) => !r.you);
  assert.ok(wed.every((r) => r.xp >= 0) && wed.some((r) => r.xp > 0));
  const tie = standings([{ name: 'Tal B.', target: 50, steps: [1, 0, 0, 0, 0, 0] }], 50, END, WK);
  assert.deepEqual(tie.map((r) => r.you), [true, false]);
});
test('week boundaries: Friday 13:59 counts, Friday 14:01 is carried, Sunday adds the carry', () => {
  let r = fresh();
  r = addLeagueXp(r, 10, T('2026-11-13T13:59')); assert.deepEqual([r.league.weekXp, r.league.carry], [10, 0]);
  r = addLeagueXp(r, 7, T('2026-11-13T14:01')); assert.deepEqual([r.league.weekXp, r.league.carry], [10, 7]);
  r = addLeagueXp(r, 3, T('2026-11-14T22:00')); assert.equal(r.league.carry, 10);
  const s = settle(r, T('2026-11-15T00:01'));
  assert.deepEqual([s.rec.league.weekId, s.rec.league.weekXp, s.rec.league.carry, s.rec.league.joined], ['2026-11-15', 10, 0, true]);
  assert.equal(weekIdOf(T('2026-11-15T00:01')), '2026-11-15');
});
test('settlement promotes and demotes by the table; tier 1 never drops, tier 10 never rises', () => {
  const sun = T('2026-11-15T10:00');
  const up = settle(fresh({ tier: 1, weekXp: 100000 }), sun);
  assert.deepEqual([up.result.rank, up.result.result, up.rec.league.tier, up.result.gems], [1, 'up', 2, 100]);
  assert.equal(up.rec.gems.balance, 100); assert.equal(up.rec.league.resultUnseen, WK); assert.equal(up.rec.league.history.length, 1);
  const down = settle(fresh({ tier: 2, weekXp: 1 }), sun);
  assert.deepEqual([down.result.rank, down.result.result, down.rec.league.tier], [30, 'down', 1]);
  assert.equal(settle(fresh({ tier: 1, weekXp: 1 }), sun).rec.league.tier, 1);
  const top = settle(fresh({ tier: 10, weekXp: 100000 }), sun);
  assert.deepEqual([top.result.result, top.rec.league.tier, top.result.gems], ['stay', 10, 100]);
  assert.equal(resultFor(2, 7), 'up'); assert.equal(resultFor(2, 8), 'stay'); assert.equal(resultFor(2, 26), 'down'); assert.equal(resultFor(9, 6), 'stay');
});
test('a week with no XP has no result; settlement runs once', () => {
  const sun = T('2026-11-15T10:00');
  const none = settle(fresh({ joined: false, weekXp: 0, tier: 3 }), sun);
  assert.equal(none.result, null); assert.equal(none.rec.league.tier, 3); assert.equal(none.rec.league.history.length, 0); assert.equal(none.rec.league.weekId, '2026-11-15');
  const once = settle(fresh({ tier: 1, weekXp: 100000 }), sun), twice = settle(once.rec, sun);
  assert.equal(twice.result, null); assert.deepEqual(twice.rec, once.rec);
});
test('Shabbat: no league result or reset between Friday 18:00 and Saturday 21:00', () => {
  const r = fresh({ tier: 1, weekXp: 100000 });
  for (const at of ['2026-11-13T18:00', '2026-11-14T09:00', '2026-11-14T20:59']) { const s = settle(r, T(at)); assert.equal(s.result, null, at); assert.equal(s.rec, r, at); }
  const fri = settle(r, T('2026-11-13T15:00'));
  assert.equal(fri.result.result, 'up'); assert.equal(fri.rec.league.weekId, WK, 'the new week still opens on Sunday');
  assert.equal(addLeagueXp(fri.rec, 5, T('2026-11-13T15:30')).league.carry, 5);
  assert.equal(settle(r, T('2026-11-14T21:00')).result.result, 'up', 'allowed again after Shabbat');
});
test('unlock after 5 lessons, never in calm mode; the view puts the learner in a 30-row table', () => {
  const r = fresh({ weekXp: 60 });
  assert.equal(leagueOn(r), true); assert.equal(leagueOn(r, { calm: true }), false);
  assert.equal(leagueOn(Object.assign(fresh(), { lessonsFinished: 4 })), false);
  const v = leagueView(r, T('2026-11-11T12:00'));
  assert.equal(v.table.length, 30); assert.equal(v.table.filter((x) => x.you).length, 1); assert.equal(v.promoteLine, 10); assert.equal(v.demoteLine, null);
  assert.equal(timeLeftText(v.msLeft), '2 days 2 hours left');
  assert.equal(baselineOf(r), 120);
  const h = fresh(); h.league.history = [{ week: '2026-10-18', tier: 1, rank: 5, xp: 80, result: 'up' }, { week: '2026-10-25', tier: 2, rank: 9, xp: 100, result: 'stay' }, { week: '2026-11-01', tier: 2, rank: 9, xp: 140, result: 'stay' }];
  assert.equal(baselineOf(h), 100);
});
