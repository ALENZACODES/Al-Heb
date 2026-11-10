// @ts-check
// Persistence under its own key 'timedread.v1' in the shared sync store (part of Settings -> Back up).
import { KEY, cleanState, addRead } from './model.js';

/** @param {{get:Function}} store */
export function loadState(store) { try { return cleanState(store.get(KEY, null)); } catch { return cleanState(null); } }
/** @param {{get:Function,set:Function}} store @param {any} read */
export function saveRead(store, read) { const s = addRead(loadState(store), read); store.set(KEY, s); return s; }
/** Delete every stored timed read (the learner's choice; no undo). */
export function clearReads(store) { store.set(KEY, { v: 1, reads: [] }); }
