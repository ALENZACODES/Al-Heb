#!/usr/bin/env node
// One entry point for every printable workbook: runs each tool, scrubs every PDF to Author "John Khan" only (book/pdf_tools.py scrub), then
// rebuilds assets/workbook/manifest.json + docs/workbook/index.html from the PDFs on disk (tools/letters/workbook_manifest.mjs).
//   node tools/letters/build_all_workbooks.mjs [--html-only] [--skip-core] [--skip-cards] [--no-mnemonics]
//   --skip-core   do not rebuild the 8 main alef-workbook-* PDFs (tools/letters/workbook.mjs); they are still merged into the manifest
//   --skip-cards  skip the two flashcard sets (the 5,000-word set takes about a minute)
// Needs Playwright (Chromium) unless --html-only. Draft content throughout; see docs/workbook/FIRSTDAY-PAGES.md.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mergeAll } from './workbook_manifest.mjs';

const here = dirname(fileURLToPath(import.meta.url)); const root = join(here, '..', '..');
export function plan(argv) {
  const has = (f) => argv.includes(f); const html = has('--html-only') ? ['--html-only'] : [];
  const steps = [];
  if (!has('--skip-core')) steps.push(['workbook.mjs', ...(has('--no-mnemonics') ? [] : ['--mnemonics']), ...html]);
  for (const t of ['firstday_pages', 'memory_chain', 'cursive_words', 'niqqud_workbook', 'readaloud_sheets', 'answer_key']) steps.push([t + '.mjs', ...html]);
  if (!has('--skip-cards')) { steps.push(['flashcard_sheets.mjs', '--letters', ...html]); steps.push(['flashcard_sheets.mjs', ...html]); steps.push(['flashcard_sheets.mjs', '--light', ...html]); }
  return steps;
}
function run(cmd, args) { const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: root }); if (r.status !== 0) { console.error('FAILED:', cmd, args.join(' ')); process.exit(r.status || 1); } }

export function main(argv) {
  for (const s of plan(argv)) run('node', [join('tools/letters', s[0]), ...s.slice(1)]);
  if (!argv.includes('--html-only')) {
    for (const dir of ['docs/workbook', 'assets/workbook']) for (const f of readdirSync(join(root, dir))) if (f.endsWith('.pdf')) run('python3', ['book/pdf_tools.py', 'scrub', join(dir, f)]);
    mergeAll();
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2));
