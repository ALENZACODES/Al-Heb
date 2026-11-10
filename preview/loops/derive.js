// What the learner already did, read from the stores other screens write (read-only here). Pure: the snapshot is passed in.
// Lessons, timed reads and speaking tries carry exact times. Review cards keep only their LAST review time, so reviews and
// minutes are lower bounds: a card reviewed on two days counts only on the later one. The screen says so.
import { dayKey } from '../../src/curriculum/streak.js';
import { cleanState as cleanTimedReads } from '../../src/timedread/model.js';
import { coerceState } from '../../src/speak/model.js';

const ms = (t) => (typeof t === 'string' ? Date.parse(t) : Number(t));
const dayOf = (t) => { const n = ms(t); return Number.isFinite(n) && n > 0 ? dayKey(n) : null; };

/**
 * @param {any} snap result of readSnapshot() in src/progress/model.js
 * @returns {Record<string, {lessons:string[], r:number, t:number, s:number, m:number}>} counts per local day
 */
export function deriveDays(snap) {
  const out = {};
  const day = (iso) => (out[iso] ||= { lessons: [], r: 0, t: 0, s: 0, m: 0 });
  const s = snap || {};
  for (const [id, t] of Object.entries(s.completed || {})) { const k = dayOf(t); if (k) day(k).lessons.push(id); }
  for (const c of [...Object.values(s.cards || {}), ...Object.values(s.vocab || {})]) { const k = c && dayOf(c.lastReview); if (k) day(k).r++; }
  try { for (const r of cleanTimedReads(s.timedRead).reads) { const k = dayOf(r.at); if (k) day(k).t++; } } catch { /* corrupt record: skip */ }
  try { for (const a of coerceState(s.speak).attempts) { const k = dayOf(a.at); if (k) day(k).s++; } } catch { /* corrupt record: skip */ }
  const st = s.streak || {};
  // Engaged time: the streak record keeps today's seconds, and the dates that reached the 5-minute goal.
  if (typeof st.todayDate === 'string' && Number(st.todaySeconds) > 0) day(st.todayDate).m = Math.floor(Math.min(Number(st.todaySeconds), 86400) / 60);
  for (const k of Array.isArray(st.doneDates) ? st.doneDates : []) if (typeof k === 'string' && /^\d{4}-\d\d-\d\d$/.test(k)) day(k).m = Math.max(day(k).m, 5);
  return out;
}

/** Days the existing streak engine treats as rest (Shabbat or festival with the setting on, or declared). Used as free cover. */
export function declaredRest(snap) {
  const st = (snap && snap.streak) || {};
  return new Set([...(Array.isArray(st.frozenDates) ? st.frozenDates : []), ...((snap && snap.rest) || [])].filter((x) => typeof x === 'string'));
}

/** Days the existing engine counted as done (reached 5 minutes), so a day done on Home counts here too. */
export function engineDoneDays(snap) {
  const st = (snap && snap.streak) || {};
  return new Set(Array.isArray(st.doneDates) ? st.doneDates : []);
}
