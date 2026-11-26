// Book pictures drawn on one side of a wide blank sheet are cut to the drawing (25 Nov 2026 audit: pages looked blank).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { frameFor, focusKey } from '../src/books/focus.js';

test('focusKey takes the file stem', () => { assert.equal(focusKey('assets/books/book62/BOOK62_p01.jpg?v=2'), 'BOOK62_p01'); });

test('a drawing on the right 60% of a 1659x948 sheet is framed to the right, never narrower than 1.1', () => {
  const f = frameFor([0.402, 0, 1, 1], 1659, 948);
  assert.ok(f); assert.equal(f.aspect, 1.1); assert.equal(f.x, 100); assert.equal(f.y, 50);
  assert.equal(frameFor([0, 0, 1, 1], 1659, 948), null); assert.equal(frameFor(null, 10, 10), null);
});

test('every focus box names a real picture and holds four fractions in order', () => {
  const focus = JSON.parse(readFileSync(new URL('../data/books/focus.json', import.meta.url), 'utf8'));
  for (const [k, b] of Object.entries(focus)) {
    const m = /^BOOK(\d+)_p\d+$/.exec(k); assert.ok(m, k);
    assert.ok(existsSync(new URL(`../assets/books/book${+m[1]}/${k}.jpg`, import.meta.url)), k);
    assert.equal(b.length, 4); assert.ok(b[0] >= 0 && b[0] < b[2] && b[2] <= 1 && b[1] >= 0 && b[1] < b[3] && b[3] <= 1, k);
  }
});
