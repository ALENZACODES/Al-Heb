// Lazy JSON loader for the Torah reader (browsers via fetch, Node via file: URLs). Same pattern as src/sprint/loader.js.
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
export const READER_FILES = { 'priestly-blessing': 'data/corpus/reader/priestly-blessing.json', shema: 'data/corpus/reader/shema.json' };
export const TROPE_FILES = { 'priestly-blessing': 'data/corpus/trope/priestly-blessing.json', shema: 'data/corpus/trope/shema.json' };
export const TABLE_FILE = 'data/corpus/trope/table.json';
/** { passages: {id: reader}, tropes: [trope passage], table } */
export async function loadAll(load = loadJson) {
  const ids = Object.keys(READER_FILES);
  const [readers, tropes, table] = await Promise.all([
    Promise.all(ids.map((i) => load(READER_FILES[i]))),
    Promise.all(ids.map((i) => load(TROPE_FILES[i]))),
    load(TABLE_FILE),
  ]);
  return { passages: Object.fromEntries(ids.map((i, k) => [i, readers[k]])), tropes, table };
}
