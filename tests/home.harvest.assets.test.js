import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { ANCIENT_TREE_SRC, ANCIENT_TREE_MOBILE_SRC } from '../src/shell/astral-tree.js';

function checkWebp(relativePath, maxBytes) {
  const url = new URL('../' + relativePath, import.meta.url);
  const data = readFileSync(url);
  assert.equal(data.toString('ascii', 0, 4), 'RIFF', relativePath + ': RIFF header');
  assert.equal(data.toString('ascii', 8, 12), 'WEBP', relativePath + ': WebP signature');
  assert.ok(data.length > 20000, relativePath + ': not an empty placeholder');
  assert.ok(data.length <= maxBytes, relativePath + ': keep initial image lightweight');
  return statSync(url).size;
}

test('the cinematic harvest hero ships as valid, local responsive images', () => {
  const wide = checkWebp(ANCIENT_TREE_SRC, 300_000);
  const mobile = checkWebp(ANCIENT_TREE_MOBILE_SRC, 125_000);
  assert.ok(mobile < wide, 'narrow screens must not download the wide image');
  assert.match(ANCIENT_TREE_SRC, /^assets\/img\/gen\//);
});

test('hero remains a separate image; prayers, headline and activity are live DOM content', () => {
  const hero = readFileSync(new URL('../src/shell/astral-tree.js', import.meta.url), 'utf8');
  const showcase = readFileSync(new URL('../src/shell/showcase.js', import.meta.url), 'utf8');
  const stylesheet = readFileSync(new URL('../assets/css/astral-home.css', import.meta.url), 'utf8');
  assert.match(hero, /h\('picture'/);
  assert.match(hero, /aria-hidden/);
  assert.match(showcase, /h\('p', \{ class: 'show-title' \}/);
  assert.match(showcase, /tryPanel\(\)/);
  assert.match(showcase, /show-stats/);
  assert.match(showcase, /show-grid/);
  assert.match(stylesheet, /\.astral-harvest-motes/);
  assert.match(stylesheet, /\.astral-harvest-halo/);
  assert.match(stylesheet, /prefers-reduced-motion:\s*reduce/);
  assert.match(stylesheet, /animation-play-state:\s*paused/);
});
