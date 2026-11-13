// @ts-check
// Whole lines for the vowel-mark fade page. Pure: no DOM, no fetch.
// Every line here already carries its vowel marks in the app's own lesson text. This file only takes marks away, word by word;
// it never adds one. Lines whose marks were added by the offline build (source "model") are left out.
import { stripPoints, hasPoints, isNewWord, rng, DEFAULT_SCHEDULE } from './model.js';

export const LINE_SOURCES = Object.freeze(['checked', 'book']);
export const LINE_UNIT = 'lessons';
const NAME = 'יהוה';
const words = (s) => String(s ?? '').trim().split(/\s+/).filter(Boolean);
const lettersOf = (s) => stripPoints(s).replace(/[^א-ת]/g, '');

/** Lines fit for practice: the app's own marks, 3 to 8 words, every word marked, never the Name. @param {any} doc */
export function usableLines(doc) {
  const out = [], seen = new Set();
  for (const l of (doc && doc.lines) || []) {
    if (!l || !LINE_SOURCES.includes(l.s) || l.t !== l.p || seen.has(l.p)) continue;
    const w = words(l.p);
    if (w.length < 3 || w.length > 8 || lettersOf(l.p).includes(NAME)) continue;
    if (!w.every((x) => !lettersOf(x) || hasPoints(x))) continue;
    seen.add(l.p); out.push({ he: l.p, source: l.s, words: w });
  }
  return out;
}

/** Reading-set words by their bare letters; a spelling shared by two entries counts as a look-alike. @param {any[]} items */
export function wordIndex(items) {
  const map = new Map();
  for (const it of items || []) {
    const k = lettersOf(it.he);
    if (!k) continue;
    map.set(k, map.has(k) ? { ...map.get(k), ambiguous: true } : { id: it.id, ambiguous: !!it.ambiguous });
  }
  return map;
}

/**
 * One line at the learner's stage. Stage 1 keeps every mark, stage 3 keeps none. Stage 2 keeps them on look-alike words and on
 * words the learner has not yet read a few times on this page (which includes every word outside the reading set).
 * @returns {{text:string, pointed:boolean, why:'full'|'new'|'ambiguous'|'faded'}[]}
 */
export function fadeLine(line, state, index, { revealed = false, sched = DEFAULT_SCHEDULE } = {}) {
  return line.words.map((w) => {
    let why = 'faded';
    if (state.stage === 1) why = 'full';
    else if (state.stage === 2) {
      const hit = index && index.get(lettersOf(w));
      if (hit && hit.ambiguous) why = 'ambiguous';
      else if (!hit || isNewWord(state, hit.id, sched)) why = 'new';
    }
    const pointed = revealed || why !== 'faded';
    return { text: pointed ? w : stripPoints(w), pointed, why: /** @type {any} */ (why) };
  });
}

/** A repeatable choice of lines. */
export function pickLines(lines, { seed = 1, count = 5 } = {}) {
  const r = rng(seed), pool = [...lines];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, count);
}
