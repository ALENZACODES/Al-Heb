#!/usr/bin/env node
// Dry-run check of a folder of returned Run 3 images (named by run3 id: TROPE_etnachta_mnemonic.png, CRAFT_bimah_01.png ...)
// against data/images/run3.csv. Reads file names (and pixel sizes when Pillow is present), writes nothing.
//   node tools/images/match_run3.mjs <folder> [--json] [--block I]
// Same rules as match_blockj.mjs: exact name, case differences accepted and reported, browser suffixes (" (1)", " copy") listed
// as variants and never used, a second file for the same id is a duplicate. Aspect is checked against the row's width x height.
// Also reports, per command (150-249), how many of its ten images are present, so you know which command to resume.
// The image tool returns hashed names (exec-<uuid>.png); rename to the run3 id first (see docs/images/RUN3.md), then run this.
import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchNames } from './match_inter.mjs';
import { imageSizes, wrongAspect } from './match_blockj.mjs';
import { loadRun3 } from './build_run3.mjs';

export function matchRun3(names, rows = loadRun3()) {
  const res = matchNames(names, rows.map((r) => r.id));
  const have = new Set(res.matched.map((m) => m.id));
  const per = new Map();
  for (const r of rows) {
    const c = Number(r.command);
    const e = per.get(c) ?? { command: c, block: r.block, set: r.set, total: 0, present: 0 };
    e.total++; if (have.has(r.id)) e.present++; per.set(c, e);
  }
  res.perCommand = [...per.values()].sort((a, b) => a.command - b.command);
  return res;
}

export function matchFolder(dir, rows = loadRun3()) {
  const names = readdirSync(dir).filter((n) => statSync(resolve(dir, n)).isFile());
  const res = matchRun3(names, rows);
  res.wrongAspect = wrongAspect(res.matched, imageSizes(dir, res.matched.map((m) => m.file)), rows);
  return res;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const dir = a.find((x, i) => !x.startsWith('--') && a[i - 1] !== '--block');
  if (!dir) { console.error('usage: node tools/images/match_run3.mjs <folder> [--json] [--block I]'); process.exit(2); }
  const bi = a.indexOf('--block');
  let rows = loadRun3();
  if (bi >= 0) rows = rows.filter((r) => r.block === a[bi + 1]);
  if (!rows.length) { console.error('data/images/run3.csv has no rows (run node tools/images/build_run3.mjs)'); process.exit(2); }
  const r = matchFolder(resolve(dir), rows);
  if (a.includes('--json')) console.log(JSON.stringify(r, null, 1));
  else {
    console.log(`matched ${r.matched.length} of ${rows.length}; missing ${r.missing.length}; unmatched files ${r.unmatched.length}; variants ${r.variants.length}; duplicates ${r.duplicates.length}; wrong aspect ${r.wrongAspect.length}; case-fixed ${r.caseFixed.length}`);
    for (const k of ['unmatched', 'variants', 'duplicates', 'caseFixed', 'wrongAspect']) for (const x of r[k].slice(0, 15)) console.log(`  ${k}: ${typeof x === 'string' ? x : JSON.stringify(x)}`);
    for (const p of r.perCommand.filter((p) => p.present !== p.total && p.present > 0)) console.log(`  incomplete command ${p.command} (${p.set}): ${p.present}/${p.total}`);
    const none = r.perCommand.filter((p) => p.present === 0).length;
    if (none) console.log(`  ${none} command(s) have no image returned yet`);
  }
  process.exitCode = r.unmatched.length || r.duplicates.length || r.wrongAspect.length ? 1 : 0;
}
