import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv, build, TARGET } from '../tools/images/build_next1000.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const manifest = parseCsv(read('data/images/manifest.csv'));
const next = parseCsv(read('data/images/next1000.csv'));
const NO_TEXT = 'No text, letters or numerals anywhere in the image.';
const mByFile = new Map(manifest.map((r) => [r.file, r]));
const fresh = [...next].filter((r) => !mByFile.has(r.file));

test('pending batch fits the target without re-queuing completed work, command order', () => {
  assert.ok(next.length > 0 && next.length <= TARGET);
  assert.equal(next.length, build().rows.length);
  assert.ok(next.every((r) => r.status === 'pending'));
  for (let i = 1; i < next.length; i++) assert.ok(+next[i].command >= +next[i - 1].command, `order at ${i}`);
});
test('no duplicate file names across manifest + next1000', () => {
  assert.equal(new Set(next.map((r) => r.file)).size, next.length);
  for (const r of fresh) assert.ok(!mByFile.has(r.file));
  assert.ok(fresh.every((r) => +r.command >= 102 && r.block === 'H'));
  assert.ok(fresh.every((r) => /^[A-Za-z]+_[a-z0-9_]+_\d\d\.png$/.test(r.file)));
});
test('inherited rows are unchanged manifest rows', () => {
  for (const r of next.filter((x) => mByFile.has(x.file))) assert.deepEqual(r, mByFile.get(r.file));
});
test('every prompt carries the no-text rule; new prompts carry the exact sentence', () => {
  for (const r of next) assert.match(r.prompt, /no text/i, r.file);
  for (const r of fresh) { assert.ok(r.prompt.includes(NO_TEXT), r.file); assert.ok(r.prompt.startsWith('STYLE GUIDE v1'), r.file); }
});
test('sizes limited to the three allowed (new rows)', () => {
  for (const r of fresh) assert.ok(['1024x1024', '1792x1024', '1024x1280'].includes(`${r.width}x${r.height}`), r.file);
});
test('groups json agrees with csv and a fresh build', () => {
  const g = JSON.parse(read('data/images/next1000-groups.json'));
  assert.equal(g.groups.flatMap((x) => x.rows).length, next.length);
  assert.deepEqual(g.groups.flatMap((x) => x.expectedFiles), next.map((r) => r.file));
  assert.deepEqual(build().rows.map((r) => r.file), next.map((r) => r.file));
});
test('partly done command lists only pending rows and notes the remaining range', () => {
  const doc = JSON.parse(read('data/images/next1000-groups.json'));
  const ingested = JSON.parse(read('data/images/provenance.json')).images;
  assert.equal(doc.meta.doneCount, Object.keys(ingested).length);
  for (const g of doc.groups.filter(g => g.partial)) {
    assert.equal(g.partial.totalRows - g.partial.doneRows, g.rows.length);
    for (const r of g.rows) assert.ok(!ingested[r.file.replace(/\.png$/, '')]);
    assert.match(g.title, /partial: rows/);
  }
});
