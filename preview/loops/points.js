// Points from real actions, the daily goal ring and the weekly summary. Pure: no DOM, no clock, no storage.
// Points only go up. They never expire, are never taken away, cannot be bought and give no bonus for streak length.
import { addDaysISO } from '../../src/curriculum/streak.js';
import { cleanDay } from './store.js';

export const WEIGHTS = Object.freeze({ lesson: 10, review: 1, read: 5, speak: 1 });
/** Per-day caps on the repeatable kinds, so grinding one easy thing does not run away with the day. */
export const CAPS = Object.freeze({ review: 20, speak: 5 });
/** A day with at least this many points counts as a practice day for the rhythm. */
export const PRACTICE_POINTS = 5;

/** @param {any} day a record day (see store.js cleanDay) */
export function dayPoints(day) {
  const d = cleanDay(day);
  return d.lessons.length * WEIGHTS.lesson + Math.min(d.r, CAPS.review) * WEIGHTS.review + d.t * WEIGHTS.read + Math.min(d.s, CAPS.speak) * WEIGHTS.speak;
}
/** Points of one action kind, for the "+N points" line. */
export const lessonPoints = () => WEIGHTS.lesson;

/** Goal ring numbers. pct is 0..100 and the text is always shown beside the drawing. */
export function ring(points, goal) {
  const g = Math.max(1, goal | 0), p = Math.max(0, points | 0), pct = Math.min(100, Math.round((p / g) * 100));
  return { points: p, goal: g, pct, done: p >= g, text: `${p} of ${g} points today` };
}
export function goalSentence(points, goal) {
  const r = ring(points, goal);
  if (r.done) return r.points > r.goal ? `Today's goal is reached, with ${r.points - r.goal} to spare. Anything more is a bonus, never a requirement.` : "Today's goal is reached. That is a good place to stop.";
  if (r.points === 0) return `Today's goal is ${r.goal} points. One lesson is ${WEIGHTS.lesson}; ten review cards are ten. Any amount helps.`;
  return `${r.goal - r.points} points to today's goal. Any amount helps.`;
}

/** Inline SVG ring built only from numbers. Static: no animation. Used with the text twin from ring(). */
export function ringSVG(points, goal, size = 96) {
  const r = ring(points, goal), rad = 40, c = 2 * Math.PI * rad, dash = ((r.pct / 100) * c).toFixed(1);
  return `<svg xmlns="http://www.w3.org/2000/svg" class="lp-ring" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${r.text}" focusable="false">`
    + `<circle cx="50" cy="50" r="${rad}" fill="none" stroke="currentColor" stroke-opacity="0.2" stroke-width="10"/>`
    + `<circle cx="50" cy="50" r="${rad}" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-dasharray="${dash} ${c.toFixed(1)}" transform="rotate(-90 50 50)"/>`
    + `<text x="50" y="56" text-anchor="middle" font-size="20" fill="currentColor">${r.pct}%</text></svg>`;
}

/** Seven days ending `today`, and the seven before, from a record's days map. */
export function weekSummary(days, today, goal = 20) {
  const span = (end) => Array.from({ length: 7 }, (_, i) => addDaysISO(end, -6 + i));
  const sum = (isos) => {
    const rows = isos.map((iso) => ({ iso, points: dayPoints(days[iso]) }));
    const d = isos.map((iso) => cleanDay(days[iso]));
    return { rows, points: rows.reduce((a, x) => a + x.points, 0), practiced: rows.filter((x) => x.points >= PRACTICE_POINTS).length, goalDays: rows.filter((x) => x.points >= goal).length,
      lessons: d.reduce((a, x) => a + x.lessons.length, 0), reviews: d.reduce((a, x) => a + x.r, 0), reads: d.reduce((a, x) => a + x.t, 0), speaks: d.reduce((a, x) => a + x.s, 0) };
  };
  const now = sum(span(today)), before = sum(span(addDaysISO(today, -7)));
  return { now, before, sentences: weekSentences(now, before) };
}
const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
export function weekSentences(now, before) {
  if (now.points === 0) return ['A quiet week so far. Whenever you are ready, one short lesson is enough to start again.'];
  const out = [`You practiced on ${now.practiced} of the last 7 days and earned ${n(now.points, 'point', 'points')}.`];
  const bits = [];
  if (now.lessons) bits.push(n(now.lessons, 'lesson', 'lessons'));
  if (now.reviews) bits.push(n(now.reviews, 'review card', 'review cards'));
  if (now.reads) bits.push(n(now.reads, 'timed read', 'timed reads'));
  if (now.speaks) bits.push(n(now.speaks, 'speaking try', 'speaking tries'));
  if (bits.length) out.push(`That was ${bits.join(', ')}.`);
  if (before.points > 0) out.push(now.points >= before.points ? `That is at least as much as the week before (${before.points}).` : `The week before was ${before.points}. Rest weeks are part of learning.`);
  return out;
}
