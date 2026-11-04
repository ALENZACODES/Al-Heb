#!/usr/bin/env node
// Writes docs/images/paste/cmd-<NNN>[-a|-b].txt (self-contained ChatGPT paste files), README.md and INDEX.md
// from data/images/next1000-groups.json. Run after build_next1000.mjs.
import { writeFileSync, readFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STYLE_GUIDE as STYLE, ARI, NOA } from './spec.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT = join(ROOT, 'docs/images/paste');
export const MAX_CHARS = 12000;
export const NO_TEXT = 'NEVER put any text in any image: no Hebrew, no nikkud, no Latin letters, no numerals, no logos. Signs, screens, pages, books, labels and scrolls stay completely blank.';
const RIMON = "MASCOT 'Rimon': a small round pomegranate-red sprite with a gold crown-shaped calyx on top, two olive-green leaf ears, big friendly dot eyes, tiny arms and feet, thick charcoal outline; expressive but never any writing.";
const BG = {
  BG_jerusalem: 'a blank Jerusalem street scene (warm limestone walls, arched doorways, no signs)',
  BG_market: 'a blank open-air market scene (stalls with plain striped awnings, no signs)',
  BG_telaviv: 'a blank Tel Aviv seaside street scene (white modernist buildings, palms, no signs)',
};

export function aspect(w, h) {
  const r = Number(w) / Number(h);
  if (Math.abs(r - 1) < 0.02) return { ratio: '1:1', hint: 'use 1:1' };
  if (r > 1.3) return { ratio: '3:2', hint: 'use 3:2 (wide)' };
  return { ratio: '2:3', hint: 'use 2:3 (tall)' };
}

const stripStyle = (p) => (p.startsWith(STYLE) ? p.slice(STYLE.length).trim() : p);

function header(g, part, inputs) {
  const refs = inputs.filter((f) => /^(REF_|MAS_)/.test(f));
  const L = [];
  L.push(`ALEF IMAGE RUN - COMMAND ${g.number}${part ? ` (part ${part})` : ''}: ${g.title}`);
  L.push('');
  if (refs.length) { L.push(`ATTACH: ${refs.join(', ')} (attach once, before pasting this).`); L.push(''); }
  L.push('No attachments are needed otherwise; everything is described in words below.');
  L.push('');
  L.push('STYLE GUIDE v1 (applies to EVERY image below):');
  L.push(STYLE);
  L.push('');
  L.push('CHARACTERS (keep identical across images):');
  L.push(ARI);
  L.push(NOA);
  L.push(RIMON);
  L.push('');
  L.push('BACKGROUND SCENES (when a prompt mentions BG_...): ' + Object.entries(BG).map(([k, v]) => `${k} = ${v}`).join('; ') + '. Reuse the same scene if already generated in this chat.');
  L.push('');
  L.push('REFERENCES: where a prompt says "attached" or "the same object", it means the image already generated in this chat for the same set (usually item 1, the mnemonic), or the file attached above. Keep the object identical.');
  L.push('');
  return L;
}

function footer(n) {
  return [
    '',
    'RULES (again):',
    `- ${NO_TEXT}`,
    `- ChatGPT only offers 1:1, 3:2 and 2:3: follow the size hint on each item.`,
    `- Generate exactly ${n} separate images, one per numbered item, each as its own image (never a collage or grid). Do not skip or merge items.`,
    '',
    'When all images are done, reply ONLY with the numbered list of filenames (item number, exact filename) and the count, then STOP and wait for me to say "next". Do not start any other command.',
    '',
  ];
}

function item(i, r) {
  const a = aspect(r.width, r.height);
  return `${i}. FILENAME: ${r.file} | SIZE: ${a.hint} (target ${r.width}x${r.height})\n   PROMPT: ${stripStyle(r.prompt)}`;
}

/** Splits a group's rows into chunks so each rendered file stays under MAX_CHARS. */
export function renderGroup(g) {
  const cap = (rows, part) => {
    const L = header(g, part, g.inputs);
    L.push(`TASK: generate ${rows.length} separate images in STYLE GUIDE v1, in this order. Each item gives the exact filename (label the image with it in your reply, never inside the image), the aspect hint and the full prompt.`);
    L.push('');
    rows.forEach((r, i) => L.push(item(i + 1, r)));
    L.push(...footer(rows.length));
    return L.join('\n');
  };
  const whole = cap(g.rows, '');
  if (whole.length <= MAX_CHARS) return [{ suffix: '', text: whole, rows: g.rows }];
  let k = 2;
  for (;; k++) {
    const size = Math.ceil(g.rows.length / k);
    const parts = Array.from({ length: k }, (_, j) => g.rows.slice(j * size, (j + 1) * size)).filter((x) => x.length);
    const texts = parts.map((rows, j) => cap(rows, `${'abcdefgh'[j]} of ${parts.length}`));
    if (texts.every((t) => t.length <= MAX_CHARS)) return parts.map((rows, j) => ({ suffix: '-' + 'abcdefgh'[j], text: texts[j], rows }));
    if (k > 8) throw new Error(`command ${g.number} cannot fit`);
  }
}

export function buildPaste() {
  const { groups } = JSON.parse(readFileSync(join(ROOT, 'data/images/next1000-groups.json'), 'utf8'));
  const files = [];
  for (const g of groups) {
    const nnn = String(g.number).padStart(3, '0');
    for (const p of renderGroup(g)) files.push({ name: `cmd-${nnn}${p.suffix}.txt`, number: g.number, title: g.title, text: p.text, count: p.rows.length, split: !!p.suffix });
  }
  return files;
}

export const README = `# ChatGPT paste files

1. Open one ChatGPT conversation (image generation on) and keep it for the whole run; do not attach anything unless a file starts with an ATTACH line.
2. Open cmd-028.txt (see INDEX.md), copy the whole file and paste it as one message; ChatGPT makes the numbered images.
3. Save every image under the exact FILENAME shown for it (ChatGPT only makes 1:1, 3:2 and 2:3, so 1792x1024 images come out 3:2 and 1024x1280 ones 2:3; resize later).
4. When ChatGPT replies with the filenames list and waits, check the count against INDEX.md, then type "next" and paste the following file (cmd-029.txt, ...). Files split into -a/-b are pasted in order.
5. If ChatGPT puts any text in an image, ask it to redo that item without text. Rebuild these files with \`node tools/images/build_paste_files.mjs\`.
`;

export function indexMd(files) {
  const rows = files.map((f) => `| ${f.number} | ${f.title} | ${f.count} | \`${f.name}\`${f.split ? ' (split)' : ''} |`);
  const total = files.reduce((a, f) => a + f.count, 0);
  const splits = files.filter((f) => f.split).map((f) => f.name).join(', ');
  return `# Paste file index

${files.length} files, ${total} images. Files over ${MAX_CHARS} characters are split into -a/-b parts (paste in order): ${splits || 'none'}.

| Cmd | Title | Images | File |
|---|---|---|---|
${rows.join('\n')}
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(OUT, { recursive: true });
  for (const f of readdirSync(OUT)) if (/^cmd-.*\.txt$/.test(f)) unlinkSync(join(OUT, f));
  const files = buildPaste();
  for (const f of files) writeFileSync(join(OUT, f.name), f.text);
  writeFileSync(join(OUT, 'README.md'), README);
  writeFileSync(join(OUT, 'INDEX.md'), indexMd(files));
  console.log(`${files.length} files, ${files.reduce((a, f) => a + f.count, 0)} images, max ${Math.max(...files.map((f) => f.text.length))} chars`);
}
