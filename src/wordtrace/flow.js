// ALEF word tracing: attempt flow (guide fade-out), outcome rating, SRS hook and progress. Pure + store helpers, no DOM.
// @ts-check
import { newCard, review, due, MS_DAY } from '../curriculum/srs.js';

/** Guide fade per word attempt (round): solid outline -> dotted outline -> blank (no guide, no start dot). */
export const GUIDES = Object.freeze(['solid', 'dotted', 'blank']);
/** A round with this many wrong strokes in total (or any stroke the tracer had to show) counts as missed. */
export const MISS_LIMIT = 3;

/**
 * Judge one finished round.
 * @param {{mistakes:number, forced:number, assisted:boolean}} r
 */
export function judgeRound(r) {
  const missed = !r.assisted && (r.forced > 0 || r.mistakes >= MISS_LIMIT);
  return { missed, clean: !r.assisted && !missed, assisted: !!r.assisted };
}

/**
 * Pure fade controller for one word. A clean round moves to the next guide level; a missed round repeats the same level;
 * an assisted round (the "Show me" buttons were used) neither advances nor counts as missed.
 * Tracing is finished after a clean round with the blank guide.
 * @param {{startLevel?:number}} [o]
 */
export function createFade(o = {}) {
  let level = Math.max(0, Math.min(GUIDES.length - 1, o.startLevel || 0));
  let rounds = 0, missedRounds = 0, assistedRounds = 0, finished = false;
  return {
    get guide() { return GUIDES[level]; },
    get level() { return level; },
    get finished() { return finished; },
    /** @param {{mistakes:number, forced:number, assisted:boolean}} r */
    finishRound(r) {
      const j = judgeRound(r); rounds++;
      if (j.missed) missedRounds++;
      if (j.assisted) assistedRounds++;
      if (j.clean) { if (level >= GUIDES.length - 1) finished = true; else level++; }
      return { ...j, nextGuide: finished ? null : GUIDES[level], finished };
    },
    stats() { return { rounds, missedRounds, assistedRounds, finished, guide: GUIDES[level] }; }
  };
}

/**
 * Overall rating of a word attempt (SRS scale 1 Again .. 4 Easy).
 * 1: a missed trace round, or fewer than half the vowel cells right.  2: assisted, skipped, or any vowel cell wrong.  3: otherwise.
 * @param {{missedRounds:number, assistedRounds:number, skipped?:boolean, niqqud?:{correct:number,total:number}|null}} s
 */
export function rateWord(s) {
  const n = s.niqqud;
  if (s.missedRounds > 0 || (n && n.total && n.correct / n.total < 0.5)) return 1;
  if (s.assistedRounds > 0 || s.skipped || (n && n.correct < n.total)) return 2;
  return 3;
}

// ---------------------------------------------------------------- storage (tolerates sync and async stores)

export const CARDS_KEY = 'wordtrace.cards';        // { [cardId]: srs card }  separate from 'srs.cards' on purpose, see docs/wordtrace/README.md
export const PROGRESS_KEY = 'wordtrace.progress';  // { [script]: { [pointedWord]: { done, missed, best, last } } }
export const cardId = (script, he) => `wordtrace:${script}:${he}`;

export async function sget(store, key, fallback) {
  try { if (!store || typeof store.get !== 'function') return fallback; const v = await store.get(key, fallback); return v == null ? fallback : v; } catch { return fallback; }
}
export async function sset(store, key, value) { try { if (store && typeof store.set === 'function') await store.set(key, value); } catch { /* best effort */ } }

/**
 * SRS hook. A miss (rating 1 or 2) creates the card and reviews it; a clean pass only reviews a card that already exists.
 * @param {Record<string, any>} cards @param {string} id @param {number} rating @param {number} now ms
 */
export function applyRating(cards, id, rating, now) {
  const have = cards[id];
  if (!have && rating >= 3) return cards;
  return { ...cards, [id]: review(have || newCard({ id, kind: 'wordtrace', now }), rating, now) };
}

/** Card ids that are due, most overdue first, for one script. @param {Record<string, any>} cards */
export function dueWordIds(cards, script, now) {
  const prefix = `wordtrace:${script}:`;
  return due(Object.values(cards).filter(c => c && typeof c.id === 'string' && c.id.startsWith(prefix)), now).map(c => c.id.slice(prefix.length));
}

/** Record a finished word attempt into progress. @param {any} progress @param {{he:string, script:string, rating:number, now:number}} r */
export function recordProgress(progress, r) {
  const all = { ...(progress || {}) };
  const sc = { ...(all[r.script] || {}) };
  const e = { done: 0, missed: 0, best: 0, last: null, ...(sc[r.he] || {}) };
  e.done++; if (r.rating < 3) e.missed++; e.best = Math.max(e.best, r.rating); e.last = new Date(r.now).toISOString();
  sc[r.he] = e; all[r.script] = sc; return all;
}

/**
 * Persist one finished word attempt: progress, SRS card. Returns what was stored.
 * @param {any} store @param {{he:string, script:string, rating:number}} r @param {number} [now]
 */
export async function saveOutcome(store, r, now = Date.now()) {
  const progress = recordProgress(await sget(store, PROGRESS_KEY, {}), { ...r, now });
  const id = cardId(r.script, r.he);
  const before = await sget(store, CARDS_KEY, {});
  const cards = applyRating(before, id, r.rating, now);
  await sset(store, PROGRESS_KEY, progress);
  if (cards !== before) await sset(store, CARDS_KEY, cards);
  return { progress, card: cards[id] || null, createdOrReviewed: cards !== before };
}

export { MS_DAY };
