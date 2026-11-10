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
