/**
 * ALEF offline Jewish calendar (Lane 1). No network, no dependencies, not Hebcal.
 *
 * 1. Hebrew calendar: the standard arithmetic calendar (molad/dehiyyot rules) as given in
 *    Dershowitz & Reingold, "Calendrical Calculations" (implemented from memory of the published algorithm;
 *    validated only against the dated fixtures in tests/curriculum.calendar.test.js).
 * 2. Holidays: Reform-oriented list, one festival day per festival (see docs/curriculum/calendar-notes.md for
 *    what was and was not verified). `mode` option: "reform" (default), "traditional" (diaspora two-day yom tov)
 *    and "israel".
 * 3. Shabbat candle lighting and havdalah: NOAA-style solar position (Meeus-based "NOAA solar calculator"
 *    equations, standard atmospheric refraction zenith 90.833 degrees) minus a configurable offset; havdalah is
 *    either N minutes after sunset or the sun 8.5 degrees below the horizon.
 *    Cross-checked 2026-11-03/04 against Hebcal (see docs/curriculum/calendar-notes.md and
 *    docs/verification/VERIFICATION.md 1b): candle lighting differs by at most 1 minute (2 at 64N) in the cities
 *    tested. That validates the arithmetic against Hebcal, which is itself a calculation; it is NOT a halachic
 *    authority.
 *
 * Dates here are plain {y, m, d} Gregorian civil dates (m = 1..12) unless noted.
 */

// ---------- day-number helpers (R.D.: 0001-01-01 Gregorian = 1) ----------
const RD_UNIX_EPOCH = 719163;
const MS_DAY = 86400000;

export function toRD({ y, m, d }) {
  return Math.round(Date.UTC(y, m - 1, d) / MS_DAY) + RD_UNIX_EPOCH;
}
export function fromRD(rd) {
  const dt = new Date((rd - RD_UNIX_EPOCH) * MS_DAY);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}
// Date.UTC maps years 0..99 to 1900+; we only support years >= 1000 so that's fine.
export const isoDate = ({ y, m, d }) => `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
export const parseISO = (s) => { const [y, m, d] = s.split("-").map(Number); return { y, m, d }; };
export const weekday = (g) => (toRD(g) % 7 + 7) % 7; // 0 = Sunday ... 6 = Saturday (RD 1 is Monday)
export function addDays(g, n) { return fromRD(toRD(g) + n); }

// ---------- Hebrew calendar ----------
const HEBREW_EPOCH = -1373427; // R.D. of 1 Tishrei, AM 1

export const isHebrewLeapYear = (y) => (((7 * y + 1) % 19) + 19) % 19 < 7;

function elapsedDays(y) {
  const months = Math.floor((235 * y - 234) / 19);
  const parts = 12084 + 13753 * months;
  const days = 29 * months + Math.floor(parts / 25920);
  return (3 * (days + 1)) % 7 < 3 ? days + 1 : days;
}
function yearDelay(y) {
  const a = elapsedDays(y - 1), b = elapsedDays(y), c = elapsedDays(y + 1);
  if (c - b === 356) return 2;
  if (b - a === 382) return 1;
  return 0;
}
/** R.D. of 1 Tishrei of Hebrew year y. */
export const hebrewNewYearRD = (y) => HEBREW_EPOCH + elapsedDays(y) + yearDelay(y);
export const hebrewYearLength = (y) => hebrewNewYearRD(y + 1) - hebrewNewYearRD(y);

/** Month keys in civil order starting at Tishrei; "adar1" only exists in leap years. */
export function monthsOfYear(y) {
  const len = hebrewYearLength(y);
  const cheshvan = len % 10 === 5 ? 30 : 29;
  const kislev = len % 10 === 3 ? 29 : 30;
  const list = [
    ["tishrei", 30], ["cheshvan", cheshvan], ["kislev", kislev], ["tevet", 29], ["shevat", 30],
  ];
  if (isHebrewLeapYear(y)) list.push(["adar1", 30], ["adar2", 29]); else list.push(["adar", 29]);
  list.push(["nisan", 30], ["iyar", 29], ["sivan", 30], ["tammuz", 29], ["av", 30], ["elul", 29]);
  return list.map(([key, days]) => ({ key, days }));
}

export const HEBREW_MONTH_NAMES = {
  tishrei: { en: "Tishrei", he: "תִּשְׁרֵי" }, cheshvan: { en: "Cheshvan", he: "חֶשְׁוָן" },
  kislev: { en: "Kislev", he: "כִּסְלֵו" }, tevet: { en: "Tevet", he: "טֵבֵת" },
  shevat: { en: "Shevat", he: "שְׁבָט" }, adar: { en: "Adar", he: "אֲדָר" },
  adar1: { en: "Adar I", he: "אֲדָר א׳" }, adar2: { en: "Adar II", he: "אֲדָר ב׳" },
  nisan: { en: "Nisan", he: "נִיסָן" }, iyar: { en: "Iyar", he: "אִיָּר" }, sivan: { en: "Sivan", he: "סִיוָן" },
  tammuz: { en: "Tammuz", he: "תַּמּוּז" }, av: { en: "Av", he: "אָב" }, elul: { en: "Elul", he: "אֱלוּל" },
};

/** Gregorian {y,m,d} -> {year, month(key), day}. Year numbers roll over at Tishrei. */
export function toHebrew(g) {
  const rd = toRD(g);
  let year = g.y + 3760;
  while (hebrewNewYearRD(year + 1) <= rd) year++;
  while (hebrewNewYearRD(year) > rd) year--;
  let left = rd - hebrewNewYearRD(year);
  for (const mo of monthsOfYear(year)) {
    if (left < mo.days) return { year, month: mo.key, day: left + 1 };
    left -= mo.days;
  }
  throw new Error("unreachable");
}

/** Hebrew {year, month key, day} -> Gregorian {y,m,d}. */
export function fromHebrew({ year, month, day }) {
  let rd = hebrewNewYearRD(year);
  for (const mo of monthsOfYear(year)) {
    if (mo.key === month) return fromRD(rd + day - 1);
    rd += mo.days;
  }
  throw new RangeError(`no month ${month} in Hebrew year ${year}`);
}

// ---------- Hebrew numerals (for the date grid) ----------
/** 1..999 as Hebrew letters with geresh/gershayim, e.g. 15 -> ט״ו, 30 -> ל׳. */
export function hebrewNumeral(n) {
  const ones = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
  const tens = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
  const hund = ["", "ק", "ר", "ש", "ת"];
  if (!Number.isInteger(n) || n < 1 || n > 999) throw new RangeError("hebrewNumeral: 1..999");
  let s = "";
  let h = n;
  while (h >= 400) { s += "ת"; h -= 400; }
  s += hund[Math.floor(h / 100)]; h %= 100;
  if (h === 15) s += "טו"; else if (h === 16) s += "טז";
  else { s += tens[Math.floor(h / 10)] + ones[h % 10]; }
  return s.length === 1 ? s + "׳" : s.slice(0, -1) + "״" + s.slice(-1);
}
/** Hebrew year without the thousands, e.g. 5787 -> תשפ״ז. */
export const hebrewYearLabel = (year) => hebrewNumeral(year % 1000);

// ---------- Holidays ----------
/**
 * Holiday definitions. `reform` documents the one-day-per-festival convention (see calendar-notes.md).
 * `verified`: "source" = convention or date backed by a fetched page (and, for dates, equal to Hebcal for Hebrew
 * years 5758-5900 in tests/calendar.hebcal-check.mjs), "inferred" = derived by us, "unverified" = recalled/assumed.
 * `rule` names a Gregorian-weekday adjustment for the modern Israeli days (see applyRule).
 */
export const HOLIDAY_DEFS = [
  { id: "rosh-hashanah", en: "Rosh Hashanah", he: "רֹאשׁ הַשָּׁנָה", month: "tishrei", day: 1, days: 1, kind: "major", verified: "source",
    note: "Most North American Reform congregations observe one day; some keep two (reformjudaism.org). Second day (2 Tishrei) is shown as optional." , optionalExtraDays: 1 },
  { id: "yom-kippur", en: "Yom Kippur", he: "יוֹם כִּפּוּר", month: "tishrei", day: 10, days: 1, kind: "major", verified: "inferred",
    note: "One day in every stream of Judaism (10 Tishrei)." },
  { id: "sukkot", en: "Sukkot", he: "סֻכּוֹת", month: "tishrei", day: 15, days: 7, kind: "major", verified: "inferred",
    note: "7 days (15-21 Tishrei); first day is the full festival day under the one-day convention." },
  { id: "shemini-atzeret", en: "Shemini Atzeret / Simchat Torah", he: "שְׁמִינִי עֲצֶרֶת וְשִׂמְחַת תּוֹרָה", month: "tishrei", day: 22, days: 1, kind: "major", verified: "source",
    note: "Combined on 22 Tishrei in Israel and in Reform congregations (reformjudaism.org Simchat Torah page). Many diaspora congregations of other streams separate them by a day." },
  { id: "hanukkah", en: "Hanukkah", he: "חֲנֻכָּה", month: "kislev", day: 25, days: 8, kind: "minor", verified: "source" },
  { id: "tu-bishvat", en: "Tu BiShvat", he: "טוּ בִּשְׁבָט", month: "shevat", day: 15, days: 1, kind: "minor", verified: "source" },
  { id: "purim", en: "Purim", he: "פּוּרִים", month: "ADAR", day: 14, days: 1, kind: "minor", verified: "source",
    note: "Celebrated in Adar II in leap years." },
  { id: "pesach", en: "Pesach (Passover)", he: "פֶּסַח", month: "nisan", day: 15, days: 7, kind: "major", verified: "source",
    note: "Most Reform communities keep 7 days (15-21 Nisan) (reformjudaism.org); some Reform households still hold a second seder on night 2." },
  { id: "yom-hashoah", en: "Yom HaShoah (Holocaust Remembrance Day)", he: "יוֹם הַשּׁוֹאָה", month: "nisan", day: 27, days: 1, kind: "modern", rule: "shoah", verified: "source",
    note: "27 Nisan; moved to Thursday if it falls on Friday and to Monday if it falls on Sunday (dates equal Hebcal for 5758-5900)." },
  { id: "yom-hazikaron", en: "Yom HaZikaron (Israel Memorial Day)", he: "יוֹם הַזִּכָּרוֹן", month: "iyar", day: 4, days: 1, kind: "modern", rule: "zikaron", verified: "source",
    note: "The day before Yom HaAtzmaut; shifts with it (dates equal Hebcal for 5758-5900)." },
  { id: "yom-haatzmaut", en: "Yom HaAtzmaut (Israel Independence Day)", he: "יוֹם הָעַצְמָאוּת", month: "iyar", day: 5, days: 1, kind: "modern", rule: "atzmaut", verified: "source",
    note: "5 Iyar; moved to Thursday if it falls on Friday or Saturday, and to Tuesday if it falls on Monday (dates equal Hebcal for 5758-5900)." },
  { id: "shavuot", en: "Shavuot", he: "שָׁבוּעוֹת", month: "sivan", day: 6, days: 1, kind: "major", verified: "inferred" },
  { id: "tisha-bav", en: "Tisha B'Av", he: "תִּשְׁעָה בְּאָב", month: "av", day: 9, days: 1, kind: "fast", verified: "source",
    note: "Never observed on Shabbat: when 9 Av is Saturday the fast moves to 10 Av (Hebcal). Reform observance varies (reformjudaism.org: the Temple has no central religious role in liberal Judaism)." },
];

/** Observance modes. "reform" is the default and matches the one-day-per-festival convention above. */
export const OBSERVANCE_MODES = ["reform", "traditional", "israel"];

function applyRule(rule, start) {
  const dow = weekday(start);
  if (rule === "shoah") return dow === 5 ? addDays(start, -1) : dow === 0 ? addDays(start, 1) : start;
  if (rule === "atzmaut") return dow === 5 ? addDays(start, -1) : dow === 6 ? addDays(start, -2) : dow === 1 ? addDays(start, 1) : start;
  if (rule === "zikaron") { const az = applyRule("atzmaut", addDays(start, 1)); return addDays(az, -1); }
  return start;
}

function modeAdjust(def, mode) {
  if (mode === "traditional") {
    if (def.id === "rosh-hashanah") return { ...def, days: 2, optionalExtraDays: 0, note: "Two days in traditional diaspora practice (1-2 Tishrei)." };
    if (def.id === "pesach") return { ...def, days: 8, note: "Eight days (15-22 Nisan) in traditional diaspora practice." };
    if (def.id === "shavuot") return { ...def, days: 2, note: "Two days (6-7 Sivan) in traditional diaspora practice." };
    if (def.id === "shemini-atzeret") return { ...def, en: "Shemini Atzeret", he: "שְׁמִינִי עֲצֶרֶת", note: "22 Tishrei; Simchat Torah follows on 23 Tishrei in traditional diaspora practice." };
  }
  if (mode === "israel" && def.id === "rosh-hashanah") return { ...def, days: 2, optionalExtraDays: 0, note: "Two days (1-2 Tishrei), also in Israel." };
  return def;
}

const SIMCHAT_TORAH_TRADITIONAL = { id: "simchat-torah", en: "Simchat Torah", he: "שִׂמְחַת תּוֹרָה", month: "tishrei", day: 23, days: 1, kind: "major", verified: "source" };

function hebrewYearOf(g) { return toHebrew(g).year; }

/**
 * Holidays whose first day falls in Hebrew year `year`. Returns sorted array of occurrence records.
 * @param {number} year Hebrew year
 * @param {{mode?:"reform"|"traditional"|"israel"}} [opts]
 */
export function holidaysInHebrewYear(year, opts = {}) {
  const mode = OBSERVANCE_MODES.includes(opts.mode) ? opts.mode : "reform";
  const defs = HOLIDAY_DEFS.map((d) => modeAdjust(d, mode));
  if (mode === "traditional") defs.push(SIMCHAT_TORAH_TRADITIONAL);
  const out = [];
  for (const def of defs) {
    let month = def.month;
    if (month === "ADAR") month = isHebrewLeapYear(year) ? "adar2" : "adar";
    let start = fromHebrew({ year, month, day: def.day });
    if (def.id === "tisha-bav" && weekday(start) === 6) start = addDays(start, 1);
    if (def.rule) start = applyRule(def.rule, start);
    const end = addDays(start, def.days - 1);
    out.push({
      id: def.id, en: def.en, he: def.he, kind: def.kind, hebrewYear: year,
      start: isoDate(start), end: isoDate(end), days: def.days,
      eve: isoDate(addDays(start, -1)), // evening on which the observance begins
      optionalExtraDays: def.optionalExtraDays || 0, verified: def.verified, note: def.note || "",
    });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Rosh Chodesh occurrences (first day of each Hebrew month except Tishrei, plus the 30th of the previous month
 * when it has 30 days) whose days touch Hebrew year `year`. `start`/`end` are ISO dates; `days` is 1 or 2.
 */
export function roshChodeshInHebrewYear(year) {
  const out = [];
  const months = monthsOfYear(year);
  let rd = hebrewNewYearRD(year);
  months.forEach((mo, i) => {
    if (i > 0) {
      const prev = months[i - 1];
      const two = prev.days === 30;
      const start = fromRD(two ? rd - 1 : rd);
      const names = HEBREW_MONTH_NAMES[mo.key];
      out.push({ id: `rosh-chodesh-${mo.key}`, en: `Rosh Chodesh ${names.en}`, he: `רֹאשׁ חֹדֶשׁ ${names.he}`, kind: "roshchodesh", hebrewYear: year,
        month: mo.key, start: isoDate(start), end: isoDate(fromRD(rd)), days: two ? 2 : 1, eve: isoDate(addDays(start, -1)), optionalExtraDays: 0, verified: "source", note: "" });
    }
    rd += mo.days;
  });
  return out;
}

/** Holidays that overlap [fromISO, toISO]. `opts.mode` as in holidaysInHebrewYear; `opts.roshChodesh` adds Rosh Chodesh. */
export function holidaysBetween(fromISO, toISO, opts = {}) {
  const y0 = hebrewYearOf(parseISO(fromISO)), y1 = hebrewYearOf(parseISO(toISO));
  const all = [];
  for (let y = y0 - 1; y <= y1 + 1; y++) {
    all.push(...holidaysInHebrewYear(y, opts));
    if (opts.roshChodesh) all.push(...roshChodeshInHebrewYear(y));
  }
  return all.filter((h) => h.end >= fromISO && h.start <= toISO).sort((a, b) => a.start.localeCompare(b.start));
}

/** Next `count` holidays whose last day is on/after `fromISO`. */
export function nextHolidays(fromISO, count = 3, opts = {}) {
  const y = hebrewYearOf(parseISO(fromISO));
  const all = [...holidaysInHebrewYear(y - 1, opts), ...holidaysInHebrewYear(y, opts), ...holidaysInHebrewYear(y + 1, opts)];
  return all.filter((h) => h.end >= fromISO).sort((a, b) => a.start.localeCompare(b.start)).slice(0, count);
}

// ---------- Solar / candle lighting ----------
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

function julianCentury(g, minutesUT = 720) {
  // JD of the civil date at `minutesUT` after 00:00 UT; centuries since J2000.0
  const jd = toRD(g) + 1721424.5 + minutesUT / 1440;
  return (jd - 2451545.0) / 36525;
}

/** NOAA solar position at Julian century T: declination (deg) and equation of time (minutes). */
export function solarPosition(T) {
  const L0 = (((280.46646 + T * (36000.76983 + T * 0.0003032)) % 360) + 360) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(rad(M)) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * T) + Math.sin(rad(3 * M)) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const appLong = trueLong - 0.00569 - 0.00478 * Math.sin(rad(omega));
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(rad(omega));
  const decl = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(appLong))));
  const y = Math.tan(rad(eps / 2)) ** 2;
  const eqTime = 4 * deg(
    y * Math.sin(2 * rad(L0)) - 2 * e * Math.sin(rad(M)) + 4 * e * y * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) -
    0.5 * y * y * Math.sin(4 * rad(L0)) - 1.25 * e * e * Math.sin(2 * rad(M)));
  return { decl, eqTime };
}

/**
 * Instant (UTC) when the sun crosses `zenithDeg` (90.833 = sunrise/sunset with refraction; 98.5 = 8.5 degrees below
 * the horizon) on civil date `g` at (lat, lon east-positive). Returns null when it does not happen (polar day/night).
 * The date is the LOCAL SOLAR date at that longitude. One refinement pass re-evaluates the sun's declination at
 * the event time instead of at 12:00 UT.
 * @returns {Date|null}
 */
export function sunTime(g, lat, lon, zenithDeg, rising = false) {
  let minutes = 720;
  for (let pass = 0; pass < 2; pass++) {
    const { decl, eqTime } = solarPosition(julianCentury(g, minutes));
    const cosH = Math.cos(rad(zenithDeg)) / (Math.cos(rad(lat)) * Math.cos(rad(decl))) - Math.tan(rad(lat)) * Math.tan(rad(decl));
    if (cosH > 1 || cosH < -1) return null;
    const H = deg(Math.acos(cosH));
    minutes = 720 - 4 * lon - eqTime + (rising ? -4 : 4) * H;
  }
  return new Date(Date.UTC(g.y, g.m - 1, g.d) + minutes * 60000);
}

/** Sunset instant (UTC) on civil date `g` (zenith 90.833). Null in polar day/night. @returns {Date|null} */
export function sunset(g, lat, lon) { return sunTime(g, lat, lon, 90.833, false); }

export const DEFAULT_CANDLE_OFFSET_MIN = 18;
export const JERUSALEM_CANDLE_OFFSET_MIN = 40;

/** Friday on or after the given civil date. */
export function fridayOnOrAfter(g) {
  return addDays(g, (5 - weekday(g) + 7) % 7);
}

/**
 * Candle lighting for the Friday on/after `g`.
 * @param {{y,m,d}} g
 * @param {{lat:number, lon:number, offsetMinutes?:number}} loc  lon east-positive (Toronto = -79.4)
 * @returns {{date:{y,m,d}, sunset:Date, candles:Date}|null}
 */
export function candleLighting(g, loc) {
  const fri = fridayOnOrAfter(g);
  const ss = sunset(fri, loc.lat, loc.lon);
  if (!ss) return null;
  const off = loc.offsetMinutes ?? DEFAULT_CANDLE_OFFSET_MIN;
  return { date: fri, sunset: ss, candles: new Date(ss.getTime() - off * 60000) };
}

/** Conservative whole-minute display: candle lighting is shown rounded DOWN (never later than the exact time). */
export const floorToMinute = (date) => new Date(Math.floor(date.getTime() / 60000) * 60000);
/** Havdalah is shown rounded to the nearest minute (matches Hebcal in tests/calendar.tools/compare-times.mjs). */
export const roundToMinute = (date) => new Date(Math.round(date.getTime() / 60000) * 60000);

export const DEFAULT_HAVDALAH = Object.freeze({ mode: "tzeit", degrees: 8.5, minutes: 50 });

/**
 * Havdalah for the Saturday on/after `g`.
 * @param {{y,m,d}} g
 * @param {{lat:number, lon:number}} loc
 * @param {{mode?:"tzeit"|"minutes", degrees?:number, minutes?:number}} [opt]
 *   mode "tzeit" = sun `degrees` (default 8.5) below the horizon; mode "minutes" = `minutes` after sunset.
 * @returns {{date:{y,m,d}, sunset:Date, havdalah:Date}|null}  null when the sun never reaches that angle (high latitudes).
 */
export function havdalah(g, loc, opt = {}) {
  const sat = addDays(g, (6 - weekday(g) + 7) % 7);
  const ss = sunset(sat, loc.lat, loc.lon);
  if (!ss) return null;
  const mode = opt.mode || DEFAULT_HAVDALAH.mode;
  let at;
  if (mode === "minutes") at = new Date(ss.getTime() + (opt.minutes ?? DEFAULT_HAVDALAH.minutes) * 60000);
  else {
    at = sunTime(sat, loc.lat, loc.lon, 90 + (opt.degrees ?? DEFAULT_HAVDALAH.degrees), false);
    if (!at) return null;
  }
  return { date: sat, sunset: ss, havdalah: at };
}

/** Saturday on or after the given civil date. */
export function saturdayOnOrAfter(g) { return addDays(g, (6 - weekday(g) + 7) % 7); }

/** Format an instant as HH:MM in an IANA time zone (uses built-in Intl, works offline); falls back to UTC. */
export function formatTime(date, timeZone) {
  try {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timeZone || "UTC" }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(date);
  }
}
