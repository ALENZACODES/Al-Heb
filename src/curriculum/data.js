/**
 * JSON loader that works in browsers (fetch) and in Node tests (fs), replacing `import ... with { type: "json" }`
 * (import attributes need Chromium >= 123 / Safari >= 17.2 / Firefox >= 138).
 * Paths are relative to the repository / site root, e.g. loadJSON("data/curriculum/lessons.json").
 * Results are cached per path.
 */
const cache = new Map();

export function loadJSON(rel) {
  if (cache.has(rel)) return cache.get(rel);
  const url = new URL("../../" + rel, import.meta.url);
  const p = (async () => {
    if (url.protocol === "file:") {
      const [{ readFile }, { fileURLToPath }] = await Promise.all([import("node:fs/promises"), import("node:url")]);
      return JSON.parse(await readFile(fileURLToPath(url), "utf8"));
    }
    const r = await fetch(url);
    if (!r.ok) throw new Error(`could not load ${rel}: HTTP ${r.status}`);
    return r.json();
  })();
  p.catch(() => cache.delete(rel)); // do not cache failures
  cache.set(rel, p);
  return p;
}
