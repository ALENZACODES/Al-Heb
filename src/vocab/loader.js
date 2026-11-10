// Lazy per-tier loader for the 5,000-word list. Tier packs live in data/vocab/packs/ (not precached; sw.js caches them at runtime).
export const TIER_BANDS = [500, 1000, 2000, 5000];
export const packRel = (tier) => `data/vocab/packs/vocab5k-tier-${tier}.json`;
const cache = new Map();

/**
 * True for a record the data marks as hidden from learners (flags.hidden === true, or 'hidden' in a flags array).
 * The sensitivity lane sets it on words whose gloss is withheld pending review; every vocab list built here drops them.
 */
export function isHiddenRecord(rec) {
  const f = rec && rec.flags;
  if (!f) return false;
  if (Array.isArray(f)) return f.includes('hidden');
  return typeof f === 'object' && f.hidden === true;
}
/** Records minus the hidden ones. */
export const visibleRecords = (list) => (Array.isArray(list) ? list.filter((r) => !isHiddenRecord(r)) : []);

/** Load one tier band (entries whose `tier` equals it). Works in browsers (fetch) and Node (file: URL). */
export function loadTier(tier) {
  if (!TIER_BANDS.includes(tier)) return Promise.reject(new RangeError('unknown tier ' + tier));
  if (cache.has(tier)) return cache.get(tier);
  const url = new URL('../../' + packRel(tier), import.meta.url);
  const p = (async () => {
    let pack;
    if (url.protocol === 'file:') {
      const [{ readFile }, { fileURLToPath }] = await Promise.all([import('node:fs/promises'), import('node:url')]);
      pack = JSON.parse(await readFile(fileURLToPath(url), 'utf8'));
    } else {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`could not load vocabulary tier ${tier}: HTTP ${r.status}`);
      pack = await r.json();
    }
    if (!pack || !Array.isArray(pack.entries)) throw new Error('vocabulary tier file has no entries');
    return visibleRecords(pack.entries);
  })();
  p.catch(() => cache.delete(tier));
  cache.set(tier, p);
  return p;
}
