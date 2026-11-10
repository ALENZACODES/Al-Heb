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
export const TORAH_INDEX_FILE = 'data/corpus/torah/index.json';
export const TORAH_MANIFEST_FILE = 'data/audio/manifest-torah.json';
import { TORAH_HE_INDEX_URL, expandTorahHebrew } from '../shell/torah-he-index.js';
export const torahChapterFile = (book, chapter) => `data/corpus/torah/${book}/${String(chapter).padStart(2, '0')}.json`;
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

/** The full-Torah grid (data/corpus/torah/index.json). */
export const loadTorahIndex = (load = loadJson) => load(TORAH_INDEX_FILE);
/** One built chapter file of the full Torah. */
export const loadTorahChapter = (book, chapter, load = loadJson) => load(torahChapterFile(book, chapter));
/** The Torah audio manifest; an absent or unreadable shard means "no Torah clips yet", never an error. */
export async function loadTorahManifest(load = loadJson) {
  const [m, he] = await Promise.all([
    load(TORAH_MANIFEST_FILE).then((x) => (Array.isArray(x) ? x : [])).catch(() => []),
    load(TORAH_HE_INDEX_URL).then(expandTorahHebrew).catch(() => []),
  ]);
  return [...m, ...he];
}
