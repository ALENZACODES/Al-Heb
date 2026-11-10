import './_helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { T } from './_helpers.js';
import { defaults } from '../../src/retention/state.js';
import { QUESTS, POOL, dailyQuests, questsOn, ensureQuests, questProgress, questView, questText } from '../../src/retention/quests.js';
import { addLeagueXp } from '../../src/retention/leagues.js';
import { reminderICS, createScheduler, usualTimeText } from '../../src/retention/notify.js';

const NOW = T('2026-11-10T19:00');
const fresh = (o = {}) => Object.assign(defaults(T('2026-11-01T10:00'), 'install-1'), { lessonsFinished: 4 }, o);

test('three quests a day, the same all day, different tomorrow, "Earn XP" always first', () => {
  const a = dailyQuests('install-1', '2026-11-10');
  assert.deepEqual(a, dailyQuests('install-1', '2026-11-10'));
  assert.equal(a.length, 3); assert.equal(a[0].id, 'xp'); assert.equal(new Set(a.map((q) => q.id)).size, 3);
  for (const q of a) assert.ok(POOL.find((p) => p.id === q.id).targets.includes(q.n));
  const days = new Set(Array.from({ length: 14 }, (_, i) => JSON.stringify(dailyQuests('install-1', `2026-11-${String(i + 1).padStart(2, '0')}`))));
  assert.ok(days.size >= 6, 'the set changes from day to day');
  for (const p of POOL) for (const n of p.targets) assert.doesNotMatch(p.text(n), /undefined|NaN/);
});
test('quests open after 2 lessons, never in calm mode, and a rest day has none', () => {
  assert.equal(questsOn(fresh({ lessonsFinished: 1 })), false); assert.equal(questsOn(fresh()), true); assert.equal(questsOn(fresh(), { calm: true }), false);
  assert.equal(ensureQuests(fresh(), NOW).quests.items.length, 3);
  const sat = ensureQuests(fresh(), T('2026-11-14T22:00'));
  assert.deepEqual([sat.quests.items.length, sat.quests.rest], [0, true]);
  assert.equal(questView(fresh(), T('2026-11-14T12:00')).rest, true);
  assert.equal(questProgress(fresh({ lessonsFinished: 0 }), { xp: 50 }, NOW).gems, 0);
});
test('progress pays 5 gems a quest, once, and 10 more for all three', () => {
  let r = ensureQuests(fresh(), NOW);
  r.quests.items = [{ id: 'xp', n: 20, p: 0, paid: false }, { id: 'combo', n: 5, p: 0, paid: false }, { id: 'review', n: 5, p: 0, paid: false }];
  let o = questProgress(r, { xp: 15, combo: 3 }, NOW);
  assert.deepEqual([o.done, o.gems, o.rec.quests.items.map((i) => i.p)], [[], 0, [15, 3, 0]]);
  o = questProgress(o.rec, { xp: 15, combo: 2 }, NOW);
  assert.deepEqual([o.done, o.gems, o.chest], [['Earn 20 XP'], 5, false]);
  assert.equal(o.rec.quests.items[1].p, 3, 'a run of right answers keeps its best, it does not add up');
  assert.equal(o.rec.gems.balance, 5); assert.equal(o.rec.gems.ledger.at(-1).why, 'quest');
  o = questProgress(o.rec, { xp: 50, combo: 6 }, NOW);
  assert.deepEqual([o.done, o.gems], [['Get 5 right in a row'], 5], 'a finished quest never pays twice');
  for (let i = 0; i < 4; i++) o = questProgress(o.rec, { review: 1 }, NOW);
  assert.equal(o.chest, false);
  o = questProgress(o.rec, { review: 1 }, NOW);
  assert.deepEqual([o.done, o.chest, o.gems, o.rec.gems.balance], [['Review 5 old cards'], true, 15, 25]);
  assert.equal(questProgress(o.rec, { review: 9, xp: 99 }, NOW).gems, 0);
  const v = questView(o.rec, NOW);
  assert.deepEqual([v.doneCount, v.chest, v.items.every((i) => i.done)], [3, true, true]);
  const tomorrow = questView(o.rec, NOW + 86400000);
  assert.deepEqual([tomorrow.doneCount, tomorrow.chest, tomorrow.items.length], [0, false, 3], 'a new day, new quests');
  assert.equal(questText({ id: 'lesson', n: 2 }), 'Finish 2 lessons'); assert.equal(QUESTS.gemsEach, 5);
});

test('review round 2: league XP is not ranked before the league opens or while it is off', () => {
  const early = fresh({ lessonsFinished: 2 });
  assert.equal(addLeagueXp(early, 30, NOW), early);
  const off = fresh({ lessonsFinished: 9 }); off.league.enabled = false; assert.equal(addLeagueXp(off, 30, NOW), off);
  assert.equal(addLeagueXp(fresh({ lessonsFinished: 5 }), 30, NOW).league.weekXp, 30);
});
test('review round 2: the calendar file never starts on a Friday or Saturday', () => {
  const r = fresh();
  assert.match(reminderICS(r, T('2026-11-13T10:00')), /DTSTART:20261115T190000/, 'Friday moves to Sunday');
  assert.match(reminderICS(r, T('2026-11-14T10:00')), /DTSTART:20261115T190000/, 'Saturday moves to Sunday');
  assert.match(reminderICS(r, T('2026-11-12T10:00')), /DTSTART:20261112T190000/);
  assert.equal(usualTimeText(r, NOW), '7:00 pm');
});
test('review round 2: a reminder the browser refused to show is not recorded as sent', async () => {
  let rec = fresh({ sessions: [{ s: T('2026-11-09T19:00'), e: T('2026-11-09T19:10') }] }); rec.notify.optedIn = true;
  let clock = T('2026-11-10T09:00'); const timers = [];
  const s = createScheduler({ load: () => rec, save: (fn) => { rec = fn(rec) || rec; }, streak: () => ({ count: 0, activeToday: false }), show: async () => ({ ok: false, reason: 'permission denied' }),
    opt: () => ({}), now: () => clock, setTimeout: (fn, ms) => { timers.push(fn); return timers.length; }, clearTimeout: () => {}, g: {} });
  s.arm(); clock = T('2026-11-10T18:30'); await timers.at(-1)(); s.stop();
  assert.equal(rec.notify.sent.length, 0);
});
