#!/usr/bin/env node
// Builds data/images/next1000.csv, data/images/next1000-groups.json and docs/images/NEXT_1000_COMMANDS.md.
// Pending = manifest rows not yet done + block H (spec_next.mjs, commands 102-141), trimmed to exactly 1000.
// "Done" = names matched in docs/images/codex-batch-01.json if that file exists, else every manifest row of commands 1-27.
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
  const p = join(ROOT, 'docs/images/codex-batch-01.json');
  if (existsSync(p)) {
    const j = JSON.parse(readFileSync(p, 'utf8'));
    const names = new Set();
    const walk = (v) => {
      if (typeof v === 'string' && /\.png$/i.test(v)) names.add(v.split('/').pop());
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(j.matched ?? j.matches ?? j.manifest ?? j);
    const known = new Set(manifest.map((r) => r.file));
    const hit = new Set([...names].filter((n) => known.has(n)));
    if (hit.size) return { done: hit, source: `docs/images/codex-batch-01.json (${hit.size} matched manifest names)` };
  }
  return { done: new Set(manifest.filter((r) => Number(r.command) <= 27).map((r) => r.file)), source: 'assumed: every manifest row of commands 1-27 (codex-batch-01.json not found)' };
}

export function build() {
  const manifest = parseCsv(readFileSync(join(ROOT, 'data/images/manifest.csv'), 'utf8'));
  const pg = JSON.parse(readFileSync(join(ROOT, 'data/images/prompt-groups.json'), 'utf8')).groups;
  const { done, source } = doneSet(manifest);
  const remaining = manifest.filter((r) => !done.has(r.file));
  const next = buildNext();
  const need = TARGET - remaining.length;
  const newRows = next.flatMap((g) => g.rows);
  if (need > newRows.length) throw new Error(`need ${need} new rows but spec_next has ${newRows.length}; add commands to spec_next.mjs`);
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
    groups.push({ number: g.number, block: g.block, set: g.set, title: g.title, prompt: g.prompt, inputs: g.inputs, textOutputs: g.textOutputs, rows: rr, expectedFiles: rr.map((r) => r.file) });
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
  return `# Next 1000 images: ChatGPT command runbook

Pending list: **${B.rows.length} images** = ${B.remainingCount} unfinished manifest rows (commands ${first}-101) + ${B.newCount} new block H images (commands 102-${last}).
Done set used: ${B.source}.

Files: \`data/images/next1000.csv\` (same columns as manifest.csv, all pending, command order), \`data/images/next1000-groups.json\` (per-command prompts, file lists, refs). Rebuild with \`node tools/images/build_next1000.mjs\`.

## How to run

1. Open one ChatGPT conversation (or Codex session) and keep it for the whole run so STYLE GUIDE v1 stays pinned. If the conversation was restarted, paste the STYLE GUIDE v1 text from \`tools/images/spec.mjs\` first.
2. Run **one command at a time**. For each command, attach the reference sheets named in the \`refs\` column (for example CHAR_ari_sheet.png, CHAR_noa_sheet.png, FRAME_lettercard.png, REF_cursive_*.png, or an earlier image of the same set).
3. Each image is its own PNG, named exactly as in \`next1000-groups.json\` (\`expectedFiles\`). Never any text, letters or numerals in an image: Hebrew is overlaid later as vector.
4. Save each image under its exact file name and check the command's count before saying "next".
5. Sizes are only 1024x1024, 1792x1024 or 1024x1280 (icons in command 98 are 512x512 per the manifest).

## Paste-ready master command

\`\`\`
${MASTER}
\`\`\`

Batch variant (commands 28-37 in one go):

\`\`\`
${BATCH}
\`\`\`

## Command table

| Cmd | Block | Title | Images | Size | Refs to attach |
|---|---|---|---|---|---|
${table}
`;
}

export const MASTER =
`Continue the ALEF image run from command 28, sequentially. For each command: read its list from next1000-groups.json, generate every listed image as its own PNG named exactly as listed, in STYLE GUIDE v1 (flat vector, thick rounded outlines, cream #F6F1E7 background, palette blue #1F3A5F / red #B0373B / olive #6B7F3A / gold #D9A441 / charcoal #2B2B2B, 3/4 light from upper left). NEVER include any text, letters, Hebrew or numerals in any image; signs, screens and pages stay blank. Use the attached reference sheets for Ari, Noa and Rimon. When done, confirm with the list of filenames and the count, then STOP and wait until I say "next".`;
export const BATCH = MASTER.replace('Continue the ALEF image run from command 28, sequentially. For each command:', 'Run ALEF image commands 28-37 as one batch, in order. For each of these commands:').replace('then STOP and wait until I say "next".', 'after each command, then STOP after command 37 and wait until I say "next".');

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const B = build();
  mkdirSync(join(ROOT, 'docs/images'), { recursive: true });
  const csv = [HEAD.join(','), ...B.rows.map((r) => HEAD.map((h) => csvCell(r[h])).join(','))].join('\n') + '\n';
  writeFileSync(join(ROOT, 'data/images/next1000.csv'), csv);
  writeFileSync(join(ROOT, 'data/images/next1000-groups.json'), JSON.stringify({ meta: { total: B.rows.length, doneSource: B.source, remainingManifest: B.remainingCount, newRows: B.newCount, generatedBy: 'tools/images/build_next1000.mjs' }, groups: B.groups }, null, 1) + '\n');
  writeFileSync(join(ROOT, 'docs/images/NEXT_1000_COMMANDS.md'), renderDoc(B));
  console.log({ rows: B.rows.length, remaining: B.remainingCount, new: B.newCount, commands: B.groups.length, source: B.source });
}
