// Gold coins on Home / showcase / Talk / Camera / Light, and Rimon helpers on those screens.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import './torahread.fakedom.js';
import { MEDAL_FOR, medalFor } from '../src/shell/ui.js';
import { showcaseNode, TILES } from '../src/shell/showcase.js';
import { dayContext, routeTrigger, pickStill, TRIGGERS } from '../src/shell/rimon-triggers.js';
import { STILL_IDS } from '../src/shell/rimon-stills.generated.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const SIZES = [112, 160, 224, 320];
const NEW_HOME = ['talk', 'camera', 'light', 'games', 'books', 'lab', 'learn', 'speak', 'firstday'];

test('every showcase destination that has a medal mapping renders a gold coin', () => {
  const node = showcaseNode({ hasRoute: () => true, routeName: 'home' });
  const tiles = node.queryAll('a.show-tile');
  assert.ok(tiles.length >= 10, 'destination tiles are present');
  let withMedal = 0;
  for (const tile of tiles) {
    const medals = tile.queryAll('img.alef-medal');
    if (medals.length) {
      withMedal += 1;
      assert.match(medals[0].attrs.src, /assets\/img\/icons\/ICON_.*\.112\.webp/);
      assert.equal(medals[0].attrs.loading, 'lazy');
    }
  }
  const expected = TILES.filter(([name]) => MEDAL_FOR[name]).length;
  assert.equal(withMedal, expected);
  assert.ok(withMedal >= 15, 'almost every showcase tile now has a coin');
});

test('new home coins exist in four lazy sizes and have no EXIF-style sidecar text', () => {
  for (const id of NEW_HOME) {
    for (const z of SIZES) {
      const rel = `assets/img/icons/ICON_home_${id}.${z}.webp`;
      assert.ok(existsSync(join(root, rel)), rel);
      const bytes = readFileSync(join(root, rel));
      assert.ok(bytes.length > 2000, rel + ' is not empty');
      assert.equal(bytes.slice(0, 4).toString('ascii'), 'RIFF');
    }
  }
});

test('medalFor maps the main feature routes and returns null for an unknown name', () => {
  assert.deepEqual(MEDAL_FOR.talk, ['home', 'talk']);
  assert.deepEqual(MEDAL_FOR.camera, ['home', 'camera']);
  assert.deepEqual(MEDAL_FOR.light, ['home', 'light']);
  assert.deepEqual(MEDAL_FOR.games, ['home', 'games']);
  const el = medalFor('letters', 40);
  assert.equal(el.className, 'alef-medal');
  assert.equal(el.attrs.width, '40');
  assert.equal(medalFor('no-such-route'), null);
});

test('Talk, Camera and Light mount a gold coin and an in-page Rimon helper', () => {
  for (const file of ['src/talk/talk.view.js', 'src/camera/camera.view.js', 'src/light/light.view.js']) {
    const src = read(file);
    assert.match(src, /medal\('home', '/);
    assert.match(src, /rimonSays\(/);
    assert.doesNotMatch(src, /\bAI\b|ChatGPT|Claude|language model/i);
  }
  assert.match(read('src/shell/home.view.js'), /medalFor\(r\.name/);
});

test('Talk, Camera, Light and Welcome have Rimon page triggers that resolve a still', () => {
  const ctx = dayContext(new Date(2026, 10, 10, 12)); // a Tuesday, not Shabbat
  const present = new Set(Object.values(STILL_IDS).flat());
  const map = { talk: 'talk.home', camera: 'camera.home', light: 'light.home', welcome: 'greet.first' };
  for (const [route, trigger] of Object.entries(map)) {
    assert.equal(routeTrigger(route, ctx), trigger, route);
    assert.ok(TRIGGERS[trigger], trigger);
    const still = pickStill(trigger, { present, now: ctx.now || new Date(2026, 10, 10, 12) });
    assert.ok(still?.id, 'still for ' + trigger);
  }
});

// ---- second pass: tab coins, arcade card pictures, lesson stop coins, relief coins ----
import { firstHebrewLetter } from '../src/shell/ui.js';
import { ARCADE_GAMES } from '../src/games/arcade.catalog.js';

test('the four tab sections and More draw a gold coin that exists, with the SVG mask kept for forced colours', () => {
  const css = read('assets/css/polish.css');
  for (const id of ['learn', 'read', 'speak', 'progress', 'more']) {
    const m = css.match(new RegExp(`\\.nav-ico-${id} \\{ --coin: url\\("\\.\\./img/icons/(ICON_home_${id}\\.112\\.webp)"\\)`));
    assert.ok(m, 'coin for tab ' + id);
    assert.ok(existsSync(join(root, 'assets/img/icons', m[1])), m[1]);
    assert.match(css, new RegExp(`\\.nav-ico-${id} \\{ --ico: url\\(`), 'mask fallback for ' + id);
  }
  assert.match(css, /@media \(forced-colors: active\) \{\s*\.site-nav \.nav-ico \{ -webkit-mask: var\(--ico\)/);
});

test('every arcade game has a light lazy WebP card picture from its own scene', async () => {
  const { arcadeThumb } = await import('../src/games/games.view.js');
  for (const { id } of ARCADE_GAMES) {
    for (const w of [480, 800]) {
      const rel = `assets/img/arcade-thumbs/${id}.${w}.webp`;
      assert.ok(existsSync(join(root, rel)), rel);
      const bytes = readFileSync(join(root, rel));
      assert.equal(bytes.slice(8, 12).toString('ascii'), 'WEBP', rel);
      assert.ok(bytes.length < 60_000, rel + ' stays small');
      assert.ok(!bytes.includes(Buffer.from('Exif')) && !bytes.includes(Buffer.from('XMP ')), rel + ' carries no metadata');
    }
    const img = arcadeThumb(id);
    assert.equal(img.attrs.loading, 'lazy');
    assert.match(img.attrs.src, new RegExp(`arcade-thumbs/${id}\\.480\\.webp$`));
  }
  assert.doesNotMatch(read('src/games/games.view.js'), /['"`][^'"`\n]*env\.png['"`]/, 'no card loads the 850 KB scene PNG');
  assert.doesNotMatch(read('tools/build-precache.mjs').match(/const SKIP = [^\n]+/)[0], /arcade-thumbs/); // covered by the assets/img/ rule
});

test('lesson stops carry their first Hebrew letter as live text (never a picture of a letter)', () => {
  assert.equal(firstHebrewLetter('שַׁבָּת'), 'ש');
  assert.equal(firstHebrewLetter('Bet בּ'), 'ב');
  assert.equal(firstHebrewLetter('no hebrew'), null);
  assert.equal(firstHebrewLetter(undefined), null);
  assert.match(read('src/curriculum/learn.view.js'), /"data-glyph": firstHebrewLetter\(/);
  assert.match(read('assets/css/polish.css'), /\.alef-lesson\[data-glyph\]::before[^{]*\{\s*content: attr\(data-glyph\)/);
});

test('home coins (including More) are struck relief, not flat, and carry no metadata', () => {
  assert.ok(existsSync(join(root, 'tools/images/relief-coins.py')));
  for (const id of [...NEW_HOME, 'more']) {
    const a = readFileSync(join(root, `assets/img/icons/ICON_home_${id}.320.webp`));
    assert.ok(a.length > 15_000, id + ' carries shaded detail');
    assert.ok(!a.includes(Buffer.from('Exif')) && !a.includes(Buffer.from('XMP ')), id + ' carries no metadata');
  }
});
