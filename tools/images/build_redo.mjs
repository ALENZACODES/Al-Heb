#!/usr/bin/env node
// Builds the redo queue for ingested images that the ingest / matcher flagged:
//   contains_text (OCR hit), aspect_mismatch_allowed (square delivered for a wide row), wrong backdrop (scene seen != scene asked).
// Writes docs/images/REDO-LIST.md (every flagged image + a one-page eyeball checklist) and docs/images/paste/redo-NN.txt
// (image paste files in the same format as cmd-NNN.txt, at most MAX_ITEMS images each, with stricter wording).
// Sources: data/images/provenance.json (flags, prompt snapshot, expected size), data/images/review-notes.json (scene seen/expected),
// data/images/ingest-report.json when present (cross-check only). Pure helpers are exported for tests.
//   node tools/images/build_redo.mjs            write the files
//   node tools/images/build_redo.mjs --dry      print counts only
import { writeFileSync, readFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STYLE_GUIDE as STYLE, ARI, NOA, LETTERS } from './spec.mjs';
import { aspect } from './build_paste_files.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT = join(ROOT, 'docs/images/paste');
export const LIST = join(ROOT, 'docs/images/REDO-LIST.md');
export const MAX_ITEMS = 25;
export const MAX_CHARS = 12000;

export const NO_TEXT_STRICT = 'ABSOLUTELY NO TEXT OF ANY KIND anywhere in the image: no Hebrew, no nikkud, no Latin letters, no numerals, no writing, no lettering-like marks, no logos, no signage, no labels, no price tags. Every sign, board, awning, screen, page, book, scroll and label must be completely blank.';
/** Short per-item form of the same rule (the full text is in the header and footer of every file). */
export const NO_TEXT_ITEM = 'No text of any kind anywhere: no letters, numerals, writing, logos or signage; every sign, board, awning and label completely blank.';
const RIMON = "MASCOT 'Rimon': a small round pomegranate-red sprite with a gold crown-shaped calyx on top, two olive-green leaf ears, big friendly dot eyes, tiny arms and feet, thick charcoal outline; expressive but never any writing.";

/** Exact backdrops. Each one names what it is AND what it is not, because the first run swapped scenes. */
export const BG = {
  BG_jerusalem: 'a Jerusalem stone courtyard at golden hour: warm limestone walls, arched doorways, a potted olive tree, a gold dome on the skyline; no people, no signs. NOT a cafe terrace, NOT a market, NOT a seaside boulevard, NOT a synagogue, NOT a Shabbat table',
  BG_market: 'a Carmel Market fruit stall scene: open-air stalls heaped with fruit under plain striped awnings; no people, no signs, no price tags. NOT a cafe terrace, NOT a stone courtyard, NOT a seaside boulevard, NOT a synagogue, NOT a Shabbat table',
  BG_telaviv: 'a Tel Aviv beachfront boulevard: white modernist buildings, palm trees, sea and sand along one side; no people, no signs. NOT a cafe terrace, NOT a stone courtyard, NOT a market, NOT a synagogue, NOT a Shabbat table',
  BG_cafe: 'an Israeli cafe terrace: stone wall with a striped awning, round tables and chairs, potted olive trees; no people, no signs, any board or menu is completely blank. NOT a market, NOT a seaside boulevard, NOT a stone courtyard',
};
const BG_NAMES = ['BG_jerusalem', 'BG_market', 'BG_telaviv', 'BG_cafe', 'BG_shabbat', 'BG_synagogue'];

export const FLAG_LABEL = { text: 'contains_text (OCR hit)', aspect: 'aspect substituted (square delivered, wide asked)', backdrop: 'wrong backdrop' };

const stripStyle = (p) => (p.startsWith(STYLE) ? p.slice(STYLE.length).trim() : p);
const stripNoText = (p) => p.replace(/\s*No text, letters or numerals anywhere in the image\.?\s*$/, '').trim();

/** Slot (file-name suffix or prefix family) and what the image is used for. */
export function slotOf(id) {
  if (/^L\d\d_/.test(id)) return id.slice(id.lastIndexOf('_') + 1);
  return id.split('_')[0];
}
const USE = {
  mnemonic: 'letter page: keyword object (book mnemonic figure)',
  ari: 'letter page: Ari pointing at the keyword object',
  noa: 'letter page: Noa pointing at the keyword object',
  silhouette: 'letter page: charcoal silhouette of the keyword object',
  v1: 'vocab picture 1 (book word figure)', v2: 'vocab picture 2 (book word figure)', v3: 'vocab picture 3 (book word figure)',
  s1: 'vocab word 1 placed in a background scene (wide)', s2: 'vocab word 2 placed in a background scene (wide)', s3: 'vocab word 3 placed in a background scene (wide)',
  BG: 'shared background scene (reused behind every s1/s2/s3 image)', CHAR: 'narrator sheet / portrait / variant', TEST: 'narrator consistency test',
  FRAME: 'letter-card frame', MOUTH: 'mouth shape', STYLE: 'style sample',
};
export function useOf(id) { return USE[slotOf(id)] ?? 'setup image'; }
export function lessonOf(id) {
  const m = /^L(\d\d)_([a-z_]+?)_(print|cursive)_/.exec(id);
  if (!m) return 'setup';
  const L = LETTERS.find((l) => l.nn === m[1]);
  return `L${m[1]} ${L ? L.title : m[2]} (${m[3]})`;
}

/** Which backdrop a scene prompt asks for, or null. */
export function backdropOf(prompt) { const m = /\((BG_[a-z]+)\)/.exec(prompt); return m ? m[1] : null; }

/**
 * Rewrites one original prompt (style guide already stripped) into the stricter redo prompt.
 * Every "attached" reference is replaced by words, the backdrop is spelled out, wide rows say so, and the strict no-text clause closes it.
 */
export function strictPrompt(id, prompt, w, h) {
  let p = stripNoText(stripStyle(prompt));
  if (BG[id]) p = `Wide background scene with no people: ${BG[id]}.`;
  const bg = backdropOf(p);
  if (bg && BG[bg]) p = p.replace(/placed naturally in the attached background scene \((BG_[a-z]+)\)/, `placed naturally, full-bleed, in this EXACT backdrop and no other: ${bg} (described in BACKDROPS above)`);
  p = p.replace(/\(same object as the attached mnemonic\)/g, '(exactly the same keyword object as the mnemonic image already made for this letter, drawn the same way)');
  p = p.replace(/Match the attached character sheet exactly\./g, 'Match the CHARACTER SHEET description above exactly.');
  p = p.replace(/at the cafe background \(attached\)/g, 'in this EXACT backdrop and no other: BG_cafe (described in BACKDROPS above)');
  p = p.replace(/Same 4-panel layout and style as the attached Ari sheet:/g, 'Same 4-panel layout and style as the Ari sheet (CHARACTER SHEET A above):');
  p = p.replace(/The attached object/g, 'The keyword object of this letter');
  if (/^s\d$/.test(slotOf(id))) p += ' The scene fills the whole frame edge to edge: no border, no inset panel, no cream margin.';
  if (Number(w) > Number(h)) p += ' MUST be wide 3:2 (clearly wider than tall), never square.';
  else if (Number(w) < Number(h)) p += ' MUST be tall 2:3 (clearly taller than wide), never square.';
  else p += ' MUST be square 1:1.';
  if (/attached/i.test(p)) p = p.replace(/attached/gi, 'already described');
  return `${p} ${NO_TEXT_ITEM}`;
}

/** Reads provenance + review notes (+ ingest report when present) and returns the flagged images in paste order. */
export function collectFlagged(root = ROOT) {
  const prov = JSON.parse(readFileSync(join(root, 'data/images/provenance.json'), 'utf8')).images;
  const notes = JSON.parse(readFileSync(join(root, 'data/images/review-notes.json'), 'utf8')).notes ?? {};
  const reportPath = join(root, 'data/images/ingest-report.json');
  const report = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, 'utf8')) : null;
  const reportFlags = new Map((report?.ingested ?? []).map((e) => [e.id, e.flags ?? []]));
  const out = [];
  for (const [id, rec] of Object.entries(prov)) {
    const flags = new Set([...(rec.flags ?? []), ...(reportFlags.get(id) ?? [])]);
    const n = notes[id] ?? {};
    const reasons = [];
    if (flags.has('contains_text')) reasons.push('text');
    if (flags.has('aspect_mismatch_allowed')) reasons.push('aspect');
    if (n.sceneSeen && n.sceneExpected && n.sceneSeen !== n.sceneExpected) reasons.push('backdrop');
    if (!reasons.length) continue;
    const w = rec.expected?.w ?? rec.width, h = rec.expected?.h ?? rec.height;
    out.push({
      id, file: rec.file ?? `${id}.png`, command: rec.command, set: rec.set, block: rec.block, slot: slotOf(id), use: useOf(id), lesson: lessonOf(id),
      width: w, height: h, got: `${rec.width}x${rec.height}`, reasons,
      sceneSeen: n.sceneSeen ?? null, sceneExpected: n.sceneExpected ?? null,
      ocr: (rec.ocr?.blobs ?? []).map((b) => b.t), possibleLetters: rec.ocr?.possibleLetters ?? [],
      defects: n.defects ?? [],
      original: stripStyle(rec.prompt), prompt: strictPrompt(id, rec.prompt, w, h),
      webp: (rec.variants ?? []).find((v) => v.edge === 800)?.file ?? null,
    });
  }
  // Setup images first (backgrounds before the scenes that reuse them), then lesson images in command order.
  const rank = (r) => (r.block === 'A' ? 0 : 1);
  out.sort((a, b) => rank(a) - rank(b) || a.command - b.command || a.id.localeCompare(b.id));
  const possibleText = Object.entries(prov).filter(([, r]) => (r.flags ?? []).includes('possible_text')).map(([id]) => id).sort();
  return { items: out, possibleText, reportPresent: !!report };
}

/** Splits in paste order so every file has at most `n` items and renders under MAX_CHARS. */
export function chunk(items, n = MAX_ITEMS, maxChars = MAX_CHARS) {
  const parts = []; let cur = [];
  for (const r of items) {
    const next = [...cur, r];
    if (cur.length && (next.length > n || renderRedo('00', next, items.length).length > maxChars)) { parts.push(cur); cur = [r]; }
    else cur = next;
  }
  if (cur.length) parts.push(cur);
  return parts;
}

function header(nn, part, items) {
  const used = [...new Set(items.map((r) => backdropOf(r.original)).filter((b) => b && BG[b]))];
  if (items.some((r) => /cafe background/.test(r.original)) && !used.includes('BG_cafe')) used.push('BG_cafe');
  const L = [];
  L.push(`Aleph IMAGE RUN - REDO ${nn}: regenerate flagged images (${items.length} of ${part})`);
  L.push('');
  L.push('No attachments are needed; everything is described in words below. These images were made once already and are being REDONE because the first versions had text in them, came out square instead of wide, or used the wrong backdrop. Follow the size, the backdrop and the no-text rule literally.');
  L.push('');
  L.push('STYLE GUIDE v1 (applies to EVERY image below):');
  L.push(STYLE);
  L.push('');
  L.push('CHARACTERS (keep identical across images):');
  L.push(ARI);
  L.push(NOA);
  L.push(RIMON);
  L.push('');
  if (used.length) L.push('BACKDROPS (exact; when an item names BG_..., use THAT scene and no other; reuse the same scene if already generated in this chat): ' + used.map((k) => `${k} = ${BG[k]}`).join('. ') + '.');
  else L.push('BACKDROPS: none of the items below uses a background scene.');
  L.push('');
  L.push('REFERENCES: nothing is attached. Where a prompt says "the same keyword object as the mnemonic image", draw the keyword object named in that prompt. Keep the characters identical to the CHARACTER SHEET descriptions.');
  L.push('');
  return L;
}

function footer(n) {
  return [
    '',
    'RULES (again):',
    `- NEVER put any text in any image. ${NO_TEXT_STRICT}`,
    '- Allowed aspects are ONLY 1:1, 3:2 and 2:3: follow the size hint on each item exactly. A "3:2 (wide)" item must come out clearly wider than tall; never deliver a square for it.',
    '- Backdrops: when an item names a BG_... scene, use exactly that scene as described above; never swap in a different scene.',
    `- Generate exactly ${n} separate images, one per numbered item, each as its own image (never a collage or grid). Do not skip or merge items.`,
    '',
    'When all images are done, reply ONLY with the numbered list of filenames (item number, exact filename) and the count, then STOP and wait for me to say "next". Do not start any other command.',
    '',
  ];
}

function item(i, r) {
  const a = aspect(r.width, r.height);
  return `${i}. FILENAME: ${r.file} | SIZE: ${a.hint} (target ${r.width}x${r.height}) | REDO BECAUSE: ${r.reasons.map((x) => FLAG_LABEL[x]).join('; ')}\n   PROMPT: ${r.prompt}`;
}

export function renderRedo(nn, items, total) {
  const L = header(nn, total, items);
  L.push(`TASK: generate ${items.length} separate images in STYLE GUIDE v1, in this order. Each item gives the exact filename (label the image with it in your reply, never inside the image), the aspect hint, why it is being redone, and the full prompt.`);
  L.push('');
  items.forEach((r, i) => L.push(item(i + 1, r)));
  L.push(...footer(items.length));
  return L.join('\n');
}

export function buildRedo(root = ROOT) {
  const { items, possibleText, reportPresent } = collectFlagged(root);
  const parts = chunk(items);
  const files = parts.map((rows, j) => {
    const nn = String(j + 1).padStart(2, '0');
    rows.forEach((r, i) => { r.redoFile = `redo-${nn}.txt`; r.redoItem = i + 1; });
    return { name: `redo-${nn}.txt`, nn, rows, text: renderRedo(nn, rows, items.length) };
  });
  for (const f of files) if (f.text.length > MAX_CHARS) throw new Error(`${f.name} is ${f.text.length} chars (> ${MAX_CHARS}); a single item is too long`);
  return { items, files, possibleText, reportPresent };
}

/** Hand-written observations from looking at the 800 px WebPs (what was seen, not a decision). */
export const LOOKED = {
  BG_cafe: 'cafe terrace with striped awning, blue chairs, a blank A-frame board; no lettering seen at 800 px',
  BG_jerusalem: 'limestone courtyard, arches, gold dome, potted olive tree; no lettering seen at 800 px',
  L01_alef_print_s1: 'square, not wide; a man and boy on a seaside boulevard (palms, beach), not the Jerusalem courtyard asked; no lettering seen',
  L01_alef_print_v1: 'a man holding a boy\'s hand on plain cream; no lettering seen',
  L07_zayin_print_ari: 'Ari pointing at a zipper pull; no lettering seen',
  L09_tet_print_v2: 'backpack, boots and a hiking pole with hills behind; no lettering seen',
  L13_mem_print_v3: 'family of four on plain cream; no lettering seen',
  CHAR_ari_telaviv: 'Ari in sunglasses, white buildings and palms behind, a red road; no lettering seen',
  L03_gimel_print_s2: 'square, not wide; a garden bed in front of the cafe terrace (asked: market); blank A-frame board; no lettering seen',
  L04_dalet_print_s1: 'square, not wide; a blue door in the Jerusalem courtyard as asked; no lettering seen at 800 px',
};

const md = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function renderList(B) {
  const { items, files, possibleText } = B;
  const count = (k) => items.filter((r) => r.reasons.includes(k)).length;
  const textItems = items.filter((r) => r.reasons.includes('text'));
  const L = [];
  L.push('# Redo list: flagged images from the Codex batch 01 ingest');
  L.push('');
  L.push(`${items.length} of the 282 ingested images carry at least one flag: **${count('text')}** \`contains_text\` (OCR hit), **${count('aspect')}** aspect substituted (a 1024x1024 square was delivered for a 1792x1024 row), **${count('backdrop')}** wrong backdrop (the scene the matcher saw differs from the scene the prompt asked for). Many scene images carry two or three flags, so the union is ${items.length}.`);
  L.push('');
  L.push(`Paste files: ${files.map((f) => `\`docs/images/paste/${f.name}\` (${f.rows.length})`).join(', ')}. Same format and routine as \`cmd-NNN.txt\` (see \`docs/images/paste/README.md\`), at most ${MAX_ITEMS} images per file. Each prompt is the original prompt with stricter wording: the no-text rule is spelled out per item, the backdrop is described in full and named as the only allowed scene, wide rows say "wide 3:2, never square", scene images must be full-bleed, and no item refers to an attachment. Rebuild with \`node tools/images/build_redo.mjs\`.`);
  L.push('');
  L.push('After the redo images are saved, ingest them the usual way (`node tools/images/ingest.mjs <folder>`); a redone file replaces the old one under the same id and is unapproved until you approve it. Nothing here approves or rejects anything.');
  L.push('');
  L.push('## Every flagged image');
  L.push('');
  L.push('| # | Id | File | Lesson | Slot / use | Flags | Seen / asked | Redo | Original prompt (style guide omitted) |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  items.forEach((r, i) => {
    const seen = r.reasons.includes('backdrop') ? `${r.sceneSeen} / ${r.sceneExpected}` : r.reasons.includes('aspect') ? `${r.got} / ${r.width}x${r.height}` : '-';
    L.push(`| ${i + 1} | ${r.id} | ${r.file} | ${md(r.lesson)} | ${r.slot}: ${md(r.use)} | ${r.reasons.map((x) => FLAG_LABEL[x]).join('; ')} | ${md(seen)} | ${r.redoFile} #${r.redoItem} | ${md(r.original)} |`);
  });
  L.push('');
  L.push(`## Eyeball checklist: the ${textItems.length} images OCR flagged as containing text`);
  L.push('');
  L.push('Open each 1600 px WebP in `assets/img/gen/` (or the contact sheets) and zoom in. Tick the box once you have looked. "Looked" is what one pass over the 800 px copy showed; it is an observation, not a decision, and an OCR hit that looks like noise still needs your eye before `--force` approval (see `docs/images/REVIEW-SHEETS.md`).');
  L.push('');
  L.push('| Done | Id | OCR saw | Possible letters | Looked (800 px) |');
  L.push('|---|---|---|---|---|');
  for (const r of textItems) L.push(`| [ ] | ${r.id} | ${md(r.ocr.join(' | ')) || '-'} | ${md(r.possibleLetters.join(' ')) || '-'} | ${md(LOOKED[r.id] ?? 'not looked at')} |`);
  L.push('');
  L.push('What to look for: any Hebrew or Latin letters or digits on awnings, boards, signs, shirts, boxes, books or screens; letter-like scribbles on labels; a logo. Striped awnings and blank boards are fine.');
  L.push('');
  const queued = new Map(items.map((r) => [r.id, r]));
  L.push(`## Weak OCR hits: ${possibleText.length} images flagged \`possible_text\``);
  L.push('');
  L.push('A weak OCR hit does not block approval and is not by itself a reason to redo. Ones already in a redo file for another reason say so; the others are not queued. Look at all of them on the contact sheets.');
  L.push('');
  L.push(possibleText.map((id) => `- ${id}${queued.has(id) ? ` (already in ${queued.get(id).redoFile} #${queued.get(id).redoItem}: ${queued.get(id).reasons.map((x) => FLAG_LABEL[x]).join('; ')})` : ' (not queued)'}`).join('\n'));
  L.push('');
  return L.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const B = buildRedo();
  const counts = { flagged: B.items.length, text: B.items.filter((r) => r.reasons.includes('text')).length, aspect: B.items.filter((r) => r.reasons.includes('aspect')).length, backdrop: B.items.filter((r) => r.reasons.includes('backdrop')).length, files: B.files.length, maxChars: Math.max(...B.files.map((f) => f.text.length)), ingestReport: B.reportPresent };
  if (process.argv.includes('--dry')) { console.log(counts); process.exit(0); }
  mkdirSync(OUT, { recursive: true });
  for (const f of readdirSync(OUT)) if (/^redo-\d{2}\.txt$/.test(f)) unlinkSync(join(OUT, f));
  for (const f of B.files) writeFileSync(join(OUT, f.name), f.text);
  writeFileSync(LIST, renderList(B));
  console.log(counts);
}
