/**
 * One-tap calendar adding: subscription links for Google, Apple and Outlook, plus files to download.
 *
 * Two kinds of calendar file:
 *  - Subscription feeds, published with the site under data/calendar/feeds/ (built by tools/calendar/build-feeds.mjs).
 *    The learner's calendar app keeps them up to date by itself, and removing one is a single "unsubscribe".
 *  - A file built on the device for a time the learner picks (download, then open it to import).
 *
 * Daily prayer reminders are one repeating event each (RRULE:FREQ=DAILY), so a downloaded reminder is also removed
 * in one step: delete the event and choose "all events".
 * Prayer times are floating local times (no zone), so 06:00 stays 06:00 wherever the phone is.
 */
import { escapeText, foldLine, triggerFor } from "./reminders.ics.js";

const CRLF = "\r\n";
const pad = (n, w = 2) => String(n).padStart(w, "0");
const utcStamp = (d) => `${pad(d.getUTCFullYear(), 4)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const ymd = (d) => `${pad(d.getFullYear(), 4)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

export const FEED_DIR = "data/calendar/feeds/";
export const MORNING_TIMES = Object.freeze(["05:30", "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00"]);
export const BEDTIME_TIMES = Object.freeze(["20:30", "21:00", "21:30", "22:00", "22:30", "23:00"]);
export const DEFAULT_MORNING = "06:00";
export const DEFAULT_BEDTIME = "22:00";
export const OBSERVANCES = Object.freeze(["reform", "traditional", "israel"]);

import { STREAK_LINE } from "../morning/nudge.js";
export { STREAK_LINE };

/** The two daily prayers. Hebrew, how to say it and English match data/homepage/prayers.json. */
export const DAILY_PRAYERS = Object.freeze({
  morning: {
    title: "Modeh Ani: Morning Prayer",
    calName: "ALEF Morning Prayer",
    he: "מוֹדֶה אֲנִי לְפָנֶיךָ מֶלֶךְ חַי וְקַיָּם, שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה. רַבָּה אֱמוּנָתֶךָ",
    tr: "Modeh ani lefanecha, Melech chai vekayam, shehechezarta bi nishmati bechemla. Raba emunatecha.",
    en: "I thank You, living and eternal King, for returning my soul to me with compassion. Great is Your faithfulness.",
    note: "Said on waking, before getting out of bed. Women say \"Modah\" instead of \"Modeh\".",
    route: "#/morning",
  },
  bedtime: {
    title: "Shema at Bedtime",
    calName: "ALEF Bedtime Shema",
    he: "שְׁמַע יִשְׂרָאֵל יְהוָה אֱלֹהֵינוּ יְהוָה אֶחָד׃",
    tr: "Shma Yisrael, Adonai Eloheinu, Adonai Echad.",
    en: "Hear, O Israel: the Lord is our God, the Lord is One. (Deuteronomy 6:4)",
    note: "The Torah says to speak these words \"when you lie down and when you rise up\" (Deuteronomy 6:7), so many people say the Shema just before sleep.",
    route: "#/read/shema-vahavta",
  },
});

/** "06:00" -> "0600" (file names), rejects anything else. */
export function timeSlug(hhmm) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(hhmm))) throw new RangeError("time must be HH:MM");
  return hhmm.replace(":", "");
}
export const prayerFeedPath = (slot, hhmm) => `${FEED_DIR}${slot}-${timeSlug(hhmm)}.ics`;
export const holidayFeedPath = (observance) => `${FEED_DIR}holidays-${OBSERVANCES.includes(observance) ? observance : "reform"}.ics`;
export const torahFeedPath = () => `${FEED_DIR}torah-verse-daily.ics`;

function calendarHead(name, extra = []) {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Aleph//Hebrew calendar 1.0//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`, "REFRESH-INTERVAL;VALUE=DURATION:P1D", "X-PUBLISHED-TTL:P1D", ...extra];
}
const finish = (L) => L.map(foldLine).join(CRLF) + CRLF;

/**
 * A daily repeating prayer reminder.
 * @param {"morning"|"bedtime"} slot
 * @param {string} hhmm "06:00"
 * @param {{appUrl?:string, now?:Date, start?:Date}} [opt] start = first day (default: today)
 */
export function prayerReminderICS(slot, hhmm, opt = {}) {
  const p = DAILY_PRAYERS[slot];
  if (!p) throw new RangeError("slot must be morning or bedtime");
  const [hh, mm] = hhmm.split(":").map(Number);
  timeSlug(hhmm);
  const start = opt.start || opt.now || new Date();
  const now = opt.now || new Date();
  const s = `${ymd(start)}T${pad(hh)}${pad(mm)}00`;
  const endMin = hh * 60 + mm + 5;
  const e = endMin >= 1440 ? `${ymd(start)}T235900` : `${ymd(start)}T${pad(Math.floor(endMin / 60))}${pad(endMin % 60)}00`;
  const link = opt.appUrl ? `${opt.appUrl.replace(/\/?$/, "/")}${p.route}` : "";
  const description = [p.he, p.tr, p.en, "", p.note, "", STREAK_LINE, link ? `Open ALEF: ${link}` : ""].join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const L = calendarHead(p.calName);
  L.push("BEGIN:VEVENT", `UID:aleph-daily-${slot}-${timeSlug(hhmm)}@aleph`, `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${s}`, `DTEND:${e}`, "RRULE:FREQ=DAILY",
    `SUMMARY:${escapeText(p.title)}`, `DESCRIPTION:${escapeText(description)}`, "TRANSP:TRANSPARENT", "CATEGORIES:Aleph");
  if (link) L.push(`URL:${link}`);
  L.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(p.title)}`, `TRIGGER:${triggerFor(0)}`, "END:VALARM", "END:VEVENT", "END:VCALENDAR");
  return finish(L);
}

/** Day-of-year index used by the app and the feed, so both show the same verse on the same day. */
export function dayIndex(date) {
  const d = new Date(date);
  return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 1)) / 86400000) + 1;
}
/** Torah verse for a local date. */
export function torahQuoteFor(quotes, date) {
  if (!Array.isArray(quotes) || !quotes.length) return null;
  return quotes[dayIndex(date) % quotes.length];
}

/**
 * All-day events, one per day, each carrying that day's Torah verse and its explanation. No alarm.
 * @param {object[]} quotes data/torah-quotes.json .quotes
 * @param {Date} from first day (local)
 * @param {number} days
 */
export function torahDailyICS(quotes, from, days, opt = {}) {
  const now = opt.now || new Date();
  const L = calendarHead("ALEF Torah Verse of the Day");
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i, 12);
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12);
    const q = torahQuoteFor(quotes, d);
    const link = opt.appUrl ? `${opt.appUrl.replace(/\/?$/, "/")}#/morning` : "";
    const description = [q.he, q.tr, q.en, "", q.why, link ? `\nOpen ALEF: ${link}` : ""].join("\n").trim();
    L.push("BEGIN:VEVENT", `UID:aleph-torah-${ymd(d)}@aleph`, `DTSTAMP:${utcStamp(now)}`, `DTSTART;VALUE=DATE:${ymd(d)}`, `DTEND;VALUE=DATE:${ymd(next)}`,
      `SUMMARY:${escapeText(`Torah: ${q.ref}`)}`, `DESCRIPTION:${escapeText(description)}`, "TRANSP:TRANSPARENT", "CATEGORIES:Aleph", "END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return finish(L);
}

/** Absolute https URL of a file on this site (feeds must be on a public https address for Google and Outlook). */
export function siteUrl(path, loc = globalThis.location) {
  if (!loc) return null;
  const base = new URL(".", loc.href.split("#")[0]);
  return new URL(path, base).href;
}
export const isPublicHttps = (url) => typeof url === "string" && /^https:\/\//.test(url) && !/^https:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url);

/**
 * Links that open the learner's calendar app with "subscribe to this calendar" already filled in.
 * @param {string} httpsUrl the feed's https address
 * @param {string} name shown by Outlook
 */
export function subscribeLinks(httpsUrl, name) {
  const webcal = httpsUrl.replace(/^https?:\/\//, "webcal://");
  return {
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
    apple: webcal,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(httpsUrl)}&name=${encodeURIComponent(name)}`,
    file: httpsUrl,
  };
}

/** How to take a calendar off again, per app. Plain steps, shown under the buttons. */
export const REMOVE_STEPS = Object.freeze([
  ["Google Calendar", "On a computer, open Google Calendar, find the calendar under \"Other calendars\", click the three dots next to it and choose \"Unsubscribe\" (or Settings, then \"Remove calendar\")."],
  ["iPhone or iPad", "Open Calendar, tap \"Calendars\" at the bottom, tap the (i) next to the ALEF calendar and choose \"Delete Calendar\" (or \"Unsubscribe\")."],
  ["Mac", "In Calendar, right-click the ALEF calendar in the sidebar and choose \"Unsubscribe\" or \"Delete\"."],
  ["Outlook", "Right-click the ALEF calendar under \"My calendars\" or \"Other calendars\" and choose \"Remove\"."],
  ["A downloaded reminder", "Open the reminder in your calendar, choose Delete, then \"All events\" (or \"Delete all future events\")."],
]);

/** Honest notes about alerts, shown once. */
export const ALERT_NOTES = Object.freeze([
  "Google Calendar does not use the alert inside a subscribed calendar. After subscribing, open the calendar's settings and add a notification \"at time of event\", or use the Download button instead.",
  "On iPhone, subscribed calendars may hide alerts. In Settings, Calendar, Accounts, Subscribed Calendars, turn \"Remove Alerts\" off, or use the Download button instead.",
]);

/** Browser download of a text file. Returns true if a download was started. */
export function downloadText(text, filename, type = "text/calendar;charset=utf-8", doc = globalThis.document) {
  if (!doc || typeof Blob === "undefined" || !globalThis.URL?.createObjectURL) return false;
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = doc.createElement("a");
  a.href = url; a.download = filename; a.style.display = "none";
  (doc.body || doc.documentElement).append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}
