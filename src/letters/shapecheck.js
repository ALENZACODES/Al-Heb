// @ts-check
// Aleph lane 2: whole-letter sanity check, "$1 / $N"-style template matching.
// Compares ALL the strokes a learner drew against a letter's own strokes, ignoring the ORDER they were drawn in
// (every permutation of the user's strokes is tried; <= 5 strokes) and ignoring size and position (translate + uniform scale).
// Stroke DIRECTION is not ignored by default (a stroke drawn backwards scores lower) - pass {ignoreDirection:true} to allow both.
// Intended only as a fallback hint ("your overall shape looks right, the order/direction differs"), never as a grade.
// Not calibrated on real children's handwriting: thresholds below are conservative guesses checked only on synthetic noise (see tests).
import { resample, pathLength, dist } from './trace.js';

const N = 48;

/** @typedef {[number, number]} Pt */

function concat(strokes, n = N) {
  // resample each stroke proportionally to its length, then join; the pen-lift jumps between strokes are included in both user and
  // template the same way, so they cancel to first order.
  const total = strokes.reduce((a, s) => a + pathLength(s), 0) || 1;
  /** @type {Pt[]} */ const out = [];
  for (const s of strokes) {
    const k = Math.max(2, Math.round((pathLength(s) / total) * n));
    out.push(...resample(s, k));
  }
  return resample(out, n);
}

function normalise(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const s = Math.max(x1 - x0, y1 - y0) || 1;
  return pts.map(([x, y]) => /** @type {Pt} */ ([(x - (x0 + x1) / 2) / s, (y - (y0 + y1) / 2) / s]));
}

function meanDist(a, b) { let d = 0; for (let i = 0; i < a.length; i++) d += dist(a[i], b[i]); return d / a.length; }

function* permutations(arr) {
  if (arr.length <= 1) { yield arr.slice(); return; }
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permutations(rest)) yield [arr[i], ...p];
  }
}

/**
 * Similarity in 0..1 (1 = identical shape) between the user's strokes and a template's strokes, order-independent over user strokes.
 * @param {Pt[][]} userStrokes
 * @param {Pt[][]} templateStrokes in the correct order
 * @param {{ignoreDirection?: boolean}} [opts]
 */
export function shapeScore(userStrokes, templateStrokes, opts = {}) {
  const us = userStrokes.filter(s => s && s.length >= 2 && pathLength(s) > 1e-6).slice(0, 5);
  if (!us.length || !templateStrokes.length) return 0;
  const tpl = normalise(concat(templateStrokes));
  let best = Infinity;
  for (const perm of permutations(us)) {
    const variants = opts.ignoreDirection ? [...flips(perm)] : [perm];
    for (const v of variants) best = Math.min(best, meanDist(normalise(concat(v)), tpl));
  }
  // mean distance in unit-box terms; 0.5*sqrt(2) is the $1 normaliser. 0.1 ~ clearly the same shape.
  return Math.max(0, 1 - best / (0.5 * Math.SQRT2));
}

function* flips(strokes) {
  const n = strokes.length;
  for (let m = 0; m < (1 << n); m++) yield strokes.map((s, i) => (m >> i) & 1 ? s.slice().reverse() : s);
}

/**
 * Rank all letters for the user's drawing.
 * @param {Pt[][]} userStrokes
 * @param {any[]} letters records from letters.json
 * @param {'print'|'cursive'} script
 * @param {{targetId?: string, ignoreDirection?: boolean, minScore?: number}} [opts]
 * @returns {{ranking: {id:string, score:number}[], best: string|null, targetScore: number, targetRank: number, looksLikeTarget: boolean}}
 */
export function matchLetter(userStrokes, letters, script, opts = {}) {
  const ranking = letters.filter(l => l[script] && l[script].strokes && l[script].strokes.length)
    .map(l => ({ id: l.id, score: shapeScore(userStrokes, l[script].strokes.map(s => s.median), opts) }))
    .sort((a, b) => b.score - a.score);
  const ti = opts.targetId ? ranking.findIndex(r => r.id === opts.targetId) : -1;
  const targetScore = ti >= 0 ? ranking[ti].score : 0;
  const minScore = opts.minScore ?? 0.7;
  return { ranking, best: ranking.length ? ranking[0].id : null, targetScore, targetRank: ti + 1, looksLikeTarget: ti >= 0 && ti < 3 && targetScore >= minScore };
}
