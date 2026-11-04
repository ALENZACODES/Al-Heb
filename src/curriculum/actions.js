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
