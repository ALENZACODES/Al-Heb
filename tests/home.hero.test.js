import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N, memStore } from './torahread.fakedom.js';
import { mount as mountHome } from '../src/shell/home.view.js';
import { mount as mountWelcome } from '../src/onboarding/firstrun.view.js';
import { createSettings } from '../src/shell/settings.js';
import { t } from '../src/shell/i18n.js';
import { HOME_HERO_ALT, HOME_HERO_SRC } from '../src/shell/home-hero.js';

const ctxFor = () => {
  const store = memStore();
  return { store, settings: createSettings(store), t, hasRoute: () => true, route() {}, installPrompt: { available: () => false } };
};

function hero(root) {
  const img = root.querySelector('.show-hero-img');
  assert.ok(img, 'hero image');
  return img;
}

test('home and welcome show the tree hero, not the book page', () => {
  const home = new N('div');
  mountHome(home, ctxFor());
  const welcome = new N('div');
  mountWelcome(welcome, ctxFor());
  for (const root of [home, welcome]) {
    const img = hero(root);
    assert.equal(img.attrs.src, HOME_HERO_SRC);
    assert.equal(img.attrs.alt, HOME_HERO_ALT);
    assert.equal(img.attrs.loading, 'eager');
    assert.doesNotMatch(img.attrs.alt, /Jerusalem stone courtyard/);
    assert.equal(root.querySelector('.show-hero a.show-btn').attrs.href, '#/firstday');
    assert.equal(root.querySelector('a.show-btn2'), null, 'no books route on this branch');
  }
  assert.equal(home.queryAll('h1').length, 1);
  assert.equal(welcome.querySelector('#view-title').textContent.replace(/\s+/g, ' ').trim(), 'Welcome to ALEF אלף');
  const css = readFileSync(new URL('../assets/css/landing.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /@keyframes|animation:/);
  assert.equal(home.querySelector('.show-hero-shade'), null, 'the painting is not covered by a shade');
  assert.match(css, /\.show-hero-img \{[^}]*height: auto/);
  assert.doesNotMatch(css, /object-fit:\s*cover/);
  const book = readFileSync(new URL('../src/shell/home-hero.js', import.meta.url), 'utf8');
  assert.doesNotMatch(book, /BOOK2_p01/);
});
