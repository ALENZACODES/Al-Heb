// @ts-check
// Daily quests: three small goals a day, the same three all day, chosen on the device from a seeded shuffle.
// Each pays a few gems; finishing all three opens a small chest. No quests on Saturday or Yom Tov (a rest day has
// nothing to chase), none in calm mode, and they appear only after the learner's 2nd finished lesson. Pure functions.
import { clone } from './state.js';
import { dayKey, addDaysISO, weekdayOf } from './clock.js';
import { earn } from './gems.js';
import { fnv1a, mulberry32 } from './leagues.js';
import { isRestDay } from '../curriculum/streak.js';

export const QUESTS = Object.freeze({ perDay: 3, gemsEach: 5, chestGems: 10, unlockLessons: 2 });
/** kind = what is counted. `max` kinds keep the best value reached (a run of right answers); the rest add up. */
export const POOL = Object.freeze([
  { id: 'xp', targets: [15, 20, 30], text: (n) => `Earn ${n} XP` },
  { id: 'lesson', targets: [1, 2], text: (n) => (n === 1 ? 'Finish a lesson' : `Finish ${n} lessons`) },
  { id: 'review', targets: [5, 10], text: (n) => `Review ${n} old cards` },
  { id: 'combo', targets: [5, 8], max: true, text: (n) => `Get ${n} right in a row` },
  { id: 'sharp', targets: [1], text: () => 'Finish a lesson with 90% or better' },
  { id: 'game', targets: [1, 2], text: (n) => (n === 1 ? 'Play a game round' : `Play ${n} game rounds`) },
]);
const def = (id) => POOL.find((q) => q.id === id);
export const questText = (item) => def(item.id)?.text(item.n) || '';

/** The day's three quests for an install: "Earn XP" first (always reachable), then two more from the pool. Deterministic. */
export function dailyQuests(installId, day) {
  const rand = mulberry32(fnv1a(`${installId}|quests|${day}`));
  const rest = POOL.filter((q) => q.id !== 'xp').map((q) => [rand(), q]).sort((a, b) => a[0] - b[0]).map((x) => x[1]).slice(0, QUESTS.perDay - 1);
  return [def('xp'), ...rest].map((q) => ({ id: q.id, n: q.targets[Math.floor(rand() * q.targets.length)], p: 0, paid: false }));
}
export function questsOn(rec, { calm = false } = {}) { return !calm && rec.lessonsFinished >= QUESTS.unlockLessons; }
const valid = (q, day) => !!q && q.day === day && Array.isArray(q.items) && q.items.every((i) => i && def(i.id) && Number.isFinite(i.n) && Number.isFinite(i.p));

/** Today's quests on the record (made on first use each day). A rest day has none. Returns a new record when it changed. */
export function ensureQuests(rec, now = Date.now(), mode = 'reform') {
  const day = dayKey(now);
  if (valid(rec.quests, day)) return rec;
  const r = clone(rec);
  r.quests = { day, items: isRestDay(day, mode) ? [] : dailyQuests(rec.installId, day), chest: false, rest: isRestDay(day, mode) };
  return r;
}
/** Quests whose progress is a count the app already keeps (src/lib/counts.js): XP today and lessons finished today.
 *  Their progress is that count, never a separate tally, so Home's goal ring and the XP quest always agree (C-03). */
export const LIVE_KINDS = Object.freeze({ xp: 'xpToday', lesson: 'lessonsToday' });
const liveOf = (it, live) => { const k = LIVE_KINDS[it.id]; const v = k && live ? Number(live[k]) : NaN; return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : null; };
/**
 * Count progress. `amounts` e.g. { xp: 15, lesson: 1, sharp: 1, combo: 6 }. opt.live = { xpToday, lessonsToday } (counts.js):
 * when given, the XP and lesson quests take that value instead of adding the amount.
 * @returns {{rec:object, done:string[], chest:boolean, gems:number}} done = quests finished by this call (their text)
 */
export function questProgress(rec, amounts, now = Date.now(), opt = {}) {
  if (!questsOn(rec, opt)) return { rec, done: [], chest: false, gems: 0 };
  let r = clone(ensureQuests(rec, now, opt.mode)); const done = []; let gems = 0, chest = false;
  for (const it of r.quests.items) {
    if (it.paid) continue;
    const lv = liveOf(it, opt.live);
    if (lv !== null) { if (Math.min(it.n, lv) <= it.p) continue; it.p = Math.min(it.n, lv); }
    else { const a = Number(amounts[it.id]) || 0; if (a <= 0) continue; it.p = Math.min(it.n, def(it.id).max ? Math.max(it.p, a) : it.p + a); }
    if (it.p >= it.n) { it.paid = true; done.push(questText(it)); gems += QUESTS.gemsEach; }
  }
  if (done.length) {
    const q = r.quests; r = earn(r, done.length * QUESTS.gemsEach, 'quest', now); r.quests = q;
    if (!q.chest && q.items.length && q.items.every((i) => i.paid)) { q.chest = true; chest = true; gems += QUESTS.chestGems; r = earn(r, QUESTS.chestGems, 'chest', now); r.quests = q; }
  }
  return { rec: r, done, chest, gems };
}
/** What the quest card draws. */
export function questView(rec, now = Date.now(), opt = {}) {
  const r = ensureQuests(rec, now, opt.mode), q = r.quests;
  const p = (i) => { const lv = liveOf(i, opt.live); return i.paid ? i.n : lv !== null ? Math.min(i.n, lv) : i.p; };
  return { on: questsOn(rec, opt), rest: !!q.rest, chest: !!q.chest, items: q.items.map((i) => ({ id: i.id, text: questText(i), p: p(i), n: i.n, done: !!i.paid || p(i) >= i.n })), doneCount: q.items.filter((i) => i.paid || p(i) >= i.n).length };
}

// ---------- Expeditions (T4): a seven-day journey with a map and a finish line. Daily quests stay as they are. ----------
export const EXPEDITION = Object.freeze({ unlockLessons: 4, length: 7, gems: 40 });
export const EXPEDITION_POOL = Object.freeze([
  { id: 'blessing', title: '7 days to your first blessing', text: 'A seven-day journey. On each study day, finish a lesson. Rest days are on the map; they are not a gap.', need: { lesson: 1 } },
  { id: 'market', title: 'A week in the market', text: 'A seven-day journey through everyday words. On each study day, finish a lesson or review 5 old cards. Rest days are on the map; they are not a gap.', need: { any: true, lesson: 1, review: 5 } },
]);
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const expDef = (id) => EXPEDITION_POOL.find((x) => x.id === id) || EXPEDITION_POOL[0];
const expDays = (start) => Array.from({ length: EXPEDITION.length }, (_, i) => addDaysISO(start, i));
const expEnd = (start) => addDaysISO(start, EXPEDITION.length - 1);
export const expeditionOn = (rec, { calm = false } = {}) => !calm && rec.lessonsFinished >= EXPEDITION.unlockLessons;

function pickExpeditionId(finished) {
  return EXPEDITION_POOL[(Array.isArray(finished) ? finished.length : 0) % EXPEDITION_POOL.length].id;
}
function rollStops(exp, today, mode) {
  const stops = { ...exp.stops };
  let changed = false;
  for (const d of expDays(exp.start)) {
    if (d > today) break;
    if (isRestDay(d, mode) && stops[d] !== 'rest' && stops[d] !== 'done') { stops[d] = 'rest'; changed = true; }
  }
  return changed ? { ...exp, stops } : exp;
}
function requiredDays(start, mode) { return expDays(start).filter((d) => !isRestDay(d, mode)); }
function allRequiredDone(exp, mode) { return requiredDays(exp.start, mode).every((d) => exp.stops[d] === 'done'); }

function freshExpedition(start, finished) {
  return { id: pickExpeditionId(finished), start, stops: {}, review: 0, reviewDay: null, paid: false, finished: (finished || []).slice(-12) };
}

/** Today's expedition on the record (started on first use after the unlock). Returns a new record when it changed. */
export function ensureExpedition(rec, now = Date.now(), opt = {}) {
  if (!expeditionOn(rec, opt)) return rec;
  const today = dayKey(now);
  const mode = opt.mode || 'reform';
  const cur = rec.expedition;
  const finished = Array.isArray(cur?.finished) ? cur.finished.slice(-12) : [];
  const active = cur && typeof cur.id === 'string' && typeof cur.start === 'string' && today >= cur.start && today <= expEnd(cur.start);
  if (active) {
    const rolled = rollStops(cur, today, mode);
    if (rolled === cur) return rec;
    const r = clone(rec); r.expedition = rolled; return r;
  }
  const r = clone(rec);
  r.expedition = rollStops(freshExpedition(today, finished), today, mode);
  return r;
}

/**
 * Count progress on today's expedition stop. amounts: { lesson, review }.
 * @returns {{rec:object, done:boolean, gems:number, title?:string}}
 */
export function expeditionProgress(rec, amounts, now = Date.now(), opt = {}) {
  if (!expeditionOn(rec, opt)) return { rec, done: false, gems: 0 };
  let r = clone(ensureExpedition(rec, now, opt));
  const today = dayKey(now);
  const mode = opt.mode || 'reform';
  const exp = { ...r.expedition, stops: { ...r.expedition.stops } };
  if (today >= exp.start && today <= expEnd(exp.start) && exp.stops[today] !== 'done' && exp.stops[today] !== 'rest') {
    if (exp.reviewDay !== today) { exp.review = 0; exp.reviewDay = today; }
    exp.review += Math.max(0, Math.floor(Number(amounts.review) || 0));
    const lessons = Math.max(0, Math.floor(Number(amounts.lesson) || 0));
    const def = expDef(exp.id);
    const met = def.need.any ? (lessons >= (def.need.lesson || 1) || exp.review >= (def.need.review || 5)) : lessons >= (def.need.lesson || 1);
    if (met) exp.stops[today] = 'done';
  }
  r.expedition = exp;
  if (!exp.paid && allRequiredDone(exp, mode)) {
    const next = { ...exp, paid: true, finished: [...(exp.finished || []), exp.id].slice(-12) };
    r = earn(r, EXPEDITION.gems, 'expedition', now);
    r.expedition = next;
    return { rec: r, done: true, gems: EXPEDITION.gems, title: expDef(exp.id).title };
  }
  return { rec: r, done: false, gems: 0 };
}

/** What the expedition card draws: a seven-stop map, today's need, and the finish line. */
export function expeditionView(rec, now = Date.now(), opt = {}) {
  const on = expeditionOn(rec, opt);
  if (!on) return { on: false, title: '', text: '', need: '', stops: [], paid: false, doneCount: 0, needCount: 0, id: null };
  const exp = ensureExpedition(rec, now, opt).expedition;
  const def = expDef(exp.id);
  const today = dayKey(now);
  const mode = opt.mode || 'reform';
  const stops = expDays(exp.start).map((d) => {
    const marked = exp.stops[d];
    const rest = marked === 'rest' || isRestDay(d, mode);
    let state = 'ahead';
    if (marked === 'done') state = 'done';
    else if (rest) state = 'rest';
    else if (d === today) state = 'today';
    else if (d < today) state = 'miss';
    return { day: d, state, name: DAY_SHORT[weekdayOf(d)] };
  });
  const needDays = requiredDays(exp.start, mode);
  const doneCount = needDays.filter((d) => exp.stops[d] === 'done').length;
  const todayStop = stops.find((s) => s.day === today);
  let need;
  if (exp.paid) need = `Journey complete. +${EXPEDITION.gems} gems.`;
  else if (!todayStop) need = 'This journey has ended. A new one starts today.';
  else if (todayStop.state === 'rest') need = 'A rest day. This stop is on the map; it is not a gap.';
  else if (todayStop.state === 'done') need = "Today's stop is done.";
  else if (def.need.any) need = 'Today: finish a lesson or review 5 old cards.';
  else need = 'Today: finish a lesson.';
  return { on: true, title: def.title, text: def.text, need, stops, paid: !!exp.paid, doneCount, needCount: needDays.length, id: exp.id };
}

