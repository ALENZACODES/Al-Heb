// @ts-check
// "Move to another device" without a server (lane 4, 12 Nov). DOM-free so tests can run every step against a memory store.
//   outgoing: movePackage(store) -> a normal Aleph backup object without the keys that describe this device
//   incoming: readIncoming(store, objectOrText) -> validated data (Settings backups, progress files and move packages all work)
//   apply:    previewMerge(store, data) then applyMerge(store, data) -> merges; never overwrites, never deletes
import { canonicalJSON, checksum } from '../store.js';
import { mergeAll, summarize, DEVICE_KEYS } from './merge.js';
import { byteCapacity } from './qr.js';

export const MOVE_KIND = 'alef-move';
/** A QR code holds at most this many bytes (version 40, low error correction); larger progress goes by link or file. */
export const QR_MAX_BYTES = byteCapacity(40, 'L');

/** Everything in this store as { key: value }. */
export function dumpStore(store) {
  const out = {};
  for (const k of store.keys()) { const v = store.get(k); if (v !== undefined) out[k] = v; }
  return out;
}

/** The package to carry to the other device: a backup object with a checksum, minus this device's own keys. */
export function movePackage(store, now = Date.now()) {
  const data = {};
  for (const [k, v] of Object.entries(dumpStore(store))) if (!DEVICE_KEYS.includes(k)) data[k] = v;
  return { app: 'alef', kind: MOVE_KIND, schema: store.schema ?? 1, exportedAt: new Date(now).toISOString(), count: Object.keys(data).length, checksum: checksum(canonicalJSON(data)), data };
}

/**
 * Check what came from the other device with the store's own backup checks (app, version, checksum, key names, size).
 * @returns {{ok:true, data:Record<string,any>, exportedAt:string|null}|{ok:false, error:string}}
 */
export function readIncoming(store, input) {
  const p = store.previewImport(input, { mode: 'merge' });
  if (!p.ok) return { ok: false, error: p.error };
  return { ok: true, data: p.data, exportedAt: p.exportedAt };
}

/** What merging would change, without changing anything. */
export function previewMerge(store, incoming) {
  const local = dumpStore(store);
  const m = mergeAll(local, incoming);
  return { ...m, gains: summarize(local, m.data) };
}

/**
 * Merge `incoming` into the store. Writes only keys whose merged value differs, all or nothing (the store rolls back
 * if a write fails). Nothing is removed.
 * @returns {{ok:true, written:number, gains:ReturnType<typeof summarize>}|{ok:false, error:string}}
 */
export function applyMerge(store, incoming) {
  const pv = previewMerge(store, incoming);
  const keys = Object.keys(pv.data);
  if (!keys.length) return { ok: true, written: 0, gains: pv.gains };
  const r = store.importData({ app: 'alef', schema: store.schema ?? 1, data: pv.data }, { mode: 'merge' });
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, written: keys.length, gains: pv.gains };
}

/** Plain lines for the preview. */
export function describeGains(g, written) {
  if (!written) return ['Everything in it is already on this device. Nothing changes.'];
  const lines = [];
  const add = (n, one, many) => { if (n > 0) lines.push(`${n} ${n === 1 ? one : many}`); };
  add(g.lessons, 'more completed lesson', 'more completed lessons');
  add(g.cards, 'more review card', 'more review cards');
  add(g.xp, 'more XP', 'more XP');
  add(g.gems, 'more gem', 'more gems');
  const head = lines.length ? `This adds ${lines.join(', ')}.` : 'This adds review history and other saved progress.';
  return [head, `Your streak will read ${g.streak} day${g.streak === 1 ? '' : 's'}.`, `${written} saved item${written === 1 ? '' : 's'} on this device will be updated. Nothing is removed, and nothing already here is replaced by an older copy.`];
}

/** Fixed wording (tests check it). */
export const MOVE_COPY = Object.freeze({
  noAccount: 'Aleph has no accounts. Your progress moves only between your own devices, by a link, a QR code or a file that you carry over yourself. Nothing goes to a server.',
  hash: 'Opening the link loads Aleph as usual, but the progress itself sits after the # sign, and browsers never send that part to any website.',
  reconnect: 'There is no server to sync with, so nothing syncs by itself when you are back online. When you bring progress over, the import merges, never overwrites: lessons, review cards, XP, gems and streak days from both devices are kept, and nothing is counted twice.',
  passphrase: 'Anyone who has the link or sees the QR code can read your progress unless you set a passphrase. The passphrase is never stored or sent; you type it again on the other device.',
});
