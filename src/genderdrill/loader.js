// Lazy JSON loader for the gender drill data (browser fetch or Node file: URL).
const cache = new Map();
function loadJson(rel) {
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
export const loadTemplates = () => loadJson("data/gender/templates.json");
export const loadParadigms = () => loadJson("data/curriculum/gender-pairs.json").then((d) => d.paradigms || []);
