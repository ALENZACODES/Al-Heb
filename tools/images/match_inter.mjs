#!/usr/bin/env node
// Dry-run check of a folder of returned intermediate-lesson images against the slot list. Reads nothing but file names
// (and, when Pillow is present, nothing else); writes nothing. Exit code 1 when a file is unmatched or a duplicate.
//   node tools/images/match_inter.mjs <folder> [--json]
// Convention: a returned file is named <slot id>.png (I-01-img1.png). Browser duplicate suffixes such as " (1)" or " copy"
// are reported as variants, never silently used (same rule as ingest.mjs). Case differences are reported and accepted.
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSlots } from './build_inter.mjs';
import { classifyName, isImageName } from './ingest_lib.mjs';

/** Pure: classify file names against slot ids. */
export function matchNames(names, slotIds) {
  const ids = new Set(slotIds);
  const res = { matched: [], caseFixed: [], variants: [], unmatched: [], duplicates: [], missing: [], ignored: [] };
  const seen = new Map();
  for (const n of names) {
    if (!isImageName(n)) { res.ignored.push(n); continue; }
    const c = classifyName(n, ids);
    if (c.kind === 'none') { res.unmatched.push(n); continue; }
    if (c.kind === 'variant') { res.variants.push({ file: n, id: c.stem }); continue; }
    if (c.kind === 'case') res.caseFixed.push({ file: n, id: c.stem });
    if (seen.has(c.stem)) { res.duplicates.push({ id: c.stem, files: [seen.get(c.stem), n] }); continue; }
    seen.set(c.stem, n);
    res.matched.push({ file: n, id: c.stem });
  }
  res.missing = slotIds.filter((id) => !seen.has(id));
  return res;
}

export function matchFolder(dir, slotIds = loadSlots().map((s) => s.id)) {
  const names = readdirSync(dir).filter((n) => statSync(join(dir, n)).isFile());
  return matchNames(names, slotIds);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (!dir) { console.error('usage: node tools/images/match_inter.mjs <folder> [--json]'); process.exit(2); }
  const r = matchFolder(resolve(dir));
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 1));
  else {
    console.log(`matched ${r.matched.length} of 100 slots; missing ${r.missing.length}; unmatched files ${r.unmatched.length}; variants ${r.variants.length}; duplicates ${r.duplicates.length}; case-fixed ${r.caseFixed.length}`);
    for (const k of ['unmatched', 'variants', 'duplicates', 'caseFixed']) for (const x of r[k]) console.log(`  ${k}: ${typeof x === 'string' ? x : JSON.stringify(x)}`);
    if (r.missing.length) console.log(`  missing: ${r.missing.join(' ')}`);
  }
  process.exitCode = r.unmatched.length || r.duplicates.length ? 1 : 0;
}
