// @ts-check
// Low-level Hebrew text helpers shared by shva.js and transliterate.js.
// Pure functions, no DOM. Code points per Unicode block U+0590-05FF.

export const MARK = {
  SHVA: 'ְ',
  CHATAF_SEGOL: 'ֱ',
  CHATAF_PATACH: 'ֲ',
  CHATAF_KAMATZ: 'ֳ',
  CHIRIK: 'ִ',
  TZERE: 'ֵ',
  SEGOL: 'ֶ',
  PATACH: 'ַ',
  KAMATZ: 'ָ',
  CHOLAM: 'ֹ',
  CHOLAM_CHASER_FOR_VAV: 'ֺ',
  KUBUTZ: 'ֻ',
  DAGESH: 'ּ',
  METEG: 'ֽ',
  MAQAF: '־',
  RAFE: 'ֿ',
  PASEQ: '׀',
  SHIN_DOT: 'ׁ',
  SIN_DOT: 'ׂ',
  SOF_PASUQ: '׃',
  KAMATZ_KATAN: 'ׇ',
};

/** vowel mark code point -> shared vowel id (kamatz-katan is a variant of kamatz). */
export const VOWEL_BY_CHAR = {
  [MARK.SHVA]: 'shva',
  [MARK.CHATAF_SEGOL]: 'chataf-segol',
  [MARK.CHATAF_PATACH]: 'chataf-patach',
  [MARK.CHATAF_KAMATZ]: 'chataf-kamatz',
  [MARK.CHIRIK]: 'chirik',
  [MARK.TZERE]: 'tzere',
  [MARK.SEGOL]: 'segol',
  [MARK.PATACH]: 'patach',
  [MARK.KAMATZ]: 'kamatz',
  [MARK.CHOLAM]: 'cholam',
  [MARK.CHOLAM_CHASER_FOR_VAV]: 'cholam',
  [MARK.KUBUTZ]: 'kubutz',
  [MARK.KAMATZ_KATAN]: 'kamatz-katan',
};

/** letter char -> shared letter id (final forms get their own ids, per CONTRACT). */
export const LETTER_ID = {
  'א': 'alef', 'ב': 'bet', 'ג': 'gimel', 'ד': 'dalet', 'ה': 'he', 'ו': 'vav', 'ז': 'zayin',
  'ח': 'chet', 'ט': 'tet', 'י': 'yod', 'כ': 'kaf', 'ך': 'kaf-final', 'ל': 'lamed', 'מ': 'mem',
  'ם': 'mem-final', 'נ': 'nun', 'ן': 'nun-final', 'ס': 'samekh', 'ע': 'ayin', 'פ': 'pe',
  'ף': 'pe-final', 'צ': 'tsadi', 'ץ': 'tsadi-final', 'ק': 'qof', 'ר': 'resh', 'ש': 'shin', 'ת': 'tav',
};

const isLetter = (c) => c >= 'א' && c <= 'ת';
/** cantillation accents U+0591-05AF (the ta'amim) */
export const isTaam = (c) => c >= '֑' && c <= '֯';

/**
 * @typedef {Object} Cluster
 * @property {string} ch        consonant letter (as written, may be a final form)
 * @property {string} id        shared letter id
 * @property {boolean} dagesh
 * @property {'shin'|'sin'|null} dot
 * @property {string|null} vowel   shared vowel id or null
 * @property {boolean} meteg
 * @property {boolean} taam      carries a cantillation accent
 * @property {boolean} rafe
 */

/**
 * Split one word (no spaces) into consonant clusters. Marks may come in any
 * order after the letter (we deliberately do NOT NFC-normalise, which reorders
 * combining marks). Non-Hebrew characters are returned in `rest` only if they
 * trail; callers split words on whitespace/maqaf first.
 * @param {string} word
 * @returns {Cluster[]}
 */
export function parseWord(word) {
  /** @type {Cluster[]} */
  const out = [];
  for (const c of word) {
    if (isLetter(c)) {
      out.push({ ch: c, id: LETTER_ID[c], dagesh: false, dot: null, vowel: null, meteg: false, taam: false, rafe: false });
      continue;
    }
    const cur = out[out.length - 1];
    if (!cur) continue;
    if (c === MARK.DAGESH) cur.dagesh = true;
    else if (c === MARK.SHIN_DOT) cur.dot = 'shin';
    else if (c === MARK.SIN_DOT) cur.dot = 'sin';
    else if (c === MARK.METEG) cur.meteg = true;
    else if (c === MARK.RAFE) cur.rafe = true;
    else if (isTaam(c)) cur.taam = true;
    else if (VOWEL_BY_CHAR[c]) {
      // two vowel marks on one letter do not occur in normal text; the last one wins
      cur.vowel = VOWEL_BY_CHAR[c];
    }
  }
  return out;
}

/** Strip cantillation (ta'amim), meteg, paseq and sof pasuq; keep letters, vowels, dagesh, dots. */
export function stripTaamim(s) {
  let r = '';
  for (const c of s) {
    if (isTaam(c) || c === MARK.METEG || c === MARK.PASEQ || c === MARK.SOF_PASUQ) continue;
    r += c;
  }
  return r;
}

/** Consonant skeleton (letters only, final forms kept). */
export function skeleton(s) {
  let r = '';
  for (const c of s) if (isLetter(c)) r += c;
  return r;
}

/** True if string contains any Hebrew-block code point. */
export const hasHebrew = (s) => /[֐-׿]/.test(s);

/** Is every code point of the string in U+0590-05FF (plus ASCII space/punct)? Used by tests. */
export function allInHebrewBlock(s) {
  for (const c of s) {
    if (c === ' ' || c === '-' || c === '/' || c === ',' || c === '.' || c === '(' || c === ')') continue;
    if (c < '֐' || c > '׿') return false;
  }
  return true;
}
