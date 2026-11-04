// @ts-check
// Timed Read-Aloud: pure model. Self-assessed: the learner reads aloud, stops the timer and marks the words they stumbled on.
// Nothing here listens to audio, and nothing is measured by the app except elapsed time. No DOM, no clock, no store.
import { splitWords } from '../progress/decode.js';

export const KEY = 'timedread.v1';
export const MAX_READS = 500;
/** Faster than this cannot be reading aloud (it is a mis-tap on Stop); such a read is refused, not saved. */
export const MAX_PLAUSIBLE_WPM = 300;
export const MIN_MS = 1500;
export const HONEST_NOTE = 'Self-reported, not measured by the app. The app only keeps the time; you say which words tripped you.';

/** Words in a Hebrew line, same splitter Progress uses (maqaf-joined words count as one, sof-pasuq alone is not a word). @param {string} he */
export const wordList = (he) => splitWords(String(he ?? ''));
export const countWords = (he) => wordList(he).length;

/**
 * Build a read record, or {error}. `stumbled` is a list of 0-based word indexes the learner marked.
 * @param {{textId:string, lineId?:string, he?:string, words?:number, ms:number, stumbled?:number[], at:number}} i
 */
export function makeRead(i) {
  const words = Number.isInteger(i.words) ? /** @type {number} */ (i.words) : countWords(i.he ?? '');
  if (!i.textId || typeof i.textId !== 'string') return { error: 'no text chosen' };
  if (!(words >= 1)) return { error: 'the line has no words' };
  if (!Number.isFinite(i.ms) || i.ms < MIN_MS) return { error: 'that was too short to be a real read; try again' };
  const idx = [...new Set((i.stumbled ?? []).filter((n) => Number.isInteger(n) && n >= 0 && n < words))].sort((a, b) => a - b);
  const ms = Math.round(i.ms);
  const wpm = words / (ms / 60000);
  if (wpm > MAX_PLAUSIBLE_WPM) return { error: 'that was faster than anyone can read aloud, so it was not saved; try again' };
  return { read: { textId: i.textId, lineId: i.lineId ?? i.textId, words, ms, stumbled: idx.length, stumbledIdx: idx, at: i.at } };
}

/** 0..1 share of words read without stumbling. accuracy = 1 - stumbled / words. @param {{words:number,stumbled:number}} r */
export const accuracy = (r) => (r.words > 0 ? 1 - Math.min(r.stumbled, r.words) / r.words : 0);
/** Words per minute over all words (what the clock shows). */
export const wpm = (r) => (r.ms > 0 ? r.words / (r.ms / 60000) : 0);
/** Words per minute over words you did not stumble on (the number belt gates use). */
export const cleanWpm = (r) => (r.ms > 0 ? Math.max(0, r.words - r.stumbled) / (r.ms / 60000) : 0);
export const seconds = (r) => Math.round(r.ms / 100) / 10;

export function median(xs) {
  const a = xs.filter(Number.isFinite).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = a.length >> 1;
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** Validate/clean a stored value; corrupt entries are dropped, never thrown on. */
export function cleanState(v) {
  const reads = Array.isArray(v?.reads) ? v.reads : [];
  const ok = reads.filter((r) => r && typeof r.textId === 'string' && r.words >= 1 && r.ms >= 1 && Number.isInteger(r.stumbled) && r.stumbled >= 0 && r.stumbled <= r.words && Number.isFinite(r.at));
  return { v: 1, reads: ok.slice(-MAX_READS) };
}
export function addRead(state, read) { const s = cleanState(state); return { v: 1, reads: [...s.reads, read].slice(-MAX_READS) }; }

/** Reads for one text, oldest first. */
export const readsFor = (state, textId) => cleanState(state).reads.filter((r) => r.textId === textId);

/**
 * Ranges (not a score) over the last `n` reads of ONE text. Never mixes texts.
 * @returns {null|{count:number, wpm:{min:number,max:number,median:number}, cleanWpm:{min:number,max:number,median:number}, accuracy:{min:number,max:number}, seconds:{min:number,max:number}}}
 */
export function rangeFor(state, textId, n = 5) {
  const rs = readsFor(state, textId).slice(-n);
  if (!rs.length) return null;
  const span = (f) => { const v = rs.map(f); return { min: Math.min(...v), max: Math.max(...v), median: /** @type {number} */ (median(v)) }; };
  const a = rs.map(accuracy);
  return { count: rs.length, wpm: span(wpm), cleanWpm: span(cleanWpm), accuracy: { min: Math.min(...a), max: Math.max(...a) }, seconds: { min: Math.min(...rs.map(seconds)), max: Math.max(...rs.map(seconds)) } };
}

/** Words stumbled on most across reads of one text: [{idx, count}] most first. */
export function trickyWords(state, textId, max = 5) {
  const c = new Map();
  for (const r of readsFor(state, textId)) for (const i of r.stumbledIdx || []) c.set(i, (c.get(i) || 0) + 1);
  return [...c].map(([idx, count]) => ({ idx, count })).sort((a, b) => b.count - a.count || a.idx - b.idx).slice(0, max);
}

/** Plain-language one-liner for a range, no verdict. @param {NonNullable<ReturnType<typeof rangeFor>>} r */
export function describeRange(r) {
  const f = (x) => Math.round(x);
  const w = r.wpm.min === r.wpm.max ? `${f(r.wpm.min)}` : `${f(r.wpm.min)} to ${f(r.wpm.max)}`;
  const a = r.accuracy;
  const p = a.min === a.max ? `${Math.round(a.min * 100)}%` : `${Math.round(a.min * 100)}% to ${Math.round(a.max * 100)}%`;
  return `${r.count === 1 ? 'Your 1 read' : `Your last ${r.count} reads`}: ${w} words a minute, ${p} of words without a stumble. Self-reported.`;
}

/**
 * On-device speech recognition availability. We only DETECT it; nothing in the app starts it.
 * Browsers may send audio to a server for recognition, so the app never uses it unasked and ships no check that depends on it.
 * @param {any} [g] globalThis
 */
export function speechSupport(g = globalThis) {
  const C = g?.SpeechRecognition || g?.webkitSpeechRecognition;
  if (!C) return { available: false, lang: 'he-IL', note: 'No speech recognition in this browser. The check stays self-assessed.' };
  return { available: true, lang: 'he-IL', note: 'This browser has speech recognition, but it may send audio to a server and Hebrew support varies. ALEF does not use it. Your results are self-reported.' };
}
