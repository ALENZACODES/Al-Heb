#!/usr/bin/env node
// Writes docs/images/QUEUE-2026-11-07.md: the one ordered picture handoff for the outside picture studio. Master
// commands are copied verbatim from docs/games/ARCADE-COMMANDS.md, docs/images/CALENDAR-ART.md, docs/images/RIMON-FRAMES.md
// and docs/books/COMMANDS-6-62.md; rows are copied verbatim from the order sheets, only the rows whose file is missing.
// Counts are read from disk, so rebuild after pictures land:   node tools/images/build_queue.mjs [--check]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './ingest_lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT = 'docs/images/QUEUE-2026-11-07.md';
const BATCH = 10;

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const csvq = (s) => `"${String(s).replace(/"/g, '""')}"`;

/** The fenced block that follows the heading `## Master command: pictures` (or the given heading) in a markdown file. */
export function masterBlock(md, heading) {
  const i = md.indexOf(heading);
  if (i < 0) throw new Error(`heading not found: ${heading}`);
  const a = md.indexOf('```', i);
  const b = md.indexOf('```', a + 3);
  if (a < 0 || b < 0) throw new Error(`no fenced block after ${heading}`);
  return md.slice(a + 3, b).replace(/^\n/, '').replace(/\n$/, '');
}

/** Rows of a sheet as objects plus the raw CSV line for each (verbatim paste). */
export function sheetRows(rel, pathCol) {
  const text = read(rel);
  const [head, ...rows] = parseCsv(text);
  const ci = head.indexOf(pathCol);
  if (ci < 0) throw new Error(`${rel}: no column ${pathCol}`);
  return { header: head.map(csvq).join(','), rows: rows.map((r) => ({ path: r[ci], line: r.map(csvq).join(','), cells: Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])) })) };
}

const exists = (p) => existsSync(join(ROOT, p));

function batches(list, size = BATCH) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function section(title, sheet, rows, { header, groupBy = null, note = '' }) {
  const missing = rows.filter((r) => !exists(r.path));
  const L = [`### ${title}`, '', `${missing.length} of ${rows.length} missing. Sheet: \`${sheet}\`.${note ? ' ' + note : ''}`, ''];
  if (!missing.length) { L.push('Nothing to draw here.', ''); return { L, missing: missing.length, total: rows.length }; }
  const groups = groupBy ? [...new Set(missing.map(groupBy))].map((g) => ({ g, rows: missing.filter((r) => groupBy(r) === g) })) : [{ g: null, rows: missing }];
  let n = 0;
  for (const grp of groups) {
    const parts = groupBy ? [grp.rows] : batches(grp.rows);
    for (const part of parts) {
      n++;
      L.push(`**Batch ${n}${grp.g ? ` (${grp.g})` : ''}: ${part.length} rows**`, '', '```csv', header, ...part.map((r) => r.line), '```', '');
    }
  }
  return { L, missing: missing.length, total: rows.length };
}

export function build() {
  const arcadeMaster = masterBlock(read('docs/games/ARCADE-COMMANDS.md'), '## Master command: pictures');
  const calendarMaster = masterBlock(read('docs/images/CALENDAR-ART.md'), '## Master command');
  const rimonMaster = masterBlock(read('docs/images/RIMON-FRAMES.md'), '## Master command');
  const booksMaster = masterBlock(read('docs/books/COMMANDS-6-62.md'), '## Master command: pictures');

  const arcade = sheetRows('docs/games/arcade-images.csv', 'path');
  const backdrops = arcade.rows.filter((r) => r.cells.kind === 'backdrop');
  const sprites = arcade.rows.filter((r) => r.cells.kind !== 'backdrop');
  const calendar = sheetRows('docs/images/calendar-art.csv', 'path');
  const rimon = sheetRows('docs/images/rimon-frames.csv', 'path');
  const books = sheetRows('docs/books/image-prompts-6-62.csv', 'output_path');
  const bookNum = (r) => Number(r.cells.book.replace('book', ''));
  const bookRange = (a, b) => books.rows.filter((r) => bookNum(r) >= a && bookNum(r) <= b);

  const S = [];
  const A = section('A. Arcade backdrops', 'docs/games/arcade-images.csv', backdrops, { header: arcade.header, note: `(The ${sprites.length} cast and letter sprites of the same sheet: ${sprites.filter((r) => !exists(r.path)).length} missing.)` });
  const B = section('B. Calendar art', 'docs/images/calendar-art.csv', calendar.rows, { header: calendar.header });
  const C = section('C. Rimon frames', 'docs/images/rimon-frames.csv', rimon.rows, { header: rimon.header });
  const D1 = section('D. Books 17 to 24', 'docs/books/image-prompts-6-62.csv', bookRange(17, 24), { header: books.header, groupBy: (r) => r.cells.book, note: 'One book (12 rows) per batch: the book master command checks character consistency per book.' });
  const D2 = section('E. Books 25 to 43', 'docs/books/image-prompts-6-62.csv', bookRange(25, 43), { header: books.header, groupBy: (r) => r.cells.book });
  const D3 = section('F. Books 44 to 62', 'docs/books/image-prompts-6-62.csv', bookRange(44, 62), { header: books.header, groupBy: (r) => r.cells.book });
  const earlier = bookRange(6, 16);
  const earlierMissing = earlier.filter((r) => !exists(r.path)).length;
  const totalMissing = A.missing + B.missing + C.missing + D1.missing + D2.missing + D3.missing;
  const totalRows = A.total + B.total + C.total + D1.total + D2.total + D3.total;

  S.push('# Picture queue, 2026-11-07', '',
    'One ordered handoff for the outside picture studio. Nothing in it has been drawn yet unless the count says so; counts below are read from the files on disk by `node tools/images/build_queue.mjs`, so rebuild this page after each drop.',
    '', '## Counts', '', '| Group | Missing / total | Files land under |', '| --- | --- | --- |',
    `| A. Arcade backdrops | ${A.missing} / ${A.total} | \`assets/games/arcade/<game>/env.png\` (1600 x 600 PNG) |`,
    `| B. Calendar art | ${B.missing} / ${B.total} | \`assets/img/calendar/header.png\` (1600 x 600 PNG), \`assets/img/calendar/markers/<name>.png\` (256 x 256 PNG, transparent) |`,
    `| C. Rimon frames | ${C.missing} / ${C.total} | \`assets/img/rimon/frames/<action>-NN.png\` (256 x 256 PNG, transparent) |`,
    `| D. Books 17 to 24 | ${D1.missing} / ${D1.total} | \`assets/books/bookN/BOOKN_pNN.jpg\` (1659 x 948 JPEG) |`,
    `| E. Books 25 to 43 | ${D2.missing} / ${D2.total} | same |`,
    `| F. Books 44 to 62 | ${D3.missing} / ${D3.total} | same |`,
    `| Total in this queue | ${totalMissing} / ${totalRows} | |`,
    '', `Not in this queue: books 6 to 16 (${earlierMissing} of ${earlier.length} missing) and the arcade cast and letter sprites (${sprites.filter((r) => !exists(r.path)).length} of ${sprites.length} missing). Book 4 page 12 (\`assets/books/book4/BOOK4_p12.jpg\`) exists but is 512 x 293, not 1659 x 948; redo it when convenient.`, '',
    '## How to run it', '',
    '1. Open the picture studio. Paste the master command for the group (below), attach the character sheets it asks for (Ari, Noa, Rimon from `docs/images`), wait for "ready".',
    '2. Paste one batch (the fenced CSV block, header included). Check the contact sheet; ask for redraws until the cast matches; then paste the next batch. Finish a group before starting the next master command.',
    '3. Save every picture to one drop folder on your PC, named by the target basename: `BOOK17_p01.jpg`, `candles.png`, `header.png`. Where a basename is shared, prefix a folder of the target path and two underscores: `letterchomp__env.png`, `rimon__idle-01.png`. Any other name is reported and left alone; you can also hand the tool a CSV with the header `file,path`.',
    '4. From the repo root, preview, then write:', '',
    '```', 'node tools/images/ingest_queue.mjs ~/Pictures/alef-drop --dry-run', 'node tools/images/ingest_queue.mjs ~/Pictures/alef-drop --report /tmp/ingest.json', '```', '',
    '   The tool writes only to paths listed in the four order sheets. It checks that each file is a real image whose aspect is within 2% of the spec (`--crop` centre-crops instead of rejecting), resizes to the spec, writes PNG or JPEG without metadata, re-scans with the metadata scanner, and prints one line per file: `WROTE`, `REJECTED` (with the reason), `UNMATCHED`, `CONFLICT` (two files for one target), `EXISTS` (use `--replace` to overwrite). Flags: `upscaled` (source smaller than the spec), `not_transparent` (a sprite with no transparent pixel), `cropped`, `alpha_flattened`. It needs `python3` with Pillow, or `ffprobe` and `ffmpeg` (`--engine pil|ffmpeg` to force one).',
    '5. Then: `node tools/books/build.mjs` (flips `hasImg` for the book pages), `node tools/meta/scan.mjs assets` (must pass), `node tools/meta/scan.mjs --text`, `npm test`, `node tools/images/build_queue.mjs` (recounts this page). Commit as John Khan; plain commit message; no tool or model names anywhere.',
    '', 'The games and the book reader already hide a picture that is not there (the arcade removes the image on error; the reader shows "Pictures for this book are still being made"), so partial drops are safe to commit.', '',
    '## Master commands', '',
    '### Arcade (group A): paste once, attach the three character sheets', '', '```', arcadeMaster, '```', '',
    '### Calendar (group B): paste once', '', '```', calendarMaster, '```', '',
    '### Rimon frames (group C): paste once, attach the Rimon sheet', '', '```', rimonMaster, '```', '',
    '### Books (groups D, E, F): paste once, then one book per batch', '', '```', booksMaster, '```', '',
    '## Batches, in priority order', '',
    ...A.L, ...B.L, ...C.L, ...D1.L, ...D2.L, ...D3.L);
  return S.join('\n') + '\n';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = build();
  const out = join(ROOT, OUT);
  if (process.argv.includes('--check')) {
    const cur = existsSync(out) ? readFileSync(out, 'utf8') : '';
    if (cur !== text) { console.error(`stale: ${OUT}`); process.exit(1); }
    console.log(`${OUT} is current`);
  } else {
    writeFileSync(out, text);
    console.log(`wrote ${OUT} (${text.split('\n').length} lines)`);
  }
}
