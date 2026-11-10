// @ts-check
// Pure models for the round-4 pronunciation screens (lane 3): vowel families, plene check / niqqud dial,
// dot-toggle pairs and test items. Everything that has a sound value is read from niqqud.json /
// consonants.json at call time (single source); nothing is hand-copied here.

import { parseWord } from './hebrew.js';
import { normalizeTradition, TRADITIONS } from './sounds.model.js';

export const FAMILY_IDS = ['a', 'e', 'i', 'o', 'u'];
export const FAMILY_NAMES = { a: 'a (as in father)', e: 'e (as in bed)', i: 'i (as in machine)', o: 'o (as in for)', u: 'u (as in rule)' };

/** @param {string} ipa e.g. "[a(ː)]", "[ɔ]", "[e̞]", "[ej]" -> 'a'|'e'|'i'|'o'|'u'|null */
export function familyOfIpa(ipa) {
  const m = /[aeiouɔɛ]/.exec(String(ipa ?? ''));
  if (!m) return null;
  return { a: 'a', e: 'e', ɛ: 'e', i: 'i', o: 'o', ɔ: 'o', u: 'u' }[m[0]] ?? null;
}

/** Vowel sign records that belong on the board: kind vowel, not shva. */
export const boardSigns = (niqqud) => niqqud.records.filter((r) => r.kind === 'vowel' && r.id !== 'shva');

/**
 * Five families for one tradition, derived from the ipa values.
 * @returns {{family:string, signs:string[], count:number}[]}
 */
export function vowelFamilies(niqqud, tradition) {
  const t = normalizeTradition(tradition);
  const fams = FAMILY_IDS.map((family) => ({ family, signs: /** @type {string[]} */ ([]), count: 0 }));
  for (const rec of boardSigns(niqqud)) {
    const f = familyOfIpa(rec.ipa?.[t]);
    const slot = fams.find((x) => x.family === f);
    if (slot) slot.signs.push(rec.id);
  }
  for (const f of fams) f.count = f.signs.length;
  return fams;
}

/** variantByTradition per family, as in the concept spec. */
export function variantByTradition(niqqud) {
  /** @type {Record<string, Record<string, string[]>>} */
  const out = Object.fromEntries(FAMILY_IDS.map((f) => [f, {}]));
  for (const t of TRADITIONS) for (const fam of vowelFamilies(niqqud, t)) out[fam.family][t] = fam.signs;
  return out;
}

/** Signs whose family changes between traditions: {id, byTradition:{israeli:'a',...}} */
export function movingSigns(niqqud) {
  return boardSigns(niqqud)
    .map((r) => ({ id: r.id, byTradition: Object.fromEntries(TRADITIONS.map((t) => [t, familyOfIpa(r.ipa?.[t])])) }))
    .filter((s) => new Set(Object.values(s.byTradition)).size > 1);
}

/** Sub-variants (e.g. kamatz katan) with their own ipa, placed by family. */
export function variantSigns(niqqud, tradition) {
  const t = normalizeTradition(tradition);
  const out = [];
  for (const rec of boardSigns(niqqud)) for (const v of rec.variants ?? []) {
    if (v.ipa) out.push({ id: v.id, parent: rec.id, shape: v.shape, family: familyOfIpa(v.ipa[t]) });
  }
  return out;
}

// ---------------------------------------------------------------- plene check / niqqud dial

const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const fold = (ch) => FINALS[ch] ?? ch;
const isLetter = (ch) => ch >= 'א' && ch <= 'ת';

/** Letters only (final forms folded), all marks removed. */
export function lettersOf(s) { return [...String(s)].filter(isLetter).map(fold); }
/** The word without points (final forms kept). */
export function stripMarks(s) { return [...String(s)].filter(isLetter).join(''); }

/** Indices (into the letters of `full`) of letters that are vowel letters (matres lectionis). */
export function materIndices(full) {
  const cl = parseWord(full);
  const out = new Set();
  cl.forEach((c, i) => {
    const prev = cl[i - 1];
    if (!prev) return;
    if (c.ch === 'ו') {
      if (!c.vowel && c.dagesh && !prev.vowel) out.add(i); // shuruk
      else if (c.vowel === 'cholam' && !prev.vowel) out.add(i); // cholam male
      else if (!c.vowel && !c.dagesh && (prev.vowel === 'cholam' || prev.vowel === 'kubutz')) out.add(i);
    } else if (c.ch === 'י') {
      if (!c.vowel && !c.dagesh && ['chirik', 'tzere', 'segol'].includes(prev.vowel ?? '')) out.add(i);
    } else if ((c.ch === 'ה' || c.ch === 'א') && i === cl.length - 1) {
      if (!c.vowel && !c.dagesh && ['kamatz', 'tzere', 'segol', 'cholam', 'patach'].includes(prev.vowel ?? '')) out.add(i);
    }
  });
  return out;
}

/** Longest-common-subsequence alignment of two letter arrays. Returns pairs [i, j] of matches. */
function lcs(a, b) {
  const n = a.length, m = b.length;
  const d = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) d[i][j] = a[i] === b[j] ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1]);
  const pairs = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { pairs.push([i, j]); i++; j++; } else if (d[i + 1][j] >= d[i][j + 1]) i++; else j++;
  }
  return pairs;
}

/**
 * Compare an everyday unpointed spelling with a fully pointed one.
 * roles are given per letter of `unpointed`: 'consonant' | 'mater' (vowel letter that the pointed form also has)
 * | 'plene-extra' (vowel letter only the everyday spelling has) | 'unmatched' (should not happen: error).
 * @returns {{same:boolean, ok:boolean, roles:string[], extra:string[], missing:string[]}}
 */
export function pleneCheck(unpointed, full) {
  const u = [...unpointed].filter(isLetter);
  const uf = u.map(fold);
  const f = lettersOf(full);
  const fullLetters = [...full].filter(isLetter);
  const pairs = lcs(uf, f);
  const matchedU = new Map(pairs); // u index -> f index
  const matchedF = new Set(pairs.map((p) => p[1]));
  const maters = materIndices(full);
  const roles = u.map((ch, i) => {
    if (matchedU.has(i)) return maters.has(/** @type {number} */ (matchedU.get(i))) ? 'mater' : 'consonant';
    return ch === 'ו' || ch === 'י' ? 'plene-extra' : 'unmatched';
  });
  const extra = roles.map((r, i) => (r === 'plene-extra' ? u[i] : null)).filter(Boolean);
  const missing = fullLetters.filter((_, j) => !matchedF.has(j));
  const same = extra.length === 0 && missing.length === 0;
  const ok = !roles.includes('unmatched') && missing.length === 0;
  return { same, ok, roles, extra: /** @type {string[]} */ (extra), missing };
}

const norm = (ipa) => String(ipa ?? '').replace(/[\[\]()ː̞]/g, '').trim();

/**
 * Marks in a pointed word whose sound differs between traditions, for the tradition badge.
 * @returns {{id:string, shape:string, ipa:Record<string,string>, note?:string}[]}
 */
export function traditionBadges(full, niqqud, consonants) {
  const out = [];
  const seen = new Set();
  const cl = parseWord(full);
  for (const c of cl) {
    if (c.vowel && !seen.has(c.vowel)) {
      seen.add(c.vowel);
      const rec = niqqud.records.find((r) => r.id === c.vowel);
      if (!rec) continue;
      if (c.vowel === 'shva') { out.push({ id: 'shva', shape: rec.shape, ipa: rec.ipa, note: 'Shva is sounded or silent depending on the word and the tradition; it is not simply a short e.' }); continue; }
      const vals = TRADITIONS.map((t) => norm(rec.ipa?.[t]));
      if (new Set(vals).size > 1) out.push({ id: rec.id, shape: rec.shape, ipa: rec.ipa });
    }
    if (c.ch === 'ת' && !c.dagesh && !seen.has('tav') && consonants?.letters?.tav) {
      seen.add('tav');
      out.push({ id: 'tav', shape: 'ת', ipa: consonants.letters.tav.ipa, note: 'Ashkenazi tav without a dot is read s in the traditional pronunciation (Shabbos).' });
    }
  }
  return out;
}

// ---------------------------------------------------------------- dot toggle

const DOT_MARKS = {
  dagesh: ['ּ', ''],
  'shin-sin': ['ׁ', 'ׂ'],
};
const DOT_LABELS = {
  dagesh: ['dot (dagesh)', 'no dot'],
  'shin-sin': ['dot on the right (shin)', 'dot on the left (sin)'],
};

/**
 * Build the four toggle pairs. `letters` is data/letters/letters.json (read only).
 * state 0 is the "first" form (with dagesh / shin dot), state 1 the second.
 */
export function dotPairs(consonants, letters, dotData, tradition) {
  const t = normalizeTradition(tradition);
  return dotData.pairs.map((p) => {
    const c = consonants.letters[p.letterId];
    const lt = letters.find((l) => l.id === p.letterId);
    const [v0, v1] = c.variants;
    const mk = (v, idx) => ({
      key: idx === 0 ? 'first' : 'second',
      dotted: idx === 0 && p.dot === 'dagesh',
      label: DOT_LABELS[p.dot][idx],
      glyph: lt.he + DOT_MARKS[p.dot][idx],
      ipa: v.ipa[t],
      english: v.english[t],
      hint: idx === 0 ? p.hints.with : p.hints.without,
    });
    const states = [mk(v0, 0), mk(v1, 1)];
    return {
      id: p.id, letterId: p.letterId, letterName: lt.name, letter: lt.he, kind: p.dot, states,
      traditionNote: String(c.ipa[t] ?? ''),
      contrast: norm(states[0].ipa) !== norm(states[1].ipa) && states[0].english !== states[1].english,
    };
  });
}

/** Seeded PRNG (mulberry32) so tests and the view can be deterministic. */
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * "Set the dot" items. Only pairs that have an audible contrast in the tradition are used, and an item is dropped
 * if its cue (english text of the wanted sound) is shared with any other state of any pair.
 * @returns {{pairId:string, letter:string, wanted:0|1, cue:string, ipa:string}[]}
 */
export function makeDotItems(pairs, tradition, rng = Math.random, n = 6) {
  const states = [];
  for (const p of pairs) if (p.contrast) p.states.forEach((s, i) => states.push({ p, s, i }));
  const count = new Map();
  for (const x of states) count.set(x.s.english, (count.get(x.s.english) ?? 0) + 1);
  const pool = states.filter((x) => count.get(x.s.english) === 1);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, n).map((x) => ({ pairId: x.p.id, letter: x.p.letter, wanted: /** @type {0|1} */ (x.i), cue: x.s.english, ipa: x.s.ipa }));
}
