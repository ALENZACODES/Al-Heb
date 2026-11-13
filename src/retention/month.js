// @ts-check
// The month's challenge: one longer goal that runs with the Hebrew month (Rosh Chodesh to Rosh Chodesh), named after
// it ("Kislev Challenge"). The target is set once, when the month is first seen, from the learner's own daily goal.
// Month names and dates come from the app's calendar (src/curriculum/calendar.js); no new Hebrew is written here.
// Opens after 5 finished lessons, never in calm mode. Seasons (T6) rotate games already in the catalogue with the
// same calendar: the Kislev Challenge is one instance, not a one-off. Pure functions.
import { toHebrew, parseISO, HEBREW_MONTH_NAMES } from '../curriculum/calendar.js';
import { clone } from './state.js';
import { dayKey, addDaysISO } from './clock.js';
import { earn } from './gems.js';

export const MONTH = Object.freeze({ unlockLessons: 5, goalDays: 15, gems: 50, minTarget: 100 });
/** Seasonal content already in the catalogue, keyed by the calendar's Hebrew month. Games arrive and leave with the month. */
export const SEASONS = Object.freeze([
  { id: 'tishrei', months: ['tishrei'], text: 'Games for the new year and the booth are here this month. They leave when Tishrei ends.', items: [{ title: 'Shofar Echo', href: '#/g5-shofar' }, { title: 'Sukkah Builder', href: '#/g5-sukkah' }] },
  { id: 'cheshvan', months: ['cheshvan'], text: 'A quieter month. The month challenge still runs; seasonal games return next month.', items: [] },
  { id: 'lights', months: ['kislev'], text: 'Hanukkah games from the catalogue are here for Kislev. They leave when the month ends.', items: [{ title: 'Dreidel, Beginner 1', href: '#/hanukkah-dreidel1' }, { title: 'Candle Blow-Out', href: '#/hanukkah-candles' }] },
  { id: 'tevet', months: ['tevet'], text: 'The lights season has ended. The month challenge still runs.', items: [] },
  { id: 'shevat', months: ['shevat'], text: 'Games for the trees and the seven species are here this month. They leave when Shevat ends.', items: [{ title: 'Seven Species', href: '#/g5-harvest' }] },
  { id: 'adar', months: ['adar', 'adar2'], text: 'Purim games from the catalogue are here this month. They leave when Adar ends.', items: [{ title: 'Grogger', href: '#/g5-grogger' }, { title: 'Mishloach Manot', href: '#/g5-gifts' }] },
  { id: 'nisan', months: ['nisan'], text: 'Pesach games from the catalogue are here this month. They leave when Nisan ends.', items: [{ title: 'Seder Plate', href: '#/g5-plate' }, { title: 'The Four Questions', href: '#/g5-questions' }] },
  { id: 'iyar', months: ['iyar'], text: 'Games for remembrance and independence are here this month. They leave when Iyar ends.', items: [{ title: 'Independence Fireworks', href: '#/g5-fireworks' }] },
  { id: 'sivan', months: ['sivan'], text: 'The counting game from the catalogue is here this month. It leaves when Sivan ends.', items: [{ title: 'Count to Shavuot', href: '#/g5-omer' }] },
  { id: 'tammuz', months: ['tammuz'], text: 'A quieter month. The month challenge still runs; seasonal games return later.', items: [] },
  { id: 'av', months: ['av'], text: 'Holiday readings from the catalogue are here this month. They leave when Av ends.', items: [{ title: 'Holiday Readings', href: '#/g5-readings' }] },
  { id: 'elul', months: ['elul'], text: 'The shofar game returns this month, ahead of the new year. It leaves when Elul ends.', items: [{ title: 'Shofar Echo', href: '#/g5-shofar' }] },
]);
const monthKeyOf = (m) => (m.key || '').split('-').slice(1).join('-');
export function seasonOf(now = Date.now()) {
  const m = monthOf(now);
  const def = SEASONS.find((s) => s.months.includes(monthKeyOf(m))) || { id: 'open', months: [], text: 'The month challenge is running.', items: [] };
  return { id: def.id, title: `${m.en} season`, text: def.text, items: def.items, month: m.en, key: m.key };
}


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
  const season = seasonOf(now);
  return { on: monthOn(rec, opt), title: `${m.en} Challenge`, he: m.he, xp: Math.min(xp, target), target, fraction: Math.min(1, xp / target), done: r.month.paid || xp >= target, daysLeft: m.daysLeft, season };
}
