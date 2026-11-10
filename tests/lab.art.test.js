import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { GAMES } from '../src/lab/lab.core.js';
import { artPath, artImg, NEW_BEST_ART, WORKOUT_DONE_ART, ART_DIR } from '../src/lab/lab.art.js';

test('every drill has a cover, a board mat and a win picture on disk', () => {
  for (const g of GAMES) for (const kind of ['cover', 'play', 'win']) {
    const p = artPath(g.id, kind);
    assert.ok(p && p.startsWith(ART_DIR + '/'), `${g.id} ${kind}`);
    assert.ok(existsSync(p) && statSync(p).size > 1000, `missing ${p}`);
    assert.ok(statSync(p).size < 400_000, `too large ${p}`);
  }
  for (const p of [NEW_BEST_ART, WORKOUT_DONE_ART]) assert.ok(existsSync(p), p);
});

test('unknown drills or kinds give no picture, and no picture means no element', () => {
  assert.equal(artPath('nope', 'cover'), null);
  assert.equal(artPath('hunt', 'poster'), null);
  assert.equal(artImg(() => ({}), null), null);
  assert.equal(artImg(null, 'x.webp'), null);
});

test('pictures are decorative and remove themselves when they fail to load', () => {
  let attrs, onError;
  const el = { addEventListener: (t, fn) => { if (t === 'error') onError = fn; }, removed: false, remove() { this.removed = true; } };
  const img = artImg((tag, a) => { assert.equal(tag, 'img'); attrs = a; return el; }, artPath('hunt', 'cover'), 'cover');
  assert.equal(img, el);
  assert.equal(attrs.alt, ''); assert.equal(attrs['aria-hidden'], 'true'); assert.equal(attrs.loading, 'lazy');
  onError(); assert.equal(el.removed, true);
  assert.equal(artImg(() => { throw new Error('no DOM'); }, artPath('hunt', 'win')), null);
});
