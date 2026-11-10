// @ts-check
// "What can I read now?": which registry lines and words use ONLY letters and signs the learner has met.
// Pure functions (no DOM, no storage). A word is "decodable" when every letter and every vowel/dot sign in it is known;
// "almost" when exactly one thing is unknown. This measures what the learner has been taught, not how well they read it aloud.
import { LETTER_ID, MARK_ID, isHebrewLetter, stripAccents, foldedSkeleton } from '../corpus/normalize.js';

/** Token standing for the four-letter Name, which is read "Adonai" (taught as an exception, not by its letters). */
export const NAME_TOKEN = '@name';

/** Words of a Hebrew string: split on spaces and maqaf, keep only tokens that contain a letter. @param {string} text */
export function splitWords(text) {
  return String(text ?? '').split(/[\s־]+/).filter((w) => [...w].some(isHebrewLetter));
}

/**
 * Everything a reader must know to decode one word.
 * Shuruk = vav carrying only a dagesh dot (counted as 'shuruk', not 'dagesh'). Qamats-qatan counts as kamatz; holam-haser as cholam.
 * @param {string} word @returns {Set<string>} letter ids, sign ids, or {NAME_TOKEN}
 */
export function requirementsOf(word) {
  const s = stripAccents(String(word)).normalize('NFC');
  if (foldedSkeleton(s) === 'יהוה') return new Set([NAME_TOKEN]);
  const need = new Set();
  const chars = [...s];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (!isHebrewLetter(c)) continue;
    need.add(LETTER_ID[c]);
    const ids = [];
    for (let j = i + 1; j < chars.length && !isHebrewLetter(chars[j]); j++) { const m = MARK_ID[chars[j]]; if (m) ids.push(m); }
    const hasVowel = ids.some((m) => m !== 'dagesh' && m !== 'shin-dot' && m !== 'sin-dot');
    for (const m of ids) need.add(m === 'dagesh' && c === 'ו' && !hasVowel ? 'shuruk' : m);
  }
  return need;
}

/** @param {string[]} letters @param {string[]} signs @param {boolean} [nameKnown] */
export function knownSet(letters, signs, nameKnown = false) {
  const k = new Set([...letters, ...signs]);
  if (nameKnown) k.add(NAME_TOKEN);
  return k;
}

/** Unknown requirements of a word, sorted. @param {string} word @param {Set<string>} known */
export function missingIn(word, known) {
  return [...requirementsOf(word)].filter((r) => !known.has(r)).sort();
}

/**
 * Split texts into lines (registry entries use "\n" between lines) and grade each.
 * @param {Array<{id:string,title?:string,he:string}>} entries
 * @param {Set<string>} known
 * @returns {Array<{id:string,entryId:string,n:number,title:string,he:string,words:number,missing:string[],status:'full'|'almost'|'no'}>}
 */
export function gradeLines(entries, known) {
  const out = [];
  for (const e of entries) {
    const lines = String(e.he ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
    lines.forEach((he, i) => {
      const words = splitWords(he);
      const miss = new Set();
      for (const w of words) for (const m of missingIn(w, known)) miss.add(m);
      const missing = [...miss].sort();
      out.push({ id: lines.length > 1 ? `${e.id}#${i + 1}` : e.id, entryId: e.id, n: i + 1, title: e.title ?? e.id, he, words: words.length, missing, status: missing.length === 0 ? 'full' : missing.length === 1 ? 'almost' : 'no' });
    });
  }
  return out;
}

/** True when every line of every listed entry is fully decodable (and each entry exists). */
export function entriesDecodable(entries, ids, known) {
  const by = new Map(entries.map((e) => [e.id, e]));
  if (!ids.length || ids.some((i) => !by.has(i))) return false;
  return gradeLines(ids.map((i) => /** @type {any} */ (by.get(i))), known).every((l) => l.status === 'full');
}

/** True when every given word is decodable. @param {string[]} words @param {Set<string>} known */
export function wordsDecodable(words, known) {
  return words.length > 0 && words.every((w) => missingIn(w, known).length === 0);
}

/**
 * Distinct words (exact pointed spelling) from the lines, split into readable and one-sign-away, most frequent first.
 * @param {Array<{he:string}>} lines @param {Set<string>} known
 */
export function gradeWords(lines, known) {
  /** @type {Map<string,number>} */ const freq = new Map();
  for (const l of lines) for (const w of splitWords(l.he)) { const k = stripAccents(w).normalize('NFC').replace(/[׃׀]/g, ''); if (k) freq.set(k, (freq.get(k) || 0) + 1); }
  const full = [], almost = [];
  for (const [w, n] of freq) {
    const miss = missingIn(w, known);
    if (miss.length === 0) full.push({ he: w, count: n });
    else if (miss.length === 1) almost.push({ he: w, count: n, missing: miss[0] });
  }
  const byFreq = (a, b) => b.count - a.count || a.he.localeCompare(b.he, 'he');
  return { total: freq.size, full: full.sort(byFreq), almost: almost.sort(byFreq) };
}

/**
 * Which one missing sign would unlock the most "almost" lines (a concrete next step).
 * @param {ReturnType<typeof gradeLines>} lines @returns {Array<{id:string,lines:number}>} best first
 */
export function unlockers(lines) {
  /** @type {Map<string,number>} */ const m = new Map();
  for (const l of lines) if (l.status === 'almost') m.set(l.missing[0], (m.get(l.missing[0]) || 0) + 1);
  return [...m].map(([id, n]) => ({ id, lines: n })).sort((a, b) => b.lines - a.lines || a.id.localeCompare(b.id));
}
