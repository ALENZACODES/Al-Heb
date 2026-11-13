// @ts-check
// Talk translation pack: the page's side. One shared instance serves the Talk screen and the Camera Translator.
import { loadManifest, packFiles, packState, downloadPack, removePacks, removePack, hasGraphics, PACK_CACHE, NMT_BASE, ORT_LOCAL } from './pack.js';

/** Longest line handed to the pack; longer text is cut at a sentence end by the caller. */
export const MAX_LINE = 400;

/**
 * @param {{WorkerCtor?:any, env?:any}} [cfg]
 */
export function createPackClient(cfg = {}) {
  const env = cfg.env || {};
  /** @type {any} */ let manifestP = null;
  /** @type {any} */ let worker = null;
  let seq = 0;
  /** @type {Map<number, {resolve:(v:any)=>void, reject:(e:any)=>void}>} */
  const waiting = new Map();
  /** @type {Record<string, Promise<boolean>>} */
  const loading = {};
  /** @type {Set<string>} */
  const loaded = new Set();

  /** @type {Record<string, any>} */
  const engines = {};
  /** @type {Record<string, any>} */
  const sent = {};
  /** @type {Promise<boolean>|null} */
  let gpuP = null;
  /** Whether this browser hands out a graphics adapter (asked once). */
  const graphics = () => (gpuP ||= 'gpu' in env ? Promise.resolve(!!env.gpu) : hasGraphics());

  const manifest = () => { if (!manifestP) { manifestP = loadManifest(env); manifestP.catch(() => { manifestP = null; }); } return manifestP; };

  function startWorker() {
    if (worker) return worker;
    const Ctor = cfg.WorkerCtor || globalThis.Worker;
    if (!Ctor) throw new Error('no-worker');
    worker = new Ctor(new URL('./worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => { const m = event.data || {}; const w = waiting.get(m.id); if (!w) return; waiting.delete(m.id); if (m.ok) w.resolve(m); else w.reject(new Error(m.error || 'failed')); };
    worker.onerror = () => { for (const w of waiting.values()) w.reject(new Error('worker-error')); waiting.clear(); loaded.clear(); for (const k of Object.keys(loading)) delete loading[k]; try { worker.terminate(); } catch { /* gone */ } worker = null; };
    return worker;
  }
  const ask = (msg) => new Promise((resolve, reject) => { const id = ++seq; waiting.set(id, { resolve, reject }); try { startWorker().postMessage({ ...msg, id }); } catch (e) { waiting.delete(id); reject(e); } });

  return {
    manifest,
    /** Sizes and whether the files of one direction are on the device. */
    state: async (direction) => packState(await manifest(), direction, { ...env, gpu: await graphics() }),
    /** @param {string} direction @param {{onProgress?:(have:number,total:number)=>void, signal?:AbortSignal}} [opts] */
    download: async (direction, opts = {}) => { const m = await manifest(); const st = await packState(m, direction, { ...env, gpu: await graphics() }); return downloadPack(m, direction, { ...env, ...opts, gpu: st.gpu }); },
    /** How the loaded pack runs on this device: {engine:'webgpu'|'wasm', gpu:'ok'|'slow'|'wrong-answer'|'failed'|'not-tried', checkMs}. */
    engine: (direction) => engines[direction] || null,
    /** Times both ways of running on this device: {wasm: ms a line, webgpu?: ms a line}. */
    async bench(direction) { if (!loaded.has(direction)) throw new Error('not-loaded'); const m = await ask({ ...sent[direction], type: 'bench' }); engines[direction] = m.info || engines[direction]; return m.bench; },
    /** True once the pack of this direction is loaded and can answer. */
    ready: (direction) => loaded.has(direction),
    /** Loads a pack that is on the device. Resolves false when it is not there or cannot run here. */
    load(direction) {
      if (!loading[direction]) {
        loading[direction] = (async () => {
          const m = await manifest();
          const st = await packState(m, direction, { ...env, gpu: await graphics() });
          if (!st.ready) return false;
          const all = packFiles(m, direction, { gpu: st.gpu });
          const from = m.base || NMT_BASE;
          const files = all.map((f) => ({ ...f, path: f.key.startsWith(from) ? f.key.slice(from.length).replace(/\?.*$/, '') : f.key }));
          sent[direction] = { direction, pack: m.packs[direction], files, gpu: st.gpu, version: m.version, slowMs: /** @type {any} */ (globalThis).__alefGpuSlowMs || 0, cache: PACK_CACHE, ortBase: ORT_LOCAL };
          const done = await ask({ ...sent[direction], type: 'load' });
          engines[direction] = done.info || null;
          loaded.add(direction);
          return true;
        })().catch(() => { delete loading[direction]; return false; });
      }
      return loading[direction];
    },
    /** @param {string} direction @param {string} text @returns {Promise<string>} */
    async translate(direction, text) {
      if (!loaded.has(direction)) throw new Error('not-loaded');
      const m = await ask({ type: 'translate', direction, text: String(text || '').slice(0, MAX_LINE), beams: 2 });
      if (m.engine && engines[direction]) engines[direction] = { ...engines[direction], engine: m.engine };
      return m.text || '';
    },
    async remove() { this.dispose(); return removePacks(env); },
    /** Removes one direction from the device (Language packs page). The other direction, if kept, loads again when it is next needed. */
    async removeOne(direction) { const m = await manifest(); this.dispose(); return removePack(m, direction, env); },
    dispose() { try { worker?.terminate(); } catch { /* gone */ } worker = null; loaded.clear(); for (const k of Object.keys(loading)) delete loading[k]; for (const w of waiting.values()) w.reject(new Error('stopped')); waiting.clear(); },
  };
}

/** @type {ReturnType<typeof createPackClient>|null} */
let shared = null;
/** The one pack client of this page. */
export function sharedPack() { if (!shared) shared = createPackClient(); return shared; }
