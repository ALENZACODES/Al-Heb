import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const groups = JSON.parse(readFileSync(new URL('../data/images/prompt-groups.json', import.meta.url), 'utf8')).groups;
const inputs = groups.filter((g) => g.block === 'C').flatMap((g) => g.inputs);

test('27 REF_cursive silhouettes exist as 1024x1024 PNGs matching the Block C inputs', () => {
  assert.equal(inputs.length, 27);
  for (const n of inputs) {
    const f = new URL(`../assets/img/refs/${n}`, import.meta.url);
    assert.ok(existsSync(f), n);
    const b = readFileSync(f);
    assert.equal(b.toString('latin1', 1, 4), 'PNG');
    assert.equal(b.readUInt32BE(16), 1024); assert.equal(b.readUInt32BE(20), 1024);
    assert.ok(b.length > 3000, `${n} looks blank`);
  }
});
test('27 REF_print silhouettes exist, one per letter', () => {
  for (const n of inputs) assert.ok(existsSync(new URL(`../assets/img/refs/${n.replace('REF_cursive_', 'REF_print_')}`, import.meta.url)), n);
});
test('refs live in a subfolder so they are not mistaken for finished manifest images', () => {
  const idx = JSON.parse(readFileSync(new URL('../assets/img/index.json', import.meta.url), 'utf8'));
  assert.ok(!idx.files.some((f) => /^REF_/.test(f)));
});
