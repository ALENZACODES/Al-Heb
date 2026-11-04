/**
 * "Spot It" letter-scan drill (pure). Build lines of pointed words, plant look-alike decoys (data/letters/confusables.json),
 * and score the learner's taps. Deterministic for a given seed.
 */
import { cellsOf } from "./hebrew.js";

export function rng(seed) { // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function shuffled(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
/** Letters that look like `targetId` according to the confusables sets, plus the hint text of the sets. */
export function decoysFor(targetId, confusables) {
  const sets = (confusables?.sets || []).filter((s) => s.letters.includes(targetId));
  return { letters: [...new Set(sets.flatMap((s) => s.letters.filter((x) => x !== targetId)))], sets };
}

/**
 * @param {{targetId:string, words:string[], taught:Iterable<string>, confusables:object, seed?:number, lineCount?:number, wordsPerLine?:number}} o
 * @returns {null | {targetId:string, lines:{cells:number[], words:number[][]}[], cells:{text:string, base:string, kind:"hit"|"decoy"|"other"}[], hitIndices:number[], decoyIndices:number[]}}
 *   null when no taught word contains the target.
 */
export function buildSpotIt({ targetId, words, taught, confusables, seed = 1, lineCount = 4, wordsPerLine = 3 }) {
  const rand = rng(seed), ok = new Set(taught);
  const { letters: decoyLetters } = decoysFor(targetId, confusables);
  const usable = [...new Set(words)].filter((w) => { const cs = cellsOf(w); return cs.length && cs.every((c) => ok.has(c.base)); });
  const withHit = usable.filter((w) => cellsOf(w).some((c) => c.base === targetId));
  if (!withHit.length) return null;
  const withDecoy = usable.filter((w) => cellsOf(w).some((c) => decoyLetters.includes(c.base)) && !cellsOf(w).some((c) => c.base === targetId));
  const other = usable.filter((w) => !withHit.includes(w) && !withDecoy.includes(w));
  const cells = [], lines = [];
  for (let li = 0; li < lineCount; li++) {
    // each line: at least one hit word, a decoy word when any exist, then filler
    const picks = [shuffled(withHit, rand)[0]];
    if (withDecoy.length) picks.push(shuffled(withDecoy, rand)[0]);
    const pool = shuffled([...withHit, ...withDecoy, ...other], rand);
    for (const w of pool) { if (picks.length >= wordsPerLine) break; picks.push(w); }
    const line = { cells: [], words: [] };
    for (const w of shuffled(picks, rand)) {
      const idxs = [];
      for (const c of cellsOf(w)) {
        const kind = c.base === targetId ? "hit" : decoyLetters.includes(c.base) ? "decoy" : "other";
        cells.push({ text: c.text, base: c.base, kind });
        idxs.push(cells.length - 1); line.cells.push(cells.length - 1);
      }
      line.words.push(idxs);
    }
    lines.push(line);
  }
  return { targetId, lines, cells,
    hitIndices: cells.flatMap((c, i) => (c.kind === "hit" ? [i] : [])),
    decoyIndices: cells.flatMap((c, i) => (c.kind === "decoy" ? [i] : [])) };
}

/**
 * Score taps. Tapping a decoy counts against the pair (target, decoy letter); tapping any other cell is a plain false positive.
 * @returns {{hits:number, total:number, missed:number[], decoyTaps:number[], otherTaps:number[], fooledBy:Record<string,number>, pairErrors:Record<string,number>, accuracy:number}}
 */
export function scoreSpotIt(model, tapped) {
  const t = new Set(tapped);
  const hits = model.hitIndices.filter((i) => t.has(i));
  const missed = model.hitIndices.filter((i) => !t.has(i));
  const decoyTaps = model.decoyIndices.filter((i) => t.has(i));
  const otherTaps = [...t].filter((i) => model.cells[i] && model.cells[i].kind === "other");
  const fooledBy = {}, pairErrors = {};
  for (const i of decoyTaps) {
    const b = model.cells[i].base; fooledBy[b] = (fooledBy[b] || 0) + 1;
    const key = [model.targetId, b].sort().join("|"); pairErrors[key] = (pairErrors[key] || 0) + 1;
  }
  const total = model.hitIndices.length, wrong = decoyTaps.length + otherTaps.length;
  return { hits: hits.length, total, missed, decoyTaps, otherTaps, fooledBy, pairErrors,
    accuracy: total ? Math.max(0, (hits.length - wrong) / total) : 0 };
}
