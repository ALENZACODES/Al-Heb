// J9 Search everything: the parts of #/search beyond pages, letters and words. Lessons (lessons-index.json), little books
// (books/index.json), root families (roots/families.json), prayers and texts (corpus/registry.json), Torah references
// ("Genesis 12:1", "gen 12", "בראשית 1") and, when the learner asks, the text of every Torah verse (Hebrew or the public-domain
// English), chapter files loaded one by one. Hebrew input works with or without vowel points and final forms.
// Data is fetched on first search only; every result links into the existing page. The divine name is shown as ה׳.
import { norm, hasHebrew } from '../shell/search.js';
import { showName } from '../games/tg-core.js';

const DATA = {
  lessons: '../../data/curriculum/lessons-index.json', books: '../../data/books/index.json', roots: '../../data/roots/families.json',
  registry: '../../data/corpus/registry.json', torah: '../../data/corpus/torah/index.json',
};
async function loadJSON(rel) {
  const url = new URL(rel, import.meta.url);
  if (url.protocol === 'file:') { const { readFile } = await import('node:fs/promises'); return JSON.parse(await readFile(url, 'utf8')); }
  const r = await fetch(url); if (!r.ok) throw new Error(`${rel} HTTP ${r.status}`); return r.json();
}
const heNorm = (s) => norm(String(s || '').replace(/[־׀׃]/g, ' '));
const tok = (q) => heNorm(q).split(' ').filter(Boolean);
const allIn = (hay, tk) => tk.every((t) => hay.includes(t));
const wordIn = (hay, t) => (' ' + hay + ' ').includes(' ' + t + ' ');

/** Load every small index (the Torah chapters themselves only load in searchTorahText). Missing parts become empty. */
export async function loadIndexes(load = loadJSON) {
  const get = async (k) => { try { return await load(DATA[k]); } catch { return null; } };
  const [lessons, books, roots, registry, torah] = await Promise.all(['lessons', 'books', 'roots', 'registry', 'torah'].map(get));
  return { lessons: lessons?.lessons || [], books: books?.books || [], roots: roots?.families || [], registry: registry?.entries || [], torah: torah?.books || [] };
}

export function searchLessons(lessons, q, limit = 8) {
  const tk = tok(q); if (!tk.length) return [];
  return lessons.filter((l) => allIn(heNorm([l.id, l.title, l.teaser].join(' ')), tk)).slice(0, limit)
    .map((l) => ({ href: `#/learn?lesson=${encodeURIComponent(l.id)}`, label: l.title, desc: `Lesson ${l.id}${l.estMinutes ? `, about ${l.estMinutes} minutes` : ''}` }));
}
export function searchBooks(books, q, limit = 8) {
  const tk = tok(q); if (!tk.length) return [];
  return books.filter((b) => allIn(heNorm([b.titleEn, b.titleTranslit, b.titleHe, b.level].join(' ')), tk)).slice(0, limit)
    .map((b) => ({ href: `#/book/${encodeURIComponent(b.id)}`, label: b.titleEn, he: b.titleHe, desc: [b.titleTranslit, b.level].filter(Boolean).join(', ') }));
}
/** Root families: Hebrew matches the root letters or a member word; English matches a member's meaning (whole word). */
export function searchRoots(families, q, limit = 6) {
  const n = heNorm(q); if (!n) return [];
  const he = hasHebrew(q), out = [];
  for (const f of families) {
    const letters = heNorm(f.root).replace(/ /g, '');
    const words = f.words || [];
    const hit = he ? (letters === n.replace(/ /g, '') || words.some((w) => heNorm(w.unpointed || w.he) === n)) : n.length >= 3 && words.some((w) => wordIn(heNorm(w.en), n));
    if (hit) out.push({ href: `#/roots?letters=${encodeURIComponent(f.root)}`, label: `Root ${f.root}`, he: f.root, desc: words.slice(0, 3).map((w) => `${w.he} ${w.en}`).join(', ') });
    if (out.length >= limit) break;
  }
  return out;
}
/** Prayers and texts in the reader's registry: title, reference, English or Hebrew words. */
export function searchTexts(entries, q, limit = 8) {
  const tk = tok(q); if (!tk.length) return [];
  return entries.filter((e) => allIn(heNorm([e.title, e.ref, e.english, e.he, e.category].join(' ')), tk)).slice(0, limit)
    .map((e) => ({ href: `#/read/${encodeURIComponent(e.id)}`, label: e.title, he: showName(e.he || ''), desc: [e.ref, e.category === 'siddur' ? 'Prayer book' : 'Torah'].filter(Boolean).join(', ') }));
}

/** "Genesis 12:1", "gen 12 1", "בראשית 1" -> {book, en, chapter, verse|null, href}; null when it is not a Torah reference. */
export function parseTorahRef(q, books) {
  const m = String(q || '').trim().match(/^(.+?)\s+(\d{1,3})(?:\s*[:.\s]\s*(\d{1,3}))?$/);
  if (!m) return null;
  const name = heNorm(m[1]);
  if (!name) return null;
  const b = books.find((x) => heNorm(x.en) === name || heNorm(x.he) === name || (name.length >= 3 && heNorm(x.en).startsWith(name)));
  if (!b) return null;
  const ch = Number(m[2]), v = m[3] ? Number(m[3]) : null;
  if (ch < 1 || ch > Number(b.chapters)) return null;
  const max = (b.chapterVerses || [])[ch - 1];
  if (v != null && (v < 1 || (max && v > max))) return null;
  return { book: b.id, en: b.en, chapter: ch, verse: v, href: `#/torahreader?book=${b.id}&chapter=${ch}${v ? `&verse=${v}` : ''}` };
}

/**
 * Search the text of every Torah verse: Hebrew (two letters or more, whole words, points ignored) or English (three letters or
 * more, whole words). Loads chapter files one at a time; `onProgress(done, total)` after each; stops at `limit` hits or when
 * `cancelled()` returns true. @returns {Promise<{hits:{href:string, label:string, he:string, desc:string}[], chapters:number, complete:boolean}>}
 */
export async function searchTorahText(q, books, { load = loadJSON, limit = 30, onProgress = () => {}, cancelled = () => false } = {}) {
  const he = hasHebrew(q), tk = tok(q);
  if (!tk.length || (he ? tk.join('').length < 2 : tk.join('').length < 3)) return { hits: [], chapters: 0, complete: true };
  const total = books.reduce((a, b) => a + Number(b.chapters || 0), 0);
  const hits = []; let done = 0;
  for (const b of books) for (let ch = 1; ch <= Number(b.chapters || 0); ch++) {
    if (cancelled()) return { hits, chapters: done, complete: false };
    let data = null; try { data = await load(`../../data/corpus/torah/${b.id}/${String(ch).padStart(2, '0')}.json`); } catch { /* a missing chapter is skipped */ }
    done++; onProgress(done, total);
    for (const v of data?.verses || []) {
      const hay = he ? heNorm(v.he) : heNorm(v.en);
      if (tk.every((t) => wordIn(hay, t))) {
        hits.push({ href: `#/torahreader?book=${b.id}&chapter=${ch}&verse=${v.n}`, label: `${b.en} ${ch}:${v.n}`, he: showName(v.he), desc: v.en || '' });
        if (hits.length >= limit) return { hits, chapters: done, complete: false };
      }
    }
  }
  return { hits, chapters: done, complete: true };
}

/** All the quick groups for a query (the Torah text search is separate, on request). */
export function searchAll(ix, q) {
  const ref = parseTorahRef(q, ix.torah);
  return [
    ['Torah', ref ? [{ href: ref.href, label: `${ref.en} ${ref.chapter}${ref.verse ? ':' + ref.verse : ''}`, desc: 'Open in the Torah reader' }] : []],
    ['Lessons', searchLessons(ix.lessons, q)], ['Little Books', searchBooks(ix.books, q)], ['Root Families', searchRoots(ix.roots, q)], ['Prayers and Texts', searchTexts(ix.registry, q)],
  ].filter(([, rows]) => rows.length);
}
