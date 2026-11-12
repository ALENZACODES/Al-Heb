// @ts-check
/**
 * The app's rules in words, built from the same constants the code enforces (I8 hearts, H8 streak, I6 minutes, I7 pass mark).
 * One source: #/app-rules shows all of it, and the Shop and the Daily page read their short lines from here, so a rule can never
 * say one thing on one screen and another elsewhere. Pure: no DOM, no store.
 */
import { HEARTS } from '../retention/hearts.js';
import { PRICES } from '../retention/gems.js';
import { STREAK } from '../retention/streak.js';
import { GOAL_SECONDS } from '../curriculum/streak.js';
import { IDLE_MS } from '../morning/engage.js';
import { PASS_SHARE, passMark, passPercent } from '../curriculum/passmark.js';

const ord = (n) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
const count = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const gems = (n) => (n === 0 ? 'free' : count(n, 'gem'));

/** Every lesson route that takes hearts (the same list src/retention/hearts.js isLessonHash enforces). */
export const HEART_LESSON_KINDS = ['reading-path and Israel-path lessons', 'lessons taken in short parts', 'Test out', 'the intermediate lessons (I-01 to I-50)'];
/** Places that never take a heart. */
export const HEART_FREE = ['review cards', 'mixed review', 'the daily set', 'checkpoint tests', 'reading, prayers and Torah', 'songs and games', 'the first day and the placement check'];

/** Hearts, in full (I8). */
export function heartRules(h = HEARTS, prices = PRICES) {
  const hours = Math.round(h.refillMs / 3600000);
  return [
    `You have up to ${count(h.max, 'heart')}.`,
    `Hearts start after your ${ord(h.unlockLessons)} finished lesson. You can switch them on sooner, or off, in the Shop. Calm mode switches them off.`,
    `A wrong first answer costs one heart. This is the same in every kind of lesson: ${HEART_LESSON_KINDS.join(', ')}.`,
    'A wrong answer on a retry costs nothing, and one question costs at most one heart per lesson.',
    'Hearts never stop a lesson that has started. At 0 hearts, a new lesson waits until a heart comes back.',
    `One heart comes back every ${count(hours, 'hour')}.`,
    `Every ${count(h.roundCards, 'review card')} you rate in Review wins one heart back, right or wrong.`,
    `You can refill all hearts in the Shop for ${gems(prices.hearts)}. Gems are earned by learning and cannot be bought.`,
    `Never cost a heart: ${HEART_FREE.join(', ')}.`,
  ];
}

/** Streak, in full (H8). The Shop and the Daily page show streakShort(). */
export function streakRules(s = STREAK, prices = PRICES, goalSeconds = GOAL_SECONDS) {
  const mins = Math.round(goalSeconds / 60), repair = prices.repairPerDay;
  return [
    `A day counts when you pass one lesson, or study for ${count(mins, 'minute')} of active time.`,
    s.shabbatCoversFriday ? 'Friday, Shabbat, Yom Tov and the day before Yom Tov never break a streak.' : 'Shabbat and Yom Tov never break a streak.',
    `A streak freeze costs ${gems(prices.freeze)}; you can hold ${count(s.freezeMax, 'freeze', 'freezes')}. Each freeze covers one missed day by itself. If you miss more days than you hold freezes, none is used.`,
    `Bring back: when a streak of ${s.repairMinStreak} days or more breaks after at most ${count(s.repairMaxDays, 'missed day')}, you can bring it back for ${repair === 0 ? 'free' : `${gems(repair)} per missed day`} within ${count(s.repairWindowHours, 'hour')}, in the Shop or on the Daily page. It is the same offer, at the same price, in both places.`,
    s.repairCountsToday ? 'Bringing a streak back also counts today.' : 'Bringing a streak back does not count today: one lesson today keeps it going.',
    `Travel: if your time zone changed, one missed day is covered when you study again within ${count(s.travelGraceHours, 'hour')} of your last session.`,
  ];
}
/** The two lines the Shop and the Daily page show beside their streak controls. */
export function streakShort(s = STREAK, prices = PRICES, goalSeconds = GOAL_SECONDS) {
  const r = streakRules(s, prices, goalSeconds);
  return [r[0] + ' ' + r[1], r[3]];
}
/** The line the Shop shows beside its hearts. */
export function heartsShort(h = HEARTS) {
  const r = heartRules(h);
  return `${r[0]} ${r[2]} ${r[5]}`;
}

/** Minutes (I6). */
export function minuteRules(idleMs = IDLE_MS) {
  const idle = Math.round(idleMs / 60000);
  return [
    `Minutes are measured: the clock runs only while a learning page is open on screen and you tapped, clicked or pressed a key in the last ${count(idle, 'minute')}.`,
    'Finishing a lesson counts the day for your streak, but it adds no minutes. A 15-second lesson adds 15 seconds.',
    'Minutes are rounded down to whole minutes. Everything is measured on this device only.',
  ];
}

/** Pass mark (I7): the rule and a worked table for check sizes 1 to 10. */
export function passRules() {
  return {
    lines: [
      `A lesson counts as done when its quick check is passed: ${Math.round(PASS_SHARE * 100)}% of the questions, rounded to the nearest whole question, right on the first try.`,
      'Retries teach, but only first tries count. Below the pass mark the lesson is not marked done, and your review cards are still updated.',
      'Each lesson shows its own pass mark and its real percentage, worked out from the number of questions:',
    ],
    table: Array.from({ length: 10 }, (_, i) => ({ n: i + 1, need: passMark(i + 1), pct: passPercent(i + 1) })),
  };
}

/** Every section of #/app-rules, in page order. Section ids are the anchors (#/app-rules?section=hearts). */
export function allRules() {
  return [
    { id: 'hearts', title: 'Hearts', lines: heartRules() },
    { id: 'streak', title: 'Streak', lines: streakRules() },
    { id: 'minutes', title: 'Minutes', lines: minuteRules() },
    { id: 'pass', title: 'Pass Mark', ...passRules() },
  ];
}
