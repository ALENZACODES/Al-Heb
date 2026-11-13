// @ts-check
// Speaking Studio (#/speak-studio): pure logic, no DOM, no clock, no store. CODER-100 G1 record and compare (waveform peaks),
// G2 shadowing timing, G3 self-rated rubric, G5 machine-guess wording, G6 pronunciation gym, G8 fluency by week, G9 speaking streak,
// G10 voice journal ordering. Nothing here hears the learner: every rating is the learner's own self-assessment, the fluency figures
// are words per minute and self-reported stumbles from Timed read-aloud (src/timedread), and the browser recognizer's text is shown
// only as "a machine guess, not a grade".
import { wpm as readWpm } from '../timedread/model.js';

export const STORE_KEY = 'voice.v1';
export const AXES = Object.freeze([
  { id: 'vowels', label: 'Vowels', ask: 'Did each vowel sound the way the model says it?' },
  { id: 'stress', label: 'Stress', ask: 'Did you lean on the same syllables as the model?' },
  { id: 'fluency', label: 'Fluency', ask: 'Did you read it smoothly, without stopping?' },
]);
export const RATING = Object.freeze([[1, '1 Not yet'], [2, '2 Nearly'], [3, '3 Like the model']]);
export const SELF_LABEL = 'Self-assessment: your own rating, not a score from Aleph.';
export const MACHINE_LABEL = 'A machine guess, not a grade.';
export const MACHINE_NOTE = 'This uses your browser\'s own speech recognizer set to Hebrew. Aleph has not measured how well it hears Hebrew, and it writes without vowel points. Your browser may send the sound to its maker to do the recognition; Aleph itself sends nothing.';
export const MACHINE_NOTE_DEVICE = 'This listens on this device, with the listening pack you downloaded. Nothing you say leaves it. It writes without vowel points and can mishear, so read its line as a guess.';
export const FLUENCY_NOTE = 'Words per minute and the stumbles you marked yourself, from Timed read-aloud. This is speed and smoothness, not pronunciation accuracy.';
export const GAP_FACTORS = Object.freeze([1, 1.25, 1.5, 2]);
export const MIN_TURN_MS = 1000, MAX_TURN_MS = 20000;
export const GOAL_DAYS = Object.freeze([1, 2, 3, 4, 5, 6, 7]);
export const DEFAULT_GOAL = 3;
const MAX_RATINGS = 1000;

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const isDay = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
const nat = (v) => (Number.isInteger(v) && v > 0 ? v : 0);

/** Local calendar day key for a time (device time zone). */
export const dayKey = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const addDays = (day, n) => { const [y, m, d] = day.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n).getTime()); };

/** The studio record: {v, ratings:[{line, at, vowels, stress, fluency}], days:{day:count}, goal}. */
export function normalizeState(raw) {
  const r = obj(raw);
  const ratings = (Array.isArray(r.ratings) ? r.ratings : []).filter((x) => x && typeof x.line === 'string' && Number.isFinite(x.at))
    .map((x) => ({ line: x.line, at: x.at, ...Object.fromEntries(AXES.map((a) => [a.id, [1, 2, 3].includes(x[a.id]) ? x[a.id] : null])) }))
    .filter((x) => AXES.some((a) => x[a.id] != null)).slice(-MAX_RATINGS);
  const days = Object.fromEntries(Object.entries(obj(r.days)).filter(([d, n]) => isDay(d) && nat(n)).slice(-400));
  return { v: 1, ratings, days, goal: GOAL_DAYS.includes(r.goal) ? r.goal : DEFAULT_GOAL };
}

/** G3: add one self-rating (at least one axis 1-3). Pure. */
export function addRating(state, line, at, scores) {
  const s = normalizeState(state);
  const row = { line, at, ...Object.fromEntries(AXES.map((a) => [a.id, [1, 2, 3].includes(scores?.[a.id]) ? scores[a.id] : null])) };
  if (!AXES.some((a) => row[a.id] != null)) return s;
  return { ...s, ratings: [...s.ratings, row].slice(-MAX_RATINGS) };
}
/** G9: count a recording made on a day. Pure. */
export const addRecordingDay = (state, day) => { const s = normalizeState(state); return { ...s, days: { ...s.days, [day]: (s.days[day] || 0) + 1 } }; };
export const setGoal = (state, goal) => ({ ...normalizeState(state), goal: GOAL_DAYS.includes(goal) ? goal : DEFAULT_GOAL });

/** G3 chart data: average self-rating per axis per week (Monday start), oldest first. */
export function ratingsByWeek(state) {
  const by = new Map();
  for (const r of normalizeState(state).ratings) {
    const wk = weekOf(dayKey(r.at));
    const b = by.get(wk) || { week: wk, n: 0, sum: { vowels: 0, stress: 0, fluency: 0 }, cnt: { vowels: 0, stress: 0, fluency: 0 } };
    b.n++;
    for (const a of AXES) if (r[a.id] != null) { b.sum[a.id] += r[a.id]; b.cnt[a.id]++; }
    by.set(wk, b);
  }
  return [...by.values()].sort((a, b) => a.week.localeCompare(b.week))
    .map((b) => ({ week: b.week, n: b.n, ...Object.fromEntries(AXES.map((a) => [a.id, b.cnt[a.id] ? Math.round((b.sum[a.id] / b.cnt[a.id]) * 10) / 10 : null])) }));
}
/** Monday of the week containing a day. */
export function weekOf(day) {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d), dow = (dt.getDay() + 6) % 7;
  return dayKey(new Date(y, m - 1, d - dow).getTime());
}

/** G6: the axis rated lowest on average over the last 30 ratings (null without ratings). */
export function weakestAxis(state) {
  const rs = normalizeState(state).ratings.slice(-30);
  let best = null;
  for (const a of AXES) {
    const v = rs.map((r) => r[a.id]).filter((x) => x != null);
    if (!v.length) continue;
    const avg = v.reduce((x, y) => x + y, 0) / v.length;
    if (!best || avg < best.avg) best = { id: a.id, label: a.label, avg: Math.round(avg * 10) / 10, n: v.length };
  }
  return best;
}
/**
 * G6 pronunciation gym: up to `size` lines for today, lowest self-rated first on the weakest axis (latest rating of each line);
 * lines rated 3 on every axis last time are left out. Ties keep the order of `lines`. Returns [] without ratings.
 * @param {any} state @param {{key:string}[]} lines the lines that can be practised (with their keys)
 */
export function gymSet(state, lines, size = 5) {
  const s = normalizeState(state), weak = weakestAxis(s);
  if (!weak) return [];
  const last = new Map();
  for (const r of s.ratings) last.set(r.line, r);
  const known = new Map(lines.map((l, i) => [l.key, i]));
  return [...last.values()].filter((r) => known.has(r.line) && AXES.some((a) => r[a.id] != null && r[a.id] < 3))
    .map((r) => ({ r, score: r[weak.id] ?? 2.5, i: known.get(r.line) }))
    .sort((a, b) => a.score - b.score || a.i - b.i).slice(0, size).map((x) => ({ ...lines[x.i], why: `${weak.label}: you rated it ${x.r[weak.id] ?? 'not rated'}` }));
}

/** G2: how long the learner's silent turn lasts: the model clip's length times the chosen factor, kept within bounds. */
export function turnMs(clipMs, factor) {
  const f = GAP_FACTORS.includes(factor) ? factor : 1;
  if (!Number.isFinite(clipMs) || clipMs <= 0) return MIN_TURN_MS * 2;
  return Math.max(MIN_TURN_MS, Math.min(MAX_TURN_MS, Math.round(clipMs * f)));
}

/** G1: waveform peaks: `buckets` maxima of |sample|, scaled to 0..1 by the loudest bucket (all zero for silence). */
export function peaks(samples, buckets = 80) {
  const n = samples?.length || 0, out = new Array(buckets).fill(0);
  if (!n) return out;
  const per = n / buckets;
  for (let b = 0; b < buckets; b++) {
    let m = 0;
    for (let i = Math.floor(b * per), e = Math.min(n, Math.floor((b + 1) * per)); i < e; i++) { const v = Math.abs(samples[i]); if (v > m) m = v; }
    out[b] = m;
  }
  const top = Math.max(...out);
  return top > 0 ? out.map((v) => Math.round((v / top) * 1000) / 1000) : out;
}

/** G5: the plain sentence for a recognizer result. Never a verdict. */
export function machineSentence(heard, line) {
  return heard ? `The machine heard: ${heard}. The line is: ${line}. ${MACHINE_LABEL}` : `The machine did not write anything down. ${MACHINE_LABEL}`;
}

/** G8: Timed read-aloud reads grouped by week: reads, median words per minute, stumbles per 100 words (self-reported). */
export function fluencyByWeek(reads) {
  const by = new Map();
  for (const r of Array.isArray(reads) ? reads : []) {
    if (!r || !Number.isFinite(r.at) || !(r.words > 0) || !(r.ms > 0)) continue;
    const wk = weekOf(dayKey(r.at));
    (by.get(wk) || by.set(wk, []).get(wk)).push(r);
  }
  return [...by].sort((a, b) => a[0].localeCompare(b[0])).map(([week, rs]) => {
    const w = rs.map((r) => readWpm(r)).sort((a, b) => a - b);
    const mid = w.length % 2 ? w[(w.length - 1) / 2] : (w[w.length / 2 - 1] + w[w.length / 2]) / 2;
    const words = rs.reduce((a, r) => a + r.words, 0), st = rs.reduce((a, r) => a + Math.min(r.stumbled || 0, r.words), 0);
    return { week, reads: rs.length, wpm: Math.round(mid), stumblesPer100: Math.round((st / words) * 1000) / 10 };
  });
}

/**
 * G9: speaking days: days with at least one recording, from the studio's own record plus Say it attempts that recorded (speak.v1
 * attempts with mode 'record'). Streak: consecutive days ending today, or ending yesterday when today has none yet.
 */
export function speakingDays(state, speakAttempts = []) {
  const days = new Set(Object.keys(normalizeState(state).days));
  for (const a of Array.isArray(speakAttempts) ? speakAttempts : []) if (a && a.mode === 'record' && Number.isFinite(a.at)) days.add(dayKey(a.at));
  return days;
}
export function speakingStreak(days, today) {
  let d = days.has(today) ? today : addDays(today, -1), n = 0;
  while (days.has(d)) { n++; d = addDays(d, -1); }
  return n;
}
/** This week's speaking days (Monday start) against the learner's weekly goal. */
export function weekGoal(days, today, goal) {
  const mon = weekOf(today);
  let n = 0;
  for (let i = 0; i < 7; i++) if (days.has(addDays(mon, i))) n++;
  const g = GOAL_DAYS.includes(goal) ? goal : DEFAULT_GOAL;
  return { days: n, goal: g, done: n >= g, text: n >= g ? `Weekly goal reached: ${n} of ${g} speaking days this week.` : `${n} of ${g} speaking days this week.` };
}

/** G10: journal entries for one passage, oldest first, with a "week n" label counted from the first entry. */
export function journalSeries(entries, line) {
  const mine = (Array.isArray(entries) ? entries : []).filter((e) => e && e.line === line && Number.isFinite(e.at)).sort((a, b) => a.at - b.at);
  if (!mine.length) return [];
  const t0 = mine[0].at;
  return mine.map((e) => ({ ...e, day: dayKey(e.at), week: Math.floor((e.at - t0) / (7 * 86400000)) + 1 }));
}
/** Passages in the journal with their number of takes and the first and last day, most recent first. */
export function journalPassages(entries) {
  const by = new Map();
  for (const e of Array.isArray(entries) ? entries : []) {
    if (!e || typeof e.line !== 'string' || !Number.isFinite(e.at)) continue;
    const p = by.get(e.line) || { line: e.line, title: e.title || e.line, takes: 0, first: e.at, last: e.at };
    p.takes++; p.first = Math.min(p.first, e.at); p.last = Math.max(p.last, e.at);
    by.set(e.line, p);
  }
  return [...by.values()].sort((a, b) => b.last - a.last).map((p) => ({ ...p, firstDay: dayKey(p.first), lastDay: dayKey(p.last) }));
}
