// @ts-check
// Talk translation pack: finding, downloading, checking and keeping the pack files. No DOM.
// The files are part of the site itself (assets/vendor/_nmt and assets/vendor/_ort); nothing is fetched from anywhere else.
// They are never part of the first install. A pack is fetched only when the learner asks for it, part by part (16 MiB at most),
// each part checked against the size and SHA-256 in the manifest, and kept in its own cache so an app update does not throw it away.
// The downloading, checking and keeping is the shared language pack loader's (alef-tools, vendored under assets/vendor/_alef-tools);
// this file maps the Talk pack list onto it. The pack format and the cache name are unchanged, so nobody downloads a pack twice.
import { loader } from '../../settings/tools.js';

export const PACK_CACHE = 'alef-talk-pack-v1';
export const NMT_BASE = new URL('../../../assets/vendor/_nmt/', import.meta.url).href;
/** The runtime's code files always come from the site itself, wherever the data files come from. */
export const ORT_LOCAL = new URL('../_ort/', NMT_BASE).href;
export const HOSTS_FILE = new URL('../../../data/talk/pack-host.json', import.meta.url).href;
export const DIRECTIONS = Object.freeze(['he-en', 'en-he']);
export const DIRECTION_LABEL = Object.freeze({ 'he-en': 'Hebrew to English', 'en-he': 'English to Hebrew' });

const { versioned } = loader;
export const megabytes = loader.megabytes;

/**
 * Every file one direction needs: the runtime (shared by both directions) and the parts of the pack.
 * `key` is the address the file is kept under; `url` is where it is fetched from.
 * With `gpu` the list is the one for a browser with a usable graphics card: the runtime that can use it (it also runs the
 * ordinary way) and two small graphs that read their weights from the same pack parts. The pack parts are the same either way.
 * @param {any} manifest @param {string} direction @param {string|{base?:string, gpu?:boolean}} [opts]
 * @returns {{key:string, url:string, bytes:number, sha256:string}[]}
 */
export function packFiles(manifest, direction, opts = {}) {
  const base = (typeof opts === 'string' ? opts : opts.base) || manifest?.base || NMT_BASE;
  const gpu = typeof opts === 'object' && !!opts.gpu && !!manifest?.gpuRuntime && !!manifest?.packs?.[direction]?.gpu?.length;
  const pack = manifest?.packs?.[direction];
  if (!pack) return [];
  const out = [];
  const runtime = gpu ? manifest.gpuRuntime : manifest.runtime;
  const rt = new URL(runtime.base, base).href;
  // code (.mjs) from the site itself; the WebAssembly, like every other data file, from wherever the packs are
  for (const f of runtime.files) { const at = (/\.mjs$/.test(f.path) && base !== NMT_BASE ? ORT_LOCAL : rt) + f.path; out.push({ key: at, url: versioned(at, f.sha256), bytes: f.bytes, sha256: f.sha256 }); }
  for (const f of [...pack.files, ...(gpu ? pack.gpu : [])]) for (const p of f.parts) { const u = versioned(base + p.path, p.sha256); out.push({ key: u, url: u, bytes: p.bytes, sha256: p.sha256 }); }
  return out;
}

/**
 * The pack list. The site's own copy is tried first. A copy of the site built without the packs has none, and then the hosts
 * named in data/talk/pack-host.json are tried in order. The list remembers where it came from (`base`), and every pack part is
 * fetched from there. Offline, the copy saved with the pack is used.
 * @param {{caches?:any, fetch?:any}} [env]
 */
export async function loadManifest(env = {}) {
  const cachesApi = env.caches ?? globalThis.caches; const fetchImpl = env.fetch ?? globalThis.fetch;
  const tryBase = async (base, opts) => {
    const url = base + 'manifest.json';
    const res = await fetchImpl(url, opts);
    if (!res.ok) throw new Error(String(res.status));
    const copy = res.clone();
    const m = await res.json();
    if (!m || !m.packs) throw new Error('not a pack list');
    try { await (await cachesApi.open(PACK_CACHE)).put(url, copy); } catch { /* no cache storage: the pack cannot be kept, state() will say so */ }
    return Object.assign(m, { base });
  };
  let hosts = [];
  try { return await tryBase(NMT_BASE, { cache: 'no-cache' }); } catch { /* not carried by this copy of the site, or offline */ }
  try { const r = await fetchImpl(HOSTS_FILE); if (r.ok) hosts = ((await r.json()).hosts || []).filter((h) => /^https?:\/\/.+\/$/.test(h)); } catch { /* offline */ }
  // From another address the request must stay a plain one (no cache directive: that adds a header the host would have to approve first).
  for (const h of hosts) { try { return await tryBase(h, { mode: 'cors' }); } catch { /* next host */ } }
  // offline: the list saved with the pack, from wherever it came
  if (cachesApi) {
    const cache = await cachesApi.open(PACK_CACHE);
    for (const base of [NMT_BASE, ...hosts]) { const hit = await cache.match(base + 'manifest.json'); if (hit) return Object.assign(await hit.json(), { base }); }
    for (const req of await cache.keys()) if (/\/manifest\.json$/.test(req.url)) { const hit = await cache.match(req); if (hit) return Object.assign(await hit.json(), { base: req.url.replace(/manifest\.json$/, '') }); }
  }
  throw new Error('no pack list');
}

/**
 * What is on the device for one direction. `gpu` in env says this browser has a usable graphics card.
 * A pack counts as ready when either set of files is complete; the graphics-card set is preferred when it is complete,
 * and it is the set a new download fetches on a browser that can use it.
 * @param {any} manifest @param {string} direction @param {{caches?:any, gpu?:boolean}} [env]
 * @returns {Promise<{ready:boolean, gpu:boolean, have:number, total:number, missing:number}>} bytes kept, needed and still to fetch
 */
export async function packState(manifest, direction, env = {}) {
  const count = async (gpu) => ({ gpu, ...(await loader.filesState(packFiles(manifest, direction, { gpu }), { cacheName: PACK_CACHE, caches: env.caches })) });
  const order = ({ ready, gpu, have, total, missing }) => ({ ready, gpu, have, total, missing });
  const plain = await count(false);
  const canGpu = !!env.gpu && packFiles(manifest, direction, { gpu: true }).some((f) => /\.gpu\.onnx/.test(f.key));
  if (!canGpu) return order(plain);
  const fast = await count(true);
  if (fast.ready || !plain.ready) return order(fast);
  return order(plain);
}

/** Every address the current list names, for any direction and either way of running, plus the list itself. */
function namedKeys(manifest) {
  const keep = [(manifest.base || NMT_BASE) + 'manifest.json'];
  for (const d of Object.keys(manifest.packs || {})) for (const gpu of [false, true]) for (const f of packFiles(manifest, d, { gpu })) keep.push(f.key);
  return keep;
}

/**
 * Fetches what is missing, one part at a time. A part that fails its check is not kept. Safe to call again after a break:
 * parts already kept are skipped. `userStarted` must be true when the learner pressed the button: on Shabbat and Yom Tov
 * nothing else may start a download. "Only on Wi-Fi", the learner's storage limit and free space are checked first.
 * Rejects with a PackError; its `code` says why (shabbat, wifi-only, too-full, over-limit, no-storage, fetch, size-mismatch, hash-mismatch, quota, aborted).
 * @param {any} manifest @param {string} direction
 * @param {{userStarted?:boolean, onProgress?:(have:number,total:number)=>void, signal?:AbortSignal, caches?:any, fetch?:any, subtle?:any, gpu?:boolean, now?:number, navigator?:any, storage?:any}} [opts]
 */
export async function downloadPack(manifest, direction, opts = {}) {
  const gpu = !!opts.gpu;
  const done = await loader.downloadFiles(packFiles(manifest, direction, { gpu }), {
    ...opts, gpu, cacheName: PACK_CACHE, origin: new URL(NMT_BASE).origin,
    extra: { [PACK_CACHE]: 'talk' }, // this cache has an older name; it still counts toward the learner's storage limit
    // Drops kept files the current list no longer names (an older pack version). engine-<direction>.json is the remembered
    // outcome of the graphics-card check (src/talk/nmt/worker.js); it carries the pack version.
    keepKeys: namedKeys(manifest), spare: (url) => url.includes('/engine-') && url.endsWith(`?v=${manifest.version}`),
  });
  return { ...done, gpu };
}

/** Removes every pack and the runtime from this device. */
export async function removePacks(env = {}) {
  return loader.removePack('talk', { caches: env.caches, cacheName: PACK_CACHE });
}

/**
 * Removes one direction from this device. The runtime both directions share goes too when the other direction is not kept,
 * so nothing is left behind that nothing can use.
 * @param {any} manifest @param {string} direction @param {{caches?:any}} [env]
 */
export async function removePack(manifest, direction, env = {}) {
  const others = DIRECTIONS.filter((d) => d !== direction && manifest?.packs?.[d]);
  const mine = new Map(), theirs = new Set(); let otherKept = false;
  for (const gpu of [false, true]) {
    for (const f of packFiles(manifest, direction, { gpu })) mine.set(f.key, f);
    for (const d of others) {
      const files = packFiles(manifest, d, { gpu });
      if (files.length && (await loader.filesState(files, { cacheName: PACK_CACHE, caches: env.caches })).ready) { otherKept = true; for (const f of files) theirs.add(f.key); }
    }
  }
  if (!otherKept) return removePacks(env);
  return (await loader.removeFiles([...mine.values()].filter((f) => !theirs.has(f.key)), { cacheName: PACK_CACHE, caches: env.caches })) > 0;
}

/** True when this browser hands out a real graphics adapter. A browser without one, or one that refuses, gets the ordinary files. */
export async function hasGraphics(nav = globalThis.navigator, force = !!(/** @type {any} */ (globalThis).__alefSoftwareGraphics)) {
  // A software stand-in for a graphics card is many times slower than the processor way: not worth the larger runtime. (Tests force it.)
  return loader.hasGraphics({ navigator: nav ?? {}, force });
}

/** What the browser says about the connection, when it says anything. @returns {'cellular'|'saver'|''} */
export function connectionKind(nav = globalThis.navigator) { return loader.connectionKind({ navigator: nav ?? {} }); }

/** True when the browser reports too little free space for `bytes` more. Unknown counts as enough. */
export async function tooFull(bytes, nav = globalThis.navigator) { return loader.tooFull(bytes, { navigator: nav ?? {} }); }

/** Why a download or a pack could not go ahead, as the loader's short code ('shabbat', 'wifi-only', 'no-storage', ...). */
export const whyNot = (e) => loader.codeOf(e);
/** The learner's "Only on Wi-Fi" choice (Language packs page). On unless switched off. */
export const wifiOnly = () => loader.getWifiOnly();
