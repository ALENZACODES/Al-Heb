// Dictionary words linked to their letter family and their verb forms (lane 3, 12 Nov, points plan #15a and #15d). Pure apart from
// loadLinks (data/roots/dict-links.json, built by tools/roots/build.mjs dictLinks from an exact spelling-and-part-of-speech match).
// No root here is confirmed by a Hebrew reader (data/roots/verified.json), so every line says "family letters", never "root".
import { loadDictLinks } from './loader.js';

/** @typedef {{letters:string|null, size:number, verb:string|null}} Link */
/** Map dictionary id -> Link from the dict-links.json rows ([id, letters, familySize, verbId]). */
export function indexLinks(json) {
  const m = new Map();
  for (const r of (json && Array.isArray(json.rows) ? json.rows : [])) if (Array.isArray(r) && r[0]) m.set(r[0], { letters: r[1] || null, size: Number(r[2]) || 0, verb: r[3] || null });
  return m;
}
let cached = null;
/** The link map, loaded once. @returns {Promise<Map<string, Link>>} */
export function loadLinks() {
  if (!cached) cached = loadDictLinks().then(indexLinks).catch((e) => { cached = null; throw e; });
  return cached;
}
/** The Roots page's family view for these letters, and its verb table for a verb. */
export const familyHref = (letters) => `#/roots?letters=${encodeURIComponent(letters)}`;
export const verbHref = (id) => `#/roots?verb=${encodeURIComponent(id)}`;
/** True when the link opens a family page (two or more words in the word list share the letters). */
export const hasFamily = (l) => !!(l && l.letters && l.size >= 2);
/** The sentence a Dictionary card shows next to its links. */
export function linkText(l) {
  if (!l || !l.letters) return '';
  return hasFamily(l)
    ? `Family letters ${l.letters}: ${l.size} words in the word list share them.`
    : `Family letters ${l.letters}: no other word in the word list is listed under them.`;
}

/**
 * Root-family review grouping (#15d): the due cards, reordered so cards whose words share family letters come together. Groups keep
 * the order of their first due card, and cards inside a group keep their due order, so nothing due is skipped or added.
 * @param {Array<{id:string}>} cards due cards, most due first @param {Map<string, Link>} links @param {(c:any)=>string} dictIdOf
 * @returns {{cards:any[], groupOf:Map<string,{letters:string, n:number, i:number}>}} groupOf: card id -> its family group in this order
 */
export function groupByFamily(cards, links, dictIdOf) {
  const groups = new Map();
  for (const c of cards) {
    const l = links?.get?.(dictIdOf(c));
    const key = hasFamily(l) ? 'f:' + l.letters : 'c:' + c.id;
    if (!groups.has(key)) groups.set(key, { letters: hasFamily(l) ? l.letters : null, cards: [] });
    groups.get(key).cards.push(c);
  }
  const out = [], groupOf = new Map();
  for (const g of groups.values()) {
    g.cards.forEach((c, i) => { out.push(c); if (g.letters && g.cards.length >= 2) groupOf.set(c.id, { letters: g.letters, n: g.cards.length, i: i + 1 }); });
  }
  return { cards: out, groupOf };
}
