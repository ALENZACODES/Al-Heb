#!/usr/bin/env node
// Splits an exported translation pack (tools/talk/nmt/export.py) into parts the site can host and writes the manifest the app reads.
//   node tools/talk/nmt/pack.mjs <export dir> <direction> <model name> <licence>     e.g. ... /tmp/he-en he-en "OPUS-MT Tatoeba heb-eng (2021-02-19)" Apache-2.0
//   node tools/talk/nmt/pack.mjs --add-gpu <export dir> <direction>                   add the graphics-card graphs (gpu_graph.py) to a pack already split
//   node tools/talk/nmt/pack.mjs --manifest                                          rebuild assets/vendor/_nmt/manifest.json from what is on disk
// Parts are at most 16 MiB so every static host takes them (one host caps a file at 25 MiB), and so a broken download resumes part by part.
// The manifest lists every file with its size and SHA-256; the app checks both before it uses a part.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const NMT = join(root, 'assets', 'vendor', '_nmt');
const ORT = join(root, 'assets', 'vendor', '_ort');
const PART = 16 * 1024 * 1024;
const sha = (buf) => createHash('sha256').update(buf).digest('hex');

function splitPack(src, direction, model, licence) {
  const out = join(NMT, direction);
  rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
  const files = [];
  for (const name of ['table.onnx', 'encoder.onnx', 'decoder.onnx', 'vocab.json']) {
    const buf = readFileSync(join(src, name));
    const stem = name.replace(/\.[a-z]+$/, '');
    const parts = [];
    if (name.endsWith('.json')) { writeFileSync(join(out, name), buf); parts.push({ path: `${direction}/${name}`, bytes: buf.length, sha256: sha(buf) }); }
    else for (let i = 0, n = 0; i < buf.length; i += PART, n++) { const piece = buf.subarray(i, i + PART); const p = `${stem}.p${n}.bin`; writeFileSync(join(out, p), piece); parts.push({ path: `${direction}/${p}`, bytes: piece.length, sha256: sha(piece) }); }
    files.push({ name, bytes: buf.length, sha256: sha(buf), parts });
  }
  // The graphics-card graphs (tools/talk/nmt/gpu_graph.py): wiring only, a few hundred KB; their weights are read from the files above.
  const gpu = [];
  for (const name of ['encoder.gpu.onnx', 'decoder.gpu.onnx']) {
    if (!existsSync(join(src, name))) continue;
    const buf = readFileSync(join(src, name)); writeFileSync(join(out, name), buf);
    gpu.push({ name, bytes: buf.length, sha256: sha(buf), parts: [{ path: `${direction}/${name}`, bytes: buf.length, sha256: sha(buf) }] });
  }
  writeFileSync(join(out, 'pack.json'), JSON.stringify({ schema: 'alef.talk.nmt.pack.v1', direction, model, licence, bytes: files.reduce((a, f) => a + f.bytes, 0), files, gpu }, null, 1) + '\n');
}

/** Adds the graphics-card graphs to a pack that is already split, without touching its parts. */
function addGpu(src, direction) {
  const file = join(NMT, direction, 'pack.json'); const pack = JSON.parse(readFileSync(file, 'utf8'));
  pack.gpu = [];
  for (const name of ['encoder.gpu.onnx', 'decoder.gpu.onnx']) {
    const buf = readFileSync(join(src, name)); writeFileSync(join(NMT, direction, name), buf);
    pack.gpu.push({ name, bytes: buf.length, sha256: sha(buf), parts: [{ path: `${direction}/${name}`, bytes: buf.length, sha256: sha(buf) }] });
  }
  writeFileSync(file, JSON.stringify(pack, null, 1) + '\n');
}

function manifest() {
  const runtime = ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm'].map((name) => { const buf = readFileSync(join(ORT, name)); return { path: name, bytes: buf.length, sha256: sha(buf) }; });
  const packs = {};
  for (const d of readdirSync(NMT)) { const p = join(NMT, d, 'pack.json'); if (existsSync(p) && statSync(join(NMT, d)).isDirectory()) packs[d] = JSON.parse(readFileSync(p, 'utf8')); }
  // The runtime for browsers with a usable graphics card: it runs both ways, so such a browser fetches this one only.
  // Its WebAssembly file is over one host's 25 MiB cap, so it is stored in parts and joined on the device.
  const gpuNames = ['ort.webgpu.min.mjs', 'ort-wasm-simd-threaded.asyncify.mjs', ...readdirSync(ORT).filter((n) => /^ort-wasm-simd-threaded\.asyncify\.p\d+\.bin$/.test(n)).sort((a, b) => Number(a.match(/p(\d+)/)[1]) - Number(b.match(/p(\d+)/)[1]))];
  const gpuFiles = existsSync(join(ORT, 'ort.webgpu.min.mjs')) ? gpuNames.map((name) => { const buf = readFileSync(join(ORT, name)); return { path: name, bytes: buf.length, sha256: sha(buf) }; }) : [];
  const gpuRuntime = gpuFiles.length ? { base: '../_ort/', bytes: gpuFiles.reduce((a, f) => a + f.bytes, 0), files: gpuFiles } : null;
  const version = sha(JSON.stringify([runtime, gpuRuntime, packs])).slice(0, 12);
  writeFileSync(join(NMT, 'manifest.json'), JSON.stringify({ schema: 'alef.talk.nmt.manifest.v1', version, runtime: { base: '../_ort/', bytes: runtime.reduce((a, f) => a + f.bytes, 0), files: runtime }, gpuRuntime, packs }, null, 1) + '\n');
  console.log('manifest', version, Object.entries(packs).map(([d, p]) => `${d} ${(p.bytes / 1048576).toFixed(1)} MiB`).join(', '), `runtime ${(runtime.reduce((a, f) => a + f.bytes, 0) / 1048576).toFixed(1)} MiB`);
}

const args = process.argv.slice(2);
if (args[0] === '--add-gpu') { addGpu(args[1], args[2]); }
else if (args[0] !== '--manifest') { if (args.length < 4) { console.error('usage: pack.mjs <export dir> <direction> <model name> <licence> | --manifest'); process.exit(2); } splitPack(args[0], args[1], args[2], args[3]); }
manifest();
