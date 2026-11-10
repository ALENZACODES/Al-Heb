#!/usr/bin/env node
// Appends pending-list rows (data/images/inter-pending.csv, data/images/block-j.csv; extra columns are ignored, only the 8 manifest columns are written) to data/images/manifest.csv so that
// `ingest.mjs` can match returned files to them. Existing rows are never rewritten or reordered: the old file bytes are kept
// as they are and only new rows are added at the end. Idempotent: a row whose file stem is already in the manifest is skipped.
//   node tools/images/append_manifest_rows.mjs --dry-run [csv ...]     report what would be appended, write nothing
//   node tools/images/append_manifest_rows.mjs [csv ...]               append (default csv: data/images/inter-pending.csv)
//   --manifest FILE   target manifest (default data/images/manifest.csv)
// NOTE: other tools treat manifest.csv as "everything generated so far plus the pending commands 1-101" (next1000, paste files),
// so append only when you are about to ingest returned files for these rows, not earlier.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STEM_RE, csvCell, parseCsv, writeTextAtomic } from './ingest_lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const HEAD = ['file', 'set', 'command', 'block', 'width', 'height', 'status', 'prompt'];
export const DEFAULT_SOURCES = [join(ROOT, 'data/images/inter-pending.csv')];

/** Reads a CSV that has the manifest columns (by name; extra columns such as block-j.csv's id, key, alt are ignored) into row objects. */
export function readRows(path) {
  const [head, ...body] = parseCsv(readFileSync(path, 'utf8'));
  if (!head || HEAD.some((h) => !head.includes(h))) throw new Error(`${path}: header must contain the columns ${HEAD.join(',')}`);
  const at = Object.fromEntries(HEAD.map((h) => [h, head.indexOf(h)]));
  return body.map((r) => Object.fromEntries(HEAD.map((h) => [h, r[at[h]] ?? ''])));
}

/** Pure: which source rows are new, which are already present, which are invalid. */
export function plan(existingRows, sourceRows) {
  const have = new Set(existingRows.map((r) => r.file.replace(/\.png$/i, '')));
  const out = { append: [], present: [], invalid: [] };
  for (const r of sourceRows) {
    const stem = r.file.replace(/\.png$/i, '');
    if (!/\.png$/i.test(r.file) || !STEM_RE.test(stem)) { out.invalid.push({ file: r.file, reason: 'file must be <safe stem>.png' }); continue; }
    if (![r.width, r.height, r.command].every((v) => /^\d+$/.test(v))) { out.invalid.push({ file: r.file, reason: 'width, height and command must be whole numbers' }); continue; }
    if (!r.prompt) { out.invalid.push({ file: r.file, reason: 'empty prompt' }); continue; }
    if (have.has(stem)) { out.present.push(r.file); continue; }
    have.add(stem); out.append.push(r);
  }
  return out;
}

/** Text to add after the existing file text (adds the missing final newline first). */
export function appendText(existingText, rows) {
  const lead = existingText.length && !existingText.endsWith('\n') ? '\n' : '';
  return lead + rows.map((r) => HEAD.map((h) => csvCell(r[h])).join(',')).join('\n') + (rows.length ? '\n' : '');
}

export function run({ manifest = join(ROOT, 'data/images/manifest.csv'), sources = DEFAULT_SOURCES, dry = false } = {}) {
  const text = readFileSync(manifest, 'utf8');
  const existing = readRows(manifest);
  const res = { manifest, dry, appended: 0, present: 0, invalid: [], perSource: [] };
  let acc = existing, add = [];
  for (const s of sources) {
    if (!existsSync(s)) throw new Error(`${s}: not found`);
    const p = plan(acc, readRows(s));
    res.perSource.push({ source: s, append: p.append.length, present: p.present.length, invalid: p.invalid.length });
    res.present += p.present.length; res.invalid.push(...p.invalid);
    add = add.concat(p.append); acc = acc.concat(p.append);
  }
  res.appended = add.length;
  if (!dry && !res.invalid.length && add.length) writeTextAtomic(manifest, text + appendText(text, add));
  res.wrote = !dry && !res.invalid.length && add.length > 0;
  return res;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2); const mi = a.indexOf('--manifest');
  const manifest = mi >= 0 ? resolve(a[mi + 1]) : undefined;
  const sources = a.filter((x, i) => !x.startsWith('--') && a[i - 1] !== '--manifest').map((x) => resolve(x));
  try {
    const r = run({ manifest, sources: sources.length ? sources : DEFAULT_SOURCES, dry: a.includes('--dry-run') });
    for (const s of r.perSource) console.log(`${s.source}: ${s.append} new, ${s.present} already in manifest, ${s.invalid} invalid`);
    for (const i of r.invalid) console.log(`INVALID ${i.file}: ${i.reason}`);
    console.log(`${r.dry ? '[dry run] would append' : r.wrote ? 'appended' : 'nothing appended:'} ${r.appended} row(s) to ${r.manifest}${r.invalid.length ? ' (not written: fix the invalid rows)' : ''}`);
    process.exitCode = r.invalid.length ? 1 : 0;
  } catch (e) { console.error(e.message); process.exitCode = 2; }
}
