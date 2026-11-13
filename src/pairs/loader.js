// Lazy JSON loader for the confusing-pairs list (browser fetch or Node file: URL).
let cached = null;
export function loadPairs() {
  if (cached) return cached;
  const url = new URL('../../data/vocab/confusables.json', import.meta.url);
  cached = (async () => {
    if (url.protocol === 'file:') {
      const [{ readFile }, { fileURLToPath }] = await Promise.all([import('node:fs/promises'), import('node:url')]);
      return JSON.parse(await readFile(fileURLToPath(url), 'utf8'));
    }
    const r = await fetch(url);
    if (!r.ok) throw new Error(`could not load the pairs list: HTTP ${r.status}`);
    return r.json();
  })();
  cached.catch(() => { cached = null; });
  return cached;
}
