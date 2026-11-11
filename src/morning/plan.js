/**
 * Morning reminder + evening rescue planning (DRAFT, pure). Uses calendar.js (via curriculum/streak.js) for Shabbat/Yom Tov.
 * Mechanism: the existing local in-app path (reminders.js item shape -> reminders.notify.js timers while the app is open,
 * and the .ics export). There is no push server and no analytics here.
 */
import { isRestDay, projectStreak, dayKey, addDaysISO } from "../curriculum/streak.js";
import { verseFor } from "./verses.js";

export const PREFS_KEY = "morning.prefs";
export const TITLE = "Start your day with God";
/** Default cap for the eve-of-Shabbat/festival reminder. Conservative and earlier than any candle lighting; NEEDS REVIEW by an observant reader. Learner can change it (prefs.eravLatest). */
export const ERAV_LATEST = "14:00";
export const DEFAULT_PREFS = Object.freeze({ v: 1, on: false, time: "06:00", rescueTime: "20:00", eravLatest: ERAV_LATEST, observant: null, freeze: null, lastSeen: null, lastRescue: null });
const hhmm = (v, d) => (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : d);
const isoOrNull = (v) => (typeof v === "string" && /^\d{4}-\d\d-\d\d$/.test(v) ? v : null);

export function normalizePrefs(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const d = DEFAULT_PREFS;
  return { v: 1, on: r.on === true, time: hhmm(r.time, d.time), rescueTime: hhmm(r.rescueTime, d.rescueTime), eravLatest: hhmm(r.eravLatest, d.eravLatest),
    observant: typeof r.observant === "boolean" ? r.observant : null, freeze: typeof r.freeze === "boolean" ? r.freeze : null,
    lastSeen: isoOrNull(r.lastSeen), lastRescue: isoOrNull(r.lastRescue) };
}
/** Observant mode: explicit choice, else follows the calendar's observance setting ("traditional" = observant). */
export const observantOn = (prefs, calendarPrefs) => (typeof prefs.observant === "boolean" ? prefs.observant : !!calendarPrefs && calendarPrefs.observance === "traditional");
/** Streak freeze: ON by default in observant mode, opt-in (prefs.freeze === true) for everyone else. */
export const freezeOn = (prefs, observant) => (observant ? prefs.freeze !== false : prefs.freeze === true);
/** Festival day-count mode handed to calendar.js. */
export const festivalMode = (calendarPrefs) => (calendarPrefs && ["reform", "traditional", "israel"].includes(calendarPrefs.observance) ? calendarPrefs.observance : "reform");

const minutes = (hhmmStr) => Number(hhmmStr.slice(0, 2)) * 60 + Number(hhmmStr.slice(3));
const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/**
 * What happens on `iso` for the morning reminder.
 * @returns {{fire:boolean, time:string|null, label:string|null, why:string}}
 *  - observant and iso is Shabbat/Yom Tov: no ping (why "rest-day")
 *  - observant and tomorrow is a rest day (an erev): ONE ping at min(chosen, prefs.eravLatest, default 14:00), label "before Shabbat" / "before the festival"
 *  - otherwise: one ping at the chosen time
 */
export function reminderOn(iso, prefs, { observant, mode = "reform" }) {
  if (!prefs.on) return { fire: false, time: null, label: null, why: "off" };
  if (!observant) return { fire: true, time: prefs.time, label: null, why: "normal" };
  if (isRestDay(iso, mode)) return { fire: false, time: null, label: null, why: "rest-day" };
  const next = addDaysISO(iso, 1);
  if (isRestDay(next, mode)) {
    const t = fmt(Math.min(minutes(prefs.time), minutes(prefs.eravLatest || ERAV_LATEST)));
    const shabbat = new Date(`${next}T12:00:00Z`).getUTCDay() === 6;
    return { fire: true, time: t, label: shabbat ? "before Shabbat" : "before the festival", why: "erev" };
  }
  return { fire: true, time: prefs.time, label: null, why: "normal" };
}

/** Notification text for a day: title + body (reference first, at most 90 characters, then the Modeh Ani line). */
export function notificationText(verse, label) {
  const ref = String(verse && verse.source_ref || "").slice(0, 90);
  return { title: TITLE, body: `${label ? label + ": " : ""}${ref}. Modeh Ani is ready` };
}

/**
 * Items in the reminders.js shape for [fromISO, days days), ready for scheduleLocalNotifications() and toICS().
 * @param {object[]} verses
 */
export function morningItems(fromISO, days, prefs, verses, { observant, mode = "reform" }) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const iso = addDaysISO(fromISO, i), r = reminderOn(iso, prefs, { observant, mode });
    if (!r.fire) continue;
    const [y, m, d] = iso.split("-").map(Number), hh = Number(r.time.slice(0, 2)), mm = Number(r.time.slice(3));
    const v = verses && verses.length ? verseFor(verses, new Date(y, m - 1, d, 12)) : null;
    const text = notificationText(v, r.label);
    out.push({ uid: `alef-morning-${iso}`, kind: "morning-verse", title: text.title, description: `${text.body}\nOpens Aleph at #/morning`, when: { type: "floating", y, m, d, hh, mm }, durationMin: 5, alarmMin: 0, label: r.label });
  }
  return out;
}

/**
 * In-app morning presentation: opening Aleph at/after the chosen time with today's card unseen shows the card first with a gentle banner.
 * On Shabbat/Yom Tov in observant mode nothing is pushed at the user; the card stays available at #/morning.
 */
export function morningPresent(now, prefs, { observant, mode = "reform" }) {
  const today = dayKey(now), d = new Date(now);
  if (!prefs.on || prefs.lastSeen === today) return false;
  if (observant && isRestDay(today, mode)) return false;
  return d.getHours() * 60 + d.getMinutes() >= minutes(prefs.time);
}

/**
 * Evening rescue (in-app only, never more than once per evening).
 * banner: show it now. badge: home-screen badge state stays on until the day is done (even after the banner was dismissed).
 */
export function rescueState(now, streakRecord, prefs, { observant, mode = "reform", extraRest } = {}) {
  const d = new Date(now), today = dayKey(now);
  const p = projectStreak(streakRecord, now, extraRest);
  const late = d.getHours() * 60 + d.getMinutes() >= minutes(prefs.rescueTime);
  const needs = !p.activeToday && !p.restToday && p.count > 0 && !(observant && isRestDay(today, mode));
  return { badge: needs && late, banner: needs && late && prefs.lastRescue !== today };
}
