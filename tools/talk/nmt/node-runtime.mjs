// Loads the shipped translation pack under Node with the same vendored runtime the browser uses (WebAssembly, one thread).
// No npm dependency: everything is read from assets/vendor/.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRuntime } from '../../../src/talk/nmt/runtime.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const NMT = join(root, 'assets', 'vendor', '_nmt');
const ORT = join(root, 'assets', 'vendor', '_ort');
let ortP = null;

export function readManifest() { return JSON.parse(readFileSync(join(NMT, 'manifest.json'), 'utf8')); }

export async function loadOrt() {
  if (!ortP) ortP = (async () => {
    const ort = await import(pathToFileURL(join(ORT, 'ort.wasm.min.mjs')).href);
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = pathToFileURL(ORT).href + '/';
    ort.env.wasm.wasmBinary = readFileSync(join(ORT, 'ort-wasm-simd-threaded.wasm'));
    ort.env.logLevel = 'error';
    return ort;
  })();
  return ortP;
}

/**
 * @param {'he-en'|'en-he'} direction
 * @param {'wasm'|'float'} [device] 'float' runs the graphics-card graphs on the processor (same graphs, same weights, no graphics card needed)
 */
export async function loadDirection(direction, device = 'wasm') {
  const pack = readManifest().packs[direction];
  if (!pack) throw new Error(`no pack for ${direction}`);
  const ort = await loadOrt();
  return createRuntime({ ort, pack, device, read: async (p) => { const b = readFileSync(join(NMT, p)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); } });
}
