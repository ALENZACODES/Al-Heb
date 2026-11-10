// @ts-check
// Talk translation pack: the page's side. One shared instance serves the Talk screen and the Camera Translator.
import { loadManifest, packFiles, packState, downloadPack, removePacks, PACK_CACHE, NMT_BASE } from './pack.js';

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
    state: async (direction) => packState(await manifest(), direction, env),
    /** @param {string} direction @param {{onProgress?:(have:number,total:number)=>void, signal?:AbortSignal}} [opts] */
    download: async (direction, opts = {}) => downloadPack(await manifest(), direction, { ...env, ...opts }),
    /** True once the pack of this direction is loaded and can answer. */
    ready: (direction) => loaded.has(direction),
    /** Loads a pack that is on the device. Resolves false when it is not there or cannot run here. */
    load(direction) {
      if (!loading[direction]) {
        loading[direction] = (async () => {
          const m = await manifest();
          if (!(await packState(m, direction, env)).ready) return false;
          const all = packFiles(m, direction);
          const files = all.map((f) => ({ ...f, path: f.key.startsWith(NMT_BASE) ? f.key.slice(NMT_BASE.length).replace(/\?.*$/, '') : f.key }));
          await ask({ type: 'load', direction, pack: m.packs[direction], files, cache: PACK_CACHE, ortBase: new URL(m.runtime.base, NMT_BASE).href });
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
      return m.text || '';
    },
    async remove() { this.dispose(); return removePacks(env); },
    dispose() { try { worker?.terminate(); } catch { /* gone */ } worker = null; loaded.clear(); for (const k of Object.keys(loading)) delete loading[k]; for (const w of waiting.values()) w.reject(new Error('stopped')); waiting.clear(); },
  };
}

/** @type {ReturnType<typeof createPackClient>|null} */
let shared = null;
/** The one pack client of this page. */
export function sharedPack() { if (!shared) shared = createPackClient(); return shared; }
