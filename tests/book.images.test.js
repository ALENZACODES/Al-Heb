import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { buildGroups } from '../tools/images/build_prompt_groups.mjs';
import { LETTERS, VOWELS, VOCAB, ICONS, DOC_COUNTS } from '../tools/images/spec.mjs';

const onDisk = JSON.parse(readFileSync(new URL('../data/images/prompt-groups.json', import.meta.url), 'utf8'));
const fresh = buildGroups();
const rows = onDisk.groups.flatMap((g) => g.rows);

test('prompt-groups.json is in sync with the builder', () => {
  assert.deepEqual(onDisk, JSON.parse(JSON.stringify(fresh)));
});
test('100 groups numbered 1..100', () => {
  assert.equal(onDisk.groups.length, 100);
  assert.deepEqual(onDisk.groups.map((g) => g.number), Array.from({ length: 100 }, (_, i) => i + 1));
});
test('block totals: B,C,D,E match the doc; A and F discrepancies are recorded, not hidden', () => {
  const c = onDisk.meta.computedCounts;
  for (const b of ['B', 'C', 'D', 'E']) assert.equal(c[b], DOC_COUNTS[b], b);
  assert.equal(c.A, 31); assert.equal(c.F, 78); assert.equal(c.total, 766);
  const blocks = onDisk.meta.discrepancies.map((d) => d.block).sort();
  assert.deepEqual(blocks, ['A', 'F', 'total']);
  for (const b of 'ABCDEF') assert.equal(rows.filter((r) => r.block === b).length, c[b]);
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
