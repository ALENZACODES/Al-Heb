// @ts-check
// Progress protection helpers (lane 8 a11y/PWA round): storage persistence request and a dry-run check of a backup file.
// The store (src/store.js) already exports/imports JSON; this adds the parts around it:
//  - requestPersistence(): ask the browser not to evict the origin's storage under pressure (navigator.storage.persist).
//    Browsers decide differently: Chromium grants it silently for installed or engaged sites, Firefox asks the user, Safari
//    decides on its own. A refusal is normal and not an error; the learner is told to keep a backup file.
//  - inspectBackup(): validates a backup file's text WITHOUT touching the store, so Settings can show what it contains and ask
//    for confirmation before a restore replaces the progress that is on this device.

/** @typedef {{supported:boolean, persisted:boolean|null, granted:boolean|null}} PersistResult */

/** Ask for persistent storage. Never throws. @param {any} [nav] navigator-like (injectable for tests) @returns {Promise<PersistResult>} */
export async function requestPersistence(nav = typeof navigator !== 'undefined' ? navigator : undefined) {
  const sm = nav?.storage;
  if (!sm || typeof sm.persist !== 'function') return { supported: false, persisted: null, granted: null };
  try {
    const already = typeof sm.persisted === 'function' ? await sm.persisted() : false;
    if (already) return { supported: true, persisted: true, granted: true };
    const granted = !!(await sm.persist());
    return { supported: true, persisted: granted, granted };
  } catch { return { supported: true, persisted: null, granted: null }; }
}

/** Current persistence state without prompting. @param {any} [nav] @returns {Promise<{supported:boolean, persisted:boolean|null, usage:number|null, quota:number|null}>} */
export async function storageStatus(nav = typeof navigator !== 'undefined' ? navigator : undefined) {
  const sm = nav?.storage;
  if (!sm) return { supported: false, persisted: null, usage: null, quota: null };
  let persisted = null, usage = null, quota = null;
  try { if (typeof sm.persisted === 'function') persisted = !!(await sm.persisted()); } catch { /* ignore */ }
  try { if (typeof sm.estimate === 'function') { const e = await sm.estimate(); usage = e.usage ?? null; quota = e.quota ?? null; } } catch { /* ignore */ }
  return { supported: typeof sm.persist === 'function', persisted, usage, quota };
}

/**
 * Dry-run check of a backup file. Mirrors the checks in store.importData but changes nothing.
 * @param {string} text file contents @param {{app?:string, schema?:number}} [expect] @returns {{ok:true, items:number, exportedAt:string|null, schema:number, keys:string[]}|{ok:false, error:string}}
 */
export function inspectBackup(text, expect = { app: 'alef', schema: 1 }) {
  let obj;
  try { obj = JSON.parse(text); } catch { return { ok: false, error: 'This file is not valid JSON.' }; }
  if (!obj || obj.app !== expect.app || typeof obj.data !== 'object' || obj.data === null || Array.isArray(obj.data)) return { ok: false, error: 'This is not an Aleph backup file.' };
  if (!Number.isInteger(obj.schema) || obj.schema < 1) return { ok: false, error: 'The backup has no version number.' };
  if (expect.schema != null && obj.schema > expect.schema) return { ok: false, error: `This backup is from a newer Aleph (version ${obj.schema}). Update the app first.` };
  const keys = Object.keys(obj.data);
  return { ok: true, items: keys.length, exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : null, schema: obj.schema, keys };
}
