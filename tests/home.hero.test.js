import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N, memStore } from './torahread.fakedom.js';
import { mount as mountHome } from '../src/shell/home.view.js';
import { mount as mountWelcome } from '../src/onboarding/firstrun.view.js';
import { createSettings } from '../src/shell/settings.js';
import { t } from '../src/shell/i18n.js';

const ctxFor = () => {
  const store = memStore();
  return { store, settings: createSettings(store), t, hasRoute: () => true, route() {}, installPrompt: { available: () => false } };
};

test('home and welcome place the living Tree of Knowledge above original text, panels and tiles', () => {
  const home = new N('div');
  mountHome(home, ctxFor());
  const welcome = new N('div');
  mountWelcome(welcome, ctxFor());
  for (const root of [home, welcome]) {
    assert.equal(root.querySelector('.show-hero-img'), null, 'hero uses no image file');
    const scene = root.querySelector('.astral-scene');
    assert.ok(scene, 'the astral hero scene exists');
    assert.ok(scene.querySelector('svg'), 'SVG tree exists');
    assert.ok(scene.all((n) => n.attrs?.class === 'astral-growth').length, 'tree has a growing branch layer');
    assert.ok(scene.all((n) => n.attrs?.class === 'astral-fruits').length, 'pomegranates are built in SVG');
    const hero = root.querySelector('.show-hero');
    assert.equal(hero.children[0], scene, 'tree is above text, never covers it');
    assert.ok(root.querySelector('.show-try'), 'first word panel unchanged');
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
  assert.match(css, /@keyframes astral-grow/);
});
