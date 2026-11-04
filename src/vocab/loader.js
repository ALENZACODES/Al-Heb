// Lazy per-tier loader for the 5,000-word list. Tier packs live in data/vocab/packs/ (not precached; sw.js caches them at runtime).
export const TIER_BANDS = [500, 1000, 2000, 5000];
export const packRel = (tier) => `data/vocab/packs/vocab5k-tier-${tier}.json`;
const cache = new Map();

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
    return pack.entries;
  })();
  p.catch(() => cache.delete(tier));
  cache.set(tier, p);
  return p;
}
