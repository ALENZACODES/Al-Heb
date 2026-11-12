// @ts-check
// Voice journal storage (CODER-100 G10): the learner's own dated recordings, kept in this browser's IndexedDB only. Nothing is
// uploaded. One object store, "takes": {id (auto), line, title, at, ms, mime, blob}. Every call is promise-based and never throws:
// a browser without IndexedDB (or a private window that refuses it) gets {supported:false} and empty lists.
export const DB_NAME = 'alef-voice-journal';
export const STORE = 'takes';
export const MAX_TAKES = 200;

const req = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });

/** @param {{indexedDB?: any}} [o] */
export function openJournal(o = {}) {
  const idb = o.indexedDB !== undefined ? o.indexedDB : globalThis.indexedDB;
  if (!idb || typeof idb.open !== 'function') return memoryless();
  let dbp = null;
  const db = () => (dbp ||= new Promise((resolve, reject) => {
    let r;
    try { r = idb.open(DB_NAME, 1); } catch (e) { reject(e); return; }
    r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true }); };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
  const tx = async (mode) => (await db()).transaction(STORE, mode).objectStore(STORE);
  async function list() { try { return (await req((await tx('readonly')).getAll())) || []; } catch { return []; } }
  return {
    supported: true,
    list,
    async add(entry) {
      try {
        const all = await list();
        if (all.length >= MAX_TAKES) return { ok: false, error: 'full' };
        const id = await req((await tx('readwrite')).add({ line: entry.line, title: entry.title || entry.line, at: entry.at, ms: entry.ms || 0, mime: entry.blob?.type || 'audio/webm', blob: entry.blob }));
        return { ok: true, id };
      } catch { return { ok: false, error: 'not-saved' }; }
    },
    async remove(id) { try { await req((await tx('readwrite')).delete(id)); return { ok: true }; } catch { return { ok: false }; } },
  };
}

/** No IndexedDB: nothing can be kept. */
function memoryless() {
  return { supported: false, list: async () => [], add: async () => ({ ok: false, error: 'unsupported' }), remove: async () => ({ ok: false }) };
}

/** In-memory journal with the same interface (tests, and a fallback a caller may choose). Takes vanish when the page closes. */
export function memoryJournal() {
  const rows = []; let next = 1;
  return {
    supported: true,
    list: async () => rows.slice(),
    add: async (e) => { if (rows.length >= MAX_TAKES) return { ok: false, error: 'full' }; const id = next++; rows.push({ id, line: e.line, title: e.title || e.line, at: e.at, ms: e.ms || 0, mime: e.blob?.type || 'audio/webm', blob: e.blob }); return { ok: true, id }; },
    remove: async (id) => { const i = rows.findIndex((r) => r.id === id); if (i >= 0) rows.splice(i, 1); return { ok: i >= 0 }; },
  };
}

/** Delete the whole journal database (Settings: Delete all my data). Resolves true when a database was asked to go, false without IndexedDB. */
export function deleteJournal(idbOverride) {
  const idb = idbOverride !== undefined ? idbOverride : globalThis.indexedDB;
  if (!idb || typeof idb.deleteDatabase !== 'function') return Promise.resolve(false);
  return new Promise((resolve) => {
    try { const r = idb.deleteDatabase(DB_NAME); r.onsuccess = () => resolve(true); r.onerror = () => resolve(false); r.onblocked = () => resolve(true); } catch { resolve(false); }
  });
}
