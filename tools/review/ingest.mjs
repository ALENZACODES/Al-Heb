#!/usr/bin/env node
// Reads returned reviewer CSVs, validates them against the current packs, and records verdicts in
// data/review/verdicts.json. Dry run unless --write. Never edits content files; Fix rows are suggestions only.
// Usage: node tools/review/ingest.mjs FILE.csv... --reviewer NAME --type teacher|cantor|native --date YYYY-MM-DD
//        [--write] [--partial] [--allow-stale] [--root DIR] [--out FILE]
// Exit: 0 clean, 1 rejected rows or file errors (nothing written unless --partial), 2 usage error.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll, idIndex, parseCsv, COLUMNS } from './packs-lib.mjs';
import { REVIEWER_TYPES } from './instructions.mjs';
import { loadVerdicts, serialise } from './verdicts-lib.mjs';

const nfc = (t) => String(t == null ? '' : t).normalize('NFC').trim();

export function parseArgs(argv) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const o = { files: [], reviewer: '', type: '', date: '', write: false, partial: false, allowStale: false, root: path.resolve(here, '..', '..'), out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--reviewer') o.reviewer = argv[++i] || '';
    else if (a === '--type') o.type = argv[++i] || '';
    else if (a === '--date') o.date = argv[++i] || '';
    else if (a === '--write') o.write = true;
    else if (a === '--partial') o.partial = true;
    else if (a === '--allow-stale') o.allowStale = true;
    else if (a === '--root') o.root = path.resolve(argv[++i]);
    else if (a === '--out') o.out = path.resolve(argv[++i]);
    else if (a.startsWith('--')) throw new Error('unknown option ' + a);
    else o.files.push(a);
  }
  o.out = o.out || path.join(o.root, 'data', 'review', 'verdicts.json');
  return o;
}

export function normVerdict(v) {
  const t = String(v || '').trim().toLowerCase();
  if (t === 'ok') return 'OK';
  if (t === 'fix') return 'Fix';
  if (t === 'unsure') return 'Unsure';
  return t === '' ? '' : null;
}

export function ingest(o, index) {
  const problems = [];
  if (!o.files.length) problems.push('no input CSV given');
  if (!o.reviewer.trim()) problems.push('--reviewer NAME is required');
  if (!REVIEWER_TYPES[o.type]) problems.push(`--type must be one of ${Object.keys(REVIEWER_TYPES).join(', ')}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(o.date)) problems.push('--date YYYY-MM-DD is required');
  if (problems.length) return { usage: problems };

  const store = loadVerdicts(o.out);
  const before = serialise(store);
  const accepted = [], rejected = [], fileErrors = [];
  let blank = 0, rowsSeen = 0;
  for (const file of o.files) {
    let rows;
    try { rows = parseCsv(fs.readFileSync(file, 'utf8')); } catch (e) { fileErrors.push(`${file}: ${e.message}`); continue; }
    if (!rows.length) { fileErrors.push(`${file}: empty`); continue; }
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const col = Object.fromEntries(COLUMNS.map((c) => [c, head.indexOf(c)]));
    const missing = ['id', 'hebrew', 'verdict', 'correction', 'notes'].filter((c) => col[c] < 0);
    if (missing.length) { fileErrors.push(`${file}: missing column(s) ${missing.join(', ')}`); continue; }
    const seen = new Map();
    rows.slice(1).forEach((r, k) => {
      const line = k + 2;
      const get = (c) => (col[c] >= 0 ? (r[col[c]] ?? '') : '');
      const id = get('id').trim();
      rowsSeen++;
      const bad = (why) => rejected.push({ file, line, id, why });
      const v = normVerdict(get('verdict'));
      if (v === '') { blank++; return; }
      if (!index.has(id)) return bad('unknown id');
      if (v === null) return bad(`verdict "${get('verdict').trim()}" is not OK, Fix or Unsure`);
      const correction = get('correction').trim(), notes = get('notes').trim();
      if (v === 'Fix' && !correction) return bad('Fix needs a correction');
      const cur = index.get(id);
      if (!o.allowStale && nfc(get('hebrew')) !== nfc(cur.hebrew)) return bad('Hebrew differs from the current data (stale sheet); regenerate the pack or use --allow-stale');
      const entry = { reviewerType: o.type, reviewer: o.reviewer.trim(), date: o.date, verdict: v, correction, notes, hebrewSeen: nfc(cur.hebrew) };
      if (seen.has(id)) { const p = seen.get(id); if (p.verdict === v && p.correction === correction && p.notes === notes) return; return bad(`duplicate id with different answer (first at line ${p.line})`); }
      seen.set(id, { ...entry, line });
      accepted.push({ id, entry, file, line });
    });
  }
  const blocked = (rejected.length || fileErrors.length) && !o.partial;
  let added = 0, changed = 0, same = 0;
  const next = { ...store, verdicts: JSON.parse(JSON.stringify(store.verdicts)) };
  if (!blocked) for (const a of accepted) {
    const list = next.verdicts[a.id] || (next.verdicts[a.id] = []);
    const i = list.findIndex((e) => e.reviewerType === a.entry.reviewerType && e.reviewer === a.entry.reviewer);
    if (i < 0) { list.push(a.entry); added++; }
    else if (JSON.stringify(list[i]) === JSON.stringify(a.entry)) same++;
    else { list[i] = a.entry; changed++; }
  }
  const text = serialise(next);
  const willWrite = o.write && !blocked && text !== before;
  return { accepted: accepted.length, rejected, fileErrors, blank, rowsSeen, added, changed, same, blocked: !!blocked, text, willWrite, changedFile: text !== before };
}

export function main(argv) {
  let o;
  try { o = parseArgs(argv); } catch (e) { console.error(e.message); return 2; }
  const index = idIndex(buildAll(o.root));
  const r = ingest(o, index);
  if (r.usage) { console.error('usage problems:\n- ' + r.usage.join('\n- ')); return 2; }
  console.log(`${o.write ? 'WRITE' : 'DRY RUN'}: rows ${r.rowsSeen}; blank (not reviewed) ${r.blank}; accepted ${r.accepted}; rejected ${r.rejected.length}`);
  for (const e of r.fileErrors) console.log('FILE ERROR ' + e);
  for (const x of r.rejected.slice(0, 50)) console.log(`REJECT ${path.basename(x.file)}:${x.line} ${x.id || '(no id)'}: ${x.why}`);
  if (r.rejected.length > 50) console.log(`... ${r.rejected.length - 50} more rejected rows`);
  if (r.blocked) console.log('Nothing recorded: fix the problems above, or pass --partial to record only the accepted rows.');
  else console.log(`new ${r.added}, changed ${r.changed}, unchanged ${r.same}`);
  if (r.willWrite) { fs.mkdirSync(path.dirname(o.out), { recursive: true }); fs.writeFileSync(o.out, r.text); console.log('wrote ' + o.out); }
  else if (o.write && !r.blocked) console.log('no change to ' + o.out);
  else if (!o.write) console.log('dry run: nothing written (add --write to record)');
  return r.rejected.length || r.fileErrors.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
