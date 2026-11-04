/**
 * Weekly Torah portion (parashat hashavua), computed offline from the Hebrew year type (Lane 1).
 *
 * Method: the reading for any Shabbat depends only on (a) the weekday of 1 Tishrei, (b) the length of the Hebrew year
 * and (c) the Israel/diaspora schedule. data/calendar/parsha.json holds the 14 x 2 resulting tables. They were
 * derived from Hebcal's output for Hebrew years 5740-5900 (tests/calendar.tools/build-parsha.mjs) and checked
 * two ways: every year of the same type has an identical sequence, and tables learned from years <= 5820 reproduce
 * 5821-5900. calendar.js supplies the date arithmetic. This is Hebcal's schedule, not an independent source.
 *
 * Reform note: Reform congregations in the diaspora normally follow the diaspora schedule even though they keep
 * one day of yom tov; in years when the eighth day of Pesach or the second day of Shavuot / Shemini Atzeret falls
 * on Shabbat the Israeli and diaspora schedules differ for several weeks, and a congregation may follow either. The
 * default here is diaspora outside Israel; the `israel` option selects the Israeli schedule.
 */
import { loadJSON } from "./data.js";
import { toRD, weekday, toHebrew, hebrewNewYearRD, hebrewYearLength, addDays } from "./calendar.js";

const data = await loadJSON("data/calendar/parsha.json");
export const PARSHA_DATA = data;

/** @param {number|number[]} entry */
function describe(entry) {
  const ids = Array.isArray(entry) ? entry : [entry];
  const parts = ids.map((n) => data.names[n]);
  return {
    ids,
    en: parts.map((p) => p.en).join("-"),
    he: parts.map((p) => p.he).join("־"), // joined with maqaf; names are unpointed (as supplied by Hebcal)
    double: ids.length > 1,
  };
}

/**
 * Torah portion read on the Shabbat that falls on civil date `g`.
 * @param {{y,m,d}} g must be a Saturday (else a RangeError)
 * @param {{israel?:boolean}} [opt]
 * @returns {{ids:number[], en:string, he:string, double:boolean, hebrewYear:number}|null} null when the Shabbat has no
 *   regular portion (Rosh Hashanah, Yom Kippur, Sukkot/Pesach/Shavuot festival Shabbat, etc.).
 */
export function parshaOnShabbat(g, opt = {}) {
  if (weekday(g) !== 6) throw new RangeError("parshaOnShabbat: not a Saturday");
  const year = toHebrew(g).year;
  const rh = hebrewNewYearRD(year);
  const dow = (rh % 7 + 7) % 7;
  const table = data[opt.israel ? "il" : "dia"][`${dow}-${hebrewYearLength(year)}`];
  const first = rh + ((6 - dow + 7) % 7);
  const idx = (toRD(g) - first) / 7;
  const entry = table?.[idx];
  return entry == null ? null : { ...describe(entry), hebrewYear: year };
}

/** Saturdays in [fromISO, toISO] with their portion (or null). */
export function shabbatotBetween(from, to, opt = {}) {
  const out = [];
  let g = addDays(from, (6 - weekday(from) + 7) % 7);
  while (toRD(g) <= toRD(to)) { out.push({ date: g, parsha: parshaOnShabbat(g, opt) }); g = addDays(g, 7); }
  return out;
}

