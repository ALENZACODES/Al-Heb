#!/usr/bin/env node
// Consistency check of the generated-image state (run any time; exit 1 on errors).
//   node tools/images/validate.mjs [--root DIR] [--originals DIR] [--strict-originals]
// Checks: provenance <-> files on disk <-> approvals <-> generated-manifest.json agree; only approved images are published;
// nothing flagged "contains_text" is published unless approved with an explicit force; ids exist in the manifest.

import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BLOCKING_FLAGS, buildGeneratedManifest, loadApprovals, loadManifest, loadProvenance, makePaths, readJson, sha256 } from './ingest_lib.mjs';

export function validate(opts = {}) {
  const p = opts.paths ?? makePaths(opts.root, { originals: opts.originals });
  const errors = []; const warnings = [];
  const rows = loadManifest(p.manifest); const stems = new Set(rows.map((r) => r.stem));
  const prov = loadProvenance(p); const ap = loadApprovals(p);
  const gen = readJson(p.generated, null);
  for (const [id, rec] of Object.entries(prov.images)) {
    if (!stems.has(id)) { errors.push(`${id}: in provenance but not in manifest.csv`); continue; }
    if (rec.id !== id) errors.push(`${id}: record id mismatch`);
    if (!rec.prompt || rec.promptSha256 !== sha256(rec.prompt)) errors.push(`${id}: prompt snapshot missing or hash mismatch`);
    if (!rec.ingestedAt || !rec.tool) errors.push(`${id}: provenance lacks date or tool`);
    if (!rec.variants?.length) errors.push(`${id}: no web variants recorded`);
    for (const v of rec.variants ?? []) if (!existsSync(join(p.genDir, v.file))) errors.push(`${id}: web file missing: assets/img/gen/${v.file}`);
    if (p.originals && existsSync(p.originals)) { if (!existsSync(join(p.originals, rec.originalFile))) warnings.push(`${id}: original ${rec.originalFile} not in ${p.originals}`); }
    const st = ap.approvals[id];
    if (st && (st.status === 'approved') !== rec.humanApproved) errors.push(`${id}: provenance.humanApproved disagrees with approvals.json (run: ingest.mjs manifest)`);
    if (!st && rec.humanApproved) errors.push(`${id}: humanApproved without an approval entry`);
    if (st?.status === 'approved') {
      const blocked = rec.flags.filter((f) => BLOCKING_FLAGS.includes(f));
      if (blocked.length && !st.forcedDespite) errors.push(`${id}: approved while flagged ${blocked.join(', ')} without a recorded force`);
      if (blocked.length && st.forcedDespite) warnings.push(`${id}: approved by force despite ${blocked.join(', ')}`);
      if (rec.flags.includes('ocr_not_run')) warnings.push(`${id}: approved but the text check never ran`);
    }
  }
  for (const [id, st] of Object.entries(ap.approvals)) {
    if (!prov.images[id]) errors.push(`${id}: has an approval but was never ingested`);
    if (!['approved', 'rejected'].includes(st.status)) errors.push(`${id}: bad status ${st.status}`);
  }
  if (!gen) errors.push('generated-manifest.json missing (run: ingest.mjs manifest)');
  else {
    const want = buildGeneratedManifest(prov, ap);
    if (JSON.stringify(want.images) !== JSON.stringify(gen.images)) errors.push('generated-manifest.json is out of date vs approvals.json (run: ingest.mjs manifest)');
    for (const id of Object.keys(gen.images)) if (ap.approvals[id]?.status !== 'approved') errors.push(`${id}: published but not approved`);
  }
  if (existsSync(p.genDir)) {
    const known = new Set(Object.values(prov.images).flatMap((r) => r.variants.map((v) => v.file)));
    for (const f of readdirSync(p.genDir)) if (!known.has(f)) warnings.push(`assets/img/gen/${f}: not in provenance (orphan)`);
  }
  return { errors, warnings, ingested: Object.keys(prov.images).length, approved: Object.values(ap.approvals).filter((x) => x.status === 'approved').length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2); const val = (k) => { const i = a.indexOf(k); return i >= 0 ? resolve(a[i + 1]) : undefined; };
  const r = validate({ root: val('--root'), originals: val('--originals') });
  for (const w of r.warnings) console.log(`warn  ${w}`);
  for (const e of r.errors) console.log(`ERROR ${e}`);
  console.log(`${r.ingested} ingested, ${r.approved} approved, ${r.errors.length} error(s), ${r.warnings.length} warning(s)`);
  process.exitCode = r.errors.length ? 1 : 0;
}
