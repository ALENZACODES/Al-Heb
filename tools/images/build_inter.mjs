#!/usr/bin/env node
// Builds the paste files for the intermediate-lesson images (docs/images/paste/inter-NN.txt, at most 25 images
// each) and data/images/inter-pending.csv (same columns as manifest.csv) from data/curriculum/intermediate-image-slots.json.
// The file name of every returned image is the slot id plus .png (for example I-01-img1.png); see docs/images/INTER-INGEST.md.
//   node tools/images/build_inter.mjs          write the files
//   node tools/images/build_inter.mjs --dry    print counts only
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STYLE_GUIDE as STYLE } from './spec.mjs';
import { NO_TEXT_STRICT, NO_TEXT_ITEM } from './build_redo.mjs';
import { aspect } from './build_paste_files.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SLOTS = join(ROOT, 'data/curriculum/intermediate-image-slots.json');
export const OUT = join(ROOT, 'docs/images/paste');
export const CSV = join(ROOT, 'data/images/inter-pending.csv');
export const MAX_ITEMS = 25;
export const MAX_CHARS = 12000;
export const FIRST_COMMAND = 201; // inter-01 = command 201 (cmd-NNN uses 36-149)
export const W = 1792, H = 1024; // scenes are wide: the image generator delivers 3:2
export const NO_PEOPLE = 'No identifiable or real people: any person is a generic stylised figure seen from behind, from the side or at a distance, with no individual face; no portraits and no likenesses of anyone real.';
export const SACRED = 'Sacred books and scrolls are never shown with legible writing: pages and parchment stay blank; ritual objects are drawn plainly and respectfully.';
const HEAD = ['file', 'set', 'command', 'block', 'width', 'height', 'status', 'prompt'];

export function loadSlots(path = SLOTS) {
  const d = JSON.parse(readFileSync(path, 'utf8'));
  return d.lessons.flatMap((l) => l.slots.map((s) => ({ id: s.id, lesson: l.lesson, title: l.title, role: s.role, scene: s.scene })));
}

/** Per-item prompt: the slot's scene line in the flat-vector style, with the rules said again in short. */
export function slotPrompt(s) {
  const scene = s.scene.replace(/\s+/g, ' ').trim();
  return `Wide scene, flat vector illustration (not a photograph): ${scene} Wide 3:2, clearly wider than tall, never square. ${NO_TEXT_ITEM} No real people, no individual faces; sacred books and scrolls stay blank.`;
}

export const csvCell = (v) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function chunk(items, n = MAX_ITEMS, maxChars = MAX_CHARS) {
  const parts = []; let cur = [];
  for (const r of items) {
    const next = [...cur, r];
    if (cur.length && (next.length > n || render('00', FIRST_COMMAND, next).length > maxChars)) { parts.push(cur); cur = [r]; } else cur = next;
  }
  if (cur.length) parts.push(cur);
  return parts;
}

export function render(nn, command, items) {
  const L = [];
  L.push(`ALEF IMAGE RUN - INTERMEDIATE ${nn} (command ${command}): lesson scenes ${items[0].lesson} to ${items[items.length - 1].lesson}`);
  L.push('');
  L.push('No attachments are needed; everything is described in words below. These are the opening and closing scene pictures of the intermediate prayer lessons.');
  L.push('');
  L.push('STYLE GUIDE v1 (applies to EVERY image below):');
  L.push(STYLE);
  L.push('');
  L.push('SCENE RULES (apply to every image):');
  L.push(`- ${NO_TEXT_STRICT}`);
  L.push(`- ${NO_PEOPLE}`);
  L.push(`- ${SACRED}`);
  L.push('- Same flat-vector style, line weight and palette in every image; calm, warm, respectful mood.');
  L.push('');
  L.push(`FILE NAMES: each item gives the exact FILENAME (the slot id plus .png). Save every image under exactly that name; the name is how the picture is matched to its lesson slot. Label each image with its filename in your reply, never inside the image.`);
  L.push('');
  L.push(`TASK: generate ${items.length} separate images in STYLE GUIDE v1, in this order.`);
  L.push('');
  items.forEach((s, i) => L.push(`${i + 1}. FILENAME: ${s.id}.png | SIZE: ${aspect(W, H).hint} (target ${W}x${H}) | LESSON: ${s.lesson}, ${s.role}\n   PROMPT: ${slotPrompt(s)}`));
  L.push('');
  L.push('RULES (again):');
  L.push(`- NEVER put any text in any image. ${NO_TEXT_STRICT}`);
  L.push('- Allowed aspects are ONLY 1:1, 3:2 and 2:3: every item here is 3:2 (wide); never deliver a square.');
  L.push(`- ${NO_PEOPLE}`);
  L.push(`- Generate exactly ${items.length} separate images, one per numbered item, each as its own image (never a collage or grid). Do not skip or merge items.`);
  L.push('');
  L.push('When all images are done, reply ONLY with the numbered list of filenames (item number, exact filename) and the count, then STOP and wait for me to say "next". Do not start any other command.');
  L.push('');
  return L.join('\n');
}

export function build(path = SLOTS) {
  const slots = loadSlots(path);
  const parts = chunk(slots);
  const files = parts.map((rows, j) => {
    const nn = String(j + 1).padStart(2, '0');
    return { name: `inter-${nn}.txt`, nn, command: FIRST_COMMAND + j, rows, text: render(nn, FIRST_COMMAND + j, rows) };
  });
  for (const f of files) if (f.text.length > MAX_CHARS) throw new Error(`${f.name} is ${f.text.length} chars`);
  const csvRows = files.flatMap((f) => f.rows.map((s) => ({ file: `${s.id}.png`, set: `intermediate_${s.lesson}`, command: f.command, block: 'I', width: W, height: H, status: 'pending', prompt: `${STYLE} ${slotPrompt(s)}` })));
  const csv = [HEAD.join(','), ...csvRows.map((r) => HEAD.map((h) => csvCell(r[h])).join(','))].join('\n') + '\n';
  return { slots, files, csv };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const B = build();
  const info = { slots: B.slots.length, files: B.files.map((f) => `${f.name}:${f.rows.length}`).join(' '), maxChars: Math.max(...B.files.map((f) => f.text.length)) };
  if (process.argv.includes('--dry')) { console.log(info); process.exit(0); }
  mkdirSync(OUT, { recursive: true });
  for (const f of readdirSync(OUT)) if (/^inter-\d\d\.txt$/.test(f)) unlinkSync(join(OUT, f));
  for (const f of B.files) writeFileSync(join(OUT, f.name), f.text);
  writeFileSync(CSV, B.csv);
  console.log(info);
}
