import test from 'node:test';
import assert from 'node:assert/strict';
import { artPath, artImg, STUDIO_ART_DIR } from '../src/lab/lab.art.js';
import { STUDIO_GAMES } from '../src/lab/lab.core.js';

test('studio art paths are on-demand webp files named per game, and unknown ids return null', () => {
  for (const g of STUDIO_GAMES) {
    const p = artPath(g.id, 'cover');
    assert.equal(p, `${STUDIO_ART_DIR}/LAB_v3_${g.id}_cover.webp`);
    assert.ok(artPath(g.id, 'win').endsWith(`LAB_v3_${g.id}_win.webp`));
  }
  assert.equal(artPath('wordburst', 'nope'), null);
  assert.equal(artPath('not-a-game', 'cover'), null);
  assert.equal(artImg(null, 'x'), null);
});

test('artImg marks pictures decorative and removes them if they fail to load', () => {
  const calls = [];
  const fake = (tag, attrs) => {
    assert.equal(tag, 'img');
    const el = { tag, ...attrs, listeners: {} };
    el.addEventListener = (ev, fn) => { el.listeners[ev] = fn; calls.push(ev); };
    el.remove = () => { el.removed = true; };
    return el;
  };
  const img = artImg(fake, 'data/images/brain-lab-studio-2026-11-10/LAB_v3_wordburst_cover.webp', 'cover');
  assert.equal(img.alt, '');
  assert.equal(img['aria-hidden'], 'true');
  assert.equal(img.loading, 'lazy');
  assert.match(img.class, /lab-art/);
  img.listeners.error();
  assert.equal(img.removed, true);
});
