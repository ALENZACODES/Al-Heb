// Practice rhythm: a forgiving streak. Pure: no DOM, no clock (callers pass `today`), no storage.
//
// Rules, all free and automatic:
//  - A practice day is a day with at least PRACTICE_POINTS points, or a day the older engaged-time streak counted.
//  - Every 5th practice day in a run earns one rest day, banked up to 3.
//  - A day off while a run is going spends a banked rest day on its own, so the rhythm continues. Nothing to buy or press.
//  - Days the learner declared as rest (or the older engine froze: Shabbat, festivals) are covered without spending anything.
//  - If a gap is longer than the bank, the run shows as a fresh start, and the best run is kept. One free tap on "Bring it back"
//    covers that gap (a gap of up to 30 days, ended within the last 60). There is no limit on repairs, no timer and no cost.
//  - Today is never a gap: it is still open until midnight.
import { addDaysISO } from '../../src/curriculum/streak.js';

export const EARN_EVERY = 5;
export const BANK_MAX = 3;
export const REPAIR_WINDOW_DAYS = 60;
export const MAX_REPAIR_GAP = 30;

const num = (iso) => { const [y, m, d] = iso.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };

/**
 * @param {{practice:Set<string>|string[], cover?:Set<string>|string[], repairs?:Set<string>|string[], today:string}} o
 */
export function rhythm({ practice, cover = [], repairs = [], today }) {
  const P = new Set(practice), C = new Set(cover), R = new Set(repairs);
  const first = [...P].filter((d) => d <= today).sort()[0];
  const base = { count: 0, best: 0, bank: 0, practicedToday: P.has(today), restUsed: [], recentRest: false, gap: [], repairable: false, state: 'new' };
  if (!first) return base;
  let run = 0, best = 0, bank = 0;
  let latest = null; // the most recent gap: { days, prior } where prior is the run that was going before it
  const restUsed = [];
  for (let d = first, i = 0; d <= today && i < 4000; d = addDaysISO(d, 1), i++) {
    if (P.has(d)) {
      if (latest && latest.open) latest.open = false;
      run++;
      if (run % EARN_EVERY === 0) bank = Math.min(BANK_MAX, bank + 1);
      best = Math.max(best, run);
    } else if (d === today) {
      /* still open */
    } else if (C.has(d) || R.has(d)) {
      /* covered for free */
    } else if (run > 0 && bank > 0) {
      bank--; restUsed.push(d);
    } else {
      if (!latest || !latest.open) latest = { days: [], prior: run, open: true };
      run = 0; latest.days.push(d);
    }
  }
  const gap = latest ? latest.days : [];
  const ageOk = gap.length > 0 && gap.length <= MAX_REPAIR_GAP && num(today) - num(gap[gap.length - 1]) <= REPAIR_WINDOW_DAYS;
  const open = !!(latest && latest.open);
  const state = run === 0 ? (open ? 'fresh' : 'new') : P.has(today) ? 'active' : 'open';
  return { count: run, best, bank, practicedToday: P.has(today), restUsed: restUsed.slice(-10), recentRest: restUsed.some((d) => num(today) - num(d) <= 3), gap: gap.slice(), repairable: ageOk && latest.prior > 0, priorRun: latest ? latest.prior : 0, state };
}

/** The days a repair should cover: the current gap, nothing else. */
export const repairDays = (r) => (r.repairable ? r.gap.slice() : []);

const days = (k) => `${k} ${k === 1 ? 'day' : 'days'}`;
/** One plain sentence about where the rhythm stands. Never uses loss wording (tests scan this file's copy). */
export function rhythmSentence(r) {
  if (r.state === 'new') return 'Your rhythm starts with your first practice day.';
  if (r.state === 'fresh') return r.repairable
    ? `A fresh start whenever you like. Your earlier run was ${days(r.priorRun)}, and one free tap brings it back.`
    : `A fresh start whenever you like. Your best run so far is ${days(r.best)}.`;
  const rest = r.recentRest ? ' A rest day you had banked kept it going.' : '';
  const head = r.state === 'active' ? `Day ${r.count} of your rhythm, including today.` : `${days(r.count)} in your rhythm. Today is still open.`;
  const bank = r.bank > 0 ? ` You have ${r.bank} rest ${r.bank === 1 ? 'day' : 'days'} banked.` : '';
  const back = r.repairable ? ` Your earlier run of ${days(r.priorRun)} can come back with one free tap.` : '';
  return head + bank + rest + back;
}
