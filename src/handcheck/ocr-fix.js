// @ts-check
// Tidying the text read from a photo, shared by the camera translator and the photo reader. Fetched on first use.
// The reader (tesseract) mixes up letters that look alike. A word that is not in the app's own word list and has exactly one
// close neighbour in it is replaced by that neighbour; everything else is left as read. The word list (about 55 KB) is built
// from the app's dictionary, sign list and phrasebook, lives on the site itself and is fetched the first time a photo is read.
// Nothing is sent anywhere. If anything here cannot load, the photo is simply read as before.
import { OCR_FIX, OCR_WORDS } from './tools.js';

let fixPromise = null;

/**
 * @param {{fetch?: typeof fetch, importer?: (u: string) => Promise<any>, words?: any}} [env] `words`: the loaded words pack, when the
 *   learner has it, for tie-breaks from the surrounding words and for leaving names alone. Without it both are skipped.
 * @returns {Promise<null | {correctLine: Function, correctBoxes: Function, showName: (s: string) => string, size: number}>}
 */
export function loadFix(env = {}) {
  if (fixPromise && !env.fetch && !env.importer) return fixPromise;
  const p = (async () => {
    const mod = await (env.importer || ((u) => import(u)))(OCR_FIX + 'index.js');
    return mod.load({ lexiconUrl: OCR_WORDS, fetch: env.fetch, words: env.words });
  })().catch(() => null);
  if (!env.fetch && !env.importer) fixPromise = p;
  return p;
}

/** Word boxes from the reader -> the same boxes tidied; on any failure the boxes come back untouched. */
export async function fixBoxes(boxes, env = {}) {
  const fix = await loadFix(env);
  if (!fix) return boxes;
  try { return await fix.correctBoxes(boxes); } catch { return boxes; }
}

/**
 * Camera translator step: lines the sign word list did not recognise are tidied, then offered to the word list once more.
 * Held (sacred) lines, partly read lines and lines behind a pole are never touched.
 * @param {any[]} regions @param {{translate: (he: string) => any}} glossary @param {{correctLine: Function}|null} fix
 * @returns {Promise<number>} how many lines were changed
 */
export async function fixRegions(regions, glossary, fix) {
  if (!fix) return 0;
  let n = 0;
  for (const r of regions) {
    if (r.held || r.en || r.partial || r.occluded || !r.he) continue;
    const he = String(r.he).trim();
    // the line's reading confidence stands in for each of its words: a confidently read line is left as read
    let c; try { c = await fix.correctLine(he, { confs: he.split(/\s+/).map(() => (Number.isFinite(r.conf) ? r.conf : undefined)) }); } catch { continue; }
    if (!c.changes.length) continue;
    r.heRead = r.he; r.he = c.text; r.tidied = true; n++;
    const t = glossary.translate(c.text);
    if (t && t.en) Object.assign(r, { en: t.en, translationSource: t.from === 'phrasebook' ? 'phrasebook' : t.status === 'near' ? 'word-list-near' : 'word-list', translit: t.translit || null, pointed: t.pointed || null });
  }
  return n;
}
