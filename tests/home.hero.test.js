import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { ANCIENT_TREE_SRC, ANCIENT_TREE_MOBILE_SRC, ANCIENT_TREE_DESCRIPTION } from '../src/shell/astral-tree.js';
import { N, memStore } from './torahread.fakedom.js';
import { mount as mountHome } from '../src/shell/home.view.js';
import { mount as mountWelcome } from '../src/onboarding/firstrun.view.js';
import { createSettings } from '../src/shell/settings.js';
import { t } from '../src/shell/i18n.js';

const ctxFor = () => {
  const store = memStore();
  return { store, settings: createSettings(store), t, hasRoute: () => true, route() {}, installPrompt: { available: () => false } };
};

const rootText = (root) => root.textContent;

test('home and welcome place the ancient Tree of Life above original text, panels and tiles', () => {
  const home = new N('div');
  mountHome(home, ctxFor());
  const welcome = new N('div');
  mountWelcome(welcome, ctxFor());
  for (const root of [home, welcome]) {
    assert.equal(root.querySelector('.show-hero-img'), null, 'old book hero is gone');
    const scene = root.querySelector('.astral-scene');
    assert.ok(scene, 'the astral hero scene exists');
    assert.equal(scene.querySelector('svg'), null, 'no geometric cartoon tree');
    const photo = scene.querySelector('img.astral-tree-photo');
    assert.ok(photo, 'original aged tree artwork exists');
    assert.equal(photo.attrs.src, ANCIENT_TREE_SRC);
    assert.equal(photo.attrs.loading, 'eager');
    const mobile = scene.querySelector('source');
    assert.ok(mobile, 'mobile image is chosen by a picture source');
    assert.equal(mobile.attrs.srcset, ANCIENT_TREE_MOBILE_SRC);
    assert.equal(mobile.attrs.media, '(max-width: 600px)');
    assert.ok(existsSync(new URL('../' + ANCIENT_TREE_MOBILE_SRC, import.meta.url)), 'mobile artwork must ship with ALEF');
    assert.ok(scene.querySelector('.astral-harvest-motes'), 'harvest motes animate separately from the image');
    assert.ok(scene.querySelector('.astral-harvest-halo'), 'subtle warm light is layered in CSS');
    assert.equal(scene.attrs['aria-label'], ANCIENT_TREE_DESCRIPTION);
    assert.ok(existsSync(new URL('../' + ANCIENT_TREE_SRC, import.meta.url)), 'artwork must ship with ALEF');
    assert.ok(scene.querySelector('.astral-ray'), 'moving light remains');
    assert.ok(scene.querySelector('.astral-stars'), 'night sky remains');
    const hero = root.querySelector('.show-hero');
    assert.equal(hero.children[0], scene, 'tree is above text, never covers it');
    assert.ok(root.querySelector('.home-builder'), 'front-page word builder present');
    assert.ok(root.querySelector('.show-grid'), 'existing destination tiles remain');
    assert.ok(root.querySelector('.show-stats'), 'existing numbers remain');
    assert.equal(root.querySelector('.show-hero a.show-btn').attrs.href, '#/firstday');
    assert.equal(root.querySelector('.show-hero a.show-btn2').attrs.href, '#/books');
  }
  assert.equal(home.queryAll('h1').length, 1);
  assert.equal(welcome.querySelector('#view-title').textContent.replace(/\s+/g, ' ').trim(), 'Welcome to ALEF אלף');
  const css = readFileSync(new URL('../assets/css/astral-home.css', import.meta.url), 'utf8');
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /astral-scene\[data-paused="1"\]/);
  assert.match(css, /@keyframes astral-ancient-reveal/);
  assert.match(css, /\.astral-tree-photo/);
  const tree = readFileSync(new URL('../src/shell/astral-tree.js', import.meta.url), 'utf8');
  assert.doesNotMatch(tree, /s\('ellipse'|s\('circle'|makeTree\(/);
  assert.match(rootText(home), /The Tree of Life/);
});
