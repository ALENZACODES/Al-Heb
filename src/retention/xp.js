// @ts-check
// XP: only ever goes up. Pure functions; every award carries an id so a re-rendered end card never pays twice.
import { clone, CAPS, GOAL_CHOICES } from './state.js';
import { dayKey } from './clock.js';
import { earn, EARN } from './gems.js';
import { addLeagueXp, LEAGUE } from './leagues.js';
import { HEARTS } from './hearts.js';
import { QUESTS } from './quests.js';

/** Daily goal choices shown to the learner. */
export const GOALS = Object.freeze([
  { id: 'casual', xp: 10, label: 'Casual' }, { id: 'regular', xp: 20, label: 'Regular' },
  { id: 'serious', xp: 30, label: 'Serious' }, { id: 'intense', xp: 50, label: 'Intense' },
]);
/** Tuning table: every XP number in one place. */
export const XP = Object.freeze({
  lesson: 10, accuracyAt: 0.9, accuracyBonus: 5,
  comboEvery: 5, comboBonus: 2, comboCap: 6,   // +2 XP for every 5 right answers in a row inside one lesson, at most +6
  review: 1, reviewCapPerDay: 20, refillRound: 5,
  game: 3, gameCapPerDay: 15,
});

export const todayXp = (rec, now = Date.now()) => rec.xp.days[dayKey(now)] || 0;
export const goalProgress = (rec, now = Date.now()) => { const x = todayXp(rec, now); return { xp: x, goal: rec.goal, fraction: Math.min(1, x / rec.goal), done: x >= rec.goal }; };
export const comboBonus = (maxRun) => Math.min(XP.comboCap, Math.floor(Math.max(0, maxRun || 0) / XP.comboEvery) * XP.comboBonus);
export function setGoal(rec, xp) { if (!GOAL_CHOICES.includes(xp)) return rec; const r = clone(rec); r.goal = xp; return r; }

/**
 * Pay XP once. kind: 'lesson' | 'review' | 'game' | 'refill'. Daily caps apply to review and game.
 * @returns {{rec:object, paid:number, goalCrossed:boolean}} goalCrossed is true only the first time today's goal is met (it pays gems once a day).
 */
export function award(rec, { awardId, kind = 'lesson', amount, now = Date.now() }) {
  if (!awardId || rec.xp.recentIds.includes(awardId) || !(amount > 0)) return { rec, paid: 0, goalCrossed: false };
  let r = clone(rec); const today = dayKey(now);
  if (r.xp.capDay !== today) { r.xp.capDay = today; r.xp.capReview = 0; r.xp.capGame = 0; }
  let paid = Math.floor(amount);
  if (kind === 'review') { paid = Math.min(paid, XP.reviewCapPerDay - r.xp.capReview); r.xp.capReview += Math.max(0, paid); }
  if (kind === 'game') { paid = Math.min(paid, XP.gameCapPerDay - r.xp.capGame); r.xp.capGame += Math.max(0, paid); }
  r.xp.recentIds = [...r.xp.recentIds, awardId].slice(-CAPS.recentIds);
  if (paid <= 0) return { rec: r, paid: 0, goalCrossed: false };
  const before = r.xp.days[today] || 0;
  r.xp.total += paid; r.xp.days[today] = before + paid;
  const keys = Object.keys(r.xp.days).sort(); for (const k of keys.slice(0, Math.max(0, keys.length - CAPS.xpDays))) delete r.xp.days[k];
  r = addLeagueXp(r, paid, now);
  const goalCrossed = before + paid >= r.goal && r.gems.goalPaidDay !== today;
  if (goalCrossed) { r = earn(r, EARN.goal, 'goal', now); r.gems.goalPaidDay = today; }
  return { rec: r, paid, goalCrossed };
}

/**
 * Everything one finished lesson pays: base XP, accuracy bonus, combo bonus, gems, the lesson counter.
 * partial: a 3-minute sitting inside a longer lesson. It pays the XP but does not count as a finished lesson (no unlocks, no first-lesson gems).
 * @returns {{rec:object, xp:number, parts:{base:number, accuracy:number, combo:number}, gems:number, goalCrossed:boolean, first:boolean, duplicate:boolean}}
 */
export function lessonPayout(rec, { awardId, accuracy = 0, maxCombo = 0, now = Date.now(), partial = false }) {
  const parts = { base: XP.lesson, accuracy: accuracy >= XP.accuracyAt ? XP.accuracyBonus : 0, combo: comboBonus(maxCombo) };
  if (!awardId || rec.xp.recentIds.includes(awardId)) return { rec, xp: 0, parts, gems: 0, goalCrossed: false, first: false, duplicate: true };
  const gemsBefore = rec.gems.balance, first = !partial && rec.lessonsFinished === 0;
  let { rec: r, paid, goalCrossed } = award(rec, { awardId, kind: 'lesson', amount: parts.base + parts.accuracy + parts.combo, now });
  r = clone(r); if (!partial) r.lessonsFinished += 1; // a 3-minute sitting pays XP but is not a finished lesson
  if (parts.accuracy) r = earn(r, EARN.accuracy, 'accuracy', now);
  if (first) r = earn(r, EARN.first, 'first', now);
  return { rec: r, xp: paid, parts, gems: r.gems.balance - gemsBefore, goalCrossed, first, duplicate: false };
}

/** A lesson pays at most this many times a day (re-doing the same lesson over and over is practice, not a way to mint XP). */
export const LESSON_PAYS_PER_DAY = 2;
export const SAME_FINISH_MS = 60000;
/**
 * The award id for a finished lesson at `hash`, or null when this finish must not pay: the same end card drawn again
 * (also in another tab: the note is in the stored record), or the lesson already paid twice today.
 * @returns {{id:string|null, rec:object}} rec carries the note of this finish
 */
export function lessonAward(rec, hash, now = Date.now()) {
  const today = dayKey(now), last = rec.lastLesson;
  if (last && last.hash === hash && now - last.at >= 0 && now - last.at < SAME_FINISH_MS) return { id: null, rec };
  const runs = rec.lessonRuns && rec.lessonRuns.day === today && rec.lessonRuns.h && typeof rec.lessonRuns.h === 'object' ? rec.lessonRuns.h : {};
  const n = Number(runs[hash]) || 0, r = clone(rec);
  r.lastLesson = { hash, at: now }; r.lessonRuns = { day: today, h: { ...runs, [hash]: n + 1 } };
  return { id: n >= LESSON_PAYS_PER_DAY ? null : `lesson|${hash}|${today}|${n}`, rec: r };
}
/** Which parts of the system open when the finished-lesson count goes from `before` to `after`: 'quests' (2), 'hearts' (3), 'league' (5). */
export function unlockedBy(rec, before, after) {
  const crossed = (n) => before < n && after >= n, out = [];
  if (crossed(QUESTS.unlockLessons)) out.push('quests');
  if (crossed(HEARTS.unlockLessons) && rec.hearts.enabled !== false) out.push('hearts');
  if (crossed(LEAGUE.unlockLessons) && rec.league.enabled !== false) out.push('league');
  return out;
}
