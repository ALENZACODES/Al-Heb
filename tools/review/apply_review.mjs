#!/usr/bin/env node
// Round-trip importer for returned reviewer sheets.
//
//   node tools/review/apply_review.mjs SHEET.csv [SHEET2.csv ...] [--reviewer "Name"] [--date YYYY-MM-DD]
//                                      [--root DIR] [--report FILE] [--apply]
//
// DRY RUN BY DEFAULT: prints what would change and writes nothing. Data files are modified only with --apply.
//
// Rules (also in docs/review/README.md):
//   * status "ok"     -> the record is marked reviewed (proofread:true + reviewedBy + reviewedOn), but ONLY if a
//                        reviewer name and an ISO date are present (row columns reviewer/review_date, or --reviewer/--date).
//   * status "fix"    -> corrected_text is written into the text field (prefix "he:", "translit:", "en:" or a field name
//                        where a row has several); the record stays UNREVIEWED: a second person should confirm the fix.
//   * status "unsure" -> listed in the report only. Blank status -> not reviewed yet.
//   * Rows whose Hebrew cell no longer matches the data are refused (stale sheet, or the cell was edited in place).
//   * Files are edited surgically (only the touched values), re-parsed to prove they are still valid JSON, then written.
import { readFile, writeFile, appendFile, mkdir, rename } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseCsvObjects } from './lib/csv.mjs';
import { extractAll } from './lib/extract.mjs';
import { parseSpans, nodeAt, setKeyEdits, applyEdits } from './lib/jsonspan.mjs';
import { STATUSES } from './config.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, '../..');

const BIDI = /[‎‏‪-‮⁦-⁩﻿]/g;
export const norm = (s) => String(s ?? '').normalize('NFC').replace(BIDI, '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').trim();
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (d) => ISO_DATE.test(d) && !Number.isNaN(Date.parse(d + 'T00:00:00Z')) && new Date(d + 'T00:00:00Z').toISOString().slice(0, 10) === d;
const HEBREW = /[֐-׿]/;

const FLIP_OPS = {
  proofread: (by, on) => [['proofread', true], ['needsNativeReview', false, true], ['needsNativeSpeaker', false, true], ['reviewedBy', by], ['reviewedOn', on]],
  strokes: (by, on) => [['validated', true], ['needsNativeReview', false], ['reviewedBy', by], ['reviewedOn', on]],
  clergy: (by, on) => [['clergyReviewed', true], ['reviewedBy', by], ['reviewedOn', on]],
};

/**
 * @returns {Promise<object>} structured result: { counts, errors, warnings, flips, fixes, unsure, wrote }
 */
export async function applyReview(opts) {
  const root = resolve(opts.root || DEFAULT_ROOT);
  const res = { dryRun: !opts.apply, counts: { rows: 0, ok: 0, fix: 0, unsure: 0, blank: 0 }, errors: [], warnings: [], flips: [], fixes: [], unsure: [], rollups: [], notes: [], wrote: [], overridesPatch: {} };

  // ---- 1. read sheets
  const rows = [];
  for (const f of opts.files) {
    const { header, records } = parseCsvObjects(await readFile(f, 'utf8'));
    for (const need of ['id', 'status']) if (!header.includes(need)) throw new Error(`${f}: missing required column "${need}"`);
    for (const r of records) rows.push({ ...r, _file: f });
  }
  res.counts.rows = rows.length;

  // ---- 2. current flagged items
  const { byArea } = await extractAll(root);
  const items = new Map(Object.values(byArea).flat().map((it) => [it.id, it]));

  // duplicates
  const seen = new Map();
  for (const r of rows) seen.set(r.id, (seen.get(r.id) || 0) + 1);
  const dupes = new Set([...seen].filter(([, n]) => n > 1).map(([id]) => id));
  for (const id of dupes) res.errors.push({ id, why: `id appears ${seen.get(id)} times in the input; all copies skipped` });

  // ---- 3. classify rows
  const okIds = new Set();
  const plan = []; // { kind:'flip'|'text', ... }
  const skipRow = (r, why, level = 'errors') => res[level].push({ id: r.id, file: r._file, line: r._line, why });
  for (const r of rows) {
    const id = (r.id || '').trim();
    if (!id) { skipRow(r, 'row has no id'); continue; }
    if (dupes.has(id)) continue;
    const status = (r.status || '').trim().toLowerCase();
    if (status === '') { res.counts.blank++; continue; }
    if (!STATUSES.includes(status)) { skipRow(r, `invalid status "${r.status}" (use ${STATUSES.join(' / ')})`); continue; }
    const it = items.get(id);
    if (!it) { skipRow(r, 'id not found among currently flagged items (typo, or it was already reviewed / the data changed)', 'warnings'); continue; }
    if (norm(r.hebrew) !== norm(it.he)) {
      skipRow(r, `Hebrew cell differs from the current data (sheet is stale, or the cell was edited in place). Put corrections in corrected_text. Sheet: "${norm(r.hebrew).slice(0, 40)}" vs data: "${norm(it.he).slice(0, 40)}"`);
      continue;
    }
    res.counts[status]++;
    const corrected = (r.corrected_text || '').trim();
    if (status === 'unsure') { res.unsure.push({ id, notes: r.reviewer_notes || '' }); continue; }
    if (status === 'ok') {
      if (corrected) { skipRow(r, 'status is ok but corrected_text is filled; change the status to fix or clear the text'); continue; }
      const by = (r.reviewer || opts.reviewer || '').trim();
      const on = (r.review_date || opts.date || '').trim();
      if (!by) { skipRow(r, 'ok row has no reviewer name (column "reviewer" or --reviewer); not marked reviewed'); continue; }
      if (!validDate(on)) { skipRow(r, `ok row needs a review date as YYYY-MM-DD (got "${on}"); not marked reviewed`); continue; }
      if (!it.flip) { res.warnings.push({ id, why: 'ok recorded, but this item has no writable review flag (report-only item such as the calendar texts or the opening prayer); record it in the ledger' }); }
      okIds.add(id);
      res.flips.push({ id, by, on, item: it });
      continue;
    }
    // status === 'fix'
    if (!corrected) { res.warnings.push({ id, why: 'fix without corrected_text: needs a human to read reviewer_notes', notes: r.reviewer_notes || '' }); continue; }
    let field = it.defaultField, text = corrected;
    const m = corrected.match(/^([A-Za-z][A-Za-z0-9_.]*)\s*:\s*([\s\S]*)$/);
    if (m && (it.fields[m[1]] || ['he', 'translit', 'en'].includes(m[1]))) { field = m[1]; text = m[2].trim(); }
    if (!field) { res.warnings.push({ id, why: `corrected_text needs a field prefix; this row takes: ${Object.keys(it.fields).join(', ') || '(none writable)'}`, notes: corrected }); continue; }
    const f = it.fields[field];
    if (!f) {
      res.warnings.push({ id, why: `field "${field}" is not stored for this item (it is generated or not in the data): recorded as a note only`, notes: text });
      res.fixes.push({ id, field, from: null, to: text, noteOnly: true });
      continue;
    }
    text = text.normalize('NFC');
    if (norm(text) === norm(f.current)) { res.warnings.push({ id, why: `corrected_text for "${field}" is identical to the current text; nothing to change` }); continue; }
    if (!['en', 'translit'].includes(field) && HEBREW.test(String(f.current ?? '')) && !HEBREW.test(text)) { skipRow(r, `corrected text for "${field}" contains no Hebrew letters; refused`); continue; }
    res.fixes.push({ id, field, from: f.current, to: text, targets: f.targets, item: it });
    if (it.vocabId) { (res.overridesPatch[it.vocabId] ||= {}); res.overridesPatch[it.vocabId][field === 'he' ? 'pointed' : 'gloss'] = text; }
  }

  // ---- 4. rollups (parent container reviewed once every flagged child is ok)
  for (const it of items.values()) {
    if (!it.rollup) continue;
    if (it.rollup.children.every((c) => okIds.has(c))) {
      const any = res.flips.find((f) => f.id === it.id);
      res.rollups.push({ label: it.rollup.label, target: it.rollup.parent, by: any.by, on: any.on });
    }
  }
  for (const it of items.values()) {
    if (!it.rollup) continue;
    const done = it.rollup.children.filter((c) => okIds.has(c)).length;
    if (done && done < it.rollup.children.length) res.notes.push(`${it.rollup.label}: ${done}/${it.rollup.children.length} lines ok; its own proofread flag stays false until all are ok`);
  }

  // ---- 5. build edits per file (dry run does this too, so a dry run proves the apply would work)
  const perFile = new Map(); // file -> [{kind,path,...}]
  const push = (file, e) => { if (!perFile.has(file)) perFile.set(file, []); perFile.get(file).push(e); };
  const flipTargets = (f) => (f.item.flip ? (f.item.flip.targets || [f.item.flip.target]) : []);
  for (const f of res.flips) for (const t of flipTargets(f)) push(t.file, { kind: 'flip', path: t.path, flipKind: f.item.flip.kind, by: f.by, on: f.on, id: f.id });
  for (const rl of res.rollups) push(rl.target.file, { kind: 'flip', path: rl.target.path, flipKind: 'proofread', by: rl.by, on: rl.on, id: rl.label });
  for (const fx of res.fixes) if (!fx.noteOnly) for (const t of fx.targets) push(t.file, { kind: 'text', path: t.path, value: fx.to, id: fx.id });

  const newTexts = new Map();
  for (const [file, ops] of perFile) {
    let text;
    try { text = await readFile(join(root, file), 'utf8'); } catch (e) { res.errors.push({ id: file, why: `cannot read ${file}: ${e.message}` }); continue; }
    let tree;
    try { tree = parseSpans(text); } catch (e) { res.errors.push({ id: file, why: `cannot parse ${file}: ${e.message}` }); continue; }
    const edits = [];
    let bad = false;
    for (const op of ops) {
      const node = nodeAt(tree, op.path);
      if (!node) { res.errors.push({ id: op.id, why: `path ${JSON.stringify(op.path)} not found in ${file}` }); bad = true; continue; }
      if (op.kind === 'text') {
        if (node.t !== 'str') { res.errors.push({ id: op.id, why: `target in ${file} is not a string` }); bad = true; continue; }
        edits.push({ pos: node.s, del: node.e - node.s, text: JSON.stringify(op.value) });
      } else {
        if (node.t !== 'obj') { res.errors.push({ id: op.id, why: `flip target in ${file} is not an object` }); bad = true; continue; }
        for (const [k, v, onlyIfExists] of FLIP_OPS[op.flipKind](op.by, op.on)) {
          if (onlyIfExists && !node.props.some((p) => p.key === k && p.v.v === true)) continue; // only clear flags that are set
          edits.push(...setKeyEdits(text, node, k, v));
        }
      }
    }
    if (bad) continue;
    const out = applyEdits(text, edits);
    try { JSON.parse(out); } catch (e) { res.errors.push({ id: file, why: `edited ${file} would not be valid JSON (${e.message}); nothing written` }); continue; }
    newTexts.set(file, out);
  }

  // ---- 6. write
  if (opts.apply) {
    if (res.errors.length) {
      res.notes.push('NOT APPLIED: fix the errors above first (all-or-nothing, so a partial sheet never half-updates the data).');
    } else {
      for (const [file, out] of newTexts) {
        const p = join(root, file);
        await writeFile(p + '.review-tmp', out);
        await rename(p + '.review-tmp', p);
        res.wrote.push(file);
      }
      const ledger = opts.ledger || join(root, 'docs/review/ledger.jsonl');
      await mkdir(dirname(ledger), { recursive: true });
      const at = new Date().toISOString();
      const lines = [
        ...res.flips.map((f) => ({ at, id: f.id, action: f.item.flip ? 'marked-reviewed' : 'ok-report-only', reviewer: f.by, date: f.on })),
        ...res.rollups.map((r) => ({ at, id: r.label, action: 'container-marked-reviewed', reviewer: r.by, date: r.on })),
        ...res.fixes.map((x) => ({ at, id: x.id, action: x.noteOnly ? 'fix-note-only' : 'text-corrected', field: x.field, from: x.from, to: x.to })),
      ];
      if (lines.length) await appendFile(ledger, lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
      res.ledger = ledger;
      if (Object.keys(res.overridesPatch).length) {
        const pp = join(root, 'docs/review/vocab-overrides-patch.json');
        let cur = {};
        try { cur = JSON.parse(await readFile(pp, 'utf8')); } catch { /* new */ }
        for (const [id, v] of Object.entries(res.overridesPatch)) cur[id] = { ...(cur[id] || {}), ...v };
        await writeFile(pp, JSON.stringify(cur, null, 1) + '\n');
        res.notes.push(`vocabulary corrections were also written to docs/review/vocab-overrides-patch.json: copy them into data/vocab/overrides.json, otherwise tools/vocab/refine.py will overwrite them on the next rebuild.`);
      }
    }
  } else if (Object.keys(res.overridesPatch).length) {
    res.notes.push('vocabulary fixes would also need to be copied into data/vocab/overrides.json (the rebuild source); --apply writes docs/review/vocab-overrides-patch.json for that.');
  }
  return res;
}

const FLIP_DESC = { proofread: 'proofread false -> true', strokes: 'validated false -> true, needsNativeReview -> false', clergy: 'clergyReviewed false -> true' };

/** Show only the changed middle of two strings, with a little context. */
export function shortDiff(a, b, ctx = 12) {
  a = String(a ?? ''); b = String(b ?? '');
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  let j = 0; while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
  const cut = (s) => `${i > ctx ? '...' : ''}${s.slice(Math.max(0, i - ctx), s.length - j + Math.min(j, ctx))}${j > ctx ? '...' : ''}`;
  return [cut(a), cut(b)];
}

export function formatReport(res) {
  const L = [];
  const c = res.counts;
  L.push(res.dryRun ? '# Reviewer sheet import: DRY RUN (nothing written)' : '# Reviewer sheet import: APPLIED');
  L.push(`rows read: ${c.rows} | ok: ${c.ok} | fix: ${c.fix} | unsure: ${c.unsure} | blank (not reviewed yet): ${c.blank}`);
  L.push(`would mark reviewed: ${res.flips.filter((f) => f.item.flip).length} item(s)${res.rollups.length ? ` + ${res.rollups.length} container(s)` : ''} | text corrections: ${res.fixes.filter((f) => !f.noteOnly).length}`);
  if (res.errors.length) { L.push('', `## Errors / rows skipped (${res.errors.length})`); for (const e of res.errors) L.push(`- ${e.id}${e.line ? ` (line ${e.line})` : ''}: ${e.why}`); }
  if (res.flips.length) {
    L.push('', `## Marked reviewed (${res.flips.length})`);
    for (const f of res.flips) L.push(`- ${f.id}: ${FLIP_DESC[f.item.flip?.kind] || 'ok'}, reviewedBy "${f.by}", reviewedOn ${f.on}${f.item.flip ? '' : ' (report-only item, ledger only)'}`);
  }
  for (const r of res.rollups) L.push(`- container ${r.label}: all lines ok -> container marked reviewed`);
  if (res.fixes.length) {
    L.push('', `## Text corrections (${res.fixes.length}); records stay UNREVIEWED until a second pass`);
    for (const f of res.fixes) { const [a, b] = shortDiff(f.from, f.to); L.push(`- ${f.id} [${f.field}]${f.noteOnly ? ' NOTE ONLY' : ''}:\n    - ${f.from == null ? '(not stored)' : JSON.stringify(a)}\n    + ${JSON.stringify(b)}`); }
  }
  if (res.unsure.length) { L.push('', `## Unsure: needs another reviewer (${res.unsure.length})`); for (const u of res.unsure) L.push(`- ${u.id}${u.notes ? ': ' + u.notes : ''}`); }
  if (res.warnings.length) { L.push('', `## Warnings (${res.warnings.length})`); for (const w of res.warnings) L.push(`- ${w.id}: ${w.why}${w.notes ? ' | ' + w.notes : ''}`); }
  if (res.notes.length) { L.push('', '## Notes'); for (const n of res.notes) L.push(`- ${n}`); }
  if (res.wrote.length) L.push('', `## Files written: ${res.wrote.join(', ')}`, `ledger: ${res.ledger}`);
  if (res.dryRun) L.push('', 'Dry run only. Re-run with --apply to write these changes.');
  return L.join('\n') + '\n';
}

function parseArgs(argv) {
  const o = { files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') o.apply = true;
    else if (a === '--root') o.root = argv[++i];
    else if (a === '--reviewer') o.reviewer = argv[++i];
    else if (a === '--date') o.date = argv[++i];
    else if (a === '--report') o.report = argv[++i];
    else if (a === '--ledger') o.ledger = argv[++i];
    else if (a === '-h' || a === '--help') o.help = true;
    else if (a.startsWith('--')) throw new Error(`unknown argument ${a}`);
    else o.files.push(a);
  }
  return o;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try {
    const o = parseArgs(process.argv.slice(2));
    if (o.help || !o.files.length) { console.log('usage: node tools/review/apply_review.mjs SHEET.csv [...] [--reviewer NAME] [--date YYYY-MM-DD] [--root DIR] [--report FILE] [--apply]\nDry run unless --apply is given.'); process.exit(o.help ? 0 : 2); }
    const res = await applyReview(o);
    const rep = formatReport(res);
    process.stdout.write(rep);
    if (o.report) await writeFile(o.report, rep);
    process.exit(res.errors.length ? 1 : 0);
  } catch (e) { console.error(e.stack || e); process.exit(2); }
}
