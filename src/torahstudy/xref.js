// @ts-check
// Cross-reference web (idea M4). Pure: no DOM, no fetch.
// Everything is computed from the Torah Search index the app already ships (data/torahstudy/search.json: every verse as letters
// only). No new content: the "web" is a word -> verses table built in memory when the page opens.
//   occurrences   every verse where a word appears (same letters, final forms matched)
//   rare words    a verse's words that appear only a few times in the whole Torah, and the other verses that share each one
//   same root     verses holding another listed form of the word's root, when Aleph's root lists know the word (they hold few forms)
// Matching is by letters, so two different words spelled alike are counted together; the screen says so.
import { wkey, rootForms, search, PREFIXES } from './search.js';
export { wkey };

export const RARE_MAX = 8; // a word found in at most this many verses counts as rare
export const MIN_LETTERS = 3; // shorter words (particles) are never offered as links
export const MAX_LIST = 200;
export const LETTERS_NOTE = 'Words are matched by their letters, without vowel points, so two different words that are spelled the same are listed together.';
export const ROOT_NOTE = 'Root links use the word forms that Aleph’s root lists hold. The Torah has many forms those lists do not hold, so this shows some verses with the root, not all of them.';

/**
 * The key a word is counted under: its letters with a leading "and" (ו) taken off when at least three letters are left.
 * Only ו is removed here: almost no Hebrew word begins with it, so the cut is safe. Other prefixes are handled when the
 * verses are listed (Torah Search's own prefix rule), never by guessing here.
 */
export const stemKey = (word) => { const k = wkey(word); return k.length >= 4 && k[0] === 'ו' ? k.slice(1) : k; };

/** Pack a verse position into one number and back (book index, chapter, verse). */
const pack = (b, c, v) => b * 1000000 + c * 1000 + v;
export const unpack = (n) => ({ b: Math.floor(n / 1000000), chapter: Math.floor(n / 1000) % 1000, verse: n % 1000 });

/**
 * word key (stemKey) -> sorted list of packed verse positions (one entry per verse, however many times the word is in it).
 * @param {{books:{id:string,en:string,chapters:string[][]}[]}} index
 */
export function buildWordIndex(index) {
  const words = new Map();
  (index?.books || []).forEach((b, bi) => b.chapters.forEach((verses, ci) => verses.forEach((text, vi) => {
    const at = pack(bi, ci + 1, vi + 1);
    for (const t of new Set(text.split(' ').map(stemKey))) { // final letters folded, a leading "and" taken off
      if (!t) continue;
      const list = words.get(t);
      if (list) list.push(at); else words.set(t, [at]);
    }
  })));
  return { words, books: (index?.books || []).map((b) => ({ id: b.id, en: b.en })) };
}

export const refLabel = (r) => `${r.en} ${r.chapter}:${r.verse}`;
export const xrefHref = (r, w = null) => `#/cross-references?book=${r.book}&chapter=${r.chapter}&verse=${r.verse}${w == null ? '' : `&w=${w}`}`;
export const readerHref = (r) => `#/torahreader?book=${r.book}&chapter=${r.chapter}&verse=${r.verse}`;

/** How many verses hold this word (same letters, with or without a leading "and"). */
export const verseCount = (wi, word) => (wi.words.get(stemKey(word)) || []).length;

/**
 * Every verse where the word appears, also with one or two prefix letters in front (Torah Search's rule):
 * { key, total, refs (first `max`), hits: Map<'book:chapter:verse', number[]> (word positions) }.
 */
export function occurrences(index, word, max = MAX_LIST) {
  const key = stemKey(word);
  const all = key.length >= 2 ? search(index, { words: [key], withPrefix: true }) : [];
  return { key, total: all.length, refs: all.slice(0, max).map((r) => ({ book: r.book, en: r.en, chapter: r.chapter, verse: r.verse, text: r.text, hits: r.hits })) };
}

/** The letters of a verse's words, in order, from the search index: ['בראשית', 'ברא', ...]. */
export function verseKeys(index, ref) {
  const b = (index?.books || []).find((x) => x.id === ref.book);
  const text = b?.chapters?.[ref.chapter - 1]?.[ref.verse - 1];
  return text ? text.split(' ').filter(Boolean) : [];
}

/**
 * A verse's rare words and the other verses that share each one, rarest first:
 * [{ key, word (as spelled in the verse), i (first position in the verse), total, refs (other verses) }]. Words on every rarity level are skipped when they
 * are shorter than MIN_LETTERS. A word found only in this verse is listed with no other verses ("only here").
 */
export function rareLinks(wi, index, ref, { rareMax = RARE_MAX } = {}) {
  const keys = verseKeys(index, ref);
  const same = (r) => r.book === ref.book && r.chapter === ref.chapter && r.verse === ref.verse;
  const seen = new Set(), out = [];
  keys.forEach((word, i) => {
    const key = stemKey(word);
    if (seen.has(key) || key.length < MIN_LETTERS) return;
    seen.add(key);
    const quick = (wi.words.get(key) || []).length;
    if (!quick || quick > rareMax) return;
    // The quick count misses forms with other prefixes (ב, ל, ה ...); list them the way Torah Search does and re-check.
    const all = search(index, { words: [key], withPrefix: true });
    if (all.length > rareMax) return;
    out.push({ key, word, i, total: all.length, refs: all.filter((r) => !same(r)).map((r) => ({ book: r.book, en: r.en, chapter: r.chapter, verse: r.verse })) });
  });
  return out.sort((a, b) => a.total - b.total || a.i - b.i);
}

/** The verses that share the most rare words with this one: [{ ref, shared: [word] }], most shared first. */
export function relatedVerses(links, max = 20) {
  const by = new Map();
  for (const l of links) for (const r of l.refs) {
    const k = `${r.book}:${r.chapter}:${r.verse}`;
    if (!by.has(k)) by.set(k, { ref: r, shared: [] });
    by.get(k).shared.push(l.word);
  }
  return [...by.values()].sort((a, b) => b.shared.length - a.shared.length).slice(0, max);
}

/** Strip up to two prefix letters to find a key the root lists hold. Returns the candidates, longest first. */
const stems = (key) => { const out = [key]; for (let i = 1; i <= 2 && key.length - i >= 2; i++) { if (!PREFIXES.includes(key[i - 1])) break; out.push(key.slice(i)); } return out; };

/**
 * The root of a word, when the root lists hold this form: { root, forms } or null.
 * families / verbs: data/roots/families.json and verbs.json.
 */
export function rootOf(word, families, verbs) {
  const cands = stems(wkey(word));
  const has = (he, forms) => { const ks = [wkey(he), ...Object.values(forms || {}).map(wkey)]; return cands.some((c) => ks.includes(c)); };
  let root = null;
  for (const f of families?.families || []) { if ((f.words || []).some((w) => has(w.he, w.forms))) { root = f.root; break; } }
  if (!root) for (const v of verbs?.verbs || []) if (v.root && has(v.he, v.forms)) { root = v.root; break; }
  if (!root) return null;
  return { root, forms: rootForms(root, families, verbs) };
}

/** Verses holding any listed form of the root (other than `ref`): { total, refs }. */
export function rootVerses(index, forms, ref, max = MAX_LIST) {
  const all = search(index, { anyOf: forms, withPrefix: true }).filter((r) => !(r.book === ref.book && r.chapter === ref.chapter && r.verse === ref.verse));
  return { total: all.length, refs: all.slice(0, max).map((r) => ({ book: r.book, en: r.en, chapter: r.chapter, verse: r.verse })) };
}

/** A safe verse position from query text, against the index: { book, en, chapter, verse } (Genesis 1:1 when anything is off). */
export function refFromQuery(index, q) {
  const books = index?.books || [];
  const b = books.find((x) => x.id === q?.book) || books[0];
  if (!b) return null;
  const chapter = Math.min(Math.max(1, Number(q?.chapter) || 1), b.chapters.length);
  const verse = Math.min(Math.max(1, Number(q?.verse) || 1), b.chapters[chapter - 1].length);
  return { book: b.id, en: b.en, chapter, verse };
}
