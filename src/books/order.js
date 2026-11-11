// @ts-check
/* Shelf order for the little books (S-07). The stored ids (book1..book63) are kept as they are: saved reading places
   (books.v1, books.finished.v1) are keyed by them. The learner, a teacher or a reviewer counts books in shelf order
   instead, so every book also has a shelf number, and #/book/1 opens the first book on the shelf (Kafeh Kodem),
   #/book/6 the sixth, and so on. Pure: no DOM, no fetch. */

/** Shelf groups, in the order the shelf shows them. */
export const LEVEL_ORDER = Object.freeze(["Beginner 1", "Beginner 2", "Beginner 3", "Advanced", "Grade 1"]);

const levelRank = (lvl) => { const i = LEVEL_ORDER.indexOf(lvl); return i < 0 ? 99 : i; };

/** Books in shelf order: by level group, then as listed in index.json within a level. @param {any[]} books */
export function shelfOrder(books) {
  const list = Array.isArray(books) ? books.filter((b) => b && typeof b.id === "string") : [];
  return list.map((b, i) => ({ b, i })).sort((x, y) => levelRank(x.b.level) - levelRank(y.b.level) || x.i - y.i).map((x) => x.b);
}

/** 1-based shelf number of a stored id (0 when not on the shelf). */
export function shelfNumber(id, books) {
  return shelfOrder(books).findIndex((b) => b.id === id) + 1;
}

/** Stored id for a route id: "6" (shelf number) -> its stored id; a stored id ("book6") is returned as it is. */
export function resolveBookId(id, books) {
  const s = String(id ?? "").trim();
  if (/^\d{1,3}$/.test(s)) {
    const b = shelfOrder(books)[Number(s) - 1];
    return b ? b.id : "";
  }
  return s;
}

/** The book after `id` on the shelf, or null. */
export function nextOnShelf(id, books) {
  const order = shelfOrder(books);
  const i = order.findIndex((b) => b.id === id);
  return i >= 0 ? order[i + 1] || null : null;
}
