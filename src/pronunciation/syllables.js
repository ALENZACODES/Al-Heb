// @ts-check
// Syllable chips model (lane 3, round 4). Syllable boundaries come from the photo lane's pure syllabifier
// (src/photo/syllabify.js, imported read-only) driven by THIS lane's shva rules (shva.js); the Latin text of each
// chip comes from transliterate.js by transliterating growing prefixes of the word and taking the difference.
// If a word's prefix transliterations are not consistent with the whole-word transliteration, `latin` is null for
// that word (never guessed).
//
// Stress: default is the last syllable. Exceptions are listed in data/pronunciation/stress.json (own, unreviewed).
// For the ashkenazi tradition the stress of the ten prayer words comes from prayerwords.json; other words are
// flagged 'unchecked' for Ashkenazi.

import { syllabifyWord, createLane3ShvaClassifier } from '../photo/syllabify.js';
import { classifyShvas } from './shva.js';
import { parseWord, stripTaamim } from './hebrew.js';
import { transliterate } from './transliterate.js';
import { normalizeTradition } from './sounds.model.js';

const shvaClassifier = createLane3ShvaClassifier({ classifyShvas, parseWord }, { level: 2 });
const key = (w) => stripTaamim(String(w)).normalize('NFD');
const STRESS_WORDS = { first: 0, last: -1, 'second-to-last': -2 };
/** Everyday family words said with first-syllable stress (AB-ba, IM-ma, SAB-ba, SAV-ta). Draft, own knowledge, needs native review. */
const COLLOQUIAL_FIRST = new Set(['אַבָּא', 'אִמָּא', 'סַבָּא', 'סַבְתָּא'].map((w) => key(w).normalize('NFC')));

/** Words for the chips: the dial words plus the ten prayer words, deduplicated by pointed form. */
export function chipWords(dial, prayer) {
  const out = [];
  const seen = new Set();
  for (const w of prayer.words) { const k = key(w.he); if (!seen.has(k)) { seen.add(k); out.push({ id: w.id, he: w.he, gloss: w.gloss, prayer: w }); } }
  for (const w of dial.words) { const k = key(w.full); if (!seen.has(k)) { seen.add(k); out.push({ id: w.id, he: w.full, gloss: w.gloss, prayer: null }); } }
  return out;
}

/**
 * @param {string} he pointed word
 * @param {{tradition?:string, stress?:any, prayer?:any}} [o] stress = stress.json; prayer = a prayerwords.json word record
 * @returns {{ok:boolean, finalHeLetter:boolean, he:string, syllables:{he:string, latin:string|null}[], stressIndex:number, stressRule:string, checked:boolean, latinOk:boolean, tradition:string, latinWord:string}}
 */
export function chipsFor(he, o = {}) {
  const tradition = normalizeTradition(o.tradition);
  const raw = syllabifyWord(he, { translit: false, shvaClassifier, exceptions: {} });
  const n = raw.length;
  if (!n) return { ok: false, finalHeLetter: false, he, syllables: [], stressIndex: -1, stressRule: 'none', checked: false, latinOk: false, tradition, latinWord: '' };

  // stress
  let idx = n - 1; let rule = 'default-final (milra)'; let checked = true;
  const ex = o.stress?.exceptions?.find((e) => key(e.he) === key(he));
  if (tradition === 'ashkenazi') {
    const ps = o.prayer?.ashkenazi?.stress;
    if (ps && ps in STRESS_WORDS) { const k = STRESS_WORDS[ps]; idx = k < 0 ? n + k : k; rule = 'prayerwords.json (Ashkenazi, unreviewed)'; }
    else { checked = false; rule = ex ? 'exception list (Israeli data; not checked for Ashkenazi)' : 'default-final (not checked for Ashkenazi)'; if (ex) idx = ex.fromEnd < 0 ? n + ex.fromEnd : ex.fromEnd; }
  } else if (ex) { idx = ex.fromEnd < 0 ? n + ex.fromEnd : ex.fromEnd; rule = `exception list (${ex.kind})`; }
  else if (o.patterns && n >= 2 && COLLOQUIAL_FIRST.has(key(he).normalize('NFC'))) { idx = n - 2; rule = 'everyday word stressed on the first syllable'; }
  else if (o.patterns && n >= 2) {
    // With o.patterns (the dictionary asks for it; the syllable chips keep their stated contract of last-syllable-unless-listed):
    // two patterns that the bare "last syllable" rule gets wrong on very common words (25 Nov 2026 critique, item 9):
    // a closed last syllable with segol (the segolate nouns: חֶדֶר, יֶלֶד, דֶּלֶת, מַחְבֶּרֶת) and the -ayim ending (מַיִם, שָׁמַיִם, יוֹמַיִם)
    // are stressed on the syllable before the last. An open -eh ending (יָפֶה) keeps the last syllable.
    const last = key(raw[n - 1].he).normalize('NFC');
    const lastLetters = last.replace(/[\u0591-\u05C7]/g, '');
    const endsAyim = /[\u05B7\u05B8]\u05D9\u05B4\u05DD$/.test(key(he).normalize('NFC').replace(/[\u05BC\u05C1\u05C2]/g, '')) || /^\u05D9\u05B4\u05DD$/.test(last.replace(/[\u05BC]/g, ''));
    if (endsAyim) { idx = n - 2; rule = 'pattern: -ayim ending'; }
    else if (o.pos !== 'verb' && /\u05B6/.test(last) && !/\u05D4$/.test(lastLetters)) { idx = n - 2; rule = 'pattern: segolate (segol in a closed last syllable)'; } // verbs (דִּבֶּר) keep the last syllable
  }
  idx = Math.max(0, Math.min(n - 1, idx));

  // latin per chip
  const scheme = tradition === 'ashkenazi' ? 'ashkenazi-siddur' : 'siddur';
  const opts = { scheme, tradition, finalHe: /** @type {'silent'} */ ('silent') };
  const whole = transliterate(he, opts);
  let prefix = '';
  let prevLatin = '';
  let latinOk = true;
  const pieces = raw.map((s, i) => {
    prefix += s.he;
    const t = i === n - 1 ? whole : transliterate(prefix, opts);
    if (!t.startsWith(prevLatin)) { latinOk = false; return null; }
    const piece = t.slice(prevLatin.length);
    prevLatin = t;
    return piece;
  });
  if (pieces.some((p) => p === null || p === '')) latinOk = false;
  const syllables = raw.map((s, i) => ({ he: s.he, latin: latinOk ? /** @type {string} */ (pieces[i]) : null }));
  const lastC = parseWord(he).at(-1);
  const finalHeLetter = !!lastC && lastC.ch === 'ה' && !lastC.dagesh && !lastC.vowel;
  return { ok: true, finalHeLetter, he, syllables, stressIndex: idx, stressRule: rule, checked, latinOk, tradition, latinWord: whole };
}

/** "sha-LOM" style display. */
export function hyphenated(r) {
  if (!r.latinOk) return '';
  return r.syllables.map((s, i) => (i === r.stressIndex ? /** @type {string} */ (s.latin).toUpperCase() : s.latin)).join('-');
}

/** Audio id for one chip (kind 'syllable'); no such audio exists yet. */
export const chipAudioId = (wordId, i) => `syl-${wordId}-${i}`;
