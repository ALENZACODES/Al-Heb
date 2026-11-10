// @ts-check
// Pure helpers for the "reading without vowels" ladder. No DOM, no I/O.
// Marks removed to make "scroll style" text: vowel points U+05B0-05BB and U+05C7, dagesh/mapiq U+05BC, shin/sin dots
// U+05C1-05C2, cantillation U+0591-05AF (already absent from the corpus), meteg and the other extras. Also removed: sof pasuq
// (verse-end mark). A maqaf (hyphen) becomes a space. The result is a plain consonant text as printed unpointed Tanakh editions
// show it. It does NOT imitate a scribe's hand, column layout or letter crowns.

/** Characters that carry no consonant: every combining mark in the Hebrew block. */
const MARKS = /[֑-ְ֯-ׇֽֿׁׂׅׄ]/g;
const MAQAF = '־';
const SOF_PASUQ = '׃';

/** @param {string} he */
export function unpoint(he) {
  return he.normalize('NFC').replace(MARKS, '').replace(/‍|͏/g, '').replace(new RegExp(MAQAF, 'g'), ' ')
    .replace(new RegExp(SOF_PASUQ, 'g'), '').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').trim();
}

/** Points only (vowels, dagesh, shin/sin dots) present in a string. */
export const pointCount = (he) => (he.match(/[ְ-ׇּׁׂ]/g) || []).length;

export const isPointed = (he) => pointCount(he) > 0;

/** Split a line into display words. A maqaf-joined pair is ONE word here (it is read as one unit); verse-end mark is dropped. */
export function wordsOfLine(line) {
  return line.split(/\s+/).map((w) => w.replace(new RegExp(SOF_PASUQ, 'g'), '')).filter((w) => /[א-ת]/.test(w));
}

/**
 * Same split as wordsOfLine, but each word also says whether the source text has a sof pasuq right after it, so a view can
 * draw it as a plain mark next to the word. The word itself never carries it.
 * @param {string} line
 * @returns {{word:string, stop:boolean}[]}
 */
export function wordsWithStops(line) {
  return line.split(/\s+/).map((raw) => ({ word: raw.replace(new RegExp(SOF_PASUQ, 'g'), ''), stop: raw.includes(SOF_PASUQ) })).filter((x) => /[א-ת]/.test(x.word));
}

/**
 * What one word shows at a ladder level.
 *   level 1 -> pointed;  level 2 -> pointed only on some words (stage 1 hides every third word's points, stage 2 keeps
 *   every third word only);  level 3 -> unpointed.
 * The fading pattern is a design choice of this app (kept simple and predictable). It is not a published method.
 * @param {string} word pointed word
 * @param {number} index position in the line, from 0
 * @param {{level:1|2|3, stage?:1|2}} mode
 * @returns {{text:string, pointed:boolean}}
 */
export function shownWord(word, index, mode) {
  const bare = unpoint(word);
  if (mode.level === 1) return { text: word, pointed: true };
  if (mode.level === 3) return { text: bare, pointed: false };
  const stage = mode.stage === 2 ? 2 : 1;
  const keep = stage === 1 ? index % 3 !== 2 : index % 3 === 0;
  return keep ? { text: word, pointed: true } : { text: bare, pointed: false };
}

/** Replace the divine name (any prefix form) with its spoken substitute so transliteration and the checker say "Adonai". */
export function spokenForm(he) {
  return he.normalize('NFC').replace(/יְ?הוָה/g, 'אֲדֹנָי');
}

/** True when a pointed word contains the four-letter divine name. */
export const hasDivineName = (word) => /יְ?הוָה/.test(word.normalize('NFC'));

/** Self-rating values stored for the check step. */
export const RATINGS = ['right', 'close', 'notyet'];
