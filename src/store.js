// @ts-check
// ALEF store: small synchronous key/value store over localStorage with an
// in-memory fallback (private mode, quota errors, Node tests), a versioned
// schema, and checksummed, validated, all-or-nothing JSON export/import.
//
// IndexedDB is deliberately NOT used: all current state (settings, SRS cards,
// progress) is small. If SRS history grows large, add an async adapter behind
// the same interface and test it; that is not done.
//
// Multi-tab policy (see docs/data/README.md): reads always hit localStorage (no
// per-tab cache), writes are last-write-wins PER KEY, and `storage` events from
// other tabs are re-emitted to subscribers (listener gets a 3rd arg {external:true}).
// Code that keeps a whole object in memory should use store.update(key, fn) or merge on write
// (settings.js does) so another tab's change to a different field is not overwritten.

export const SCHEMA_VERSION = 1;
const APP_ID = 'alef';
const META = '__meta';
export const MAX_BACKUP_CHARS = 4_500_000; // localStorage is about 5M chars per origin in common browsers

/**
 * @typedef {{getItem(k:string):string|null,setItem(k:string,v:string):void,removeItem(k:string):void,key(i:number):string|null,readonly length:number}} StorageLike
 * @typedef {null|'unavailable'|'quota'|'error'} DegradedReason
 */

/** In-memory StorageLike. */
export function createMemoryStorage() {
  /** @type {Map<string,string>} */
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? /** @type {string} */ (m.get(k)) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}

function probe(storage) {
  try {
    const k = '__alef_probe__';
    storage.setItem(k, '1');
    const ok = storage.getItem(k) === '1';
    storage.removeItem(k);
    return ok;
  } catch { return false; }
}
/** @param {any} e */
export function isQuotaError(e) {
  return !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014 || /quota/i.test(String(e.message || '')));
}

/** Stable JSON: keys sorted at every level. */
export function canonicalJSON(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
  if (Array.isArray(v)) return '[' + v.map((x) => canonicalJSON(x === undefined ? null : x)).join(',') + ']';
  return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canonicalJSON(v[k])).join(',') + '}';
}
/** Not cryptographic: catches truncated or hand-edited files. */
export function checksum(text) {
  const fnv = (seed) => { let h = seed >>> 0; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
  return 'fnv1a-' + fnv(0x811c9dc5) + fnv(0x050c5d1f);
}

/**
 * Migrations: index i upgrades schema i+1 -> i+2 (migrations[0] takes data written by schema 1). Receive the raw data
 * object ({key: value}) and return the upgraded one. Must be pure and tolerant of odd shapes.
 * @type {Array<(data:Record<string,any>)=>Record<string,any>>}
 */
export const migrations = [];

/** @param {Record<string,any>} data @param {number} from @param {Array<Function>} [list] */
export function migrateData(data, from, list = migrations, target = SCHEMA_VERSION) {
  let d = data;
  for (let v = from; v < target; v++) {
    const fn = list[v - 1];
    if (typeof fn !== 'function') throw new Error(`no migration from schema ${v}`);
    d = fn(d);
    if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error(`migration from schema ${v} returned a non-object`);
  }
  return d;
}

/**
 * @param {{storage?: StorageLike|null, prefix?: string, window?: any, migrations?: Array<Function>, schema?: number}} [opts]
 */
export function createStore(opts = {}) {
  const prefix = opts.prefix ?? 'alef:';
  const usingDefault = opts.storage === undefined;
  const primary = usingDefault ? safeLS() : opts.storage;
  function safeLS() { try { return localStorage; } catch { return null; } } // touching localStorage can throw (cookies blocked)
  let backend = primary;
  let persistent = true;
  /** @type {DegradedReason} */
  let reason = null;
  let newerSchema = false;
  if (!backend || !probe(backend)) { backend = createMemoryStorage(); persistent = false; reason = 'unavailable'; }
  /** @type {Set<(key:string,value:any,info?:{external?:boolean})=>void>} */
  const listeners = new Set();
  /** @type {Set<(s:{persistent:boolean,reason:DegradedReason,newerSchema:boolean})=>void>} */
  const statusListeners = new Set();
  const migs = opts.migrations ?? migrations;
  const schemaNow = opts.schema ?? SCHEMA_VERSION;

  const status = () => ({ persistent, reason, newerSchema });
  function notifyStatus() { for (const l of statusListeners) { try { l(status()); } catch { /* ignore */ } } }

  /** raw map of every prefixed entry (including corrupt ones and __meta) */
  function rawAll(b = backend) {
    /** @type {Record<string,string>} */ const out = {};
    try { for (let i = 0; i < b.length; i++) { const full = b.key(i); if (full && full.startsWith(prefix)) { const v = b.getItem(full); if (v != null) out[full] = v; } } } catch { /* ignore */ }
    return out;
  }
  function dump() {
    /** @type {Record<string,any>} */
    const out = {};
    for (const [full, raw] of Object.entries(rawAll())) {
      if (full === prefix + META) continue;
      try { out[full.slice(prefix.length)] = JSON.parse(raw); } catch { /* skip corrupt */ }
    }
    return out;
  }
  function degrade(why) { // a write failed at runtime -> move to memory, keep data
    if (!persistent) return;
    const snapshot = dump();
    backend = createMemoryStorage();
    persistent = false; reason = why;
    for (const [k, v] of Object.entries(snapshot)) backend.setItem(prefix + k, JSON.stringify(v));
    notifyStatus();
  }
  function emit(key, value, info) { for (const l of listeners) { try { l(key, value, info); } catch { /* listener bug must not break store */ } } }

  /** Build the exact file content for a given data object. */
  const buildBackup = (data) => ({ app: APP_ID, schema: schemaNow, exportedAt: new Date().toISOString(), count: Object.keys(data).length, checksum: checksum(canonicalJSON(data)), data });

  const api = {
    /** true when data survives reload */
    get persistent() { return persistent; },
    get schema() { return schemaNow; },
    get degradedReason() { return reason; },
    status,
    /** @param {(s:ReturnType<typeof status>)=>void} fn @returns {()=>void} */
    onStatus(fn) { statusListeners.add(fn); return () => statusListeners.delete(fn); },
    /** @template T @param {string} key @param {T} [fallback] @returns {T|any} */
    get(key, fallback) {
      try {
        const raw = backend.getItem(prefix + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch { return fallback; }
    },
    /** @param {string} key @param {any} value @returns {boolean} true when the write reached durable storage */
    set(key, value) {
      const raw = JSON.stringify(value);
      if (raw === undefined) { api.remove(key); return persistent; }
      try { backend.setItem(prefix + key, raw); }
      catch (e) { degrade(isQuotaError(e) ? 'quota' : 'error'); try { backend.setItem(prefix + key, raw); } catch { /* memory failed: give up silently */ } }
      emit(key, value);
      return persistent;
    },
    /** Read-modify-write on the freshest stored value (use instead of get+set when another tab may write the same key).
     * @param {string} key @param {(cur:any)=>any} fn @param {any} [fallback] */
    update(key, fn, fallback) { const v = fn(api.get(key, fallback)); api.set(key, v); return v; },
    /** @param {string} key */
    remove(key) { try { backend.removeItem(prefix + key); } catch { /* ignore */ } emit(key, undefined); },
    keys() { return Object.keys(dump()); },
    /** @param {(key:string,value:any,info?:{external?:boolean})=>void} fn @returns {()=>void} */
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /** Remove every ALEF entry (including ones that fail to parse). Keeps the schema stamp. */
    clear() {
      for (const full of Object.keys(rawAll())) { if (full === prefix + META) continue; try { backend.removeItem(full); } catch { /* ignore */ } emit(full.slice(prefix.length), undefined); }
    },
    /** After the device freed space or the user backed up: try to move in-memory data back into localStorage. @returns {boolean} */
    retryPersistence() {
      if (persistent || !primary || !probe(primary)) return false;
      const snap = dump();
      const before = rawAll(primary);
      try { for (const [k, v] of Object.entries(snap)) primary.setItem(prefix + k, JSON.stringify(v)); }
      catch { for (const k of Object.keys(rawAll(primary))) { if (!(k in before)) { try { primary.removeItem(k); } catch { /* ignore */ } } } for (const [k, v] of Object.entries(before)) { try { primary.setItem(k, v); } catch { /* ignore */ } } return false; }
      backend = primary; persistent = true; reason = null; notifyStatus(); return true;
    },
    /** Backup object (JSON-serialisable): {app, schema, exportedAt, count, checksum, data}. */
    exportData() { return buildBackup(dump()); },
    exportJSON() { return JSON.stringify(api.exportData(), null, 2); },
    /**
     * Validate a backup WITHOUT touching the store and say what restoring it would change.
     * Any problem rejects the whole file.
     * @param {string|object} input @param {{mode?:'replace'|'merge'}} [o]
     */
    previewImport(input, o = {}) {
      const mode = o.mode === 'merge' ? 'merge' : 'replace';
      if (typeof input === 'string' && input.length > MAX_BACKUP_CHARS * 2) return { ok: false, error: 'This file is too large to be an ALEF backup.' };
      let obj;
      try { obj = typeof input === 'string' ? JSON.parse(input) : input; }
      catch { return { ok: false, error: 'Not valid JSON' }; }
      if (!obj || typeof obj !== 'object' || obj.app !== APP_ID || typeof obj.data !== 'object' || obj.data === null || Array.isArray(obj.data)) return { ok: false, error: 'Not an ALEF backup' };
      if (!Number.isInteger(obj.schema) || obj.schema < 1) return { ok: false, error: 'Missing schema version' };
      if (obj.schema > schemaNow) return { ok: false, error: `Backup is from a newer ALEF (schema ${obj.schema})` };
      if (obj.checksum !== undefined) {
        if (typeof obj.checksum !== 'string' || checksum(canonicalJSON(obj.data)) !== obj.checksum) return { ok: false, error: 'The checksum does not match: the file was changed or cut short after it was saved' };
      }
      let data;
      try { data = migrateData(obj.data, obj.schema, migs, schemaNow); } catch (e) { return { ok: false, error: 'Could not upgrade this backup: ' + (/** @type {any} */ (e)?.message || 'unknown error') }; }
      let total = 0;
      for (const [k, v] of Object.entries(data)) {
        if (!k || k.length > 200 || k === META || k === '__proto__' || k === 'constructor' || k === 'prototype') return { ok: false, error: `The backup has an invalid key name (${JSON.stringify(k.slice(0, 40))})` };
        let s; try { s = JSON.stringify(v); } catch { s = undefined; }
        if (s === undefined) return { ok: false, error: `The value for "${k}" cannot be stored` };
        total += s.length + k.length;
      }
      if (total > MAX_BACKUP_CHARS) return { ok: false, error: 'This backup is larger than this browser can store' };
      const cur = dump();
      /** @type {{added:string[],changed:string[],unchanged:string[],removed:string[]}} */
      const diff = { added: [], changed: [], unchanged: [], removed: [] };
      for (const [k, v] of Object.entries(data)) {
        if (!(k in cur)) diff.added.push(k);
        else if (canonicalJSON(cur[k]) === canonicalJSON(v)) diff.unchanged.push(k);
        else diff.changed.push(k);
      }
      if (mode === 'replace') for (const k of Object.keys(cur)) if (!(k in data)) diff.removed.push(k);
      for (const l of Object.values(diff)) l.sort();
      return { ok: true, mode, schema: obj.schema, migrated: obj.schema < schemaNow, exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : null, items: Object.keys(data).length, diff, data };
    },
    /**
     * All-or-nothing restore: validates first; if any write fails part-way (quota), everything is rolled back.
     * @param {string|object} input backup JSON text or object
     * @param {{mode?: 'replace'|'merge'}} [o]
     * @returns {{ok:true,imported:number}|{ok:false,error:string}} (call previewImport first to show what will change)
     */
    importData(input, o = {}) {
      const p = api.previewImport(input, o);
      if (!p.ok) return p;
      const before = rawAll();
      const rollback = () => {
        for (const full of Object.keys(rawAll())) { if (!(full in before)) { try { backend.removeItem(full); } catch { /* ignore */ } } }
        for (const [full, raw] of Object.entries(before)) { try { backend.setItem(full, raw); } catch { /* ignore */ } }
      };
      try {
        for (const k of p.diff.removed) backend.removeItem(prefix + k);
        for (const [k, v] of Object.entries(p.data)) backend.setItem(prefix + k, JSON.stringify(v));
      } catch (e) {
        rollback();
        return { ok: false, error: isQuotaError(e) ? 'Not enough storage space on this device to restore this backup. Nothing was changed.' : 'The browser refused to save the backup. Nothing was changed.' };
      }
      for (const k of p.diff.removed) emit(k, undefined);
      for (const k of [...p.diff.added, ...p.diff.changed]) emit(k, p.data[k]);
      return { ok: true, imported: p.items };
    },
    /** Re-emit changes made by other tabs. Call once; returns a detach function. @param {any} win window-like */
    listenForOtherTabs(win) {
      if (!win?.addEventListener) return () => {};
      const onStorage = (/** @type {any} */ e) => {
        if (!persistent) return; // in-memory mode shares nothing across tabs
        if (e.storageArea && primary && e.storageArea !== primary) return;
        if (e.key == null) { for (const k of api.keys()) emit(k, api.get(k), { external: true }); emit('*', undefined, { external: true }); return; } // another tab cleared storage
        if (!e.key.startsWith(prefix) || e.key === prefix + META) return;
        let v; try { v = e.newValue == null ? undefined : JSON.parse(e.newValue); } catch { return; }
        emit(e.key.slice(prefix.length), v, { external: true });
      };
      win.addEventListener('storage', onStorage);
      return () => win.removeEventListener?.('storage', onStorage);
    },
  };

  // schema stamp + one-time migration of already-stored data (best effort, all-or-nothing)
  try {
    const meta = api.get(META);
    const have = meta && Number.isInteger(meta.schema) ? meta.schema : (Object.keys(dump()).length ? 1 : schemaNow);
    if (have > schemaNow) newerSchema = true; // written by a newer build: read as-is, do not downgrade the stamp
    else {
      if (have < schemaNow) {
        const before = rawAll();
        try {
          const next = migrateData(dump(), have, migs, schemaNow);
          for (const [k, v] of Object.entries(next)) backend.setItem(prefix + k, JSON.stringify(v));
          for (const full of Object.keys(before)) { const k = full.slice(prefix.length); if (k !== META && !(k in next)) backend.removeItem(full); }
        } catch { for (const [full, raw] of Object.entries(before)) { try { backend.setItem(full, raw); } catch { /* ignore */ } } throw new Error('migration failed; data left as it was, schema stamp not advanced'); }
      }
      if (!meta || meta.schema !== schemaNow) backend.setItem(prefix + META, JSON.stringify({ schema: schemaNow }));
    }
  } catch { /* ignore */ }
  const win = opts.window ?? (usingDefault && typeof window !== 'undefined' ? window : null);
  if (win) api.listenForOtherTabs(win);
  return api;
}

/** Shared default instance for the browser app. */
export const store = createStore();
