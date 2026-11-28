import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { playArt } from '../src/games/playart.js';

const DIR = new URL('../assets/img/play/', import.meta.url);
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('every in-play picture is used by a game, and every picture a stylesheet names exists', () => {
  const files = readdirSync(DIR).filter((f) => f.endsWith('.webp'));
  assert.ok(files.length >= 148, `${files.length} pictures`);
  const css = read('../assets/css/play-art.css') + read('../assets/css/games.css');
  const js = ['meltdown.view.js', 'sentencetrain.view.js'].map((f) => read(`../src/games/${f}`)).join('\n');
  const usedInJs = (f) => js.includes(f) || (/^SPR_icepop_\d\.webp$/.test(f) && js.includes('SPR_icepop_${'));
  const unused = files.filter((f) => !css.includes(`/play/${f}`) && !usedInJs(f));
  assert.deepEqual(unused, [], 'pictures no game uses');
  const named = [...css.matchAll(/img\/play\/([A-Za-z0-9_]+\.webp)/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(named)].filter((f) => !existsSync(new URL(f, DIR))), [], 'stylesheet names a picture that is not filed');
  assert.equal(playArt('SPR_basket'), 'assets/img/play/SPR_basket.webp');
});

test('the artwork stylesheet declares no animation and is loaded by the page', () => {
  const css = read('../assets/css/play-art.css');
  assert.equal(/@keyframes|animation\s*:/.test(css), false);
  assert.match(read('../index.html'), /assets\/css\/play-art\.css/);
});
