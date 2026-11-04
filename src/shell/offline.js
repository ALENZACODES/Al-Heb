// @ts-check
// Offline readiness (shell). Everything here is DOM-free and takes its environment as arguments (fetch, caches, navigator,
// localStorage) so it runs in Node tests. See docs/offline/README in docs/offline/SW-PROPOSALS.md for what sw.js does and does not do.
//
// WHAT "READY" MEANS HERE: every file of a feature group is present in a Cache Storage cache of this origin ("alef-shell-<version>"
// from the install-time precache, or "alef-runtime-v1" from runtime caching). It does NOT prove the feature works offline end to end:
// no browser has been run in airplane mode for this module. Audio clips are not part of any group (none are recorded yet).
import { requestPersistence, storageStatus } from "./backup.js";

export const PRECACHE_URL = "precache-manifest.js";
/** Approximate Web Storage limit in UTF-16 code units per origin: browsers differ (about 5 million characters in Chromium and Firefox, about 5 MB in Safari); used only for a warning. */
export const LOCAL_LIMIT_CHARS = 5_000_000;
export const WARN_RATIO = 0.7, CRITICAL_RATIO = 0.9;

// ---------- feature groups (by path prefix of precached files) ----------
/** First match wins. `route` is where a learner finds it; `needs` lists optional downloads that feature also wants. */
export const GROUPS = Object.freeze([
  { id: "calendar", label: "Calendar and reminders", test: /^(src\/curriculum\/(calendar|reminders)[^/]*|data\/calendar\/.*)$/, route: "#/calendar" },
  { id: "lessons", label: "Lessons, review and Israel dialogues", test: /^(src\/curriculum\/|data\/curriculum\/|data\/speak\/|src\/israel\/|data\/israel\/|src\/firstday\/|data\/firstday\/|src\/placement\/|data\/placement\/|src\/speak\/)/, route: "#/learn" },
  { id: "letters", label: "Letters and tracing", test: /^(src\/letters\/|data\/letters\/|src\/wordtrace\/|data\/wordtrace\/)/, route: "#/letters" },
  { id: "pronunciation", label: "Sounds and pronunciation", test: /^(src\/pronunciation\/|data\/pronunciation\/)/, route: "#/sounds" },
  { id: "reading", label: "Reading, Torah and prayer", test: /^(src\/corpus\/|data\/corpus\/|src\/torahread\/|data\/torahread\/|src\/service\/|src\/morning\/|data\/morning-verses\.json|data\/service\/|src\/timedread\/|data\/timedread\/)/, route: "#/read" },
  { id: "vocab", label: "Vocabulary and Word Sprint", test: /^(src\/vocab\/|data\/vocab\/|src\/sprint\/|data\/sprint\/)/, route: "#/vocab", needs: ["vocab-packs"] },
  { id: "photo", label: "Scan a photo", test: /^(src\/photo\/|data\/photo\/)/, route: "#/scan", needs: ["ocr"] },
  { id: "progress", label: "Progress, class track and sharing", test: /^(src\/progress\/|data\/progress\/|src\/classtrack\/|data\/classtrack\/|src\/teacher\/|src\/traditions\/|data\/traditions\/)/, route: "#/progress" },
  { id: "shell", label: "App shell, settings and install", test: /^(index\.html|offline\.html|manifest\.webmanifest|src\/(app|store)\.js|src\/shell\/|src\/audio\/|data\/audio\/|src\/onboarding\/|data\/onboarding\/|assets\/)/, route: "#/" },
]);
export const groupOf = (path) => GROUPS.find((g) => g.test.test(path))?.id || "other";

/** Optional downloads that are NOT in the install-time precache (see tools/build-precache.mjs SKIP). Names verified on disk by tests/offline.test.js. */
export function optionalGroups(tradition = "sephardi") {
  const t = ["israeli", "sephardi", "ashkenazi"].includes(tradition) ? tradition : "sephardi";
  return [
    { id: "audio-shard", label: `Word audio index (${t})`, urls: [`data/audio/manifest-words-${t}.json`], approxMB: 0.9 },
    { id: "vocab-packs", label: "Vocabulary lists (5,000 words)", urls: [500, 1000, 2000, 5000].map((n) => `data/vocab/packs/vocab5k-tier-${n}.json`), approxMB: 0.95 },
    { id: "ocr", label: "Photo reader engine (OCR)", urls: ["assets/vendor/_tesseract/tesseract.esm.min.js", "assets/vendor/_tesseract/worker.min.js", "assets/vendor/_tesseract/tesseract-core-simd-lstm.wasm.js", "assets/vendor/_tesseract/heb.traineddata"], approxMB: 5.0 },
  ];
}

// ---------- the precache list, read from the page ----------
/**
 * Parse tools/build-precache.mjs output WITHOUT eval (the site CSP has no unsafe-eval): version string and the JSON array.
 * @returns {{version:string|null, files:string[]}}
 */
export function parsePrecacheText(text) {
  const v = /self\.ALEF_VERSION\s*=\s*("(?:[^"\\]|\\.)*")/.exec(text);
  const a = /self\.ALEF_PRECACHE\s*=\s*(\[[\s\S]*?\])\s*;/.exec(text);
  let files = [];
  try { if (a) { const j = JSON.parse(a[1]); if (Array.isArray(j)) files = j.filter((x) => typeof x === "string"); } } catch { /* leave empty */ }
  let version = null; try { if (v) version = JSON.parse(v[1]); } catch { /* ignore */ }
  return { version, files };
}
/** Fetch and parse precache-manifest.js (served by the worker/cache, so it works offline once installed). Throws on HTTP failure. */
export async function loadPrecacheList(fetchFn = globalThis.fetch?.bind(globalThis), url = PRECACHE_URL) {
  if (!fetchFn) throw new Error("fetch is not available");
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`could not read ${url}: HTTP ${res.status}`);
  return parsePrecacheText(await res.text());
}

// ---------- what is in the caches ----------
/**
 * Compare a file list with Cache Storage. Never throws (no Cache API => everything "missing", supported:false).
 * @param {string[]} files
 * @param {{caches?:any, measure?:boolean, concurrency?:number}} [opt]
 * @returns {Promise<{supported:boolean, cacheNames:string[], total:number, cached:number, missing:string[], bytes:number|null, groups:{id:string,label:string,route?:string,total:number,cached:number,bytes:number|null,state:"ready"|"partial"|"missing",needs?:string[]}[]}>}
 */
export async function cacheReport(files, opt = {}) {
  const C = opt.caches ?? globalThis.caches;
  const measure = opt.measure !== false;
  const empty = (supported) => ({ supported, cacheNames: [], total: files.length, cached: 0, missing: [...files], bytes: null, groups: buildGroups(files, new Map(), measure) });
  if (!C || typeof C.keys !== "function") return empty(false);
  let names = [];
  const opened = [];
  try {
    names = (await C.keys()).filter((k) => /^alef-/.test(k));
    for (const n of names) opened.push(await C.open(n));
  } catch { return empty(true); }
  const hit = new Map(); // path -> size|null
  const queue = [...files];
  const worker = async () => {
    while (queue.length) {
      const f = queue.shift();
      for (const c of opened) {
        let res = null;
        try { res = await c.match(f); } catch { res = null; }
        if (!res) continue;
        let size = null;
        if (measure) { try { size = (await res.clone().blob()).size; } catch { const cl = Number(res.headers?.get?.("content-length")); size = Number.isFinite(cl) ? cl : null; } }
        hit.set(f, size); break;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opt.concurrency ?? 8) }, worker));
  const missing = files.filter((f) => !hit.has(f));
  const bytes = measure ? [...hit.values()].reduce((s, n) => s + (n || 0), 0) : null;
  return { supported: true, cacheNames: names, total: files.length, cached: hit.size, missing, bytes, groups: buildGroups(files, hit, measure) };
}
function buildGroups(files, hit, measure) {
  const by = new Map();
  for (const f of files) {
    const id = groupOf(f);
    const g = by.get(id) || { id, total: 0, cached: 0, bytes: measure ? 0 : null };
    g.total++; if (hit.has(f)) { g.cached++; if (measure) g.bytes += hit.get(f) || 0; }
    by.set(id, g);
  }
  const out = [];
  for (const def of [...GROUPS, { id: "other", label: "Other files", route: undefined }]) {
    const g = by.get(def.id); if (!g) continue;
    out.push({ ...g, label: def.label, route: def.route, needs: def.needs, state: g.cached === g.total ? "ready" : g.cached === 0 ? "missing" : "partial" });
  }
  return out;
}

// ---------- warming the cache ----------
/**
 * Fetch URLs so the service worker caches them (its fetch handler stores same-origin GETs: precache hits in the shell cache,
 * everything else in "alef-runtime-v1"). Concurrency-limited, one retry, resumable (call again with only the failed urls), cancellable.
 * @param {string[]} urls
 * @param {{fetch?:Function, concurrency?:number, retries?:number, signal?:AbortSignal, onProgress?:(p:{done:number,total:number,url:string,ok:boolean,bytes:number})=>void, sleep?:(ms:number)=>Promise<void>, online?:()=>boolean}} [opt]
 * @returns {Promise<{total:number, done:number, ok:number, failed:{url:string, reason:string}[], bytes:number, aborted:boolean, offline:boolean}>}
 */
export async function warmCache(urls, opt = {}) {
  const f = opt.fetch ?? globalThis.fetch?.bind(globalThis);
  const sleep = opt.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const out = { total: urls.length, done: 0, ok: 0, failed: [], bytes: 0, aborted: false, offline: false };
  if (!f) { out.failed = urls.map((url) => ({ url, reason: "fetch is not available" })); return out; }
  if (opt.online && !opt.online()) { out.offline = true; out.failed = urls.map((url) => ({ url, reason: "offline" })); return out; }
  const queue = [...urls];
  const one = async (url) => {
    let reason = "unknown";
    for (let attempt = 0; attempt <= (opt.retries ?? 1); attempt++) {
      if (opt.signal?.aborted) { out.aborted = true; return { ok: false, reason: "cancelled", bytes: 0, cancelled: true }; }
      try {
        const res = await f(url, { cache: "reload", signal: opt.signal });
        if (!res.ok) { reason = `HTTP ${res.status}`; if (res.status === 404) break; }
        else { const buf = await res.arrayBuffer(); return { ok: true, reason: "", bytes: buf.byteLength }; } // reading the body lets the worker finish its cache write
      } catch (e) {
        if (opt.signal?.aborted) { out.aborted = true; return { ok: false, reason: "cancelled", bytes: 0, cancelled: true }; }
        reason = String(e?.message || e || "network error");
      }
      if (attempt < (opt.retries ?? 1)) await sleep(500);
    }
    return { ok: false, reason, bytes: 0 };
  };
  const worker = async () => {
    while (queue.length && !out.aborted) {
      const url = queue.shift();
      const r = await one(url);
      if (r.cancelled) { out.aborted = true; break; }
      out.done++; out.bytes += r.bytes;
      if (r.ok) out.ok++; else out.failed.push({ url, reason: r.reason });
      try { opt.onProgress?.({ done: out.done, total: out.total, url, ok: r.ok, bytes: out.bytes }); } catch { /* listener bug */ }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opt.concurrency ?? 4) }, worker));
  if (out.aborted) out.failed.push(...queue.map((url) => ({ url, reason: "cancelled" })));
  return out;
}

/**
 * "Download everything": fetch precache files that are missing from the caches (the installed worker already holds the rest),
 * plus the chosen optional groups (skipping any file already cached). Returns the warm summary plus a fresh report.
 */
export async function downloadEverything(opt = {}) {
  const list = opt.files ?? (await loadPrecacheList(opt.fetch)).files;
  const before = await cacheReport([...list, ...(opt.extraUrls ?? [])], { caches: opt.caches, measure: false });
  const todo = opt.force ? [...list, ...(opt.extraUrls ?? [])] : before.missing;
  const summary = await warmCache(todo, opt);
  const after = await cacheReport(list, { caches: opt.caches });
  return { ...summary, skipped: before.total - before.missing.length, requested: todo.length, report: after };
}

// ---------- storage health ----------
const level = (r) => (r == null ? "unknown" : r >= CRITICAL_RATIO ? "critical" : r >= WARN_RATIO ? "warn" : "ok");

/** Characters held in Web Storage (all keys of the origin; the quota is per origin) and the part under `prefix`. Never throws. */
export function localStorageUsage(storage = globalThis.localStorage, prefix = "alef:") {
  let used = 0, mine = 0, keys = 0;
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i); if (k == null) continue;
      const n = k.length + String(storage.getItem(k) ?? "").length;
      used += n; keys++; if (k.startsWith(prefix)) mine += n;
    }
  } catch { return { supported: false, usedChars: 0, alefChars: 0, keys: 0, limitChars: LOCAL_LIMIT_CHARS, ratio: null, level: "unknown" }; }
  const ratio = used / LOCAL_LIMIT_CHARS;
  return { supported: true, usedChars: used, alefChars: mine, keys, limitChars: LOCAL_LIMIT_CHARS, ratio, level: level(ratio) };
}

/**
 * Whole picture for the card. `exportRoute` is where the backup download lives (the Settings screen); null when that route is absent.
 * @param {{navigator?:any, localStorage?:any, hasRoute?:(name:string)=>boolean}} [env]
 */
export async function storageHealth(env = {}) {
  const nav = env.navigator ?? globalThis.navigator;
  const st = await storageStatus(nav);
  const originRatio = st.usage != null && st.quota ? st.usage / st.quota : null;
  const local = localStorageUsage(env.localStorage ?? globalThis.localStorage);
  const rank = { unknown: 0, ok: 1, warn: 2, critical: 3 };
  const overall = [level(originRatio), local.level].sort((a, b) => rank[b] - rank[a])[0];
  const exportRoute = env.hasRoute ? (env.hasRoute("settings") ? "#/settings" : null) : "#/settings";
  const advice = [];
  if (local.level === "warn" || local.level === "critical") advice.push(`Saved progress and settings use about ${Math.round(local.ratio * 100)}% of the space this browser gives the site for them. Download a backup${exportRoute ? " from Settings" : ""} and tell whoever looks after ALEF; saving may start failing near the limit.`);
  if (level(originRatio) === "warn" || level(originRatio) === "critical") advice.push("The browser says this site uses most of its allowed storage (mostly offline copies). Clearing the offline copies is safe; progress is kept separately.");
  if (st.supported && st.persisted === false) advice.push("Progress is not protected from automatic browser clean-up. Use \"Protect my progress\", and keep a backup file.");
  return { persist: { supported: st.supported, persisted: st.persisted }, origin: { usage: st.usage, quota: st.quota, ratio: originRatio, level: level(originRatio) }, local, level: overall, exportRoute, advice };
}
/** Call from a click only. */
export const protectProgress = (nav) => requestPersistence(nav);

export const fmtBytes = (n) => (n == null ? "unknown" : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`);
