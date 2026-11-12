// @ts-check
// Verse notebook (E6): verses saved with the learner's own notes, kept on this device only, exportable as a file.
// Pure apart from the store helpers (which never throw). One entry per verse; saving again keeps the note.
export const NOTEBOOK_KEY = 'torah.notebook.v1';
export const MAX_NOTE = 2000;
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
export const verseKey = (r) => `${r.book}:${r.chapter}:${r.verse}`;

/** Items, newest first. */
export const items = (rec) => (Array.isArray(obj(rec).items) ? obj(rec).items.filter((x) => x && x.book && x.chapter && x.verse) : []).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
export const has = (rec, r) => items(rec).some((x) => verseKey(x) === verseKey(r));

/** Save a verse (keeps an existing note). r: { book, en, chapter, verse, he?, english? } */
export function save(rec, r, now = Date.now()) {
  const list = items(rec), k = verseKey(r), was = list.find((x) => verseKey(x) === k);
  const entry = { book: r.book, en: r.en || was?.en || r.book, chapter: Number(r.chapter), verse: Number(r.verse), he: r.he || was?.he || '', english: r.english || was?.english || '', note: was?.note || '', savedAt: was?.savedAt || Number(now) || 0 };
  return { version: 1, items: [entry, ...list.filter((x) => verseKey(x) !== k)] };
}
export const remove = (rec, r) => ({ version: 1, items: items(rec).filter((x) => verseKey(x) !== verseKey(r)) });
export function setNote(rec, r, note, now = Date.now()) {
  return { version: 1, items: items(rec).map((x) => (verseKey(x) === verseKey(r) ? { ...x, note: String(note || '').slice(0, MAX_NOTE), editedAt: Number(now) || 0 } : x)) };
}

/** Plain-text export: reference, Hebrew, English, the note. */
export function toText(rec) {
  return items(rec).map((x) => [`${x.en} ${x.chapter}:${x.verse}`, x.he, x.english, x.note ? `Note: ${x.note}` : ''].filter(Boolean).join('\n')).join('\n\n') + '\n';
}
/** JSON export (the notebook as stored). */
export const toJson = (rec) => JSON.stringify({ schema: 'alef-verse-notebook/1', items: items(rec) }, null, 1) + '\n';

export const read = (ctx) => { try { return ctx?.store?.get?.(NOTEBOOK_KEY) || null; } catch { return null; } };
export const write = (ctx, rec) => { try { ctx?.store?.set?.(NOTEBOOK_KEY, rec); return true; } catch { return false; } };
