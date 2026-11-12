// @ts-check
// Reading challenges (E9): the learner picks a goal ("read 5 books this month", "2 books this week") and the tracker counts the
// little books finished in that period: a book counts when it was read to its last page with its one story question answered
// (books.v1 finishedAt, written by src/books/book.view.js). Pure: no DOM, no clock (times are passed in).
import { booksFinishedOf } from '../lib/counts.js';

export const CHALLENGE_KEY = 'books.challenge.v1';
export const GOAL_SIZES = Object.freeze([1, 2, 3, 5, 10]);
export const PERIODS = Object.freeze({ month: 'this month', week: 'this week' });
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/** [from, to) in ms for the local calendar month or the Monday-to-Sunday week containing `now`. */
export function periodRange(period, now = Date.now()) {
  const d = new Date(now);
  if (period === 'week') {
    const back = (d.getDay() + 6) % 7; // Monday = 0
    const from = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back);
    return [from.getTime(), new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7).getTime()];
  }
  return [new Date(d.getFullYear(), d.getMonth(), 1).getTime(), new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()];
}

/** A new goal. */
export function setGoal(prev, n, period, now = Date.now()) {
  const size = GOAL_SIZES.includes(n) ? n : GOAL_SIZES[2];
  return { ...obj(prev), goal: { n: size, period: PERIODS[period] ? period : 'month', setAt: Number(now) || 0 } };
}

/**
 * Progress on the current goal. books: index.json books (ids); places: books.v1.
 * @returns {null|{n:number, period:string, done:number, met:boolean, left:number, from:number, to:number, finished:string[], text:string}}
 */
export function challengeProgress(rec, books, places, now = Date.now()) {
  const g = obj(obj(rec).goal);
  if (!GOAL_SIZES.includes(g.n) || !PERIODS[g.period]) return null;
  const [from, to] = periodRange(g.period, now);
  const ids = (books || []).map((b) => b.id);
  const done = booksFinishedOf(places, ids, from, to);
  const finished = ids.filter((id) => booksFinishedOf(places, [id], from, to));
  const met = done >= g.n;
  return { n: g.n, period: g.period, done, met, left: Math.max(0, g.n - done), from, to, finished,
    text: met ? `Challenge met: ${done} of ${g.n} books ${PERIODS[g.period]}.` : `${done} of ${g.n} books ${PERIODS[g.period]}.` };
}
