// @ts-check
// Talk translation pack: the worker. Translation runs here so the page stays responsive.
// It reads the pack parts from the pack cache (falling back to the site itself), loads the vendored WebAssembly runtime
// from the same address and answers one line at a time. Nothing leaves the device.
import { createRuntime } from './runtime.js';

/** @type {any} */
let ortP = null;
/** @type {Record<string, Promise<any>>} */
const runtimes = {};

async function bytesOf(cacheName, key, url) {
  try { const hit = await (await caches.open(cacheName)).match(key); if (hit) return hit.arrayBuffer(); } catch { /* no cache storage here */ }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  return res.arrayBuffer();
}

function loadOrt(msg) {
  if (!ortP) ortP = (async () => {
    const ort = await import(msg.ortBase + 'ort.wasm.min.mjs');
    ort.env.wasm.numThreads = 1; // a static host cannot send the headers shared memory needs
    ort.env.wasm.proxy = false;
    ort.env.wasm.wasmPaths = msg.ortBase;
    const wasm = msg.files.find((f) => f.key.endsWith('.wasm'));
    if (wasm) ort.env.wasm.wasmBinary = await bytesOf(msg.cache, wasm.key, wasm.url);
    ort.env.logLevel = 'error';
    return ort;
  })();
  return ortP;
}

self.onmessage = async (event) => {
  const msg = event.data || {};
  try {
    if (msg.type === 'load') {
      if (!runtimes[msg.direction]) {
        runtimes[msg.direction] = (async () => {
          const ort = await loadOrt(msg);
          const byPath = new Map(msg.files.map((f) => [f.path, f]));
          return createRuntime({ ort, pack: msg.pack, read: (path) => { const f = byPath.get(path); return bytesOf(msg.cache, f.key, f.url); } });
        })();
        runtimes[msg.direction].catch(() => { delete runtimes[msg.direction]; });
      }
      await runtimes[msg.direction];
      self.postMessage({ id: msg.id, ok: true });
    } else if (msg.type === 'translate') {
      const rt = await runtimes[msg.direction];
      if (!rt) throw new Error('not-loaded');
      self.postMessage({ id: msg.id, ok: true, text: await rt.translate(msg.text, { beams: msg.beams || 2 }) });
    } else self.postMessage({ id: msg.id, ok: false, error: 'unknown' });
  } catch (e) {
    self.postMessage({ id: msg.id, ok: false, error: String((e && /** @type {any} */ (e).message) || e) });
  }
};
