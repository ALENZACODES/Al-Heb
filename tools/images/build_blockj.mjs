#!/usr/bin/env node
// Block J builder: the 1000 further images (commands 301+). Writes
//   data/images/block-j.csv, docs/images/paste/j-NN.txt, docs/images/paste/J-MASTER.txt, docs/images/BLOCK-J.md
//   node tools/images/build_blockj.mjs          write the files
//   node tools/images/build_blockj.mjs --dry    print counts only
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STYLE_GUIDE as STYLE } from './spec.mjs';
import { NO_TEXT_STRICT, NO_TEXT_ITEM } from './build_redo.mjs';
import { NO_PEOPLE, SACRED, csvCell } from './build_inter.mjs';
import * as S from './spec_blockj.mjs';

export const ROOT = S.ROOT;
export const OUT = join(ROOT, 'docs/images/paste');
export const CSV = join(ROOT, 'data/images/block-j.csv');
export const DOC = join(ROOT, 'docs/images/BLOCK-J.md');
export const FIRST_COMMAND = 301;
export const MAX_ITEMS = 20;
export const MAX_CHARS = 12000;
export const COMPACT_STYLE = 'Flat vector illustration (STYLE GUIDE v1): thick rounded outlines, soft cream background (#F6F1E7), palette of deep sea blue, pomegranate red, olive green, warm gold and charcoal, no gradients, not photoreal, light from the upper left.';
export const PEOPLE_SHORT = 'No real people, no individual faces; sacred books and scrolls stay blank.';
export const DIMS = { '1:1': [1024, 1024], '3:2': [1792, 1024], '2:3': [1024, 1536] };
const HINT = { '1:1': 'use 1:1', '3:2': 'use 3:2 (wide)', '2:3': 'use 2:3 (tall)' };
const CLAUSE = { '1:1': 'Square 1:1.', '3:2': 'Wide 3:2, clearly wider than tall, never square.', '2:3': 'Tall 2:3, clearly taller than wide, never square.' };
const HEAD = ['id', 'file', 'block', 'command', 'set', 'slot', 'kind', 'key', 'aspect', 'width', 'height', 'status', 'alt', 'prompt'];

const J = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const nz = (n, w = 2) => String(n).padStart(w, '0');

/** Raw (unnumbered) items in final order: {set, kind, key, core, aspect, alt}. */
export function items() {
  const e = S.deckPicks(new Set(), 308);
  const eHeads = new Set(e.map((x) => x.h));
  const T = S.themePicks(eHeads);
  const fixed = S.FESTIVALS.length + Object.keys(S.LESSON_SCENES).length + Object.keys(S.LETTER_ALTS).length + Object.keys(S.VOWEL_ALTS).length;
  const room = S.TOTAL - fixed;
  // top up (a) from the packs' next-best candidates when the SRS list is shorter than its quota
  let need = room - T.picks.length - e.length;
  const extra = [];
  while (need > 0) {
    let moved = false;
    for (const p of T.pools) {
      const c = p.rest.find((x) => !T.used.has(x.h) && !eHeads.has(x.h));
      if (c) { T.used.add(c.h); p.rest = p.rest.filter((x) => x !== c); extra.push({ ...c, pack: p.id }); need--; moved = true; if (!need) break; }
    }
    if (!moved) throw new Error('not enough word candidates');
  }
  const packOrder = T.themes.map((t) => t.id);
  const a = [...T.picks, ...extra].sort((x, y) => packOrder.indexOf(x.pack) - packOrder.indexOf(y.pack));
  const word = (w, set) => ({ set, kind: S.wordKind(w.h, w.pos), key: w.id, core: S.wordCore(w.h, w.pos), aspect: '1:1', alt: `Flat illustration for the Hebrew word meaning "${w.h}".` });
  const out = [];
  for (const w of a) out.push(word(w, `j_vocab_${w.pack}`));
  for (const f of S.FESTIVALS) out.push({ set: `j_festival_${f.set}`, kind: 'festival-scene', key: f.lesson, core: f.text, aspect: f.aspect, alt: `Flat illustration: ${f.text.replace(/\.$/, '').replace(/^A /, 'a ')}.` });
  for (const [lesson, text] of Object.entries(S.LESSON_SCENES)) out.push({ set: `j_lesson_${lesson}`, kind: 'lesson-scene', key: lesson, core: `Wide scene, flat vector illustration: ${text}`, aspect: '3:2', alt: `Extra scene for intermediate lesson ${lesson}: ${text.replace(/\.$/, '').replace(/^A /, 'a ')}.` });
  for (const [id, [asp, text]] of Object.entries(S.LETTER_ALTS)) out.push({ set: 'j_letter_alt', kind: 'letter-alt', key: id, core: `Second memory picture for the alphabet item named ${id.replace('-', ' ')} (draw only the object described, never any symbol of it): ${text}`, aspect: asp, alt: `Alternate memory picture for the letter ${id}: ${text.replace(/\.$/, '').replace(/^A /, 'a ')}.` });
  for (const [id, [asp, text]] of Object.entries(S.VOWEL_ALTS)) out.push({ set: 'j_vowel_alt', kind: 'vowel-alt', key: id, core: `Second memory picture for the vowel mark named ${id.replace(/^vowel_\d+_/, '').replace(/_/g, ' ')} (draw only the objects described, never any symbol of it): ${text}`, aspect: asp, alt: `Alternate memory picture for the vowel ${id.replace(/^vowel_\d+_/, '').replace(/_/g, ' ')}: ${text.replace(/\.$/, '').replace(/^A /, 'a ')}.` });
  for (const w of e) out.push({ ...word(w, 'j_srs'), kind: 'srs-card' });
  return { all: out, counts: { vocab: a.length, festival: S.FESTIVALS.length, lesson: Object.keys(S.LESSON_SCENES).length, letter: Object.keys(S.LETTER_ALTS).length, vowel: Object.keys(S.VOWEL_ALTS).length, srs: e.length } };
}

export const itemPrompt = (it) => `${COMPACT_STYLE} ${it.core} ${CLAUSE[it.aspect]} ${NO_TEXT_ITEM} ${PEOPLE_SHORT}`;
export const fullPrompt = (it) => `${STYLE} ${it.core} ${CLAUSE[it.aspect]} ${NO_TEXT_ITEM} ${PEOPLE_SHORT}`;

function itemLine(r, n) {
  return `${n}. FILENAME: ${r.file} | SIZE: ${HINT[r.aspect]} (target ${r.width}x${r.height}) | KEY: ${r.key} (${r.kind})\n   PROMPT: ${itemPrompt(r)}`;
}

export function render(nn, command, rows) {
  const L = [];
  const sets = [...new Set(rows.map((r) => r.set.replace(/^j_/, '')))];
  L.push(`ALEF IMAGE RUN - BLOCK J ${nn} (command ${command}): ${rows[0].file} to ${rows[rows.length - 1].file}`);
  L.push('');
  L.push('No attachments are needed; everything is described in words below.');
  L.push(`Sets in this file: ${sets.join(', ')}.`);
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
  L.push('FILE NAMES: each item gives the exact FILENAME (J- plus four digits plus .png). Save every image under exactly that name; the name is how the picture is matched to its place in the app or book. Label each image with its filename in your reply, never inside the image.');
  L.push('');
  L.push(`TASK: generate ${rows.length} separate images in STYLE GUIDE v1, in this order.`);
  L.push('');
  rows.forEach((r, i) => L.push(itemLine(r, i + 1)));
  L.push('');
  L.push('RULES (again):');
  L.push(`- NEVER put any text in any image. ${NO_TEXT_STRICT}`);
  L.push('- Allowed aspects are ONLY 1:1, 3:2 and 2:3: follow the size hint on each item; never deliver any other shape.');
  L.push(`- ${NO_PEOPLE}`);
  L.push(`- Generate exactly ${rows.length} separate images, one per numbered item, each as its own image (never a collage or grid). Do not skip or merge items.`);
  L.push('');
  L.push('When all images are done, reply ONLY with the numbered list of filenames (item number, exact filename) and the count, then STOP and wait for me to say "next". Do not start any other command.');
  L.push('');
  return L.join('\n');
}

export function build() {
  const { all, counts } = items();
  const files = []; let cur = [];
  const mk = (rows) => rows.map((r, i) => ({ ...r }));
  const num = (arr, start) => arr.map((r, i) => ({ ...r }));
  let seq = 0; const parts = [];
  const rowsFor = (arr) => arr.map((it) => { const [width, height] = DIMS[it.aspect]; return { ...it, width, height }; });
  const draft = (arr, nn) => rowsFor(arr).map((r, i) => ({ ...r, file: `J-${nz(seq + 1 + i, 4)}.png` }));
  let i = 0;
  while (i < all.length) {
    let n = Math.min(MAX_ITEMS, all.length - i);
    for (; n > 1; n--) {
      const trial = draft(all.slice(i, i + n)).map((r, k) => ({ ...r, set: r.set }));
      if (render('00', FIRST_COMMAND, trial).length <= MAX_CHARS - 50) break;
    }
    parts.push(all.slice(i, i + n)); i += n; seq += n;
  }
  let id = 0;
  const rows = [];
  parts.forEach((p, j) => {
    const command = FIRST_COMMAND + j;
    p.forEach((it, k) => {
      id++;
      const [width, height] = DIMS[it.aspect];
      rows.push({ id: `J-${nz(id, 4)}`, file: `J-${nz(id, 4)}.png`, block: 'J', command, set: it.set, slot: k + 1, kind: it.kind, key: it.key, aspect: it.aspect, width, height, status: 'pending', alt: it.alt, prompt: fullPrompt(it), core: it.core, _item: it });
    });
  });
  const byCmd = new Map();
  for (const r of rows) { if (!byCmd.has(r.command)) byCmd.set(r.command, []); byCmd.get(r.command).push(r); }
  for (const [command, rs] of byCmd) {
    const nn = nz(command - FIRST_COMMAND + 1);
    files.push({ name: `j-${nn}.txt`, nn, command, rows: rs, text: render(nn, command, rs) });
  }
  const csv = [HEAD.join(','), ...rows.map((r) => HEAD.map((h) => csvCell(r[h])).join(','))].join('\n') + '\n';
  return { rows, files, csv, counts, master: master(files, rows, counts), doc: doc(files, rows, counts) };
}

function master(files, rows, counts) {
  const L = [];
  L.push('ALEF IMAGE RUN - BLOCK J MASTER INSTRUCTIONS (commands 301 to ' + (FIRST_COMMAND + files.length - 1) + ')');
  L.push('');
  L.push(`This is a run of ${rows.length} further pictures for the app and the book, in ${files.length} paste files. Nothing needs to be attached. Keep ONE conversation in the image tool for the whole run so the style stays the same.`);
  L.push('');
  L.push('HOW TO RUN');
  L.push('1. Paste the files below one at a time, in this order: j-01.txt first, then j-02.txt, and so on. Each file is self-contained (style guide, rules, every prompt).');
  L.push('2. After each file, the tool replies with a numbered list of filenames and a count. Check the count matches, then say "next" and paste the following file.');
  L.push('3. Save every image under exactly the filename given (J-0001.png ... J-1000.png). Never rename. A browser suffix such as " (1)" is reported, never used.');
  L.push('4. Return the images by putting them all in one folder (for example ~/alef-returns/block-j) with their exact names. Do not add text, borders or captions to any image.');
  L.push('5. If an image comes out with any lettering, numerals or a real-looking face, regenerate that one image and keep the same name.');
  L.push('');
  L.push('RULES THAT NEVER CHANGE: no text of any kind in any image, no real people or individual faces, no logos, aspect ratios only 1:1, 3:2 or 2:3 as shown on each item.');
  L.push('');
  L.push('FILES IN ORDER (file: images, filenames)');
  for (const f of files) L.push(`${f.name}: ${f.rows.length} images, ${f.rows[0].file} to ${f.rows[f.rows.length - 1].file}`);
  L.push('');
  L.push('Totals: ' + `${counts.vocab} vocabulary pictures, ${counts.festival} festival and Shabbat scenes, ${counts.lesson} lesson scenes, ${counts.letter} letter alternates, ${counts.vowel} vowel alternates, ${counts.srs} flashcard pictures = ${rows.length}.`);
  L.push('');
  return L.join('\n');
}

function doc(files, rows, counts) {
  const L = [];
  L.push('# Block J: the further 1000 images');
  L.push('');
  L.push(`Commands ${FIRST_COMMAND} to ${FIRST_COMMAND + files.length - 1}. ${rows.length} images that do not repeat the manifest, next1000 or intermediate-lesson sets. Rebuild with \`node tools/images/build_blockj.mjs\`; selection rules live in \`tools/images/spec_blockj.mjs\`.`);
  L.push('');
  L.push('| Part | Images | Source of the key |');
  L.push('|---|---|---|');
  L.push(`| Vocabulary theme packs (most concrete words per pack, 12 each plus top-ups) | ${counts.vocab} | word id in data/vocab/themes/*.json |`);
  L.push(`| Festivals, Shabbat table, Havdalah, synagogue interior | ${counts.festival} | intermediate lesson id (data/curriculum/intermediate-index.json) |`);
  L.push(`| One extra scene per intermediate lesson I-01 to I-50 | ${counts.lesson} | lesson id |`);
  L.push(`| Second memory picture per letter (27) | ${counts.letter} | letter id in data/letters/letters.json |`);
  L.push(`| Second memory picture per vowel (15) | ${counts.vowel} | vowel set name in data/images/manifest.csv |`);
  L.push(`| Flashcard pictures from data/vocab/deck-order.json not already in a pack | ${counts.srs} | word id |`);
  L.push('');
  L.push('Files: `data/images/block-j.csv` (id, file, block, command, set, slot, kind, key, aspect, width, height, status, alt, prompt), `docs/images/paste/j-NN.txt`, `docs/images/paste/J-MASTER.txt`. Start with `docs/images/paste/J-MASTER.txt`, then `j-01.txt`.');
  L.push('');
  L.push('| File | Command | Images | First | Last |');
  L.push('|---|---|---|---|---|');
  for (const f of files) L.push(`| ${f.name} | ${f.command} | ${f.rows.length} | ${f.rows[0].file} | ${f.rows[f.rows.length - 1].file} |`);
  L.push('');
  L.push('Word selections are by rule (concrete nouns, everyday actions, plain qualities, counts and times) and are not reviewed by a native speaker; check each picture against its Hebrew word before use.');
  L.push('');
  return L.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const B = build();
  const info = { rows: B.rows.length, files: B.files.length, counts: B.counts, maxChars: Math.max(...B.files.map((f) => f.text.length)) };
  if (process.argv.includes('--dry')) { console.log(info); process.exit(0); }
  mkdirSync(OUT, { recursive: true });
  for (const f of readdirSync(OUT)) if (/^j-\d\d\.txt$/.test(f)) unlinkSync(join(OUT, f));
  for (const f of B.files) writeFileSync(join(OUT, f.name), f.text);
  writeFileSync(join(OUT, 'J-MASTER.txt'), B.master);
  writeFileSync(CSV, B.csv);
  writeFileSync(DOC, B.doc);
  console.log(info);
}
