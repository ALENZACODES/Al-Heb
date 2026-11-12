// @ts-check
// Offline packs (lane 4, 12 Nov; points plan #18): core lessons, core prayers and the learner's due reviews, each a list of
// files from data/offline/packs.json (built from the code by tools/offline-packs.mjs, sizes measured on disk). Pure helpers.
import { parseMemCardId } from '../letters/memory.core.js';

export const PACKS_URL = 'data/offline/packs.json';
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/** Cards due at `now` across the lesson and vocabulary decks. */
export function dueCards(store, now = Date.now()) {
  const out = [];
  for (const key of ['srs.cards', 'srs.vocab']) {
    let v; try { v = store?.get?.(key); } catch { v = null; }
    const list = Array.isArray(v) ? v : isObj(v) ? Object.entries(v).map(([id, c]) => ({ ...c, id: c?.id ?? id })) : [];
    for (const c of list) if (isObj(c) && typeof c.due === 'number' && c.due <= now) out.push(c);
  }
  return out;
}

/**
 * The files of one pack for this learner, with sizes. The due-review pack adds the letter pictures of the memory cards
 * that are due now.
 * @param {any} packs parsed packs.json @param {string} id @param {{store?:any, now?:number}} [o]
 * @returns {{id:string, label:string, blurb:string, urls:string[], bytes:number, due?:number}|null}
 */
export function packFiles(packs, id, o = {}) {
  const p = (packs?.packs || []).find((x) => x.id === id);
  if (!p) return null;
  const rows = [...p.files];
  let due;
  if (id === 'due-review') {
    const cards = dueCards(o.store, o.now);
    due = cards.length;
    const letters = new Set(cards.map((c) => parseMemCardId(c.id)?.letterId).filter(Boolean));
    for (const l of letters) if (packs.letterPictures?.[l]) rows.push(packs.letterPictures[l]);
  }
  const seen = new Set(), urls = []; let bytes = 0;
  for (const [u, n] of rows) { if (seen.has(u)) continue; seen.add(u); urls.push(u); bytes += n; }
  return { id: p.id, label: p.label, blurb: p.blurb, urls, bytes, ...(due !== undefined ? { due } : {}) };
}

/** "1.2 MB" / "140 KB". */
export const size = (n) => (n < 1024 ? `${n} bytes` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`);

/** One honest line about a pack's size and what is already saved. `missing` = urls not in any Aleph cache. */
export function sizeLine(pack, missing, sizes) {
  const need = missing.reduce((s, u) => s + (sizes.get(u) || 0), 0);
  if (!missing.length) return `${pack.urls.length} files, ${size(pack.bytes)} in all. All saved on this device.`;
  return `${pack.urls.length} files, ${size(pack.bytes)} in all. ${missing.length} of them (${size(need)}) are not on this device yet.`;
}
