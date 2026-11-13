// @ts-check
// My Prayer Book (#/my-prayer-book, idea N4): pure logic, no DOM. The learner picks prayers they have learned, puts them in their
// own order and prints the result with their progress marks.
// Every Hebrew line comes from data/corpus/registry.json by id; the list of prayers is the three service orders' own items
// (data/service/orders.json). Nothing here writes liturgy and no published prayer book's text, layout or page numbers are used.
// "Learned" is the learner's own record from Prayer Practice and the Shabbat Companion (the fluency ladder). Aleph does not listen
// or grade, so the marks printed in the book are self-reported, and the page says so. The four-letter Name is shown as ה׳.
import { showName } from '../games/tg-core.js';
import { linesOf, translit } from './companion.model.js';
import { ladderOf, lineKey, LADDER } from './practice.model.js';

export const MYBOOK_KEY = 'service.mybook.v1';
export const MAX_TITLE = 60;
export const DEFAULT_TITLE = 'My Prayer Book';
export const MARKS_NOTE = 'The marks are your own. Aleph does not listen to you or grade your reading.';
export const SOURCE_NOTE = 'The prayers are the ones Aleph holds for its three service outlines. This is a personal practice book, not a published siddur; follow your congregation’s own prayer book in the room.';
export const SERVICE_NAMES = Object.freeze({ 'friday-night': 'Friday Night', 'shabbat-morning': 'Shabbat Morning', 'weekday-morning': 'Weekday Morning' });
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/** The saved book, cleaned: { v, title, ids: [entry id], showTranslit, showEnglish, showMarks }. */
export function normaliseBook(raw) {
  const r = obj(raw);
  const ids = [...new Set((Array.isArray(r.ids) ? r.ids : []).filter((x) => typeof x === 'string' && /^[\w.-]{1,80}$/.test(x)))].slice(0, 200);
  const title = typeof r.title === 'string' && r.title.trim() ? r.title.trim().slice(0, MAX_TITLE) : DEFAULT_TITLE;
  return { v: 1, title, ids, showTranslit: r.showTranslit !== false, showEnglish: r.showEnglish !== false, showMarks: r.showMarks !== false };
}

/**
 * Every prayer the service orders hold, once each, in service order (Friday night, Shabbat morning, weekday morning):
 * [{ id, title, services: [order id], moment, lineKeys, orderId (the first service it is in) }]. Unknown ids are skipped.
 */
export function catalogue(orders, byId, orderIds = Object.keys(SERVICE_NAMES)) {
  const out = new Map();
  for (const oid of orderIds) for (const it of orders?.orders?.[oid]?.items || []) {
    const e = byId.get(it.id);
    if (!e) continue;
    const have = out.get(it.id);
    if (have) { have.services.push(oid); continue; }
    const n = linesOf(e).length;
    out.set(it.id, { id: it.id, title: e.title || it.id, services: [oid], moment: it.moment || '', orderId: oid, lineKeys: Array.from({ length: n }, (_, i) => lineKey(it.id, i + 1, n)) });
  }
  return [...out.values()];
}

/** A prayer's progress from the learner's own record: { done, of, stages: [{ id, label, done }], learned }. learned = at least one step marked. */
export function progressOf(item, practiceRec, followed) {
  const l = ladderOf(practiceRec, item.id, followed, item.lineKeys, item.orderId);
  return { done: l.done, of: l.of, stages: l.stages.map((s) => ({ id: s.id, label: s.label, done: s.done })), learned: l.done > 0 };
}
/** 'Hear It ✓ · Follow It ✓ · Read It with Vowels ○ · …' for the printed book; the words carry the meaning, not the symbols. */
export const marksText = (p) => `${p.done} of ${p.of} steps: ` + p.stages.map((s) => `${s.label} ${s.done ? 'done' : 'not yet'}`).join(', ');

/** The prayers offered for picking: learned ones, or every prayer when `all`. Each with its progress and whether it is in the book. */
export function choices(cat, book, practiceRec, followed, all = false) {
  const inBook = new Set(book.ids);
  return cat.map((c) => ({ ...c, progress: progressOf(c, practiceRec, followed), picked: inBook.has(c.id) })).filter((c) => all || c.progress.learned || c.picked);
}

export const add = (book, id) => (book.ids.includes(id) ? book : { ...book, ids: [...book.ids, id] });
export const remove = (book, id) => ({ ...book, ids: book.ids.filter((x) => x !== id) });
/** Move a prayer one place earlier (dir -1) or later (dir 1). The ends stay put. */
export function move(book, id, dir) {
  const i = book.ids.indexOf(id), j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= book.ids.length) return book;
  const ids = book.ids.slice(); [ids[i], ids[j]] = [ids[j], ids[i]];
  return { ...book, ids };
}
export const setTitle = (book, title) => normaliseBook({ ...book, title });
export const setOption = (book, key, on) => (['showTranslit', 'showEnglish', 'showMarks'].includes(key) ? { ...book, [key]: !!on } : book);

/**
 * The book's pages, in the learner's order: [{ id, title, n, lines: [{ he, translit, english }], englishWhole, progress }].
 * English sits beside each line when the registry has one English line per Hebrew line; otherwise the whole English is given once.
 * Ids no longer in the catalogue are left out (and reported by missingIds).
 */
export function pages(book, cat, byId, practiceRec, followed, tradition = 'israeli') {
  const byCat = new Map(cat.map((c) => [c.id, c]));
  return book.ids.filter((id) => byCat.has(id) && byId.has(id)).map((id, n) => {
    const e = byId.get(id), c = byCat.get(id);
    const he = linesOf(e), en = String(e.english ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
    const perLine = en.length === he.length;
    return {
      id, n: n + 1, title: c.title,
      lines: he.map((line, i) => ({ he: showName(line), translit: safeTranslit(line, tradition), english: perLine ? en[i] : '' })),
      englishWhole: perLine ? '' : en.join(' '),
      progress: progressOf(c, practiceRec, followed),
    };
  });
}
function safeTranslit(line, tradition) { try { return translit(line, tradition) || ''; } catch { return ''; } }
export const missingIds = (book, cat) => { const have = new Set(cat.map((c) => c.id)); return book.ids.filter((id) => !have.has(id)); };
export { LADDER };
