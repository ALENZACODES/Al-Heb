/**
 * Learning-loop model (pure functions, no DOM, no storage): SRS card creation from completed lessons,
 * review-queue building with interleaving of confusable letters, and the streak counter.
 *
 * Storage shapes (keys in ctx.store):
 *   "curriculum.progress"  { completed: { [lessonId]: ms } }
 *   "srs.cards"            { [cardId]: card }            (card shape: see srs.js)
 *   "streak"               { count, best, last }         last = local day key "YYYY-MM-DD"
 *
 * Card ids: "letter:<letterId>", "vowel:<vowelId>", "word:<lessonId>:<n>" (n is 1-based and equals the audio id
 * "<lessonId>-w<n>"). Round 4 adds "syllable:<id>", "line:<corpusId>" (fade-out recall, extra field fadeLevel) and "gender:<pairId>" cards; lessons still schedule no prayer lines.
 */
import { newCard, due, interleave, review } from "./srs.js";
import { currentStreak } from "./state.js";
export { currentStreak };
import { parseMemCardId, mergeMemoryIntoQueue, partnersOf } from "../letters/memory.core.js";

export const letterCardId = (id) => `letter:${id}`;
export const vowelCardId = (id) => `vowel:${id}`;
export const wordCardId = (lessonId, n) => `word:${lessonId}:${n}`;
export const wordAudioId = (lessonId, n) => `${lessonId}-w${n}`;

/** @returns {{kind:string,key:string,lessonId?:string,n?:number}|null} */
export function parseCardId(id) {
  const m = /^(letter|vowel):(.+)$/.exec(id);
  if (m) return { kind: m[1], key: m[2] };
  const x = /^(syllable|line|gender):(.+)$/.exec(id);
  if (x) return { kind: x[1] === "line" ? "prayerLine" : x[1], key: x[2] };
  const mem = parseMemCardId(id);
  if (mem) return mem;
  const w = /^word:([^:]+):(\d+)$/.exec(id);
  if (w) return { kind: "word", key: id, lessonId: w[1], n: Number(w[2]) };
  return null;
}

export const syllableCardId = (id) => `syllable:${id}`;
export const lineCardId = (id) => `line:${id}`;
export const genderCardId = (id) => `gender:${id}`;

/**
 * Apply exercise outcomes to SRS cards (pure, does not mutate). outcome = { id, kind, good, create? }.
 * A miss creates the card if needed and lapses it (rating 1). A hit is a Good review (rating 3) of an existing card,
 * or of a new card when `create` is true.
 */
export function applyOutcomesToCards(cards, outcomes, now) {
  const out = { ...cards };
  for (const o of outcomes) {
    const have = out[o.id];
    if (!have && o.good && !o.create) continue;
    out[o.id] = review(have || newCard({ id: o.id, kind: o.kind, now }), o.good ? 3 : 1, now);
  }
  return out;
}

/** Card descriptors a lesson teaches. */
export function cardsForLesson(lesson) {
  return [
    ...lesson.letters.map((l) => ({ id: letterCardId(l), kind: "letter" })),
    ...lesson.vowels.map((v) => ({ id: vowelCardId(v), kind: "vowel" })),
    ...lesson.words.map((_, i) => ({ id: wordCardId(lesson.id, i + 1), kind: "word" })),
  ];
}

/** Add missing cards for a lesson (new cards are due immediately). Does not mutate `cards`. */
export function ensureCards(cards, lesson, now) {
  const out = { ...cards };
  let added = 0;
  for (const d of cardsForLesson(lesson)) {
    if (!out[d.id]) { out[d.id] = newCard({ id: d.id, kind: d.kind, now }); added++; }
  }
  return { cards: out, added };
}

/** Confusable sets (data/letters/confusables.json) -> { cardId: [cardId...] } for srs.interleave. */
export function confusableMap(confusables) {
  const map = {};
  for (const set of confusables?.sets || []) {
    for (const a of set.letters) {
      map[letterCardId(a)] = [...new Set([...(map[letterCardId(a)] || []), ...set.letters.filter((b) => b !== a).map(letterCardId)])];
    }
  }
  return map;
}

/**
 * Due cards, optionally limited to one lesson's cards, interleaved so confusable letters sit near each other
 * (only letters have confusables), capped at `limit`.
 */
export function buildQueue(cards, now, { lessonId, lessons, confusables, limit = 20 } = {}) {
  let list = due(Object.values(cards), now);
  if (lessonId) {
    const lesson = (lessons || []).find((l) => l.id === lessonId);
    const ids = new Set(lesson ? cardsForLesson(lesson).map((d) => d.id) : []);
    const mine = new Set(lesson ? lesson.letters : []);
    list = list.filter((c) => ids.has(c.id) || mine.has(parseMemCardId(c.id)?.letterId));
  }
  list = list.slice(0, limit);
  // memory-chain cards (mem:<letter>:<type>) are kept APART from their look-alikes in time (the questions put the look-alikes among the choices);
  // every other card keeps the old rule of sitting next to its look-alikes
  const isMem = (c) => c.id.startsWith("mem:");
  const mem = list.filter(isMem);
  if (!mem.length) return interleave(list, confusableMap(confusables));
  const others = interleave(list.filter((c) => !isMem(c)), confusableMap(confusables));
  const byId = new Map(list.map((c) => [c.id, c]));
  return mergeMemoryIntoQueue(others.map((c) => c.id), mem.map((c) => c.id), (id) => partnersOf(confusables, id)).map((id) => byId.get(id));
}

/** Local calendar day key. */
export function dayKey(now) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const dayNumber = (key) => { const [y, m, d] = key.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };

/** Record learning activity today. Same day: unchanged. Next day: +1. Gap: restart at 1. */
export function recordActivity(streak, now) {
  if (streak && streak.v === 2) return streak; // engaged-time engine owns the record (src/curriculum/streak.js)
  const today = dayKey(now);
  const s = { count: 0, best: 0, last: null, ...(streak || {}) };
  if (s.last === today) return s;
  const consecutive = s.last && dayNumber(today) - dayNumber(s.last) === 1;
  const count = consecutive ? s.count + 1 : 1;
  return { count, best: Math.max(s.best || 0, count), last: today };
}

