// Lazy JSON loader for the Grammar notes (browser via fetch, Node via file: URLs). Same pattern as src/sprint/loader.js.
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
/** @returns {Promise<{words:any[], registry:any[], notes:any}>} everything the grammar topics are built from */
export async function loadGrammarData() {
  const [w, r, notes] = await Promise.all([loadJson('data/vocab/words.json'), loadJson('data/corpus/registry.json'), loadJson('data/grammar/notes.json')]);
  return { words: w.words || [], registry: r.entries || [], notes };
}
