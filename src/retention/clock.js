// @ts-check
// Retention clock helpers (pure). Every wall-clock time is built with new Date(y, m, d, hh, mm) in the device's local
// zone, never by adding 24 h of milliseconds, so daylight-saving changes cannot move a day boundary.
import { dayKey, addDaysISO } from '../curriculum/streak.js';
export { dayKey, addDaysISO };

/** ms of local `minute` (minutes after midnight) on local date `iso`. */
export function localAt(iso, minute = 0) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 0, minute, 0, 0).getTime();
}
/** Minutes after local midnight. */
export const minuteOfDay = (ms) => { const d = new Date(ms); return d.getHours() * 60 + d.getMinutes(); };
/** 0 = Sunday ... 6 = Saturday for a local ISO date. */
export const weekdayOf = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12).getDay(); };
/** Whole days from ISO date a to ISO date b (b - a). */
export const daysBetween = (a, b) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000);
/** The device's IANA zone, or the fallback. */
export function deviceZone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Toronto'; } catch { return 'America/Toronto'; } }

// ---- The fixed Shabbat window (owner rule): Friday 18:00 to Saturday 21:00, local time. ----
export const SHABBAT_START_MIN = 18 * 60, SHABBAT_END_MIN = 21 * 60;
/** true from Friday 18:00 up to (not including) Saturday 21:00 local. */
export function inShabbatWindow(now) {
  const d = new Date(now), dow = d.getDay(), min = d.getHours() * 60 + d.getMinutes();
  return (dow === 5 && min >= SHABBAT_START_MIN) || (dow === 6 && min < SHABBAT_END_MIN);
}

// ---- League week: Sunday 00:00 to Friday 14:00 local. weekId = ISO date of that Sunday. ----
export const LEAGUE_END_MIN = 14 * 60;
export function weekIdOf(now) { const k = dayKey(now); return addDaysISO(k, -weekdayOf(k)); }
/** ms at which the league week `weekId` closes (Friday 14:00). */
export const leagueEnd = (weekId) => localAt(addDaysISO(weekId, 5), LEAGUE_END_MIN);
/** ms at which the next league week opens (the following Sunday 00:00). */
export const nextWeekStart = (weekId) => localAt(addDaysISO(weekId, 7), 0);
