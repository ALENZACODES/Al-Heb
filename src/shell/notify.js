// @ts-check
// Study reminders (shell): one daily "time to study" notification at a chosen time on chosen weekdays.
//
// WHAT THIS CAN AND CANNOT DO (see docs/deploy/NOTIFICATIONS.md):
//  - Permission is only ever requested by requestPermission(), which the view calls from a button click. Nothing here
//    asks by itself, and nothing asks when Notification is undefined (Node tests, old browsers, iOS Safari in a tab).
//  - Scheduling is a setTimeout chain inside the open page. It fires only while the tab is open and not frozen; a closed
//    app, a locked phone, or a suspended tab means no reminder. There is no server, so there is no Web Push yet.
//  - Web Push later: subscribePush() is the documented hook. It needs VAPID_PUBLIC_KEY (empty placeholder below), a push
//    handler in sw.js (not there today) and a server that stores subscriptions and sends the pushes. None exists.
//  - Shabbat quiet hours: with a location, no reminder is fired from candle lighting (Friday sunset minus the learner's
//    candle offset) to havdalah (Saturday, by the learner's havdalah choice). Both come from the calendar lane's data.
// Everything is injectable (Notification, timers, now, service worker) so it is testable without a browser.
import { sunset, sunTime, havdalah as havdalahFor, addDays, weekday, isoDate, holidaysBetween, DEFAULT_CANDLE_OFFSET_MIN, DEFAULT_HAVDALAH } from "../curriculum/calendar.js";

export const NOTIFY_PREFS_KEY = "notify.prefs";
/** Placeholder for the Web Push application server key (base64url, 65-byte P-256 public key). Empty = push is off. */
export const VAPID_PUBLIC_KEY = "";
export const NOTIFICATION_TAG = "alef-study-reminder";
/** Longest single timer: re-evaluate at least this often so clock changes and quiet hours are honoured (also under 2^31-1 ms). */
export const MAX_TIMER_MS = 6 * 3600 * 1000;
/** A fire time that is already this far in the past is treated as missed (never fired late). */
export const LATE_GRACE_MS = 10 * 60 * 1000;
export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const DEFAULT_PREFS = Object.freeze({
  v: 1,
  enabled: false,
  hour: 19, minute: 0,
  days: Object.freeze([0, 1, 2, 3, 4]), // Sunday to Thursday. Friday and Saturday are off until the learner picks them: Shabbat quiet needs a city, so no default can be safe
  shabbatQuiet: true,
  yomTovQuiet: true,
  quietFrom: 22, quietTo: 7, // night quiet hours (local), never a reminder in between
  perWeek: 5,                // frequency cap; also one a day at most (src/shell/rimon-reminders.js)
});

/** Validate/merge stored preferences; unknown keys dropped; never throws. */
export function normalizePrefs(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const d = DEFAULT_PREFS;
  const int = (v, lo, hi, dflt) => (Number.isInteger(v) && v >= lo && v <= hi ? v : dflt);
  const days = Array.isArray(r.days) ? [...new Set(r.days.filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))].sort((a, b) => a - b) : [...d.days];
  return {
    v: 1,
    enabled: r.enabled === true,
    hour: int(r.hour, 0, 23, d.hour),
    minute: int(r.minute, 0, 59, d.minute),
    days,
    shabbatQuiet: typeof r.shabbatQuiet === "boolean" ? r.shabbatQuiet : d.shabbatQuiet,
    yomTovQuiet: typeof r.yomTovQuiet === "boolean" ? r.yomTovQuiet : d.yomTovQuiet,
    quietFrom: int(r.quietFrom, 0, 23, d.quietFrom),
    quietTo: int(r.quietTo, 0, 23, d.quietTo),
    perWeek: int(r.perWeek, 1, 7, d.perWeek),
  };
}

// ---------- environment ----------

const notificationOf = (g) => (g && typeof g.Notification === "function" ? g.Notification : g?.Notification && typeof g.Notification === "object" ? g.Notification : null);

/**
 * What this environment can do. Safe anywhere (returns "unsupported" in Node).
 * @returns {{supported:boolean, permission:"granted"|"denied"|"default"|"unsupported", serviceWorker:boolean, push:boolean,
 *   standalone:boolean, ios:boolean, scheduled:number, next:Date|null}}
 */
export function status(g = globalThis) {
  const N = notificationOf(g);
  const nav = g?.navigator;
  const ua = String(nav?.userAgent || "");
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav?.maxTouchPoints || 0) > 1);
  let standalone = false;
  try { standalone = nav?.standalone === true || !!g?.matchMedia?.("(display-mode: standalone)")?.matches; } catch { /* ignore */ }
  return {
    supported: !!N,
    permission: N ? (N.permission || "default") : "unsupported",
    serviceWorker: !!nav && "serviceWorker" in nav,
    push: !!(g?.PushManager) && !!nav && "serviceWorker" in nav,
    standalone, ios,
    scheduled: active.size,
    next: nextFireTime(),
  };
}

/**
 * Ask for permission. CALL ONLY FROM A USER GESTURE (click/tap); browsers ignore or punish other calls.
 * Resolves to "granted" | "denied" | "default" | "unsupported"; never throws.
 */
export async function requestPermission(g = globalThis) {
  const N = notificationOf(g);
  if (!N || typeof N.requestPermission !== "function") return "unsupported";
  try {
    const r = N.requestPermission();
    const p = r && typeof r.then === "function" ? await r : r; // old Safari takes a callback and returns undefined
    return p || N.permission || "default";
  } catch { return N.permission || "default"; }
}

// ---------- showing one notification ----------

/**
 * Show a notification now (used by the "Send a test" button and by the timer). Prefers the service-worker
 * registration (Android Chrome refuses `new Notification` from a page once a worker is registered); falls back to the
 * constructor. Resolves to {ok, via:"sw"|"page"|null, reason?}. Never throws; no-op without permission.
 */
export async function showNow(title, body, opt = {}) {
  const g = opt.globalThis ?? globalThis;
  const N = notificationOf(g);
  if (!N || N.permission !== "granted") return { ok: false, via: null, reason: N ? `permission ${N.permission || "default"}` : "unsupported" };
  const options = { body, tag: opt.tag ?? NOTIFICATION_TAG, lang: "en", icon: opt.icon ?? "assets/icons/icon-192.png", badge: opt.badge, renotify: false, data: { route: opt.route ?? "#/" } };
  const swc = opt.serviceWorker ?? g.navigator?.serviceWorker;
  if (swc && typeof swc.getRegistration === "function") {
    try {
      const reg = await swc.getRegistration();
      if (reg && typeof reg.showNotification === "function") { await reg.showNotification(title, options); return { ok: true, via: "sw" }; }
    } catch { /* fall through to the constructor */ }
  }
  try { new N(title, options); return { ok: true, via: "page" }; } catch (e) { return { ok: false, via: null, reason: String(e?.message || e) }; }
}

// ---------- scheduling ----------

/** @type {Map<number, {prefs:object, target:Date|null, timer:any, clear:Function, cancel:Function}>} */
const active = new Map();
let seq = 0;

/** Earliest pending fire time across active schedules (null if none). */
export function nextFireTime() {
  let best = null;
  for (const s of active.values()) if (s.target && (!best || s.target < best)) best = s.target;
  return best;
}

/**
 * Next instant at/after `now` matching hour:minute on one of `days` (0 = Sunday ... 6 = Saturday, device-local clock),
 * skipping instants for which `quiet(date)` returns true. Pure. Returns null when days is empty or everything within
 * `lookaheadDays` (default 15) is quiet.
 * @param {{hour:number, minute:number, days:number[]}} p
 * @param {Date} now
 * @param {{quiet?:(d:Date)=>boolean, lookaheadDays?:number}} [opt]
 */
export function nextOccurrence(p, now, opt = {}) {
  const days = Array.isArray(p?.days) ? p.days : [];
  if (!days.length) return null;
  const quiet = typeof opt.quiet === "function" ? opt.quiet : () => false;
  const limit = opt.lookaheadDays ?? 15;
  for (let i = 0; i <= limit; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, p.hour, p.minute, 0, 0);
    if (d.getTime() <= now.getTime()) continue;
    if (!days.includes(d.getDay())) continue;
    if (quiet(d)) continue;
    return d;
  }
  return null;
}

/**
 * Schedule the daily study reminder while the page is open. Cancels nothing else; call cancelAll() first to replace.
 * No-op (returns {ok:false, reason}) without permission or outside a browser.
 * @param {{hour:number, minute:number, days:number[]}} p
 * @param {{now?:()=>Date, setTimer?:Function, clearTimer?:Function, globalThis?:any, quiet?:(d:Date)=>boolean,
 *   title?:string, body?:string, route?:string, onFire?:(d:Date)=>void, show?:Function}} [opt]
 * @returns {{ok:boolean, reason?:string, next:Date|null, cancel:()=>void}}
 */
export function scheduleStudyReminder(p, opt = {}) {
  const g = opt.globalThis ?? globalThis;
  const N = notificationOf(g);
  const prefs = normalizePrefs({ ...p, enabled: true });
  const nowFn = opt.now ?? (() => new Date());
  const set = opt.setTimer ?? (typeof g.setTimeout === "function" ? g.setTimeout.bind(g) : null);
  const clear = opt.clearTimer ?? (typeof g.clearTimeout === "function" ? g.clearTimeout.bind(g) : () => {});
  const show = opt.show ?? ((t, b, o) => showNow(t, b, { ...o, globalThis: g }));
  const none = (reason) => ({ ok: false, reason, next: null, cancel() {} });
  if (!N) return none("unsupported");
  if (N.permission !== "granted") return none(`permission ${N.permission || "default"}`);
  if (!set) return none("no timers");
  if (!prefs.days.length) return none("no days chosen");

  const id = ++seq;
  const entry = { prefs, target: null, timer: null, clear, cancel() { if (entry.timer != null) clear(entry.timer); entry.timer = null; entry.target = null; active.delete(id); } };

  const arm = () => {
    const now = nowFn();
    entry.target = nextOccurrence(prefs, now, { quiet: opt.quiet });
    if (!entry.target) { entry.timer = null; return; }
    const delay = Math.min(Math.max(entry.target.getTime() - now.getTime(), 0), MAX_TIMER_MS);
    entry.timer = set(tick, delay);
  };
  const tick = () => {
    entry.timer = null;
    if (!active.has(id) || !entry.target) return;
    const now = nowFn();
    const late = now.getTime() - entry.target.getTime();
    if (late < 0) return arm(); // woke early (long delay was clamped, or the clock moved)
    if (late <= LATE_GRACE_MS) {
      const when = entry.target;
      // compose(when) picks Rimon's line at fire time and may return null to stay quiet (rest days, quiet hours, frequency cap).
      let msg = null, skip = false;
      if (typeof opt.compose === "function") { try { msg = opt.compose(when); } catch { msg = null; } skip = !msg; }
      if (!skip) {
        const txt = [opt.title ?? "ALEF: a few minutes of Hebrew", opt.body ?? "Only if you feel like it. Your lessons and review cards stay as they are."];
        Promise.resolve(show(msg?.title ?? txt[0], msg?.body ?? txt[1], { route: opt.route ?? "#/learn" })).catch(() => {});
        try { opt.onFire?.(when, msg); } catch { /* listener bug must not stop the chain */ }
      }
    }
    arm(); // either fired, or missed (tab was frozen): move to the next occurrence, never fire late
  };
  active.set(id, entry);
  arm();
  return { ok: true, next: entry.target, cancel: entry.cancel };
}

/** Cancel every pending study reminder timer. Safe anywhere. */
export function cancelAll() {
  for (const s of [...active.values()]) s.cancel();
  active.clear();
}

// ---------- Shabbat quiet hours (uses the calendar lane's solar code; location comes from the calendar prefs) ----------

/** Civil {y,m,d} of an instant in an IANA zone; device-local when tz is missing or unknown. */
export function zonedYMD(date, tz) {
  if (tz) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
      const get = (t) => Number(parts.find((p) => p.type === t)?.value);
      const r = { y: get("year"), m: get("month"), d: get("day") };
      if ([r.y, r.m, r.d].every(Number.isFinite)) return r;
    } catch { /* unknown zone: fall through */ }
  }
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
}

/**
 * The Shabbat window that contains or follows civil date `g` at a location: [candle lighting, havdalah].
 *   candle lighting = Friday sunset - candleMinutes (default 18; Jerusalem 40, Haifa 30, other Israeli presets 20)
 *   havdalah        = Saturday: sun 8.5 degrees below the horizon (default) or `minutes` after sunset
 * Returns null when the sun does not set/reach the angle there (polar latitudes); callers then fall back to
 * FALLBACK_QUIET (Friday 15:00 local to Saturday 23:59 local), which is deliberately wide.
 * @param {{y:number,m:number,d:number}} g any date; the Friday on/before it is used when g is a Saturday, else the Friday on/after
 * @param {{lat:number, lon:number, candleMinutes?:number, havdalah?:{mode?:string, degrees?:number, minutes?:number}}} loc
 */
export function shabbatWindow(g, loc) {
  const dow = weekday(g);
  const fri = dow === 6 ? addDays(g, -1) : addDays(g, (5 - dow + 7) % 7);
  const ss = sunset(fri, loc.lat, loc.lon);
  if (!ss) return null;
  const off = Number.isFinite(loc.candleMinutes) ? loc.candleMinutes : DEFAULT_CANDLE_OFFSET_MIN;
  const start = new Date(ss.getTime() - off * 60000);
  const hv = havdalahFor(addDays(fri, 1), { lat: loc.lat, lon: loc.lon }, loc.havdalah || DEFAULT_HAVDALAH);
  if (!hv) return null;
  return { friday: fri, start, end: hv.havdalah, sunset: ss };
}

export const FALLBACK_QUIET = Object.freeze({ fridayFromHour: 15 });

/**
 * true when `date` falls inside Shabbat at `loc` (candle lighting to havdalah). Without a location: false (never guess).
 * @param {Date} date
 * @param {{lat:number, lon:number, tz?:string, candleMinutes?:number, havdalah?:object}|null|undefined} loc
 */
export function isShabbat(date, loc) {
  if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lon)) return false;
  const g = zonedYMD(date, loc.tz);
  const dow = weekday(g);
  if (dow !== 5 && dow !== 6) return false;
  const w = shabbatWindow(g, loc);
  if (w) return date >= w.start && date <= w.end;
  // polar fallback: whole Friday afternoon/evening and Saturday
  if (dow === 6) return true;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: loc.tz || undefined }).format(date));
  return hour >= FALLBACK_QUIET.fridayFromHour;
}

/** A quiet(date) predicate for scheduleStudyReminder from a location (null location = never quiet). Shabbat only. */
export const shabbatQuiet = (loc) => (date) => isShabbat(date, loc);

// ---------- Yom Tov quiet hours ----------

/**
 * The days of a festival record (from calendar.js holidaysBetween) on which work is forbidden (yom tov proper), as ISO
 * date runs. Chol HaMoed and Hanukkah/Purim/fasts/modern days are NOT yom tov and are never quiet.
 *   Rosh Hashanah, Yom Kippur, Shavuot, Shemini Atzeret / Simchat Torah: every day the calendar lists
 *   Sukkot: first day (traditional mode: first two)       Pesach: first and last day (traditional mode: first two and last two)
 * Under the default Reform one-day convention that is 1 day each (Pesach 2). "Some congregations keep a second day"
 * (optionalExtraDays) is NOT counted: the learner opts in by choosing the traditional or Israel observance on the Calendar screen.
 * @returns {string[][]} runs of consecutive ISO dates
 */
export function yomTovRuns(h) {
  const span = (from, n) => { const out = []; let g = { y: +from.slice(0, 4), m: +from.slice(5, 7), d: +from.slice(8, 10) }; for (let i = 0; i < n; i++) { out.push(isoDate(g)); g = addDays(g, 1); } return out; };
  switch (h.id) {
    case "rosh-hashanah": case "yom-kippur": case "shavuot": case "shemini-atzeret": case "simchat-torah":
      return [span(h.start, h.days)];
    case "sukkot": return [span(h.start, h.mode === "traditional" ? 2 : 1)];
    case "pesach": {
      const k = h.mode === "traditional" ? 2 : 1;
      const endG = { y: +h.end.slice(0, 4), m: +h.end.slice(5, 7), d: +h.end.slice(8, 10) };
      return [span(h.start, k), span(isoDate(addDays(endG, -(k - 1))), k)];
    }
    default: return [];
  }
}

/**
 * The yom tov window containing `date` at a location: starts at (sunset on the eve - candleMinutes), ends at nightfall
 * of the last day (sun 8.5 degrees below the horizon, or `minutes` after sunset, as the learner chose for havdalah).
 * Returns {id, en, start, end} or null. The civil date is read in the city's zone. Polar cases with no sunset use the whole civil days.
 * @param {Date} date @param {object|null} loc @param {{mode?:string}} [opt] mode = calendar observance (reform | traditional | israel)
 */
export function yomTovWindow(date, loc, opt = {}) {
  if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lon)) return null;
  const mode = ["reform", "traditional", "israel"].includes(opt.mode) ? opt.mode : "reform";
  const g = zonedYMD(date, loc.tz);
  const hols = holidaysBetween(isoDate(addDays(g, -1)), isoDate(addDays(g, 1)), { mode });
  const off = Number.isFinite(loc.candleMinutes) ? loc.candleMinutes : DEFAULT_CANDLE_OFFSET_MIN;
  const hv = loc.havdalah || DEFAULT_HAVDALAH;
  const parse = (iso) => ({ y: +iso.slice(0, 4), m: +iso.slice(5, 7), d: +iso.slice(8, 10) });
  for (const h of hols) {
    if (h.kind !== "major") continue;
    for (const run of yomTovRuns({ ...h, mode })) {
      const first = parse(run[0]), last = parse(run[run.length - 1]);
      const eveSs = sunset(addDays(first, -1), loc.lat, loc.lon);
      const lastSs = sunset(last, loc.lat, loc.lon);
      let start, end;
      if (eveSs && lastSs) {
        start = new Date(eveSs.getTime() - off * 60000);
        end = hv.mode === "minutes" ? new Date(lastSs.getTime() + (hv.minutes ?? DEFAULT_HAVDALAH.minutes) * 60000)
          : sunTime(last, loc.lat, loc.lon, 90 + (hv.degrees ?? DEFAULT_HAVDALAH.degrees), false);
      }
      if (!start || !end) { // polar: whole civil days (UTC midnight of the city's dates is close enough for a quiet rule)
        start = new Date(Date.UTC(first.y, first.m - 1, first.d - 1, 12)); end = new Date(Date.UTC(last.y, last.m - 1, last.d, 23, 59));
      }
      if (date >= start && date <= end) return { id: h.id, en: h.en, start, end };
    }
  }
  return null;
}

/** true when `date` is inside a yom tov at `loc` (see yomTovWindow). No location: false. */
export const isYomTov = (date, loc, opt = {}) => !!yomTovWindow(date, loc, opt);

/**
 * Quiet predicate: Shabbat and/or Yom Tov per the toggles. `observance` is the calendar's observance mode.
 * @param {object|null} loc @param {{shabbat?:boolean, yomTov?:boolean, observance?:string}} [o]
 */
export const quietHours = (loc, o = {}) => (date) => (o.shabbat !== false && isShabbat(date, loc)) || (o.yomTov !== false && isYomTov(date, loc, { mode: o.observance }));

/**
 * Resolve the learner's location the way the calendar screen does: calendar prefs (store key "calendar.prefs"),
 * else shell settings lat/lon. Loads the location presets lazily; resolves to null when nothing is set.
 * @param {{store?:{get:Function}, settings?:{get:Function}}} ctx
 */
export async function resolveQuietLocation(ctx) {
  try {
    const L = await import("../curriculum/calendar.locations.js");
    const raw = ctx?.store?.get ? await ctx.store.get(L.CAL_PREFS_KEY) : null;
    const prefs = L.normalizePrefs(raw);
    const s = ctx?.settings;
    const fallback = s && typeof s.get === "function" && Number.isFinite(s.get("lat")) && Number.isFinite(s.get("lon")) ? { lat: s.get("lat"), lon: s.get("lon") } : null;
    const loc = L.resolveLocation(prefs, fallback);
    return loc ? { ...loc, havdalah: prefs.havdalah, observance: prefs.observance } : null;
  } catch { return null; }
}

/**
 * Read "notify.prefs" and (re)arm the study reminder for this page session. Idempotent: cancels the previous schedule
 * first. Meant to be called once at app boot (the shell owner can add `armFromPrefs(ctx)` to src/app.js) and by the
 * settings card whenever a preference changes. Until app.js calls it, the timer starts only after the learner opens
 * the reminders card in that session. Never throws; resolves to the scheduleStudyReminder result or {ok:false, reason}.
 * @param {{store?:{get:Function}, settings?:{get:Function}}} ctx
 * @param {{now?:()=>Date, setTimer?:Function, clearTimer?:Function, globalThis?:any, show?:Function, onFire?:Function}} [opt]
 */
export async function armFromPrefs(ctx, opt = {}) {
  cancelAll();
  try {
    const raw = ctx?.store?.get ? await ctx.store.get(NOTIFY_PREFS_KEY) : null;
    const prefs = normalizePrefs(raw);
    if (!prefs.enabled) return { ok: false, reason: "disabled", next: null, cancel() {} };
    const wantQuiet = prefs.shabbatQuiet || prefs.yomTovQuiet;
    const loc = wantQuiet ? await resolveQuietLocation(ctx) : null;
    const quiet = wantQuiet ? quietHours(loc, { shabbat: prefs.shabbatQuiet, yomTov: prefs.yomTovQuiet, observance: loc?.observance }) : undefined;
    // Rimon's voice: the line is chosen when the reminder fires, from fresh progress, and may be skipped (src/shell/rimon-reminders.js).
    const show = opt.show ?? (async (title, body, o) => {
      const R = await import("./rimon-reminders.js");
      const st = await reminderState(ctx, R);
      const msg = R.composeReminder(opt.now ? opt.now() : new Date(), { ...st, restQuiet: quiet, rules: { quietFrom: prefs.quietFrom, quietTo: prefs.quietTo, perWeek: prefs.perWeek } });
      if (!msg) return { ok: false, reason: "quiet" };
      try { await ctx?.store?.set?.(R.REMINDER_LOG_KEY, [...(st.rawLog || []), { at: new Date().toISOString(), id: msg.id }].slice(-30)); } catch { /* best effort */ }
      return showNow(msg.title, msg.body, { ...o, globalThis: opt.globalThis ?? globalThis });
    });
    return scheduleStudyReminder(prefs, { ...opt, show, quiet, route: "#/learn" });
  } catch (e) { return { ok: false, reason: String(e?.message || e), next: null, cancel() {} }; }
}

/** Progress snapshot for Rimon's reminder picker: streak, days away, days since the first lesson, and the send log. Never throws. */
export async function reminderState(ctx, R) {
  const out = { streak: {}, daysAway: 0, daysSinceStart: 99, log: [], recent: [], rawLog: [] };
  try {
    const raw = ctx?.store?.get ? await ctx.store.get(R?.REMINDER_LOG_KEY || "notify.log") : null;
    const log = Array.isArray(raw) ? raw.filter((e) => e && typeof e.at === "string").slice(-30) : [];
    out.rawLog = log; out.log = log.map((e) => e.at); out.recent = log.slice(-8).map((e) => e.id);
  } catch { /* empty log */ }
  try {
    const S = await import("../curriculum/state.js");
    const st = await S.loadState(ctx);
    out.streak = st?.streak || {};
    const T = await import("../home/today.js");
    out.daysAway = T.daysAway ? T.daysAway({ last: st?.rawStreak?.last, cards: st?.cards }) : 0;
    const firsts = Object.values(st?.completed || {}).map((v) => Date.parse(v?.at || v?.date || v)).filter(Number.isFinite);
    if (firsts.length) out.daysSinceStart = Math.floor((Date.now() - Math.min(...firsts)) / 864e5);
  } catch { /* progress optional: daily line */ }
  return out;
}

// ---------- Web Push: documented path, no server yet ----------

/** base64url -> Uint8Array (the shape PushManager.subscribe wants for applicationServerKey). */
export function urlBase64ToUint8Array(s) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/**
 * Subscribe this browser to Web Push. Today this always returns {ok:false, reason:"no VAPID key"} because
 * VAPID_PUBLIC_KEY is empty: there is no push server, and sw.js has no "push" handler. When a server exists:
 *   1. put its public VAPID key in VAPID_PUBLIC_KEY,
 *   2. add `push` and `notificationclick` listeners to sw.js,
 *   3. POST the returned subscription JSON to the server from the view, and send a push at the learner's chosen time
 *      from there (the server must apply the same Shabbat quiet rule; the phone does not run this code when closed).
 * @returns {Promise<{ok:boolean, reason?:string, subscription?:any}>}
 */
export async function subscribePush(g = globalThis, key = VAPID_PUBLIC_KEY) {
  if (!key) return { ok: false, reason: "no VAPID key" };
  const swc = g?.navigator?.serviceWorker;
  if (!swc || !g.PushManager) return { ok: false, reason: "push unsupported" };
  const N = notificationOf(g);
  if (!N || N.permission !== "granted") return { ok: false, reason: "permission not granted" };
  try {
    const reg = await swc.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
    return { ok: true, subscription: sub.toJSON ? sub.toJSON() : sub };
  } catch (e) { return { ok: false, reason: String(e?.message || e) }; }
}
