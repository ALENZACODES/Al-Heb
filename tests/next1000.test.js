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

const meta = JSON.parse(read('data/images/next1000-groups.json')).meta;
const inherited = next.filter((r) => mByFile.has(r.file));

// Decision: TARGET (1000) is a ceiling. The 1797-row manifest leaves no more block H rows to refill,
// so the pending list is whatever remains (inherited manifest rows + fresh block H rows), not a fixed 1000.
test('pending rows are all pending, within the ceiling, in command order', () => {
  assert.ok(next.length > 0 && next.length <= TARGET);
  assert.equal(next.length, inherited.length + fresh.length);
  assert.equal(next.length, build().rows.length);
  assert.equal(meta.total, next.length);
  assert.equal(meta.remainingManifest, inherited.length);
  assert.equal(meta.newRows, fresh.length);
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
test('groups are in ascending command order and each group lists only its pending rows', () => {
  const groups = JSON.parse(read('data/images/next1000-groups.json')).groups;
  for (let i = 1; i < groups.length; i++) assert.ok(groups[i].number > groups[i - 1].number, `group order at ${i}`);
  for (const g of groups) {
    assert.ok(g.rows.length > 0 || g.textOutputs.length > 0, `group ${g.number}`); // text-only commands (e.g. 100) have no rows
    for (const r of g.rows) { assert.equal(+r.command, g.number); assert.equal(r.status, 'pending'); }
  }
  assert.equal(groups[0].number, +next[0].command);
});
