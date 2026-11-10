// @ts-check
// Rimon's reminders. Local only: there is no push server. A reminder can arrive (a) while ALEF is open, from a timer in
// the page, or (b) on installed Chromium/Android, when the browser runs Periodic Background Sync and the service worker
// reads the plan this file leaves in Cache Storage. Anywhere else a closed app gets no reminder; the screen says so.
// Timing is personal: the half-hour of the day the learner usually studies, from the last 28 days on this device.
// Never during Shabbat or Yom Tov, never at night, never after a session today. Pure functions take `now`.
import { clone, CAPS } from './state.js';
import { dayKey, addDaysISO, localAt, minuteOfDay, weekdayOf, daysBetween } from './clock.js';
import { isQuiet, quietRanges, NIGHT } from './quiet.js';
import { isFreeRestDay } from './streak.js';
import { yomTovDates } from '../curriculum/streak.js';
import { MESSAGES, byTier, messageById } from './messages.js';
import { fnv1a } from './leagues.js';

export const NOTIFY = Object.freeze({
  tag: 'alef-rimon', title: 'Rimon', icon: 'assets/icons/icon-192.png', route: '#/learn',
  sessionGapMs: 30 * 60000, defaultMinute: 19 * 60, aboutADayMs: 23.5 * 3600000, nearMs: 2 * 3600000,
  minGapMs: 3 * 3600000, noRepeatWindow: 10, maxAheadDays: 8, lateGraceMs: 10 * 60000, maxTimerMs: 6 * 3600000,
  saverMinute: 20 * 60, saverMinStreak: 3, saverKindStreak: 7, stopAfterDays: 14,
  askAgainAfterLessons: 3, maxAsks: 2, nearPromoteXp: 30,
  cacheName: 'alef-retention', planPath: '__alef/rimon-plan.json', syncTag: 'alef-rimon', syncMinIntervalMs: 12 * 3600000,
});

// ---------- sessions and personal timing ----------
/** Note activity at `now`: extends the current session, or starts a new one after 30 quiet minutes. Returning also un-stops reminders. */
export function logSession(rec, now = Date.now()) {
  const r = clone(rec), last = r.sessions[r.sessions.length - 1];
  if (last && now - last.e < NOTIFY.sessionGapMs && now >= last.s) last.e = now;
  else r.sessions = [...r.sessions, { s: now, e: now }].slice(-CAPS.sessions);
  r.notify.stopped = false;
  return r;
}
export const lastSessionStart = (rec) => (rec.sessions.length ? rec.sessions[rec.sessions.length - 1].s : 0);
/** The minute of the day the learner usually studies (centre of the busiest half-hour, recent days weighing more). 19:00 with no history. */
export function typicalMinute(sessions, now = Date.now()) {
  const recent = sessions.filter((s) => now - s.s <= 28 * 86400000 && s.s <= now);
  if (!recent.length) return NOTIFY.defaultMinute;
  if (recent.length < 3) return minuteOfDay(recent[recent.length - 1].s);
  const b = new Array(48).fill(0);
  for (const s of recent) b[Math.floor(minuteOfDay(s.s) / 30)] += 0.5 ** ((now - s.s) / 86400000 / 7);
  let best = 0, bestV = -1;
  for (let k = 0; k < 48; k++) { const v = 0.25 * b[(k + 47) % 48] + 0.5 * b[k] + 0.25 * b[(k + 1) % 48]; if (v >= bestV - 1e-12) { if (v > bestV + 1e-12 || k > best) { best = k; } bestV = Math.max(bestV, v); } }
  return best * 30 + 15;
}
const clampDay = (min) => Math.min(Math.max(min, NIGHT.fromMin), NIGHT.toMin - 1);
/** Days since the last study day at `at`, not counting Shabbat / Yom Tov rest days. 0 = studied that day. */
export function daysAway(rec, at = Date.now(), mode = 'reform') {
  const last = lastSessionStart(rec); if (!last) return 0;
  const a = dayKey(last), b = dayKey(at); let d = 0;
  for (let i = 1, n = Math.min(daysBetween(a, b), 60); i <= n; i++) if (!isFreeRestDay(addDaysISO(a, i), mode) || i === n) d++;
  return Math.max(0, d);
}

// ---------- tone ladder and message pick ----------
/** Which kind of line for `d` days away: 'E' | 'D' | 'R' | 'S09' | null (null = send nothing that day). */
export function tierFor(d, tone = 'kind') {
  const playful = tone === 'playful';
  if (d <= 0 || d > NOTIFY.stopAfterDays) return null;
  if (d === NOTIFY.stopAfterDays) return 'S09';
  if (d <= 2) return 'E';
  if (d <= 4) return 'D';
  if (d <= 7) return playful ? 'R' : 'D';
  if ((d - 8) % 3 !== 0) return null;          // days 8 to 13: one line every third day (8 and 11)
  return playful && ((d - 8) / 3) % 2 === 0 ? 'R' : 'D';
}
const fill = (body, { n, next }) => body.replace('{n}', String(n)).replace('{next}', String(next || ''));
/**
 * The next line of a tier: catalogue order, starting at a per-install offset and carrying on from the last line sent, never an id among the last 10 sent.
 * Lines with {n} need a streak of 2 or more; lines with {next} need a lesson title.
 * @returns {{id:string, body:string}|null}
 */
export function pickMessage({ tier, sent = [], installId = '', n = 0, next = '' }) {
  if (tier && tier.length === 3) { const m = messageById(tier); return m && (!m.body.includes('{n}') || n >= 2) ? { id: m.id, body: fill(m.body, { n, next }) } : null; }
  const list = byTier(tier); if (!list.length) return null;
  const recent = new Set(sent.slice(-NOTIFY.noRepeatWindow).map((s) => s.id));
  // Carry on from the line after the last one sent in this tier, so the whole list is used before any line returns.
  const lastIdx = (() => { for (let i = sent.length - 1; i >= 0; i--) { const k = list.findIndex((m) => m.id === sent[i].id); if (k >= 0) return k; } return -1; })();
  const start = lastIdx >= 0 ? (lastIdx + 1) % list.length : fnv1a(installId) % list.length;
  for (let k = 0; k < list.length; k++) {
    const m = list[(start + k) % list.length];
    if (recent.has(m.id) || (m.body.includes('{n}') && n < 2) || (m.body.includes('{next}') && !next)) continue;
    return { id: m.id, body: fill(m.body, { n, next }) };
  }
  return null;
}

// ---------- when ----------
/** The next allowed reminder instant after `now`, or null (nothing within 8 days, or no session yet). */
export function nextFire(rec, now = Date.now(), quietOpt = {}) {
  const last = lastSessionStart(rec); if (!last) return null;
  const typ = typicalMinute(rec.sessions, now), at = (iso) => localAt(iso, clampDay(typ));
  const base = last + NOTIFY.aboutADayMs, t = localAt(dayKey(base), typ);
  let c = Math.abs(base - t) <= NOTIFY.nearMs ? base : t;
  c = localAt(dayKey(c), clampDay(minuteOfDay(c)));
  const today = dayKey(now), sessionDay = dayKey(last), soon = now + 2 * 60000;
  if (c <= soon) { c = at(today); if (c <= soon) c = at(addDaysISO(today, 1)); }
  for (let i = 0; i <= NOTIFY.maxAheadDays; i++) {
    if (daysBetween(today, dayKey(c)) > NOTIFY.maxAheadDays) return null;
    if (dayKey(c) !== sessionDay && !isQuiet(c, quietOpt)) return c;
    c = at(addDaysISO(dayKey(c), 1));
  }
  return null;
}

/**
 * What to send next. @param {object} rec @param {{count:number, activeToday:boolean}} streak projected streak
 * @param {{loc?:object|null, mode?:string, next?:string, leagueDone?:boolean}} [opt]
 * @returns {Array<{fireAt:number, id:string, title:string, body:string, route:string}>} at most two entries, soonest first
 */
export function plan(rec, streak = { count: 0, activeToday: false }, now = Date.now(), opt = {}) {
  const N = rec.notify, out = [];
  if (!N.optedIn || N.denied || N.stopped || !rec.sessions.length) return out;
  const sentToday = (ms) => N.sent.some((s) => dayKey(s.at) === dayKey(ms));
  const tooSoon = (ms) => N.sent.some((s) => Math.abs(ms - s.at) < NOTIFY.minGapMs);
  const entry = (fireAt, m, route = NOTIFY.route) => ({ fireAt, id: m.id, title: NOTIFY.title, body: m.body, route });
  const n = streak.count || 0, mode = opt.mode || 'reform';
  const afterChag = (ms) => { const y = addDaysISO(dayKey(ms), -1); return yomTovDates(y, y, mode).has(y); }; // the day after a Yom Tov day
  let c = nextFire(rec, now, opt);
  for (let guard = 0; c && guard < NOTIFY.maxAheadDays; guard++) {
    const d = daysAway(rec, c, mode); let m = null, route = NOTIFY.route;
    if (!sentToday(c) && !tooSoon(c)) {
      const tier = tierFor(d, N.tone);
      if (tier === 'S09') m = pickMessage({ tier: 'S09' });
      else if (tier) {
        const afterRest = weekdayOf(dayKey(c)) === 0 && !N.sent.some((s) => c - s.at < 2 * 86400000 && s.id === 'S01');
        if (rec.freezes.unseen && !rec.freezes.shownAt && n >= 2) m = pickMessage({ tier: 'S03', n }); // not when the learner already saw the note in the app
        else if (afterChag(c) && d >= 1 && !N.sent.some((s) => c - s.at < 2 * 86400000 && s.id === 'S02')) m = pickMessage({ tier: 'S02' });
        else if (afterRest && d >= 1) m = pickMessage({ tier: 'S01' });
        else if (opt.leagueDone && weekdayOf(dayKey(c)) === 5) { m = pickMessage({ tier: 'S06' }); route = '#/league'; }
        else if (opt.toPromote > 0 && opt.toPromote <= NOTIFY.nearPromoteXp && weekdayOf(dayKey(c)) === 4) { m = pickMessage({ tier: 'S07' }); route = '#/league'; }
        m = m || pickMessage({ tier, sent: N.sent, installId: rec.installId, n, next: opt.next });
      }
    }
    if (m) { out.push(entry(c, m, route)); break; }
    if (d > NOTIFY.stopAfterDays) break;
    const nextDay = addDaysISO(dayKey(c), 1); c = localAt(nextDay, clampDay(typicalMinute(rec.sessions, now)));
    while (c && isQuiet(c, opt) && daysBetween(dayKey(now), dayKey(c)) <= NOTIFY.maxAheadDays) c = localAt(addDaysISO(dayKey(c), 1), clampDay(typicalMinute(rec.sessions, now)));
    if (daysBetween(dayKey(now), dayKey(c)) > NOTIFY.maxAheadDays) c = null;
  }
  // Streak saver at 20:00 today: Playful Rimon, or Kind Rimon once the streak is 7 or more.
  const saver = localAt(dayKey(now), NOTIFY.saverMinute);
  if (n >= NOTIFY.saverMinStreak && !streak.activeToday && (N.tone === 'playful' || n >= NOTIFY.saverKindStreak) && saver > now && !isQuiet(saver, opt) && !tooSoon(saver)
    && dayKey(lastSessionStart(rec)) !== dayKey(now) && (N.tone === 'playful' || !sentToday(saver)) && !out.some((e) => Math.abs(e.fireAt - saver) < NOTIFY.minGapMs)) {
    const m = pickMessage({ tier: 'S04', n }); if (m) out.push(entry(saver, m));
  }
  return out.sort((a, b) => a.fireAt - b.fireAt);
}
/** May this entry be shown right now? Checked again at fire time. */
export function mayShow(rec, entry, now = Date.now(), opt = {}) {
  if (!rec.notify.optedIn || rec.notify.stopped || opt.calm) return false;
  if (isQuiet(now, opt)) return false;
  if (now < entry.fireAt || now - entry.fireAt > NOTIFY.lateGraceMs) return false;
  const last = lastSessionStart(rec); return !(last && dayKey(last) === dayKey(now));
}
/** Record a sent line; S09 ("the door is open") also stops reminders until the learner returns. */
export function recordSent(rec, id, at = Date.now()) {
  const r = clone(rec); r.notify.sent = [...r.notify.sent, { id, at }].slice(-CAPS.sent);
  if (id === 'S09') r.notify.stopped = true;
  if (id === 'S03') r.freezes.unseen = false;
  return r;
}

// ---------- opt-in ----------
/** Show the "Want a nudge from Rimon?" card? Only after a finished lesson, at most twice, never in calm mode. */
export function shouldAsk(rec, { calm = false } = {}) {
  const N = rec.notify;
  if (calm || N.optedIn || N.denied || rec.lessonsFinished < 1 || N.asks >= NOTIFY.maxAsks) return false;
  return N.asks === 0 || rec.lessonsFinished - N.lastAskAtLesson >= NOTIFY.askAgainAfterLessons;
}
export function answerAsk(rec, answer, tone = 'kind') {
  const r = clone(rec), N = r.notify; N.asks += 1; N.lastAskAtLesson = r.lessonsFinished;
  if (answer === 'yes') { N.optedIn = true; N.tone = tone === 'playful' ? 'playful' : 'kind'; N.stopped = false; }
  if (answer === 'denied') { N.denied = true; N.optedIn = false; }
  return r;
}
export function setReminders(rec, on, tone) { const r = clone(rec); r.notify.optedIn = !!on; if (on) { r.notify.denied = false; r.notify.stopped = false; } if (tone) r.notify.tone = tone === 'playful' ? 'playful' : 'kind'; return r; }

// ---------- delivery (browser; everything injectable) ----------
/** The plan the service worker reads (it cannot read localStorage). */
export function planFile(rec, entries, now = Date.now(), opt = {}) {
  return { v: 1, entries, quiet: quietRanges(now, now + (NOTIFY.maxAheadDays + 1) * 86400000, opt), lastSessionAt: lastSessionStart(rec), shown: [] };
}
const planUrl = (g) => new URL(NOTIFY.planPath, g.document?.baseURI || g.location?.href || 'http://localhost/').href;
export async function writePlan(file, g = globalThis) {
  try { const c = await g.caches.open(NOTIFY.cacheName); await c.put(planUrl(g), new Response(JSON.stringify(file), { headers: { 'content-type': 'application/json' } })); return true; } catch { return false; }
}
/** Lines the service worker showed while the app was closed (so they are not repeated). */
export async function readShown(g = globalThis) {
  try { const c = await g.caches.open(NOTIFY.cacheName); const hit = await c.match(planUrl(g)); const j = hit ? await hit.json() : null; return Array.isArray(j?.shown) ? j.shown.filter((s) => s && typeof s.id === 'string' && Number.isFinite(s.at)) : []; } catch { return []; }
}
/** Ask the browser for Periodic Background Sync (installed Chromium only; the browser decides how often, possibly never). */
export async function registerPeriodicSync(g = globalThis) {
  try {
    const reg = await g.navigator?.serviceWorker?.ready;
    if (!reg || !('periodicSync' in reg)) return false;
    await reg.periodicSync.register(NOTIFY.syncTag, { minInterval: NOTIFY.syncMinIntervalMs }); return true;
  } catch { return false; }
}
/**
 * In-page scheduler. env: { load():rec, save(fn), streak():{count,activeToday}, show(title, body, opt):Promise, opt():quiet options (+calm, next),
 *   now?, setTimeout?, clearTimeout?, g? }. Re-plans after every send, at least every 6 hours, and whenever arm() is called.
 */
export function createScheduler(env) {
  const now = env.now || (() => Date.now()), set = env.setTimeout || ((f, ms) => setTimeout(f, ms)), clear = env.clearTimeout || ((t) => clearTimeout(t));
  let timer = null, entries = [], alive = true;
  async function fire() {
    timer = null; if (!alive) return;
    const t = now(), rec = env.load(), o = env.opt?.() || {};
    for (const e of entries) {
      if (!mayShow(rec, e, t, o)) continue;
      try { const res = await env.show(e.title, e.body, { tag: NOTIFY.tag, icon: NOTIFY.icon, route: e.route }); if (!res || res.ok !== false) env.save((r) => recordSent(r, e.id, t)); } catch { /* showing is best effort */ }
      break;
    }
    arm();
  }
  function arm() {
    if (!alive) return null;
    if (timer !== null) { clear(timer); timer = null; }
    const t = now(), rec = env.load(), o = env.opt?.() || {};
    entries = o.calm ? [] : plan(rec, env.streak?.() || { count: 0, activeToday: false }, t, o);
    if (rec.notify.optedIn) writePlan(planFile(rec, entries, t, o), env.g || globalThis);
    const next = entries.find((e) => e.fireAt > t - NOTIFY.lateGraceMs);
    timer = set(fire, Math.min(NOTIFY.maxTimerMs, Math.max(1000, (next ? next.fireAt : t + NOTIFY.maxTimerMs) - t)));
    return next || null;
  }
  return { arm, entries: () => entries, stop() { alive = false; if (timer !== null) clear(timer); timer = null; } };
}

// ---------- calendar fallback (iPhone, Firefox, any closed app) ----------
const p2 = (n) => String(n).padStart(2, '0');
/**
 * A calendar file with one daily reminder at the learner's usual time, Sunday to Thursday only (never Friday or
 * Saturday). Floating local time, so it follows the phone's own zone. Returns text/calendar with CRLF line endings.
 */
export function reminderICS(rec, now = Date.now()) {
  const min = clampDay(typicalMinute(rec.sessions, now)); let d = new Date(now);
  while (d.getDay() === 5 || d.getDay() === 6) d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12); // the first event is never on a Friday or Saturday
  const day = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`, hhmm = `${p2(Math.floor(min / 60))}${p2(min % 60)}00`;
  const end = min + 5, stamp = new Date(now).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Aleph//Rimon reminder 1.0//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:rimon-daily-${rec.installId}@alef.local`, `DTSTAMP:${stamp}`, `DTSTART:${day}T${hhmm}`, `DTEND:${day}T${p2(Math.floor(end / 60))}${p2(end % 60)}00`,
    'RRULE:FREQ=DAILY;BYDAY=SU,MO,TU,WE,TH', 'SUMMARY:ALEF: a 3-minute Hebrew lesson', 'DESCRIPTION:A short reminder from Rimon. Open ALEF for one quick lesson.', 'TRANSP:TRANSPARENT',
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:ALEF: a 3-minute Hebrew lesson', 'TRIGGER:PT0S', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n') + '\r\n';
}
/** "7:15 pm": the time Rimon usually nudges, for the shop screen. */
export function usualTimeText(rec, now = Date.now()) { const m = clampDay(typicalMinute(rec.sessions, now)), h = Math.floor(m / 60); return `${((h + 11) % 12) + 1}:${p2(m % 60)} ${h < 12 ? 'am' : 'pm'}`; }
export { MESSAGES };
