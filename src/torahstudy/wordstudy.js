// @ts-check
// Word-by-word study for every Torah portion (idea M1). Pure: no DOM, no fetch.
// The two hand-built study passages (Priestly Blessing, Shema) carry their own glosses; this module is the generator for
// everything else. It builds a study page for any portion from data the app already holds:
//   words     the Torah text itself (data/corpus/torah/<book>/<nn>.json, field he)
//   meaning   the app's word list (data/vocab/index.json), matched on the exact pointed spelling, or on the pointed spelling
//             after one or two prefix letters are taken off. Unpointed look-alikes are never matched: they are often other words.
//   root      the app's root lists (data/roots/families.json, verbs.json), matched the same way
//   audio     a word clip only when the app holds one for that exact pointed spelling
// The word list is a modern Hebrew list, so many Torah words have no entry and a matched entry gives the modern sense. The
// screen says so and always shows the verse's own translation. Nothing is invented for a word the lists do not hold.
import { hasName } from '../games/tg-core.js';
import { wkey } from './search.js';

export const STUDY_KEY = 'torah.wordstudy.v1';
export const LEXICON_NOTE = 'Meanings come from Aleph’s word list, which is a modern Hebrew list. A Torah word can carry an older or wider sense, so read each meaning beside the verse’s translation. Words the list does not hold show no meaning.';
export const PREFIX_NOTE = 'Found after taking off the prefix, so treat it as a likely match.';
const CANT = /[֑-ֽ֯׀׃]/g;
const MAQAF = '־';
const DAGESH = 'ּ';
const isLetter = (c) => c >= 'א' && c <= 'ת';

/** A word's pointed spelling: vowel points kept; cantillation, meteg, paseq, sof pasuq and a trailing maqaf removed. */
export const pointed = (w) => String(w ?? '').normalize('NFD').replace(CANT, '').replace(new RegExp(MAQAF + '$'), '').normalize('NFC');

/** What each prefix letter adds. Shown beside a prefix match so the learner sees what was taken off. */
export const PREFIX_SENSE = Object.freeze({ 'ו': 'and', 'ה': 'the', 'ב': 'in, with', 'כ': 'like, as', 'ל': 'to, for', 'מ': 'from', 'ש': 'that, which' });

// The vowels each prefix letter is written with. A letter pointed any other way is part of the word, not a prefix:
// a vav with holam is a vowel letter, mem as a prefix has hiriq or tsere, and "that" is shin (never sin) with segol.
const SHEVA = '\u05B0', HATAF_PATACH = '\u05B2', HIRIQ = '\u05B4', TSERE = '\u05B5', SEGOL = '\u05B6', PATACH = '\u05B7', QAMATS = '\u05B8', SHIN_DOT = '\u05C1';
const PREFIX_VOWELS = {
  'ו': [SHEVA, HIRIQ, PATACH, QAMATS, SEGOL, DAGESH],
  'ה': [PATACH, QAMATS, SEGOL, HATAF_PATACH],
  'ב': [SHEVA, HIRIQ, PATACH, QAMATS, SEGOL, TSERE], 'כ': [SHEVA, HIRIQ, PATACH, QAMATS, SEGOL, TSERE], 'ל': [SHEVA, HIRIQ, PATACH, QAMATS, SEGOL, TSERE],
  'מ': [HIRIQ, TSERE],
  'ש': [SEGOL],
};
function prefixPointsOk(letter, marks) {
  const vowels = [...marks].filter((m) => m !== SHIN_DOT && m !== '\u05C2' && !(m === DAGESH && letter !== 'ו'));
  if (letter === 'ש' && !marks.includes(SHIN_DOT)) return false;
  return vowels.length === 1 && PREFIX_VOWELS[letter].includes(vowels[0]);
}

/**
 * Ways to take a prefix off a pointed word: [{ prefix, rest }]. One prefix letter, or "and" (ו) followed by one more. Each prefix
 * letter must be pointed the way that prefix is written (see PREFIX_VOWELS). The first letter of what is left may have gained a
 * dagesh from the prefix, so each cut is offered with and without it. A cut never leaves fewer than two letters, and only
 * "and" or "the" alone may leave exactly two.
 */
export function prefixCuts(word) {
  const d = pointed(word).normalize('NFD');
  const out = [];
  let i = 0, prefix = '';
  for (let n = 0; n < 2; n++) {
    if (!isLetter(d[i]) || !(d[i] in PREFIX_SENSE)) break;
    if (n === 1 && prefix !== 'ו') break;
    if (n === 1 && d[i] === 'ו') break;
    let j = i + 1;
    while (j < d.length && !isLetter(d[j])) j++;
    if (!prefixPointsOk(d[i], d.slice(i + 1, j))) break;
    prefix += d[i];
    const rest = d.slice(j);
    // Two letters are enough after "and" or "the" alone (וְלֹא, הָעָם); every other cut must leave three, or short names and
    // short words split wrongly (כָּלֵב is Caleb, not "like a heart").
    const left = [...rest].filter(isLetter).length;
    if (left < 2) break;
    if (left < 3 && !(prefix === 'ו' || prefix === 'ה')) { i = j; continue; }
    out.push({ prefix, rest: rest.normalize('NFC') });
    let k = 1; while (k < rest.length && !isLetter(rest[k])) k++;
    const head = rest.slice(0, k);
    if (head.includes(DAGESH)) out.push({ prefix, rest: (head.replace(DAGESH, '') + rest.slice(k)).normalize('NFC') });
    i = j;
  }
  return out;
}

/**
 * Lookup tables from the app's lists.
 * vocabIndex: data/vocab/index.json ({ fields, rows }); families / verbs: the root lists (optional).
 * @returns {{ words: Map<string, {id:string,he:string,en:string,translit:string,pos:string}[]>, roots: Map<string,string> }}
 */
export function buildLexicon(vocabIndex, families = null, verbs = null) {
  const words = new Map(), roots = new Map();
  const f = vocabIndex?.fields || [];
  const at = (name) => f.indexOf(name);
  const iId = at('id'), iHe = at('he'), iEn = at('en'), iPos = at('pos'), iTr = at('translit');
  for (const r of vocabIndex?.rows || []) {
    const k = pointed(r[iHe]);
    if (!k || hasName(k)) continue; // the Name is never a vocabulary item
    const list = words.get(k) || [];
    if (list.length < 3) list.push({ id: r[iId], he: r[iHe], en: r[iEn], translit: r[iTr] || '', pos: r[iPos] || '' });
    words.set(k, list);
  }
  const addRoot = (he, root) => { const k = pointed(he); if (k && root && !roots.has(k)) roots.set(k, root); };
  for (const fam of families?.families || []) for (const w of fam.words || []) { addRoot(w.he, fam.root); for (const v of Object.values(w.forms || {})) addRoot(v, fam.root); }
  for (const v of verbs?.verbs || []) if (v.root) { addRoot(v.he, v.root); for (const x of Object.values(v.forms || {})) addRoot(x, v.root); }
  return { words, roots };
}

/**
 * What the lists hold for one Torah word.
 * @returns {{ kind: 'name'|'exact'|'prefix'|'none', entries: any[], prefix: string, prefixSense: string, root: string|null }}
 */
export function lookup(lex, word) {
  const p = pointed(word);
  if (hasName(p)) return { kind: 'name', entries: [], prefix: '', prefixSense: '', root: null };
  const exact = lex?.words?.get(p);
  if (exact) return { kind: 'exact', entries: exact, prefix: '', prefixSense: '', root: lex.roots?.get(p) || null };
  for (const cut of prefixCuts(p)) {
    const hit = lex?.words?.get(cut.rest);
    if (hit) return { kind: 'prefix', entries: hit, prefix: cut.prefix, prefixSense: [...cut.prefix].map((c) => PREFIX_SENSE[c]).join(' + '), root: lex.roots?.get(cut.rest) || null };
  }
  let root = lex?.roots?.get(p) || null;
  if (!root) for (const cut of prefixCuts(p)) { root = lex?.roots?.get(cut.rest) || null; if (root) break; }
  return { kind: 'none', entries: [], prefix: '', prefixSense: '', root };
}

/**
 * The tappable words of a verse: [{ i, text, joined }] from the pointed text. A maqaf-joined group is split so each part can be
 * tapped; `joined` is true when the part is tied to the next one (the maqaf stays on its text). The sof pasuq is dropped.
 */
export function verseWords(he) {
  const out = [];
  for (const tok of String(he ?? '').replace(/׃/g, '').split(/\s+/).filter(Boolean)) {
    if (tok === '׀') continue;
    const parts = tok.split(MAQAF).filter(Boolean);
    parts.forEach((part, k) => out.push({ i: out.length, text: k < parts.length - 1 ? part + MAQAF : part, joined: k < parts.length - 1 }));
  }
  return out;
}

/** The 54 portions grouped by book, in reading order: [{ book, en, he, portions: [portion] }]. */
export function portionsByBook(index) {
  return (index?.books || []).map((b) => ({ book: b.id, en: b.en, he: b.he, portions: (index.parshiyot || []).filter((p) => p.book === b.id).sort((x, y) => x.num - y.num) })).filter((g) => g.portions.length);
}
export const portionById = (index, id) => (index?.parshiyot || []).find((p) => p.id === id) || null;

/** The study units of a portion: its seven aliyot (or the whole portion when it lists none). */
export function units(portion) {
  if (!portion) return [];
  const al = Array.isArray(portion.aliyot) && portion.aliyot.length ? portion.aliyot : [{ n: 1, from: portion.from, to: portion.to }];
  return al.map((a) => ({ n: a.n, label: portion.aliyot?.length ? `Aliyah ${a.n}` : 'Whole Portion', from: a.from, to: a.to }));
}

/** The verses of a range in reading order: [{ book, chapter, verse }], from the index's chapter lengths. */
export function rangeVerses(index, from, to) {
  const out = []; let on = false, done = false;
  for (const b of index?.books || []) {
    (b.chapterVerses || []).forEach((n, ci) => {
      for (let v = 1; v <= n && !done; v++) {
        if (!on && b.id === from.book && ci + 1 === from.chapter && v === from.verse) on = true;
        if (on) out.push({ book: b.id, chapter: ci + 1, verse: v });
        if (on && b.id === to.book && ci + 1 === to.chapter && v === to.verse) { on = false; done = true; }
      }
    });
    if (done) break;
  }
  return out;
}
/** The chapters a list of verses touches: [{ book, chapter }]. */
export function chaptersOf(verses) {
  const seen = new Set(), out = [];
  for (const v of verses) { const k = `${v.book}:${v.chapter}`; if (!seen.has(k)) { seen.add(k); out.push({ book: v.book, chapter: v.chapter }); } }
  return out;
}

/** How many of a unit's words the lists can explain: { words, exact, prefix, name, none }. rows: [{ he }] */
export function coverage(lex, rows) {
  const c = { words: 0, exact: 0, prefix: 0, name: 0, none: 0 };
  for (const r of rows || []) for (const w of verseWords(r.he)) { c.words++; c[lookup(lex, w.text).kind]++; }
  return c;
}
export const coverageText = (c) => (c.words ? `${c.exact + c.prefix} of the ${c.words} words here have a meaning from the word list (${c.prefix} of them after taking off a prefix).` : '');

/** The letters-only key of a word, for "where else does this appear" (shared with Torah Search). */
export const letterKey = (w) => wkey(pointed(w));

/** Portions the learner opened, and the last unit in each: { v, last: id|null, seen: { [id]: unit n } }. */
export function normaliseStudy(raw) {
  const s = { v: 1, last: null, seen: {} };
  if (!raw || typeof raw !== 'object') return s;
  if (typeof raw.last === 'string') s.last = raw.last.slice(0, 40);
  for (const [k, n] of Object.entries(raw.seen && typeof raw.seen === 'object' ? raw.seen : {})) if (Number.isInteger(n) && n >= 1 && n <= 7) s.seen[k.slice(0, 40)] = n;
  return s;
}
export const markOpened = (study, id, n) => { const s = normaliseStudy(study); s.last = id; s.seen[id] = n; return s; };
