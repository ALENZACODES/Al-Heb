// @ts-check
// The door to the word-notes package for the screens under src/words/. Lazy: nothing here is in the first install.
// The package is the pinned alef-tools build (data/alef-tools.lock.json), reached through src/settings/tools.js like
// every other tools package, so no screen names a version.
import { loader, toolUrl } from '../settings/tools.js';
import { loadCatalog } from '../settings/packs.model.js';

const SITE = new URL('../../', import.meta.url).href;
export const ORT_BASE = new URL('assets/vendor/_ort/', SITE).href;
export const WORDS_PACK = 'words';

/** @type {Promise<any>|null} */ let pkg = null;
/** The word-notes module: loadUnit, findInUnit, describe, lessonNote, words, isNameWord, load ... */
export function morph() {
  if (!pkg) { pkg = import(toolUrl('morph')); pkg.catch(() => { pkg = null; }); }
  return pkg;
}

/** True when the Word helper pack is one a learner can download here (the catalog marks it published). */
export async function wordsPackOffered(env = {}) {
  try { return !!(await loadCatalog(env)).packs.find((p) => p.name === WORDS_PACK)?.published; } catch { return false; }
}

/**
 * The Words pack reader when the pack is offered and already on this device; otherwise null. It never starts a
 * download: packs are added and removed on the Language Packs page only.
 * @param {{fetch?:any, caches?:any, WorkerCtor?:any}} [env]
 * @returns {Promise<null|{analyse:(text:string) => Promise<any[]>}>}
 */
export async function wordsReader(env = {}) {
  try {
    const catalog = await loadCatalog(env);
    const entry = catalog.packs.find((p) => p.name === WORDS_PACK);
    if (!entry || !entry.published) return null;
    const m = await morph();
    const bases = [new URL(catalog.sitePacks, SITE).href, catalog.packHost];
    return await m.load({ loader, bases, ortBase: ORT_BASE, caches: env.caches, fetch: env.fetch, WorkerCtor: env.WorkerCtor });
  } catch { return null; } // not downloaded, no storage, no worker: the screens carry on without it
}
