// @ts-check
// ALEF store: small synchronous key/value store over localStorage with an
// in-memory fallback (private mode, quota errors, Node tests), a versioned
// schema, and JSON export/import for backups.
//
// IndexedDB is deliberately NOT used: all current state (settings, SRS cards,
// progress) is small. If SRS history grows large, add an async adapter behind
// the same interface and test it; that is not done.

export const SCHEMA_VERSION = 1;
const APP_ID = 'alef';

/**
 * @typedef {{getItem(k:string):string|null,setItem(k:string,v:string):void,removeItem(k:string):void,key(i:number):string|null,readonly length:number}} StorageLike
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

/**
 * Migrations: index i upgrades schema i -> i+1. Receives the raw data object.
 * @type {Array<(data:Record<string,any>)=>Record<string,any>>}
 */
export const migrations = [];

/**
 * @param {{storage?: StorageLike|null, prefix?: string}} [opts]
 */
export function createStore(opts = {}) {
  const prefix = opts.prefix ?? 'alef:';
  let backend = opts.storage;
  if (backend === undefined) {
    try { backend = globalThis.localStorage ?? null; } catch { backend = null; }
  }
  let persistent = true;
  // A full storage area can still be read. Preserve it before falling back.
  if (!backend || !probe(backend)) degrade();
  /** @type {Set<(key:string,value:any)=>void>} */
  const listeners = new Set();

  function degrade() { // a write failed at runtime -> move to memory, keep data
    if (!persistent) return;
    const snapshot = dump();
    backend = createMemoryStorage();
    persistent = false;
    for (const [k, v] of Object.entries(snapshot)) backend.setItem(prefix + k, JSON.stringify(v));
  }
  function dump() {
    /** @type {Record<string,any>} */
    const out = Object.create(null);
    try {
      for (let i = 0; i < backend.length; i++) {
        const full = backend.key(i);
        if (full && full.startsWith(prefix) && full !== prefix + '__meta') {
          try { out[full.slice(prefix.length)] = JSON.parse(/** @type {string} */ (backend.getItem(full))); } catch { /* skip corrupt */ }
        }
      }
    } catch { /* ignore */ }
    return out;
  }
  function emit(key, value) { for (const l of listeners) { try { l(key, value); } catch { /* listener bug must not break store */ } } }

  const api = {
    /** true when data survives reload */
    get persistent() { return persistent; },
    get schema() { return SCHEMA_VERSION; },
    /** @template T @param {string} key @param {T} [fallback] @returns {T|any} */
    get(key, fallback) {
      try {
        const raw = backend.getItem(prefix + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch { return fallback; }
    },
    /** @param {string} key @param {any} value */
    set(key, value) {
      const raw = JSON.stringify(value);
      try { backend.setItem(prefix + key, raw); }
      catch { degrade(); try { backend.setItem(prefix + key, raw); } catch { /* give up silently */ } }
      emit(key, value);
    },
    /** @param {string} key */
    remove(key) { try { backend.removeItem(prefix + key); } catch { /* ignore */ } emit(key, undefined); },
    keys() { return Object.keys(dump()); },
    /** @param {(key:string,value:any)=>void} fn @returns {()=>void} */
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    clear() { for (const k of api.keys()) api.remove(k); },
    /** Backup object (JSON-serialisable). */
    exportData() {
      return { app: APP_ID, schema: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: dump() };
    },
    exportJSON() { return JSON.stringify(api.exportData(), null, 2); },
    /**
     * @param {string|object} input backup JSON text or object
     * @param {{mode?: 'replace'|'merge'}} [o]
     * @returns {{ok:true,imported:number}|{ok:false,error:string,recoveryRequired?:boolean}}
     */
    importData(input, o = {}) {
      let obj;
      try { obj = typeof input === 'string' ? JSON.parse(input) : input; }
      catch { return { ok: false, error: 'Not valid JSON' }; }
      if (!obj || obj.app !== APP_ID || typeof obj.data !== 'object' || obj.data === null || Array.isArray(obj.data)) return { ok: false, error: 'Not an ALEF backup' };
      if (!Number.isInteger(obj.schema) || obj.schema < 1) return { ok: false, error: 'Missing schema version' };
      if (obj.schema > SCHEMA_VERSION) return { ok: false, error: `Backup is from a newer ALEF (schema ${obj.schema})` };
      let data = obj.data;
      for (let v = obj.schema; v < SCHEMA_VERSION; v++) data = migrations[v - 1](data);
      // Validate serialisability before replacing any existing progress.
      try { data = JSON.parse(JSON.stringify(data)); }
      catch { return { ok: false, error: 'Backup data is not JSON serialisable' }; }
      const previous = dump();
      const replace = (o.mode ?? 'replace') === 'replace';
      const entries = Object.entries(data);
      const touched = new Set([...Object.keys(previous), ...Object.keys(data)]);
      try {
        if (replace) for (const k of Object.keys(previous)) backend.removeItem(prefix + k);
        for (const [k, v] of entries) backend.setItem(prefix + k, JSON.stringify(v));
      } catch {
        // A too-large restore must not silently leave a partial backup on disk
        // while reporting success from the memory fallback.
        let recoveryRequired = false;
        try {
          for (const k of touched) backend.removeItem(prefix + k);
          for (const [k, v] of Object.entries(previous)) backend.setItem(prefix + k, JSON.stringify(v));
        } catch {
          recoveryRequired = true;
          backend = createMemoryStorage(); persistent = false;
          for (const [k, v] of Object.entries(previous)) backend.setItem(prefix + k, JSON.stringify(v));
        }
        return { ok: false, error: 'Not enough writable storage to restore this backup. Keep a backup of your current progress.', recoveryRequired };
      }
      if (replace) for (const k of Object.keys(previous)) if (!Object.hasOwn(data, k)) emit(k, undefined);
      for (const [k, v] of entries) emit(k, v);
      return { ok: true, imported: entries.length };
    },
  };
  // stamp schema (best effort)
  if (api.get('__meta') === undefined) { try { backend.setItem(prefix + '__meta', JSON.stringify({ schema: SCHEMA_VERSION })); } catch { /* ignore */ } }
  return api;
}

/** Shared default instance for the browser app. */
export const store = createStore();
