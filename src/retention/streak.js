// @ts-check
// Retention layer over the ONE streak engine (src/curriculum/streak.js, store key "streak"). This file never keeps its
// own day count. It adds: streak freezes bought with gems, a repair window after a break, free rest days for Shabbat
// and Yom Tov, a travel day of grace, and milestone celebrations. Pure: every function takes `now`.
import { normalizeRecord, toStored, projectStreak, rollover, withDeclaredRest, completeDay, isRestDay, weekStrip, STREAK_V } from '../curriculum/streak.js';
import { clone, CAPS } from './state.js';
import { dayKey, addDaysISO, weekdayOf, daysBetween, localAt } from './clock.js';
import { earn, spend, PRICES } from './gems.js';
import { restNow } from './quiet.js';

/** Tuning. */
export const STREAK = Object.freeze({
  milestones: [3, 7, 14, 30, 50, 100, 365],
  milestoneGems: { 3: 5, 7: 25, 14: 30, 30: 50, 50: 75, 100: 100, 365: 200 },
  freezeMax: 2,
  repairWindowHours: 48, repairMaxDays: 3, repairMinStreak: 2,
  travelGraceHours: 36,
  // Owner rule: no streak is lost between Friday 18:00 and Saturday 21:00. A missed Friday would be lost at midnight,
  // inside that window, so Friday and Saturday (and Yom Tov with its eve) never count as missed days.
  shabbatCoversFriday: true,
  atRiskFromMinute: 18 * 60,
  maxScanDays: 45,
});

/** A day that can never break a streak: Saturday, Yom Tov, and (by the rule above) Friday and the eve of Yom Tov. */
export function isFreeRestDay(iso, mode = 'reform') {
  if (isRestDay(iso, mode)) return true;
  if (!STREAK.shabbatCoversFriday) return false;
  return weekdayOf(iso) === 5 || isRestDay(addDaysISO(iso, 1), mode);
}

const maxISO = (a, b) => (!a ? b : !b ? a : a > b ? a : b);
const lastSessionEnd = (ret) => (ret.sessions.length ? ret.sessions[ret.sessions.length - 1].e : 0);

/**
 * Day rollover for retention. Run at boot, when the app becomes visible, and at local midnight. Idempotent.
 * Judges each missed day ONCE (freezes.evaluatedThrough), so buying a freeze after a break never repairs it.
 * Freezes are all-or-nothing: if they cannot cover every missed day none is spent.
 * @param {object} streakRaw the stored "streak" record (any version)
 * @param {object} ret normalized retention record
 * @param {{tz?:string}} [opt] tz = the device zone now (travel grace compares it with ret.lastTz)
 * @returns {{streak:object, ret:object, events:string[]}} events: 'freeze_used' | 'streak_broken' | 'rest_covered' | 'travel_covered'
 */
export function applyRollover(streakRaw, ret, now = Date.now(), opt = {}) {
  const events = []; let r = clone(ret);
  let streak = normalizeRecord(streakRaw).v === STREAK_V ? streakRaw : rollover(streakRaw, now);
  const rec = normalizeRecord(streak), today = dayKey(now), to = addDaysISO(today, -1);
  if (opt.tz) { if (r.lastTz && r.lastTz !== opt.tz) r.tzChangedAt = now; r.lastTz = opt.tz; } // remembered until the next missed day is judged, not only for this one call
  const finish = () => { if (r.repair && now > r.repair.until) r.repair = null; return { streak, ret: r, events }; };
  if (!rec.last) { r.freezes.evaluatedThrough = maxISO(r.freezes.evaluatedThrough, to); return finish(); }
  const from = maxISO(addDaysISO(rec.last, 1), r.freezes.evaluatedThrough ? addDaysISO(r.freezes.evaluatedThrough, 1) : null);
  if (from > to) return finish(); // nothing new to judge (also: active today, or the clock moved back)
  const wasAlive = projectStreak(streak, localAt(from, 12 * 60)).count > 0; // was the chain still standing when this gap began?
  const frozenByEngine = (d) => (rec.freeze && isRestDay(d, rec.mode)) || rec.frozenDates.includes(d);
  const span = Math.min(daysBetween(from, to) + 1, STREAK.maxScanDays), tooLong = daysBetween(from, to) + 1 > STREAK.maxScanDays;
  let missed = [];
  for (let i = 0; i < span; i++) { const d = addDaysISO(from, i); if (!frozenByEngine(d)) missed.push(d); }
  // 1. Shabbat and Yom Tov rest: always free.
  const rest = missed.filter((d) => isFreeRestDay(d, rec.mode));
  if (rest.length && wasAlive && !tooLong) { for (const d of rest) streak = withDeclaredRest(streak, d, true); events.push('rest_covered'); }
  missed = missed.filter((d) => !rest.includes(d));
  // 2. Travel: one missed day is free when the zone changed and less than 36 real hours passed.
  const end = lastSessionEnd(r);
  if (missed.length === 1 && r.tzChangedAt >= end && end && now - end < STREAK.travelGraceHours * 3600000 && wasAlive) {
    streak = withDeclaredRest(streak, missed[0], true); r.travelCovered = [...r.travelCovered, missed[0]].slice(-CAPS.travel); missed = []; events.push('travel_covered');
  }
  // 3. Freezes, all or nothing. 4. Otherwise the streak is broken and a repair window opens.
  if (missed.length && wasAlive && !tooLong) {
    if (missed.length <= r.freezes.held) {
      for (const d of missed) streak = withDeclaredRest(streak, d, true);
      r.freezes.held -= missed.length; r.freezes.used = [...r.freezes.used, ...missed].slice(-CAPS.used); r.freezes.unseen = true; events.push('freeze_used');
    } else {
      events.push('streak_broken');
      r.repair = rec.count >= STREAK.repairMinStreak && missed.length <= STREAK.repairMaxDays
        ? { days: missed, prev: rec.count, last: rec.last, until: now + STREAK.repairWindowHours * 3600000 } : null;
    }
  }
  r.freezes.evaluatedThrough = to;
  return finish();
}

/** Buy one streak freeze. @returns {{ok:boolean, reason?:'max'|'balance', rec:object}} */
export function buyFreeze(ret, now = Date.now()) {
  if (ret.freezes.held >= STREAK.freezeMax) return { ok: false, reason: 'max', rec: ret };
  const s = spend(ret, PRICES.freeze, 'buy-freeze', now);
  if (!s.ok) return { ok: false, reason: 'balance', rec: ret };
  s.rec.freezes.held += 1; return { ok: true, rec: s.rec };
}

/** The open repair offer, or null. */
export function repairOffer(ret, now = Date.now()) {
  const p = ret.repair; if (!p || now > p.until) return null;
  return { days: p.days, prev: p.prev, price: p.days.length * PRICES.repairPerDay, msLeft: p.until - now, hoursLeft: Math.max(1, Math.ceil((p.until - now) / 3600000)) };
}
/**
 * Repair a broken streak inside the window: the missed days become rest days and the earlier count comes back
 * (added to any days already earned since the break).
 * @returns {{ok:boolean, reason?:'none'|'balance', streak:object, rec:object}}
 */
export function repairStreak(streakRaw, ret, now = Date.now()) {
  const offer = repairOffer(ret, now);
  if (!offer) return { ok: false, reason: 'none', streak: streakRaw, rec: ret };
  const s = spend(ret, offer.price, 'buy-repair', now);
  if (!s.ok) return { ok: false, reason: 'balance', streak: streakRaw, rec: ret };
  let streak = normalizeRecord(streakRaw).v === STREAK_V ? streakRaw : rollover(streakRaw, now);
  for (const d of offer.days) streak = withDeclaredRest(streak, d, true);
  const rec = normalizeRecord(streak);
  if (rec.last !== ret.repair.last) { // a new chain started after the break: join the two
    const count = ret.repair.prev + rec.count;
    streak = toStored({ ...rec, count, best: Math.max(rec.best, count) });
  }
  s.rec.repair = null;
  return { ok: true, streak, rec: s.rec };
}

/** A finished lesson completes the day (the engine's own completeDay; the 300-second rule still works too). */
export const completeLessonDay = (streakRaw, now = Date.now()) => completeDay(streakRaw, now);

/**
 * After a day is completed: is the new count a milestone? Celebrated every time, paid once per milestone ever.
 * @returns {{rec:object, count:number, grew:boolean, milestone:number|null, gems:number}}
 */
export function afterDayCompleted(streakBefore, streakAfter, ret, now = Date.now()) {
  const a = projectStreak(streakBefore, now), b = projectStreak(streakAfter, now);
  const grew = b.count > a.count && b.activeToday;
  if (!grew || !STREAK.milestones.includes(b.count)) return { rec: ret, count: b.count, grew, milestone: null, gems: 0 };
  if (ret.gems.paidMilestones.includes(b.count)) return { rec: ret, count: b.count, grew, milestone: b.count, gems: 0 };
  const gems = STREAK.milestoneGems[b.count] || 0;
  const rec = earn(ret, gems, 'streak' + b.count, now); if (rec === ret) return { rec: ret, count: b.count, grew, milestone: b.count, gems: 0 };
  rec.gems.paidMilestones = [...rec.gems.paidMilestones, b.count];
  return { rec, count: b.count, grew, milestone: b.count, gems };
}

/**
 * What the streak card and the top bar show. state (first match wins):
 * 'rest' | 'done' | 'freeze-used' | 'at-risk' | 'open' | 'broken' | 'new'.
 */
export function streakStatus(streakRaw, ret, now = Date.now()) {
  const p = projectStreak(streakRaw, now), today = dayKey(now);
  const mode = normalizeRecord(streakRaw).mode, kind = restNow(now, { mode }) || (isRestDay(today, mode) ? (new Date(now).getDay() === 6 ? 'shabbat' : 'yomtov') : null);
  const restToday = p.restToday || !!kind; // from Friday 18:00, all Saturday, Yom Tov and its eve from 18:00: no streak pressure
  const base = { count: p.count, best: p.best, held: ret.freezes.held, activeToday: p.activeToday, repair: repairOffer(ret, now), restKind: restToday ? kind || 'rest' : null };
  let state = 'new';
  if (restToday && !p.activeToday) state = 'rest';
  else if (p.activeToday) state = 'done';
  else if (ret.freezes.unseen && p.count > 0) state = 'freeze-used';
  else if (p.broken || (p.count === 0 && p.best > 0)) state = 'broken';
  else if (p.count > 0) state = new Date(now).getHours() * 60 + new Date(now).getMinutes() >= STREAK.atRiskFromMinute ? 'at-risk' : 'open';
  return { ...base, state };
}
/** Plain-language line for a status. */
export function streakLine(st) {
  const n = st.count;
  switch (st.state) {
    case 'rest': return st.restKind === 'shabbat' ? 'Shabbat Shalom. Your streak rests today too.' : st.restKind === 'yomtov' ? 'Chag sameach. Your streak rests today too.' : 'A rest day. Your streak rests today too.';
    case 'done': return n <= 1 ? 'Day 1 done. See you tomorrow!' : `${n} days in a row. See you tomorrow!`;
    case 'freeze-used': return `A streak freeze covered a missed day. Your ${n}-day streak is safe. ${st.held} left.`;
    case 'at-risk': return `Keep your ${n}-day streak: one 3-minute lesson does it.`;
    case 'open': return `Keep your ${n}-day streak going.`;
    case 'broken': return `Fresh start. Your best is ${st.best} days. Let's build again.`;
    default: return 'Finish one quick lesson to start a streak.';
  }
}

const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/**
 * Seven days ending today for the streak strip, oldest first. state: 'done' | 'freeze' (covered by a bought freeze) |
 * 'travel' | 'rest' (Shabbat, Yom Tov or a declared rest day) | 'today' | 'open'. A covered day is never drawn as a failure.
 * @returns {Array<{date:string, weekday:number, state:string, label:string}>} label = full words for screen readers
 */
export function weekDots(streakRaw, ret, now = Date.now()) {
  const mode = normalizeRecord(streakRaw).mode, today = dayKey(now);
  return weekStrip(streakRaw, now).map((d) => {
    let state = d.state === 'frozen' ? 'rest' : d.state;
    if (d.state !== 'done') {
      if (ret.freezes.used.includes(d.date)) state = 'freeze';
      else if (ret.travelCovered.includes(d.date)) state = 'travel';
      else if (d.date !== today && isFreeRestDay(d.date, mode)) state = 'rest';
      else if (d.date === today && isRestDay(d.date, mode)) state = 'rest';
    }
    const what = { done: 'done', freeze: 'covered by a streak freeze', travel: 'travel day', rest: 'rest day', today: 'today, not done yet', open: 'no lesson' }[state];
    return { date: d.date, weekday: d.weekday, state, label: `${WEEKDAY[d.weekday]}: ${what}` };
  });
}
/** The learner has seen the "a freeze covered a day" note. */
export function freezeNoteSeen(ret) { if (!ret.freezes.unseen) return ret; const r = clone(ret); r.freezes.unseen = false; return r; }
