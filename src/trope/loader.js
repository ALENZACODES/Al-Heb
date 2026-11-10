// Lazy JSON loader for the trope trainer (fetch in browsers, file: URLs in Node). Same pattern as src/sprint/loader.js.
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
export async function loadTropeData() {
  const [table, shema, blessing, levels] = await Promise.all([
    loadJson('data/corpus/trope/table.json'), loadJson('data/corpus/trope/shema.json'),
    loadJson('data/corpus/trope/priestly-blessing.json'), loadJson('data/trope-trainer/levels.json')]);
  return { table, passages: [shema, blessing], levels };
}
