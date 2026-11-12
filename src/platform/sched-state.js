// H1 Scheduler transparency: the real state of the learner's review cards, computed from the cards on this device only.
// Pure: no store, no clock (callers pass `now`). Decks are the four card stores the live scheduler (src/curriculum/srs.js) writes.
import { retrievability, MS_DAY } from '../curriculum/srs.js';

export const DECKS = Object.freeze([
  ['srs.cards', 'Lessons'], ['srs.vocab', 'Dictionary and Word Sprint'], ['wordtrace.cards', 'Word tracing'], ['israel.cards', 'Sound like a local'],
]);
/** Interval buckets: [lowest whole days, label]. */
export const BUCKETS = Object.freeze([
  [0, 'Under 1 day'], [1, '1 day'], [2, '2 to 3 days'], [4, '4 to 7 days'], [8, '8 to 14 days'], [15, '15 to 30 days'], [31, '31 to 90 days'], [91, 'Over 90 days'],
]);

/** Every card in a deck value (a map or an older array), skipping anything that is not a card. */
export function cardsOf(v) {
  const list = Array.isArray(v) ? v : v && typeof v === 'object' ? Object.values(v) : [];
  return list.filter((c) => c && typeof c === 'object' && typeof c.state === 'string' && Number.isFinite(Number(c.due)));
}

const endOfDay = (now, plus = 0) => { const d = new Date(now); d.setHours(24 * (plus + 1), 0, 0, 0); return d.getTime(); };
export const bucketOf = (days) => { let i = 0; for (let k = 0; k < BUCKETS.length; k++) if (days >= BUCKETS[k][0]) i = k; return i; };

/** Decoded review log of one card: [{day, rating}] oldest first (srs.js stores day*10+rating). */
export const decodeLog = (card) => (Array.isArray(card?.log) ? card.log : []).filter(Number.isFinite).map((x) => ({ day: Math.floor(x / 10), rating: x % 10 }))
  .filter((r) => r.rating >= 1 && r.rating <= 4);

/**
 * @param {Record<string, any>} decks store key -> deck value @param {number} now ms
 * @returns {{total:number, byState:{new:number, learning:number, review:number}, buckets:{label:string, n:number}[], dueNow:number, dueToday:number,
 *   dueTomorrow:number, newWaiting:number, estimate:number|null, estimateN:number, measured:{n:number, recalled:number, rate:number|null}, perDeck:{key:string,label:string,n:number}[]}}
 */
export function schedulerState(decks, now) {
  const today = endOfDay(now), tomorrow = endOfDay(now, 1);
  const out = { total: 0, byState: { new: 0, learning: 0, review: 0 }, buckets: BUCKETS.map(([, label]) => ({ label, n: 0 })), dueNow: 0, dueToday: 0, dueTomorrow: 0, newWaiting: 0,
    estimate: null, estimateN: 0, measured: { n: 0, recalled: 0, rate: null }, perDeck: [] };
  let rSum = 0;
  for (const [key, label] of DECKS) {
    const cards = cardsOf(decks?.[key]);
    out.perDeck.push({ key, label, n: cards.length });
    for (const c of cards) {
      out.total++;
      const due = Number(c.due);
      if (c.state === 'new' || c.lastReview == null) { out.byState.new++; if (due <= today) out.newWaiting++; continue; }
      out.byState[c.state === 'relearning' ? 'learning' : 'review']++;
      out.buckets[bucketOf(Math.max(0, (due - c.lastReview) / MS_DAY))].n++;
      if (due <= now) out.dueNow++;
      if (due <= today) out.dueToday++; else if (due <= tomorrow) out.dueTomorrow++;
      if (c.state === 'review' && c.stability > 0) { rSum += retrievability(Math.max(0, (now - c.lastReview) / MS_DAY), c.stability); out.estimateN++; }
      const log = decodeLog(c);
      for (let i = 1; i < log.length; i++) if (log[i].day - log[i - 1].day >= 1) { out.measured.n++; if (log[i].rating > 1) out.measured.recalled++; }
    }
  }
  if (out.estimateN) out.estimate = rSum / out.estimateN;
  if (out.measured.n) out.measured.rate = out.measured.recalled / out.measured.n;
  return out;
}

export const pct = (x) => (x == null ? 'not yet' : `${Math.round(x * 100)}%`);
