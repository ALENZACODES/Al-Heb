#!/usr/bin/env node
import { manifestText } from './manifest_io.mjs';
// Reconcile manifest rows that say "missing" with clips that exist on disk and carry a sidecar.
//   node tools/audio/mark_present.mjs [--dry-run]
// For every manifest entry whose status is "missing" and whose file exists under audio/ WITH a <clip>.mp3.meta.json sidecar
// holding a synthetic status, the entry takes the sidecar's status, source and synth (exactly what tools/audio/build_manifest.mjs
// would read for it). A file without a sidecar is left alone and listed: its provenance cannot be stated, so it is not claimed.
// Never writes "recorded". Rewrites data/audio/summary.json afterwards (tools/audio/summary.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSyntheticStatus } from '../../src/shell/audio-labels.js';
import { summaryOf, summaryText, SUMMARY_FILE } from './summary.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const FILES = ['data/audio/manifest.json', 'data/audio/manifest-kind-word.json', 'data/audio/manifest-words-israeli.json', 'data/audio/manifest-words-sephardi.json', 'data/audio/manifest-words-ashkenazi.json'];

export function markPresent({ root = ROOT, dry = false } = {}) {
  const res = { marked: [], noSidecar: [], badSidecar: [] };
  const all = [];
  for (const rel of FILES) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    const list = JSON.parse(fs.readFileSync(abs, 'utf8'));
    let changed = false;
    for (const e of list) {
      if ((e.status !== 'missing' && e.status !== 'plays-israeli') || !e.path || !fs.existsSync(path.join(root, e.path))) continue; // a clip of its own now exists
      const metaRel = `${e.path}.meta.json`;
      if (!fs.existsSync(path.join(root, metaRel))) { res.noSidecar.push(e.path); continue; }
      let m;
      try { m = JSON.parse(fs.readFileSync(path.join(root, metaRel), 'utf8')); } catch { res.badSidecar.push(`${metaRel}: unreadable`); continue; }
      if (!isSyntheticStatus(m.status)) { res.badSidecar.push(`${metaRel}: status ${m.status} is not a synthetic status`); continue; }
      e.status = m.status;
      e.source = m.source ? String(m.source) : 'file-present-provenance-unverified';
      delete e.equivalentTo; delete e.plays; // the stand-in rules are listed per id only for entries with no clip of their own (data/audio/equivalence.json)
      if (m.synth && typeof m.synth === 'object') { delete e.synth; e.synth = m.synth; } // last key, as build_manifest.mjs writes it
      res.marked.push(e.path);
      changed = true;
    }
    all.push(...list);
    if (changed && !dry) fs.writeFileSync(abs, manifestText(list));
  }
  if (!dry) fs.writeFileSync(path.join(root, SUMMARY_FILE), summaryText(summaryOf(all, root)));
  return res;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dry = process.argv.includes('--dry-run');
  const r = markPresent({ dry });
  console.log(`${dry ? 'DRY RUN: would mark' : 'marked'} ${r.marked.length} entries from their sidecars`);
  for (const p of r.marked) console.log('  ' + p);
  for (const p of r.noSidecar) console.warn(`left as missing (file present, no sidecar): ${p}`);
  for (const p of r.badSidecar) console.warn(`left as missing: ${p}`);
}
