#!/usr/bin/env node
// Writes docs/images/RUNBOOK.md: the ordered list of paste files to run (redo-NN, cmd-NNN, inter-NN) with image counts and what to
// do with the results. Counts are read from the paste files on disk, so rebuild after any paste-file rebuild.
//   node tools/images/build_runbook.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PASTE = join(ROOT, 'docs/images/paste');
export const OUT = join(ROOT, 'docs/images/RUNBOOK.md');

export function countItems(text) { return (text.match(/^\d+\. FILENAME: /gm) || []).length; }
export function listFiles(re, dir = PASTE) {
  return readdirSync(dir).filter((f) => re.test(f)).sort().map((f) => ({ name: f, count: countItems(readFileSync(join(dir, f), 'utf8')) }));
}
const sum = (a) => a.reduce((n, f) => n + f.count, 0);
const line = (fs) => fs.map((f) => `${f.name.replace('.txt', '')}:${f.count}`).join(', ');

export function render(dir = PASTE) {
  const redo = listFiles(/^redo-\d\d\.txt$/, dir), cmd = listFiles(/^cmd-\d{3}(-[a-h])?\.txt$/, dir), inter = listFiles(/^inter-\d\d\.txt$/, dir);
  const L = [];
  L.push('# Image runbook: what to paste next');
  L.push('');
  L.push('Everything below is pasted into ONE ChatGPT conversation with image generation on. Paste a whole file as one message, wait for the reply that lists the filenames, check the count, type "next", paste the following file. Save every image under the exact FILENAME shown. Nothing is approved automatically; approval is always your decision (`docs/images/REVIEW-SHEETS.md`).');
  L.push('');
  L.push('## Order');
  L.push('');
  L.push('| Step | Files | Images | Why |');
  L.push('|---|---|---|---|');
  L.push(`| 1 | \`redo-01.txt\` to \`redo-${String(redo.length).padStart(2, '0')}.txt\` | ${sum(redo)} | Regenerate the flagged images (text, square-for-wide, wrong backdrop). Same file names as the originals. |`);
  L.push(`| 2 | \`cmd-036.txt\` onward (${cmd.length} files, see \`paste/INDEX.md\`) | ${sum(cmd)} | The pending 1000-image list, in command order. |`);
  L.push(`| 3 | \`inter-01.txt\` to \`inter-${String(inter.length).padStart(2, '0')}.txt\` | ${sum(inter)} | Two scene pictures per intermediate lesson (I-01 to I-50). |`);
  L.push('');
  L.push('Steps 2 and 3 are independent of step 1; run step 1 first because the redo images replace images the lessons already point at.');
  L.push('');
  L.push('## Files and counts');
  L.push('');
  L.push(`- redo (${sum(redo)}): ${line(redo)}`);
  L.push(`- inter (${sum(inter)}): ${line(inter)}`);
  L.push(`- cmd (${sum(cmd)}): ${line(cmd)}`);
  L.push('');
  L.push('## After each file');
  L.push('');
  L.push('1. Count the images against the number above. If any came out with text in it, a square instead of a wide picture, or the wrong scene, ask ChatGPT to redo just that item, quoting its filename and the rule it broke.');
  L.push('2. Download into one folder per step (for example `~/alef-returns/redo`, `~/alef-returns/cmd`, `~/alef-returns/inter`). Keep the exact names; a browser suffix such as " (1)" is reported but never used.');
  L.push('3. Check names before ingesting. Intermediate images: `node tools/images/match_inter.mjs ~/alef-returns/inter` (dry run, writes nothing). Others: `node tools/images/ingest.mjs ingest <folder> --dry-run`.');
  L.push('4. Ingest: `node tools/images/ingest.mjs ingest <folder>` (redo images: add `--replace`). Intermediate images need their rows in `manifest.csv` first; see `docs/images/INTER-INGEST.md`.');
  L.push('5. Open the contact sheets (`node tools/images/ingest.mjs sheets`, or `node tools/images/sheets.mjs`), look at every image, and record your decisions with `apply-decisions` as described in `docs/images/REVIEW-SHEETS.md`. Then `node tools/images/validate.mjs` must report 0 errors.');
  L.push('6. Regenerate alt text after any manifest rebuild: `node tools/images/alt_text.mjs`.');
  L.push('');
  L.push('## Rules that every file already carries');
  L.push('');
  L.push('No text of any kind in an image; only 1:1, 3:2 and 2:3 shapes; exact backdrops; no identifiable real people. If an image breaks one of these, do not approve it.');
  L.push('');
  return L.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) { writeFileSync(OUT, render()); console.log(`wrote ${OUT}`); }
