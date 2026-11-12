// Reading Tools (#/readlab): word helpers shared by the views and tools/readlab/build-data.mjs. Pure: no DOM, no network.
// Nothing here adds Hebrew. A word is matched to the word list only by its exact pointed spelling (trope and meteg removed);
// family letters and verb patterns are copied from data/roots/*.json through data/readlab/word-tags.json.
import { stripTaamim } from '../pronunciation/hebrew.js';
import { findName } from '../shell/names.js';

/** Hebrew letters, vowel points, dagesh, shin/sin dots and qamats qatan: the characters that make a pointed word. */
const KEEP = /[א-תְ-ׇּׁׂ]/;
/** Lookup key for a pointed word: trope, meteg and punctuation removed, then NFC (both sides of every lookup use this). */
export function wordKey(word) {
  return [...stripTaamim(String(word ?? ''))].filter((c) => KEEP.test(c)).join('').normalize('NFC');
}
/** True when the text holds the four-letter name (any form other than the ה׳ abbreviation). */
export const hasDivineName = (he) => findName(String(he ?? '')).some((w) => w.kind !== 'abbrev');

/**
 * Split a line into display words, keeping each word's own spelling. Maqaf joins two words into one display unit (as Progress
 * and the Torah pages count them); sof pasuq and other punctuation stay on the word for display and are dropped from `key`.
 * @returns {{text:string, key:string, index:number}[]}
 */
export function lineWords(line) {
  const out = [];
  for (const raw of String(line ?? '').split(/\s+/)) {
    if (!/[א-ת]/.test(raw)) continue;
    out.push({ text: raw, key: wordKey(raw), index: out.length });
  }
  return out;
}

const FINAL_TO_BASE = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const base = (c) => FINAL_TO_BASE[c] || c;
/** The letters of a family string as the data writes them ("כ־ו־ן" -> ["כ","ו","ן"]). */
export const familyLetters = (root) => [...String(root ?? '').replace(/[֑-ׇ]/g, '')].filter((c) => /[א-ת]/.test(c));

/**
 * Which letters of a word to highlight for its family letters: the first in-order match of every family letter (final forms
 * match their base letter). Returns letter positions counted over the word's Hebrew letters, or null when the letters are not
 * all found in order (the word is then labelled with its family letters but nothing is highlighted). This is a spelling match
 * made by the app, not a grammar analysis: weak letters that drop out of a form simply leave the word unhighlighted.
 * @param {string} word pointed word @param {string} root family letters as stored ("כ־ו־ן")
 * @returns {number[]|null}
 */
export function familyMatch(word, root) {
  const want = familyLetters(root).map(base);
  if (want.length < 2) return null;
  const letters = [...String(word ?? '')].filter((c) => /[א-ת]/.test(c)).map(base);
  const at = [];
  let j = 0;
  for (let i = 0; i < letters.length && j < want.length; i++) if (letters[i] === want[j]) { at.push(i); j += 1; }
  return j === want.length ? at : null;
}

/**
 * Split a word into display pieces: [{text, hit}], each piece one letter with its marks, so a view can mark the family letters.
 * Marks before the first letter (none in practice) stay with the first piece.
 */
export function letterPieces(word, hits = []) {
  const set = new Set(hits || []);
  const pieces = [];
  let n = -1;
  for (const c of String(word ?? '')) {
    if (/[א-ת]/.test(c)) { n += 1; pieces.push({ text: c, hit: set.has(n) }); } else if (pieces.length) pieces[pieces.length - 1].text += c; else pieces.push({ text: c, hit: false });
  }
  return pieces;
}

/** The verb patterns the colour key covers, in the Roots page order. Each has a colour AND a short text tag (never colour alone). */
export const PATTERN_KEY = Object.freeze([
  { b: "pa'al", tag: 'PA', cls: 'rl-b1' }, { b: "nif'al", tag: 'NI', cls: 'rl-b2' }, { b: "pi'el", tag: 'PI', cls: 'rl-b3' },
  { b: "pu'al", tag: 'PU', cls: 'rl-b4' }, { b: "hif'il", tag: 'HI', cls: 'rl-b5' }, { b: "huf'al", tag: 'HU', cls: 'rl-b6' },
  { b: "hitpa'el", tag: 'HT', cls: 'rl-b7' },
]);
export const patternOf = (b) => PATTERN_KEY.find((p) => p.b === b) || null;
