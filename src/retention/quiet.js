// @ts-check
// Quiet time for retention. Reuses the app's existing Shabbat / Yom Tov quiet helper (quietHours in src/shell/notify.js:
// candle lighting to havdalah when a city is set) and adds the fixed owner rule on top: Friday 18:00 to Saturday 21:00
// local, the same hours around every Yom Tov day, and night quiet. The wider of the two always wins.
import { quietHours } from '../shell/notify.js';
import { yomTovDates } from '../curriculum/streak.js';
import { dayKey, addDaysISO, minuteOfDay, inShabbatWindow, SHABBAT_START_MIN, SHABBAT_END_MIN } from './clock.js';

export const NIGHT = Object.freeze({ fromMin: 8 * 60, toMin: 21 * 60 }); // reminders only between 08:00 and 21:00

/** Fixed Yom Tov window: 18:00 on the eve to 21:00 on the day; back-to-back days merge by themselves. */
export function inYomTovWindow(now, mode = 'reform') {
  const today = dayKey(now), min = minuteOfDay(now), tomorrow = addDaysISO(today, 1);
  const set = yomTovDates(today, tomorrow, mode);
  return (set.has(today) && min < SHABBAT_END_MIN) || (set.has(tomorrow) && min >= SHABBAT_START_MIN);
}
/**
 * Shabbat or Yom Tov (no notification, no streak loss, no league reset).
 * @param {number} now @param {{loc?:object|null, mode?:string}} [opt] loc = the learner's city from the calendar, when set
 */
export function isRestQuiet(now, opt = {}) {
  if (inShabbatWindow(now) || inYomTovWindow(now, opt.mode)) return true;
  try { return !!opt.loc && quietHours(opt.loc, { observance: opt.mode })(new Date(now)); } catch { return false; }
}
/** Rest quiet, or night. */
export function isQuiet(now, opt = {}) { const m = minuteOfDay(now); return m < NIGHT.fromMin || m >= NIGHT.toMin || isRestQuiet(now, opt); }
/** Which rest it is at `now`: 'shabbat' | 'yomtov' | null. */
export const restNow = (now, opt = {}) => (inShabbatWindow(now) ? 'shabbat' : inYomTovWindow(now, opt.mode) ? 'yomtov' : isRestQuiet(now, opt) ? 'shabbat' : null);
/** Quiet stretches between two instants as [[startMs, endMs]], sampled every 15 minutes (for the service worker, which cannot run this code). */
export function quietRanges(fromMs, toMs, opt = {}) {
  const out = []; let open = null; const step = 15 * 60000;
  for (let t = Math.floor(fromMs / step) * step; t <= toMs; t += step) {
    const q = isQuiet(t, opt);
    if (q && open === null) open = t; else if (!q && open !== null) { out.push([open, t]); open = null; }
  }
  if (open !== null) out.push([open, toMs]);
  return out;
}
