// @ts-check
// Reads the app's own lesson and book lists for the sharing pages (titles and order only).
export async function loadJSON(rel, fetchFn = globalThis.fetch) {
  const url = new URL(rel, import.meta.url);
  if (url.protocol === 'file:') { const { readFile } = await import('node:fs/promises'); return JSON.parse(await readFile(url, 'utf8')); }
  const r = await fetchFn(url); if (!r.ok) throw new Error(`${rel} HTTP ${r.status}`); return r.json();
}
/** [{id, title}] in course order. */
export async function lessonList(fetchFn) { const L = await loadJSON('../../data/curriculum/lessons.json', fetchFn); return (L.lessons || []).map((l) => ({ id: l.id, title: String(l.title || l.id) })); }
/** [{id, title}] in shelf order. */
export async function bookList(fetchFn) { const B = await loadJSON('../../data/books/index.json', fetchFn); return (B.books || []).map((b) => ({ id: b.id, title: String(b.titleEn || b.id) })); }
