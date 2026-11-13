// @ts-check
// Weekly recap and the welcome back. Pure functions.
//   Recap: from Sunday, one card on Home sums up the week that just ended (XP, days studied, best day, league result).
//   Welcome back: after 7 or more days away the learner is met with full hearts and a small first step, never a scolding.
import { clone } from './state.js';
import { dayKey, addDaysISO, weekIdOf, weekdayOf, inShabbatWindow } from './clock.js';
import { HEARTS } from './hearts.js';
import { tierOf } from './leagues.js';
import { lastSessionStart } from './notify.js';
import { earn } from './gems.js';

export const RECAP = Object.freeze({ comebackDays: 7 });
const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** XP per day for the week starting on `weekId` (a Sunday): seven entries. */
export function weekDays(rec, weekId) {
  return Array.from({ length: 7 }, (_, i) => { const date = addDaysISO(weekId, i); return { date, name: DAY[weekdayOf(date)], xp: rec.xp.days[date] || 0 }; });
}
/**
 * The week before the current one. @returns {null|{weekId:string, xp:number, days:number, best:{name:string, xp:number}|null,
 *   league:null|{result:string, rank:number, tier:string}, bars:Array<{name:string, xp:number}>, thisWeekXp:number}}
 */
export function lastWeek(rec, now = Date.now()) {
  const cur = weekIdOf(now), weekId = addDaysISO(cur, -7), bars = weekDays(rec, weekId);
  const xp = bars.reduce((a, b) => a + b.xp, 0); if (!xp) return null;
  const best = bars.reduce((a, b) => (b.xp > a.xp ? b : a), bars[0]);
  const h = rec.league.history.find((x) => x.week === weekId);
  return { weekId, xp, days: bars.filter((b) => b.xp > 0).length, best: { name: best.name, xp: best.xp }, bars,
    league: h ? { result: h.result, rank: h.rank, tier: tierOf(rec.league.tier).en } : null, thisWeekXp: weekDays(rec, cur).reduce((a, b) => a + b.xp, 0) };
}
/** Show the recap card? Once per week, from Sunday on, never during Shabbat, never in calm mode, only when last week had XP. */
export function recapDue(rec, now = Date.now(), { calm = false } = {}) {
  return !calm && !inShabbatWindow(now) && rec.recapSeen !== weekIdOf(now) && !!lastWeek(rec, now);
}
export function recapSeen(rec, now = Date.now()) { const r = clone(rec); r.recapSeen = weekIdOf(now); return r; }
/** One sentence for the card and for screen readers. */
export function recapLine(w) {
  const league = !w.league ? '' : w.league.result === 'up' ? ` You moved up to ${w.league.tier}.` : w.league.result === 'down' ? ` You are in ${w.league.tier} now.` : ` You held your place in ${w.league.tier}.`;
  return `${w.xp} XP on ${w.days} day${w.days === 1 ? '' : 's'}. Best day: ${w.best.name}, ${w.best.xp} XP.${league}`;
}

/** Whole days since the learner last studied (calendar days, rest days included). 0 when never or today. */
export function daysSinceStudy(rec, now = Date.now()) {
  const last = lastSessionStart(rec); if (!last || last > now) return 0;
  const a = dayKey(last), b = dayKey(now);
  return Math.max(0, Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000));
}
/**
 * The learner is back after a week or more: hearts are filled for free and today is marked, so Home can offer a small
 * first step. Runs once per return. @returns {{rec:object, back:boolean, days:number}}
 */
export function welcomeBack(rec, now = Date.now()) {
  const days = daysSinceStudy(rec, now), today = dayKey(now);
  if (days < RECAP.comebackDays || rec.comebackDay === today) return { rec, back: false, days };
  const r = clone(rec); r.comebackDay = today; r.comebackAway = days;
  r.hearts.n = HEARTS.max; r.hearts.lastRefillAt = 0; r.notify.stopped = false;
  return { rec: r, back: true, days };
}
/** Is today the day the learner came back? (Home shows the welcome card that day, until a lesson is finished.) */
export const isComebackDay = (rec, now = Date.now()) => rec.comebackDay === dayKey(now);

// ---------- Daily login calendar (T7): a monthly grid of days the app was opened, including the gaps. Not the streak. ----------
export const LOGIN = Object.freeze({ gems7: 5, gems14: 10, gemsMonth: 20 });
const civilMonth = (iso) => {
  const y = +iso.slice(0, 4), m = +iso.slice(5, 7);
  const days = new Date(y, m, 0).getDate();
  const key = `${y}-${String(m).padStart(2, '0')}`;
  return { key, y, m, days, start: `${key}-01` };
};
const monthDays = (iso) => {
  const { key, days } = civilMonth(iso);
  return Array.from({ length: days }, (_, i) => `${key}-${String(i + 1).padStart(2, '0')}`);
};

/** Mark that the app was opened today. Pays 7-day, 14-day, and full-month gems once each civil month. Gaps stay empty. */
export function markLogin(rec, now = Date.now()) {
  const today = dayKey(now);
  const have = rec.loginDays || [];
  if (have.includes(today) && rec.lastBootDay === today) {
    if (!rec.loginJustPaid) return rec;
    const r = clone(rec); delete r.loginJustPaid; return r;
  }
  const r = clone(rec);
  r.lastBootDay = today;
  r.loginDays = [...new Set([...have, today])].filter((d) => typeof d === 'string' && /^\d{4}-\d\d-\d\d$/.test(d)).sort().slice(-400);
  const { key, days } = civilMonth(today);
  const inMonth = monthDays(today).filter((d) => r.loginDays.includes(d));
  const paid = new Set((r.loginPaid && r.loginPaid[key]) || []);
  const add = [];
  if (inMonth.length >= 7 && !paid.has('d7')) add.push('d7');
  if (inMonth.length >= 14 && !paid.has('d14')) add.push('d14');
  if (inMonth.length >= days && !paid.has('month')) add.push('month');
  if (!add.length) { r.loginPaid = { ...(r.loginPaid || {}), [key]: [...paid] }; delete r.loginJustPaid; return r; }
  const gems = (add.includes('d7') ? LOGIN.gems7 : 0) + (add.includes('d14') ? LOGIN.gems14 : 0) + (add.includes('month') ? LOGIN.gemsMonth : 0);
  const why = add.includes('month') ? 'login-month' : add.includes('d14') ? 'login14' : 'login7';
  let out = earn(r, gems, why, now);
  out.loginDays = r.loginDays; out.lastBootDay = today;
  out.loginPaid = { ...(r.loginPaid || {}), [key]: [...paid, ...add] };
  out.loginJustPaid = add;
  return out;
}

/** What the login calendar card draws for the civil month of `now`. */
export function loginView(rec, now = Date.now()) {
  const today = dayKey(now);
  const { key, days, start } = civilMonth(today);
  const have = new Set(rec.loginDays || []);
  const weekday0 = weekdayOf(start); // 0=Sun
  const cells = monthDays(today).map((d) => {
    const n = +d.slice(8, 10);
    let state = 'ahead';
    if (d === today) state = have.has(d) ? 'today-on' : 'today';
    else if (d < today) state = have.has(d) ? 'on' : 'gap';
    return { day: d, n, state };
  });
  const count = cells.filter((c) => c.state === 'on' || c.state === 'today-on').length;
  const paid = (rec.loginPaid && rec.loginPaid[key]) || [];
  return { key, days, count, weekday0, cells, paid, gems7: LOGIN.gems7, gems14: LOGIN.gems14, gemsMonth: LOGIN.gemsMonth };
}
