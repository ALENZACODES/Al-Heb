// "Sound words": a Latin respelling of pointed Hebrew, written so that a multilingual text-to-speech voice
// that only speaks Israeli Hebrew natively can be made to say Israeli, Sephardi or Ashkenazi readings by
// being given the respelling (in a Spanish or Italian language slot) instead of the Hebrew.
//
//   soundText(pointedHebrew, tradition, opts) -> { soundtext, confidence, flags, voiced, ... }
//
// STATUS: a workaround. Nobody has listened to any output. No native speaker has approved any item. Whether a given
// TTS voice reads this alphabet the way the table in docs/tts/SOUNDWORDS.md expects is UNTESTED. Run a real TTS pass
// and listen before trusting any item.
//
// ---------------------------------------------------------------------------------------------------------------
// DECISIONS FOR A HUMAN (not settled; docs/tts/SOUNDWORDS.md lists the alternatives for each)
//   D1 Ashkenazi model: ASHK-POLISH-v1 = the one already used by tools/pronunciation/build_variants.mjs:
//        kamatz gadol o, tzere ei, cholam oi, tav without dagesh s, resh r, chet/khaf as one back-of-throat sound,
//        penultimate stress by default, final kamatz+he/alef reduced to e. Alternative generated on request:
//        opts.ashkModel = 'lithuanian' (cholam ei instead of oi; no other Lithuanian feature is generated).
//   D2 Sephardi model: SEPH-TEXTBOOK-v1 = the idealised reading in data/pronunciation (final stress by default,
//        five vowels, trilled r, pharyngeal chet and ayin). It is NOT a model of any community (data/traditions
//        says so). Latin letters cannot write a pharyngeal, so chet and ayin are MERGED with the Israeli
//        realisations and every item that contains one is flagged `pharyngeal-merged`. Consequence: without a
//        pharyngeal, Sephardi text equals Israeli text, so the two voices cannot be told apart by this text alone.
//   D3 Israeli model: ISR-STD-v1 = the careful/liturgical reading used by the rule engine (vocal shva realised as e,
//        no gemination, chet = khaf, ayin and alef silent, uvular resh written r). Colloquial shva dropping is NOT applied.
//   D4 TTS language slot: opts.lang 'es' (default) or 'it'. Chosen because both languages read a e i o u as five pure
//        vowels; 'es' reads j as the back-of-throat sound that chet and khaf need, 'it' reads v as v (es reads v as b).
//        A parameter, not a claim of quality.
// ---------------------------------------------------------------------------------------------------------------
//
// Reuse, not a fork: syllables, stress, shva na/nach, matres, furtive patach, kamatz katan and the Ashkenazi final
// reduction all come from renderWord() in tools/pronunciation/build_variants.mjs, which drives src/pronunciation/shva.js,
// kamatz-katan.js and src/photo/syllabify.js. This file only (a) splits running text into words, (b) turns the IPA that
// renderWord() returns into the respelling alphabet, (c) assigns confidence and flags.
import { renderWord, loadStressData } from '../pronunciation/build_variants.mjs';
import { stripTaamim } from '../../src/pronunciation/hebrew.js';

export const SOUNDTEXT_VERSION = 1;
export const TRADITIONS = ['israeli', 'sephardi', 'ashkenazi'];
export const MODELS = {
  israeli: 'ISR-STD-v1',
  sephardi: 'SEPH-TEXTBOOK-v1',
  ashkenazi: 'ASHK-POLISH-v1',
};
export const LANGS = ['es', 'it'];
export const DEFAULT_LANG = 'es';

/**
 * The respelling alphabet. One Latin string per phoneme symbol that renderWord() can emit.
 * Vowels are the five pure Spanish/Italian vowels. The only phoneme whose spelling depends on the language slot is
 * the back-of-throat fricative (es: j, it: kh) and a hard g before e or i (es: gu, it: gh).
 */
export const ALPHABET = {
  vowels: { a: 'a', e: 'e', i: 'i', o: 'o', u: 'u', 'ɔ': 'o', 'ə': 'e' },
  diphthongs: { ej: 'ei', oj: 'oi' },
  consonants: {
    b: 'b', v: 'v', d: 'd', h: 'h', z: 'z', t: 't', k: 'k', l: 'l', m: 'm', n: 'n', s: 's', p: 'p', f: 'f',
    ts: 'ts', r: 'r', 'ʁ': 'r', 'ʃ': 'sh', j: 'y',
    'ɡ': 'g', // see softG
    'χ': '#x', x: '#x', 'ħ': '#x', // '#x' = the back-of-throat fricative, per language
    'ʔ': '', 'ʕ': '', // silent in this alphabet; the vowel after them is kept as a separate syllable
  },
  throat: { es: 'j', it: 'kh' },
  softG: { es: 'gu', it: 'gh' },
  accent: { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' },
};

/** Flag codes -> {reason, hard}. hard = the output rests on a guess (confidence low); otherwise soft (medium). */
export const FLAG_INFO = {
  'final-stress-assumed': { hard: false, reason: 'Israeli/Sephardi stress on the last syllable is the default rule; this word is not on any stress list.' },
  'ashk-penultimate-default': { hard: false, reason: 'Ashkenazi stress on the next-to-last syllable is the default rule (the "natural" register); the Torah-reading register with final stress is not generated.' },
  'ashk-final-fallback': { hard: false, reason: 'Ashkenazi: no full-vowel syllable before the last one, so stress falls on the last syllable.' },
  'stress-from-small-list': { hard: false, reason: 'Stress comes from a short, unreviewed exception list (stress.json, prayerwords.json or the syllabifier list).' },
  'furtive-stress-own-rule': { hard: false, reason: 'Stress before a furtive patach is this project\'s own rule.' },
  'mobile-shva': { hard: false, reason: 'A vocal (mobile) shva is written as e (careful reading); colloquial Israeli often drops it, and the na/nach decision is rule-derived.' },
  'pharyngeal-merged': { hard: false, reason: 'Sephardi chet/ayin are pharyngeal; Latin letters cannot write that, so they are merged with the Israeli sounds.' },
  'ashk-final-kamatz-reduced': { hard: false, reason: 'Ashkenazi unstressed final kamatz+he/alef is written e (own restriction of a sourced tendency).' },
  'divine-name': { hard: false, reason: 'The Name is read as Adonai by convention.' },
  'kamatz-katan-list': { hard: false, reason: 'Kamatz katan is recognised only from a four-word list, unverified.' },
  'vav-dagesh-consonantal': { hard: false, reason: 'A vav with dagesh inside the word was read as a consonant.' },
  'alef-vav-mater-repaired': { hard: false, reason: 'A vav after a silent aleph was re-read as a vowel letter.' },
  'words-ipa-colloquial-shva-drop': { hard: false, reason: 'The repo\'s own Israeli IPA for this word drops a shva that the careful reading keeps; the respelling keeps it.' },
  'maqaf-compound': { hard: false, reason: 'Words joined by a hyphen/maqaf: only the last part carries the stress mark.' },
  'template-ellipsis': { hard: false, reason: 'A phrase template with "..." (an open slot), not a full utterance.' },
  'shva-heuristic-L3': { hard: true, reason: 'A shva after a long vowel is classed vocal by assuming final stress (an unsourced shortcut).' },
  'possible-segolate': { hard: true, reason: 'Two-syllable word ending in segol, not on the stress list: likely stressed on the first syllable but read as final.' },
  'kamatz-katan-before-chataf': { hard: true, reason: 'Kamatz read as katan because a chataf-kamatz follows (own rule, two words).' },
  'vav-cholam-consonantal': { hard: true, reason: 'Vav with cholam after a vowelled letter is read as consonant + o; it could be a vowel letter.' },
  'he-patach-no-mappiq': { hard: true, reason: 'Final he with patach and no mappiq was read as a pronounced h with a furtive patach.' },
  'shin-undotted': { hard: true, reason: 'A shin without a dot was read as sh.' },
  'non-hebrew-token': { hard: true, reason: 'A token with Latin letters or digits was found; it is dropped, not respelled.' },
  'aramaic': { hard: true, reason: 'Aramaic text (Kaddish, Brich Shmei): the Hebrew rules were applied mechanically. Added by the builder from data/corpus/registry.json, not by soundText().' },
  'unpointed': { hard: false, reason: 'A word has no vowel signs (niqqud): not respelled, because the vowels would be a guess. Marked unvoiced.' },
  'no-vowel-derived': { hard: false, reason: 'The text carries no vowel that can be spoken (an isolated dagesh, shin dot or silent shva).' },
};

const HEB = /[֐-׿]/;
const PUNCT_KEEP = /[.,?!]/;
const SMALL_STRESS_RULES = /^(stress\.json|prayerwords\.json|syllabify\.js)/;

let CTX = null;
const ctx = () => (CTX ||= { stress: loadStressData() });

const VOWEL_IPA = /^(ej|oj|[aeiouɔə])/;

/** Tokenise one IPA syllable into phoneme symbols. */
function phonemes(ipa) {
  const out = [];
  let rest = ipa;
  while (rest) {
    const m = rest.match(/^(ts|ej|oj)/);
    if (m) { out.push(m[1]); rest = rest.slice(m[1].length); continue; }
    const ch = [...rest][0];
    out.push(ch); rest = rest.slice(ch.length);
  }
  return out;
}

const isVowelSym = (p) => p in ALPHABET.diphthongs || p in ALPHABET.vowels;

/** IPA syllable (no stress mark) -> {text, hasVowel}. The accent, when wanted, goes on the first vowel letter. */
function respellSyllable(ipa, lang, stressed) {
  const ph = phonemes(ipa);
  let out = '';
  let seenVowel = false;
  let accentDone = false;
  const put = (letters, vowel) => {
    if (vowel && stressed && !accentDone) { out += ALPHABET.accent[letters[0]] + letters.slice(1); accentDone = true; } else out += letters;
  };
  for (let k = 0; k < ph.length; k++) {
    const p = ph[k];
    if (p in ALPHABET.diphthongs) { put(ALPHABET.diphthongs[p], true); seenVowel = true; continue; }
    if (p in ALPHABET.vowels) { put(ALPHABET.vowels[p], true); seenVowel = true; continue; }
    if (p === 'j') { out += seenVowel ? 'i' : 'y'; continue; } // coda glide = second half of a diphthong (ai, oi)
    let c = ALPHABET.consonants[p];
    if (c === undefined) throw new Error(`soundtext: no respelling for IPA symbol ${JSON.stringify(p)} in ${JSON.stringify(ipa)}`);
    if (c === '#x') c = ALPHABET.throat[lang];
    if (p === 'ɡ') { const nx = ph[k + 1]; if (nx && (nx === 'e' || nx === 'i' || nx === 'ə' || nx === 'ej')) c = ALPHABET.softG[lang]; }
    out += c;
  }
  return { text: out, hasVowel: seenVowel };
}

/** A syllable of renderWord's `syllables` (Hebrew text) holds a vocal shva iff it has a shva and no other vowel sign. */
function hasVocalShvaSyllable(he) {
  const nfd = he.normalize('NFD');
  if (!/ְ/.test(nfd)) return false;
  if (/[ֱ-ׇֻ]/.test(nfd)) return false; // another vowel sign: the shva is a silent coda
  if (/ו[ׁׂ]?ּ/.test(nfd)) return false; // shuruk vowel letter in the same syllable
  return true;
}

/**
 * One Hebrew word (no spaces or maqaf).
 * @returns {{ok:boolean, flags:string[], syllables:string[], stressIndex:number, text:string, he:string, stressRule:string}}
 */
function wordSound(core, tradition, lang, opts, noAccent) {
  const r = renderWord(core, ctx());
  const flags = new Set(r.flags);
  // renderWord computes some flags for every tradition at once; keep only those that apply to this one
  flags.delete('words-ipa-syllable-count-differs'); // concerns only which stress source could be used
  if (tradition !== 'israeli') flags.delete('words-ipa-colloquial-shva-drop'); // the stored colloquial IPA is Israeli
  if (tradition !== 'ashkenazi') flags.delete('ashk-final-kamatz-reduced');
  if (tradition === 'ashkenazi') flags.delete('possible-segolate');
  if (flags.has('unpointed')) return { ok: false, flags: ['unpointed'], syllables: [], stressIndex: -1, text: '', he: core, stressRule: '' };
  const v = r.variants[tradition];
  let ipa = v.ipa;
  if (tradition === 'ashkenazi' && opts.ashkModel === 'lithuanian') ipa = ipa.replace(/oj/g, 'ej');
  if (tradition === 'sephardi' && /[ħʕ]/.test(ipa)) flags.add('pharyngeal-merged');
  if (r.syllables.some(hasVocalShvaSyllable)) flags.add('mobile-shva');

  // stress flags
  const n = r.syllables.length;
  const rule = v.stress?.rule || '';
  if (n > 1) {
    if (tradition === 'ashkenazi') {
      if (/default penultimate/.test(rule)) flags.add('ashk-penultimate-default');
      else if (/^final \(no full-vowel/.test(rule)) flags.add('ashk-final-fallback');
      else if (SMALL_STRESS_RULES.test(rule)) flags.add('stress-from-small-list');
    } else if (/default milra/.test(rule)) flags.add('final-stress-assumed');
    else if (/furtive/.test(rule)) flags.add('furtive-stress-own-rule');
    else if (SMALL_STRESS_RULES.test(rule)) flags.add('stress-from-small-list');
  }

  // IPA pieces -> syllables; a piece without a vowel is merged into its neighbour, an empty piece dropped
  const pieces = ipa.split('.').map((p) => ({ stressed: p.startsWith('ˈ'), ipa: p.replace(/ˈ/g, '') }));
  const sylls = [];
  for (const p of pieces) {
    const hasV = phonemes(p.ipa).some(isVowelSym);
    if (!p.ipa) { if (p.stressed && sylls.length) sylls[sylls.length - 1].stressed = true; continue; }
    if (!hasV && sylls.length) { sylls[sylls.length - 1].ipa += p.ipa; sylls[sylls.length - 1].stressed ||= p.stressed; continue; }
    sylls.push({ ...p });
  }
  // a leading vowelless piece joins the next syllable
  while (sylls.length > 1 && !phonemes(sylls[0].ipa).some(isVowelSym)) { const a = sylls.shift(); sylls[0].ipa = a.ipa + sylls[0].ipa; sylls[0].stressed ||= a.stressed; }
  if (!sylls.length || !sylls.some((s) => phonemes(s.ipa).some(isVowelSym))) return { ok: false, flags: ['no-vowel-derived'], syllables: [], stressIndex: -1, text: '', he: core, stressRule: rule };

  let stressIndex = sylls.findIndex((s) => s.stressed);
  if (stressIndex < 0) stressIndex = sylls.length - 1;
  const out = sylls.map((s, i) => respellSyllable(s.ipa, lang, i === stressIndex && !noAccent).text);
  return { ok: true, flags: [...flags], syllables: out, stressIndex, text: out.join('-'), he: r.he, stressRule: rule };
}

/** Confidence from a flag list: high = none, low = any hard flag, medium = soft flags only. */
export function confidenceOf(flags, voiced = true) {
  if (!voiced) return 'unvoiced';
  if (!flags.length) return 'high';
  return flags.some((f) => FLAG_INFO[f]?.hard) ? 'low' : 'medium';
}

const cleanTail = (s) => {
  let kept = '';
  for (const ch of s) if (PUNCT_KEEP.test(ch)) kept += ch;
  return kept;
};

/**
 * Respell pointed Hebrew text (a word, a phrase or a prayer line) for one tradition.
 * @param {string} pointedHebrew
 * @param {'israeli'|'sephardi'|'ashkenazi'} tradition
 * @param {{lang?: 'es'|'it', ashkModel?: 'polish'|'lithuanian', accents?: boolean, hyphens?: boolean}} [opts]
 *   accents:false drops the acute accent (stress mark); hyphens:false joins syllables. Both default true.
 * @returns {{soundtext:string, confidence:'high'|'medium'|'low'|'unvoiced', flags:string[], voiced:boolean, tradition:string, model:string, lang:string,
 *            words:{he:string, soundtext:string, syllables:string[], stressIndex:number}[]}}
 */
export function soundText(pointedHebrew, tradition, opts = {}) {
  if (!TRADITIONS.includes(tradition)) throw new RangeError(`unknown tradition: ${tradition}`);
  const lang = opts.lang ?? DEFAULT_LANG;
  if (!LANGS.includes(lang)) throw new RangeError(`unknown lang: ${lang}`);
  const base = { tradition, model: MODELS[tradition], lang };
  const text = stripTaamim(String(pointedHebrew ?? '')).replace(/[׃׀]/g, ' ').normalize('NFC').replace(/\s+/g, ' ').trim();
  const flags = new Set();
  const words = [];
  const outTokens = [];
  let unvoicedFlags = null;

  for (const spaceTok of text.split(' ').filter(Boolean)) {
    const parts = spaceTok.split(/([־-])/).filter((x) => x !== '־' && x !== '-');
    const hebParts = parts.filter((p) => HEB.test(p));
    if (!hebParts.length) { // punctuation-only token: attach to the previous token
      const k = cleanTail(spaceTok);
      if (k) { if (/\.\.\./.test(spaceTok)) flags.add('template-ellipsis'); outTokens.length ? (outTokens[outTokens.length - 1] += k) : outTokens.push(k); }
      if (/[A-Za-z0-9]/.test(spaceTok)) flags.add('non-hebrew-token');
      continue;
    }
    if (hebParts.length > 1) flags.add('maqaf-compound');
    const rendered = [];
    hebParts.forEach((part, pi) => {
      const m = part.match(/^([^֐-׿]*)([֐-׿]+)([^֐-׿]*)$/);
      if (!m) { flags.add('non-hebrew-token'); return; }
      const [, pre, core, post] = m;
      if (/[A-Za-z0-9]/.test(pre + post)) flags.add('non-hebrew-token');
      const w = wordSound(core, tradition, lang, opts, pi < hebParts.length - 1);
      for (const f of w.flags) flags.add(f);
      if (!w.ok) { unvoicedFlags ||= w.flags; return; }
      if (/\.\.\./.test(post)) flags.add('template-ellipsis');
      words.push({ he: w.he, soundtext: w.text, syllables: w.syllables, stressIndex: w.stressIndex });
      rendered.push(cleanTail(pre) + w.text + cleanTail(post));
    });
    if (rendered.length) outTokens.push(rendered.join(' '));
  }

  const flagList = [...flags].sort();
  if (unvoicedFlags || !words.length) {
    const why = unvoicedFlags || ['no-vowel-derived'];
    const fl = [...new Set([...flagList, ...why])].sort();
    return { ...base, soundtext: '', confidence: 'unvoiced', flags: fl, voiced: false, words: [] };
  }
  let soundtext = outTokens.join(' ').replace(/\s+([.,?!])/g, '$1');
  if (opts.hyphens === false) soundtext = soundtext.replace(/-/g, '');
  if (opts.accents === false) soundtext = soundtext.replace(/[áéíóú]/g, (c) => 'aeiou'['áéíóú'.indexOf(c)]);
  return { ...base, soundtext, confidence: confidenceOf(flagList, true), flags: flagList, voiced: true, words };
}

/** Remove the stress accent and hyphens (the "flat" form some TTS front ends may prefer). */
export const flatten = (s) => String(s).replace(/-/g, '').replace(/[áéíóú]/g, (c) => 'aeiou'['áéíóú'.indexOf(c)]);

