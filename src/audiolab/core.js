// @ts-check
// Audio lane (12 Nov): pure helpers shared by the playback bar, play-all queues, tradition compare, readiness lines,
// listening drills, book read-along and audio packs. No DOM here; every function is tested in tests/audiolab.core.test.js.
import { clipPlaybackRate } from '../audio/player.js';
import { ACCENT_SOURCES } from '../audio/player.js';
import { findName } from '../shell/names.js';

/** Speed choices the playback bar offers (settings `clipRate` values; pitch is kept by the player). */
export const RATE_CHOICES = Object.freeze([
  { value: 'normal', label: '1×' },
  { value: 'slow-0.8', label: '0.8×' },
  { value: 'slow', label: '0.7×' },
  { value: 'slow-0.6', label: '0.6×' },
]);
export const rateOf = (value) => clipPlaybackRate(value);

/** "0:07" from seconds; '' for unknown. */
export function fmtTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '';
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Progress of a media element: {fraction 0..1, text "0:03 / 0:07"}, or null while its length is not known. */
export function progressOf(media) {
  const d = Number(media?.duration), t = Number(media?.currentTime);
  if (!Number.isFinite(d) || d <= 0 || !Number.isFinite(t)) return null;
  const fraction = Math.max(0, Math.min(1, t / d));
  return { fraction, text: `${fmtTime(t)} / ${fmtTime(d)}` };
}

/** Music, interface sounds and game voice lines never show in the playback bar (same rule as src/shell/play-state.js). */
export const QUIET_SRC = /(^|\/)audio\/(music|sfx)\/|\/stings\/|\/israeli\/games\//;

// ---------- honest audio states (A7) ----------

/**
 * Count what a list of items can play, from the player's own plan (audio.status), never from a guess.
 * @param {any} audio shell audio (status) @param {{kind:string,id:string,text?:string}[]} items @param {any} [o] play options (voice, tradition)
 * @returns {{total:number, clip:number, device:number, held:number, coming:number, checking:number}}
 *   clip: a voice clip file plays; device: no clip, this device's Hebrew voice reads it; held: the clip is held for review;
 *   coming: no clip yet (and no device voice); checking: the clip list is still loading.
 */
export function readiness(audio, items, o = {}) {
  const out = { total: 0, clip: 0, device: 0, held: 0, coming: 0, checking: 0 };
  for (const it of items || []) {
    out.total++;
    let s = null;
    try { s = audio && typeof audio.status === 'function' ? audio.status(it.kind, it.id, { ...o, ...(it.text ? { text: it.text } : {}) }) : null; } catch { s = null; }
    if (s && s.source === 'file') out.clip++;
    else if (s && s.held) out.held++;
    else if (s && s.reason === 'checking audio...') out.checking++;
    else if (s && s.source === 'tts-fallback') out.device++;
    else out.coming++;
  }
  return out;
}

/**
 * One plain line: "48 of 50 lines have audio. 2 have audio coming." Never says more than the counts.
 * @param {ReturnType<typeof readiness>} r @param {string} [noun] plural noun, e.g. 'lines', 'words', 'pages'
 */
export function readinessLine(r, noun = 'items') {
  if (!r || !r.total) return '';
  if (r.checking) return `Checking which ${noun} have audio…`;
  const parts = [`${r.clip} of ${r.total} ${noun} have audio.`];
  if (r.held) parts.push(`${r.held} ${r.held === 1 ? 'is' : 'are'} held for review.`);
  if (r.device) parts.push(`${r.device} can be read by this device's Hebrew voice (not a clip).`);
  if (r.coming) parts.push(`${r.coming} ${r.coming === 1 ? 'has' : 'have'} audio coming.`);
  return parts.join(' ');
}

/** Book pages: a page has audio in a voice when it lists a clip and is not held (data/books/<id>.json). */
export function bookReadiness(pages, voice) {
  const out = { total: 0, clip: 0, device: 0, held: 0, coming: 0, checking: 0 };
  for (const p of pages || []) {
    out.total++;
    if (p?.audioHeld) out.held++;
    else if (p?.audio && p.audio[voice]) out.clip++;
    else out.coming++;
  }
  return out;
}

// ---------- three-tradition compare (A5) ----------

export const TRADITION_NAMES = Object.freeze({ israeli: 'Israeli', sephardi: 'Sephardi', ashkenazi: 'Ashkenazi' });
/**
 * What the setting `tradition` really plays for one item, from the player's plan, labelled honestly:
 *   own    a clip of its own in that tradition
 *   same   its own copy of the Israeli clip, because the reading is letter for letter the Israeli one (owner decision, 12 Nov)
 *   israeli  no clip of its own: it plays the Israeli clip of the same voice
 *   device the device's Hebrew voice (Israeli reading), not a clip
 *   held   held for review
 *   none   audio coming
 * @returns {{state:'own'|'same'|'israeli'|'device'|'held'|'none'|'checking', label:string}}
 */
export function compareState(tradition, plan) {
  const name = TRADITION_NAMES[tradition] || tradition;
  if (!plan) return { state: 'none', label: 'Audio coming' };
  if (plan.source === 'file') {
    if (plan.fileTradition && plan.fileTradition !== tradition) return { state: 'israeli', label: `Plays the Israeli clip (no ${name} clip yet)` };
    if (tradition !== 'israeli' && plan.entrySource === ACCENT_SOURCES.sameReading) return { state: 'same', label: `${name} clip: the same reading as Israeli` };
    return { state: 'own', label: `${name} clip of its own` };
  }
  if (plan.held) return { state: 'held', label: 'Held for review' };
  if (plan.reason === 'checking audio...') return { state: 'checking', label: 'Checking…' };
  if (plan.source === 'tts-fallback') return { state: 'device', label: "This device's voice (Israeli reading), not a clip" };
  return { state: 'none', label: 'Audio coming' };
}

// ---------- line words, step mode (A2) ----------

/** Hebrew words of a line (maqaf joins stay one word, as in the reader). */
export const lineWords = (he) => String(he || '').split(/\s+/).filter((w) => /[א-ת]/.test(w));
/** Word clip ids the reader uses for a one-line text: <lineId>-w1, -w2, ... (src/corpus/read.view.js playWord). */
export const wordIds = (lineId, n) => Array.from({ length: n }, (_, i) => `${lineId}-w${i + 1}`);
/** True when a word is the divine name or a prefixed form of it: never a drill answer, never typed. */
export const isNameish = (w) => findName(String(w || '')).length > 0;
/**
 * Syllable steps exist only where the app holds a syllable split. Lines and words have none today (data/lab/syllables.json lists
 * single letter-plus-vowel syllables only), so this answers null and the screen says so instead of inventing a split.
 * @param {{syllables?: string[]}} item
 */
export const syllableSplit = (item) => (Array.isArray(item?.syllables) && item.syllables.length ? item.syllables.slice() : null);
export const NO_SYLLABLES = 'No syllable split exists for this line yet, so step mode goes word by word.';

// ---------- book read-along (A8) ----------

/**
 * ESTIMATED word timings for a page clip: the clip length shared out by each word's letter count, plus a beat after punctuation.
 * There are no measured word timings for book pages; the screen labels these "estimated".
 * @param {string[]} words @param {number} duration seconds @returns {{start:number,end:number}[]}
 */
export function estimateWordTimings(words, duration) {
  const ws = (words || []).map((w) => {
    const letters = (String(w).match(/[א-ת]/g) || []).length || 1;
    return letters + (/[.,!?;:׃]$/.test(String(w)) ? 1.5 : 0);
  });
  const total = ws.reduce((a, b) => a + b, 0);
  if (!(duration > 0) || !total) return ws.map(() => ({ start: 0, end: 0 }));
  let t = 0;
  return ws.map((w) => { const start = t; t += (w / total) * duration; return { start, end: t }; });
}
/** Index of the word sounding at time t (estimated timings), or -1 before the first / after the clip. */
export function wordAt(timings, t) {
  if (!Array.isArray(timings) || !Number.isFinite(t)) return -1;
  for (let i = 0; i < timings.length; i++) if (t >= timings[i].start && t < timings[i].end) return i;
  return -1;
}

// ---------- gap-fill drill (A3) ----------

/** Seeded random numbers (mulberry32), so a test can fix a round. */
export function makeRng(seed = Date.now()) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffle = (a, rng) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
const bare = (w) => String(w).normalize('NFC').replace(/[֑-ׇ׳״׃,.;:!?־]/g, '');

/**
 * One gap-fill question from a one-line text whose word clips exist.
 * @param {{id:string, he:string, en?:string}} line
 * @param {(id:string)=>boolean} hasWordClip true when the word clip <line>-w<n> plays from a file
 * @param {string[]} pool other words (pointed) to draw wrong answers from
 * @returns {null | {lineId:string, words:string[], gap:number, answer:string, options:string[], ids:string[]}}
 *   null when the line has fewer than three words, a missing word clip, or no word that may be the gap.
 */
export function gapQuestion(line, hasWordClip, pool, rng = Math.random) {
  if (!line || String(line.he || '').includes('\n')) return null;
  const words = lineWords(line.he);
  if (words.length < 3) return null;
  const ids = wordIds(line.id, words.length);
  if (!ids.every((id) => hasWordClip(id))) return null; // the line is heard word by word: every word needs its clip
  const may = words.map((w, i) => i).filter((i) => !isNameish(words[i]) && bare(words[i]).length >= 2);
  if (!may.length) return null;
  const gap = may[Math.floor(rng() * may.length)];
  const answer = words[gap];
  const seen = new Set([bare(answer)]);
  const wrong = [];
  for (const w of shuffle((pool || []).filter((w) => !isNameish(w)), rng)) {
    const b = bare(w); if (b.length < 2 || seen.has(b)) continue;
    seen.add(b); wrong.push(w); if (wrong.length === 3) break;
  }
  if (wrong.length < 3) return null;
  return { lineId: line.id, words, gap, answer, options: shuffle([answer, ...wrong], rng), ids };
}

// ---------- dictation (A4) ----------

/**
 * Dictation items from the typing drills (data/typing/drills.json): words and short lines, never one with the divine name.
 * @param {{words?:any[], lines?:any[]}} data @returns {{id:string, kind:'word'|'line', he:string, pointed:string, en:string}[]}
 */
export function dictationItems(data, which = 'words') {
  const list = which === 'lines' ? (data?.lines || []) : (data?.words || []);
  return list.filter((x) => x && x.id && x.he && x.pointed && !isNameish(x.pointed) && !isNameish(x.he))
    .map((x) => ({ id: x.id, kind: which === 'lines' ? 'line' : 'word', he: x.he, pointed: x.pointed, en: x.en || x.title || '' }));
}

// ---------- audio packs (A10) ----------

/**
 * The clip files that would play for a list of items, from the player's plan (learner's voice and tradition), held clips never.
 * @returns {string[]} unique paths
 */
export function clipPaths(audio, items, o = {}) {
  const out = new Set();
  for (const it of items || []) {
    let s = null; try { s = audio.status(it.kind, it.id, o); } catch { s = null; }
    if (s && s.source === 'file' && s.path && !s.held) out.add(s.path);
  }
  return [...out];
}
/** Book page clips in one voice (held pages never). */
export const bookClipPaths = (pages, voice) => [...new Set((pages || []).filter((p) => p && !p.audioHeld && p.audio && p.audio[voice]).map((p) => p.audio[voice]))];
/** Lesson words grouped in sets of ten lessons: [{id, label, items:[{kind:'word', id}]}] (ids as in the clip list: r01-w1). */
export function lessonSets(lessons, size = 10) {
  const sets = [];
  const ls = (lessons || []).filter((l) => l && l.id && Array.isArray(l.words) && l.words.length);
  for (let i = 0; i < ls.length; i += size) {
    const part = ls.slice(i, i + size);
    sets.push({ id: `lessons-${part[0].id}-${part[part.length - 1].id}`, label: `Lessons ${part[0].id} to ${part[part.length - 1].id}`,
      items: part.flatMap((l) => l.words.map((_, k) => ({ kind: 'word', id: `${l.id}-w${k + 1}` }))) });
  }
  return sets;
}
/** "1.2 MB" style size. */
export function fmtBytes(n) {
  if (!Number.isFinite(n) || n < 0) return '';
  if (n < 1024) return `${n} bytes`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}
