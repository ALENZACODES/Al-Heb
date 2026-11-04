// Lazy JSON loader for Sprint (works in browsers via fetch and in Node via file: URLs). Same pattern as src/vocab/loader.js.
import { loadTier, TIER_BANDS } from '../vocab/loader.js';

const cache = new Map();
export function loadJson(rel) {
  if (cache.has(rel)) return cache.get(rel);
  const url = new URL('../../' + rel, import.meta.url);
  const p = (async () => {
    if (url.protocol === 'file:') {
      const [{ readFile }, { fileURLToPath }] = await Promise.all([import('node:fs/promises'), import('node:url')]);
      return JSON.parse(await readFile(fileURLToPath(url), 'utf8'));
    }
    const r = await fetch(url);
    if (!r.ok) throw new Error(`could not load ${rel}: HTTP ${r.status}`);
    return r.json();
  })();
  p.catch(() => cache.delete(rel));
  cache.set(rel, p);
  return p;
}

/** All 5,000 vocabulary entries (four tier packs), in rank order. */
export async function loadAllVocab(loadTierFn = loadTier) {
  const parts = await Promise.all(TIER_BANDS.map((t) => loadTierFn(t)));
  return parts.flat().sort((a, b) => a.rank - b.rank);
}
export const loadRegistry = async () => (await loadJson('data/corpus/registry.json')).entries || [];
export const loadScenarios = async () => (await loadJson('data/israel/scenarios.json')).scenarios || [];
