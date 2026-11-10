// Review round 3: random event sequences against the pure modules. Whatever order things happen in, the record stays
// well-formed: XP never goes down, gems and hearts stay in range, nothing throws, and reading a record twice is stable.
import './_helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { T } from './_helpers.js';
import { projectStreak, completeDay } from '../../src/curriculum/streak.js';
import { defaults, normalize, CAPS } from '../../src/retention/state.js';
import { mulberry32 } from '../../src/retention/leagues.js';
import { award, lessonPayout, setGoal } from '../../src/retention/xp.js';
import { earn } from '../../src/retention/gems.js';
import { loseHeart, practiceCard, refillByGems, refillByTime } from '../../src/retention/hearts.js';
import { applyRollover, buyFreeze, repairStreak, afterDayCompleted, streakStatus, weekDots } from '../../src/retention/streak.js';
import { settle, leagueView } from '../../src/retention/leagues.js';
import { logSession, plan, recordSent, answerAsk, mayShow, nextFire } from '../../src/retention/notify.js';
import { questProgress, questView } from '../../src/retention/quests.js';
import { isQuiet } from '../../src/retention/quiet.js';

function check(rec, streak, now, prevXp, tag) {
  assert.ok(rec.xp.total >= prevXp, `${tag}: XP went down`);
  assert.ok(Number.isInteger(rec.gems.balance) && rec.gems.balance >= 0, `${tag}: gems ${rec.gems.balance}`);
  assert.ok(rec.hearts.n >= 0 && rec.hearts.n <= 5, `${tag}: hearts ${rec.hearts.n}`);
  assert.ok(rec.freezes.held >= 0 && rec.freezes.held <= 2, `${tag}: freezes ${rec.freezes.held}`);
  assert.ok(rec.league.tier >= 1 && rec.league.tier <= 10, `${tag}: tier`);
  assert.ok(rec.league.weekXp >= 0 && rec.league.carry >= 0, `${tag}: league xp`);
  assert.ok(rec.xp.recentIds.length <= CAPS.recentIds && rec.gems.ledger.length <= CAPS.ledger && rec.sessions.length <= CAPS.sessions && rec.notify.sent.length <= CAPS.sent && rec.league.history.length <= CAPS.history, `${tag}: caps`);
  const dayTotal = Object.values(rec.xp.days).reduce((a, b) => a + b, 0);
  assert.ok(dayTotal <= rec.xp.total, `${tag}: day XP ${dayTotal} above total ${rec.xp.total}`);
  const once = normalize(rec, now);
  assert.deepEqual(normalize(once, now), once, `${tag}: normalize is not stable`);
  const p = projectStreak(streak, now); assert.ok(p.count >= 0 && p.best >= p.count, `${tag}: streak`);
}

test('random sequences of everything a learner can do keep the record well-formed (60 learners, 400 steps each, about 8 months)', () => {
  const seen = { freezeUsed: 0, broken: 0, repaired: 0, leagueWeeks: 0, promoted: 0, planned: 0, chest: 0, heartsEmpty: 0, restCovered: 0, goalDays: 0 };
  for (let seed = 1; seed <= 60; seed++) {
    const rand = mulberry32(seed * 7919), pick = (n) => Math.floor(rand() * n);
    let now = T('2026-03-01T08:00') + pick(86400000), rec = defaults(now, 'fuzz-' + seed), streak = null, id = 0;
    rec.notify.optedIn = rand() < 0.7; rec.notify.tone = rand() < 0.5 ? 'playful' : 'kind';
    for (let step = 0; step < 400; step++) {
      const prevXp = rec.xp.total, tag = `seed ${seed} step ${step}`;
      now += [5 * 60000, 3600000, 9 * 3600000, 26 * 3600000, 4 * 86400000, -2 * 3600000][pick(6)] * (0.2 + rand()); now = Math.round(now); // minutes to days forward, sometimes a clock moved back
      const ro = applyRollover(streak, rec, now, { tz: rand() < 0.05 ? 'Asia/Jerusalem' : 'America/Toronto' }); streak = ro.streak; rec = ro.ret;
      for (const e of ro.events) { if (e === 'freeze_used') seen.freezeUsed++; if (e === 'streak_broken') seen.broken++; if (e === 'rest_covered') seen.restCovered++; }
      rec = settle(rec, now).rec; rec = refillByTime(rec, now);
      switch (pick(12)) {
        case 0: case 1: case 2: { const before = streak; const pay = lessonPayout(rec, { awardId: 'L' + (rand() < 0.1 ? id : ++id), accuracy: rand(), maxCombo: pick(12), now, partial: rand() < 0.2 }); streak = completeDay(streak, now); rec = afterDayCompleted(before, streak, pay.rec, now).rec; rec = questProgress(rec, { xp: pay.xp, lesson: 1, combo: pick(9) }, now).rec; rec = logSession(rec, now); break; }
        case 3: for (let k = 0, n = rand() < 0.3 ? 6 : 1; k < n; k++) rec = loseHeart(rec, 'q' + step + '-' + k, now).rec; break;
        case 4: { rec = award(rec, { awardId: 'r' + (++id), kind: 'review', amount: 1, now }).rec; rec = practiceCard(rec, rand() < 0.7, now).rec; rec = questProgress(rec, { review: 1, xp: 1 }, now).rec; break; }
        case 5: rec = award(rec, { awardId: 'g' + (++id), kind: 'game', amount: 3, now }).rec; break;
        case 6: rec = buyFreeze(rec, now).rec; break;
        case 7: rec = refillByGems(rec, now).rec; break;
        case 8: { const out = repairStreak(streak, rec, now); streak = out.streak; rec = out.rec; if (out.ok) seen.repaired++; break; }
        case 9: rec = setGoal(rec, [10, 20, 30, 50, 7][pick(5)]); break;
        case 10: { const entries = plan(rec, projectStreak(streak, now), now); for (const e of entries) { assert.ok(e.fireAt > now, `${tag}: a reminder planned in the past`); assert.equal(isQuiet(e.fireAt), false, `${tag}: a reminder planned in quiet time (${new Date(e.fireAt)})`); } if (entries[0]) { seen.planned++; assert.equal(mayShow(rec, entries[0], entries[0].fireAt), true, `${tag}: planned but not showable`); rec = recordSent(rec, entries[0].id, entries[0].fireAt); } break; }
        default: rec = rand() < 0.5 ? earn(rec, pick(40), 'goal', now) : answerAsk(rec, ['yes', 'later', 'denied'][pick(3)], 'kind');
      }
      rec = normalize(rec, now);
      check(rec, streak, now, prevXp, tag);
      const st = streakStatus(streak, rec, now); assert.ok(['rest', 'done', 'freeze-used', 'at-risk', 'open', 'broken', 'new'].includes(st.state), tag);
      assert.equal(weekDots(streak, rec, now).length, 7, tag);
      const v = leagueView(rec, now); assert.equal(v.table.length, 30, tag); assert.equal(v.table.filter((r) => r.you).length, 1, tag);
      assert.ok(questView(rec, now).items.length <= 3, tag);
      if (rec.quests?.chest) seen.chest++; if (rec.hearts.n === 0) seen.heartsEmpty++;
      const f = nextFire(rec, now); if (f != null) assert.ok(f > now && !isQuiet(f), `${tag}: nextFire`);
    }
    seen.leagueWeeks += rec.league.history.length; seen.promoted += rec.league.history.filter((h) => h.result === 'up').length; seen.goalDays += rec.gems.ledger.filter((e) => e.why === 'goal').length;
  }
  for (const [k, n] of Object.entries(seen)) assert.ok(n > 0, `the random walk never reached: ${k} (${JSON.stringify(seen)})`);
});

test('nothing throws on broken input', () => {
  const now = T('2026-11-10T19:00');
  for (const raw of [null, undefined, 7, 'x', [], {}, { v: 'a', xp: null, gems: 5, hearts: [], league: 'no', notify: 0, sessions: [1, null, {}], freezes: { used: 'x' }, quests: 9, repair: { days: 'no' } }, { quests: { day: '2026-11-10', items: [{ id: 'nope', n: 'x' }] } }]) {
    const rec = normalize(raw, now);
    assert.doesNotThrow(() => { applyRollover('junk', rec, now); settle(rec, now); questView(rec, now); questProgress({ ...rec, lessonsFinished: 5 }, { xp: 5 }, now); leagueView(rec, now); plan(rec, {}, now); streakStatus(42, rec, now); weekDots(null, rec, now); award(rec, { awardId: 'a', amount: 5, now }); loseHeart(rec, null, now); });
  }
});
