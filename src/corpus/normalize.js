// @ts-check
// Hebrew text normalisation for the ALEF corpus. Pure functions, no DOM, no I/O.
//
// NORMALISATION RULE (documented; tests/corpus.hebrew.test.js enforces it):
//   1. Display text (`he`) is POINTED text WITHOUT cantillation. Removed: ta'amim U+0591-U+05AF,
//      meteg/ga'ya U+05BD, rafe U+05BF, paseq U+05C0, upper/lower dot U+05C4/U+05C5,
//      combining grapheme joiner U+034F and zero-width/BOM characters.
//      (The cantillated source string stays in data/corpus/source-snapshot.json.)
//   2. Metsudah "holam haser" U+05BA is mapped to the ordinary holam U+05B9, so a vowel is one id.
//   3. The Tetragrammaton is printed in the Leningrad form (yod+sheva, he, vav+qamats, he = U+05D9 U+05B0
//      U+05D4 U+05D5 U+05B8 U+05D4); siddur sources that print it with a holam are rewritten to
//      that form so the whole corpus is uniform. Readers pronounce it "Adonai".
//   4. Punctuation: sof pasuq U+05C3 and maqaf U+05BE are kept. ASCII ':' becomes sof pasuq; ASCII
//      ',' '.' and parentheses are dropped (a trailing '.' becomes sof pasuq); "maqaf + space" is joined.
//   5. Final step is String.prototype.normalize('NFC'). For Hebrew, NFC does not compose anything
//      (all the Hebrew composites are composition-excluded), it only applies canonical ORDERING of
//      combining marks (vowel, then dagesh, then shin/sin dot by combining class). Using NFC means the
//      same word always has the same code-point order, so string equality, search and audio-id lookup
//      work. Precomposed presentation forms U+FB1D-U+FB4F are forbidden in the corpus.
//
// Letters: the 27 shared ids are alef..tav + 5 finals (see docs/CONTRACT.md).

export const TAAMIM_RE = /[֑-֯]/g;
export const STRIP_EXTRA_RE = /[ֽֿ׀ׅׄ͏​-‏‪-‮⁠﻿]/g;

/** letter char -> shared letter id */
export const LETTER_ID = {
  'א': 'alef', 'ב': 'bet', 'ג': 'gimel', 'ד': 'dalet', 'ה': 'he', 'ו': 'vav', 'ז': 'zayin',
  'ח': 'chet', 'ט': 'tet', 'י': 'yod', 'כ': 'kaf', 'ך': 'kaf-final', 'ל': 'lamed', 'מ': 'mem',
  'ם': 'mem-final', 'נ': 'nun', 'ן': 'nun-final', 'ס': 'samekh', 'ע': 'ayin', 'פ': 'pe',
  'ף': 'pe-final', 'צ': 'tsadi', 'ץ': 'tsadi-final', 'ק': 'qof', 'ר': 'resh', 'ש': 'shin', 'ת': 'tav',
};
/** the 22 base letters, in alphabetical order, as ids */
export const BASE_LETTER_IDS = ['alef', 'bet', 'gimel', 'dalet', 'he', 'vav', 'zayin', 'chet', 'tet', 'yod', 'kaf', 'lamed', 'mem', 'nun', 'samekh', 'ayin', 'pe', 'tsadi', 'qof', 'resh', 'shin', 'tav'];
export const FINAL_LETTER_IDS = ['kaf-final', 'mem-final', 'nun-final', 'pe-final', 'tsadi-final'];
/** final id -> base id */
export const FINAL_OF = { 'kaf-final': 'kaf', 'mem-final': 'mem', 'nun-final': 'nun', 'pe-final': 'pe', 'tsadi-final': 'tsadi' };
/** letter id -> char (base form) and final forms */
export const CHAR_OF = Object.fromEntries(Object.entries(LETTER_ID).map(([c, id]) => [id, c]));

/** combining mark code point -> shared vowel/mark id (shuruk is derived: vav + dagesh and no vowel) */
export const MARK_ID = {
  'ְ': 'shva', 'ֱ': 'chataf-segol', 'ֲ': 'chataf-patach', 'ֳ': 'chataf-kamatz',
  'ִ': 'chirik', 'ֵ': 'tzere', 'ֶ': 'segol', 'ַ': 'patach', 'ָ': 'kamatz',
  'ֹ': 'cholam', 'ֺ': 'cholam', 'ֻ': 'kubutz', 'ּ': 'dagesh', 'ׁ': 'shin-dot',
  'ׂ': 'sin-dot', 'ׇ': 'kamatz',
};
export const VOWEL_IDS = ['kamatz', 'patach', 'tzere', 'segol', 'chirik', 'cholam', 'kubutz', 'shuruk', 'shva', 'chataf-patach', 'chataf-segol', 'chataf-kamatz'];
export const MARK_IDS = [...VOWEL_IDS, 'dagesh', 'shin-dot', 'sin-dot'];

export const isHebrewLetter = (c) => c >= 'א' && c <= 'ת';
export const isHebrewMark = (c) => c >= '֑' && c <= 'ׇ' && c !== '־' && c !== '׀' && c !== '׃';

/** Remove cantillation and the other marks listed in the rule above. */
export function stripAccents(s) {
  return s.replace(TAAMIM_RE, '').replace(STRIP_EXTRA_RE, '');
}

/** Consonant skeleton: letters only (finals kept as written). */
export function skeleton(s) {
  let out = '';
  for (const c of s) if (isHebrewLetter(c)) out += c;
  return out;
}

/** Skeleton with final forms folded to base letters (for matching). */
export function foldedSkeleton(s) {
  return skeleton(s).replace(/ך/g, 'כ').replace(/ם/g, 'מ').replace(/ן/g, 'נ').replace(/ף/g, 'פ').replace(/ץ/g, 'צ');
}

/** Remove HTML-ish tags; optionally drop <small> blocks (stage directions) first, innermost first. */
export function stripTags(s, { dropSmall = false } = {}) {
  let t = s;
  if (dropSmall) {
    let prev;
    do { prev = t; t = t.replace(/<small>(?:(?!<small>)[\s\S])*?<\/small>/g, ' '); } while (t !== prev);
  }
  return t.replace(/<[^>]+>/g, '');
}

/** Letters wrapped in <s t="large"> (UXLC marks enlarged letters this way). Returns base-letter chars. */
export function largeLetters(raw) {
  const out = [];
  for (const m of raw.matchAll(/<s t="large">([^<]*)<\/s>/g)) for (const c of m[1]) if (isHebrewLetter(c)) out.push(c);
  return out;
}

const cp = (...a) => String.fromCodePoint(...a);
const TETRA_HOLAM = new RegExp(cp(0x5D9, 0x5B0, 0x5D4, 0x5B9, 0x5D5, 0x5B8, 0x5D4), 'g'); // yod sheva he holam vav qamats he
const TETRA_STD = cp(0x5D9, 0x5B0, 0x5D4, 0x5D5, 0x5B8, 0x5D4);                 // yod sheva he vav qamats he

/**
 * Normalise ONE raw source line to display Hebrew (rules 1-5).
 * @param {string} raw
 * @param {{dropSmall?: boolean}} [opts]
 */
export function cleanLine(raw, opts = {}) {
  let t = raw;
  t = t.replace(/<x>[\s\S]*?<\/x>/g, '');            // UXLC note markers
  t = t.replace(/\([^()]*<small>[^()]*\)/g, ' ');     // parenthesised variant/stage directions
  t = stripTags(t, { dropSmall: !!opts.dropSmall });
  t = stripAccents(t).normalize('NFC');
  t = t.replace(/ֺ/g, 'ֹ');                 // rule 2
  t = t.normalize('NFC').replace(TETRA_HOLAM, TETRA_STD); // rule 3
  t = t.replace(/־\s+/g, '־');              // rule 4: maqaf + space
  t = t.replace(/:/g, '׃');
  t = t.replace(/[.,()]/g, (m, i, s) => (m === '.' && !/\S/.test(s.slice(i + 1)) ? '׃' : ''));
  t = t.replace(/\s+׃/g, '׃').replace(/׃(?=\S)/g, '׃ ');
  t = t.replace(/\s+/g, ' ').trim();
  return t.normalize('NFC');
}

/** Split display Hebrew into reading tokens: whitespace separated; a maqaf-joined pair stays one token. */
export function wordsOf(he) {
  return he.split(/[\s]+/u).filter((w) => /[א-ת]/.test(w));
}

/** Clip a cleaned string by consonant skeletons (folded). Both bounds optional, inclusive. */
export function clipWords(he, { startAt, endAfter, last, first, noStop } = {}) {
  if (startAt) startAt = foldedSkeleton(startAt);
  if (endAfter) endAfter = foldedSkeleton(endAfter);
  let ws = he.split(' ');
  if (startAt) { const i = ws.findIndex((w) => foldedSkeleton(w) === startAt); if (i < 0) throw new Error('clip startAt not found: ' + startAt); ws = ws.slice(i); }
  if (endAfter) { const i = ws.findIndex((w) => foldedSkeleton(w) === endAfter); if (i < 0) throw new Error('clip endAfter not found: ' + endAfter); ws = ws.slice(0, i + 1); }
  if (last) ws = ws.slice(-last);
  if (first) ws = ws.slice(0, first);
  let out = ws.join(' ').replace(/׃$/, '');
  return out.normalize('NFC') + (noStop ? '' : String.fromCodePoint(0x5C3));
}

/** English cleaning: strip tags, decode the few entities Sefaria uses, collapse space. */
export function cleanEnglish(raw) {
  return raw.replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}
