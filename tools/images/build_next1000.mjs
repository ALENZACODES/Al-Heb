#!/usr/bin/env node
// Builds data/images/next1000.csv, data/images/next1000-groups.json and docs/images/NEXT_1000_COMMANDS.md.
// Pending = manifest rows of the original plan (commands 1-101) not yet done + block H (spec_next.mjs, commands 102-149), at most 1000 (a ceiling: completed work is never re-queued to fill it).
// "Done" = every image already ingested (data/images/provenance.json) if that file exists, else names matched in docs/images/codex-batch-01.json, else every manifest row of commands 1-27.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildNext } from './spec_next.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TARGET = 1000;
const HEAD = ['file', 'set', 'command', 'block', 'width', 'height', 'status', 'prompt'];

export function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [h, ...rest] = rows;
  return rest.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]])));
}
const csvCell = (v) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

/** Returns { done:Set<string>|null, source } */
function doneSet(manifest) {
  const provenance = join(ROOT, 'data/images/provenance.json');
  if (existsSync(provenance)) {
    const images = JSON.parse(readFileSync(provenance, 'utf8')).images;
    return { done: new Set(Object.keys(images).map(id => `${id}.png`)), source: 'data/images/provenance.json (ingested images)' };
  }
  const p = join(ROOT, 'docs/images/codex-batch-01.json');
  if (existsSync(p)) {
    const j = JSON.parse(readFileSync(p, 'utf8'));
    const names = new Set();
    const walk = (v) => {
      if (typeof v === 'string' && /\.png$/i.test(v)) names.add(v.split('/').pop());
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    if (Array.isArray(j.records)) j.records.filter((r) => r.role === 'matched').forEach((r) => walk(r.matched_manifest_file));
    else walk(j.matched ?? j.matches ?? j.manifest ?? j);
    const known = new Set(manifest.filter((r) => Number(r.command) <= 101).map((r) => r.file));
    const hit = new Set([...names].filter((n) => known.has(n)));
    // Also done: every manifest row already ingested (data/images/provenance.json), whichever batch it came from.
    const pv = join(ROOT, 'data/images/provenance.json');
    const ingested = new Set();
    if (existsSync(pv)) { const P = JSON.parse(readFileSync(pv, 'utf8')); for (const id of Object.keys(P.images ?? P)) if (known.has(`${id}.png`)) ingested.add(`${id}.png`); }
    const all = new Set([...hit, ...ingested]);
    if (hit.size) return { done: all, source: `docs/images/codex-batch-01.json (${hit.size} matched manifest names) plus ${all.size - hit.size} more already in data/images/provenance.json` };
  }
  return { done: new Set(manifest.filter((r) => Number(r.command) <= 27).map((r) => r.file)), source: 'assumed: every manifest row of commands 1-27 (codex-batch-01.json not found)' };
}

export function build() {
  // Commands 150+ have their own run-3 queue; this queue covers the original series.
  const manifest = parseCsv(readFileSync(join(ROOT, 'data/images/manifest.csv'), 'utf8')).filter(r => +r.command < 150);
  const pg = JSON.parse(readFileSync(join(ROOT, 'data/images/prompt-groups.json'), 'utf8')).groups;
  const { done, source } = doneSet(manifest);
  // Only the original plan (commands 1-101). Rows appended later for ingest (Run 3 = commands 150-249, intermediate, block J) have their own paste files and runbook steps.
  const remaining = manifest.filter((r) => Number(r.command) <= 101 && !done.has(r.file));
  const next = buildNext();
  const existing = new Set(manifest.map((r) => r.file));
  // Completed or already-listed work is never queued again just to fill the batch.
  const newRows = next.flatMap((g) => g.rows).filter((r) => !done.has(r.file) && !existing.has(r.file));
  // TARGET is a ceiling ("up to"): as images get ingested, fewer unfinished rows remain and spec_next may not hold enough block H rows to refill to 1000.
  const need = Math.max(0, Math.min(TARGET - remaining.length, newRows.length));
  const keepNew = newRows.slice(0, need);
  const keepSet = new Set(keepNew.map((r) => r.file));
  const byCmd = new Map();
  for (const r of remaining) { if (!byCmd.has(+r.command)) byCmd.set(+r.command, []); byCmd.get(+r.command).push(r); }
  const refsOf = new Map(pg.flatMap((g) => g.rows).map((r) => [r.file, r.refs]));
  const groups = [];
  for (const g of pg) {
    const rows = byCmd.get(g.number);
    if (!rows && !(g.rows.length === 0 && g.number > 27)) continue;
    const rr = (rows || []).map((r) => ({ ...r, refs: refsOf.get(r.file) || [] }));
    // Partly done command: list only pending rows and say which positions remain.
    const all = manifest.filter((r) => +r.command === g.number);
    let title = g.title, partial = null;
    if (rows && all.length > rows.length) {
      const pos = rows.map((r) => all.findIndex((a) => a.file === r.file) + 1);
      partial = `${pos[0]}-${pos[pos.length - 1]}`;
      title = `${g.title} (partial: rows ${partial} remaining)`;
    }
    groups.push({ number: g.number, block: g.block, set: g.set, title, ...(partial ? { partial: { remainingRows: partial, doneRows: all.length - rows.length, totalRows: all.length } } : {}), prompt: g.prompt, inputs: g.inputs, textOutputs: g.textOutputs, rows: rr, expectedFiles: rr.map((r) => r.file) });
  }
  for (const g of next) {
    const rows = g.rows.filter((r) => keepSet.has(r.file));
    if (rows.length) groups.push({ ...g, rows, expectedFiles: rows.map((r) => r.file) });
  }
  groups.sort((a, b) => a.number - b.number);
  const rows = groups.flatMap((g) => g.rows);
  return { rows, groups, source, doneCount: done.size, remainingCount: remaining.length, newCount: keepNew.length };
}

const dims = (g) => [...new Set(g.rows.map((r) => `${r.width}x${r.height}`))].join('/') || 'text only';
const refsOf = (g) => [...new Set(g.rows.flatMap((r) => r.refs || []).concat(g.inputs || []))];

export function renderDoc(B) {
  const first = B.groups[0].number, last = B.groups[B.groups.length - 1].number;
  const table = B.groups.map((g) => {
    const refs = refsOf(g);
    const r = refs.length > 3 ? `${refs.slice(0, 3).join(', ')} +${refs.length - 3}` : refs.join(', ') || '-';
    return `| ${g.number} | ${g.block} | ${g.title} | ${g.rows.length || 'text only'} | ${dims(g)} | ${r} |`;
  }).join('\n');
  return `# Next 1000 images: command runbook

Pending list: **${B.rows.length} images** = ${B.remainingCount} unfinished manifest rows (commands ${first}-101) + ${B.newCount} new block H images (commands 102-${last}).
Done set used: ${B.source}.
**${B.doneCount} images are already done.** The next command to run is **${first}** (${B.groups[0].title}), file \`${firstPaste(B)}\`.

Files: \`data/images/next1000.csv\` (same columns as manifest.csv, all pending, command order), \`data/images/next1000-groups.json\` (per-command prompts, file lists, refs). Rebuild with \`node tools/images/build_next1000.mjs\`.

## How to run

1. Open one conversation in your image tool and keep it for the whole run so STYLE GUIDE v1 stays pinned. If the conversation was restarted, paste the STYLE GUIDE v1 text from \`tools/images/spec.mjs\` first.
2. Run **one command at a time**. For each command, attach the reference sheets named in the \`refs\` column (for example CHAR_ari_sheet.png, CHAR_noa_sheet.png, FRAME_lettercard.png, REF_cursive_*.png, or an earlier image of the same set).
3. Each image is its own PNG, named exactly as in \`next1000-groups.json\` (\`expectedFiles\`). Never any text, letters or numerals in an image: Hebrew is overlaid later as vector.
4. Save each image under its exact file name and check the command's count before saying "next".
5. Sizes are only 1024x1024, 1792x1024 or 1024x1280 (icons in command 98 are 512x512 per the manifest).

## Paste-ready master command

\`\`\`
${MASTER}
\`\`\`

Several commands in a row:

\`\`\`
${BATCH}
\`\`\`

## Command table

| Cmd | Block | Title | Images | Size | Refs to attach |
|---|---|---|---|---|---|
${table}
`;
}

const firstPaste = (B) => `cmd-${String(B.groups[0].number).padStart(3, '0')}.txt`;
export const MASTER =
`Your image tool cannot read repo files, so do not use next1000-groups.json there. Paste the first pending command's file (see docs/images/paste/INDEX.md), then the next one ... (one self-contained file per command, see docs/images/paste/README.md; the paste files are built by node tools/images/build_paste_files.mjs).`;
export const BATCH = `For several commands in a row, paste the first pending file, wait for the filenames list, say "next", then paste the following file, and so on (docs/images/paste/INDEX.md lists every file; commands split into -a/-b files are noted there).`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const B = build();
  mkdirSync(join(ROOT, 'docs/images'), { recursive: true });
  const csv = [HEAD.join(','), ...B.rows.map((r) => HEAD.map((h) => csvCell(r[h])).join(','))].join('\n') + '\n';
  writeFileSync(join(ROOT, 'data/images/next1000.csv'), csv);
  writeFileSync(join(ROOT, 'data/images/next1000-groups.json'), JSON.stringify({ meta: { doneCount: B.doneCount, total: B.rows.length, doneSource: B.source, remainingManifest: B.remainingCount, newRows: B.newCount, generatedBy: 'tools/images/build_next1000.mjs' }, groups: B.groups }, null, 1) + '\n');
  writeFileSync(join(ROOT, 'docs/images/NEXT_1000_COMMANDS.md'), renderDoc(B));
  console.log({ rows: B.rows.length, remaining: B.remainingCount, new: B.newCount, commands: B.groups.length, source: B.source });
}
