// Lazy JSON loader for First 10 minutes (browser fetch or Node file: URL). Same pattern as src/sprint/loader.js.
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
export const loadFirst10 = () => loadJson('data/firstday/first10.json');
export const loadLadder = () => loadJson('data/firstday/ladder.json');
export const loadOnramp = () => loadJson('data/firstday/onramp.json');
