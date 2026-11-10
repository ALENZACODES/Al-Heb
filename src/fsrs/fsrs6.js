// FSRS-6 memory model, written for Aleph from the published algorithm (open-spaced-repetition wiki "The Algorithm", FSRS-6).
// It is a PURE module: no store, no clock. It is NOT wired into the live review scheduler (src/curriculum/srs.js is unchanged); the
// preview route #/scheduler only shows what these formulas would do. The 21 numbers below are the PUBLISHED DEFAULT weights of the
// MIT-licensed ts-fsrs 6.0.0 (copyright its authors; notice in docs/research/B2-fsrs6.md); they are NOT fitted to Aleph review data.
// Correctness is checked in tests/fsrs6.test.js against tests/fixtures/fsrs6-reference.json, produced once by running ts-fsrs 6.0.0
// outside this repo (fuzz off, short-term stage off, no learning steps, whole-day gaps). Short-term (same-day) memory is not modelled.

export const WEIGHTS = Object.freeze([0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542]);
export const S_MIN = 0.001, S_MAX = 36500, D_MIN = 1, D_MAX = 10;
export const RATINGS = Object.freeze({ again: 1, hard: 2, good: 3, easy: 4 });

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const round8 = (x) => Math.round(x * 1e8) / 1e8;

function curve(w) { const decay = -w[20]; return { decay, factor: round8(Math.exp(Math.log(0.9) / decay) - 1) }; }

/** Chance of recalling after `days` at stability `s` (days). Equals 0.9 when days === s. */
export function retrievability(days, s, w = WEIGHTS) {
  const { decay, factor } = curve(w);
  return round8(Math.pow(1 + (factor * Math.max(0, days)) / s, decay));
}
/** Whole days until recall falls to `target` (default 0.9); at least 1. */
export function interval(s, target = 0.9, w = WEIGHTS) {
  if (!(target > 0 && target <= 1)) throw new RangeError('target retention must be in (0, 1]');
  const { decay, factor } = curve(w);
  return Math.max(Math.round((s / factor) * (Math.pow(target, 1 / decay) - 1)), 1);
}
const d0 = (g, w) => round8(w[4] - Math.exp((g - 1) * w[5]) + 1);
const checkGrade = (g) => { if (![1, 2, 3, 4].includes(g)) throw new RangeError('rating must be 1, 2, 3 or 4'); };

/** Memory state after the first review of a new card. */
export function first(g, w = WEIGHTS) { checkGrade(g); return { stability: clamp(w[g - 1], S_MIN, S_MAX), difficulty: clamp(d0(g, w), D_MIN, D_MAX) }; }

/** Memory state after a later review. `state` = {stability, difficulty}; `days` = whole days since the previous review. */
export function next(state, days, g, w = WEIGHTS) {
  checkGrade(g);
  if (!(days >= 0)) throw new RangeError('days must be 0 or more');
  const { stability: s, difficulty: d } = state;
  if (!(d >= D_MIN && s >= S_MIN)) throw new RangeError('invalid memory state');
  const r = retrievability(days, s, w);
  const delta = -w[6] * (g - 3);
  const dRaw = d + round8((delta * (10 - d)) / 9);
  const difficulty = clamp(round8(w[7] * d0(4, w) + (1 - w[7]) * dRaw), D_MIN, D_MAX);
  let stability;
  if (g === 1) {
    const afterFail = clamp(round8(w[11] * Math.pow(d, -w[12]) * (Math.pow(s + 1, w[13]) - 1) * Math.exp((1 - r) * w[14])), S_MIN, S_MAX);
    stability = clamp(s, S_MIN, afterFail);
  } else {
    const hard = g === 2 ? w[15] : 1, easy = g === 4 ? w[16] : 1;
    stability = round8(clamp(s * (1 + Math.exp(w[8]) * (11 - d) * Math.pow(s, -w[9]) * (Math.exp((1 - r) * w[10]) - 1) * hard * easy), S_MIN, S_MAX));
  }
  return { stability, difficulty };
}

const chain = (c) => { const o = [c[0]]; for (let i = 1; i < c.length; i++) o.push(Math.max(c[i], o[i - 1] + 1)); return o.map((x) => Math.min(x, S_MAX)); };
/** Days until the next review for each rating, before answering. `state` null = new card. Mirrors the reference scheduler: for any card
 *  Again < Hard < Good < Easy by at least one day each (checked against the reference on 210 steps). */
export function intervalsFor(state, days, target = 0.9, w = WEIGHTS) {
  const raw = (st) => interval(st.stability, target, w);
  if (!state) { const c = chain([1, 2, 3, 4].map((g) => raw(first(g, w)))); return { 1: c[0], 2: c[1], 3: c[2], 4: c[3] }; }
  const c = chain([1, 2, 3, 4].map((g) => raw(next(state, days, g, w))));
  return { 1: c[0], 2: c[1], 3: c[2], 4: c[3] };
}

/** Run a history [{gapDays, rating}] from a new card; returns one row per review with the state and the next interval. */
export function replay(history, target = 0.9, w = WEIGHTS) {
  let st = null; const rows = [];
  for (const h of history) {
    const rBefore = st ? retrievability(h.gapDays, st.stability, w) : null;
    const days = intervalsFor(st, h.gapDays, target, w)[h.rating];
    st = st ? next(st, h.gapDays, h.rating, w) : first(h.rating, w);
    rows.push({ ...h, retrievabilityBefore: rBefore, stability: st.stability, difficulty: st.difficulty, scheduledDays: days });
  }
  return rows;
}
/** What-if: the learner answers every card `ratings[i]` exactly on its due day. Returns the same rows as replay. */
export function onDueDays(ratings, target = 0.9, w = WEIGHTS) {
  const hist = []; let st = null, gap = 0;
  for (const g of ratings) {
    const days = intervalsFor(st, gap, target, w)[g];
    st = st ? next(st, gap, g, w) : first(g, w);
    hist.push({ gapDays: gap, rating: g });
    gap = days;
  }
  return replay(hist, target, w);
}
