/**
 * Opening a lesson early. A lesson whose earlier lessons are not finished is locked; a double tap unlocks it, so a learner
 * can move freely between lessons. The choice is kept (store key curriculum.unlocked: { [lessonId]: ms }) so the lesson
 * stays open, and its quick check can then be taken like any other lesson's. Nothing is marked as done by unlocking.
 */
import { storeGet, storeSet } from "./dom.js";

export const UNLOCK_KEY = "curriculum.unlocked";
export const DOUBLE_TAP_MS = 500;

/** @returns {Promise<Set<string>>} ids of the lessons the learner has opened early */
export async function loadUnlocked(ctx) {
  const v = await storeGet(ctx, UNLOCK_KEY, {});
  return new Set(v && typeof v === "object" ? Object.keys(v).filter((k) => v[k]) : []);
}

export async function unlockLesson(ctx, id, now = Date.now()) {
  const v = await storeGet(ctx, UNLOCK_KEY, {});
  const next = { ...(v && typeof v === "object" ? v : {}), [id]: (v && v[id]) || now };
  await storeSet(ctx, UNLOCK_KEY, next);
  return next;
}

/** The lessons a lesson still needs, with the ones the learner chose to skip past taken out. */
export function stillLocked(lesson, completed, unlocked) {
  if (unlocked && unlocked.has(lesson.id)) return [];
  const done = completed instanceof Set ? completed : new Set(Object.keys(completed || {}).filter((k) => completed[k]));
  return (lesson.prerequisites || []).filter((p) => !done.has(p));
}

/**
 * A click handler that runs `onDouble` on the second tap or click within DOUBLE_TAP_MS, and `onSingle` on a first one.
 * Taps are timed by hand because a touch screen does not always send a double-click event.
 */
export function doubleTap(onDouble, onSingle, now = () => Date.now()) {
  let last = 0;
  return (e) => {
    const t = now();
    if (last && t - last <= DOUBLE_TAP_MS) { last = 0; return onDouble(e); }
    last = t;
    return onSingle ? onSingle(e) : undefined;
  };
}
