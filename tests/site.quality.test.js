import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N } from './torahread.fakedom.js';
import { showcaseNode } from '../src/shell/showcase.js';
import { matchRoute, ROUTES } from '../src/shell/router.js';
import { GAMES, LEVEL_BY_GAME, HUB_ENV_KEY } from '../src/games/games.view.js';
import { GAME_ENV } from '../src/games/engine.js';
import { createImageResolver } from '../src/img/resolve.js';
import { assertWordBank, nextRound } from '../src/games/wordfinder.model.js';
import { ANCIENT_TREE_SRC, ANCIENT_TREE_MOBILE_SRC } from '../src/shell/astral-tree.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('Home presents five photograph-backed beginner doorways with working routes', () => {
  const root = showcaseNode({ hasRoute: () => true, routeName: 'home' });
  const portals = root.queryAll('a.show-portal');
  const hrefs = portals.map(node => node.attrs.href);
  assert.deepEqual(hrefs, ['#/wordfinder', '#/books', '#/games', '#/read', '#/calendar']);
  for (const hash of hrefs) assert.ok(matchRoute(hash)?.route, 'valid destination ' + hash);
  assert.ok(root.querySelector('.home-builder'), 'the front-page word builder is present');
  assert.ok(root.querySelector('.show-grid'), 'all original destination tiles remain');
  assert.ok(root.querySelector('details.show-all-destinations'));
  assert.match(root.textContent, /240 first words/);
  assert.doesNotMatch(root.textContent, /19,466 voice clips|recorded teacher/);
  assert.match(root.textContent, /The Tree of Life/);
  assert.ok(root.querySelector('picture'), 'hero uses responsive local artwork');
});

test('25 listed games are reachable, labelled 1–9, and do not claim formal levels', () => {
  const ids = ['wordfinder', ...GAMES.map(([id]) => id)];
  assert.equal(ids.length, 25);
  assert.equal(new Set(ids).size, 25);
  assert.deepEqual([...new Set(Object.values(LEVEL_BY_GAME))].sort((a, b) => a - b), [1,2,3,4,5,6,7,8,9]);
  for (const id of ids) {
    assert.ok(matchRoute('#/' + id)?.route, 'route for ' + id);
    assert.ok(LEVEL_BY_GAME[id] >= 1 && LEVEL_BY_GAME[id] <= 9, id);
  }
});

test('every games-hub card has a backdrop scene that resolves approved', () => {
  const idx = JSON.parse(read('data/img/index.json'));
  const approvals = JSON.parse(read('data/images/approvals.json'));
  const R = createImageResolver({ index: idx, approvals, showUnapproved: false });
  const ids = ['wordfinder', ...GAMES.map(([id]) => id)];
  assert.equal(ids.length, 25);
  for (const id of ids) {
    const envId = GAME_ENV[HUB_ENV_KEY[id] || id];
    assert.ok(envId, 'hub card has a scene: ' + id);
    const im = R.resolve('id', envId);
    assert.ok(im?.src, 'scene resolves approved: ' + id + ' -> ' + envId);
  }
});

test('home reserves Rimon placement and the shell mounts the animated companion', () => {
  assert.match(read('src/shell/showcase.js'), /show-mascot-box/);
  assert.match(read('src/app.js'), /mountRimon\(\{store\}\)/);
  assert.match(read('src/shell/rimon.js'), /alef:ready/);
});

test('24 audio-first headwords use existing Israeli male and female audio indices', () => {
  const data = JSON.parse(read('data/games/firstwords.json'));
  const clips = JSON.parse(read('data/vocab/clip-lookup.json')).clips;
  const words = assertWordBank(data);
  assert.equal(words.length, 240);
  assert.equal(data.starterCount, 24);
  assert.equal(nextRound(words, {}).length, 5);
  for (const word of words.slice(0, 24)) {
    assert.ok(clips[word.he]?.['f|israeli'], 'female Israeli entry: ' + word.he);
    assert.ok(clips[word.he]?.['m|israeli'], 'male Israeli entry: ' + word.he);
  }
});

test('first prayer has visible Hebrew and English before scripts, and no-JS exit', () => {
  const html = read('index.html');
  const veil = read('src/shell/prayer-veil.js');
  assert.match(html, /id="alef-prayer-veil"[^>]*data-prayer-ready="1"/);
  const prayer = /<p id="alef-prayer-he"[^>]*>([^<]+)<\/p>/.exec(html)?.[1];
  const translation = /<p id="alef-prayer-en"[^>]*>([^<]+)<\/p>/.exec(html)?.[1];
  assert.ok(prayer && translation, 'text is not empty before JavaScript');
  assert.ok(veil.includes(prayer), 'fallback Hebrew copies the supplied prayer');
  assert.ok(veil.includes(translation), 'fallback English copies the supplied translation');
  assert.match(html, /<noscript><style>#alef-prayer-veil\{display:none\}<\/style>/);
  assert.ok(html.indexOf('src/shell/prayer-veil.js') < html.indexOf('src/app.js'));
});

test('no route waits for optional image approvals before first paint', () => {
  const app = read('src/app.js');
  assert.doesNotMatch(app, /const firstIsHome =/);
  const start = app.indexOf('router.start();');
  const deferred = app.indexOf('shownFirst.then(() => afterPaint(async () => {', start);
  assert.ok(start >= 0 && deferred > start, 'image resolver deferred until after the first route has painted');
  assert.match(app, /ctxBase\.images = images/);
});

test('harvest art is local and documentary text stays out of image pixels', () => {
  const html = read('index.html'), css = read('assets/css/astral-home.css');
  const scene = read('src/shell/astral-tree.js');
  const paths = [ANCIENT_TREE_SRC, ANCIENT_TREE_MOBILE_SRC];
  for (const path of paths) {
    const data = readFileSync(new URL('../' + path, import.meta.url));
    assert.equal(data.toString('ascii', 0, 4), 'RIFF');
    assert.equal(data.toString('ascii', 8, 12), 'WEBP');
    assert.ok(!data.includes(Buffer.from('EXIF', 'ascii')), 'no EXIF chunk: ' + path);
    assert.ok(!data.includes(Buffer.from('XMP ', 'ascii')), 'no XMP chunk: ' + path);
  }
  assert.match(scene, /h\('picture'/);
  assert.match(css, /\.show-portal--clay/);
  assert.match(css, /\.show-portal--harvest/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  // Owner order (Nov 7 2026): the credit line lives on a couple of pages
  // (Home and About), not in the shell on every page.
  assert.doesNotMatch(html, /site-footer/);
  assert.match(read('src/shell/home.view.js'), /Made by John Khan · © 2026 John Khan\. All rights reserved\./);
  assert.match(read('src/shell/about.view.js'), /Made by John Khan\. Aleph is \\u00a9 2026 John Khan/);
});


test('optional prayer audio has a finite escape hatch and cannot trap the opening veil', () => {
  const veil = read('src/shell/prayer-veil.js');
  assert.match(veil, /const MAX_LISTEN_HOLD_MS = 30000/);
  assert.match(veil, /deadline = setTimeout\(\(\) => dismiss\(true\), MAX_LISTEN_HOLD_MS\)/);
  assert.match(veil, /function releaseAfter\(ms\)/);
  assert.match(veil, /if \(now \|\| reduce\) \{ veil\.remove\(\); return; \}/);
});


test('the generated view inventory covers every local route, including Day-0 Word Finder', () => {
  const generated = read('src/shell/views.generated.js');
  const list = JSON.parse(/VIEW_FILES = (\[[^\n]+\]);/.exec(generated)?.[1] || '[]');
  const have = new Set(list);
  assert.ok(have.has('games/wordfinder.view.js'), 'Word Finder is in the deployed module inventory');
  for (const route of ROUTES) {
    if (!route.module || route.module.startsWith('../../')) continue;
    const path = route.module.replace(/^\.\//, 'shell/').replace(/^\.\.\//, '');
    assert.ok(have.has(path), route.name + ' has a generated view: ' + path);
  }
});


test('first-day words and games use dedicated clean, local cultural-object artwork', () => {
  const css = read('assets/css/astral-home.css');
  const assets = [
    'assets/img/gen/PORTAL_words_clay.webp',
    'assets/img/gen/PORTAL_games_shofar.webp',
  ];
  for (const path of assets) {
    const bytes = readFileSync(new URL('../' + path, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', path);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', path);
    assert.ok(bytes.length > 20000 && bytes.length < 80000, 'lightweight portal artwork: ' + path);
    assert.ok(!bytes.includes(Buffer.from('EXIF')), 'no EXIF payload: ' + path);
    assert.ok(!bytes.includes(Buffer.from('XMP ')), 'no XMP chunk: ' + path);
    assert.ok(css.includes(path.replace('assets/img/', '../img/')), 'visible CSS background: ' + path);
  }
  assert.ok(css.includes('.show-portal--clay .show-portal-art'));
  assert.ok(css.includes('.show-portal--harvest .show-portal-art'));
});
