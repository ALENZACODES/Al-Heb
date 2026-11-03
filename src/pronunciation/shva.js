// @ts-check
// Shva na (vocal) vs shva nach (silent) classifier.
//
// Rule sources (see research_notes/.../hebrew_vowels_pronunciation.md, Key Question 3 and 7):
//   BASIC (level 1, "3 rules", Sefaria sheet 626927 / HebrewPod101 / Hillel Torah packet):
//     B1 word-initial shva is na.
//     B2 of two shvas in a row mid-word, the first is nach and the second is na;
//        two shvas at the END of a word are both nach (Hillel Torah).
//     B3 any other shva (mid-word or final) is nach.
//   LITURGICAL (level 2, Bachur's conditions via Chazzanut Esnoga + Sefaria):
//     L1 under a letter with dagesh that follows a full vowel (dagesh chazak) -> na
//     L2 under the first of two identical letters (הִנְנִי) -> na
//     L3 after a long vowel that is not accented -> na.  IMPLEMENTED ONLY AS A HEURISTIC:
//        we do not know the stress of an arbitrary pointed word, so we assume milra
//        (final stress) and call the long vowel unaccented when another syllable
//        follows the shva. That assumption is MY derivation, not a sourced rule.
//     L4 the letter before the shva carries a meteg -> na  (Sefaria sheet)
//     X1 exception: שְׁתַּיִם / שְׁתֵּי / שְׁתֵּים initial shva is nach (Sefaria sheet)
//
// NOT IMPLEMENTED (TODO, flagged in SHVA_RULES with status 'todo'):
//   T1 shva "between two marked accents" is na (needs pasuk-level cantillation parsing)
//   T2 shva after a letter that carries a trope -> na (sources conflict with the
//      "accented long vowel => nach" reading; needs a grammar to reconcile)
//   T3 shva under the consonant after the prefixes כַּ מִ שֶׁ בַּ לַ הַ -> na, and after
//      conjunctive shuruk וּ -> nach "for most scholars" (needs morphology / a lexicon,
//      otherwise מִצְוֹת would wrongly get a vocal shva)
//   T4 HebrewPod101 heuristic "second letter alef / heh / ayin -> short e"
//   T5 colloquial Israeli shva realisation (zman, g'dola) beyond the small
//      sonorant heuristic in transliterate.js; no corpus data exists in our notes.

import { skeleton } from './hebrew.js';

/** @typedef {import('./hebrew.js').Cluster} Cluster */

/**
 * @typedef {Object} ShvaVerdict
 * @property {number} index         cluster index
 * @property {boolean} na           true = vocal
 * @property {string} rule          rule id (see SHVA_RULES)
 * @property {boolean} heuristic    true if the verdict rests on an unsourced assumption
 */

export const SHVA_RULES = [
  { id: 'B1', level: 1, status: 'implemented', text: 'Shva under the first letter of a word is vocal (na).', source: 'Sefaria sheet 626927; HebrewPod101' },
  { id: 'B2', level: 1, status: 'implemented', text: 'Two shvas in a row mid-word: the first is silent, the second is vocal. Two at the end of a word: both silent.', source: 'Sefaria sheet 626927; Hillel Torah packet' },
  { id: 'B3', level: 1, status: 'implemented', text: 'Any other shva in the middle or at the end of a word is silent (nach).', source: 'Sefaria sheet 626927' },
  { id: 'L1', level: 2, status: 'implemented', text: 'Shva under a letter with dagesh chazak (dagesh after a full vowel) is vocal.', source: 'Sefaria sheet 626927; Chazzanut Esnoga' },
  { id: 'L2', level: 2, status: 'implemented', text: 'Shva under the first of two identical letters is vocal (הִנְנִי).', source: 'Sefaria sheet 626927; Chazzanut Esnoga' },
  { id: 'L3', level: 2, status: 'implemented-heuristic', text: 'Shva after a long, unaccented vowel is vocal (קוֹלְךָ). Accent is guessed by assuming final stress.', source: 'Sefaria sheet 626927 (rule); the final-stress shortcut is an unsourced derivation' },
  { id: 'L4', level: 2, status: 'implemented', text: 'Shva after a letter that carries a meteg is vocal.', source: 'Sefaria sheet 626927' },
  { id: 'X1', level: 2, status: 'implemented', text: 'Exception: the initial shva of שְׁתַּיִם / שְׁתֵּי / שְׁתֵּים is silent.', source: 'Sefaria sheet 626927' },
  { id: 'T1', level: 2, status: 'todo', text: 'Shva between two marked accents is vocal (עִירְךָ).', source: 'Sefaria sheet 626927' },
  { id: 'T2', level: 2, status: 'todo', text: 'Shva after a letter carrying a trope is vocal (conflicts with L3 reading; unresolved).', source: 'Sefaria sheet 626927' },
  { id: 'T3', level: 2, status: 'todo', text: 'Shva after the prefixes כַּ מִ שֶׁ בַּ לַ הַ is vocal; after conjunctive וּ most scholars say silent. Needs morphology.', source: 'Sefaria sheet 626927' },
  { id: 'T4', level: 1, status: 'todo', text: 'If the second letter is alef, heh or ayin the shva is pronounced as a short e.', source: 'HebrewPod101 (heuristic)' },
  { id: 'T5', level: 1, status: 'todo', text: 'Colloquial Israeli realisation (z\'man, g\'dola): no corpus data in our notes.', source: 'Wikipedia: Modern Hebrew phonology (qualitative only)' },
];

const SHTAYIM = new Set(['שתים', 'שתי']); // consonant skeletons of שְׁתַּיִם / שְׁתֵּים / שְׁתֵּי

const isFullVowel = (c) => !!c.vowel && c.vowel !== 'shva';

/**
 * Is the syllable before cluster i closed by a LONG vowel? kamatz (gadol), tzere, cholam,
 * shuruk (vav + dagesh, no vowel) and chirik/tzere + quiescent yod. kamatz-katan is short
 * (the transliterator re-labels kamatz katan before calling us).
 */
function longVowelBefore(clusters, i) {
  const prev = clusters[i - 1];
  if (!prev) return false;
  if (prev.vowel === 'kamatz' || prev.vowel === 'tzere' || prev.vowel === 'cholam') return true;
  if (prev.ch === 'ו' && prev.dagesh && !prev.vowel) return true; // shuruk
  if (prev.ch === 'י' && !prev.vowel && !prev.dagesh) {
    const pp = clusters[i - 2];
    if (pp && (pp.vowel === 'chirik' || pp.vowel === 'tzere')) return true; // chirik/tzere malei
  }
  return false;
}

/** is cluster j a vowel letter (quiescent yod after chirik/tzere, or vav carrying shuruk/cholam)? */
function isMater(clusters, j) {
  const c = clusters[j];
  if (!c || j === 0) return false;
  if (c.ch === 'ו' && ((c.dagesh && !c.vowel) || c.vowel === 'cholam') && !clusters[j - 1].vowel) return true;
  if (c.ch === 'י' && !c.vowel && !c.dagesh) {
    const pv = clusters[j - 1].vowel;
    return pv === 'chirik' || pv === 'tzere' || pv === 'segol';
  }
  return false;
}

/** is there another vowel-bearing cluster after cluster i? (milra assumption for L3) */
function hasVowelAfter(clusters, i) {
  for (let j = i + 1; j < clusters.length; j++) if (isFullVowel(clusters[j])) return true;
  return false;
}

/**
 * Classify every shva in a word.
 * @param {Cluster[]} clusters  from parseWord (matres lectionis still present as clusters)
 * @param {{level?: 1|2}} [opts]  level 1 = basic three rules only; level 2 (default) adds L1-L4, X1.
 * @returns {Map<number, ShvaVerdict>}
 */
export function classifyShvas(clusters, opts = {}) {
  const level = opts.level ?? 2;
  const skel = skeleton(clusters.map((c) => c.ch).join(''));
  /** @type {Map<number, ShvaVerdict>} */
  const out = new Map();
  const n = clusters.length;
  const isShva = (i) => i >= 0 && i < n && clusters[i].vowel === 'shva';
  const V = (index, na, rule, heuristic = false) => ({ index, na, rule, heuristic });

  for (let i = 0; i < n; i++) {
    if (!isShva(i)) continue;
    const c = clusters[i];
    let v;
    if (i === 0) {
      v = level >= 2 && SHTAYIM.has(skel) ? V(i, false, 'X1') : V(i, true, 'B1');
    } else if (i === n - 1) {
      v = V(i, false, 'B2'); // final shva (and the second of two final shvas) is silent
    } else if (isShva(i - 1) && out.get(i - 1)?.na === false) {
      v = V(i, true, 'B2'); // second of two shvas in a row
    } else {
      v = V(i, false, 'B3');
      if (level >= 2) {
        const prev = clusters[i - 1];
        const next = clusters[i + 1];
        if (c.dagesh && isFullVowel(prev)) v = V(i, true, 'L1');
        else if (next && next.ch === c.ch) v = V(i, true, 'L2');
        else if (prev.meteg || (isMater(clusters, i - 1) && clusters[i - 2]?.meteg)) v = V(i, true, 'L4');
        else if (longVowelBefore(clusters, i) && hasVowelAfter(clusters, i)) v = V(i, true, 'L3', true);
      }
    }
    out.set(i, v);
  }
  return out;
}
