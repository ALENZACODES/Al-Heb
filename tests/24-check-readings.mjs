// Read-only helper for handoff item 24 (rule-generated readings need word-level validation).
// Usage (from the repo root):  node tests/24-check-readings.mjs <rows.csv> [--out report.md]
// Input CSV, header required, columns: id,he,reading   (he = pointed Hebrew; reading = the package's stored reading)
// For each row it runs the app's own engines (syllabifyWord, transliterate) and prints the engine reading, whether it
// agrees with the stored reading after loose normalisation, the stress rule used, and the confidence reasons.
// It decides nothing: every disagreement, and every row whose level is "low", goes to a reviewer. Agreement is not
// proof of correctness. It writes nothing unless --out is given, and never touches the repo data.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const out = outIdx >= 0 ? args.splice(outIdx, 2)[1] : null;
const file = args[0];
if (!file) { console.error('usage: node 24-check-readings.mjs <rows.csv> [--out report.md]'); process.exit(2); }

const root = resolve(new URL('../', import.meta.url).pathname);
const { syllabifyWord } = await import(pathToFileURL(resolve(root, 'src/photo/syllabify.js')));
const { transliterate } = await import(pathToFileURL(resolve(root, 'src/pronunciation/transliterate.js')));

const parseCsv = (txt) => txt.replace(/^﻿/, '').split(/\r?\n/).filter(Boolean).map((line) => {
  const cells = []; let cur = '', q = false;
  for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { cells.push(cur); cur = ''; } else cur += ch; }
  cells.push(cur); return cells;
});
const norm = (s) => String(s ?? '').toLowerCase().replace(/\(.*$/, '').split('/')[0].replace(/kh/g, 'ch').replace(/[^a-z]/g, '');

const [head, ...rows] = parseCsv(readFileSync(file, 'utf8'));
const col = (n) => head.findIndex((h) => h.trim().toLowerCase() === n);
const [ci, ch, cr] = [col('id'), col('he'), col('reading')];
if (ch < 0 || cr < 0) { console.error('header must contain he and reading (and optionally id)'); process.exit(2); }

const lines = ['| id | he | stored | engine | agree | stress rule | level | reasons |', '|---|---|---|---|---|---|---|---|'];
let agree = 0, disagree = 0, unpointed = 0;
for (const r of rows) {
  const he = r[ch]?.trim(), stored = r[cr]?.trim(), id = ci >= 0 ? r[ci]?.trim() : '';
  const syl = syllabifyWord(he);
  if (!syl.length) { unpointed++; lines.push(`| ${id} | ${he} | ${stored} | (no reading: unpointed) | n/a | | | |`); continue; }
  const eng = transliterate(he, { scheme: 'siddur', tradition: 'israeli', finalHe: 'silent' });
  const engText = typeof eng === 'string' ? eng : (eng?.text ?? JSON.stringify(eng));
  const ok = norm(engText) === norm(stored);
  ok ? agree++ : disagree++;
  lines.push(`| ${id} | ${he} | ${stored} | ${engText} | ${ok ? 'yes' : 'NO'} | ${syl.stressRule ?? ''} | ${syl.confidence?.level ?? ''} | ${(syl.confidence?.reasons ?? []).join(', ')} |`);
}
const report = [`Rows: ${rows.length}; agree ${agree}; disagree ${disagree}; unpointed ${unpointed}.`, 'Agreement is not proof; every disagreement and every "low" row needs a qualified reviewer.', '', ...lines].join('\n');
if (out) writeFileSync(out, report + '\n'); else console.log(report);
