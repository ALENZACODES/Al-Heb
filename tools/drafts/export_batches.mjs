#!/usr/bin/env node
// Writes input batches for an outside drafting assistant: docs/drafts/batches/batch-NN-<kind>.csv  (columns: id,kind,group,he)
// Source: data/tts/soundwords.israeli.json (the widest id list). Order: letters, vowels, syllables, prayer lines, prayer words, then words.
//   node tools/drafts/export_batches.mjs          write the files
//   node tools/drafts/export_batches.mjs --check  exit 1 if the files are stale
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'docs/drafts/batches');
const SIZE = 100;
const ORDER = ['letter', 'vowel', 'syllable', 'line', 'prayer', 'word'];
const items = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/tts/soundwords.israeli.json'), 'utf8')).items;
const q = (s) => (/[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s);
const files = new Map();
let n = 0;
for (const kind of ORDER) {
  const rows = items.filter((r) => r.kind === kind);
  for (let i = 0; i < rows.length; i += SIZE) {
    n += 1;
    const name = `batch-${String(n).padStart(2, '0')}-${kind}.csv`;
    const body = ['id,kind,group,he', ...rows.slice(i, i + SIZE).map((r) => [r.id, r.kind, r.group, r.he].map(q).join(','))].join('\n') + '\n';
    files.set(name, body);
  }
}
const check = process.argv.includes('--check');
if (check) {
  let bad = 0;
  const have = fs.existsSync(OUT) ? fs.readdirSync(OUT).filter((f) => f.endsWith('.csv')) : [];
  for (const [name, body] of files) if (!fs.existsSync(path.join(OUT, name)) || fs.readFileSync(path.join(OUT, name), 'utf8') !== body) bad += 1;
  for (const f of have) if (!files.has(f)) bad += 1;
  console.log(bad ? `${bad} stale file(s)` : `batches current (${files.size} files, ${items.length} rows)`);
  process.exit(bad ? 1 : 0);
}
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith('.csv')) fs.unlinkSync(path.join(OUT, f));
for (const [name, body] of files) fs.writeFileSync(path.join(OUT, name), body);
console.log(`wrote ${files.size} files, ${items.length} rows`);
