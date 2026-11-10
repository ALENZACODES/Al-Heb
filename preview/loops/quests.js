// Three small daily quests, chosen from a pool by the date. Pure: no DOM, no clock, no storage.
// A quest is complete when the day's real actions say so. Nothing is stored for quests, nothing is paid out, nothing expires
// at a deadline the learner can feel: tomorrow simply has three different small things. The learner can hide quests entirely.
import { cleanDay } from './store.js';
import { dayPoints } from './points.js';

const TIERS = [
  [ // warm-up
    { id: 'review5', text: 'Review 5 cards', need: 5, have: (d) => d.r },
    { id: 'lesson1', text: 'Finish 1 lesson', need: 1, have: (d) => d.lessons.length },
    { id: 'points10', text: 'Earn 10 points', need: 10, have: (d, p) => p },
  ],
  [ // steady
    { id: 'review12', text: 'Review 12 cards', need: 12, have: (d) => d.r },
    { id: 'voice1', text: 'Read aloud or say something once', need: 1, have: (d) => d.t + d.s },
    { id: 'points20', text: 'Earn 20 points', need: 20, have: (d, p) => p },
  ],
  [ // mix
    { id: 'mix2', text: 'Try 2 different kinds of practice', need: 2, have: (d) => (d.lessons.length > 0) + (d.r > 0) + (d.t > 0) + (d.s > 0) },
    { id: 'lesson1b', text: 'Finish a lesson, then review what it taught', need: 2, have: (d) => (d.lessons.length > 0) + (d.r >= 3) },
    { id: 'voice2', text: 'Read aloud or speak twice', need: 2, have: (d) => d.t + d.s },
  ],
];

/** Small deterministic hash of a string, 0 <= n < 2^32. */
export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/** The three quests for a day with progress. @param {string} iso local day key @param {any} day the record's counts for that day */
export function questsFor(iso, day) {
  const d = cleanDay(day), p = dayPoints(d);
  return TIERS.map((tier, i) => {
    const q = tier[hash(`${iso}|${i}`) % tier.length];
    const have = Math.min(q.have(d, p), q.need);
    return { id: q.id, text: q.text, need: q.need, have, done: have >= q.need };
  });
}
export const questSummary = (qs) => { const n = qs.filter((q) => q.done).length; return n === qs.length ? 'All three small quests are done today.' : `${n} of ${qs.length} small quests done today. They are optional.`; };
export const ALL_QUEST_IDS = Object.freeze(TIERS.flat().map((q) => q.id));
