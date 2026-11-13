// @ts-check
// My Collection (S1-S4, S8, S9): the learner's own shelf. Anything saved from anywhere in the app lands here, in folders the
// learner names, with a heart for the quick save, notes and the learner's own translation on words, saved searches, and a
// file to hand a folder to another device. Everything stays on this device; nothing is sent anywhere.
// Pure: every function takes the stored record and returns a new one. The store helpers at the bottom never throw.
import { newCard } from '../curriculum/srs.js';
import { isNameWord } from '../shell/names.js';

export const KEY = 'collection.v1';
export const CARDS_KEY = 'collection.cards';       // review cards for folders turned into decks (same card shape as every other deck)
export const SEARCHES_KEY = 'collection.searches.v1';
export const FILE_SCHEMA = 'alef-collection/1';
export const MAX = Object.freeze({ items: 2000, folders: 60, name: 40, title: 160, text: 400, note: 2000, fileItems: 500, searches: 30, seen: 300 });
export const KINDS = Object.freeze({ word: 'Word', line: 'Line', prayer: 'Prayer', verse: 'Verse', song: 'Song', game: 'Game', book: 'Book', page: 'Page' });

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const str = (v, max) => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);
/** Only links inside the app are kept ("#/..."): a saved or imported item can never carry an outside or script link. */
export const safeHref = (v) => (typeof v === 'string' && /^#\/[^\s"'<>]*$/.test(v) ? v.slice(0, 300) : '');
const slug = (s) => str(s, 80).toLowerCase().replace(/[^a-z0-9א-ת]+/g, '-').replace(/^-|-$/g, '');

function cleanItem(x) {
  const o = obj(x); const kind = KINDS[o.kind] ? o.kind : 'page';
  const title = str(o.title, MAX.title); const id = str(o.id, 200);
  if (!id || !title) return null;
  return { id, kind, title, he: str(o.he, MAX.text), en: str(o.en, MAX.text), translit: str(o.translit, MAX.text), href: safeHref(o.href), note: str(o.note, MAX.note), mine: str(o.mine, MAX.text),
    folder: typeof o.folder === 'string' && o.folder ? o.folder : null, fav: o.fav === true, savedAt: Number(o.savedAt) || 0, editedAt: Number(o.editedAt) || 0 };
}
/** The stored record made safe to use: {version, folders:[{id,name,deck,createdAt}], items:[...]}, items newest first. */
export function clean(rec) {
  const o = obj(rec);
  const folders = []; const seen = new Set();
  for (const f of Array.isArray(o.folders) ? o.folders : []) {
    const id = str(obj(f).id, 60), name = str(obj(f).name, MAX.name);
    if (!id || !name || seen.has(id) || folders.length >= MAX.folders) continue;
    seen.add(id); folders.push({ id, name, deck: obj(f).deck === true, createdAt: Number(obj(f).createdAt) || 0 });
  }
  const items = []; const ids = new Set();
  for (const x of Array.isArray(o.items) ? o.items : []) {
    const it = cleanItem(x);
    if (!it || ids.has(it.id) || items.length >= MAX.items) continue;
    if (it.folder && !seen.has(it.folder)) it.folder = null;
    ids.add(it.id); items.push(it);
  }
  items.sort((a, b) => b.savedAt - a.savedAt);
  return { version: 1, folders, items };
}

/** Id for a saved thing: the kind plus what identifies it (a link inside the app, or the Hebrew itself for a word or line). */
export function itemId(x) { const o = obj(x); return `${KINDS[o.kind] ? o.kind : 'page'}:${safeHref(o.href) || slug(o.he || o.title)}`; }

// ---------------------------------------------------------------- folders
export function addFolder(rec, name, now = Date.now()) {
  const c = clean(rec); const nm = str(name, MAX.name);
  if (!nm) return { rec: c, id: null, error: 'Give the folder a name.' };
  const same = c.folders.find((f) => f.name.toLowerCase() === nm.toLowerCase());
  if (same) return { rec: c, id: same.id, error: null };
  if (c.folders.length >= MAX.folders) return { rec: c, id: null, error: `A collection holds up to ${MAX.folders} folders.` };
  let id = slug(nm) || 'folder'; for (let n = 2; c.folders.some((f) => f.id === id); n++) id = `${slug(nm) || 'folder'}-${n}`;
  return { rec: { ...c, folders: [...c.folders, { id, name: nm, deck: false, createdAt: Number(now) || 0 }] }, id, error: null };
}
export function renameFolder(rec, id, name) {
  const c = clean(rec); const nm = str(name, MAX.name);
  if (!nm || c.folders.some((f) => f.id !== id && f.name.toLowerCase() === nm.toLowerCase())) return c;
  return { ...c, folders: c.folders.map((f) => (f.id === id ? { ...f, name: nm } : f)) };
}
/** Removing a folder never removes what was in it: its items go back to "Not in a folder". */
export function removeFolder(rec, id) {
  const c = clean(rec);
  return { ...c, folders: c.folders.filter((f) => f.id !== id), items: c.items.map((x) => (x.folder === id ? { ...x, folder: null } : x)) };
}
export const setDeck = (rec, id, on) => { const c = clean(rec); return { ...c, folders: c.folders.map((f) => (f.id === id ? { ...f, deck: !!on } : f)) }; };

// ---------------------------------------------------------------- items
/**
 * Save something (or save it again: the note, own translation, folder and heart already on it are kept unless given).
 * @param {any} rec @param {{kind?:string,title:string,he?:string,en?:string,translit?:string,href?:string,folder?:string|null,fav?:boolean,note?:string,mine?:string}} x
 */
export function saveItem(rec, x, now = Date.now()) {
  const c = clean(rec); const id = itemId(x); const was = c.items.find((i) => i.id === id);
  if (!was && c.items.length >= MAX.items) return { rec: c, id: null, error: `A collection holds up to ${MAX.items} items. Remove some to save more.` };
  const it = cleanItem({ ...was, ...Object.fromEntries(Object.entries(obj(x)).filter(([, v]) => v !== undefined && v !== '')), id, savedAt: was?.savedAt || Number(now) || 0, editedAt: was ? Number(now) || 0 : 0 });
  if (!it) return { rec: c, id: null, error: 'There is nothing here to save.' };
  if (it.folder && !c.folders.some((f) => f.id === it.folder)) it.folder = null;
  return { rec: { ...c, items: [it, ...c.items.filter((i) => i.id !== id)].sort((a, b) => b.savedAt - a.savedAt) }, id, error: null };
}
export const removeItem = (rec, id) => { const c = clean(rec); return { ...c, items: c.items.filter((i) => i.id !== id) }; };
const patch = (rec, id, p, now) => { const c = clean(rec); return { ...c, items: c.items.map((i) => (i.id === id ? cleanItem({ ...i, ...p, editedAt: Number(now) || i.editedAt }) : i)) }; };
export const moveItem = (rec, id, folder) => { const c = clean(rec); return patch(c, id, { folder: folder && c.folders.some((f) => f.id === folder) ? folder : null }); };
export const setNote = (rec, id, note, now = Date.now()) => patch(rec, id, { note: str(note, MAX.note) }, now);
export const setMine = (rec, id, mine, now = Date.now()) => patch(rec, id, { mine: str(mine, MAX.text) }, now);
export const has = (rec, x) => clean(rec).items.some((i) => i.id === itemId(x));
export const isFav = (rec, x) => clean(rec).items.some((i) => i.id === itemId(x) && i.fav);

/**
 * S3 the heart: one tap saves the thing as a favorite; a second tap takes the heart off. Taking the heart off removes the
 * item only if the learner never did anything else with it (no folder, no note, no translation of their own).
 */
export function toggleFav(rec, x, now = Date.now()) {
  const c = clean(rec); const id = itemId(x); const was = c.items.find((i) => i.id === id);
  if (!was) { const r = saveItem(c, { ...x, fav: true }, now); return { rec: r.rec, fav: !r.error, error: r.error }; }
  if (was.fav && !was.folder && !was.note && !was.mine) return { rec: removeItem(c, id), fav: false, error: null };
  return { rec: patch(c, id, { fav: !was.fav }, now), fav: !was.fav, error: null };
}

/** Items of one shelf: 'all', 'favorites', 'none' (not in a folder), 'words' (the personal dictionary), or a folder id. Optional search text. */
export function itemsIn(rec, shelf = 'all', q = '') {
  const c = clean(rec); const needle = str(q, 80).toLowerCase();
  return c.items.filter((i) => (shelf === 'all' ? true : shelf === 'favorites' ? i.fav : shelf === 'none' ? !i.folder : shelf === 'words' ? i.kind === 'word' : i.folder === shelf))
    .filter((i) => !needle || [i.title, i.he, i.en, i.translit, i.note, i.mine].some((s) => s.toLowerCase().includes(needle)));
}
export function counts(rec) {
  const c = clean(rec);
  return { all: c.items.length, favorites: c.items.filter((i) => i.fav).length, none: c.items.filter((i) => !i.folder).length, words: c.items.filter((i) => i.kind === 'word').length,
    folders: Object.fromEntries(c.folders.map((f) => [f.id, c.items.filter((i) => i.folder === f.id).length])) };
}

// ---------------------------------------------------------------- S4 personal dictionary: export
const cell = (v) => { let s = v == null ? '' : String(v); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
/** The learner's words as a spreadsheet file: Hebrew, how it sounds, the app's meaning, the learner's own translation and note. */
export function wordsCSV(rec) {
  const rows = [['hebrew', 'sounds_like', 'meaning', 'my_translation', 'my_note', 'saved']];
  for (const i of itemsIn(rec, 'words')) rows.push([i.he || i.title, i.translit, i.en, i.mine, i.note, i.savedAt ? new Date(i.savedAt).toISOString().slice(0, 10) : '']);
  return rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
export function wordsText(rec) {
  return itemsIn(rec, 'words').map((i) => [`${i.he || i.title}${i.translit ? ` (${i.translit})` : ''}${i.en ? `: ${i.en}` : ''}`, i.mine ? `My translation: ${i.mine}` : '', i.note ? `Note: ${i.note}` : ''].filter(Boolean).join('\n')).join('\n\n') + '\n';
}
/**
 * Find dictionary words for the "add a word" box. rows: data/vocab/index.json rows; fields: its field names.
 * Hebrew input matches the unpointed spelling from its start; English matches whole words of the meaning first, then any part.
 * The Name is never offered as a word to save or drill.
 */
export function lookupWords(index, q, limit = 8) {
  const fields = Array.isArray(obj(index).fields) ? index.fields : []; const rows = Array.isArray(obj(index).rows) ? index.rows : [];
  const at = (n) => fields.indexOf(n); const [iHe, iPlain, iEn, iTr] = [at('he'), at('heUnpointed'), at('en'), at('translit')];
  const needle = str(q, 60).toLowerCase().replace(/[֑-ׇ]/g, '');
  if (!needle || iHe < 0) return [];
  const hebrew = /[א-ת]/.test(needle); const out = [[], [], []];
  for (const r of rows) {
    const plain = String(r[iPlain] ?? '').toLowerCase(); const en = String(r[iEn] ?? '').toLowerCase(); const tr = String(r[iTr] ?? '').toLowerCase();
    let rank = -1;
    if (hebrew) rank = plain === needle ? 0 : plain.startsWith(needle) ? 1 : -1;
    else rank = (` ${en.replace(/[^a-z0-9' ]+/g, ' ')} `).includes(` ${needle} `) || tr === needle ? 0 : en.startsWith(needle) || tr.startsWith(needle) ? 1 : needle.length >= 3 && en.includes(needle) ? 2 : -1;
    if (rank >= 0 && !isNameWord(String(r[iHe]))) out[rank].push({ kind: 'word', title: String(r[iHe]), he: String(r[iHe]), en: String(r[iEn] ?? ''), translit: String(r[iTr] ?? '') });
  }
  return out.flat().slice(0, limit);
}

// ---------------------------------------------------------------- S2 custom decks
/** An item can be a review card when it has Hebrew on one side and a meaning (the app's or the learner's own) on the other. */
export const reviewable = (i) => !!(i && i.he && (i.mine || i.en));
export const cardId = (itemIdValue) => `col:${itemIdValue}`;
/**
 * Bring the card store in step with the folders marked as decks: a new card for every reviewable item in a deck folder, and
 * cards of items that left every deck dropped. Cards already there keep their history.
 * @returns {{cards: Record<string, any>, added: number, removed: number}}
 */
export function syncDeckCards(rec, cards, now = Date.now()) {
  const c = clean(rec); const decks = new Set(c.folders.filter((f) => f.deck).map((f) => f.id));
  const want = new Map(c.items.filter((i) => i.folder && decks.has(i.folder) && reviewable(i)).map((i) => [cardId(i.id), i]));
  const out = {}; let added = 0, removed = 0;
  for (const [id, card] of Object.entries(obj(cards))) { if (want.has(id) && card && typeof card === 'object') out[id] = card; else removed++; }
  for (const id of want.keys()) if (!out[id]) { out[id] = newCard({ id, kind: 'collection', now }); added++; }
  return { cards: out, added, removed };
}
/** The cards of one deck folder that are due now, most overdue first, each with its item. */
export function dueInFolder(rec, cards, folder, now = Date.now()) {
  const c = clean(rec);
  return c.items.filter((i) => i.folder === folder && reviewable(i)).map((i) => ({ item: i, card: obj(cards)[cardId(i.id)] })).filter((x) => x.card && Number(x.card.due) <= now)
    .sort((a, b) => a.card.due - b.card.due || a.item.id.localeCompare(b.item.id));
}
export function deckSummary(rec, cards, folder, now = Date.now()) {
  const c = clean(rec); const list = c.items.filter((i) => i.folder === folder);
  const usable = list.filter(reviewable); const have = usable.map((i) => obj(cards)[cardId(i.id)]).filter(Boolean);
  return { items: list.length, cards: usable.length, skipped: list.length - usable.length, due: have.filter((k) => Number(k.due) <= now).length, fresh: have.filter((k) => k.state === 'new').length };
}

// ---------------------------------------------------------------- S9 sharing a folder as a file
/** One folder as a file to hand to someone else. Notes and own translations go along; hearts and review history do not. */
export function exportFolder(rec, folder, now = Date.now()) {
  const c = clean(rec); const f = c.folders.find((x) => x.id === folder);
  if (!f) return null;
  const items = c.items.filter((i) => i.folder === folder).slice(0, MAX.fileItems).map(({ kind, title, he, en, translit, href, note, mine }) => ({ kind, title, he, en, translit, href, note, mine }));
  return { schema: FILE_SCHEMA, folder: f.name, exportedAt: new Date(Number(now) || 0).toISOString(), items };
}
export const fileName = (name) => `aleph-collection-${slug(name).replace(/[^a-z0-9-]/g, '') || 'folder'}.json`;
/**
 * Take a folder file in. Items go into a folder with the file's name (made if needed). Anything already saved is kept as it is,
 * with its own note. Text is trimmed to the usual limits and only links inside the app are kept.
 * @returns {{rec:any, added:number, kept:number, skipped:number, folder:string|null, error:string|null}}
 */
export function importFolder(rec, file, now = Date.now()) {
  const c = clean(rec); const o = obj(file); const fail = (error) => ({ rec: c, added: 0, kept: 0, skipped: 0, folder: null, error });
  if (o.schema !== FILE_SCHEMA || !Array.isArray(o.items)) return fail('This is not an Aleph collection file.');
  if (o.items.length > MAX.fileItems) return fail(`This file holds more than ${MAX.fileItems} items.`);
  const made = addFolder(c, str(o.folder, MAX.name) || 'Shared with me', now);
  if (!made.id) return fail(made.error || 'The folder could not be made.');
  let cur = made.rec, added = 0, kept = 0, skipped = 0;
  o.items.forEach((x, n) => {
    const it = cleanItem({ ...obj(x), id: 'x', folder: null, fav: false });
    if (!it) { skipped++; return; }
    if (has(cur, it)) { kept++; return; }
    const r = saveItem(cur, { kind: it.kind, title: it.title, he: it.he, en: it.en, translit: it.translit, href: it.href, note: it.note, mine: it.mine, folder: made.id }, (Number(now) || 0) - n);
    if (r.error) skipped++; else { cur = r.rec; added++; }
  });
  return { rec: cur, added, kept, skipped, folder: made.id, error: null };
}

// ---------------------------------------------------------------- S8 saved searches
export function cleanSearches(v) {
  const out = []; const seen = new Set();
  for (const s of Array.isArray(v) ? v : []) {
    const q = str(obj(s).q, 80); const k = q.toLowerCase();
    if (!q || seen.has(k) || out.length >= MAX.searches) continue;
    seen.add(k); out.push({ q, savedAt: Number(obj(s).savedAt) || 0, seen: (Array.isArray(obj(s).seen) ? obj(s).seen : []).filter((h) => typeof h === 'string').slice(0, MAX.seen) });
  }
  return out;
}
/** Save a search with what it finds today; those results are "seen", so only later additions count as new. */
export function saveSearch(list, q, hrefs, now = Date.now()) {
  const c = cleanSearches(list); const query = str(q, 80);
  if (!query) return c;
  return cleanSearches([{ q: query, savedAt: Number(now) || 0, seen: [...new Set(hrefs)].slice(0, MAX.seen) }, ...c.filter((s) => s.q.toLowerCase() !== query.toLowerCase())]);
}
export const removeSearch = (list, q) => cleanSearches(list).filter((s) => s.q.toLowerCase() !== str(q, 80).toLowerCase());
/** Results not seen when the search was saved or last opened. rows: [{href, label, desc}] */
export const newMatches = (saved, rows) => { const seen = new Set(obj(saved).seen || []); return (rows || []).filter((r) => r && r.href && !seen.has(r.href)); };
export const markSeen = (list, q, hrefs) => cleanSearches(list).map((s) => (s.q.toLowerCase() === str(q, 80).toLowerCase() ? { ...s, seen: [...new Set([...hrefs, ...s.seen])].slice(0, MAX.seen) } : s));
/** Flatten the grouped results of the app's search (src/platform/search-more.js searchAll) into rows with their group name. */
export const flatResults = (groups) => (groups || []).flatMap(([group, rows]) => (rows || []).filter((r) => r && r.href).map((r) => ({ group, href: r.href, label: String(r.label ?? ''), desc: String(r.desc ?? '') })));

// ---------------------------------------------------------------- store helpers (sync or async stores; never throw)
export async function read(store, key = KEY, fallback = null) { try { const v = await store?.get?.(key, fallback); return v == null ? fallback : v; } catch { return fallback; } }
export async function write(store, key, value) { try { await store?.set?.(key, value); return true; } catch { return false; } }
