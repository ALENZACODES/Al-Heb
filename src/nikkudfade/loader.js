// Lazy JSON loader (browser fetch or Node file: URL) for the nikkud-fade data files.
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
export const loadReadingSet = () => loadJson('data/nikkudfade/reading-set.json');
export const loadSchedule = () => loadJson('data/nikkudfade/schedule.json');
export const loadHomographs = () => loadJson('data/nikkudfade/homographs.json');
