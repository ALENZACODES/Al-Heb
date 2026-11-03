/**
 * ALEF offline Jewish calendar (Lane 1). No network, no dependencies, not Hebcal.
 *
 * 1. Hebrew calendar: the standard arithmetic calendar (molad/dehiyyot rules) as given in
 *    Dershowitz & Reingold, "Calendrical Calculations" (implemented from memory of the published algorithm;
 *    validated only against the dated fixtures in tests/curriculum.calendar.test.js).
 * 2. Holidays: Reform-oriented list, one festival day per festival (see docs/curriculum/calendar-notes.md for
 *    what was and was not verified).
 * 3. Shabbat candle lighting: NOAA-style solar position/sunset (Meeus-based "NOAA solar calculator" equations,
 *    standard atmospheric refraction zenith 90.833 degrees) minus a configurable offset.
 *    Accuracy is NOT validated against an external reference table; expect errors of roughly a minute or two,
 *    and worse at high latitudes. Do not present as a halachic authority.
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

// ---------- Holidays ----------
/**
 * Holiday definitions. `reform` documents the one-day-per-festival convention (see calendar-notes.md).
 * `verified`: "source" = convention backed by a fetched page, "inferred" = derived by us, "unverified" = recalled/assumed.
 */
export const HOLIDAY_DEFS = [
  { id: "rosh-hashanah", en: "Rosh Hashanah", he: "רֹאשׁ הַשָּׁנָה", month: "tishrei", day: 1, days: 1, kind: "major", verified: "source",
    note: "Most North American Reform congregations observe one day; some keep two (reformjudaism.org). Second day (2 Tishrei) is shown as optional." , optionalExtraDays: 1 },
  { id: "yom-kippur", en: "Yom Kippur", he: "יוֹם כִּפּוּר", month: "tishrei", day: 10, days: 1, kind: "major", verified: "inferred" },
  { id: "sukkot", en: "Sukkot", he: "סֻכּוֹת", month: "tishrei", day: 15, days: 7, kind: "major", verified: "inferred",
    note: "7 days (15-21 Tishrei); first day is the full festival day under the one-day convention." },
  { id: "shemini-atzeret", en: "Shemini Atzeret / Simchat Torah", he: "שְׁמִינִי עֲצֶרֶת וְשִׂמְחַת תּוֹרָה", month: "tishrei", day: 22, days: 1, kind: "major", verified: "inferred",
    note: "Combined on 22 Tishrei (the Israeli / one-day convention). Many diaspora congregations of other streams separate them by a day." },
  { id: "hanukkah", en: "Hanukkah", he: "חֲנֻכָּה", month: "kislev", day: 25, days: 8, kind: "minor", verified: "source" },
  { id: "tu-bishvat", en: "Tu BiShvat", he: "טוּ בִּשְׁבָט", month: "shevat", day: 15, days: 1, kind: "minor", verified: "unverified" },
  { id: "purim", en: "Purim", he: "פּוּרִים", month: "ADAR", day: 14, days: 1, kind: "minor", verified: "source",
    note: "Celebrated in Adar II in leap years." },
  { id: "pesach", en: "Pesach (Passover)", he: "פֶּסַח", month: "nisan", day: 15, days: 7, kind: "major", verified: "source",
    note: "Most Reform communities keep 7 days (15-21 Nisan) (reformjudaism.org); some Reform households still hold a second seder on night 2." },
  { id: "shavuot", en: "Shavuot", he: "שָׁבוּעוֹת", month: "sivan", day: 6, days: 1, kind: "major", verified: "inferred" },
  { id: "tisha-bav", en: "Tisha B'Av", he: "תִּשְׁעָה בְּאָב", month: "av", day: 9, days: 1, kind: "fast", verified: "unverified",
    note: "Moved to 10 Av when 9 Av falls on Shabbat (standard rule; not verified from a fetched source here). Reform observance varies." },
];

function hebrewYearOf(g) { return toHebrew(g).year; }

/** Holidays whose first day falls in Hebrew year `year`. Returns sorted array of occurrence records. */
export function holidaysInHebrewYear(year) {
  const out = [];
  for (const def of HOLIDAY_DEFS) {
    let month = def.month;
    if (month === "ADAR") month = isHebrewLeapYear(year) ? "adar2" : "adar";
    let start = fromHebrew({ year, month, day: def.day });
    if (def.id === "tisha-bav" && weekday(start) === 6) start = addDays(start, 1);
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

/** Holidays that overlap [fromISO, toISO]. */
export function holidaysBetween(fromISO, toISO) {
  const y0 = hebrewYearOf(parseISO(fromISO)), y1 = hebrewYearOf(parseISO(toISO));
  const all = [];
  for (let y = y0 - 1; y <= y1 + 1; y++) all.push(...holidaysInHebrewYear(y));
  return all.filter((h) => h.end >= fromISO && h.start <= toISO).sort((a, b) => a.start.localeCompare(b.start));
}

/** Next `count` holidays whose last day is on/after `fromISO`. */
export function nextHolidays(fromISO, count = 3) {
  const y = hebrewYearOf(parseISO(fromISO));
  const all = [...holidaysInHebrewYear(y - 1), ...holidaysInHebrewYear(y), ...holidaysInHebrewYear(y + 1)];
  return all.filter((h) => h.end >= fromISO).sort((a, b) => a.start.localeCompare(b.start)).slice(0, count);
}

// ---------- Solar / candle lighting ----------
const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

function julianCentury(g) {
  // JD at 12:00 UT of the civil date; centuries since J2000.0
  const jd = toRD(g) + 1721424.5 + 0.5;
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
 * Sunset instant (UTC) on civil date `g` at (lat, lon east-positive). Returns null in polar day/night.
 * The date is the LOCAL SOLAR date at that longitude (noon = 720 - 4*lon - eqTime minutes after 00:00 UT).
 * @returns {Date|null}
 */
export function sunset(g, lat, lon) {
  const { decl, eqTime } = solarPosition(julianCentury(g));
  const cosH = Math.cos(rad(90.833)) / (Math.cos(rad(lat)) * Math.cos(rad(decl))) - Math.tan(rad(lat)) * Math.tan(rad(decl));
  if (cosH > 1 || cosH < -1) return null;
  const H = deg(Math.acos(cosH));
  const minutesUT = 720 - 4 * lon - eqTime + 4 * H;
  return new Date(Date.UTC(g.y, g.m - 1, g.d) + minutesUT * 60000);
}

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

/** Format an instant as HH:MM in an IANA time zone (uses built-in Intl, works offline); falls back to UTC. */
export function formatTime(date, timeZone) {
  try {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timeZone || "UTC" }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }).format(date);
  }
}
