/**
 * Aleph streak engine (pure; no DOM, no clock, no store). DRAFT behaviour, copy marked draft in the views.
 *
 * ONE record, ONE store key ("streak", STREAK_KEY): the lane-1 record { count, best, last } extended in place, so every
 * old reader keeps working and Home (curriculum/progress.js currentStreak) and Progress (progress/model.js streakInfo)
 * both call projectStreak() below and therefore show the same number.
 *
 *   v: 2                  present once the engagement timer has written the record (migration marker, see docs/morning/MIGRATION.md)
 *   count   (= currentStreak)       best (= longestStreak)       last (= lastCompletedDate, local "YYYY-MM-DD")
 *   todayDate, todaySeconds         engaged seconds accrued on todayDate (reset at rollover)
 *   frozenDates: []                 days classified as resting (Shabbat / Yom Tov with freeze on, or declared in Progress)
 *   doneDates: []                   last 30 completed days (for the 7-day strip)
 *   freeze: boolean                 freeze Shabbat/Yom Tov days (default ON in observant mode, opt-in otherwise)
 *   mode: "reform"|"traditional"|"israel"   festival day-count used for Yom Tov days (calendar.js)
 *
 * A record without v (written by recordActivity before this feature) is read as "last = a completed day, no freeze".
 * Rules: a day counts at >= GOAL_SECONDS of engaged time; a frozen day neither adds to nor breaks the chain; a gap day
 * that is not frozen breaks it (displayed 0 until the next completed day, best is kept). The break is a projection, not a
 * mutation, so declaring a rest day afterwards in Progress can still repair it.
 */
import { weekday, parseISO, holidaysBetween, OBSERVANCE_MODES } from "./calendar.js";

export const GOAL_SECONDS = 300;
export const STREAK_V = 2;
const KEEP_DONE = 30, KEEP_FROZEN = 60;

export const dayKey = (now) => {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dayNum = (key) => { const [y, m, d] = key.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
const keyOfNum = (n) => new Date(n * 86400000).toISOString().slice(0, 10);
export const addDaysISO = (key, n) => keyOfNum(dayNum(key) + n);
const ISO = /^\d{4}-\d\d-\d\d$/;
const isISO = (s) => typeof s === "string" && ISO.test(s);

// ---------- Shabbat / Yom Tov via calendar.js (not reimplemented) ----------
const ytCache = new Map();
/** Set of ISO dates on which work is forbidden for the festival (not Chol HaMoed, fasts or minor days). */
export function yomTovDates(fromISO, toISO, mode = "reform") {
  const m = OBSERVANCE_MODES.includes(mode) ? mode : "reform";
  const key = `${m}|${fromISO}|${toISO}`;
  if (ytCache.has(key)) return ytCache.get(key);
  const out = new Set();
  const day = (h, i) => { if (i >= 0 && i < h.days) out.add(addDaysISO(h.start, i)); };
  for (const h of holidaysBetween(addDaysISO(fromISO, -10), addDaysISO(toISO, 10), { mode: m })) {
    if (h.kind !== "major") continue;
    if (h.id === "rosh-hashanah" || h.id === "shavuot") for (let i = 0; i < h.days; i++) day(h, i);
    else if (h.id === "pesach") { day(h, 0); day(h, h.days - 1); if (h.days === 8) { day(h, 1); day(h, 6); } }
    else if (h.id === "sukkot") { day(h, 0); if (m === "traditional") day(h, 1); }
    else day(h, 0); // yom-kippur, shemini-atzeret, simchat-torah
  }
  if (ytCache.size > 200) ytCache.clear();
  ytCache.set(key, out);
  return out;
}
/** True when `iso` is a Saturday or a Yom Tov day. */
export function isRestDay(iso, mode = "reform") {
  if (weekday(parseISO(iso)) === 6) return true;
  return yomTovDates(iso, iso, mode).has(iso);
}
/** Which kind of rest day: "shabbat" | "yomtov" | null (Shabbat wins when both). */
export function restKind(iso, mode = "reform") {
  if (weekday(parseISO(iso)) === 6) return "shabbat";
  return yomTovDates(iso, iso, mode).has(iso) ? "yomtov" : null;
}

// ---------- record ----------
const natural = (v, d = 0) => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.floor(Number(v)) : d);
const isoList = (a, cap) => (Array.isArray(a) ? [...new Set(a.filter(isISO))].sort().slice(-cap) : []);

/** Read any stored value (old, new, corrupt, missing) as a well-formed record. Never throws. */
export function normalizeRecord(raw) {
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    v: r.v === STREAK_V ? STREAK_V : undefined,
    count: natural(r.count), best: Math.max(natural(r.best), natural(r.count)), last: isISO(r.last) ? r.last : null,
    todayDate: isISO(r.todayDate) ? r.todayDate : null, todaySeconds: Math.min(natural(r.todaySeconds), 86400),
    frozenDates: isoList(r.frozenDates, KEEP_FROZEN), doneDates: isoList(r.doneDates, KEEP_DONE),
    freeze: r.freeze === true, mode: OBSERVANCE_MODES.includes(r.mode) ? r.mode : "reform",
  };
}
/** The record to store (migrates a v1 record: keeps count/best/last, adds v:2). */
export const toStored = (rec) => ({ ...rec, v: STREAK_V });

const isFrozen = (rec, iso, extra) => (rec.freeze && isRestDay(iso, rec.mode)) || rec.frozenDates.includes(iso) || !!(extra && extra.has && extra.has(iso));

/**
 * Where the streak stands at `now`, without changing anything.
 * @param {object} raw stored record (any version)
 * @param {number|Date} now
 * @param {Iterable<string>} [extraRest] extra frozen days (e.g. Progress rest days)
 * @returns {{count:number, best:number, last:string|null, activeToday:boolean, restToday:boolean, broken:boolean, todaySeconds:number, goal:number, restKind:string|null}}
 */
export function projectStreak(raw, now, extraRest) {
  const rec = normalizeRecord(raw), today = dayKey(now);
  const extra = extraRest instanceof Set ? extraRest : extraRest ? new Set(extraRest) : null;
  const restToday = isFrozen(rec, today, extra);
  const activeToday = rec.last === today;
  const seconds = rec.todayDate === today ? rec.todaySeconds : 0;
  const base = { best: rec.best, last: rec.last, activeToday, restToday, goal: GOAL_SECONDS, todaySeconds: activeToday ? Math.max(seconds, GOAL_SECONDS) : seconds, restKind: restToday ? restKind(today, rec.mode) : null };
  if (!rec.last || rec.count === 0) return { ...base, count: 0, broken: false };
  if (activeToday) return { ...base, count: rec.count, broken: false };
  const gap = dayNum(today) - dayNum(rec.last);
  if (gap < 0) return { ...base, count: rec.count, broken: false }; // clock moved back: do not punish
  for (let i = 1; i < gap; i++) if (!isFrozen(rec, addDaysISO(rec.last, i), extra)) return { ...base, count: 0, broken: true };
  return { ...base, count: rec.count, broken: false };
}

/**
 * Day rollover: start a new day's seconds and persist the classification of elapsed rest days (frozenDates).
 * Idempotent. Returns a record to store (v:2).
 */
export function rollover(raw, now, extraRest) {
  const rec = normalizeRecord(raw), today = dayKey(now);
  const out = { ...rec };
  if (rec.last && rec.freeze) {
    const gap = dayNum(today) - dayNum(rec.last);
    const add = [];
    for (let i = 1; i < Math.min(gap, 400); i++) { const d = addDaysISO(rec.last, i); if (isFrozen(rec, d, extraRest ? new Set(extraRest) : null)) add.push(d); }
    out.frozenDates = isoList([...rec.frozenDates, ...add], KEEP_FROZEN);
  }
  if (rec.todayDate !== today) { out.todayDate = today; out.todaySeconds = 0; }
  return toStored(out);
}

/** Add engaged seconds for today (never completes the day by itself; see completeDay). */
export function setTodaySeconds(raw, now, seconds) {
  const rec = rollover(raw, now);
  return { ...rec, todaySeconds: Math.min(Math.max(natural(seconds), rec.todaySeconds), 86400) };
}

/** Mark today complete (>= GOAL_SECONDS). On a frozen day the count is unchanged (a rest day neither adds nor breaks). */
export function completeDay(raw, now, extraRest) {
  const today = dayKey(now);
  const rec = rollover(raw, now, extraRest);
  if (rec.last === today) return rec;
  const extra = extraRest ? new Set(extraRest) : null;
  if (isFrozen(rec, today, extra)) return { ...rec, todaySeconds: Math.max(rec.todaySeconds, GOAL_SECONDS) };
  const p = projectStreak(rec, now, extra);
  const count = p.count + 1;
  return { ...rec, count, best: Math.max(rec.best, count), last: today, todaySeconds: Math.max(rec.todaySeconds, GOAL_SECONDS), doneDates: isoList([...rec.doneDates, today], KEEP_DONE) };
}

/** Settings that live on the record so Home and Progress can read them synchronously. */
export function withSettings(raw, { freeze, mode } = {}) {
  const rec = normalizeRecord(raw);
  return toStored({ ...rec, freeze: freeze === undefined ? rec.freeze : freeze === true, mode: OBSERVANCE_MODES.includes(mode) ? mode : rec.mode });
}
/** Progress "rest day" declared / undone: mirrored into frozenDates so Home agrees. No-op for pre-v2 records. */
export function withDeclaredRest(raw, iso, on) {
  const rec = normalizeRecord(raw);
  if (rec.v !== STREAK_V || !isISO(iso)) return raw;
  const set = new Set(rec.frozenDates);
  if (on) set.add(iso); else set.delete(iso);
  return toStored({ ...rec, frozenDates: isoList([...set], KEEP_FROZEN) });
}

/**
 * Seven days ending today, oldest first: state "done" (check), "frozen" (candle / snowflake), "today" (not yet done) or "open" (dot).
 * A frozen day is never shown as a failure.
 */
export function weekStrip(raw, now, extraRest) {
  const rec = normalizeRecord(raw), today = dayKey(now), extra = extraRest ? new Set(extraRest) : null;
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDaysISO(today, -i);
    const done = rec.doneDates.includes(d) || (rec.v === undefined && rec.last && dayNum(d) <= dayNum(rec.last) && dayNum(d) > dayNum(rec.last) - rec.count && d <= today);
    const frozen = !done && isFrozen(rec, d, extra);
    out.push({ date: d, weekday: weekday(parseISO(d)), state: done ? "done" : frozen ? "frozen" : d === today ? "today" : "open", restKind: frozen ? restKind(d, rec.mode) : null });
  }
  return out;
}

/** "3:20" style clock for the progress ring label. */
export const clock = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
