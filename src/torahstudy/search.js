// @ts-check
// Torah search (E5): find verses by a Hebrew word, or by a root. Pure: no DOM, no fetch.
// Word search: whole words, vowel points ignored, final letters matched to their base form, optionally with one or two of the
// prefix letters ו ה ב כ ל מ ש in front. Root search: the word forms the app's own root data lists under that root
// (data/roots/families.json and data/roots/verbs.json with each verb's stored forms), each searched as a word with prefixes.
// It cannot find a form the root data does not list, and the screen says so: it is not a grammatical root analysis.
export const PREFIXES = 'והבכלמש';
export const MAX_SHOWN = 200;
const FINAL = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
/** Letters only, final forms as base: the comparison key for one word. */
export const wkey = (s) => String(s ?? '').normalize('NFD').replace(/[֑-ׇ]/g, '').replace(/[^א-ת]/g, '').replace(/[ךםןףץ]/g, (c) => FINAL[c]);
/** The query's words (a maqaf or a space separates them). */
export const queryWords = (q) => String(q ?? '').replace(/[־,;]/g, ' ').split(/\s+/).map(wkey).filter(Boolean);

/** Loose spelling: ו and י taken out (the Torah often writes שלם where modern Hebrew writes שלום). Finds more, and some other words. */
export const looseKey = (k) => { const x = k.replace(/[וי]/g, ''); return x.length >= 2 ? x : k; };
/** Does a verse word match the target key, exactly or after taking off up to two prefix letters? */
export function wordMatches(word, target, withPrefix = true, loose = false) {
  const w = wkey(word), same = (a) => (loose ? looseKey(a) === looseKey(target) : a === target);
  if (same(w)) return true;
  if (!withPrefix) return false;
  for (let i = 1; i <= 2 && w.length - i >= 2; i++) { if (!PREFIXES.includes(w[i - 1])) return false; if (same(w.slice(i))) return true; }
  return false;
}

/**
 * Verses where every query word appears (as whole words). targets: list of alternative keys (root search) or null.
 * @param {{books:{id:string,en:string,chapters:string[][]}[]}} index
 * @returns {{book:string, en:string, chapter:number, verse:number, text:string, hits:number[]}[]}
 */
export function search(index, { words = [], anyOf = null, withPrefix = true, loose = false } = {}) {
  const out = [];
  if (!index?.books || (!words.length && !anyOf?.length)) return out;
  const any = anyOf ? new Set(anyOf) : null;
  for (const b of index.books) b.chapters.forEach((verses, ci) => verses.forEach((text, vi) => {
    const toks = text.split(' ');
    const hits = [];
    if (any) toks.forEach((t, i) => { for (const k of any) if (wordMatches(t, k, withPrefix, loose)) { hits.push(i); break; } });
    else { let all = true; for (const k of words) { const at = toks.map((t, i) => (wordMatches(t, k, withPrefix, loose) ? i : -1)).filter((i) => i >= 0); if (!at.length) { all = false; break; } hits.push(...at); } if (!all) hits.length = 0; }
    if (hits.length) out.push({ book: b.id, en: b.en, chapter: ci + 1, verse: vi + 1, text, hits: [...new Set(hits)].sort((x, y) => x - y) });
  }));
  return out;
}

/** The root data's word forms for a root typed as letters ('שמר', 'ש־מ־ר', 'שׁ מ ר'). Empty when the data has no such root. */
export function rootForms(rootQuery, families, verbs) {
  const want = wkey(rootQuery);
  if (want.length < 2) return [];
  const forms = new Set();
  for (const f of families?.families || []) if (wkey(f.root) === want) for (const w of f.words || []) { forms.add(wkey(w.he)); for (const v of Object.values(w.forms || {})) forms.add(wkey(v)); }
  for (const v of verbs?.verbs || []) if (v.root && wkey(v.root) === want) { forms.add(wkey(v.he)); for (const f of Object.values(v.forms || {})) forms.add(wkey(f)); }
  forms.delete('');
  return [...forms].filter((k) => k.length >= 2).sort();
}

/** Reader link for a verse. */
export const readerHref = (r) => `#/torahreader?book=${r.book}&chapter=${r.chapter}&verse=${r.verse}`;
/** 'Genesis 1:1' */
export const refLabel = (r) => `${r.en} ${r.chapter}:${r.verse}`;
