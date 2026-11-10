// Lazy JSON loader for onboarding (browser fetch or Node file: URL). Same pattern as src/firstday/loader.js.
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
export const loadPlans = () => loadJson('data/onboarding/plans.json');
/** Lesson list for the plan (ids, tracks, titles, minutes, prerequisites). The slim index (about 17 KB) keeps the first screen light;
 *  the full lesson file (about 460 KB) is the fallback if the index cannot be read. */
export const loadLessons = () => loadJson('data/curriculum/lessons.index.json').then((d) => { if (!Array.isArray(d?.lessons) || !d.lessons.length) throw new Error('empty lesson index'); return d.lessons; })
  .catch(() => loadJson('data/curriculum/lessons.json').then((d) => d.lessons));
/** @returns {Promise<{plans:any, lessons:any[]}>} */
export async function loadOnboardingData() {
  const [plans, lessons] = await Promise.all([loadPlans(), loadLessons()]);
  return { plans, lessons };
}
