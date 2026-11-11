// Progress page numbers: letters known, words known, minutes, review accuracy, and the calendar heatmap. Pure.
// "Known" is a modest rule on purpose: a card answered correctly at least twice and not currently being relearned.
// It is not a claim that the learner can read or say the item in the wild.
import { addDaysISO } from '../../src/curriculum/streak.js';
import { weekday, parseISO } from '../../src/curriculum/calendar.js';
import { dayPoints } from './points.js';
import { activityLevel } from '../../src/lib/counts.js';

export const KNOWN_REPS = 2;
const known = (c) => !!c && c.state === 'review' && (c.reps || 0) >= KNOWN_REPS;
const isLetter = (id) => /^letter:/.test(id);
const isWord = (id) => /^(word:|vocab:)/.test(id);

/** @param {any} snap readSnapshot() result @param {Record<string,any>} days record days */
export function stats(snap, days) {
  const cards = [...Object.entries((snap && snap.cards) || {}), ...Object.entries((snap && snap.vocab) || {})].filter(([, c]) => c && typeof c === 'object');
  const letters = cards.filter(([id, c]) => isLetter(id) && known(c)).length;
  const lettersSeen = cards.filter(([id, c]) => isLetter(id) && (c.reps || 0) > 0).length;
  const words = cards.filter(([id, c]) => (isWord(id) || c.kind === 'word') && known(c)).length;
  const wordsSeen = cards.filter(([id, c]) => (isWord(id) || c.kind === 'word') && (c.reps || 0) > 0).length;
  const reps = cards.reduce((a, [, c]) => a + (c.reps || 0), 0), lapses = cards.reduce((a, [, c]) => a + (c.lapses || 0), 0);
  // The scheduler does not count a first-ever miss on a new card as a lapse, so this is an upper bound.
  const accuracyMax = reps > 0 ? Math.round(((reps - Math.min(lapses, reps)) / reps) * 100) : null;
  const minutes = Object.values(days || {}).reduce((a, d) => a + (d.m || 0), 0);
  return { letters, lettersSeen, words, wordsSeen, reviews: reps, lapses, accuracyMax, minutes };
}

export function statSentences(s) {
  return {
    letters: `${s.letters} letters answered right at least twice (${s.lettersSeen} tried)`,
    words: `${s.words} words answered right at least twice (${s.wordsSeen} tried)`,
    minutes: `At least ${s.minutes} ${s.minutes === 1 ? 'minute' : 'minutes'} of practice time on days this page has seen`,
    accuracy: s.accuracyMax == null ? 'No review answers yet' : `Review accuracy: up to ${s.accuracyMax}% (${s.reviews} answers recorded; a first wrong answer on a brand-new card is not counted, so the true figure can be lower)`,
  };
}

/** Level 0..3 for a day: 0 none, 1 some, 2 a practice day, 3 goal reached. The level is also written as a number in the cell. */
export const level = (points, goal) => activityLevel(points, goal);

/** Calendar grid of `weeks` columns ending at the week of `today`; each column Sunday..Saturday. Days after today are null. */
export function heatmap(days, today, goal, weeks = 26) {
  const dow = weekday(parseISO(today)); // 0 = Sunday
  const start = addDaysISO(today, -dow - 7 * (weeks - 1));
  const cols = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let i = 0; i < 7; i++) {
      const iso = addDaysISO(start, w * 7 + i);
      if (iso > today) { col.push(null); continue; }
      const points = dayPoints(days[iso]);
      col.push({ iso, points, level: level(points, goal) });
    }
    cols.push(col);
  }
  return cols;
}
export function heatmapSummary(cols) {
  const cells = cols.flat().filter(Boolean);
  const active = cells.filter((c) => c.level >= 2).length, goalDays = cells.filter((c) => c.level === 3).length;
  return `Last ${cols.length} weeks: ${active} practice days, ${goalDays} of them reaching the daily goal. Darker squares are days with more activity points; each square also shows its level as a number.`;
}
/** Rows for the text alternative: one per week, newest first, dates and points. */
export function heatmapRows(cols, limit = 12) {
  return cols.slice(-limit).reverse().map((col) => {
    const cells = col.filter(Boolean);
    return { from: cells[0].iso, points: cells.reduce((a, c) => a + c.points, 0), days: cells.filter((c) => c.level >= 2).length, detail: cells.map((c) => `${c.iso.slice(5)}: ${c.points}`).join(', ') };
  });
}
