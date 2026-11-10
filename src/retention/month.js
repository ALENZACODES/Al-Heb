// @ts-check
// The month's challenge: one longer goal that runs with the Hebrew month (Rosh Chodesh to Rosh Chodesh), named after
// it ("Kislev Challenge"). The target is set once, when the month is first seen, from the learner's own daily goal.
// Month names and dates come from the app's calendar (src/curriculum/calendar.js); no new Hebrew is written here.
// Opens after 5 finished lessons, never in calm mode. Pure functions.
import { toHebrew, parseISO, HEBREW_MONTH_NAMES } from '../curriculum/calendar.js';
import { clone } from './state.js';
import { dayKey, addDaysISO } from './clock.js';
import { earn } from './gems.js';

export const MONTH = Object.freeze({ unlockLessons: 5, goalDays: 15, gems: 50, minTarget: 100 });

/** The Hebrew month that contains `now`: its key, names, first and last civil dates, and which day of it today is. */
export function monthOf(now = Date.now()) {
  const today = dayKey(now), h = toHebrew(parseISO(today)), start = addDaysISO(today, -(h.day - 1));
  let end = today;
  for (let i = 1; i <= 31; i++) { const d = addDaysISO(today, i), x = toHebrew(parseISO(d)); if (x.month !== h.month || x.year !== h.year) break; end = d; }
  const name = HEBREW_MONTH_NAMES[h.month] || { en: h.month, he: '' };
  return { key: `${h.year}-${h.month}`, en: name.en, he: name.he, start, end, day: h.day, daysLeft: Math.round((Date.parse(end) - Date.parse(today)) / 86400000) };
}
export const monthOn = (rec, { calm = false } = {}) => !calm && rec.lessonsFinished >= MONTH.unlockLessons;
/** XP earned on the civil dates of the month. */
export function monthXp(rec, m) { let xp = 0; for (const [d, n] of Object.entries(rec.xp.days)) if (d >= m.start && d <= m.end) xp += n; return xp; }
const targetFor = (rec, m) => { const left = m.daysLeft + 1, total = m.day + m.daysLeft; return Math.max(MONTH.minTarget, Math.round((rec.goal * MONTH.goalDays * Math.max(left, 7)) / total / 10) * 10); };

/** Make sure the record carries this month's challenge (target fixed on first sight; a late start gets a smaller one). */
export function ensureMonth(rec, now = Date.now()) {
  const m = monthOf(now);
  if (rec.month && rec.month.key === m.key && Number.isFinite(rec.month.target)) return rec;
  const r = clone(rec); r.month = { key: m.key, target: targetFor(rec, m), paid: false }; return r;
}
/** After XP changed: pay the challenge once when the target is reached. @returns {{rec:object, completed:boolean}} */
export function monthProgress(rec, now = Date.now(), opt = {}) {
  if (!monthOn(rec, opt)) return { rec, completed: false };
  let r = ensureMonth(rec, now); const m = monthOf(now);
  if (r.month.paid || monthXp(r, m) < r.month.target) return { rec: r, completed: false };
  const keep = { ...r.month, paid: true }; r = earn(r, MONTH.gems, 'month', now); r.month = keep;
  return { rec: r, completed: true };
}
/** What the card draws. */
export function monthView(rec, now = Date.now(), opt = {}) {
  const m = monthOf(now), r = ensureMonth(rec, now), xp = monthXp(r, m), target = r.month.target;
  return { on: monthOn(rec, opt), title: `${m.en} Challenge`, he: m.he, xp: Math.min(xp, target), target, fraction: Math.min(1, xp / target), done: r.month.paid || xp >= target, daysLeft: m.daysLeft };
}
