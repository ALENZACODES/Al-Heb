// @ts-check
// Hebrew -> Latin transliteration for ALEF (lane 3).
//
//   transliterate(pointedHebrew, {scheme, tradition, ...options}) -> string
//
// Schemes:
//   'siddur'            informal American-siddur style (ch/kh, tz, k, ai/ei, final h shown)
//   'academic'          APPROXIMATION of the Academy of the Hebrew Language 2006 choices named in
//                       our notes (ẖ for chet, kh for khaf, ts, k, ay/oy, shva na = e). It is NOT a
//                       complete implementation: the official Hebrew-language rules PDF was not
//                       retrieved and several Wikipedia table cells for 2006 are blank.
//   'ashkenazi-siddur'  siddur style with the Ashkenazi values (forces tradition 'ashkenazi')
//
// Traditions: 'israeli' | 'sephardi' | 'ashkenazi'. israeli and sephardi currently produce
// IDENTICAL Latin output (their differences are pharyngeals / shva realisation, which the siddur
// schemes do not write); the IPA data in data/pronunciation/ differs.
//
// Options (all optional):
//   geminate      (default false)   double the consonant for dagesh chazak (spelling convention;
//                                   gemination itself is absent in spoken Israeli Hebrew)
//   shvaLevel     (1|2, default 2)  1 = three basic shva rules only; 2 adds the liturgical rules
//   shvaMode      ('liturgical'|'colloquial', default 'liturgical')
//                 colloquial drops a word-initial shva na when the word-initial letter is not a
//                 prefix letter or the next consonant is a sonorant (r l m n y). THIS HEURISTIC IS
//                 MY OWN DERIVATION from the notes' examples (zman, g'dola, brit); it is known to
//                 mis-handle e.g. k'tana (kaf is a prefix letter) and is not corpus-validated.
//   shvaStyle     ('e'|"'", default 'e')
//   finalHe       ('show'|'silent'; default show for siddur schemes, silent for academic)
//   kamatz        (ashkenazi only: 'o'|'aw', default 'o')       Jewfaq writes "Bawrukh"
//   cholam        (ashkenazi only: 'o'|'oy', default 'o')       'oy' is a Polish/Chasidic value
//   capitalize    (default false)
//
// Divine name: a word whose consonants are exactly יהוה is read as Adonai / Adonoy (convention).
// Kamatz katan: only U+05C7 or the tiny unverified list in kamatz-katan.js.

import { parseWord, MARK, stripTaamim } from './hebrew.js';
import { classifyShvas } from './shva.js';
import { kamatzKatanStemStart } from './kamatz-katan.js';

/** @typedef {import('./hebrew.js').Cluster} Cluster */

const PREFIX_LETTERS = new Set(['ו', 'ב', 'ל', 'מ', 'ה', 'ש', 'כ']);
const SONORANTS = new Set(['ר', 'ל', 'מ', 'ם', 'נ', 'ן', 'י']);
const BEGADKEFAT = new Set(['ב', 'ג', 'ד', 'כ', 'ך', 'פ', 'ף', 'ת']);
const NO_GEMINATE = new Set(['א', 'ע', 'ח', 'ר', 'ה']);

const SCHEMES = ['siddur', 'academic', 'ashkenazi-siddur'];
const TRADITIONS = ['israeli', 'sephardi', 'ashkenazi'];

function resolveOptions(opts = {}) {
  const scheme = opts.scheme ?? 'siddur';
  if (!SCHEMES.includes(scheme)) throw new RangeError(`unknown scheme: ${scheme}`);
  let tradition = opts.tradition ?? (scheme === 'ashkenazi-siddur' ? 'ashkenazi' : 'israeli');
  if (scheme === 'ashkenazi-siddur') tradition = 'ashkenazi';
  if (!TRADITIONS.includes(tradition)) throw new RangeError(`unknown tradition: ${tradition}`);
  return {
    scheme,
    tradition,
    academic: scheme === 'academic',
    ashk: tradition === 'ashkenazi',
    geminate: opts.geminate ?? false,
    shvaLevel: opts.shvaLevel ?? 2,
    shvaMode: opts.shvaMode ?? 'liturgical',
    shvaStyle: opts.shvaStyle ?? 'e',
    finalHe: opts.finalHe ?? (scheme === 'academic' ? 'silent' : 'show'),
    kamatz: opts.kamatz ?? 'o',
    cholam: opts.cholam ?? 'o',
    capitalize: opts.capitalize ?? false,
  };
}

/** Latin for a vowel id under resolved options. */
function vowelLatin(id, o) {
  switch (id) {
    case 'kamatz': return o.ashk ? (o.kamatz === 'aw' ? 'aw' : 'o') : 'a';
    case 'kamatz-katan': return 'o';
    case 'patach': return 'a';
    case 'tzere': return o.ashk ? 'ei' : 'e';
    case 'tzere-male': return 'ei';
    case 'segol': return 'e';
    case 'chirik': return 'i';
    case 'cholam': return o.ashk && o.cholam === 'oy' ? 'oy' : 'o';
    case 'kubutz': case 'shuruk': return 'u';
    case 'chataf-patach': return 'a';
    case 'chataf-segol': return 'e';
    case 'chataf-kamatz': return 'o';
    case 'shva-na': return o.shvaStyle;
    default: return '';
  }
}

/** Latin for a consonant cluster (the bare consonant, no vowel). */
function consonantLatin(c, o) {
  const dag = c.dagesh;
  switch (c.ch) {
    case 'א': case 'ע': return ''; // handled by caller (apostrophe rule)
    case 'ב': return dag ? 'b' : 'v';
    case 'ג': return 'g';
    case 'ד': return 'd';
    case 'ה': return 'h';
    case 'ו': return 'v';
    case 'ז': return 'z';
    case 'ח': return o.academic ? 'ẖ' : 'ch';
    case 'ט': return 't';
    case 'י': return 'y';
    case 'כ': case 'ך': return dag ? 'k' : 'kh';
    case 'ל': return 'l';
    case 'מ': case 'ם': return 'm';
    case 'נ': case 'ן': return 'n';
    case 'ס': return 's';
    case 'פ': case 'ף': return dag ? 'p' : 'f';
    case 'צ': case 'ץ': return o.academic ? 'ts' : 'tz';
    case 'ק': return 'k';
    case 'ר': return 'r';
    case 'ש': return c.dot === 'sin' ? 's' : 'sh'; // an unmarked shin is read as shin
    case 'ת': return !dag && o.ashk ? 's' : 't';
    default: return '';
  }
}

const hasFull = (c) => !!c && !!c.vowel && c.vowel !== 'shva';

/**
 * Transliterate one Hebrew word (no whitespace).
 * @param {string} word
 * @param {ReturnType<typeof resolveOptions>} o
 */
function transliterateWord(word, o) {
  const clean = stripTaamim(word);
  const clusters = parseWord(word);
  const n = clusters.length;
  if (n === 0) return '';

  // Divine name
  if (clusters.map((c) => c.ch).join('') === 'יהוה') return o.ashk ? 'adonoy' : 'adonai';

  // Kamatz katan from the (small, unverified) exception list
  const stem = kamatzKatanStemStart(clean);
  if (stem >= 0) {
    for (let i = stem; i < n; i++) {
      if (clusters[i].vowel === 'kamatz') { clusters[i].vowel = 'kamatz-katan'; break; }
    }
  }

  const shva = classifyShvas(clusters, { level: o.shvaLevel });

  // colloquial initial-shva drop (own heuristic, see header)
  if (o.shvaMode === 'colloquial' && n > 1) {
    const v = shva.get(0);
    if (v?.na && clusters[0].ch !== 'ו' && (!PREFIX_LETTERS.has(clusters[0].ch) || SONORANTS.has(clusters[1].ch))) {
      shva.set(0, { ...v, na: false, rule: 'colloquial-drop', heuristic: true });
    }
  }

  // Resolve matres lectionis
  const skip = new Array(n).fill(false);
  /** @type {(string|null)[]} */
  const vowelOf = clusters.map((c) => c.vowel);
  /** @type {(string|null)[]} */
  const diph = new Array(n).fill(null); // extra glide appended after the vowel, e.g. 'i' in ai

  for (let i = 0; i < n; i++) {
    const c = clusters[i];
    const prev = clusters[i - 1];
    if (c.ch === 'ו') {
      if (c.dagesh && !c.vowel && (i === 0 || !prev.vowel)) {
        // shuruk
        if (i === 0) vowelOf[i] = 'shuruk-solo';
        else { vowelOf[i - 1] = 'shuruk'; skip[i] = true; }
      } else if (c.vowel === 'cholam' && i > 0 && !prev.vowel && !skip[i - 1]) {
        vowelOf[i - 1] = 'cholam'; skip[i] = true; // cholam male
      } else if (!c.vowel && !c.dagesh && i > 0 && (prev.vowel === 'cholam' || prev.vowel === 'kubutz')) {
        skip[i] = true; // bare vav after o/u in a partially pointed text
      }
    } else if (c.ch === 'י' && !c.vowel && !c.dagesh && i > 0 && !skip[i - 1]) {
      const pv = clusters[i - 1].vowel;
      if (pv === 'chirik') skip[i] = true;
      else if (pv === 'tzere') { skip[i] = true; vowelOf[i - 1] = 'tzere-male'; }
      else if (pv === 'segol') skip[i] = true;
      else if (pv === 'kamatz' || pv === 'patach' || pv === 'cholam' || pv === 'kubutz') {
        const nextIsFinalVav = i + 1 === n - 1 && clusters[i + 1].ch === 'ו' && !clusters[i + 1].vowel && !clusters[i + 1].dagesh;
        skip[i] = true;
        // suffix -av (panav): the yod is silent and the final vav is read as v
        if (!(nextIsFinalVav && pv === 'kamatz')) {
          // diphthong: ai / ay, oi / oy ... ; Ashkenazi kamatz+yod reads 'oy' (Adonoy)
          diph[i - 1] = o.academic || (o.ashk && pv === 'kamatz') ? 'y' : 'i';
        }
      }
    }
  }

  let lastIdx = n - 1;
  while (lastIdx > 0 && skip[lastIdx]) lastIdx--;
  let out = '';
  for (let i = 0; i < n; i++) {
    if (skip[i]) continue;
    const c = clusters[i];
    const isFirst = i === 0;
    const isLast = i === lastIdx;
    let vid = vowelOf[i];
    if (vid === 'shva') vid = shva.get(i)?.na ? 'shva-na' : null;
    if (vid === 'shuruk-solo') vid = 'shuruk';

    // consonant
    let cons;
    if (vowelOf[i] === 'shuruk-solo') cons = '';
    else if (c.ch === 'א' || c.ch === 'ע') cons = !isFirst && vid ? "'" : '';
    else if (c.ch === 'ה') {
      // mappiq he is always pronounced; a final he without mappiq is a vowel letter
      if (c.dagesh) cons = 'h';
      else if (isLast && !c.vowel) cons = o.finalHe === 'show' ? 'h' : '';
      else if (!c.vowel) cons = '';
      else cons = 'h';
    } else cons = consonantLatin(c, o);

    // gemination spelling
    if (o.geminate && c.dagesh && cons && !NO_GEMINATE.has(c.ch) && c.ch !== 'ו') {
      if (!BEGADKEFAT.has(c.ch) || hasFull(clusters[i - 1])) cons += cons;
    }

    let v = vid ? vowelLatin(vid, o) : '';
    out += cons + v + (diph[i] ?? '');
  }
  return out;
}

/**
 * Transliterate pointed Hebrew text. Whitespace is preserved; maqaf becomes '-';
 * paseq and sof pasuq are dropped; non-Hebrew characters pass through.
 * @param {string} text
 * @param {{scheme?: 'siddur'|'academic'|'ashkenazi-siddur', tradition?: 'israeli'|'sephardi'|'ashkenazi',
 *   geminate?: boolean, shvaLevel?: 1|2, shvaMode?: 'liturgical'|'colloquial', shvaStyle?: string,
 *   finalHe?: 'show'|'silent', kamatz?: 'o'|'aw', cholam?: 'o'|'oy', capitalize?: boolean}} [opts]
 * @returns {string}
 */
export function transliterate(text, opts = {}) {
  const o = resolveOptions(opts);
  let out = '';
  let word = '';
  const flush = () => {
    if (!word) return;
    let t = transliterateWord(word, o);
    if (o.capitalize && t) t = t[0].toUpperCase() + t.slice(1);
    out += t;
    word = '';
  };
  for (const ch of text) {
    if (ch === MARK.MAQAF) { flush(); out += '-'; }
    else if (ch === MARK.PASEQ || ch === MARK.SOF_PASUQ) { flush(); }
    else if (ch >= '֐' && ch <= '׿') word += ch;
    else { flush(); out += ch; }
  }
  flush();
  return out;
}

export { transliterateWord, resolveOptions };
