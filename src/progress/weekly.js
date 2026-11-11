// @ts-check
// "This week" card: the last 7 days ending today, plus an 8-week sparkline. Pure: no DOM, no storage, no clock (callers pass `now`).
//
// What the stores can and cannot say (nothing below is estimated):
//  - The engaged-time record ('streak', written by src/morning/engage.js through src/curriculum/streak.js; read-only here) keeps
//    today's engaged seconds and the dates of the last 30 days that reached the daily goal. It does NOT keep minutes for past days.
//    So minutes are a LOWER BOUND: GOAL_SECONDS for each past day that reached the goal, plus today's seconds so far.
//  - Review cards keep only their LAST review time and word cards no start date, so "cards reviewed" counts distinct cards whose
//    latest review fell in the week, and "new words" counts cards whose only review (reps = 1) fell in the week: both "at least".
//  - The sparkline plots DATED activity per week: lessons finished, timed reads, speaking-practice attempts, checkpoints and
//    loanword marks. Review cards are left out on purpose (only their latest review is dated, so older weeks would read low).
//  - Rest days are shown only when the streak record froze them (Shabbat / Yom Tov with the setting on, or days the learner declared).
import { weekStrip, projectStreak, GOAL_SECONDS } from '../curriculum/streak.js';
import { cleanState as cleanTimedReads } from '../timedread/model.js';
import { coerceState } from '../speak/model.js';
import { dayKey } from './model.js';
import { reviewCardsThisWeek } from '../lib/counts.js';

export const WEEKS = 8;
const DAY = 86400000;
const dayNum = (key) => { const [y, m, d] = key.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY); };
const toMs = (t) => (typeof t === 'string' ? Date.parse(t) : Number(t));

/** Whole local days between `t` and today (0 = today); null when `t` is not a time or is in the future. */
function daysAgo(t, todayKey) {
  const n = toMs(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  const a = dayNum(todayKey) - dayNum(dayKey(n));
  return a >= 0 ? a : null;
}

/** Every dated learner action the stores hold, as ms timestamps. @param {any} s Snapshot */
export function datedActivity(s) {
  const out = [];
  const push = (t) => { const n = toMs(t); if (Number.isFinite(n) && n > 0) out.push(n); };
  for (const t of Object.values(s.completed)) push(t);
  for (const r of cleanTimedReads(s.timedRead).reads) push(r.at);
  for (const a of coerceState(s.speak).attempts) push(a.at);
  for (const c of Object.values(s.checkpoints)) push(c && c.at);
  for (const c of Object.values(s.loanwords)) push(c && c.at);
  return out;
}

/**
 * @param {any} s Snapshot (model.js readSnapshot) @param {number|Date} now
 */
export function weeklySummary(s, now) {
  const today = dayKey(now);
  const strip = weekStrip(s.streak, now, s.rest);
  const proj = projectStreak(s.streak, now, s.rest);
  const done = strip.filter((x) => x.state === 'done');
  const pastDone = done.filter((x) => x.date !== today).length;
  const seconds = pastDone * GOAL_SECONDS + (proj.todaySeconds || 0);
  const frozen = strip.filter((x) => x.state === 'frozen');
  const rest = { shabbat: frozen.filter((x) => x.restKind === 'shabbat').length, yomtov: frozen.filter((x) => x.restKind === 'yomtov').length, declared: frozen.filter((x) => !x.restKind).length, total: frozen.length };

  const inWeek = (t) => { const a = daysAgo(t, today); return a !== null && a < 7; };
  const reviewed = { length: reviewCardsThisWeek(s.cards, s.vocab, now) }; // src/lib/counts.js: the number the Daily page shows too
  const newWords = [...Object.entries(s.vocab), ...Object.entries(s.cards).filter(([id]) => /^word:/.test(id))].filter(([, c]) => c && c.reps === 1 && c.lastReview && inWeek(c.lastReview));
  const reads = cleanTimedReads(s.timedRead).reads.filter((r) => inWeek(r.at)).length;
  const lessons = Object.values(s.completed).filter(inWeek).length;

  const series = new Array(WEEKS).fill(0);
  for (const t of datedActivity(s)) { const a = daysAgo(t, today); if (a === null || a >= WEEKS * 7) continue; series[WEEKS - 1 - Math.floor(a / 7)]++; }

  return {
    from: strip[0].date, to: today, days: strip,
    engagedDays: done.length, todaySeconds: proj.todaySeconds || 0, minutesAtLeast: Math.floor(seconds / 60),
    newWordsAtLeast: newWords.length, cardsReviewed: reviewed.length, reads, lessons,
    streak: { count: proj.count, best: proj.best, restToday: proj.restToday },
    rest, series, seriesTotal: series.reduce((a, b) => a + b, 0),
  };
}

/** One plain sentence per fact, the wording the screen uses. */
export function weeklySentences(w) {
  const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;
  const rest = w.rest.total ? `${n(w.rest.total, 'rest day', 'rest days')} honored (${[w.rest.shabbat && `${w.rest.shabbat} Shabbat`, w.rest.yomtov && `${w.rest.yomtov} Yom Tov`, w.rest.declared && `${w.rest.declared} you declared`].filter(Boolean).join(', ')})` : 'no rest days in this week';
  return {
    minutes: `At least ${n(w.minutesAtLeast, 'minute', 'minutes')} engaged`,
    days: `${w.engagedDays} of 7 days reached the daily goal`,
    words: `At least ${n(w.newWordsAtLeast, 'new word', 'new words')} first reviewed`,
    reviews: `${n(w.cardsReviewed, 'card', 'cards')} reviewed`,
    reads: `${n(w.reads, 'timed read', 'timed reads')} (self-reported)`,
    streak: `Streak: ${n(w.streak.count, 'day', 'days')}${w.streak.restToday ? ', resting today' : ''}`,
    rest,
  };
}

/**
 * Inline SVG sparkline as markup. Built only from numbers computed here (no learner text), so it is safe to assign to innerHTML.
 * Uses currentColor so it follows the theme; the caller supplies a text alternative next to it.
 * @param {number[]} values @param {{width?:number, height?:number, label?:string}} [o]
 */
export function sparklineSVG(values, { width = 160, height = 40, label = 'Dated activity per week, oldest to newest' } = {}) {
  const v = values.map((x) => (Number.isFinite(x) && x > 0 ? x : 0));
  const pad = 4, max = Math.max(1, ...v);
  const x = (i) => (v.length === 1 ? width / 2 : pad + (i * (width - 2 * pad)) / (v.length - 1));
  const y = (val) => height - pad - (val / max) * (height - 2 * pad);
  const pts = v.map((val, i) => `${x(i).toFixed(1)},${y(val).toFixed(1)}`).join(' ');
  const last = v.length - 1;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  return `<svg xmlns="http://www.w3.org/2000/svg" class="pg-spark" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(`${label}: ${v.join(', ')}`)}" focusable="false">`
    + `<line x1="${pad}" y1="${height - pad}" x2="${width - pad}" y2="${height - pad}" stroke="currentColor" stroke-opacity="0.35" stroke-width="1"/>`
    + (v.length > 1 ? `<polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>` : '')
    + (v.length ? `<circle cx="${x(last).toFixed(1)}" cy="${y(v[last]).toFixed(1)}" r="3" fill="currentColor"/>` : '')
    + '</svg>';
}
