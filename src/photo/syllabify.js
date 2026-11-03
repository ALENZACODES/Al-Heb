// Hebrew syllabifier for POINTED text. Lane 6. Pure, no dependencies.
//
// SCOPE / HONESTY: simplified, rule-based, derived from the textbook rules summarised in
// research_notes/.../hebrew_vowels_pronunciation.md (shva rules, mater letters, dagesh chazak). It is NOT a port of
// havarotjs and makes NO claim of parity with it. Known limitations are listed in LIMITATIONS below.
// Output syllables follow the written-letter structure (one vowel-bearing letter starts a syllable; letters without a
// vowel attach to the preceding syllable as coda), which is what the photo UI needs for per-syllable playback.
//
// Output: [{he, translit?, letters:[{letter,id,vowel,...}], stressed, gemination?}]
import { stripTaamim, isPointed, foldFinals, tokenise } from './hebrew.js';

export const LIMITATIONS = [
  'kamatz gadol vs katan is not decided (only U+05C7 qamats qatan is treated as katan); kamatz is never auto-treated as a "long vowel" for shva na',
  'shva na after a long vowel is applied mechanically; stressed-syllable and gutturals-heuristic exceptions are not modelled',
  'dagesh chazak is detected positionally (previous letter has a real vowel / not word-initial); no lexicon',
  'stress defaults to the last syllable (milra); mil\'el words need STRESS_EXCEPTIONS or the opt-in segolate heuristic',
  'transliteration is a simple Israeli-style romanisation, single tradition; lane 3 transliterate.js is the authority',
  'furtive patach is flagged but the syllable is kept as letter+vowel (modern reading: ru-ach)',
  'divine name (יהוה) is replaced with the standard reading אֲדֹנָי and marked substituted:true',
];

const VOWEL_BY_CP = {
  0x05B0: 'shva', 0x05B1: 'chataf-segol', 0x05B2: 'chataf-patach', 0x05B3: 'chataf-kamatz',
  0x05B4: 'chirik', 0x05B5: 'tzere', 0x05B6: 'segol', 0x05B7: 'patach', 0x05B8: 'kamatz',
  0x05B9: 'cholam', 0x05BA: 'cholam', 0x05BB: 'kubutz', 0x05C7: 'kamatz',
};
const CP = { dagesh: 0x05BC, shinDot: 0x05C1, sinDot: 0x05C2 };

const LETTER_ID = {
  'א': 'alef', 'ב': 'bet', 'ג': 'gimel', 'ד': 'dalet', 'ה': 'he', 'ו': 'vav', 'ז': 'zayin', 'ח': 'chet', 'ט': 'tet',
  'י': 'yod', 'כ': 'kaf', 'ל': 'lamed', 'מ': 'mem', 'נ': 'nun', 'ס': 'samekh', 'ע': 'ayin', 'פ': 'pe', 'צ': 'tsadi',
  'ק': 'qof', 'ר': 'resh', 'ש': 'shin', 'ת': 'tav',
  'ך': 'kaf-final', 'ם': 'mem-final', 'ן': 'nun-final', 'ף': 'pe-final', 'ץ': 'tsadi-final',
};
export const letterId = (ch) => LETTER_ID[ch] ?? null;

const BGDKPT = new Set(['ב', 'ג', 'ד', 'כ', 'ך', 'פ', 'ף', 'ת']);
const LONG_FOR_SHVA = new Set(['tzere', 'cholam', 'shuruk']); // chirik counts only with a yod mater

/** Words whose stress is NOT final. Key = pointed word (taamim removed). PLACEHOLDER list. */
export const STRESS_EXCEPTIONS = {
  // sourced: HebrewPod101 "Top 5 Hebrew mistakes" lists séfer, medabéret(penult), tapú'ach as exceptions to milra.
  // Only séfer is expressible as a bare pointed key here; the rest are TODO (needs lexicon / lane 5 data).
  'סֵפֶר': -2,
};

/** Standard reading for the divine name written יהוה (any pointing). */
export const DIVINE_NAME_READING = 'אֲדֹנָי';

function parseClusters(word) {
  const clusters = [];
  for (const ch of stripTaamim(word).normalize('NFD')) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x05D0 && cp <= 0x05EA) clusters.push({ ch, dagesh: false, dot: null, vowel: null, qatan: false });
    else if (!clusters.length) continue;
    else {
      const c = clusters[clusters.length - 1];
      if (cp === CP.dagesh) c.dagesh = true;
      else if (cp === CP.shinDot) c.dot = 'shin';
      else if (cp === CP.sinDot) c.dot = 'sin';
      else if (VOWEL_BY_CP[cp]) { if (!c.vowel || c.vowel === 'shva') c.vowel = VOWEL_BY_CP[cp]; if (cp === 0x05C7) c.qatan = true; }
    }
  }
  return clusters;
}

function clusterText(c) {
  const dot = c.dot === 'shin' ? 'ׁ' : c.dot === 'sin' ? 'ׂ' : '';
  const v = c.vowelCp ?? '';
  return c.ch + dot + (c.dagesh ? 'ּ' : '') + v;
}
const VOWEL_CP_BY_ID = { 'shva': 'ְ', 'chataf-segol': 'ֱ', 'chataf-patach': 'ֲ', 'chataf-kamatz': 'ֳ', 'chirik': 'ִ', 'tzere': 'ֵ', 'segol': 'ֶ', 'patach': 'ַ', 'kamatz': 'ָ', 'cholam': 'ֹ', 'kubutz': 'ֻ' };

/**
 * Classify roles + shva + dagesh for one word's clusters. Mutates and returns clusters.
 * role: 'cons' | 'mater' | 'silent'
 */
function classify(cl, opts = {}) {
  const n = cl.length;
  let prevBase = null;
  for (let i = 0; i < n; i++) {
    const c = cl[i]; c.role = 'cons'; c.index = i; c.isLast = i === n - 1;
    const hasPrev = !!prevBase;
    const next = cl[i + 1];
    if (c.ch === 'ו' && hasPrev && c.vowel === 'cholam' && !prevBase.vowel) {
      c.role = 'mater'; prevBase.vowel = 'cholam'; prevBase.materVowel = true; prevBase.vowelFromMater = 'vav'; c.vowel = null;
    } else if (c.ch === 'ו' && c.dagesh && !c.vowel && hasPrev && !prevBase.vowel && prevBase.role === 'cons') {
      c.role = 'mater'; prevBase.vowel = 'shuruk'; prevBase.vowelFromMater = 'vav'; c.dagesh = false;
    } else if (c.ch === 'ו' && c.dagesh && !c.vowel && !hasPrev) {
      c.vowel = 'shuruk'; c.dagesh = false; // conjunction וּ : consonant vav + vowel u
    } else if (c.ch === 'י' && !c.vowel && !c.dagesh && hasPrev && ['chirik', 'tzere', 'segol'].includes(prevBase.vowel)) {
      c.role = 'mater'; prevBase.yodMater = true;
    } else if (c.ch === 'י' && !c.vowel && hasPrev && prevBase.vowel === 'kamatz' && next && next.ch === 'ו' && !next.vowel && !next.dagesh) {
      c.role = 'silent'; // -ָיו (e.g. פָּנָיו = pa-nav)
    } else if (c.ch === 'ה' && !c.vowel && !c.dagesh && c.isLast && hasPrev && prevBase.vowel) {
      c.role = 'mater';
    } else if (c.ch === 'א' && !c.vowel && hasPrev) {
      c.role = 'silent';
    }
    if (c.role === 'cons') {
      // furtive patach
      if (c.isLast && c.vowel === 'patach' && 'חע'.includes(c.ch) && hasPrev && (prevBase.vowelFromMater || ['tzere', 'cholam', 'chirik', 'shuruk'].includes(prevBase.vowel))) c.furtive = true;
      if (c.isLast && c.vowel === 'patach' && c.ch === 'ה' && c.dagesh && hasPrev && ['tzere', 'cholam', 'chirik', 'shuruk'].includes(prevBase.vowel)) c.furtive = true;
      prevBase = c;
    } else if (c.role === 'silent') {
      // silent letters do not become prevBase for vowel decisions, but a silent alef can carry nothing
    }
  }
  const base = cl.filter((c) => c.role === 'cons');
  // dagesh kind
  base.forEach((c, k) => {
    if (!c.dagesh) return;
    const prev = base[k - 1];
    if (c.ch === 'ה' && c.isLast) { c.dageshKind = 'mappiq'; return; }
    if (!prev) { c.dageshKind = 'kal'; return; }
    const prevVowelReal = prev.vowel && prev.vowel !== 'shva';
    if (BGDKPT.has(c.ch)) c.dageshKind = prevVowelReal ? 'chazak' : 'kal';
    else c.dageshKind = 'chazak';
  });
  // shva
  base.forEach((c, k) => {
    if (c.vowel !== 'shva') return;
    const prev = base[k - 1]; const nxt = base[k + 1];
    let kind;
    const override = opts.shvaClassifier ? opts.shvaClassifier({ clusters: base, index: k }) : undefined;
    if (override === 'na' || override === 'nach') kind = override;
    else if (!nxt) kind = 'nach';
    else if (!prev) kind = 'na';
    else if (prev.vowel === 'shva' && prev.shva === 'nach') kind = 'na';
    else if (c.dageshKind === 'chazak') kind = 'na';
    else if (foldFinals(nxt.ch) === foldFinals(c.ch)) kind = 'na';
    else if (LONG_FOR_SHVA.has(prev.vowel) || (prev.vowel === 'chirik' && prev.yodMater)) kind = 'na';
    else kind = 'nach';
    c.shva = kind;
  });
  return cl;
}

const CONS = { 'א': '', 'ב': 'v', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'ch', 'ט': 't', 'י': 'y', 'כ': 'ch', 'ך': 'ch', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': '', 'פ': 'f', 'ף': 'f', 'צ': 'ts', 'ץ': 'ts', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't' };
const VOWEL_SOUND = { 'kamatz': 'a', 'patach': 'a', 'tzere': 'e', 'segol': 'e', 'chirik': 'i', 'cholam': 'o', 'kubutz': 'u', 'shuruk': 'u', 'chataf-segol': 'e', 'chataf-patach': 'a', 'chataf-kamatz': 'o' };

function consSound(c) {
  if (c.role !== 'cons') return '';
  if (c.ch === 'ב') return c.dagesh ? 'b' : 'v';
  if (c.ch === 'כ' || c.ch === 'ך') return c.dagesh ? 'k' : 'ch';
  if (c.ch === 'פ' || c.ch === 'ף') return c.dagesh ? 'p' : 'f';
  if (c.ch === 'ש') return c.dot === 'sin' ? 's' : 'sh';
  return CONS[c.ch] ?? '';
}
function vowelSound(c) {
  if (!c.vowel) return '';
  if (c.vowel === 'shva') return c.shva === 'na' ? 'e' : '';
  if (c.vowel === 'kamatz' && c.qatan) return 'o';
  return VOWEL_SOUND[c.vowel] ?? '';
}
function clusterTranslit(c) {
  if (c.role !== 'cons') return '';
  if (c.furtive) return vowelSound(c) + consSound(c);
  return consSound(c) + vowelSound(c);
}

function isVocalic(c) {
  return c.role === 'cons' && !!c.vowel && (c.vowel !== 'shva' || c.shva === 'na');
}

/**
 * Syllabify one pointed word.
 * @param {string} word pointed Hebrew (cantillation tolerated and ignored)
 * @param {{translit?:boolean, shvaClassifier?:Function, exceptions?:Record<string,number>, segolateHeuristic?:boolean, readDivineName?:boolean}} [opts]
 * @returns {object[]} [] if the word has no vowel points (unpointed input is not guessed at).
 */
export function syllabifyWord(word, opts = {}) {
  const { translit = true, exceptions = STRESS_EXCEPTIONS, segolateHeuristic = false, readDivineName = true } = opts;
  let w = stripTaamim(String(word ?? ''));
  const letters = w.replace(/[^\u05D0-\u05EA]/g, '');
  let substituted = false;
  if (readDivineName && letters === 'יהוה') { w = DIVINE_NAME_READING; substituted = true; }
  else if (!isPointed(w) && !/\u05D5\u05BC/.test(w)) return []; // no vowel information at all
  const cl = classify(parseClusters(w), opts);
  // positions: mater/silent letters need their original text in `he`
  const syls = [];
  let cur = null;
  const finish = () => { if (cur) { syls.push(cur); cur = null; } };
  for (const c of cl) {
    if (isVocalic(c) || !cur) { finish(); cur = { he: '', letters: [], stressed: false, _t: '' }; }
    const e = { letter: c.ch, id: letterId(c.ch), vowel: c.role === 'cons' ? (c.vowel ?? null) : null };
    if (c.dot) e.dot = c.dot;
    if (c.dagesh || c.dageshKind) e.dagesh = c.dageshKind || 'kal';
    if (c.vowel === 'shva' && c.role === 'cons') e.shva = c.shva;
    if (c.role !== 'cons') e[c.role] = true;
    if (c.role === 'mater') e.materOf = c.ch === 'ו' ? (cl.find((x) => x.index < c.index && x.role === 'cons' && x.index === lastBaseIndex(cl, c.index))?.vowel ?? null) : null;
    if (c.furtive) e.furtive = true;
    if (c.qatan) e.katan = true;
    cur.letters.push(e);
    cur.he += textOf(cl, c);
    if (c.dageshKind === 'chazak' && isVocalic(c)) cur.gemination = true;
    cur._t += clusterTranslit(c);
  }
  finish();
  const out = syls.map((s) => { const { _t, ...r } = s; r.he = r.he.normalize('NFC'); if (substituted) r.substituted = true; return translit ? { ...r, translit: _t } : r; });
  applyStress(out, w, { exceptions, segolateHeuristic });
  return out;
}

function lastBaseIndex(cl, idx) { for (let i = idx - 1; i >= 0; i--) if (cl[i].role === 'cons') return i; return -1; }

/** Original-looking text of a cluster. Mater-derived vowels (shuruk/cholam) are written on the mater itself. */
function textOf(cl, c) {
  const dot = c.dot === 'shin' ? 'ׁ' : c.dot === 'sin' ? 'ׂ' : '';
  if (c.role === 'mater') {
    // the vowel point/dagesh lives on the mater letter in the source text
    const base = lastBaseIndex(cl, c.index);
    const bv = base >= 0 ? cl[base].vowel : null;
    if (c.ch === 'ו' && bv === 'shuruk') return 'וּ';
    if (c.ch === 'ו' && bv === 'cholam') return 'וֹ';
    return c.ch;
  }
  let v = c.vowel ? VOWEL_CP_BY_ID[c.vowel] : '';
  if (c.qatan) v = 'ׇ';
  if (c.vowelFromMater) v = ''; // vowel sign sits on the mater letter, not on this consonant
  if (c.vowel === 'shuruk' && !c.vowelFromMater) return c.ch + dot + 'ּ'; // conjunction וּ
  return c.ch + dot + (c.dagesh ? 'ּ' : '') + v;
}

function applyStress(syls, pointedWord, { exceptions, segolateHeuristic }) {
  if (!syls.length) return;
  let idx = syls.length - 1; let rule = 'default-final (milra)';
  const key = stripTaamim(pointedWord);
  if (exceptions && Object.prototype.hasOwnProperty.call(exceptions, key)) {
    const k = exceptions[key]; idx = k < 0 ? syls.length + k : k; rule = 'exception-list';
  } else if (segolateHeuristic && syls.length === 2) {
    const v = (s) => s.letters.find((l) => l.vowel && l.vowel !== 'shva')?.vowel;
    if (v(syls[0]) && v(syls[1]) === 'segol' && ['segol', 'tzere', 'cholam', 'kubutz', 'chirik', 'patach'].includes(v(syls[0]))) { idx = 0; rule = 'segolate-heuristic (derived, unverified)'; }
  }
  idx = Math.max(0, Math.min(syls.length - 1, idx));
  syls[idx].stressed = true;
  syls.stressRule = rule;
}

/** Syllabify running text: [{word, syllables, pointed}] per whitespace/maqaf token (non-Hebrew tokens skipped). */
export function syllabifyText(text, opts = {}) {
  return tokenise(text).map((w) => ({ word: w, pointed: isPointed(w), syllables: syllabifyWord(w, opts) }));
}

/** Try to load lane 3's shva classifier (src/pronunciation/shva.js). Contract unverified: expects `classifyShva`. */
export async function loadLane3Shva() {
  try {
    const m = await import('../pronunciation/shva.js');
    return typeof m.classifyShva === 'function' ? m.classifyShva : null;
  } catch { return null; }
}
