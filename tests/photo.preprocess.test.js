import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateSkew, rotateImage, deskew, adaptiveBinarize } from '../src/photo/preprocess.js';

// Synthetic "text": dark bars on white (rows of short strokes), SYNTHETIC like the benchmark: says nothing about real photos.
function bars(w = 400, h = 300, lines = [80, 140, 200]) {
  const data = new Uint8ClampedArray(w * h * 4).fill(255);
  for (const y0 of lines) for (let x = 40; x < w - 40; x++) if ((x >> 3) % 3 !== 2) for (let y = y0; y < y0 + 14; y++) { const p = (y * w + x) * 4; data[p] = data[p + 1] = data[p + 2] = 20; }
  return { data, width: w, height: h };
}

test('estimateSkew: level lines -> about 0, tilted lines -> the tilt', () => {
  assert.ok(Math.abs(estimateSkew(bars()).angle) <= 0.5);
  for (const d of [-6, -3, 4, 7]) {
    const img = rotateImage(bars(), d);
    const e = estimateSkew(img);
    assert.ok(Math.abs(Math.abs(e.angle) - Math.abs(d)) <= 1, `rotated ${d} -> estimated ${e.angle}`);
    assert.ok(e.confidence > 1.05);
  }
});
test('deskew levels a tilted image (estimate afterwards is near 0) and leaves a level one alone', () => {
  const tilted = rotateImage(bars(), 5);
  const r = deskew(tilted);
  assert.equal(r.applied, true);
  assert.ok(Math.abs(estimateSkew(tilted).angle) <= 1, 'still tilted after deskew');
  const level = bars(); const before = new Uint8ClampedArray(level.data);
  assert.equal(deskew(level).applied, false);
  assert.deepEqual(level.data, before);
});
test('estimateSkew: blank or all-ink images give angle 0, no throw', () => {
  const blank = { data: new Uint8ClampedArray(100 * 100 * 4).fill(255), width: 100, height: 100 };
  assert.equal(estimateSkew(blank).angle, 0);
  const black = { data: new Uint8ClampedArray(100 * 100 * 4).fill(0), width: 100, height: 100 };
  assert.equal(estimateSkew(black).angle, 0);
});
test('light text on a dark background is also handled (ink = minority polarity)', () => {
  const img = bars(); for (let i = 0; i < img.data.length; i += 4) { img.data[i] = img.data[i + 1] = img.data[i + 2] = 255 - img.data[i]; }
  rotateImage(img, -5);
  assert.ok(Math.abs(Math.abs(estimateSkew(img).angle) - 5) <= 1);
});
test('adaptiveBinarize outputs only 0/255 (it is NOT used by default: it lowered accuracy on the synthetic set)', () => {
  const img = bars(); adaptiveBinarize(img);
  assert.ok([...new Set(img.data.filter((_, i) => i % 4 === 0))].every((v) => v === 0 || v === 255));
});
