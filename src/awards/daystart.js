// Day-start stamp: the first time the app was opened on a local day.
// It exists so the Early Bird and Night Owl medallions can be earned from a
// real record instead of a guess. The stamp is written once per day, at app
// boot, before any study can happen that day — call stampDayStart(store,
// Date.now()) once from the shell's boot path. Opening Awards never stamps:
// a first sighting by the Awards page is not a day start. Until the boot
// call lands, no stamp exists and both medallions stay locked.

import { dayKey } from '../curriculum/streak.js';

export const DAYSTART_KEY = 'daystart.v1';

const ISO_DAY = /^\d{4}-\d\d-\d\d$/;

/** Validate a stored stamp. Anything else is no stamp. */
export function cleanDayStart(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (typeof raw.date !== 'string' || !ISO_DAY.test(raw.date)) return null;
  if (!Number.isFinite(raw.firstAt) || raw.firstAt <= 0) return null;
  return { date: raw.date, firstAt: raw.firstAt };
}

/**
 * Record today's first opening. Idempotent within a day: an existing stamp
 * for today is kept exactly as it is (the earliest time stands). Returns the
 * stamp in force. A store without a set function leaves the stamp unwritten
 * and returns what was read.
 * @param {{get?: Function, set?: Function}|null|undefined} store
 * @param {number|Date} now
 */
export function stampDayStart(store, now) {
  const today = dayKey(now);
  let existing = null;
  try { existing = cleanDayStart(store && typeof store.get === 'function' ? store.get(DAYSTART_KEY, null) : null); }
  catch { existing = null; }
  if (existing && existing.date === today) return existing;
  const stamp = { date: today, firstAt: new Date(now).getTime() };
  try { if (store && typeof store.set === 'function') store.set(DAYSTART_KEY, stamp); } catch { /* the stamp is an addition; boot continues */ }
  return stamp;
}

/** Local hour a stamp began, or null. */
export function dayStartHour(stamp) {
  const clean = cleanDayStart(stamp);
  if (!clean) return null;
  return new Date(clean.firstAt).getHours();
}
