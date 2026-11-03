// @ts-check
// Kamatz katan: the sign is identical to kamatz gadol in standard print, so the
// reader must know. We only handle (1) the explicit Unicode glyph U+05C7 and
// (2) the tiny exception list below.
//
// STATUS (honest): the four words come from the lane-3 brief ("kol, chochma,
// tochnit, korban"); the research notes say this list is "my own ... unverified".
// It has NOT been checked against a grammar. TODO: replace with a rule
// (closed unstressed syllable) once a grammar source is found, and with a
// sourced word list. Every entry therefore carries verified:false.

import { stripTaamim, MARK } from './hebrew.js';

/** @type {{he:string, translit:string, gloss:string, verified:boolean}[]} */
export const KAMATZ_KATAN_EXCEPTIONS = [
  { he: 'כָּל', translit: 'kol', gloss: 'all / every', verified: false },
  { he: 'חָכְמָה', translit: 'chochma', gloss: 'wisdom', verified: false },
  { he: 'תָּכְנִית', translit: 'tochnit', gloss: 'plan / program', verified: false },
  { he: 'קָרְבָּן', translit: 'korban', gloss: 'sacrifice', verified: false },
];

const PREFIX_LETTERS = new Set(['ו', 'ב', 'ל', 'מ', 'ה', 'ש', 'כ']);

/** compare form: no accents, no dagesh, no maqaf */
const norm = (s) => stripTaamim(s).split(MARK.DAGESH).join('').split(MARK.MAQAF).join('');

const STEMS = new Set(KAMATZ_KATAN_EXCEPTIONS.map((e) => norm(e.he)));

/** Remove the first letter plus its marks (a one-cluster prefix such as ו / ב). */
function dropFirstCluster(s) {
  const chars = [...s];
  let i = 1;
  while (i < chars.length && chars[i] >= 'ְ' && chars[i] <= 'ׇ') i++;
  return { first: chars[0], rest: chars.slice(i).join('') };
}

/**
 * If the word (or the word after ONE prefix cluster such as וְכָל, לְכָל) is on the
 * exception list, return the index of the cluster where the stem starts (0, or 1
 * after a prefix); the FIRST kamatz at or after that cluster is the kamatz katan.
 * Returns -1 when not on the list. (So מַאֲכָל does not match כָל.)
 * @returns {number}
 */
export function kamatzKatanStemStart(word) {
  const w = norm(word);
  if (STEMS.has(w)) return 0;
  const { first, rest } = dropFirstCluster(w);
  return PREFIX_LETTERS.has(first) && STEMS.has(rest) ? 1 : -1;
}

export const isKamatzKatanException = (word) => kamatzKatanStemStart(word) >= 0;
