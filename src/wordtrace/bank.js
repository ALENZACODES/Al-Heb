// Aleph word tracing: word bank, letter eligibility, levels, final-letter (sofit) rules. Pure, no DOM.
// Part of the word-tracing feature (src/wordtrace/*). Reads curriculum helpers; changes nothing outside this folder.
// @ts-check
import { cellsOf, BASE, MARK } from '../curriculum/hebrew.js';

/** Progression levels. `prayer` is a list-based level (any length 2-6), the other two are by letter count. */
export const LEVELS = Object.freeze([
  Object.freeze({ id: 'two', letters: 2, label: '2-letter words' }),
  Object.freeze({ id: 'three', letters: 3, label: '3-letter words' }),
  Object.freeze({ id: 'prayer', letters: 0, label: 'Prayer words' })
]);
export const LEVEL_IDS = LEVELS.map(l => l.id);
/** Words completed at a level before the next level is suggested (a suggestion, not a lock). */
export const SUGGEST_AFTER = 3;

/** final form id -> regular form id, and the reverse (from the shared contract ids). */
export const FINAL_OF = Object.freeze({ 'kaf-final': 'kaf', 'mem-final': 'mem', 'nun-final': 'nun', 'pe-final': 'pe', 'tsadi-final': 'tsadi' });
export const FINAL_FORM = Object.freeze(Object.fromEntries(Object.entries(FINAL_OF).map(([f, r]) => [r, f])));

/** Words never offered for writing practice (the Tetragrammaton; written practice of the Name is avoided in many traditions). */
export const EXCLUDED = Object.freeze(['\u05d9\u05b0\u05d4\u05d5\u05b8\u05d4']);

const HEB_ONLY = /^[א-תְ-ּׁׂ]+$/;

/** Unpointed consonant string of a word. @param {string} he */
export const plainOf = (he) => [...he].filter(c => BASE[c]).join('');

/** Letter ids (one per cell, in reading order). @param {string} he @returns {string[]} */
export const letterIds = (he) => cellsOf(he).map(c => c.base);

/** True if the string is a single pointed/unpointed Hebrew word (letters and the points we model, nothing else). */
export const isSimpleWord = (he) => typeof he === 'string' && HEB_ONLY.test(he) && cellsOf(he).length >= 1;

/** Count of vowel-ish marks (not shin/sin dot, not dagesh). */
export function vowelMarkCount(he) {
  return [...he].filter(c => MARK[c] && !['dagesh', 'shin-dot', 'sin-dot'].includes(MARK[c])).length;
}

/**
 * Final-letter (sofit) rule check for a word: a final form may only be the LAST letter, and a letter that has a final
 * form must use it when it is last. Returns a list of problems (empty = fine).
 * @param {string} he @returns {string[]}
 */
export function sofitProblems(he) {
  const ids = letterIds(he);
  const out = [];
  ids.forEach((id, i) => {
    const last = i === ids.length - 1;
    if (FINAL_OF[id] && !last) out.push(`final ${id} at position ${i + 1} of ${ids.length}`);
    if (FINAL_FORM[id] && last) out.push(`${id} is last but not in final form`);
  });
  return out;
}

/** Convert a regular form at the end of a word to its final form (typing helper). @param {string} he */
export function applyFinalForm(he) {
  const chars = [...he];
  // find the last letter char
  let i = chars.length - 1;
  while (i >= 0 && !BASE[chars[i]]) i--;
  if (i < 0) return he;
  const id = BASE[chars[i]];
  if (FINAL_FORM[id]) { const fin = Object.keys(BASE).find(k => BASE[k] === FINAL_FORM[id]); if (fin) chars[i] = fin; }
  return chars.join('');
}

/**
 * Letters the learner may be asked to trace.
 * A final form counts as known when it was traced itself OR its regular form is known (it is shown with a "final form" tag).
 * @param {Iterable<string>} traced letter ids completed in the tracing screen
 * @param {Iterable<string>} [fromLessons] letter ids introduced by completed lessons
 * @returns {Set<string>}
 */
export function knownLetters(traced, fromLessons = []) {
  const k = new Set([...traced, ...fromLessons]);
  for (const [fin, reg] of Object.entries(FINAL_OF)) if (k.has(reg)) k.add(fin);
  return k;
}

/** @param {{letters:string[]}} w @param {Set<string>} known */
export const usesOnly = (w, known) => w.letters.every(id => known.has(id));

/** Which level does a bank word belong to? */
export function levelOf(w) { return w.level; }

/**
 * Words the learner can do now.
 * @param {{words:any[]}} bank
 * @param {Set<string>|null} known null = any letters (practice mode)
 * @param {{level?:string}} [o]
 */
export function eligibleWords(bank, known, o = {}) {
  return bank.words.filter(w => (!o.level || w.level === o.level) && (known === null || usesOnly(w, known)));
}

/** @param {any} progress {[script]: {[he]: {done:number, level?:string}}} */
function doneAtLevel(progress, script, bank, level) {
  const p = (progress && progress[script]) || {};
  return bank.words.filter(w => w.level === level && p[w.he] && p[w.he].done > 0).length;
}

/** Suggest the level to work on: the first level with fewer than SUGGEST_AFTER finished words that still has eligible words. */
export function suggestLevel(bank, progress, script, known) {
  for (const lv of LEVELS) {
    if (!eligibleWords(bank, known, { level: lv.id }).length) continue;
    if (doneAtLevel(progress, script, bank, lv.id) < SUGGEST_AFTER) return lv.id;
  }
  const any = LEVELS.find(lv => eligibleWords(bank, known, { level: lv.id }).length);
  return any ? any.id : 'two';
}

/**
 * Choose the next word: due retrace words first (most overdue), then unseen words in bank order, then the least recently done.
 * @param {any[]} words eligible words
 * @param {{dueIds?:string[], progress?:any, script?:string, avoid?:string}} [o]
 */
export function pickNext(words, o = {}) {
  if (!words.length) return null;
  const avoid = o.avoid;
  const pool = words.length > 1 ? words.filter(w => w.he !== avoid) : words;
  const due = o.dueIds || [];
  for (const id of due) { const w = pool.find(x => x.he === id); if (w) return w; }
  const p = (o.progress && o.progress[o.script || 'print']) || {};
  const unseen = pool.find(w => !p[w.he]);
  if (unseen) return unseen;
  return pool.slice().sort((a, b) => String((p[a.he] || {}).last || '').localeCompare(String((p[b.he] || {}).last || '')))[0];
}

// ------------------------------------------------------------------ bank builder (used by build.mjs and tests)

/**
 * Build the compact word bank from course data. Deterministic.
 * @param {{lessons:any[], vocab:any[], prayerWords:any[], siddurText:string, caps?:{two:number, three:number}}} src
 */
export function buildBank(src) {
  const caps = Object.assign({ two: 140, three: 220 }, src.caps || {});
  const siddurPlain = (src.siddurText || '').replace(/[^א-ת\s]/g, '');
  const siddurSet = new Set(siddurPlain.split(/\s+/).filter(Boolean));
  const prayerList = new Map(); // he -> gloss
  for (const p of src.prayerWords || []) prayerList.set(p.he, p.gloss || '');
  /** @type {Map<string, any>} */ const byHe = new Map();
  /** @type {Set<string>} */ const plainTaken = new Set();
  const add = (w) => { if (!byHe.has(w.he)) byHe.set(w.he, w); };
  const mk = (he, en, extra) => {
    const letters = letterIds(he);
    return Object.assign({ he, plain: plainOf(he), en, letters, n: letters.length }, extra);
  };
  // 1) prayer words (curated list in data/pronunciation/prayerwords.json + 4-6 letter lesson words attested in the siddur texts)
  for (const [he, gloss] of prayerList) if (isSimpleWord(he)) add(mk(he, gloss, { level: 'prayer', src: 'prayerwords', pointing: 'course-data' }));
  src.lessons.forEach((l) => (l.words || []).forEach((w, i) => {
    if (!isSimpleWord(w.he) || vowelMarkCount(w.he) < 1) return;
    const n = letterIds(w.he).length; if (n < 2 || n > 6) return;
    // 2-3 letter words keep their length level; 4+ letter words are only kept when they occur in the siddur texts
    if (n >= 4 && !siddurSet.has(plainOf(w.he))) return;
    add(mk(w.he, w.en, { level: n === 2 ? 'two' : n === 3 ? 'three' : 'prayer', src: 'lesson', lesson: l.id, audio: `${l.id}-w${i + 1}`, pointing: 'course-data' }));
  }));
  // 2) vocabulary (2- and 3-letter only; 4+ letters are too long to be a beginner word unless in the prayer list)
  const vocab = src.vocab.filter(v => isSimpleWord(v.he) && vowelMarkCount(v.he) >= 1 && [2, 3].includes(letterIds(v.he).length))
    .sort((a, b) => (a.flags && a.flags.needsReview ? 1 : 0) - (b.flags && b.flags.needsReview ? 1 : 0) || (a.frequencyRank || 1e9) - (b.frequencyRank || 1e9) || a.he.localeCompare(b.he));
  const counts = { two: 0, three: 0 };
  for (const w of byHe.values()) if (counts[w.level] !== undefined) counts[w.level]++;
  for (const v of vocab) {
    const n = letterIds(v.he).length; const lv = n === 2 ? 'two' : 'three';
    if (counts[lv] >= caps[lv]) continue;
    if (byHe.has(v.he)) continue;
    // one entry per pointed form; skip a second pointing of the same consonants to avoid ambiguous niqqud scoring
    if (plainTaken.has(lv + plainOf(v.he)) || [...byHe.values()].some(x => x.plain === plainOf(v.he))) continue;
    plainTaken.add(lv + plainOf(v.he));
    add(mk(v.he, String(v.en || '').split(';')[0].trim(), { level: lv, src: 'vocab', lesson: v.unlockLesson || undefined, rank: v.frequencyRank || undefined, pointing: v.flags && v.flags.needsReview ? 'wiktionary-needs-review' : 'wiktionary' }));
    counts[lv]++;
  }
  const order = { two: 0, three: 1, prayer: 2 };
  const words = [...byHe.values()].filter(w => !sofitProblems(w.he).length && !EXCLUDED.includes(w.he))
    .sort((a, b) => order[a.level] - order[b.level] || (a.src === 'vocab' ? 1 : 0) - (b.src === 'vocab' ? 1 : 0) || (a.rank || 0) - (b.rank || 0) || a.he.localeCompare(b.he));
  const lessonLetters = {};
  for (const l of src.lessons) if ((l.letters || []).length) lessonLetters[l.id] = l.letters;
  return { schema: 'alef-wordtrace-bank/1', levels: LEVELS.map(l => l.id), lessonLetters, words };
}
