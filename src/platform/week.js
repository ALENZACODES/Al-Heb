// H6 weekly report, H7 learner-set weekly goals, J3 shareable progress card. Pure: callers pass the stored records and `now`.
// The week is the last 7 days ending today, the same window as the Progress "This week" card (src/progress/weekly.js), whose
// numbers (and their "at least" wording) are reused as they are.
import { dayKey } from '../progress/model.js';
import { booksFinished, lessonsFinished, fmt } from '../lib/counts.js';

export const GOALS_KEY = 'goals.week.v1';
export const GOAL_CHOICES = Object.freeze({ xp: [50, 100, 150, 250, 400], minutes: [15, 30, 60, 90, 150], lessons: [1, 2, 3, 5, 7] });
export const GOAL_LABEL = Object.freeze({ xp: 'XP', minutes: 'minutes', lessons: 'lessons' });

const DAY = 86400000;
const lastDays = (now) => Array.from({ length: 7 }, (_, i) => dayKey(now - i * DAY));
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/** XP earned in the 7 days ending today, from the retention record (retention.v1 xp.days {day: xp}). */
export function xpThisWeek(ret, now) { const days = obj(obj(obj(ret).xp).days); return lastDays(now).reduce((a, d) => a + (Number(days[d]) > 0 ? Number(days[d]) : 0), 0); }
/** Books whose last page and story question were done in the 7 days ending today (books.v1 {id: {finishedAt}}). */
export function booksThisWeek(rec, now) { const days = new Set(lastDays(now)); return Object.values(obj(rec)).filter((v) => v && v.finishedAt && days.has(dayKey(Date.parse(v.finishedAt) || Number(v.finishedAt)))).length; }

/** Only the learner's own choices from GOAL_CHOICES are kept; anything else is no goal. */
export function cleanGoals(g) { const o = obj(g), out = {}; for (const k of Object.keys(GOAL_CHOICES)) out[k] = GOAL_CHOICES[k].includes(o[k]) ? o[k] : null; return out; }

/** Progress against each set goal: {key, goal, have, done, atLeast}. Minutes are a lower bound (see weekly.js). */
export function goalProgress(goals, week) {
  const have = { xp: week.xp, minutes: week.minutesAtLeast, lessons: week.lessons };
  return Object.entries(cleanGoals(goals)).filter(([, v]) => v).map(([key, goal]) => ({ key, goal, have: have[key], done: have[key] >= goal, atLeast: key === 'minutes' }));
}

/** The lines of the shareable card, all from the stores. */
export function cardLines(w, totals) {
  return [
    `Week ending ${w.to}`,
    `Streak: ${w.streak.count} day${w.streak.count === 1 ? '' : 's'}`,
    `This week: ${w.lessons} lesson${w.lessons === 1 ? '' : 's'}, ${fmt(w.xp)} XP, ${w.cardsReviewed} card${w.cardsReviewed === 1 ? '' : 's'} reviewed`,
    `Lessons finished in all: ${totals.lessons}`,
    `Little books finished: ${totals.books}`,
  ];
}
export const totalsOf = (completed, books) => ({ lessons: lessonsFinished(completed), books: booksFinished(books) });

/** Draw the card on a 2D context (real canvas or a recording fake). 1080 x 1080, text only, high contrast. */
export function drawCard(g, lines, { title = 'Aleph: My Week', w = 1080, h = 1080 } = {}) {
  g.fillStyle = '#14213d'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fca311'; g.fillRect(60, 60, w - 120, 12);
  g.fillStyle = '#ffffff'; g.font = 'bold 72px system-ui, sans-serif'; g.textBaseline = 'top';
  g.fillText(title, 60, 120);
  g.font = '44px system-ui, sans-serif';
  lines.forEach((t, i) => g.fillText(t, 60, 280 + i * 110));
  g.fillStyle = '#e5e5e5'; g.font = '30px system-ui, sans-serif';
  g.fillText('Made on this device by Aleph. Numbers from my own progress.', 60, h - 110);
}
