#!/usr/bin/env node
// Dry-run check of a folder of returned block J images (J-NNNN.png) against data/images/block-j.csv. Reads file names only, writes nothing.
//   node tools/images/match_blockj.mjs <folder> [--json]
// Same rules as match_inter.mjs / ingest.mjs: exact name, case differences accepted and reported, browser suffixes (" (1)", " copy") listed as variants and never used.
// Also reports, per paste file (j-NN.txt), how many of its images are present, so you can see which file to re-run.
import { readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchNames } from './match_inter.mjs';
import { loadBlockJ } from './block_j_rows.mjs';

const PASTE = join(fileURLToPath(new URL('../..', import.meta.url)), 'docs/images/paste');

/** command -> paste file name (j-NN.txt), by position of the command among block J commands. */
export function pasteFileByCommand(rows) {
  const cmds = [...new Set(rows.map((r) => Number(r.command)))].sort((a, b) => a - b);
  return new Map(cmds.map((c, i) => [c, `j-${String(i + 1).padStart(2, '0')}.txt`]));
}

export function matchBlockJ(names, rows = loadBlockJ()) {
  const res = matchNames(names, rows.map((r) => r.id));
  const files = pasteFileByCommand(rows);
  const have = new Set(res.matched.map((m) => m.id));
  const per = new Map();
  for (const r of rows) {
    const f = files.get(Number(r.command));
    const e = per.get(f) ?? { file: f, total: 0, present: 0 };
    e.total++; if (have.has(r.id)) e.present++; per.set(f, e);
  }
  res.perPasteFile = [...per.values()];
  return res;
}

/** Pixel sizes of the given files via python3 -I + PIL: Map file -> [w, h] (files PIL cannot read are left out). */
export function imageSizes(dir, files) {
  const code = 'import sys,os\nfrom PIL import Image\nfor f in sys.argv[2:]:\n    try:\n        w,h=Image.open(os.path.join(sys.argv[1],f)).size\n        print(f+"\\t"+str(w)+"\\t"+str(h))\n    except Exception:\n        pass\n';
  const r = spawnSync('python3', ['-I', '-c', code, dir, ...files], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const m = new Map();
  if (r.status !== 0) return m;
  for (const l of r.stdout.split('\n')) { const [f, w, h] = l.split('\t'); if (f && h) m.set(f, [Number(w), Number(h)]); }
  return m;
}
/** Pure: matched files whose width/height ratio differs from the row's expected ratio by more than `tol` (default 3%). */
export function wrongAspect(matched, sizes, rows, tol = 0.03) {
  const by = new Map(rows.map((r) => [r.id, r]));
  const bad = [];
  for (const { file, id } of matched) {
    const sz = sizes.get(file), r = by.get(id);
    if (!sz || !r) continue;
    const want = Number(r.width) / Number(r.height), got = sz[0] / sz[1];
    if (Math.abs(got / want - 1) > tol) bad.push({ file, id, expected: `${r.aspect} (${r.width}x${r.height})`, got: `${sz[0]}x${sz[1]}` });
  }
  return bad;
}

export function matchFolder(dir, rows = loadBlockJ()) {
  const res = matchBlockJ(readdirSync(dir).filter((n) => statSync(join(dir, n)).isFile()), rows);
  res.wrongAspect = wrongAspect(res.matched, imageSizes(dir, res.matched.map((m) => m.file)), rows);
  return res;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!dir) { console.error('usage: node tools/images/match_blockj.mjs <folder> [--json]'); process.exit(2); }
  const rows = loadBlockJ();
  if (!rows.length) { console.error('data/images/block-j.csv has no rows'); process.exit(2); }
  const r = matchFolder(resolve(dir), rows);
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 1));
  else {
    console.log(`matched ${r.matched.length} of ${rows.length}; missing ${r.missing.length}; unmatched files ${r.unmatched.length}; variants ${r.variants.length}; duplicates ${r.duplicates.length}; wrong aspect ${r.wrongAspect.length}; case-fixed ${r.caseFixed.length}`);
    for (const k of ['unmatched', 'variants', 'duplicates', 'caseFixed', 'wrongAspect']) for (const x of r[k].slice(0, 15)) console.log(`  ${k}: ${typeof x === 'string' ? x : JSON.stringify(x)}`);
    const part = r.perPasteFile.filter((p) => p.present !== p.total && p.present > 0);
    for (const p of part) console.log(`  incomplete ${p.file}: ${p.present}/${p.total}`);
    const none = r.perPasteFile.filter((p) => p.present === 0).length;
    if (none) console.log(`  ${none} paste file(s) have no image returned yet`);
  }
  process.exitCode = r.unmatched.length || r.duplicates.length || r.wrongAspect.length ? 1 : 0;
}
