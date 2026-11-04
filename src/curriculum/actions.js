/** Store-backed learning actions shared by the Lane 1 views and the home screen. */
import { storeGet, storeSet, PROGRESS_KEY, CARDS_KEY, STREAK_KEY } from "./dom.js";
import { ensureCards, recordActivity, currentStreak } from "./progress.js";
import { review } from "./srs.js";

export async function loadState(ctx, now = Date.now()) {
  const progress = await storeGet(ctx, PROGRESS_KEY, { completed: {} });
  const cards = await storeGet(ctx, CARDS_KEY, {});
  const streak = await storeGet(ctx, STREAK_KEY, null);
  const normCards = Array.isArray(cards) ? Object.fromEntries(cards.filter((c) => c?.id).map((c) => [c.id, c])) : cards;
  return { completed: progress.completed || {}, cards: normCards, streak: currentStreak(streak, now), rawStreak: streak };
}

/** Mark a lesson complete, create its SRS cards, count today as active. Idempotent for cards. */
export async function completeLesson(ctx, lesson, now = Date.now()) {
  const st = await loadState(ctx, now);
  const completed = { ...st.completed, [lesson.id]: st.completed[lesson.id] || now };
  const { cards, added } = ensureCards(st.cards, lesson, now);
  await storeSet(ctx, PROGRESS_KEY, { completed });
  await storeSet(ctx, CARDS_KEY, cards);
  await storeSet(ctx, STREAK_KEY, recordActivity(st.rawStreak, now));
  return { added, completed };
}

/** Create the lesson's cards without completing it (used by the practice deep link). */
export async function addLessonCards(ctx, lesson, now = Date.now()) {
  const st = await loadState(ctx, now);
  const { cards, added } = ensureCards(st.cards, lesson, now);
  if (added) await storeSet(ctx, CARDS_KEY, cards);
  return { added, cards };
}

/** Apply a rating (1-4) to a stored card and persist it; counts today as active. Returns the new card. */
export async function rateCard(ctx, cardId, rating, now = Date.now()) {
  const st = await loadState(ctx, now);
  const card = st.cards[cardId];
  if (!card) throw new Error("unknown card " + cardId);
  const next = review(card, rating, now);
  await storeSet(ctx, CARDS_KEY, { ...st.cards, [cardId]: next });
  await storeSet(ctx, STREAK_KEY, recordActivity(st.rawStreak, now));
  return next;
}

// ---- practice features: hints, loanwords, Spot It, checkpoint (storage keys documented in docs/curriculum/onramp-drills-dialogues.md)
import { HINTS_KEY, newHintSession, dismissHint } from "./hints.js";
import { lapseLetters, applyCheckpointToCards } from "./checkpoint.js";
export const PAIRS_KEY = "curriculum.pairs";             // { "bet|kaf": { errors, trials } }
export const LOANWORDS_KEY = "curriculum.loanwords";     // { [wordId]: { knew:boolean, at:ms } }
export const CHECKPOINTS_KEY = "curriculum.checkpoints"; // { [stage]: { right, total, at } }

const sessions = new WeakMap();
/** In-memory hint session for this page load, seeded with the persisted "Got it" suppressions. */
export async function hintSession(ctx) {
  const key = ctx?.store && typeof ctx.store === "object" ? ctx.store : sessions;
  if (!sessions.has(key)) sessions.set(key, newHintSession(await storeGet(ctx, HINTS_KEY, [])));
  return sessions.get(key);
}
export async function suppressHint(ctx, kind) {
  const s = await hintSession(ctx);
  await storeSet(ctx, HINTS_KEY, dismissHint(s, kind));
}
/** Letters whose cards a completed lesson list teaches (read track). */
export function taughtFromCompleted(completed, lessonList) {
  const done = new Set(Object.keys(completed || {}));
  return new Set(lessonList.filter((l) => done.has(l.id)).flatMap((l) => l.letters));
}
export async function markLoanword(ctx, wordId, knew, now = Date.now()) {
  const m = await storeGet(ctx, LOANWORDS_KEY, {});
  await storeSet(ctx, LOANWORDS_KEY, { ...m, [wordId]: { knew, at: now } });
}
/** Save a Spot It result: pair accuracy, and lapse the target and the decoys that fooled the learner. */
export async function saveSpotIt(ctx, model, score, now = Date.now()) {
  const pairs = await storeGet(ctx, PAIRS_KEY, {});
  const next = { ...pairs };
  const decoyBases = new Set(model.decoyIndices.map((i) => model.cells[i].base));
  for (const b of decoyBases) {
    const k = [model.targetId, b].sort().join("|");
    next[k] = { errors: (next[k]?.errors || 0) + (score.pairErrors[k] || 0), trials: (next[k]?.trials || 0) + 1 };
  }
  await storeSet(ctx, PAIRS_KEY, next);
  const fooled = Object.keys(score.fooledBy);
  if (fooled.length) {
    const st = await loadState(ctx, now);
    await storeSet(ctx, CARDS_KEY, lapseLetters(st.cards, [model.targetId, ...fooled], now));
  }
  const st2 = await loadState(ctx, now);
  await storeSet(ctx, STREAK_KEY, recordActivity(st2.rawStreak, now));
}
export async function saveCheckpoint(ctx, stage, qs, answers, result, now = Date.now()) {
  const st = await loadState(ctx, now);
  await storeSet(ctx, CARDS_KEY, applyCheckpointToCards(st.cards, qs, answers, now));
  const prev = await storeGet(ctx, CHECKPOINTS_KEY, {});
  await storeSet(ctx, CHECKPOINTS_KEY, { ...prev, [stage]: { right: result.right, total: result.total, at: now } });
  await storeSet(ctx, STREAK_KEY, recordActivity(st.rawStreak, now));
}
