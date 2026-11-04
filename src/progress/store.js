// @ts-check
// Persisting Progress's own small state (rest days, daily goal) in the shared store under "progress.state".
// It is part of the normal store backup (Settings -> Back up), so no separate export exists or is needed.
import { KEYS, readSnapshot, withRestDay, withGoal } from './model.js';
import { withDeclaredRest } from '../curriculum/streak.js';

/** @param {{get:Function,set:Function}} store @param {string} key day key @param {boolean} on */
export function setRestDay(store, key, on) {
  store.set(KEYS.state, withRestDay(readSnapshot(store), key, on));
  // mirror into a v2 streak record so Home (which reads only that record) shows the same number
  const rec = store.get(KEYS.streak, null);
  if (rec && rec.v === 2) store.set(KEYS.streak, withDeclaredRest(rec, key, on));
}
/** @param {{get:Function,set:Function}} store @param {number} target cards per day */
export function setGoalTarget(store, target) {
  if (!Number.isInteger(target) || target < 1 || target > 500) throw new RangeError('goal must be 1..500 cards');
  store.set(KEYS.state, withGoal(readSnapshot(store), target));
}
