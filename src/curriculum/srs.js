/**
 * Aleph spaced-repetition scheduler (Lane 1).
 *
 * WHAT THIS IS: an FSRS-STYLE scheduler written from scratch in plain JS.
 * WHAT THIS IS NOT: it is NOT the reference FSRS implementation (ts-fsrs / fsrs-rs)
 * and does NOT use the published FSRS default weights (w0..w18/w20). Cards scheduled
 * here will not match Anki/ts-fsrs output, and the parameters below have NOT been
 * fitted to any review data.
 *
 * VERIFIED against public documentation (secondary sources, see docs/curriculum/srs-notes.md):
 *   - forgetting curve of FSRS-4.5/FSRS-5:  R(t,S) = (1 + FACTOR * t / S) ^ DECAY,
 *     FACTOR = 19/81, DECAY = -1/2, so that R(S,S) = 0.9 (S = "stability", days for R to fall 100% -> 90%).
 *   - interval for target retention r:  t = (S / FACTOR) * (r^(1/DECAY) - 1)  (equals S when r = 0.9).
 *   - rating scale 1 Again, 2 Hard, 3 Good, 4 Easy; per-card difficulty D in [1,10].
 *
 * OUR OWN (unverified, hand-chosen) parts, shaped like FSRS but with different constants/forms:
 *   - initial stability per first rating: INIT_S = [0.4, 1.2, 3.0, 8.0] days
 *   - initial difficulty D0(g) = clamp(5.5 - 1.1*(g-3), 1, 10)
 *   - difficulty update: D' = clamp(0.9*(D - 0.8*(g-3)) + 0.1*4, 1, 10)  (linear change + mean reversion to 4)
 *   - stability after recall: S' = S * (1 + e^1.6 * (11-D) * S^-0.2 * (e^(0.9*(1-R)) - 1) * m),
 *     m = 0.6 for Hard, 1 for Good, 1.6 for Easy   -> S' >= S always, strictly greater on Good/Easy.
 *   - stability after lapse (Again): S' = min(S, max(0.1, 0.3 * S^0.7)), D' = min(10, D + 1)
 *   - no learning steps beyond: Again => due in 10 minutes; no fuzz; all intervals >= 1 day otherwise.
 *   - no same-day-review model.
 * Everything is deterministic: same card + rating + `now` always gives the same result.
 *
 * Card schema (JSON-serialisable, safe for IndexedDB/localStorage):
 *   { id, kind, state: "new"|"review"|"relearning", stability, difficulty, reps, lapses,
 *     lastReview: ms|null, due: ms }
 * `kind` is one of letter | vowel | syllable | word | prayerLine (free text; not validated).
 */

export const FACTOR = 19 / 81;
export const DECAY = -0.5;
export const DESIRED_RETENTION = 0.9;
export const MS_DAY = 86400000;
export const AGAIN_DELAY_MS = 10 * 60 * 1000;
const INIT_S = [0.4, 1.2, 3.0, 8.0];

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const toMs = (t) => (t instanceof Date ? t.getTime() : Number(t));

/** Probability of recall after `t` days at stability `s` (days). */
export function retrievability(t, s) {
  return Math.pow(1 + (FACTOR * Math.max(0, t)) / s, DECAY);
}

/** Days until retrievability falls to `r` for stability `s`. */
export function intervalFor(s, r = DESIRED_RETENTION) {
  return (s / FACTOR) * (Math.pow(r, 1 / DECAY) - 1);
}

/**
 * @param {{id?:string, kind?:string, now?:number|Date}} [opts]
 */
export function newCard(opts = {}) {
  const now = opts.now === undefined ? 0 : toMs(opts.now);
  return {
    id: opts.id ?? null,
    kind: opts.kind ?? "letter",
    state: "new",
    stability: 0,
    difficulty: 0,
    reps: 0,
    lapses: 0,
    lastReview: null,
    due: now,
  };
}

/** Current recall probability of a card at time `now` (0 for never-reviewed cards). */
export function cardRetrievability(card, now) {
  if (card.state === "new" || card.lastReview == null) return 0;
  return retrievability((toMs(now) - card.lastReview) / MS_DAY, card.stability);
}

/**
 * Return a NEW card after a review (input is not mutated).
 * @param {object} card
 * @param {1|2|3|4} rating 1 Again, 2 Hard, 3 Good, 4 Easy
 * @param {number|Date} now
 */
export function review(card, rating, now) {
  if (![1, 2, 3, 4].includes(rating)) throw new RangeError("rating must be 1, 2, 3 or 4");
  const t = toMs(now);
  if (!Number.isFinite(t)) throw new TypeError("now must be a valid time");
  const next = { ...card, reps: card.reps + 1, lastReview: t };

  if (card.state === "new") {
    next.stability = INIT_S[rating - 1];
    next.difficulty = clamp(5.5 - 1.1 * (rating - 3), 1, 10);
    if (rating === 1) {
      next.state = "relearning";
      next.lapses = card.lapses; // a first failure is not a lapse of known material
      next.due = t + AGAIN_DELAY_MS;
    } else {
      next.state = "review";
      next.due = t + Math.max(1, Math.round(intervalFor(next.stability))) * MS_DAY;
    }
    return next;
  }

  const S = card.stability;
  const D = card.difficulty;
  const elapsed = Math.max(0, (t - card.lastReview) / MS_DAY);
  const R = retrievability(elapsed, S);

  next.difficulty = clamp(0.9 * (D - 0.8 * (rating - 3)) + 0.1 * 4, 1, 10);
  if (rating === 1) {
    next.lapses = card.lapses + 1;
    next.state = "relearning";
    next.stability = Math.min(S, Math.max(0.1, 0.3 * Math.pow(S, 0.7)));
    next.difficulty = Math.min(10, D + 1);
    next.due = t + AGAIN_DELAY_MS;
  } else {
    const m = rating === 2 ? 0.6 : rating === 4 ? 1.6 : 1;
    const inc = 1 + Math.exp(1.6) * (11 - D) * Math.pow(S, -0.2) * (Math.exp(0.9 * (1 - R)) - 1) * m;
    next.stability = S * inc;
    next.state = "review";
    next.due = t + Math.max(1, Math.round(intervalFor(next.stability))) * MS_DAY;
  }
  return next;
}

/**
 * Cards due at `now`, most overdue first; ties broken by lower retrievability then id (deterministic).
 * @returns {object[]} new array; input untouched
 */
export function due(cards, now) {
  const t = toMs(now);
  return cards
    .filter((c) => c.due <= t)
    .sort((a, b) => a.due - b.due || cardRetrievability(a, t) - cardRetrievability(b, t) || String(a.id).localeCompare(String(b.id)));
}

/**
 * Interleave items so that CONFUSABLE items (e.g. bet/kaf, dalet/resh) are shown near each other
 * instead of in blocks of the same item. Deterministic greedy ordering.
 * Never places two items with the same id adjacently when avoidable.
 *
 * @param {Array<{id:string}>} items
 * @param {((id:string)=>string[]) | Record<string,string[]>} confusableWith Lane 2's `confusableWith` data
 *        (function of id, or map id -> ids)
 * @returns {Array} permutation of `items`
 */
export function interleave(items, confusableWith) {
  const lookup = typeof confusableWith === "function" ? confusableWith : (id) => (confusableWith && confusableWith[id]) || [];
  const rest = items.slice();
  const out = [];
  while (rest.length) {
    const last = out[out.length - 1];
    let idx = 0;
    if (last) {
      const conf = new Set(lookup(last.id) || []);
      const sym = (c) => conf.has(c.id) || (lookup(c.id) || []).includes(last.id);
      let pick = rest.findIndex((c) => c.id !== last.id && sym(c));
      if (pick < 0) pick = rest.findIndex((c) => c.id !== last.id);
      idx = pick < 0 ? 0 : pick;
    }
    out.push(rest.splice(idx, 1)[0]);
  }
  return out;
}
