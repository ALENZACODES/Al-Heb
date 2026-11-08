/**
 * Day page model (pure: no DOM, no clock, no store). Everything the /day/<iso-date> page shows about one civil day:
 * the Hebrew date, the markers, one section per observance (festival, fast, Rosh Chodesh, Shabbat, candle-lighting eve)
 * with reviewed copy from data/calendar/days.json, the Torah portion, candle-lighting / havdalah times for the learner's
 * city, links into the app, and previous / next navigation.
 *
 * Dates, holidays and sun times all come from calendar.js and calendar.grid.js; nothing is re-derived here.
 */
import {
  parseISO, isoDate, addDays, weekday, candleLighting, havdalah, sunset, sunTime, formatTime, floorToMinute, roundToMinute, holidaysBetween, DEFAULT_HAVDALAH,
} from "./calendar.js";
import { dayDetail, hebrewInfo, WEEKDAYS_EN, MONTHS_EN } from "./calendar.grid.js";
import { yomTovDates } from "./streak.js";
import { markersFor, isImportant } from "./calendar.markers.js";
import { PACK_OF } from "../festivals/model.js";

export const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
/** True for a real civil date between 1000 and 9999 (the calendar's supported range). */
export function validISO(iso) {
  if (typeof iso !== "string" || !ISO_RE.test(iso)) return false;
  const g = parseISO(iso);
  if (g.y < 1000 || g.y > 9999 || g.m < 1 || g.m > 12 || g.d < 1 || g.d > 31) return false;
  return isoDate(addDays(g, 0)) === iso; // round-trips only when the day exists (no 31 April, 30 February)
}

/** Keys of data/calendar/days.json that are not holiday ids. */
export const GENERIC_KEYS = Object.freeze(["shabbat", "erev-shabbat", "rosh-chodesh", "erev-festival"]);

export const CALC_NOTE = "Dates and times are calculated, not authoritative. Check with your community.";

/** The day's observances, markers and whether it has a page worth opening. Used by the grid as well as the page. */
export function dayFacts(iso, { mode = "reform", israel = false, done = null } = {}) {
  const g = parseISO(iso);
  const det = dayDetail(g, { mode, israel });
  const dow = weekday(g);
  const nextISO = isoDate(addDays(g, 1));
  const yt = yomTovDates(iso, nextISO, mode);
  const isYomTov = yt.has(iso), eveOfYomTov = yt.has(nextISO);
  const markers = markersFor({ holidays: det.holidays, isShabbat: dow === 6, isFriday: dow === 5, eveOfYomTov, done: !!(done && done.has && done.has(iso)) });
  return { iso, g, dow, det, isYomTov, eveOfYomTov, markers, important: isImportant(markers) };
}

const titleOf = (h) => (h.days > 1 ? `${h.en}, day ${h.dayIndex} of ${h.days}` : h.en);

function copyFor(copy, key) { return copy?.days?.[key] || null; }

/**
 * Links a section offers, filtered to what this build and these data hold (same rule as the festivals card).
 * @param {{texts?:string[], lesson?:string}} c copy entry
 * @param {{texts?:string[], lessons?:string[]}|null} linkEntry data/festivals/links.json entry for the holiday
 * @param {{hasRoute?:(n:string)=>boolean, registryTitles?:Map<string,string>, lessonTitles?:Map<string,string>}} env
 */
export function sectionLinks(c, linkEntry, env = {}) {
  const has = typeof env.hasRoute === "function" ? env.hasRoute : () => false;
  const out = [];
  const seen = new Set();
  for (const id of [...(c?.texts || []), ...(linkEntry?.texts || [])]) {
    if (seen.has(id) || !has("text") || !env.registryTitles?.has(id)) continue;
    seen.add(id);
    out.push({ href: `#/read/${id}`, label: env.registryTitles.get(id), kind: "text" });
  }
  for (const id of linkEntry?.lessons || []) {
    if (!has("learn") || !env.lessonTitles?.has(id)) continue;
    out.push({ href: `#/learn?lesson=${id}`, label: `${id}: ${env.lessonTitles.get(id)}`, kind: "lesson" });
  }
  return out;
}

/** Nightfall on civil date g by the learner's havdalah method (sunset + minutes, or the sun N degrees below the horizon). */
function nightfall(g, loc, hv) {
  const opt = hv || DEFAULT_HAVDALAH;
  if (opt.mode === "minutes") { const ss = sunset(g, loc.lat, loc.lon); return ss ? new Date(ss.getTime() + (opt.minutes ?? DEFAULT_HAVDALAH.minutes) * 60000) : null; }
  return sunTime(g, loc.lat, loc.lon, 90 + (opt.degrees ?? DEFAULT_HAVDALAH.degrees), false);
}

/**
 * Candle-lighting and havdalah entries for the day, for the learner's city. Returns [] without a location.
 * @param {ReturnType<typeof dayFacts>} f
 * @param {{lat:number, lon:number, tz?:string, name?:string, candleMinutes?:number}|null} loc
 * @param {{mode?:string, degrees?:number, minutes?:number}} [hv] havdalah preference
 * @returns {{kind:"candles"|"candles-nightfall"|"havdalah"|"ends", time:string, label:string, detail:string}[]}
 */
export function dayTimes(f, loc, hv = DEFAULT_HAVDALAH) {
  if (!loc) return [];
  const out = [];
  const tz = loc.tz, city = loc.name || "your location", mins = loc.candleMinutes ?? 18;
  const how = hv?.mode === "minutes" ? `${hv.minutes} minutes after sunset` : `sun ${hv?.degrees ?? DEFAULT_HAVDALAH.degrees} degrees below the horizon`;
  const lightsTonight = f.dow === 5 || f.eveOfYomTov;
  const stillHoly = f.dow === 6 || f.isYomTov;
  if (lightsTonight && !stillHoly) {
    const c = f.dow === 5 ? candleLighting(f.g, { lat: loc.lat, lon: loc.lon, offsetMinutes: mins }) : (() => { const ss = sunset(f.g, loc.lat, loc.lon); return ss ? { sunset: ss, candles: new Date(ss.getTime() - mins * 60000) } : null; })();
    if (c) out.push({ kind: "candles", time: formatTime(floorToMinute(c.candles), tz), label: "Candle lighting", detail: `${mins} minutes before sunset (${formatTime(c.sunset, tz)}) in ${city}.` });
    else out.push({ kind: "candles", time: "", label: "Candle lighting", detail: `No sunset on this date at this latitude.` });
  } else if (lightsTonight && stillHoly) {
    const nf = nightfall(f.g, loc, hv);
    if (nf) out.push({ kind: "candles-nightfall", time: formatTime(roundToMinute(nf), tz), label: "Candle lighting, after nightfall", detail: `Lit from an existing flame once ${f.dow === 6 ? "Shabbat" : "the festival day"} is over (${how}) in ${city}.` });
  }
  if (f.dow === 6) {
    const h = havdalah(f.g, { lat: loc.lat, lon: loc.lon }, hv);
    if (h) out.push({ kind: "havdalah", time: formatTime(roundToMinute(h.havdalah), tz), label: "Havdalah", detail: `Shabbat ends (${how}) in ${city}.` });
    else out.push({ kind: "havdalah", time: "", label: "Havdalah", detail: `Not computable at this latitude with the chosen method; choose "minutes after sunset" on the Calendar screen.` });
  } else if (f.isYomTov && !f.eveOfYomTov) {
    const nf = nightfall(f.g, loc, hv);
    if (nf) out.push({ kind: "ends", time: formatTime(roundToMinute(nf), tz), label: "Festival ends", detail: `Nightfall (${how}) in ${city}.` });
  }
  return out;
}

/** Next (dir = 1) or previous (dir = -1) day after `iso` that carries a festival, fast or Rosh Chodesh, within `limit` days. */
export function nearestNotable(iso, dir, { mode = "reform", limit = 400 } = {}) {
  const g = parseISO(iso);
  const from = dir > 0 ? isoDate(addDays(g, 1)) : isoDate(addDays(g, -limit));
  const to = dir > 0 ? isoDate(addDays(g, limit)) : isoDate(addDays(g, -1));
  const hols = holidaysBetween(from, to, { mode, roshChodesh: true });
  if (dir > 0) { const h = hols.find((x) => x.start > iso); return h ? { iso: h.start, en: h.en } : null; }
  let best = null;
  for (const h of hols) if (h.start < iso && (!best || h.start > best.iso)) best = { iso: h.start, en: h.en };
  return best;
}

/**
 * The full page.
 * @param {string} iso
 * @param {{mode?:string, israel?:boolean, copy?:any, links?:any, env?:any, loc?:any, havdalahPrefs?:any}} o
 *   copy = data/calendar/days.json, links = data/festivals/links.json, env = { hasRoute, registryTitles, lessonTitles },
 *   loc = resolved location ({lat, lon, tz, name, candleMinutes}) or null, havdalahPrefs = prefs.havdalah
 */
export function dayPage(iso, o = {}) {
  const mode = o.mode || "reform";
  const f = dayFacts(iso, { mode, israel: !!o.israel });
  const g = f.g, det = f.det;
  const heb = hebrewInfo(g);
  const has = typeof o.env?.hasRoute === "function" ? o.env.hasRoute : () => false;
  const sections = [];
  const seen = new Set();
  const pushSection = (key, base, extra = {}) => {
    if (seen.has(key)) return; seen.add(key);
    const c = copyFor(o.copy, base) || {};
    const linkEntry = o.links?.festivals?.[key] || (key === "shabbat" || key === "erev-shabbat" ? o.links?.shabbat : null);
    const packId = c.lesson || PACK_OF[key] || null;
    // the festival word packs (data/festivals/vocab.json) exist for every PACK_OF id; shabbat-ready is the checklist view
    const learnMore = packId && has("festival") ? { href: `#/festivals/${packId}`, label: packId === "shabbat-ready" ? "Shabbat-ready checklist" : `Words for ${extra.en || c.en || key}` } : null;
    sections.push({
      key, he: extra.he || c.he || "", tr: extra.tr || c.tr || "", en: extra.en || c.en || key, title: extra.title || extra.en || c.en || key,
      what: c.what || [], customs: c.customs || [], words: c.words || [], readings: c.readings || [],
      links: sectionLinks(c, linkEntry, o.env), learnMore, hasCopy: !!copyFor(o.copy, base), note: extra.note || "",
    });
  };
  for (const h of det.holidays) {
    const base = h.kind === "roshchodesh" ? "rosh-chodesh" : h.id;
    pushSection(h.id, base, { he: h.he, en: h.en, title: titleOf(h), tr: h.kind === "roshchodesh" ? `Rosh Chodesh ${h.en.replace(/^Rosh Chodesh /, "")}` : undefined });
  }
  if (f.dow === 6) pushSection("shabbat", "shabbat");
  if (f.dow === 5) pushSection("erev-shabbat", "erev-shabbat");
  if (f.eveOfYomTov && det.eveOf.length) {
    const h = det.eveOf[0];
    const c = copyFor(o.copy, "erev-festival") || {};
    pushSection("erev-festival", "erev-festival", { he: c.he, en: `Eve of ${h.en}`, title: `Eve of ${h.en}: begins at sundown`, note: `${h.en} begins this evening.` });
  }
  const parsha = det.parsha ? { en: det.parsha.en, he: det.parsha.he, href: has("torahread") ? "#/torahread" : null } : null;
  const noPortion = f.dow === 6 && !det.parsha ? "No regular Torah portion this Shabbat: a festival reading replaces it." : null;
  const times = dayTimes(f, o.loc || null, o.havdalahPrefs || DEFAULT_HAVDALAH);
  const prevISO = isoDate(addDays(g, -1)), nextISO = isoDate(addDays(g, 1));
  return {
    iso, g, weekdayName: WEEKDAYS_EN[f.dow], dateLabel: `${WEEKDAYS_EN[f.dow]} ${g.d} ${MONTHS_EN[g.m - 1]} ${g.y}`,
    hebrew: { label: heb.label, he: `${heb.dayHe} ${heb.monthHe} ${heb.yearHe}` },
    markers: f.markers, important: f.important, isYomTov: f.isYomTov, eveOfYomTov: f.eveOfYomTov,
    sections, parsha, noPortion, times, needsLocation: !o.loc,
    quiet: sections.length === 0 && !parsha,
    nav: { prev: prevISO, next: nextISO, prevNotable: nearestNotable(iso, -1, { mode }), nextNotable: nearestNotable(iso, 1, { mode }) },
  };
}
