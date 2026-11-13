// H6 weekly report, H7 learner-set weekly goals, J3 shareable progress card, and T10 year in review. Pure: callers pass the
// stored records and `now`. The week is the last 7 days ending today, the same window as the Progress "This week" card
// (src/progress/weekly.js), whose numbers (and their "at least" wording) are reused as they are. The year is the civil
// year of `now`, from 1 January through today, and only reports what the stores can say.
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

// ---------- Year in review (T10): the civil year of `now`, one shareable artifact beside My Week ----------
const asDay = (t) => {
  if (typeof t === 'string' && /^\d{4}-\d\d-\d\d/.test(t)) return t.slice(0, 10);
  const n = typeof t === 'string' ? Date.parse(t) : Number(t);
  return Number.isFinite(n) && n > 0 ? dayKey(n) : null;
};
/** Civil year window ending today: { year, from, to }. */
export function yearWindow(now = Date.now()) {
  const to = dayKey(now), year = +to.slice(0, 4);
  return { year, from: `${year}-01-01`, to };
}
export const inYear = (t, win) => { const d = asDay(t); return !!d && d >= win.from && d <= win.to; };

function gameTitle(id) {
  return String(id || '').split(/[-_]/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || '';
}

/**
 * What the year card can say from the stores. Words use firstReview when it is kept, otherwise a one-review floor
 * (the line then says "at least"). The most-played game and the best streak are lifetime totals on this device,
 * labelled as such, because those records are not kept by year. Hardest lesson is omitted: the stores do not keep it.
 */
export function yearSummary({ completed, books, retention, vocab, cards, arcade, streak } = {}, now = Date.now()) {
  const win = yearWindow(now);
  const done = Object.entries(obj(completed)).filter(([, t]) => inYear(t, win)).map(([, t]) => asDay(t)).filter(Boolean).sort();
  const xpDays = obj(obj(obj(retention).xp).days);
  let xp = 0;
  for (const [d, n] of Object.entries(xpDays)) if (d >= win.from && d <= win.to) xp += Number(n) > 0 ? Number(n) : 0;
  const bookDates = Object.values(obj(books)).filter((v) => v && v.finishedAt && inYear(v.finishedAt, win)).map((v) => asDay(v.finishedAt)).filter(Boolean).sort();
  const entries = [...Object.values(obj(vocab)), ...Object.entries(obj(cards)).filter(([id]) => /^word:/.test(id)).map(([, c]) => c)];
  let words = 0, wordsAtLeast = false;
  for (const c of entries) {
    if (!c) continue;
    if (c.firstReview != null) { if (inYear(c.firstReview, win)) words++; }
    else if (c.reps === 1 && inYear(c.lastReview, win)) { words++; wordsAtLeast = true; }
  }
  let favoriteGame = null, bestRounds = 0;
  const per = obj(obj(arcade).perGame);
  for (const [id, g] of Object.entries(per)) {
    const n = Number(obj(g).rounds) || 0;
    if (n > bestRounds) { bestRounds = n; favoriteGame = { id, title: gameTitle(id), rounds: n }; }
  }
  const streakBest = Math.max(0, Number(obj(streak).best) || 0);
  return {
    ...win, lessons: done.length, xp, books: bookDates.length, words, wordsAtLeast,
    firstLesson: done[0] || null, firstBook: bookDates[0] || null,
    favoriteGame, streakBest,
    empty: done.length === 0 && xp === 0 && bookDates.length === 0 && words === 0,
  };
}

/** Lines of the shareable year card, all from the stores. */
export function yearCardLines(y) {
  const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
  const lines = [
    `${y.year} in Aleph`,
    `${n(y.lessons, 'lesson finished', 'lessons finished')}`,
    `${fmt(y.xp)} XP`,
    `${n(y.books, 'little book finished', 'little books finished')}`,
    `${y.wordsAtLeast ? 'At least ' : ''}${n(y.words, 'new word', 'new words')}`,
  ];
  if (y.streakBest) lines.push(`Best streak on this device: ${n(y.streakBest, 'day', 'days')}`);
  if (y.firstLesson) lines.push(`First lesson this year: ${y.firstLesson}`);
  if (y.firstBook) lines.push(`First little book this year: ${y.firstBook}`);
  if (y.favoriteGame) lines.push(`Most-played game on this device: ${y.favoriteGame.title}`);
  return lines;
}
