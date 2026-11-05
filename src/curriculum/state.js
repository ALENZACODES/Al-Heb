/* Read-only progress state, also used by the lightweight home screen. */
import { storeGet, PROGRESS_KEY, CARDS_KEY, STREAK_KEY } from "./dom.js";
import { currentStreak } from "./progress.js";

export async function loadState(ctx, now = Date.now()) {
  const progress = await storeGet(ctx, PROGRESS_KEY, { completed: {} });
  const cards = await storeGet(ctx, CARDS_KEY, {});
  const streak = await storeGet(ctx, STREAK_KEY, null);
  const normCards = Array.isArray(cards) ? Object.fromEntries(cards.filter((c) => c?.id).map((c) => [c.id, c])) : cards;
  return { completed: progress.completed || {}, cards: normCards, streak: currentStreak(streak, now), rawStreak: streak };
}
