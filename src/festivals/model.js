/**
 * "This week in the Jewish year": pure model for the festivals screens (no DOM, no clock, no store).
 *
 * Sources, all in the repo: the weekly portion comes from src/curriculum/calendar.parsha.js (tables in
 * data/calendar/parsha.json, derived from Hebcal output and cross-checked against the Hebcal snapshot in
 * tests/festivals.test.js for three Hebrew years; diaspora schedule unless the learner's location or setting says Israel);
 * festival dates come from src/curriculum/calendar.js (checked against two independent algorithms in
 * tests/calendar.festivals.test.js); candle-lighting times come from src/curriculum/reminders.js so the card and the reminders
 * agree. Nothing here composes Hebrew or a date of its own. Dates are the device's local calendar day.
 */
import { parseISO, isoDate, addDays, weekday, toRD, holidaysBetween, toHebrew, HEBREW_MONTH_NAMES, formatTime } from "../curriculum/calendar.js";
import { parshaOnShabbat } from "../curriculum/calendar.parsha.js";
import { normalizePrefs, resolveLocation } from "../curriculum/calendar.locations.js";
import { buildReminders } from "../curriculum/reminders.js";

export const HORIZON_DAYS = 30;
/** Festival kinds shown on the card (modern Israeli days and Rosh Chodesh have no pack). */
const CARD_KINDS = new Set(["major", "minor", "fast"]);
/** Calendar holiday id -> festival pack id (Simchat Torah, a separate day only in traditional mode, shares Shemini Atzeret's pack). */
export const PACK_OF = { "rosh-hashanah": "rosh-hashanah", "yom-kippur": "yom-kippur", sukkot: "sukkot", "shemini-atzeret": "shemini-atzeret", "simchat-torah": "shemini-atzeret", hanukkah: "hanukkah", "tu-bishvat": "tu-bishvat", purim: "purim", pesach: "pesach", shavuot: "shavuot", "tisha-bav": "tisha-bav" };

/** Local calendar day "YYYY-MM-DD" of an instant. */
export const localISO = (now) => { const d = new Date(now); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const daysBetween = (aISO, bISO) => toRD(parseISO(bISO)) - toRD(parseISO(aISO));
const hebDate = (iso) => { const h = toHebrew(parseISO(iso)); return `${h.day} ${HEBREW_MONTH_NAMES[h.month].en} ${h.year}`; };

/**
 * Link list for a festival (or "shabbat"), filtered by what exists in this build.
 * @param {{texts:string[], lessons:string[]}} entry from data/festivals/links.json
 * @param {{hasRoute?:(name:string)=>boolean, registryTitles?:Map<string,string>, lessonTitles?:Map<string,string>}} env
 * @returns {{href:string,label:string,kind:"text"|"lesson"}[]}
 */
export function linksFor(entry, env = {}) {
  const has = typeof env.hasRoute === "function" ? env.hasRoute : () => false;
  const out = [];
  for (const id of entry?.texts || []) if (has("text") && env.registryTitles?.has(id)) out.push({ href: `#/read/${id}`, label: env.registryTitles.get(id), kind: "text" });
  for (const id of entry?.lessons || []) if (has("learn") && env.lessonTitles?.has(id)) out.push({ href: `#/learn?lesson=${id}`, label: `${id}: ${env.lessonTitles.get(id)}`, kind: "lesson" });
  return out;
}

/**
 * The "This week" card.
 * @param {{now:number|Date, calPrefs?:any, fallbackLocation?:{lat:number,lon:number,tz?:string}|null, links?:any, env?:any}} a
 */
export function weekCard({ now, calPrefs = null, fallbackLocation = null, links = null, env = {} }) {
  const prefs = normalizePrefs(calPrefs);
  const loc = resolveLocation(prefs, fallbackLocation);
  const today = localISO(now);
  const t = parseISO(today);
  const nowMs = new Date(now).getTime();
  const il = prefs.parshaSchedule === "israel" || (prefs.parshaSchedule === "auto" && !!loc?.israel);

  // 1. the Shabbat of this week (today, if today is Saturday)
  const sat = addDays(t, (6 - weekday(t) + 7) % 7), satISO = isoDate(sat);
  const p = parshaOnShabbat(sat, { israel: il });
  const satFest = p ? [] : holidaysBetween(satISO, satISO, { mode: prefs.observance }).filter((h) => h.kind === "major").map((h) => h.en);
  const shabbat = {
    date: satISO, hebrewDate: hebDate(satISO), daysAway: daysBetween(today, satISO), schedule: il ? "israel" : "diaspora",
    parsha: p ? { en: p.en, he: p.he, double: p.double } : null,
    noPortion: p ? null : satFest.length ? `No regular portion this Shabbat: ${satFest.join(", ")}.` : "No regular portion this Shabbat (a festival reading replaces it).",
  };

  // 2. the next festival within HORIZON_DAYS (one already under way counts)
  const hol = holidaysBetween(today, isoDate(addDays(t, HORIZON_DAYS)), { mode: prefs.observance }).filter((h) => CARD_KINDS.has(h.kind) && PACK_OF[h.id] && h.end >= today);
  const h0 = hol[0] || null;
  const festival = h0 ? {
    id: h0.id, packId: PACK_OF[h0.id], en: h0.en, he: h0.he, start: h0.start, end: h0.end, eve: h0.eve, days: h0.days,
    inProgress: h0.start <= today, daysUntil: Math.max(0, daysBetween(today, h0.start)), hebrewDate: hebDate(h0.start),
    links: linksFor(links?.festivals?.[h0.id], env),
  } : null;

  // 3. candle lighting for the learner's city: every candle reminder from now to the first Shabbat (festival eves included)
  let candles = null, candleNote = null;
  if (!loc) candleNote = "Choose a city on the Calendar screen to see candle-lighting times.";
  else {
    const only = { ...prefs, remind: { ...prefs.remind, candles: true, havdalah: false, holidays: false, roshChodesh: false, morning: false, evening: false } };
    const items = buildReminders(only, today, isoDate(addDays(t, 8)), { fallbackLocation }).items.filter((i) => i.kind === "candles" && i.when.at.getTime() >= nowMs);
    const out = [];
    for (const i of items) { out.push({ iso: i.uid.replace("alef-candles-", ""), title: i.title, at: i.when.at, time: formatTime(i.when.at, loc.tz), nightfall: /existing flame/.test(i.description) }); if (/^Candle lighting \(Shabbat/.test(i.title)) break; }
    candles = { city: loc.name, tz: loc.tz, minutesBeforeSunset: loc.candleMinutes, items: out };
    if (!out.length) candleNote = "No candle lighting in the next week.";
  }
  return { today, shabbat, festival, candles, candleNote, shabbatLinks: linksFor(links?.shabbat, env), parshaRoutes: (links?.parsha?.routes || []).filter((r) => typeof env.hasRoute === "function" && env.hasRoute(r)) };
}

/**
 * Shabbat-ready checklist with the learner's coverage.
 * @param {{phrases:{id:string,label:string,registry:string,moment:string}[], missing:{label:string,reason:string}[]}} spec data/festivals/shabbat-ready.json
 * @param {Map<string, any>} registryById
 * @param {{entryId:string,status:string}[]|null} gradedLines readableNow(...).lines, or null when progress data is unavailable
 */
export function shabbatReady(spec, registryById, gradedLines) {
  const phrases = [];
  const skipped = [...(spec.missing || [])];
  for (const ph of spec.phrases) {
    const e = registryById.get(ph.registry);
    if (!e) { skipped.push({ label: ph.label, reason: `registry entry ${ph.registry} not found` }); continue; }
    const lines = String(e.he).split("\n").map((x) => x.trim()).filter(Boolean);
    const graded = gradedLines ? gradedLines.filter((l) => l.entryId === e.id) : null;
    const full = graded ? graded.filter((l) => l.status === "full").length : null;
    const almost = graded ? graded.filter((l) => l.status === "almost").length : null;
    phrases.push({ ...ph, title: e.title, he: lines, english: e.english || "", lines: lines.length, full, almost, decodable: graded ? graded.length > 0 && full === graded.length : null, href: `#/read/${e.id}` });
  }
  const known = phrases.filter((p) => p.decodable !== null);
  return {
    phrases, skipped,
    ready: known.filter((p) => p.decodable).length, of: phrases.length, measured: known.length === phrases.length && phrases.length > 0,
  };
}

/** Festival pack lookup. @param {any} vocab data/festivals/vocab.json */
export const packById = (vocab, id) => vocab?.packs?.find((p) => p.id === id) || null;
