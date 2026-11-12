// @ts-check
// A10 audio packs: save a book's, the prayers' or a lesson set's voice clips on this device on purpose, so they play with no signal.
// Clips go to their own cache (alef-audio-pack-v1). The service worker answers a clip from any cache (sw.js), never trims this one
// (it trims only its 600-clip runtime cache), and does not copy a pack download into the runtime cache (the x-alef-pack header).
// Sizes are measured from the files as they arrive; the clip list carries no sizes, so nothing is estimated.
export const PACK_CACHE = 'alef-audio-pack-v1';
export const PACK_HEADER = 'x-alef-pack';

const abs = (p, base) => { try { return new URL(p, base || globalThis.location?.href || 'http://localhost/').href; } catch { return p; } };

/**
 * Which of `paths` are already on this device (any cache, as the worker would answer), and the bytes of the saved ones.
 * @param {string[]} paths @param {{caches?:any, base?:string}} [o] @returns {Promise<{total:number, saved:number, bytes:number, inPack:number, missing:string[]}>}
 */
export async function packStatus(paths, o = {}) {
  const cs = o.caches ?? globalThis.caches;
  const out = { total: paths.length, saved: 0, bytes: 0, inPack: 0, missing: [] };
  if (!cs) { out.missing = paths.slice(); return out; }
  let pack = null; try { pack = await cs.open(PACK_CACHE); } catch { pack = null; }
  for (const p of paths) {
    const u = abs(p, o.base);
    let hit = null, mine = false;
    try { hit = pack ? await pack.match(u) : null; mine = !!hit; if (!hit) hit = await cs.match(u); } catch { hit = null; }
    if (!hit) { out.missing.push(p); continue; }
    out.saved++; if (mine) out.inPack++;
    const len = Number(hit.headers?.get?.('content-length'));
    if (Number.isFinite(len) && len > 0) out.bytes += len;
    else { try { out.bytes += (await hit.clone().arrayBuffer()).byteLength; } catch { /* size unknown */ } }
  }
  return out;
}

/**
 * Download the clips not yet on this device into the pack cache. Never throws.
 * @param {string[]} paths @param {{fetch?:Function, caches?:any, base?:string, signal?:AbortSignal, onProgress?:(p:{done:number,total:number,bytes:number})=>void, online?:()=>boolean}} o
 * @returns {Promise<{requested:number, ok:number, failed:{path:string, reason:string}[], bytes:number, aborted:boolean, offline:boolean}>}
 */
export async function downloadPack(paths, o = {}) {
  const f = o.fetch ?? globalThis.fetch?.bind(globalThis), cs = o.caches ?? globalThis.caches;
  const res = { requested: 0, ok: 0, failed: [], bytes: 0, aborted: false, offline: false };
  if (o.online && !o.online()) { res.offline = true; return res; }
  if (!f || !cs) { res.failed = paths.map((p) => ({ path: p, reason: 'this browser cannot save files for offline use' })); return res; }
  const st = await packStatus(paths, { caches: cs, base: o.base });
  const todo = st.missing;
  res.requested = todo.length;
  const cache = await cs.open(PACK_CACHE);
  let done = 0;
  o.onProgress?.({ done, total: todo.length, bytes: 0 });
  for (const p of todo) {
    if (o.signal?.aborted) { res.aborted = true; break; }
    const u = abs(p, o.base);
    try {
      const r = await f(u, { headers: { [PACK_HEADER]: '1' }, signal: o.signal });
      if (!r || !r.ok) throw new Error(`HTTP ${r ? r.status : 'error'}`);
      const buf = await r.arrayBuffer();
      await cache.put(u, new Response(buf, { status: 200, headers: { 'content-type': r.headers?.get?.('content-type') || 'audio/mpeg', 'content-length': String(buf.byteLength) } }));
      res.ok++; res.bytes += buf.byteLength;
    } catch (e) {
      if (o.signal?.aborted) { res.aborted = true; break; }
      res.failed.push({ path: p, reason: String(/** @type {any} */ (e)?.message || e) });
    }
    done++;
    o.onProgress?.({ done, total: todo.length, bytes: res.bytes });
  }
  return res;
}

/** Remove a pack's clips from the pack cache (clips kept by ordinary playing stay). @returns {Promise<number>} removed */
export async function removePack(paths, o = {}) {
  const cs = o.caches ?? globalThis.caches; if (!cs) return 0;
  let n = 0;
  try { const c = await cs.open(PACK_CACHE); for (const p of paths) if (await c.delete(abs(p, o.base))) n++; } catch { /* nothing saved */ }
  return n;
}
