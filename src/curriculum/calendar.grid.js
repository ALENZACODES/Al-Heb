/**
 * Pure data builders for the calendar grid (Lane 1): a Gregorian month with the Hebrew date on every day, holidays,
 * Rosh Chodesh and the weekly Torah portion on Saturdays. No DOM here; calendar.view.js renders it.
 */
import {
  toRD, fromRD, isoDate, parseISO, weekday, addDays, toHebrew, HEBREW_MONTH_NAMES, hebrewNumeral, hebrewYearLabel, holidaysBetween,
} from "./calendar.js";
import { parshaOnShabbat } from "./calendar.parsha.js";

export const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** {y,m,d} -> {year, month (key), day, monthEn, monthHe, label (e.g. "27 Cheshvan 5787"), dayHe (e.g. כ״ז)} */
export function hebrewInfo(g) {
  const h = toHebrew(g);
  const mn = HEBREW_MONTH_NAMES[h.month];
  return { ...h, monthEn: mn.en, monthHe: mn.he, label: `${h.day} ${mn.en} ${h.year}`, dayHe: hebrewNumeral(h.day), yearHe: hebrewYearLabel(h.year) };
}

/** Map ISO date -> [{id, en, he, kind, dayIndex, days, first}] for all holidays touching [fromISO, toISO]. */
export function holidayDayMap(fromISO, toISO, mode = "reform") {
  const map = new Map();
  for (const h of holidaysBetween(fromISO, toISO, { mode, roshChodesh: true })) {
    for (let i = 0; i < h.days; i++) {
      const iso = isoDate(addDays(parseISO(h.start), i));
      if (iso < fromISO || iso > toISO) continue;
      (map.get(iso) || map.set(iso, []).get(iso)).push({ id: h.id, en: h.en, he: h.he, kind: h.kind, dayIndex: i + 1, days: h.days, first: i === 0, eve: h.eve });
    }
  }
  return map;
}

/**
 * @param {number} y Gregorian year
 * @param {number} m month 1..12
 * @param {{mode?:"reform"|"traditional"|"israel", israel?:boolean}} [opt]  mode = holiday day-count convention; israel = Israeli Torah-reading schedule
 * @returns {{y,m,title,hebrewRange,weeks:object[][]}} weeks of 7 cells, Sunday first
 */
export function monthGrid(y, m, opt = {}) {
  const first = { y, m, d: 1 };
  const gridStart = addDays(first, -weekday(first));
  const daysInMonth = toRD({ y: m === 12 ? y + 1 : y, m: m === 12 ? 1 : m + 1, d: 1 }) - toRD(first);
  const last = addDays(first, daysInMonth - 1);
  const gridEnd = addDays(last, 6 - weekday(last));
  const hmap = holidayDayMap(isoDate(gridStart), isoDate(gridEnd), opt.mode);
  const weeks = [];
  for (let rd = toRD(gridStart); rd <= toRD(gridEnd); rd += 7) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const g = fromRD(rd + i), iso = isoDate(g), h = hebrewInfo(g);
      const hols = hmap.get(iso) || [];
      const isShabbat = i === 6;
      const parsha = isShabbat ? parshaOnShabbat(g, { israel: !!opt.israel }) : null;
      week.push({
        g, iso, inMonth: g.m === m, weekday: i, isShabbat, isFriday: i === 5,
        hebrew: h, holidays: hols, parsha,
        // text shown under the date
        label: [...hols.map((x) => (x.first || x.days === 1 ? x.en : `${x.en} (day ${x.dayIndex})`)), parsha ? parsha.en : isShabbat && !hols.length ? "Shabbat" : null].filter(Boolean).join("; "),
      });
    }
    weeks.push(week);
  }
  const hFirst = hebrewInfo(first), hLast = hebrewInfo(last);
  const range = hFirst.month === hLast.month && hFirst.year === hLast.year
    ? `${hFirst.monthEn} ${hFirst.year}`
    : `${hFirst.monthEn}${hFirst.year !== hLast.year ? " " + hFirst.year : ""} – ${hLast.monthEn} ${hLast.year}`;
  const rangeHe = hFirst.month === hLast.month && hFirst.year === hLast.year
    ? `${hFirst.monthHe} ${hFirst.yearHe}` : `${hFirst.monthHe} – ${hLast.monthHe} ${hLast.yearHe}`;
  return { y, m, title: `${MONTHS_EN[m - 1]} ${y}`, hebrewRange: range, hebrewRangeHe: rangeHe, weeks };
}

/** Compact data for a year view: 12 months, each with weeks of {d, inMonth, holiday:boolean, shabbat:boolean}. */
export function yearGrid(y, opt = {}) {
  const hmap = holidayDayMap(`${y}-01-01`, `${y}-12-31`, opt.mode);
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const g = monthGrid(y, m, opt);
    months.push({
      m, title: MONTHS_EN[m - 1], hebrewRange: g.hebrewRange,
      weeks: g.weeks.map((w) => w.map((c) => ({ iso: c.iso, d: c.g.d, inMonth: c.inMonth, holiday: c.inMonth && hmap.has(c.iso) && hmap.get(c.iso).some((x) => x.kind !== "roshchodesh"), roshChodesh: c.inMonth && (hmap.get(c.iso) || []).some((x) => x.kind === "roshchodesh"), shabbat: c.isShabbat }))),
    });
  }
  return { y, months };
}

/** Everything the app knows about one day, for the detail panel. */
export function dayDetail(g, opt = {}) {
  const iso = isoDate(g);
  const h = hebrewInfo(g);
  const hols = holidayDayMap(iso, iso, opt.mode).get(iso) || [];
  const eveOf = holidayDayMap(isoDate(addDays(g, 1)), isoDate(addDays(g, 1)), opt.mode).get(isoDate(addDays(g, 1))) || [];
  const parsha = weekday(g) === 6 ? parshaOnShabbat(g, { israel: !!opt.israel }) : null;
  return { iso, weekdayName: WEEKDAYS_EN[weekday(g)], hebrew: h, holidays: hols, eveOf: eveOf.filter((x) => x.first), parsha };
}
