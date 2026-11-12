// H2 Fitted weights on the device. Fits the live scheduler's own parameters (src/curriculum/srs.js: the four first-answer
// stabilities INIT_S, which play the role of FSRS w0..w3, and one growth factor on the stability increase after a recall) to this
// learner's review log, by minimising log loss: for every logged review made a day or more after the one before, the scheduler's
// predicted chance of recall is compared with what happened (Hard, Good or Easy = recalled; Again = forgot).
// Search: coordinate descent over a log-spaced grid, two passes, then the four stabilities are made non-decreasing (Again <= Hard
// <= Good <= Easy). Nothing leaves the device. Method and limits: docs/srs/FITTED-WEIGHTS.md.
import { review, newCard, retrievability, INIT_S, MS_DAY } from '../curriculum/srs.js';
import { cardsOf, decodeLog, DECKS } from './sched-state.js';

export const MIN_REVIEWS = 300, MIN_CARDS = 30, MIN_GROUP = 20;
export const DEFAULTS = Object.freeze({ init: INIT_S, grow: 1 });
const EPS = 1e-4;

/** Review histories (one per card with at least two logged reviews) from the decks. */
export function histories(decks) {
  const out = [];
  for (const [key] of DECKS) for (const c of cardsOf(decks?.[key])) { const h = decodeLog(c); if (h.length >= 2) out.push(h); }
  return out;
}

/** Log loss of `params` over the histories: {sum, n, groupN} (groupN[g-1] = samples whose card was first answered g). */
export function evaluate(hists, params) {
  let sum = 0, n = 0; const groupN = [0, 0, 0, 0];
  for (const h of hists) {
    let card = newCard({ now: h[0].day * MS_DAY });
    for (let i = 0; i < h.length; i++) {
      const t = h[i].day * MS_DAY;
      if (i > 0 && h[i].day - h[i - 1].day >= 1 && card.stability > 0) {
        const p = Math.min(1 - EPS, Math.max(EPS, retrievability((t - card.lastReview) / MS_DAY, card.stability)));
        sum -= h[i].rating > 1 ? Math.log(p) : Math.log(1 - p); n++; groupN[h[0].rating - 1]++;
      }
      card = review(card, h[i].rating, t, params);
    }
  }
  return { sum, n, groupN };
}

const grid = (lo, hi, k) => Array.from({ length: k }, (_, i) => lo * Math.pow(hi / lo, i / (k - 1)));
function best(values, lossOf) { let b = values[0], bl = Infinity; for (const v of values) { const l = lossOf(v); if (l < bl) { bl = l; b = v; } } return b; }
const round3 = (x) => Math.round(x * 1000) / 1000;

/**
 * Fit on the histories. Returns {enough:false, n, cards} when there is too little history (then the defaults stay), otherwise
 * {enough:true, n, cards, groupN, params, lossDefault, lossFitted, better} with per-review average log loss on the same reviews.
 */
export function fit(hists) {
  const base = evaluate(hists, DEFAULTS);
  const res = { enough: false, n: base.n, cards: hists.length, groupN: base.groupN, need: { reviews: MIN_REVIEWS, cards: MIN_CARDS } };
  if (base.n < MIN_REVIEWS || hists.length < MIN_CARDS) return res;
  const p = { init: [...INIT_S], grow: 1 };
  const byFirst = [1, 2, 3, 4].map((g) => hists.filter((h) => h[0].rating === g));
  for (let pass = 0; pass < 2; pass++) {
    for (let g = 0; g < 4; g++) {
      if (base.groupN[g] < MIN_GROUP) continue; // too few cards first answered this way: keep the default
      const lossOf = (v) => { const init = [...p.init]; init[g] = v; return evaluate(byFirst[g], { init, grow: p.grow }).sum; };
      const coarse = best(grid(0.05, 60, 28), lossOf);
      p.init[g] = best(grid(coarse / 1.3, coarse * 1.3, 9), lossOf);
    }
    const coarse = best(grid(0.25, 4, 24), (v) => evaluate(hists, { init: p.init, grow: v }).sum);
    p.grow = best(grid(coarse / 1.15, coarse * 1.15, 7), (v) => evaluate(hists, { init: p.init, grow: v }).sum);
  }
  for (let g = 1; g < 4; g++) p.init[g] = Math.max(p.init[g], p.init[g - 1]);
  p.init = p.init.map(round3); p.grow = round3(p.grow);
  const after = evaluate(hists, p);
  return { ...res, enough: true, params: p, lossDefault: base.sum / base.n, lossFitted: after.sum / after.n, better: after.sum < base.sum - 1e-9 };
}

/** The record saved under store key srs.fit (read by srs.js activeParams when active). */
export const fitRecord = (r, now, active) => ({ v: 1, active: !!(active && r.enough && r.better), init: r.params?.init || [...INIT_S], grow: r.params?.grow || 1,
  n: r.n, cards: r.cards, lossDefault: r.lossDefault ?? null, lossFitted: r.lossFitted ?? null, fittedAt: now });
