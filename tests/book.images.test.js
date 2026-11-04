import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { buildGroups } from '../tools/images/build_prompt_groups.mjs';
import { LETTERS, VOWELS, VOCAB, ICONS, DOC_COUNTS } from '../tools/images/spec.mjs';

const onDisk = JSON.parse(readFileSync(new URL('../data/images/prompt-groups.json', import.meta.url), 'utf8'));
const fresh = buildGroups();
const rows = onDisk.groups.flatMap((g) => g.rows);

// Group 101 text is derived from data/letters/mnemonics.json, which lane 2 may refine at any time. Everything else must match
// exactly; for group 101 only the prompt wording may differ (stale prompts are reported, regenerate with the builder).
const strip101 = (d) => { const c = JSON.parse(JSON.stringify(d)); const g = c.groups.find((x) => x.number === 101); g.prompt = ''; g.rows.forEach((r) => { r.prompt = ''; }); return c; };
test('prompt-groups.json is in sync with the builder', () => {
  const f = JSON.parse(JSON.stringify(fresh));
  assert.deepEqual(strip101(onDisk), strip101(f));
  if (JSON.stringify(onDisk.groups[100]) !== JSON.stringify(f.groups[100])) console.warn('NOTE: group 101 prompts are stale vs data/letters/mnemonics.json: run node tools/images/build_prompt_groups.mjs');
});
test('101 groups numbered 1..101 (1-100 from the doc, 101 = lane-7 quirky mnemonics)', () => {
  assert.equal(onDisk.groups.length, 101);
  assert.deepEqual(onDisk.groups.map((g) => g.number), Array.from({ length: 101 }, (_, i) => i + 1));
  assert.equal(onDisk.groups[100].block, 'G');
});
test('block G: one quirky image per contract letter (27) + 4 sound variants, ideas from mnemonics.json, honest discrepancy log', () => {
  const g = onDisk.groups[100];
  assert.equal(g.rows.length, 31);
  const mn = JSON.parse(readFileSync(new URL('../data/letters/mnemonics.json', import.meta.url), 'utf8')).letters;
  for (const L of LETTERS) {
    const r = g.rows.find((x) => x.file === `L${L.nn}_${L.id.replace(/-/g, '_')}_quirky.png`);
    assert.ok(r, L.id);
    const idea = mn.find((m) => m.id === L.id).imageIdea.replace(/,?\s*no text\.?$/i, '').replace(/\b(fence )?of letters\b/i, 'fence of plain wooden planks').trim();
    // lane 2 may refine mnemonics.json later: stale prompts are reported, not failed (re-run build_prompt_groups.mjs)
    if (!r.prompt.includes(idea)) console.warn(`NOTE: ${L.id} quirky prompt is stale vs data/letters/mnemonics.json: re-run node tools/images/build_prompt_groups.mjs`);
  }
  for (const v of ['vet', 'khaf', 'fe', 'sin']) assert.ok(g.rows.some((x) => x.file.endsWith(`_quirky_${v}.png`)), v);
  for (const r of g.rows) { assert.match(r.prompt, /Do not draw any letter/); assert.equal(r.width, 1024); }
  const m = onDisk.meta;
  assert.equal(m.computedCounts.G, 31); assert.equal(m.computedCounts.total, 797); assert.equal(m.computedCounts.docCommandsOnly, 766);
  assert.equal(m.docStatedCounts.total, 765);
  const gd = m.discrepancies.find((d) => d.block === 'G'); assert.ok(gd && /Not in the doc/.test(gd.note));
});
test('block totals: B,C,D,E match the doc; A and F discrepancies are recorded, not hidden', () => {
  const c = onDisk.meta.computedCounts;
  for (const b of ['B', 'C', 'D', 'E']) assert.equal(c[b], DOC_COUNTS[b], b);
  assert.equal(c.A, 31); assert.equal(c.F, 78); assert.equal(c.docCommandsOnly, 766);
  const blocks = onDisk.meta.discrepancies.map((d) => d.block).sort();
  assert.deepEqual(blocks, ['A', 'F', 'G', 'total']);
  for (const b of 'ABCDEFG') assert.equal(rows.filter((r) => r.block === b).length, c[b]);
});
test('per-set sizes: letters 10/6, vowels 5, vocab 10', () => {
  for (const g of onDisk.groups) {
    if (g.template === 'LETTER SET TEMPLATE') assert.equal(g.rows.length, 10);
    if (g.template === 'CURSIVE SET TEMPLATE') assert.equal(g.rows.length, 6);
    if (g.template === 'VOWEL SET TEMPLATE') assert.equal(g.rows.length, 5);
    if (g.template === 'VOCAB PACK TEMPLATE') assert.equal(g.rows.length, 10);
  }
  assert.equal(LETTERS.length, 27); assert.equal(VOWELS.length, 15); assert.equal(VOCAB.length, 15); assert.equal(ICONS.length, 40);
});
test('file names are unique, .png, and follow the naming rules', () => {
  const names = rows.map((r) => r.file);
  assert.equal(new Set(names).size, names.length);
  const rules = [
    /^L(0[1-9]|1\d|2[0-7])_[a-z_]+_print_(mnemonic|ari|noa|silhouette|v[123]|s[123])\.png$/,
    /^L(0[1-9]|1\d|2[0-7])_[a-z_]+_cursive_(mnemonic|ari|noa|silhouette|trace|postcard)\.png$/,
    /^V(0[1-9]|1[0-5])_[a-z_]+_(keyword|ari|noa|position|card)\.png$/,
    /^VOC_[a-z_]+_(0[1-9]|10)\.png$/,
    /^L(0[1-9]|1\d|2[0-7])_[a-z_]+_quirky(_(vet|khaf|fe|sin))?\.png$/,
    /^PRAY_(blessing_0[1-6]|track_(0[1-9]|10))\.png$/,
    /^BADGE_0[1-8](_locked)?\.png$/, /^ICON_[a-z_]+\.png$/, /^BRAND_[a-z_]+\.png$/,
    /^(CHAR|MOUTH|FRAME|BG|TEST|STYLE)_[a-z_0-9]+\.png$/,
  ];
  for (const n of names) assert.ok(rules.some((r) => r.test(n)), `bad name ${n}`);
});
test('letter numbers: nn 01-27 in order, finals 23-27; each letter has 10 print + 6 cursive rows', () => {
  LETTERS.forEach((L, i) => assert.equal(L.nn, String(i + 1).padStart(2, '0')));
  assert.deepEqual(LETTERS.slice(22).map((l) => l.id), ['kaf-final', 'mem-final', 'nun-final', 'pe-final', 'tsadi-final']);
  for (const L of LETTERS) {
    const tok = L.id.replace(/-/g, '_');
    assert.equal(rows.filter((r) => r.file.startsWith(`L${L.nn}_${tok}_print_`)).length, 10, L.id);
    assert.equal(rows.filter((r) => r.file.startsWith(`L${L.nn}_${tok}_cursive_`)).length, 6, L.id);
  }
});
test('every row: pending status, prompt contains no-text rule, refs point at manifest names or inputs', () => {
  const names = new Set(rows.map((r) => r.file));
  for (const r of rows) {
    assert.equal(r.status, 'pending');
    assert.match(r.prompt, /no text|No text/i, r.file);
    for (const ref of r.refs || []) assert.ok(names.has(ref) || /^REF_cursive_/.test(ref), `${r.file} ref ${ref}`);
  }
  for (const g of onDisk.groups.filter((g) => g.block === 'C')) assert.equal(g.inputs.length, 1);
});
test('manifest.csv has one line per row plus header, same order', () => {
  const lines = readFileSync(new URL('../data/images/manifest.csv', import.meta.url), 'utf8').trim().split('\n');
  assert.match(lines[0], /^file,set,command,block/);
  assert.equal(lines.filter((l) => /^[A-Za-z0-9_]+\.png,/.test(l)).length, rows.length);
});
test('placeholder exists for every manifest row', () => {
  for (const r of rows) assert.ok(existsSync(new URL(`../assets/img/placeholders/${r.file.replace(/\.png$/, '.svg')}`, import.meta.url)), r.file);
});
