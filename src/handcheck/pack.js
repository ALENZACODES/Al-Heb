// @ts-check
// The letter-check pack: finding it, fetching it when the learner asks, checking it, keeping it, removing it. No DOM.
// Same rules as the Talk language packs (src/talk/nmt/pack.js): never part of the first install, fetched only on the learner's
// tap, every part at most 16 MiB and checked against the size and SHA-256 in the pack list, kept in a cache of its own.
// The cache name and the x-alef-sha256 header follow the alef-tools contract, so the shared pack screen can list and remove it.

export const PACK = 'handwriting';
export const PACK_CACHE = 'alef-pack-handwriting-v1';
export const PACK_BASE = new URL('../../assets/vendor/_packs/handwriting/', import.meta.url).href;
export const MAX_PART_BYTES = 16 * 1024 * 1024;
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const env0 = (env = {}) => ({ cachesApi: env.caches ?? globalThis.caches, fetchImpl: env.fetch ?? globalThis.fetch, subtle: env.subtle ?? globalThis.crypto?.subtle });

/** Size in MB for the learner, one decimal ("1.3"). */
export const megabytes = (bytes) => (Math.max(0.1, Math.round(bytes / 104857.6) / 10)).toFixed(1);

/** The pack list: from the site; offline, the copy kept with the pack. @param {{caches?:any, fetch?:any, base?:string}} [env] */
export async function loadList(env = {}) {
  const { cachesApi, fetchImpl } = env0(env); const base = env.base || PACK_BASE; const url = base + 'pack.json';
  try {
    const res = await fetchImpl(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(String(res.status));
    const copy = res.clone(); const list = await res.json();
    if (list?.schema !== 'alef.pack.v1' || list.pack !== PACK) throw new Error('not a pack list');
    try { await (await cachesApi.open(PACK_CACHE)).put(url, copy); } catch { /* no cache storage: state() will say so */ }
    return Object.assign(list, { base });
  } catch (e) {
    if (cachesApi) { const hit = await (await cachesApi.open(PACK_CACHE)).match(url); if (hit) return Object.assign(await hit.json(), { base }); }
    throw new Error('no pack list');
  }
}

/** Every part of the pack: [{name, key, url, bytes, sha256}]. */
export function partsOf(list) {
  const out = [];
  for (const f of list.files || []) for (const p of f.parts) { const u = `${list.base}${p.path}?v=${p.sha256.slice(0, 16)}`; out.push({ name: f.name, key: u, url: u, bytes: p.bytes, sha256: p.sha256 }); }
  return out;
}
export const totalBytes = (list) => partsOf(list).reduce((a, p) => a + p.bytes, 0);

/** @returns {Promise<{ready:boolean, have:number, total:number, storage:boolean}>} */
export async function state(list, env = {}) {
  const { cachesApi } = env0(env); const parts = partsOf(list); const total = parts.reduce((a, p) => a + p.bytes, 0);
  if (!cachesApi) return { ready: false, have: 0, total, storage: false };
  const cache = await cachesApi.open(PACK_CACHE); let have = 0;
  for (const p of parts) { const hit = await cache.match(p.key); if (hit && hit.headers.get('x-alef-sha256') === p.sha256) have += p.bytes; }
  return { ready: have === total && total > 0, have, total, storage: true };
}

/**
 * Fetch the parts that are not kept yet. Each one is checked (size, then SHA-256) before it is kept; a part that fails is not kept.
 * Only ever called from the learner's own tap.
 * @param {any} list @param {{caches?:any, fetch?:any, subtle?:any, onProgress?:(have:number,total:number)=>void, signal?:AbortSignal}} [env]
 */
export async function download(list, env = {}) {
  const { cachesApi, fetchImpl, subtle } = env0(env);
  if (!cachesApi) throw Object.assign(new Error('This browser cannot keep the pack.'), { code: 'no-storage' });
  const cache = await cachesApi.open(PACK_CACHE); const parts = partsOf(list); const total = parts.reduce((a, p) => a + p.bytes, 0); let have = 0;
  for (const p of parts) {
    if (p.bytes > MAX_PART_BYTES) throw Object.assign(new Error('part too large'), { code: 'part-too-large' });
    const hit = await cache.match(p.key);
    if (!(hit && hit.headers.get('x-alef-sha256') === p.sha256)) {
      let res; try { res = await fetchImpl(p.url, { signal: env.signal }); } catch { throw Object.assign(new Error('The download did not finish.'), { code: 'fetch' }); }
      if (!res.ok) throw Object.assign(new Error('The download did not finish.'), { code: 'fetch' });
      const buf = await res.arrayBuffer();
      if (buf.byteLength !== p.bytes) throw Object.assign(new Error('The file arrived damaged.'), { code: 'size-mismatch' });
      if (hex(await subtle.digest('SHA-256', buf)) !== p.sha256) throw Object.assign(new Error('The file arrived damaged.'), { code: 'hash-mismatch' });
      await cache.put(p.key, new Response(buf, { headers: { 'content-type': 'application/octet-stream', 'content-length': String(p.bytes), 'x-alef-sha256': p.sha256 } }));
    }
    have += p.bytes; env.onProgress?.(have, total);
  }
  for (const req of await cache.keys()) if (!/\/pack\.json$/.test(req.url) && !parts.some((p) => p.key === req.url)) await cache.delete(req);   // parts of an older version
  return { have, total };
}

/** The joined bytes of one file of the pack, from the cache. */
export async function readFile(list, name, env = {}) {
  const { cachesApi } = env0(env); const cache = await cachesApi.open(PACK_CACHE);
  const parts = partsOf(list).filter((p) => p.name === name);
  if (!parts.length) throw new Error(`the pack has no ${name}`);
  const bufs = [];
  for (const p of parts) { const hit = await cache.match(p.key); if (!hit) throw Object.assign(new Error('not downloaded'), { code: 'not-downloaded' }); bufs.push(new Uint8Array(await hit.arrayBuffer())); }
  const out = new Uint8Array(bufs.reduce((a, b) => a + b.length, 0)); let at = 0;
  for (const b of bufs) { out.set(b, at); at += b.length; }
  return out;
}

/** Remove the pack from this device. */
export async function remove(env = {}) { const { cachesApi } = env0(env); return cachesApi ? cachesApi.delete(PACK_CACHE) : false; }
