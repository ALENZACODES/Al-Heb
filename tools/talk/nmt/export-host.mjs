#!/usr/bin/env node
// Writes the folder a pack host serves: the Talk language packs and the runtime's WebAssembly, and nothing else.
//   node tools/talk/nmt/export-host.mjs <empty folder>
// Push that folder as the whole content of the pack-host repository (for example ALENZACODES/alef-packs) and turn on GitHub Pages
// for it (Settings -> Pages -> Deploy from a branch -> main, / root). The app reads it at the address in data/talk/pack-host.json.
// .nojekyll is written because GitHub Pages otherwise hides folders whose names start with "_".
import { cpSync, mkdirSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const out = process.argv[2];
if (!out) { console.error('usage: export-host.mjs <empty folder>'); process.exit(2); }
if (existsSync(out) && readdirSync(out).some((n) => n !== '.git')) { console.error('the folder must be empty (a fresh clone of the pack-host repository is fine)'); process.exit(2); }
mkdirSync(join(out, '_ort'), { recursive: true });
cpSync(join(root, 'assets/vendor/_nmt'), join(out, '_nmt'), { recursive: true });
for (const n of readdirSync(join(root, 'assets/vendor/_ort'))) if (/\.(wasm|bin)$/.test(n) || /^LICENSE/.test(n)) cpSync(join(root, 'assets/vendor/_ort', n), join(out, '_ort', n));
writeFileSync(join(out, '.nojekyll'), '');
writeFileSync(join(out, 'README.md'), '# ALEF Language Packs\n\nStatic files for the ALEF Talk screen: two small Hebrew and English translation models (OPUS-MT, Apache-2.0) and the WebAssembly runtime that runs them (onnxruntime-web, MIT). Built from the ALEF repository with `node tools/talk/nmt/export-host.mjs`. Nothing here is edited by hand.\n');
writeFileSync(join(out, 'index.html'), '<!doctype html><meta charset="utf-8"><title>ALEF Language Packs</title><p>Static files for the ALEF Talk screen.</p>\n');
let files = 0; let bytes = 0;
const walk = (d) => { for (const n of readdirSync(d)) { if (n === '.git') continue; const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else { files++; bytes += statSync(p).size; } } };
walk(out);
console.log(`pack host folder ready: ${out} (${files} files, ${(bytes / 1048576).toFixed(1)} MiB)`);
