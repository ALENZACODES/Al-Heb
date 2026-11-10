// Lazy JSON loader for "Say it" (browsers via fetch, Node via file: URLs). Same pattern as src/sprint/loader.js.
// Runtime data is the small pre-built files in data/speak/ (built by src/speak/build.mjs from data/vocab/words.json and
// data/corpus/phrasebook.json); the 7 MB words.json is never fetched by the app.

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

export const SETS_INDEX = 'data/speak/sets.json';
export const PAIRS_FILE = 'data/speak/pairs.json';
export const setFile = (id) => `data/speak/sets/${id}.json`;

/** The set index: [{id, title, theme, level, pack, size}]. */
export const loadSetsIndex = async () => (await loadJson(SETS_INDEX)).sets || [];
/** One set: {id, title, theme, items:[{id, he, translit, en, kind, audioId}]}. */
export const loadSet = (id) => loadJson(setFile(id));
/** Minimal-pair drills: {contrasts:[{id, title, ...}], items:[...]}. */
export const loadPairs = () => loadJson(PAIRS_FILE);

export const PRAYERS_FILE = 'data/speak/prayers.json';
export const TRADITION_FILE = 'data/speak/minimal-pairs.json';
/** Read-aloud and shadowing texts: {prayers:[{id, title, lines[], lineAudio, ...}]}. */
export const loadPrayers = () => loadJson(PRAYERS_FILE);
/** The pronunciation lane's rule-generated pairs: {traditions, contrasts:[{id, title, heard, pairs:[{a, b, audible[]}]}]}. */
export const loadTraditionPairs = () => loadJson(TRADITION_FILE);
