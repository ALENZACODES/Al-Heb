// @ts-check
// Persisting Progress's own small state (rest days, daily goal) in the shared store under "progress.state", and a
// progress-only backup: export / import of the store keys Progress reads, as one JSON object with a checksum.
// The whole-store backup (Settings -> Back up) still exists and includes everything here; this file is the smaller,
// progress-only one for sharing a learner's progress between devices without the rest of the store.
import { KEYS, readSnapshot, withRestDay, withGoal } from './model.js';
import { updateMilestones } from './milestones.js';
import { withDeclaredRest } from '../curriculum/streak.js';

/** @param {{get:Function,set:Function}} store @param {string} key day key @param {boolean} on */
export function setRestDay(store, key, on) {
  store.set(KEYS.state, withRestDay(readSnapshot(store), key, on));
  // mirror into a v2 streak record so Home (which reads only that record) shows the same number
  const rec = store.get(KEYS.streak, null);
  if (rec && rec.v === 2) store.set(KEYS.streak, withDeclaredRest(rec, key, on));
}
/** @param {{get:Function,set:Function}} store @param {number} target cards per day */
export function setGoalTarget(store, target) {
  if (!Number.isInteger(target) || target < 1 || target > 500) throw new RangeError('goal must be 1..500 cards');
  store.set(KEYS.state, withGoal(readSnapshot(store), target));
}

/**
 * Record newly achieved milestones under 'progress.milestones.v1'. Writes only when something is new.
 * @param {{get:Function,set:Function}} store @param {any[]} evals evaluateMilestones() result @param {number} now
 * @returns {{newly:string[]}}
 */
export function recordMilestones(store, evals, now) {
  const { state, newly } = updateMilestones(store.get(KEYS.milestones, null), evals, now);
  if (newly.length) store.set(KEYS.milestones, state);
  return { newly };
}

// ---------- progress backup (export / import with checksum) ----------------------------------------------------

export const PROGRESS_BACKUP_KIND = 'alef-progress';
export const PROGRESS_BACKUP_SCHEMA = 1;
/** Store keys a progress backup may carry: exactly the keys Progress reads (model.js KEYS). Anything else is ignored on import. */
export const PROGRESS_KEYS = Object.freeze([...new Set(Object.values(KEYS))].sort());

/** Stable JSON: object keys sorted at every level, so the same data always hashes the same. Non-finite numbers become null like JSON.stringify. */
export function canonicalJSON(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map((x) => canonicalJSON(x === undefined ? null : x)).join(',') + ']';
  return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canonicalJSON(v[k])).join(',') + '}';
}

/**
 * Checksum of a string: two 32-bit FNV-1a hashes (different seeds) over UTF-16 code units, as 16 hex digits.
 * Not cryptographic: it catches truncated, edited or mis-pasted files, not a deliberate forgery.
 * @param {string} text
 */
export function checksum(text) {
  const fnv = (seed) => {
    let h = seed >>> 0;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, '0');
  };
  return 'fnv1a-' + fnv(0x811c9dc5) + fnv(0x050c5d1f);
}

/** Checksum of a backup's data block. @param {Record<string,any>} data */
export const dataChecksum = (data) => checksum(canonicalJSON(data));

/**
 * Progress backup object (JSON-serialisable). Only keys that exist in the store are included.
 * @param {{get:Function}} store @param {number|Date} [now]
 */
export function exportProgress(store, now = Date.now()) {
  /** @type {Record<string,any>} */ const data = {};
  for (const k of PROGRESS_KEYS) {
    let v; try { v = store.get(k, undefined); } catch { v = undefined; }
    if (v !== undefined && v !== null) data[k] = v;
  }
  return { app: 'alef', kind: PROGRESS_BACKUP_KIND, schema: PROGRESS_BACKUP_SCHEMA, exportedAt: new Date(now).toISOString(), keys: Object.keys(data), checksum: dataChecksum(data), data };
}
export function exportProgressJSON(store, now) { return JSON.stringify(exportProgress(store, now), null, 2); }
/** File name for a download. @param {number|Date} [now] */
export function progressFileName(now = Date.now()) { return `alef-progress-${new Date(now).toISOString().slice(0, 10)}.json`; }

/**
 * Validate a progress backup WITHOUT touching the store. Mirrors importProgress's checks.
 * @param {string|object} input
 * @returns {{ok:true, keys:string[], ignored:string[], exportedAt:string|null, schema:number}|{ok:false, error:string}}
 */
export function inspectProgressBackup(input) {
  let obj;
  try { obj = typeof input === 'string' ? JSON.parse(input) : input; } catch { return { ok: false, error: 'This file is not valid JSON.' }; }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, error: 'This is not an Aleph progress file.' };
  if (obj.app !== 'alef' || obj.kind !== PROGRESS_BACKUP_KIND) return { ok: false, error: obj.app === 'alef' && obj.data && !obj.kind ? 'This is a whole-app backup. Restore it from Settings instead.' : 'This is not an Aleph progress file.' };
  if (!Number.isInteger(obj.schema) || obj.schema < 1) return { ok: false, error: 'The progress file has no version number.' };
  if (obj.schema > PROGRESS_BACKUP_SCHEMA) return { ok: false, error: `This progress file is from a newer Aleph (version ${obj.schema}). Update the app first.` };
  if (!obj.data || typeof obj.data !== 'object' || Array.isArray(obj.data)) return { ok: false, error: 'The progress file has no data block.' };
  if (typeof obj.checksum !== 'string') return { ok: false, error: 'The progress file has no checksum.' };
  if (dataChecksum(obj.data) !== obj.checksum) return { ok: false, error: 'The checksum does not match: the file was changed or cut short after it was saved. Nothing was imported.' };
  const keys = Object.keys(obj.data).filter((k) => PROGRESS_KEYS.includes(k)).sort();
  const ignored = Object.keys(obj.data).filter((k) => !PROGRESS_KEYS.includes(k)).sort();
  return { ok: true, keys, ignored, exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : null, schema: obj.schema };
}

/**
 * Import a progress backup. Nothing is written unless every check passes (checksum included).
 * mode 'replace' (default): every progress key is set from the file, and progress keys absent from the file are removed.
 * mode 'merge': only keys present in the file are written; the rest stay as they are.
 * Keys outside PROGRESS_KEYS are never written.
 * @param {{get:Function,set:Function,remove?:Function}} store @param {string|object} input @param {{mode?:'replace'|'merge'}} [o]
 * @returns {{ok:true, imported:number, removed:number, ignored:string[]}|{ok:false, error:string}}
 */
export function importProgress(store, input, o = {}) {
  const r = inspectProgressBackup(input);
  if (!r.ok) return r;
  const obj = typeof input === 'string' ? JSON.parse(input) : input;
  const mode = o.mode === 'merge' ? 'merge' : 'replace';
  let imported = 0, removed = 0;
  for (const k of PROGRESS_KEYS) {
    if (k in obj.data) { store.set(k, obj.data[k]); imported++; }
    else if (mode === 'replace' && typeof store.remove === 'function' && store.get(k, undefined) !== undefined) { store.remove(k); removed++; }
  }
  return { ok: true, imported, removed, ignored: r.ignored };
}
