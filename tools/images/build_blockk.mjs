// Block K paste files: game playfields, Rimon reactions and workbook covers (tools/images/blockk.json).
// Writes docs/images/paste/K-MASTER.txt, docs/images/paste/k-NN.txt and docs/images/BLOCK-K.md. Run: node tools/images/build_blockk.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { STYLE_GUIDE as STYLE, ARI, NOA } from './spec.mjs';
import { MASCOT } from './spec_next.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const K = JSON.parse(readFileSync(ROOT + 'tools/images/blockk.json', 'utf8'));
const BG = "BACKGROUND SCENES (when a prompt mentions BG_...): BG_telaviv = a blank Tel Aviv seaside street scene (white modernist buildings, palms, no signs).";
const SIZE = { '1:1': 'use 1:1', '2:3': 'use 2:3 (portrait)', '3:2': 'use 3:2 (landscape)' };

export function commandText(c, n) {
  const lines = [`Aleph IMAGE RUN - BLOCK K COMMAND ${n}: ${c.title}`, '', 'No attachments are needed; everything is described in words below.', '',
    'STYLE GUIDE v1 (applies to EVERY image below):', STYLE, '',
    'CHARACTERS (keep identical across images):', ARI, NOA, MASCOT, '', BG, '',
    'TRANSPARENCY: items marked TRANSPARENT must be a PNG with a fully transparent background (no cream fill, no white box, no ground shadow). Items marked TILE must repeat seamlessly in both directions.', '',
    `TASK: generate ${c.items.length} separate images in STYLE GUIDE v1, in this order. Each item gives the exact filename (label the image with it in your reply, never inside the image), the size hint and the full prompt.`, ''];
  c.items.forEach((it, i) => {
    const flags = [it.transparent ? 'TRANSPARENT' : '', it.tile ? 'TILE' : ''].filter(Boolean).join(', ');
    lines.push(`${i + 1}. FILENAME: ${it.name} | SIZE: ${SIZE[it.aspect]}${flags ? ` | ${flags}` : ''}`, `   PROMPT: ${it.prompt} No text, letters or numerals anywhere in the image.`);
  });
  lines.push('', 'RULES (again):', '- NEVER put any text in any image: no Hebrew, no nikkud, no Latin letters, no numerals, no logos.',
    `- Generate exactly ${c.items.length} separate images, one per numbered item, each as its own image (never a collage or grid). Do not skip or merge items.`,
    '- When done, list the filenames you made and wait for "next".', '');
  return lines.join('\n');
}

function main() {
  const total = K.commands.reduce((n, c) => n + c.items.length, 0);
  const master = ['Aleph IMAGE RUN - BLOCK K (game playfields, Rimon reactions, workbook covers)', '',
    `This run makes ${total} images in ${K.commands.length} commands. Keep this one conversation for the whole run.`,
    'I will paste one command at a time (k-01 to k-' + String(K.commands.length).padStart(2, '0') + '). For each, make exactly the images listed, each as its own PNG, named exactly as given, then list the filenames and wait for "next".',
    'Style, characters and rules are repeated inside every command. Reply "ready" and wait for the first command.', ''].join('\n');
  writeFileSync(ROOT + 'docs/images/paste/K-MASTER.txt', master);
  K.commands.forEach((c, i) => writeFileSync(ROOT + `docs/images/paste/${c.file}.txt`, commandText(c, i + 1)));
  const md = ['# Block K: game playfields, Rimon reactions and workbook covers', '',
    `${total} images in ${K.commands.length} commands, for the 25 Nov 2026 critique (item 8, game graphics) and the printable workbooks. Every picture is optional: the app already runs without it and switches to it as soon as the file is in place.`, '',
    '## How to run', '', '1. Open one image conversation and paste `docs/images/paste/K-MASTER.txt`.', '2. Paste `k-01.txt`, save every image under its exact FILENAME, type "next", paste `k-02.txt`, and so on.',
    '3. Put all the downloaded PNGs in one folder and run `python3 tools/images/ingest_blockk.py <folder>`. It resizes each one, makes the cream background transparent where a sprite needs it, and writes it to its place below.',
    '4. Run `node tools/build-precache.mjs` and the tests, then look at each game.', '',
    '## What goes where', '', '| Cmd | File from the image tool | Goes to | Size | Used by |', '|---|---|---|---|---|'];
  const USED = { 'rimon-cheer': 'every arcade game: Rimon cheers on a right answer (src/games/arcade.js boardReact)', 'rimon-oops': 'every arcade game: Rimon winces on a wrong answer',
    wall: 'Letter Chomp, Word Maze walls (assets/css/arcade.css)', path: 'Letter Chomp, Word Maze open squares', grass: 'Syllable Snake board', well: 'Falling Letters well', sky: 'Letter Drop lanes',
    'snake-head': 'Syllable Snake head', 'snake-body': 'Syllable Snake body', 'train-engine': 'Sentence Train (replaces the 🚂 emoji)', icepop: 'Meltdown, one stage per wrong guess (replaces the emoji)', cover: 'Printable workbook cover for that belt (src/workbook/render.js)' };
  K.commands.forEach((c, i) => c.items.forEach((it) => {
    const stem = it.dest.split('/').pop().replace('.png', '');
    const used = USED[stem] || (stem.startsWith('icepop') ? USED.icepop : it.dest.includes('/covers/') ? USED.cover : '');
    md.push(`| ${i + 1} | ${it.name} | \`${it.dest}\` | ${it.size.join('x')}${it.transparent ? ', transparent' : ''}${it.tile ? ', tiles' : ''} | ${used} |`);
  }));
  md.push('', 'The dictionary pictures are not in this block: they are already written as Block J (`docs/images/BLOCK-J.md`, paste files `j-01.txt` onwards, 788 word pictures). None of those has been made yet, which is why most dictionary entries have no picture.', '');
  writeFileSync(ROOT + 'docs/images/BLOCK-K.md', md.join('\n'));
  console.log(`Block K: ${total} images in ${K.commands.length} paste files`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
