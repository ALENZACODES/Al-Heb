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

import { matKind, playArtPath, coverArtPath, applyMat, COVER_3D } from '../src/lab/lab.art.js';

test('every drill has a mat plan, and every planned picture is on disk', () => {
  for (const g of GAMES) {
    assert.ok(['mat', 'tileback', 'figure', 'own'].includes(matKind(g.id)), g.id);
    assert.ok(existsSync(playArtPath(g.id)), playArtPath(g.id));
    assert.ok(existsSync(coverArtPath(g.id)), coverArtPath(g.id));
  }
  assert.match(playArtPath('switch'), /_r2\.webp$/);
  assert.match(coverArtPath('calendar'), /LAB_v3_calendar_cover\.webp$/);
  for (const id of COVER_3D) assert.ok(existsSync(coverArtPath(id)), coverArtPath(id));
});

function fakeImage() {
  const made = [];
  class Img { constructor() { made.push(this); } set src(v) { this._src = v; } get src() { return this._src; } }
  return { Img, made };
}
const fakeBoard = () => { const props = {}, classes = new Set(); return { props, classes, style: { setProperty: (k, v) => { props[k] = v; } }, classList: { add: (c) => classes.add(c) } }; };

test('a mat is applied only after its picture loads, never on error', () => {
  const { Img, made } = fakeImage();
  const ok = fakeBoard();
  assert.equal(applyMat('hunt', { board: ok, ImageCtor: Img }), true);
  assert.equal(ok.classes.size, 0, 'nothing changes before the picture loads');
  made[0].onload(); assert.ok(ok.classes.has('has-mat')); assert.match(ok.props['--lab-mat'], /LAB_v2_hunt_play\.webp/);
  const bad = fakeBoard();
  applyMat('pattern', { board: bad, ImageCtor: Img }); made[1].onerror();
  assert.equal(bad.classes.size, 0); assert.equal(bad.props['--lab-mat'], undefined);
});

test('the tile back goes on the drill root; figures and unknown drills start no load; no Image means no-op', () => {
  const { Img, made } = fakeImage();
  const root = fakeBoard();
  applyMat('matrix', { root, ImageCtor: Img }); made[0].onload();
  assert.match(root.props['--lab-tileback'], /LAB_v2_matrix_play\.webp/);
  assert.equal(applyMat('gematria', { board: fakeBoard(), ImageCtor: Img }), false);
  assert.equal(applyMat('nope', { board: fakeBoard(), ImageCtor: Img }), false);
  assert.equal(applyMat('hunt', { board: fakeBoard(), ImageCtor: undefined }), false);
  assert.equal(made.length, 1);
});

import { applyBackground, tokenArtPath, HERO_ART } from '../src/lab/lab.art.js';

test('four new games place their own picture (card face, sky, road, café counter) and get no board mat', () => {
  const { Img, made } = fakeImage();
  for (const id of ['twins', 'rain', 'taxi', 'cafe']) { assert.equal(matKind(id), 'own'); assert.equal(applyMat(id, { board: fakeBoard(), ImageCtor: Img }), false, id); }
  assert.equal(made.length, 0);
  assert.equal(matKind('middle'), 'mat'); assert.equal(matKind('chain'), 'mat');
});

test('applyBackground sets the picture only after it loads, never on error; tokens and the hero are on disk', () => {
  const { Img, made } = fakeImage();
  const el = { style: {}, classList: { add(c) { this.c = c; } } };
  assert.equal(applyBackground(el, 'x.webp', { ImageCtor: Img }), true);
  assert.equal(el.style.backgroundImage, undefined); made[0].onload();
  assert.equal(el.style.backgroundImage, 'url("x.webp")'); assert.equal(el.classList.c, 'lab-has-art');
  const bad = { style: {}, classList: { add() { throw new Error('no'); } } };
  applyBackground(bad, 'y.webp', { ImageCtor: Img }); made[1].onerror(); assert.equal(bad.style.backgroundImage, undefined);
  assert.equal(applyBackground(null, 'x.webp', { ImageCtor: Img }), false);
  for (const g of GAMES) { const p = tokenArtPath(g.id); if (p) assert.ok(existsSync(p), p); }
  assert.equal(GAMES.filter((g) => tokenArtPath(g.id)).length, 10);
  assert.ok(existsSync(HERO_ART));
});
