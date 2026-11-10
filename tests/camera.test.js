import test from 'node:test';
import assert from 'node:assert/strict';
import { allowShimmer, isImageMime, regionLabel, tooLarge } from '../src/camera/camera.model.js';
import { holdsDivineName } from '../src/talk/talk.model.js';

test('isImageMime accepts photos and rejects other types', () => {
  assert.equal(isImageMime('image/jpeg'), true);
  assert.equal(isImageMime('image/png'), true);
  assert.equal(isImageMime('audio/mpeg'), false);
});

test('tooLarge flags oversized payloads', () => {
  assert.equal(tooLarge({ byteLength: 100 }), false);
  assert.equal(tooLarge({ byteLength: 9 * 1024 * 1024 }), true);
});

test('allowShimmer honours reduced motion', () => {
  assert.equal(allowShimmer(false), true);
  assert.equal(allowShimmer(true), false);
});

test('regionLabel prefers translation when shown, and marks held lines', () => {
  assert.equal(regionLabel({ text: 'יציאה', translation: 'Exit' }, true), 'Exit');
  assert.equal(regionLabel({ text: 'יציאה', translation: 'Exit' }, false), 'יציאה');
  assert.equal(regionLabel({ held: true, text: 'x' }, true), 'Held');
});

test('camera holds the divine Name the same way Talk does', () => {
  assert.equal(holdsDivineName('יהוה'), true);
  assert.equal(holdsDivineName('יציאה'), false);
});
