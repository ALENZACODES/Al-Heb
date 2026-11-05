#!/usr/bin/env node
// Builds data/images/prompt-groups.json from tools/images/spec.mjs and MERGES the spec rows into data/images/manifest.csv.
// The manifest is NOT regenerated: it also holds rows from later builders (inter, block J, run3, ...) and ingest status edits.
// Merge rules: a spec row whose file exists in the manifest only has its prompt column updated (all other columns and all
// non-spec rows are kept, in order); spec rows missing from the manifest are appended; nothing is ever dropped.
// If nothing changes the manifest file is not touched.
// Usage: node tools/images/build_prompt_groups.mjs [--manifest FILE] [--groups FILE]   |  import { buildGroups, mergeManifest }
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as S from './spec.mjs';
import { parseCsv, toCsv as csvOf, writeTextAtomic } from './ingest_lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SQ = [1024, 1024];
const NO_TEXT = 'No text, letters or numerals anywhere in the image.';

const row = (g, file, prompt, size = SQ, extra = {}) => ({
  file: `${file}.png`, set: g.set, command: g.number, block: g.block,
  width: size[0], height: size[1], status: 'pending', prompt, ...extra,
});

const groups = [];
function group(number, block, set, title, template, variables, prompt, files, opts = {}) {
  const g = { number, block, set, title, template, variables, prompt, inputs: opts.inputs || [], textOutputs: opts.textOutputs || [], rows: [] };
  for (const f of files) g.rows.push(row(g, f.file, f.prompt, f.size, f.refs ? { refs: f.refs } : {}));
  g.expectedFiles = g.rows.map((r) => r.file);
  groups.push(g);
}

// ---------------- Block A (1-10) ----------------
group(1, 'A', 'setup_style', 'Style guide', 'literal', {},
  'Write STYLE GUIDE v1 for the ALEF image set and keep it for every later image: flat vector illustration, thick rounded outlines, soft paper-cream background (#F6F1E7), palette of deep sea blue (#1F3A5F), pomegranate red (#B0373B), olive green (#6B7F3A), warm gold (#D9A441) and charcoal (#2B2B2B); no gradients, no photoreal, no text of any kind; square 1024x1024 unless a command says otherwise; every object centred with 10% margin; consistent 3/4 top-down light from upper left. Print the guide as a numbered list, then generate one sample image of a ceramic cup on a wooden table in this style so we can approve it.',
  [{ file: 'STYLE_sample_cup', prompt: `${S.STYLE_GUIDE} A ceramic cup on a wooden table. ${NO_TEXT}` }],
  { textOutputs: ['numbered STYLE GUIDE v1 list'] });

group(2, 'A', 'setup_char_ari', 'Male narrator sheet', 'literal', {},
  `CHARACTER SHEET A - 'Ari': a friendly Israeli man around 35, short dark curly hair, trimmed beard, warm brown skin tone, navy T-shirt, simple silver chain; expression open and encouraging; no kippah by default (a kippah variant comes later). In STYLE GUIDE v1, make a 4-panel sheet: front, 3/4 view, side, and a waist-up 'explaining with one hand raised' pose. Name the file CHAR_ari_sheet.png.`,
  [{ file: 'CHAR_ari_sheet', size: [1792, 1024], prompt: `${S.STYLE_GUIDE} ${S.ARI} Make a 4-panel character sheet: front, 3/4 view, side, and a waist-up 'explaining with one hand raised' pose. ${NO_TEXT}` }]);

group(3, 'A', 'setup_char_noa', 'Female narrator sheet', 'literal', {},
  `CHARACTER SHEET B - 'Noa': a friendly Israeli woman around 32, shoulder-length wavy dark hair, olive skin, terracotta blouse, small gold hoop earrings; expression warm and confident. Same 4-panel layout and style as Ari. File CHAR_noa_sheet.png.`,
  [{ file: 'CHAR_noa_sheet', size: [1792, 1024], refs: ['CHAR_ari_sheet.png'], prompt: `${S.STYLE_GUIDE} ${S.NOA} Same 4-panel layout and style as the attached Ari sheet: front, 3/4 view, side, waist-up explaining pose. ${NO_TEXT}` }]);

const states = [['neutral', 'neutral expression'], ['listen', 'listening, head slightly tilted'], ['speak', "'say it with me', mouth open mid-vowel"], ['celebrate', 'celebrating']];
group(4, 'A', 'setup_char_expressions', 'Narrator expressions', 'literal', {},
  "Using the character sheets, make 8 head-and-shoulders portraits: Ari and Noa each in four states - neutral, listening, 'say it with me' (mouth open mid-vowel), and celebrating. Files CHAR_ari_neutral.png, CHAR_ari_listen.png, CHAR_ari_speak.png, CHAR_ari_celebrate.png and the same four for noa.",
  ['ari', 'noa'].flatMap((who) => states.map(([k, d]) => ({ file: `CHAR_${who}_${k}`, refs: [`CHAR_${who}_sheet.png`], prompt: `${S.STYLE_GUIDE} ${who === 'ari' ? S.ARI : S.NOA} Head-and-shoulders portrait, ${d}. Match the attached character sheet exactly. ${NO_TEXT}` }))));

group(5, 'A', 'setup_char_variants', 'Narrator variants', 'literal', {},
  'Make 4 more: Ari with a knitted kippah, Noa with a tallit over her shoulders (synagogue track), Ari in sunglasses on a Tel Aviv street, Noa holding an iced coffee at a cafe (Israel track). Files CHAR_ari_synagogue.png, CHAR_noa_synagogue.png, CHAR_ari_telaviv.png, CHAR_noa_telaviv.png.',
  [['ari', 'synagogue', 'wearing a knitted kippah'], ['noa', 'synagogue', 'with a tallit over her shoulders'], ['ari', 'telaviv', 'in sunglasses on a Tel Aviv street'], ['noa', 'telaviv', 'holding an iced coffee at a cafe']]
    .map(([who, k, d]) => ({ file: `CHAR_${who}_${k}`, refs: [`CHAR_${who}_sheet.png`], prompt: `${S.STYLE_GUIDE} ${who === 'ari' ? S.ARI : S.NOA} ${d}. Match the attached character sheet exactly. ${NO_TEXT}` })));

const mouths = [['ah', "'ah' (open)"], ['eh', "'eh' (half-open, lips neutral)"], ['ee', "'ee' (lips spread)"], ['oh', "'oh' (rounded mid)"], ['oo', "'oo' (rounded tight)"], ['none', "closed-lips 'no vowel' state"]];
group(6, 'A', 'setup_mouths', 'Mouth-shape set', 'literal', {},
  "Make 6 close-up front-view mouth illustrations, same stylised face (gender-neutral, cream skin outline only), one per Hebrew vowel sound: 'ah' (open), 'eh' (half-open, lips neutral), 'ee' (lips spread), 'oh' (rounded mid), 'oo' (rounded tight), and a closed-lips 'no vowel' state. No text. Files MOUTH_ah.png ... MOUTH_none.png.",
  mouths.map(([k, d]) => ({ file: `MOUTH_${k}`, prompt: `${S.STYLE_GUIDE} Close-up front-view mouth illustration, same stylised gender-neutral face (cream skin outline only), vowel sound ${d}. ${NO_TEXT}` })));

group(7, 'A', 'setup_frames', 'Letter-card frame', 'literal', {},
  'Design a reusable empty flashcard frame, 1024x1280 portrait: a cream card with a thin gold border, a large blank square in the upper two-thirds (the Hebrew letter will be typeset there later), and a blank strip across the bottom for a caption. No text, no placeholder letters. File FRAME_lettercard.png. Then a second version with the square split in two, left and right, for print-vs-cursive comparison: FRAME_lettercard_dual.png.',
  [{ file: 'FRAME_lettercard', size: [1024, 1280], prompt: `${S.STYLE_GUIDE} Reusable empty flashcard frame, 1024x1280 portrait: a cream card with a thin gold border, a large blank square in the upper two-thirds, and a blank strip across the bottom for a caption. Leave both areas completely empty. ${NO_TEXT}` },
   { file: 'FRAME_lettercard_dual', size: [1024, 1280], refs: ['FRAME_lettercard.png'], prompt: `${S.STYLE_GUIDE} Same flashcard frame as attached, but the large blank square is split into two blank squares, left and right. Leave all areas completely empty. ${NO_TEXT}` }]);

group(8, 'A', 'setup_backgrounds', 'Background set', 'literal', {},
  'Make 6 wide 1792x1024 background scenes with no people and no text: a Jerusalem stone courtyard at golden hour; a Tel Aviv beachfront boulevard; a Shabbat table before the meal; a synagogue interior facing the ark; a Carmel Market stall of fruit; an Israeli cafe terrace. Files BG_jerusalem.png, BG_telaviv.png, BG_shabbat.png, BG_synagogue.png, BG_market.png, BG_cafe.png.',
  S.BACKGROUNDS.map(([k, d]) => ({ file: `BG_${k}`, size: [1792, 1024], prompt: `${S.STYLE_GUIDE} Wide 1792x1024 background scene with no people: ${d}. ${NO_TEXT}` })));

group(9, 'A', 'setup_naming', 'Naming and manifest rules', 'literal', {},
  'Confirm you will name every future file as: L<nn>_<letter>_<print|cursive>_<mnemonic|object|scene>.png for letters (nn = 01-27 in alphabet order, finals 23-27), V<nn>_<vowel>_<mnemonic|mouth>.png for vowels, VOC_<theme>_<nn>.png for vocabulary, PRAY_<name>.png, BADGE_<nn>.png, ICON_<name>.png. Print the full key as a table, then the manifest-line format you will append under every image.',
  [], { textOutputs: ['file-name key table', 'manifest-line format'] });

group(10, 'A', 'setup_consistency_test', 'Consistency test', 'literal', {},
  'Generate the same scene twice - Noa handing Ari a cup of coffee at the cafe background - and compare them against the character sheets. List every drift (hair, skin tone, clothing, line weight) and state the fix you will apply from now on. Files TEST_consistency_1.png and TEST_consistency_2.png.',
  [1, 2].map((n) => ({ file: `TEST_consistency_${n}`, size: [1792, 1024], refs: ['CHAR_ari_sheet.png', 'CHAR_noa_sheet.png', 'BG_cafe.png'], prompt: `${S.STYLE_GUIDE} ${S.NOA} ${S.ARI} Noa handing Ari a cup of coffee at the cafe background (attached). ${NO_TEXT}` })),
  { textOutputs: ['drift list and fix statement'] });

// ---------------- Block B (11-37): print letter sets ----------------
const PRINT_TEMPLATE = 'Make a 10-image set for letter <nn> <name>, sound <sound>, in STYLE GUIDE v1. 1 MNEMONIC: the keyword object drawn so its outline matches this shape: <shape>; 2 the same object with Ari pointing at it; 3 the same with Noa; 4 the object as a bold charcoal silhouette on cream; 5-7 one clean image each of the three vocabulary objects: <w1>, <w2>, <w3>; 8-10 each vocabulary object placed in one of the BG_ scenes. No text. Files L<nn>_<name>_print_mnemonic, _ari, _noa, _silhouette, _v1, _v2, _v3, _s1, _s2, _s3.';
const BG_FOR = ['BG_jerusalem', 'BG_market', 'BG_telaviv']; // doc says "one of the BG_ scenes": we rotate deterministically (assumption, flagged in meta)
S.LETTERS.forEach((L, i) => {
  const tok = S.letterToken(L), base = `L${L.nn}_${tok}_print`;
  const [w1, w2, w3] = L.vocab.map((v) => v[0]);
  const vars = { nn: L.nn, name: L.title, sound: L.sound, shape: L.shape, keyword: L.keyword, w1, w2, w3 };
  const expanded = PRINT_TEMPLATE.replace(/<(\w+)>/g, (m, k) => (vars[k] ?? m)).replace('the keyword object drawn', `the keyword object (${L.keyword}) drawn`);
  const obj = `the keyword object: ${L.keyword}, drawn so its outline echoes this shape: ${L.shape}`;
  const files = [
    { file: `${base}_mnemonic`, prompt: `${S.STYLE_GUIDE} ${obj}. Draw the object only, never a letter. ${NO_TEXT}` },
    { file: `${base}_ari`, refs: ['CHAR_ari_sheet.png', `${base}_mnemonic.png`], prompt: `${S.STYLE_GUIDE} ${S.ARI} Ari pointing at ${obj} (same object as the attached mnemonic). ${NO_TEXT}` },
    { file: `${base}_noa`, refs: ['CHAR_noa_sheet.png', `${base}_mnemonic.png`], prompt: `${S.STYLE_GUIDE} ${S.NOA} Noa pointing at ${obj} (same object as the attached mnemonic). ${NO_TEXT}` },
    { file: `${base}_silhouette`, refs: [`${base}_mnemonic.png`], prompt: `${S.STYLE_GUIDE} The attached object as a bold solid charcoal (#2B2B2B) silhouette on a cream background. ${NO_TEXT}` },
    ...[w1, w2, w3].map((w, k) => ({ file: `${base}_v${k + 1}`, prompt: `${S.STYLE_GUIDE} One clean centred image of: ${w}. ${NO_TEXT}` })),
    ...[w1, w2, w3].map((w, k) => ({ file: `${base}_s${k + 1}`, size: [1792, 1024], refs: [`${BG_FOR[k]}.png`], prompt: `${S.STYLE_GUIDE} ${w} placed naturally in the attached background scene (${BG_FOR[k]}). ${NO_TEXT}` })),
  ];
  group(11 + i, 'B', `letter_${L.nn}_${tok}_print`, `${L.title} print set`, 'LETTER SET TEMPLATE', vars, expanded, files);
});

// ---------------- Block C (38-64): cursive letter sets ----------------
const CURSIVE_TEMPLATE = 'Attached is REF_cursive_<name>.png, the handwritten form of letter <nn> <name>. In STYLE GUIDE v1 make: 1 the keyword object <keyword> drawn so its outline echoes the attached silhouette; 2 Ari writing on a blank notepad, pen mid-stroke, page empty; 3 Noa doing the same on a cafe order pad; 4 the keyword object as a charcoal silhouette; 5 a close-up of an index finger tracing on a tablet screen that shows only a faint dotted guide area, no letter; 6 the keyword object on a postcard pinned to a fridge, postcard blank. No text. Files L<nn>_<name>_cursive_mnemonic, _ari, _noa, _silhouette, _trace, _postcard.';
S.LETTERS.forEach((L, i) => {
  const tok = S.letterToken(L), base = `L${L.nn}_${tok}_cursive`, ref = `REF_cursive_${tok}.png`;
  const vars = { nn: L.nn, name: L.title, keyword: L.cursive };
  const expanded = CURSIVE_TEMPLATE.replace(/<(\w+)>/g, (m, k) => (vars[k] ?? m)).replace('REF_cursive_' + L.title, 'REF_cursive_' + tok);
  const kw = L.cursive;
  const files = [
    { file: `${base}_mnemonic`, refs: [ref], prompt: `${S.STYLE_GUIDE} The keyword object ${kw}, drawn so its outline echoes the attached silhouette (${ref}). Draw the object only, never the letter. ${NO_TEXT}` },
    { file: `${base}_ari`, refs: ['CHAR_ari_sheet.png'], prompt: `${S.STYLE_GUIDE} ${S.ARI} Ari writing on a blank notepad, pen mid-stroke, page empty. ${NO_TEXT}` },
    { file: `${base}_noa`, refs: ['CHAR_noa_sheet.png'], prompt: `${S.STYLE_GUIDE} ${S.NOA} Noa writing on a blank cafe order pad, pen mid-stroke, page empty. ${NO_TEXT}` },
    { file: `${base}_silhouette`, refs: [`${base}_mnemonic.png`], prompt: `${S.STYLE_GUIDE} The attached object (${kw}) as a bold charcoal silhouette on cream. ${NO_TEXT}` },
    { file: `${base}_trace`, prompt: `${S.STYLE_GUIDE} Close-up of an index finger tracing on a tablet screen that shows only a faint dotted guide area, no letter. ${NO_TEXT}` },
    { file: `${base}_postcard`, refs: [`${base}_mnemonic.png`], prompt: `${S.STYLE_GUIDE} The attached object (${kw}) on a blank postcard pinned to a fridge, postcard blank. ${NO_TEXT}` },
  ];
  group(38 + i, 'C', `letter_${L.nn}_${tok}_cursive`, `${L.title} cursive set`, 'CURSIVE SET TEMPLATE', vars, expanded, files, { inputs: [ref] });
});

// ---------------- Block D (65-79): vowel sets ----------------
const VOWEL_TEMPLATE = "Make a 5-image set for vowel <name>, sound <sound>, in STYLE GUIDE v1. 1 keyword object <keyword>; 2 Ari saying the sound with the mouth shape <mouth>, keyword object floating beside him; 3 Noa the same; 4 a 'position' card: a large empty square (letter goes here) with a small coloured marker exactly where the sign sits (<position>), no text; 5 the keyword object on a flashcard frame (FRAME_lettercard). Files V<nn>_<name>_keyword, _ari, _noa, _position, _card.";
S.VOWELS.forEach((V, i) => {
  const base = `V${V.nn}_${V.token}`;
  const vars = { nn: V.nn, name: V.title, sound: V.sound, keyword: V.keyword, mouth: V.mouth, position: V.position };
  const expanded = VOWEL_TEMPLATE.replace(/<(\w+)>/g, (m, k) => (vars[k] ?? m));
  const mouthRef = `${V.mouth}.png`;
  const files = [
    { file: `${base}_keyword`, prompt: `${S.STYLE_GUIDE} Keyword object: ${V.keyword}. ${NO_TEXT}` },
    { file: `${base}_ari`, refs: ['CHAR_ari_sheet.png', mouthRef], prompt: `${S.STYLE_GUIDE} ${S.ARI} Ari saying the sound ${V.sound} with the attached mouth shape, keyword object (${V.keyword}) floating beside him. ${NO_TEXT}` },
    { file: `${base}_noa`, refs: ['CHAR_noa_sheet.png', mouthRef], prompt: `${S.STYLE_GUIDE} ${S.NOA} Noa saying the sound ${V.sound} with the attached mouth shape, keyword object (${V.keyword}) floating beside her. ${NO_TEXT}` },
    { file: `${base}_position`, prompt: `${S.STYLE_GUIDE} A 'position' card: a large empty square (the letter goes here) with a small coloured marker exactly where the sign sits: ${V.position}. Do not draw the sign or any letter. ${NO_TEXT}` },
    { file: `${base}_card`, refs: ['FRAME_lettercard.png', `${base}_keyword.png`], prompt: `${S.STYLE_GUIDE} The keyword object (${V.keyword}, attached) placed in the blank square of the attached flashcard frame. ${NO_TEXT}` },
  ];
  group(65 + i, 'D', `vowel_${V.nn}_${V.token}`, `${V.title} vowel set`, 'VOWEL SET TEMPLATE', vars, expanded, files, { });
});

// ---------------- Block E (80-94): vocabulary packs ----------------
S.VOCAB.forEach((P, i) => {
  const expanded = `Make 10 images for pack ${P.title} in STYLE GUIDE v1, one per item: ${P.items.join('; ')}. Each item centred, no people unless the item is an action, no text. Files VOC_${P.token}_01 ... _10.`;
  const files = P.items.map((it, k) => ({ file: `VOC_${P.token}_${String(k + 1).padStart(2, '0')}`, prompt: `${S.STYLE_GUIDE} One centred image: ${it}. No people unless the item is an action. ${NO_TEXT}` }));
  group(80 + i, 'E', `vocab_${P.token}`, `${P.title} pack`, 'VOCAB PACK TEMPLATE', { theme: P.title, list: P.items, track: P.track }, expanded, files);
});

// ---------------- Block F (95-100) ----------------
group(95, 'F', 'prayer_blessing', 'Opening prayer art', 'literal', {},
  'Make 6 wide 1792x1024 scenes, no text: ' + S.BLESSING_SCENES.join('; ') + '. Files PRAY_blessing_01 ... _06.',
  S.BLESSING_SCENES.map((d, k) => ({ file: `PRAY_blessing_0${k + 1}`, size: [1792, 1024], prompt: `${S.STYLE_GUIDE} Wide 1792x1024 scene: ${d}. ${NO_TEXT}` })));
group(96, 'F', 'prayer_track', 'Prayer-track scenes', 'literal', {},
  'Make 10 square scenes, no text, one per prayer the course teaches: ' + S.PRAYER_TRACK.join('; ') + '. Files PRAY_track_01 ... _10.',
  S.PRAYER_TRACK.map((d, k) => ({ file: `PRAY_track_${String(k + 1).padStart(2, '0')}`, prompt: `${S.STYLE_GUIDE} Square scene: ${d}. ${NO_TEXT}` })));
group(97, 'F', 'badges', 'Level badges', 'literal', {},
  'Design 8 round enamel-pin style badges, no text, one per course level: ' + S.BADGES.map((b, k) => `${k + 1} ${b}`).join('; ') + '. Same ring and ribbon on each, colours progressing cream > gold > blue > red. Files BADGE_01 ... _08. Then a greyed locked version of each: BADGE_01_locked ...',
  [...S.BADGES.map((b, k) => ({ file: `BADGE_0${k + 1}`, prompt: `${S.STYLE_GUIDE} Round enamel-pin style level badge ${k + 1} of 8: ${b}. Same ring and ribbon on every badge; colour progression cream > gold > blue > red across levels (level ${k + 1}). ${NO_TEXT}` })),
   ...S.BADGES.map((b, k) => ({ file: `BADGE_0${k + 1}_locked`, refs: [`BADGE_0${k + 1}.png`], prompt: `${S.STYLE_GUIDE} The attached badge as a greyed-out 'locked' version (desaturated, same shape). ${NO_TEXT}` }))]);
group(98, 'F', 'icons', 'App icon set', 'literal', {},
  'Make 40 simple single-colour line icons, charcoal on transparent, 512x512, in one grid image AND as individual files: ' + S.ICONS.join(', ') + '. Files ICON_<name>. (The optional grid image is not counted in the 40 manifest rows.)',
  S.ICONS.map((n) => ({ file: `ICON_${n}`, size: [512, 512], prompt: `Simple single-colour line icon, charcoal (#2B2B2B) on transparent background, 512x512, thick rounded strokes, no text: ${n.replace(/_/g, ' ')}.` })),
  { textOutputs: ['optional single grid image of all 40 icons (not a manifest row)'] });
group(99, 'F', 'brand', 'Store & book covers', 'literal', {},
  'Make 6 images with no text: ' + S.BRAND.map((b) => b[3]).join('; ') + '. Files BRAND_icon, BRAND_store, BRAND_cover_a, BRAND_cover_b, BRAND_hero, BRAND_ad.',
  S.BRAND.map(([k, w, h, d]) => ({ file: `BRAND_${k}`, size: [w, h], prompt: `${S.STYLE_GUIDE} ${d}. ${NO_TEXT}` })));
group(100, 'F', 'final_qa', 'Final QA and manifest', 'literal', {},
  'Review all sets produced. List every file that (a) contains any text or letter-like marks, (b) drifts from the style guide, or (c) shows Ari or Noa off-model, and regenerate each. Then print the complete manifest as one CSV code block with columns file, set, prompt, notes, and a count of files per block (expected: A 32, B 270, C 162, D 75, E 150, F 76 = 765 images, plus regenerations).',
  [], { textOutputs: ['QA list', 'full manifest CSV', 'per-block file counts'] });

// ---------------- Block G (101): quirky mnemonic images, one per letter form (NOT in the doc) ----------------
// Reads data/letters/mnemonics.json at build time (lane 2 may refine it; re-run this script to pick the change up).
{
  const mn = JSON.parse(readFileSync(join(ROOT, 'data/letters/mnemonics.json'), 'utf8')).letters;
  const byId = new Map(mn.map((m) => [m.id, m]));
  // 'a fence of letters' (lamed) would invite lettering into the picture: drawable stand-in instead. Any book/sign/page is told to stay blank by the addendum.
  const idea = (m) => m.imageIdea.replace(/,?\s*no text\.?$/i, '').replace(/\b(fence )?of letters\b/i, 'fence of plain wooden planks').trim();
  const forms = S.LETTERS.map((L) => {
    const m = byId.get(L.id);
    return { nn: L.nn, name: L.title, file: `L${L.nn}_${S.letterToken(L)}_quirky`, idea: idea(m), shape: m.shape, sound: m.sound, size: SQ };
  });
  for (const V of S.QUIRKY_VARIANTS) {
    const L = S.LETTERS.find((x) => x.id === V.of);
    forms.push({ nn: L.nn, name: V.title, file: `L${L.nn}_${S.letterToken(L)}_quirky_${V.token}`, idea: V.idea, shape: byId.get(V.of).shape, sound: V.sound, size: SQ });
  }
  forms.sort((a, b) => a.nn.localeCompare(b.nn) || a.file.length - b.file.length);
  const cmd = `Make ${forms.length} quirky mnemonic images in STYLE GUIDE v1 plus this addendum: ${S.QUIRKY_ADDENDUM_SHORT} One image per letter form; the subject is the picture that carries the letter's sound and shape. ` +
    forms.map((f) => `${f.nn} ${f.name}: ${f.idea}`).join('; ') + `. No text of any kind. Files ${forms[0].file} ... ${forms[forms.length - 1].file}.`;
  group(101, 'G', 'quirky_mnemonics', 'Quirky mnemonic images (one per letter form)', 'literal', { count: forms.length, source: 'data/letters/mnemonics.json (imageIdea, shape); variants from S.QUIRKY_VARIANTS' }, cmd,
    forms.map((f) => ({ file: f.file, size: f.size, prompt: `${S.STYLE_GUIDE} ${S.QUIRKY_STYLE} Hero subject: ${f.idea}. Let the subject's overall silhouette loosely echo this letter shape: ${f.shape} Sound it helps remember: ${f.sound}. ${NO_TEXT}` })));
}

export function buildGroups() {
  const counts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0 };
  for (const g of groups) counts[g.block] += g.rows.length;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const discrepancies = [];
  for (const b of Object.keys(counts)) {
    if (counts[b] !== (S.DOC_COUNTS[b] ?? 0)) discrepancies.push({ block: b, docStates: S.DOC_COUNTS[b] ?? null, commandsYield: counts[b], note: DISC_NOTES[b] });
  }
  const docCommandsTotal = total - counts.G; // what the doc's own commands 1-100 yield
  if (total !== S.DOC_COUNTS.total) discrepancies.push({ block: 'total', docStates: S.DOC_COUNTS.total, commandsYield: total, note: `Net of the block differences (A -1, F +2, G +${counts.G} added by lane 7). The doc's six stated counts add to 765; its own commands 1-100 yield ${docCommandsTotal}; with block G the manifest has ${total} rows.` });
  return {
    meta: {
      source: 'the prompt doc ("100 image commands for the Hebrew image lane"), read 2026-11-03',
      generatedBy: 'tools/images/build_prompt_groups.mjs',
      docStatedCounts: S.DOC_COUNTS, computedCounts: { ...counts, total, docCommandsOnly: docCommandsTotal }, discrepancies,
      groups: groups.length,
      namingNotes: [
        'Doc command 9 states the pattern L<nn>_<letter>_<print|cursive>_<mnemonic|object|scene>.png but the letter templates (commands 11-64) use suffixes _mnemonic,_ari,_noa,_silhouette,_v1-3,_s1-3 (print) and _mnemonic,_ari,_noa,_silhouette,_trace,_postcard (cursive). The templates are followed (they are the commands actually sent); the command-9 suffix list is not.',
        'Doc command 9 vowel pattern V<nn>_<vowel>_<mnemonic|mouth>.png also differs from the vowel template suffixes (_keyword,_ari,_noa,_position,_card); the template is followed.',
        '<letter> in file names is the contract letter id with "-" replaced by "_" (kaf_final, mem_final, nun_final, pe_final, tsadi_final; qof for Kof) so the app can map files to ids. The doc calls the finals "Khaf/Mem/Nun/Fe/Tsadi sofit".',
        'Vowel tokens follow the doc (cholam_male and cholam_chaser are separate sets; shin_sin_dots is one set); the mapping to contract vowel ids is in tools/images/spec.mjs (VOWELS[].ids).',
        'Lower-case file stems are used for letters/vowels/vocab themes; the doc fixes only the upper-case prefixes.',
        'STYLE_sample_cup is a name chosen here for the unnamed command-1 sample image (the doc gives no file name).',
        'Command 8 scenes 8-10 of each letter set say "one of the BG_ scenes" without choosing; per-image refs rotate BG_jerusalem, BG_market, BG_telaviv (assumption).',
        'A few abstract vocabulary words were given a concrete drawable form (e.g. today -> sun and calendar day, yellow -> swatch, voice -> empty speech bubble); prompt text only, file names unaffected.',
        'The 27 REF_cursive_<name>.png silhouettes are inputs rendered from Gveret Levin before Block C; they are listed in each cursive group\'s inputs and are NOT manifest rows.',
        'Block G / command 101 (L<nn>_<letter>_quirky[_vet|_khaf|_fe|_sin].png) is an addition after the doc and is reported as a discrepancy on purpose; DOC_COUNTS keeps the doc\'s own numbers. These supersede nothing: the older L<nn>_<letter>_print_mnemonic rows stay.',
        'ICON_* are 512x512 transparent PNGs per the doc; API image sizes are 1024-class, so tools/images/gen_via_api.mjs generates at the nearest supported size; resizing to the target dimensions is a separate human/ImageMagick step (not done here).',
      ],
    },
    groups,
  };
}

const DISC_NOTES = {
  A: 'Commands 1-10 name 31 image files (cup sample 1, sheets 2, expressions 8, variants 4, mouths 6, frames 2, backgrounds 6, consistency tests 2); command 9 is text-only. The doc says 32.',
  G: 'Not in the doc. Command 101 was added by lane 7: one quirky mnemonic image per letter form from data/letters/mnemonics.json (27 contract letters) plus 4 sound-variant forms (vet, khaf, fe, sin) = 31. Their ideas are written by lane 7 from the existing story text, not taken from mnemonics.json imageIdea. The Hebrew letter is overlaid as vector; the images must contain no text.',
  F: 'Commands 95-100 name 78 files (blessing 6, track 10, badges 8 + 8 locked, icons 40, brand 6), 79 if the optional icon grid image is counted. The doc says 76.',
};

const csvCell = (v) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

export function toCsv(data) {
  const head = ['file', 'set', 'command', 'block', 'width', 'height', 'status', 'prompt'];
  const lines = [head.join(',')];
  for (const g of data.groups) for (const r of g.rows) lines.push(head.map((h) => csvCell(r[h])).join(','));
  return lines.join('\n') + '\n';
}

const HEAD = ['file', 'set', 'command', 'block', 'width', 'height', 'status', 'prompt'];

/** Pure: merge the spec rows into existing manifest text. Returns { text, changed, updated, appended, rows }. */
export function mergeManifest(existingText, data) {
  const [head, ...body] = parseCsv(existingText);
  if (!head || HEAD.some((h) => !head.includes(h))) throw new Error(`manifest header must contain ${HEAD.join(',')}`);
  const at = Object.fromEntries(head.map((h, i) => [h, i]));
  const byFile = new Map(body.map((r) => [r[at.file], r]));
  let updated = 0; const add = [];
  for (const g of data.groups) for (const r of g.rows) {
    const have = byFile.get(r.file);
    if (have) { if (have[at.prompt] !== String(r.prompt)) { have[at.prompt] = String(r.prompt); updated++; } }
    else { const n = head.map((h) => String(r[h] ?? '')); byFile.set(r.file, n); add.push(n); }
  }
  if (!updated && !add.length) return { text: existingText, changed: false, updated: 0, appended: 0, rows: body.length };
  const rows = body.concat(add);
  return { text: csvOf(head, rows), changed: true, updated, appended: add.length, rows: rows.length };
}

export function run({ manifest = join(ROOT, 'data/images/manifest.csv'), groups = join(ROOT, 'data/images/prompt-groups.json') } = {}) {
  const data = buildGroups();
  writeTextAtomic(groups, JSON.stringify(data, null, 1) + '\n');
  const m = mergeManifest(readFileSync(manifest, 'utf8'), data);
  if (m.changed) writeTextAtomic(manifest, m.text);
  return { data, merge: m };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), opt = (k) => { const i = a.indexOf(k); return i >= 0 ? resolve(a[i + 1]) : undefined; };
  const { data, merge } = run({ ...(opt('--manifest') && { manifest: opt('--manifest') }), ...(opt('--groups') && { groups: opt('--groups') }) });
  console.log('computed counts', data.meta.computedCounts, 'groups', data.meta.groups);
  console.log(`manifest: ${merge.changed ? 'merged' : 'unchanged'}, rows ${merge.rows}, prompts updated ${merge.updated}, rows appended ${merge.appended}`);
  console.log('discrepancies vs doc:', JSON.stringify(data.meta.discrepancies, null, 1));
}
