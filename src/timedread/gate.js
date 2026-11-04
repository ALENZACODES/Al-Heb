// @ts-check
// Integration for src/progress: evaluate a belt/milestone gate of kind "timedRead" from stored reads.
// Same return shape as src/progress/model.js evaluate(): {done, have, need, measurable, note?}.
// Gate: {kind:'timedRead', minWpm, minWords?, minReads?, minAccuracy?, label}
//   Passes when ONE text (reads are never mixed across texts) has `minReads` reads of at least `minWords` words whose
//   median correct-words-per-minute >= minWpm and median accuracy >= minAccuracy. Uses the last `window` reads of that text.
// All targets are ALEF proposals (data/curriculum/belts.json: "proposed by ALEF, not sourced"). Reads are self-reported.
import { cleanState, cleanWpm, accuracy, median } from './model.js';

export const GATE_DEFAULTS = Object.freeze({ minWords: 4, minReads: 3, minAccuracy: 0.9, window: 5 });

/** @param {any} g gate @param {any} state raw value of store key 'timedread.v1' (or already-cleaned) */
export function timedReadGate(g, state) {
  const o = { ...GATE_DEFAULTS, ...g };
  const need = o.minReads;
  const by = new Map();
  for (const r of cleanState(state).reads) if (r.words >= o.minWords) (by.get(r.textId) || by.set(r.textId, []).get(r.textId)).push(r);
  let bestHave = 0, bestNote = `needs ${need} timed reads of one text with ${o.minWords}+ words`;
  for (const [id, rs] of by) {
    const last = rs.slice(-o.window);
    const mw = /** @type {number} */ (median(last.map(cleanWpm))), ma = /** @type {number} */ (median(last.map(accuracy)));
    const have = Math.min(last.length, need);
    if (last.length >= need && mw >= o.minWpm && ma >= o.minAccuracy) return { done: true, have: need, need, measurable: true, note: `self-reported: ${id}, median ${Math.round(mw)} wpm` };
    if (have > bestHave || (have === bestHave && last.length >= need)) {
      bestHave = have;
      bestNote = last.length >= need ? `self-reported median ${Math.round(mw)} wpm and ${Math.round(ma * 100)}% clean on ${id}; target ${o.minWpm} wpm and ${Math.round(o.minAccuracy * 100)}%` : `${last.length} of ${need} reads of ${id}`;
    }
  }
  return { done: false, have: bestHave, need, measurable: true, note: bestNote };
}
