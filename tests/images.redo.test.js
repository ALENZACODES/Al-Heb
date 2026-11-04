import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRedo, strictPrompt, slotOf, lessonOf, chunk, renderList, MAX_ITEMS, MAX_CHARS, NO_TEXT_STRICT } from '../tools/images/build_redo.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTE = join(ROOT, 'docs/images/paste');
const prov = JSON.parse(readFileSync(join(ROOT, 'data/images/provenance.json'), 'utf8')).images;
const notes = JSON.parse(readFileSync(join(ROOT, 'data/images/review-notes.json'), 'utf8')).notes;
const B = buildRedo();
const redoNames = readdirSync(PASTE).filter((f) => /^redo-\d{2}\.txt$/.test(f)).sort();
const redoText = (f) => readFileSync(join(PASTE, f), 'utf8');

// ---------- stage 1: redo list + paste files ----------
test('redo: flagged set is the union of text, aspect and wrong-backdrop flags from provenance + review notes', () => {
  const want = new Set();
  for (const [id, r] of Object.entries(prov)) {
    const n = notes[id] ?? {};
    if (r.flags.includes('contains_text') || r.flags.includes('aspect_mismatch_allowed') || (n.sceneSeen && n.sceneExpected && n.sceneSeen !== n.sceneExpected)) want.add(id);
  }
  assert.deepEqual(new Set(B.items.map((r) => r.id)), want);
  assert.equal(B.items.filter((r) => r.reasons.includes('text')).length, Object.values(prov).filter((r) => r.flags.includes('contains_text')).length);
  assert.equal(B.items.filter((r) => r.reasons.includes('aspect')).length, Object.values(prov).filter((r) => r.flags.includes('aspect_mismatch_allowed')).length);
  assert.equal(B.items.filter((r) => r.reasons.includes('backdrop')).length, Object.values(notes).filter((n) => n.sceneSeen && n.sceneExpected && n.sceneSeen !== n.sceneExpected).length);
});

test('redo: every flagged file appears exactly once across the redo paste files, and files match the build', () => {
  assert.deepEqual(redoNames, B.files.map((f) => f.name));
  const all = redoNames.map(redoText).join('\n');
  for (const r of B.items) assert.equal(all.split(`FILENAME: ${r.file} |`).length - 1, 1, r.file);
  const filenames = [...all.matchAll(/FILENAME: (\S+) \|/g)].map((m) => m[1]);
  assert.equal(filenames.length, B.items.length);
  for (const f of B.files) assert.equal(redoText(f.name), f.text, `${f.name} is stale: run node tools/images/build_redo.mjs`);
});

test('redo: at most 25 items and 12k chars per file, same skeleton as cmd files, strict wording, no attachments', () => {
  assert.ok(MAX_ITEMS <= 25);
  for (const f of redoNames) {
    const t = redoText(f);
    const n = (t.match(/^\d+\. FILENAME: /gm) || []).length;
    assert.ok(n >= 1 && n <= 25, `${f} has ${n} items`);
    assert.ok(t.length <= MAX_CHARS, `${f} is ${t.length} chars`);
    assert.match(t, /^ALEF IMAGE RUN - REDO \d\d:/);
    assert.match(t, /STYLE GUIDE v1/);
    assert.match(t, /NEVER put any text in any image/);
    assert.match(t, /wait for me to say "next"/);
    assert.ok(t.includes(NO_TEXT_STRICT), `${f} lacks the strict no-text clause`);
    assert.match(t, /Allowed aspects are ONLY 1:1, 3:2 and 2:3/);
    assert.match(t, new RegExp(`generate exactly ${n} separate images`, 'i'));
    assert.doesNotMatch(t, /^ATTACH:/m);
    for (const m of t.matchAll(/PROMPT: (.*)$/gm)) assert.doesNotMatch(m[1], /attached/i, `${f}: a prompt still refers to an attachment`);
  }
});

test('redo: size hints are 1:1 / 3:2 / 2:3 and agree with the target; wide rows say wide', () => {
  for (const f of redoNames) {
    for (const m of redoText(f).matchAll(/SIZE: use (\S+).*?target (\d+)x(\d+).*\n\s+PROMPT: (.*)/g)) {
      const [, ratio, w, h, prompt] = m;
      const want = w === h ? '1:1' : Number(w) > Number(h) ? '3:2' : '2:3';
      assert.equal(ratio.replace(/[^0-9:]/g, ''), want, f);
      if (want === '3:2') assert.match(prompt, /MUST be wide 3:2/);
      if (want === '1:1') assert.match(prompt, /MUST be square 1:1/);
    }
  }
});

test('redo: scene prompts name the exact backdrop the original asked for, and the file describes it', () => {
  for (const r of B.items.filter((x) => /^s\d$/.test(x.slot))) {
    const bg = /\((BG_[a-z]+)\)/.exec(r.original)[1];
    assert.ok(r.prompt.includes(`EXACT backdrop and no other: ${bg}`), r.id);
    assert.match(r.prompt, /full-bleed/);
    assert.ok(redoText(r.redoFile).includes(`${bg} = `), `${r.redoFile} does not describe ${bg}`);
  }
});

test('redo: helpers', () => {
  assert.equal(slotOf('L07_zayin_print_ari'), 'ari');
  assert.equal(slotOf('L24_mem_final_print_s3'), 's3');
  assert.equal(slotOf('BG_cafe'), 'BG');
  assert.equal(lessonOf('L24_mem_final_print_s3'), 'L24 Mem sofit (print)');
  assert.equal(lessonOf('CHAR_ari_sheet'), 'setup');
  const p = strictPrompt('L03_gimel_print_s2', 'garden placed naturally in the attached background scene (BG_market). No text, letters or numerals anywhere in the image.', 1792, 1024);
  assert.doesNotMatch(p, /attached/);
  assert.match(p, /BG_market/);
  assert.match(p, /never square/);
  const items = Array.from({ length: 30 }, (_, i) => ({ id: `X_${i}`, file: `X_${i}.png`, width: 1024, height: 1024, reasons: ['text'], prompt: 'p', original: 'p' }));
  assert.deepEqual(chunk(items, 25, 1e9).map((c) => c.length), [25, 5]);
});

test('redo: REDO-LIST.md is current, lists every flagged image with slot and original prompt, and has the eyeball checklist', () => {
  const md = readFileSync(join(ROOT, 'docs/images/REDO-LIST.md'), 'utf8');
  assert.equal(md, renderList(B), 'REDO-LIST.md is stale: run node tools/images/build_redo.mjs');
  for (const r of B.items) assert.ok(md.includes(`| ${r.id} | ${r.file} |`), r.id);
  const textIds = B.items.filter((r) => r.reasons.includes('text')).map((r) => r.id);
  assert.match(md, new RegExp(`Eyeball checklist: the ${textIds.length} images`));
  for (const id of textIds) assert.ok(md.includes(`| [ ] | ${id} |`), id);
  assert.doesNotMatch(md, /\bAI\b/);
});

test('redo: existing cmd paste files and next1000 are untouched by the redo files (no overlap)', () => {
  const cmdAll = readdirSync(PASTE).filter((f) => /^cmd-\d{3}(-[a-h])?\.txt$/.test(f)).map(redoText).join('\n');
  for (const r of B.items) assert.ok(!cmdAll.includes(`FILENAME: ${r.file} |`), `${r.file} is also in a cmd file`);
  assert.ok(existsSync(join(PASTE, 'INDEX.md')));
});

// ---------- stage 2: alt text ----------
import { altTextFor, buildAltText, interAltText, MAX_LEN } from '../tools/images/alt_text.mjs';
import { loadSlots } from '../tools/images/build_inter.mjs';
import { loadBlockJ } from '../tools/images/block_j_rows.mjs';
import { loadRun3 } from '../tools/images/build_run3.mjs';

test('alt text: the manifest carries one entry per ingested image, matching a fresh build', () => {
  const man = JSON.parse(readFileSync(join(ROOT, 'data/images/generated-manifest.json'), 'utf8'));
  assert.ok(man.altText, 'generated-manifest.json has no altText map: run node tools/images/alt_text.mjs');
  const interIds = loadSlots().map((s) => s.id);
  const jIds = loadBlockJ().map((r) => r.id);
  const run3Ids = loadRun3().map((r) => r.id);
  assert.deepEqual(Object.keys(man.altText).sort(), [...Object.keys(prov), ...interIds, ...jIds, ...run3Ids].sort());
  assert.deepEqual(man.altText, buildAltText({ images: prov }, loadSlots(), loadBlockJ(), loadRun3()), 'altText is stale: run node tools/images/alt_text.mjs');
  for (const [id, t] of Object.entries(man.altText)) {
    assert.ok(typeof t === 'string' && t.length >= 12 && t.length <= MAX_LEN, `${id}: ${t}`);
    assert.match(t, /^[A-Z"']/, id);
    assert.match(t, /\.$/, id);
    assert.doesNotMatch(t, /attached|STYLE GUIDE|#[0-9A-F]{6}|\bAI\b/i, id);
  }
  // every WebP in assets/img/gen belongs to an image that has alt text
  assert.match(man.altText['I-01-img1'], /^Illustration: A congregation standing/);
  assert.equal(interAltText({ scene: 'A lamp' }), 'Illustration: A lamp.');
  for (const f of readdirSync(join(ROOT, 'assets/img/gen'))) assert.ok(man.altText[f.replace(/\.\d+\.webp$/, '')], f);
});

test('alt text: templates per slot', () => {
  const t = (id) => altTextFor(id, prov[id].prompt);
  assert.equal(t('L01_alef_print_v1'), 'Dad (Hebrew: aba), a vocabulary picture for the Hebrew letter Alef.');
  assert.match(t('L01_alef_print_mnemonic'), /^Ox head, drawn so its outline echoes the shape of the Hebrew letter Alef/);
  assert.match(t('L01_alef_print_ari'), /^Ari points at ox head/);
  assert.match(t('L01_alef_print_silhouette'), /^Solid charcoal silhouette of ox head/);
  assert.match(t('L01_alef_print_s2'), /^Mom \(Hebrew: ima\) in a Carmel Market fruit stall/);
  assert.equal(t('BG_cafe'), 'Background scene with no people: an Israeli cafe terrace.');
  assert.match(t('CHAR_noa_sheet'), /^Four-panel character sheet of Noa/);
  assert.match(t('MOUTH_ah'), /vowel sound 'ah'/);
  assert.equal(altTextFor('X_unknown', 'STYLE GUIDE ... consistent 3/4 top-down light from upper left. Something new. No text, letters or numerals anywhere in the image.'), 'Something new.');
});

// ---------- stage 3: contact sheets ----------
import { planSheets, buildSheets, COLS } from '../tools/images/sheets.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

test('sheets: one sheet per command with images plus one per redo file; flagged tiles are marked', () => {
  const pg = JSON.parse(readFileSync(join(ROOT, 'data/images/prompt-groups.json'), 'utf8')).groups;
  const sheets = planSheets({ images: prov }, pg, notes, B);
  const cmds = new Set(Object.values(prov).map((r) => r.command));
  assert.equal(sheets.filter((s) => s.name.startsWith('cmd-')).length, cmds.size);
  assert.deepEqual(sheets.filter((s) => s.name.startsWith('redo-')).map((s) => s.name), B.files.map((f) => f.name.replace('.txt', '.webp')));
  assert.equal(sheets.flatMap((s) => s.tiles).filter((t) => t.file && !t.file.startsWith('redo')).length >= Object.keys(prov).length, true);
  const c11 = sheets.find((s) => s.name === 'cmd-011.webp');
  assert.match(c11.title, /^Command 11: Alef print set \(10 images/);
  const s1 = c11.tiles.find((t) => t.id === 'L01_alef_print_s1');
  assert.ok(s1.bad && /square<-wide/.test(s1.flags) && /seen telaviv, asked jerusalem/.test(s1.note));
  assert.ok(existsSync(s1.file));
  assert.ok(!c11.tiles.find((t) => t.id === 'L01_alef_print_mnemonic').bad);
  for (const s of sheets.filter((x) => x.name.startsWith('redo-'))) assert.ok(s.tiles.every((t) => t.bad), s.name);
  assert.ok(COLS >= 3);
});

test('sheets: renders a sheet file with Pillow into a temp folder', async (t) => {
  const ok = await new Promise((res) => { import('node:child_process').then(({ execFile }) => execFile('python3', ['-I', '-c', 'import PIL'], (e) => res(!e))); });
  if (!ok) return t.skip('Pillow not installed');
  const dir = mkdtempSync(join(tmpdir(), 'alef-sheets-'));
  try {
    const { results } = await buildSheets({ only: ['cmd-001', 'redo-01'], out: dir });
    assert.deepEqual(results.map((r) => r.name), ['cmd-001.webp', 'redo-01.webp']);
    for (const r of results) { assert.ok(existsSync(join(dir, r.name))); assert.ok(r.bytes > 1000 && r.w > 300 && r.h > 300, JSON.stringify(r)); }
    assert.equal(results[1].tiles, B.files[0].rows.length);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------- stage 4: next1000 slot-to-lesson coverage ----------
import { parseCsv } from '../tools/images/build_next1000.mjs';
import { LETTERS, VOWELS, letterToken } from '../tools/images/spec.mjs';

const PRINT_SLOTS = ['mnemonic', 'ari', 'noa', 'silhouette', 'v1', 'v2', 'v3', 's1', 's2', 's3'];
const CURSIVE_SLOTS = ['mnemonic', 'ari', 'noa', 'silhouette', 'trace', 'postcard'];
const VOWEL_SLOTS = ['keyword', 'ari', 'noa', 'position', 'card'];
const manifestRows = parseCsv(readFileSync(join(ROOT, 'data/images/manifest.csv'), 'utf8'));
const nextRows = parseCsv(readFileSync(join(ROOT, 'data/images/next1000.csv'), 'utf8'));
const planned = new Map(); // file -> 'done' | 'pending'
for (const r of manifestRows) planned.set(r.file, prov[r.file.replace(/\.png$/, '')] ? 'done' : 'unplanned');
for (const r of nextRows) planned.set(r.file, 'pending');

test('next1000: every unfinished manifest row is in next1000 and nothing is planned twice', () => {
  const unplanned = [...planned].filter(([, s]) => s === 'unplanned').map(([f]) => f);
  assert.deepEqual(unplanned, []);
  assert.equal(new Set(nextRows.map((r) => r.file)).size, nextRows.length);
  for (const r of nextRows) assert.ok(!prov[r.file.replace(/\.png$/, '')], `${r.file} is already ingested but still pending`);
});

test('next1000: every letter has each print, cursive and quirky slot exactly once across done + pending', () => {
  for (const L of LETTERS) {
    const tok = letterToken(L);
    for (const s of PRINT_SLOTS) assert.ok(planned.has(`L${L.nn}_${tok}_print_${s}.png`), `missing L${L.nn}_${tok}_print_${s}`);
    for (const s of CURSIVE_SLOTS) assert.ok(planned.has(`L${L.nn}_${tok}_cursive_${s}.png`), `missing L${L.nn}_${tok}_cursive_${s}`);
    assert.ok(planned.has(`L${L.nn}_${tok}_quirky.png`), `missing quirky for ${L.id}`);
    const extra = [...planned.keys()].filter((f) => f.startsWith(`L${L.nn}_${tok}_`)).map((f) => f.replace(`L${L.nn}_${tok}_`, '').replace(/\.png$/, ''))
      .filter((rest) => !PRINT_SLOTS.map((s) => `print_${s}`).includes(rest) && !CURSIVE_SLOTS.map((s) => `cursive_${s}`).includes(rest) && rest !== 'quirky' && !/^quirky_(vet|khaf|fe|sin)$/.test(rest));
    assert.deepEqual(extra, [], `unexpected slots for ${L.id}`);
  }
  assert.equal([...planned.keys()].filter((f) => /_quirky(_[a-z]+)?\.png$/.test(f)).length, LETTERS.length + 4);
});

test('next1000: every vowel set has its five slots exactly once', () => {
  for (const V of VOWELS) for (const s of VOWEL_SLOTS) assert.ok(planned.has(`V${V.nn}_${V.token}_${s}.png`), `missing V${V.nn}_${V.token}_${s}`);
  assert.equal([...planned.keys()].filter((f) => /^V\d\d_/.test(f)).length, VOWELS.length * VOWEL_SLOTS.length);
});

test('next1000: every letter and vowel id the curriculum teaches has an image set', () => {
  const lessons = JSON.parse(readFileSync(join(ROOT, 'data/curriculum/lessons.json'), 'utf8')).lessons;
  const letterIds = new Set(LETTERS.map((l) => l.id));
  const vowelIds = new Set(VOWELS.flatMap((v) => v.ids));
  for (const l of lessons) {
    for (const id of l.letters ?? []) assert.ok(letterIds.has(id), `${l.id}: letter ${id} has no image set`);
    for (const id of l.vowels ?? []) assert.ok(vowelIds.has(id), `${l.id}: vowel ${id} has no image set`);
  }
});

test('next1000: set names agree with file stems and block H items are numbered 01..N without gaps', () => {
  const bySet = new Map();
  for (const r of nextRows) {
    let m;
    if ((m = /^letter_(\d\d)_([a-z_]+)_(print|cursive)$/.exec(r.set))) assert.ok(r.file.startsWith(`L${m[1]}_${m[2]}_${m[3]}_`), `${r.file} in set ${r.set}`);
    if ((m = /^vowel_(\d\d)_([a-z_]+)$/.exec(r.set))) assert.ok(r.file.startsWith(`V${m[1]}_${m[2]}_`), `${r.file} in set ${r.set}`);
    if (r.block === 'H' && (m = /^([A-Z]+_[a-z_]+?)_(\d\d)\.png$/.exec(r.file))) { if (!bySet.has(m[1])) bySet.set(m[1], []); bySet.get(m[1]).push(Number(m[2])); }
  }
  for (const [set, nums] of bySet) assert.deepEqual(nums.sort((a, b) => a - b), nums.map((_, i) => i + 1), `${set} numbering`);
});
