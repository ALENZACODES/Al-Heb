import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const dir = new URL('../data/photo/_benchmark/', import.meta.url);
const gt = JSON.parse(readFileSync(new URL('ground-truth.json', dir), 'utf8'));

test('synthetic benchmark: >= 60 images, all flagged synthetic, files exist, ground truth consonants consistent', () => {
  assert.equal(gt.synthetic, true);
  assert.ok(gt.items.length >= 60);
  for (const it of gt.items) {
    assert.equal(it.synthetic, true);
    assert.ok(existsSync(new URL(it.file, dir)), it.file);
    assert.equal(it.consonantLines.length, it.lines.length);
    assert.ok(!/[ְ-ּ]/.test(it.consonantLines.join('')));
  }
  const kinds = new Set(gt.items.map((i) => i.kind)); for (const k of ['siddur-line', 'siddur-page', 'sign']) assert.ok(kinds.has(k));
  const variants = new Set(gt.items.map((i) => i.variant)); for (const v of ['clean', 'noise', 'blur', 'rotate', 'perspective', 'lowcontrast']) assert.ok(variants.has(v));
});
test('benchmark results file, when present, is labelled synthetic', () => {
  const f = new URL('results.json', dir); if (!existsSync(f)) return;
  const r = JSON.parse(readFileSync(f, 'utf8')); assert.equal(r.synthetic, true);
});
