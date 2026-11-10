// @ts-check
// Talk translation pack: finding, downloading, checking and keeping the pack files. No DOM.
// The files are part of the site itself (assets/vendor/_nmt and assets/vendor/_ort); nothing is fetched from anywhere else.
// They are never part of the first install. A pack is fetched only when the learner asks for it, part by part (16 MiB at most),
// each part checked against the size and SHA-256 in the manifest, and kept in its own cache so an app update does not throw it away.

export const PACK_CACHE = 'alef-talk-pack-v1';
export const NMT_BASE = new URL('../../../assets/vendor/_nmt/', import.meta.url).href;
export const DIRECTIONS = Object.freeze(['he-en', 'en-he']);
export const DIRECTION_LABEL = Object.freeze({ 'he-en': 'Hebrew to English', 'en-he': 'English to Hebrew' });

const versioned = (url, sha) => `${url}?v=${sha.slice(0, 16)}`;
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export const megabytes = (bytes) => Math.max(1, Math.round(bytes / 1048576));

/**
 * Every file one direction needs: the runtime (shared by both directions) and the parts of the pack.
 * `key` is the address the file is kept under; `url` is where it is fetched from.
 * @param {any} manifest @param {string} direction @param {string} [base]
 * @returns {{key:string, url:string, bytes:number, sha256:string}[]}
 */
export function packFiles(manifest, direction, base = NMT_BASE) {
  const pack = manifest?.packs?.[direction];
  if (!pack) return [];
  const out = [];
  const rt = new URL(manifest.runtime.base, base).href;
  for (const f of manifest.runtime.files) out.push({ key: rt + f.path, url: versioned(rt + f.path, f.sha256), bytes: f.bytes, sha256: f.sha256 });
  for (const f of pack.files) for (const p of f.parts) { const u = versioned(base + p.path, p.sha256); out.push({ key: u, url: u, bytes: p.bytes, sha256: p.sha256 }); }
  return out;
}

/** @param {{caches?:any, fetch?:any}} [env] */
export async function loadManifest(env = {}) {
  const cachesApi = env.caches ?? globalThis.caches; const fetchImpl = env.fetch ?? globalThis.fetch;
  const url = NMT_BASE + 'manifest.json';
  try {
    const res = await fetchImpl(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(String(res.status));
    const copy = res.clone();
    const m = await res.json();
    try { await (await cachesApi.open(PACK_CACHE)).put(url, copy); } catch { /* no cache storage: the pack cannot be kept, state() will say so */ }
    return m;
  } catch (e) {
    const hit = cachesApi ? await (await cachesApi.open(PACK_CACHE)).match(url) : null; // offline: the copy saved with the pack
    if (hit) return hit.json();
    throw e;
  }
}

/** A kept file is good when it carries the hash the manifest names. */
async function kept(cache, f) {
  const hit = await cache.match(f.key);
  return hit && hit.headers.get('x-alef-sha256') === f.sha256 ? hit : null;
}

/**
 * @param {any} manifest @param {string} direction @param {{caches?:any}} [env]
 * @returns {Promise<{ready:boolean, have:number, total:number, missing:number}>} bytes kept, bytes needed, bytes still to fetch
 */
export async function packState(manifest, direction, env = {}) {
  const files = packFiles(manifest, direction);
  const total = files.reduce((a, f) => a + f.bytes, 0);
  const cachesApi = env.caches ?? globalThis.caches;
  if (!cachesApi || !files.length) return { ready: false, have: 0, total, missing: total };
  const cache = await cachesApi.open(PACK_CACHE);
  let have = 0;
  for (const f of files) if (await kept(cache, f)) have += f.bytes;
  return { ready: have === total, have, total, missing: total - have };
}

/**
 * Fetches what is missing, one part at a time. A part that fails its check is not kept. Safe to call again after a break:
 * parts already kept are skipped.
 * @param {any} manifest @param {string} direction
 * @param {{onProgress?:(have:number,total:number)=>void, signal?:AbortSignal, caches?:any, fetch?:any, subtle?:any}} [opts]
 */
export async function downloadPack(manifest, direction, opts = {}) {
  const cachesApi = opts.caches ?? globalThis.caches; const fetchImpl = opts.fetch ?? globalThis.fetch; const subtle = opts.subtle ?? globalThis.crypto?.subtle;
  if (!cachesApi) throw new Error('no-storage');
  const files = packFiles(manifest, direction);
  const total = files.reduce((a, f) => a + f.bytes, 0);
  const cache = await cachesApi.open(PACK_CACHE);
  let have = 0;
  for (const f of files) {
    if (await kept(cache, f)) { have += f.bytes; opts.onProgress?.(have, total); continue; }
    const res = await fetchImpl(f.url, { cache: 'no-store', signal: opts.signal });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const chunks = []; let got = 0;
    if (res.body && typeof res.body.getReader === 'function') {
      const reader = res.body.getReader();
      for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.byteLength; opts.onProgress?.(have + Math.min(got, f.bytes), total); }
    } else { const b = new Uint8Array(await res.arrayBuffer()); chunks.push(b); got = b.byteLength; }
    const buf = new Uint8Array(got); let at = 0;
    for (const c of chunks) { buf.set(c, at); at += c.byteLength; }
    if (got !== f.bytes) throw new Error('size-mismatch');
    if (subtle && hex(await subtle.digest('SHA-256', buf)) !== f.sha256) throw new Error('hash-mismatch');
    const type = f.key.endsWith('.mjs') ? 'text/javascript' : f.key.includes('.wasm') ? 'application/wasm' : f.key.includes('.json') ? 'application/json' : 'application/octet-stream';
    await cache.put(f.key, new Response(buf, { headers: { 'content-type': type, 'content-length': String(got), 'x-alef-sha256': f.sha256 } }));
    have += f.bytes; opts.onProgress?.(have, total);
  }
  await prune(manifest, cachesApi);
  try { await globalThis.navigator?.storage?.persist?.(); } catch { /* the browser decides */ }
  return { ready: true, have, total, missing: 0 };
}

/** Drops kept files the current manifest no longer names (an older pack version). */
async function prune(manifest, cachesApi) {
  try {
    const keep = new Set([NMT_BASE + 'manifest.json']);
    for (const d of Object.keys(manifest.packs || {})) for (const f of packFiles(manifest, d)) keep.add(f.key);
    const cache = await cachesApi.open(PACK_CACHE);
    for (const req of await cache.keys()) if (!keep.has(req.url)) await cache.delete(req);
  } catch { /* tidy-up only */ }
}

/** Removes every pack and the runtime from this device. */
export async function removePacks(env = {}) {
  const cachesApi = env.caches ?? globalThis.caches;
  try { return cachesApi ? await cachesApi.delete(PACK_CACHE) : false; } catch { return false; }
}

/** What the browser says about the connection, when it says anything. @returns {'cellular'|'saver'|''} */
export function connectionKind(nav = globalThis.navigator) {
  const c = /** @type {any} */ (nav)?.connection;
  if (!c) return '';
  if (c.saveData) return 'saver';
  return c.type === 'cellular' ? 'cellular' : '';
}

/** True when the browser reports too little free space for `bytes` more. Unknown counts as enough. */
export async function tooFull(bytes, nav = globalThis.navigator) {
  try { const e = await nav?.storage?.estimate?.(); if (!e || !e.quota) return false; return e.quota - (e.usage || 0) < bytes * 1.1; } catch { return false; }
}
