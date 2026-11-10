#!/usr/bin/env node
// Writes docs/images/RUNBOOK.md: the ordered list of paste files to run (redo-NN, cmd-NNN, inter-NN) with image counts and what to
// do with the results. Counts are read from the paste files on disk, so rebuild after any paste-file rebuild.
//   node tools/images/build_runbook.mjs
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PASTE = join(ROOT, 'docs/images/paste');
export const OUT = join(ROOT, 'docs/images/RUNBOOK.md');

export function countItems(text) { return (text.match(/^\d+\. FILENAME: /gm) || []).length; }
export function listFiles(re, dir = PASTE) {
  return readdirSync(dir).filter((f) => re.test(f)).sort().map((f) => ({ name: f, count: countItems(readFileSync(join(dir, f), 'utf8')) }));
}
/** Block J (written by its own lane): present only when block-j.csv, J-MASTER.txt and j-NN.txt all exist. Counts come from the paste files; rows from the csv. */
export function blockJ(root = ROOT) {
  const csv = join(root, 'data/images/block-j.csv'), dir = join(root, 'docs/images/paste');
  if (!existsSync(csv) || !existsSync(join(dir, 'J-MASTER.txt'))) return null;
  const files = listFiles(/^j-\d\d\.txt$/, dir);
  if (!files.length) return null;
  const rows = Math.max(0, readFileSync(csv, 'utf8').split('\n').filter(Boolean).length - 1);
  return { files, rows };
}
/** Run 3 (John's third command sheet, commands 150-249, file names fixed by the commands): present only when data/images/run3.csv exists. */
export function run3(root = ROOT) {
  const csv = join(root, 'data/images/run3.csv');
  if (!existsSync(csv)) return null;
  const rows = Math.max(0, readFileSync(csv, 'utf8').split('\n').filter(Boolean).length - 1);
  const commands = new Set(readFileSync(csv, 'utf8').split('\n').slice(1).map((l) => l.split(',')[3]).filter(Boolean)).size;
  return { rows, commands };
}
const sum = (a) => a.reduce((n, f) => n + f.count, 0);
const line = (fs) => fs.map((f) => `${f.name.replace('.txt', '')}:${f.count}`).join(', ');

export function render(dir = PASTE, root = ROOT) {
  const J = blockJ(root), R = run3(root);
  const redo = listFiles(/^redo-\d\d\.txt$/, dir), cmd = listFiles(/^cmd-\d{3}(-[a-h])?\.txt$/, dir), inter = listFiles(/^inter-\d\d\.txt$/, dir);
  const L = [];
  L.push('# Image runbook: what to paste next');
  L.push('');
  L.push('Everything below is pasted into ONE conversation with your image tool with image generation on. Paste a whole file as one message, wait for the reply that lists the filenames, check the count, type "next", paste the following file. Save every image under the exact FILENAME shown. Nothing is approved automatically; approval is always your decision (`docs/images/REVIEW-SHEETS.md`).');
  L.push('');
  L.push('## Order');
  L.push('');
  L.push('| Step | Files | Images | Why |');
  L.push('|---|---|---|---|');
  L.push(`| 1 | \`redo-01.txt\` to \`redo-${String(redo.length).padStart(2, '0')}.txt\` | ${sum(redo)} | Regenerate the flagged images (text, square-for-wide, wrong backdrop). Same file names as the originals. |`);
  L.push(`| 2 | \`cmd-036.txt\` onward (${cmd.length} files, see \`paste/INDEX.md\`) | ${sum(cmd)} | The pending image list (next1000), in command order. |`);
  L.push(`| 3 | \`inter-01.txt\` to \`inter-${String(inter.length).padStart(2, '0')}.txt\` | ${sum(inter)} | Two scene pictures per intermediate lesson (I-01 to I-50). |`);
  if (J) L.push(`| 4 | \`J-MASTER.txt\` (read first), then \`j-01.txt\` to \`j-${String(J.files.length).padStart(2, '0')}.txt\` | ${sum(J.files)} | Block J: ${J.rows} further pictures, \`J-0001.png\` to \`J-${String(J.rows).padStart(4, '0')}.png\`, one paste file per command (301 and up). |`);
  if (R) L.push(`| 5 | \`tools/images/run3-source.md\` (commands 150 to 249, pasted one command per message; see \`RUN3.md\`) | ${R.rows} | Run 3: ${R.commands} commands x 10 images, named by the commands themselves (\`TROPE_<name>_mnemonic.png\`, \`CRAFT_bimah_01.png\` ... \`FINALE_set_10.png\`); rows in \`data/images/run3.csv\`. |`);
  L.push('');
  L.push(`Steps 2${J ? ', 3 and 4' : ' and 3'}${R ? ' and 5' : ''} are independent of step 1; run step 1 first because the redo images replace images the lessons already point at.`);
  L.push('');
  L.push('## Files and counts');
  L.push('');
  L.push(`- redo (${sum(redo)}): ${line(redo)}`);
  L.push(`- inter (${sum(inter)}): ${line(inter)}`);
  L.push(`- cmd (${sum(cmd)}): ${line(cmd)}`);
  if (J) L.push(`- block J (${sum(J.files)}): ${line(J.files)}`);
  if (R) L.push(`- run 3 (${R.rows}): one row per image in \`data/images/run3.csv\`, ten per command, commands 150 to 249`);
  L.push('');
  L.push('## After each file');
  L.push('');
  L.push('1. Count the images against the number above. If any came out with text in it, a square instead of a wide picture, or the wrong scene, ask the image generator to redo just that item, quoting its filename and the rule it broke.');
  L.push('2. Download into one folder per step (for example `~/alef-returns/redo`, `~/alef-returns/cmd`, `~/alef-returns/inter`, `~/alef-returns/block-j`). Keep the exact names; a browser suffix such as " (1)" is reported but never used.');
  L.push('2a. If the image tool returned hashed names (`exec-<uuid>.png`) instead of the FILENAMEs, identify each file first and record the result in an identification map outside the repo (`../alef-image-originals/hashed/map-*.json`, merged into `map-all.json`: hashed name, mtime, id, list, confidence, evidence). Copy the files under their ids into a staging folder and ingest that folder; pass the medium-confidence ids with `--needs-eye ids.txt` so the review page marks them "check by eye". The open review list is `docs/images/REVIEW-QUEUE.md`.');
  L.push('3. Check names before ingesting. Intermediate images: `node tools/images/match_inter.mjs ~/alef-returns/inter` (dry run, writes nothing). Block J: `node tools/images/match_blockj.mjs <folder>` (dry run, also shows which j-NN file is incomplete). Run 3: rename the returned files to their run3 ids, then `node tools/images/match_run3.mjs <folder>` (dry run, shows which command is incomplete). Others: `node tools/images/ingest.mjs ingest <folder> --dry-run`.');
  L.push('4. Ingest: `node tools/images/ingest.mjs ingest <folder>` (redo images: add `--replace`). Intermediate and block J images need their rows in `manifest.csv` first: `node tools/images/append_manifest_rows.mjs --dry-run [data/images/block-j.csv | data/images/run3.csv]`, then without `--dry-run` (see `docs/images/INTER-INGEST.md`).');
  L.push('5. Review: `node tools/images/review_page.mjs`, then open `data/images/review/index.html` (keys: j/k move, a approve, x reject, d redo, Enter enlarge). Download `decisions.json` and run `node tools/images/ingest.mjs apply-decisions decisions.json --force` (`--force` only matters for images you approved despite a text flag). Contact sheets are still available (`node tools/images/sheets.mjs`); see `docs/images/REVIEW-SHEETS.md`. To look at returned files before ingesting: `node tools/images/review_page.mjs --folder <folder>`. Then `node tools/images/validate.mjs` must report 0 errors.');
  L.push('6. Regenerate alt text after any manifest rebuild: `node tools/images/alt_text.mjs`.');
  L.push('');
  L.push('## Rules that every file already carries');
  L.push('');
  L.push('No text of any kind in an image; only 1:1, 3:2 and 2:3 shapes; exact backdrops; no identifiable real people. If an image breaks one of these, do not approve it.');
  L.push('');
  return L.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) { writeFileSync(OUT, render()); console.log(`wrote ${OUT}`); }
