/** Light read side of the learning state (progress, SRS cards, streak). Home imports this instead of actions.js so that the practice code
 *  (ladder, gender, fade, hints, checkpoint, memory chain) stays out of the cold Home load. actions.js re-exports loadState from here. */
import { storeGet, PROGRESS_KEY, CARDS_KEY, STREAK_KEY } from "./dom.js";
import { projectStreak, dayKey } from "./streak.js";

const dayNumber = (key) => { const [y, m, d] = key.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };

/** Streak to DISPLAY now: 0 when the last activity day is before yesterday. */
export function currentStreak(streak, now) {
  if (streak && streak.v === 2) { const p = projectStreak(streak, now); return { count: p.count, activeToday: p.activeToday, best: p.best, restToday: p.restToday }; }
  if (!streak || !streak.last) return { count: 0, activeToday: false, best: streak?.best || 0 };
  const gap = dayNumber(dayKey(now)) - dayNumber(streak.last);
  if (gap === 0) return { count: streak.count, activeToday: true, best: streak.best };
  if (gap === 1) return { count: streak.count, activeToday: false, best: streak.best };
  return { count: 0, activeToday: false, best: streak.best };
}

export async function loadState(ctx, now = Date.now()) {
  const progress = await storeGet(ctx, PROGRESS_KEY, { completed: {} });
  const cards = await storeGet(ctx, CARDS_KEY, {});
  const streak = await storeGet(ctx, STREAK_KEY, null);
  const normCards = Array.isArray(cards) ? Object.fromEntries(cards.filter((c) => c?.id).map((c) => [c.id, c])) : cards;
  return { completed: progress.completed || {}, cards: normCards, streak: currentStreak(streak, now), rawStreak: streak };
}
