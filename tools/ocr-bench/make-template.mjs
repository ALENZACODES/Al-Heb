#!/usr/bin/env node
// Create a ground-truth TEMPLATE for your own real photos.
//   node tools/ocr-bench/make-template.mjs data/photo/real          (folder containing images/ with .jpg/.jpeg/.png/.webp/.heic-converted files)
// Writes <dir>/ground-truth.json. Then EDIT it: for each item type the visible Hebrew line by line into "lines" (pointed text for siddur
// pages is best; consonants-only is fine for signs/menus), set "kind" to siddur-line | siddur-page | sign, optionally "variant" (free
// label such as glare / angle / lowlight) and, for prayers, "source": "registry:<id>[+<id>...]" using ids from data/corpus/registry.json.
// Items with empty "lines" are rejected by bench.mjs. See docs/photo/BENCHMARK.md section "Run it on 50 real photos".
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
const dir = resolve(process.argv[2] || 'data/photo/real');
const imgDir = join(dir, 'images');
if (!existsSync(imgDir)) { console.error(`put your photos in ${imgDir} first`); process.exit(1); }
const files = readdirSync(imgDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
const items = files.map((f) => ({ id: f.replace(/\.[^.]+$/, ''), file: `images/${f}`, kind: 'sign', variant: 'real', lines: [''], source: '', synthetic: false, notes: '' }));
writeFileSync(join(dir, 'ground-truth.json'), JSON.stringify({ synthetic: false, note: 'REAL photos taken by the team. Fill in lines/kind.', items }, null, 1));
console.log(`wrote ${items.length} items to ${join(dir, 'ground-truth.json')}`);
