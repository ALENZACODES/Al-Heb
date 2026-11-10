// Camera Translator: a pole in front of a sign, lines completed across it from the word list, and which lines may go to the language pack.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findOccluders, besideBar, createGlossary, lineForPack, signCase, sourceLabel, PACK_MIN_CONF } from '../src/camera/camera-model.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const glossary = createGlossary(JSON.parse(readFileSync(join(root, 'data/camera/sign-glossary.json'), 'utf8')));

/** A blue sign with "lettering" (columns of mixed light and dark) from x=40 to x=260, and optional upright bars. */
function sign({ w = 300, h = 120, bars = [], lettering = [[40, 260]] } = {}) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = [20, 60, 160];
    if (lettering.some(([a, b]) => x >= a && x < b) && y > 35 && y < 85 && (Math.floor(x / 5) + Math.floor(y / 9)) % 2 === 0) c = [250, 250, 250];
    for (const [bx, bw, col] of bars) if (x >= bx && x < bx + bw) c = col;
    data.set([...c, 255], (y * w + x) * 4);
  }
  return { data, width: w, height: h };
}

test('a pole across the lettering is found, with the sign background colour; a clean sign has none', () => {
  const none = findOccluders(sign());
  assert.deepEqual(none.bars, []);
  const one = findOccluders(sign({ bars: [[140, 21, [95, 95, 95]]] }));
  assert.equal(one.bars.length, 1);
  assert.ok(one.bars[0].x <= 140 && one.bars[0].x + one.bars[0].w >= 161, JSON.stringify(one.bars));
  assert.ok(one.bars[0].w <= 30);
  assert.ok(Math.abs(one.background[2] - 160) < 12 && one.background[0] < 40, `background ${one.background}`);
});

test('not a pole: a hairline divider, a wide side panel, a bar with lettering on one side only, a tiny picture', () => {
  assert.deepEqual(findOccluders(sign({ bars: [[150, 2, [95, 95, 95]]] })).bars, [], 'hairline');
  assert.deepEqual(findOccluders(sign({ bars: [[100, 90, [95, 95, 95]]] })).bars, [], 'wide panel');
  assert.deepEqual(findOccluders(sign({ bars: [[270, 20, [95, 95, 95]]] })).bars, [], 'beside the lettering, not across it');
  assert.deepEqual(findOccluders({ data: new Uint8ClampedArray(30 * 10 * 4), width: 30, height: 10 }).bars, []);
});

test('a line counts as beside a bar when it touches it or stops within a letter height of it', () => {
  const bars = [{ x: 140, w: 20 }];
  assert.equal(besideBar({ x: 40, y: 30, w: 95, h: 40 }, bars), true);
  assert.equal(besideBar({ x: 165, y: 30, w: 60, h: 40 }, bars), true);
  assert.equal(besideBar({ x: 20, y: 30, w: 40, h: 20 }, bars), false);
  assert.equal(besideBar({ x: 40, y: 30, w: 95, h: 40 }, []), false);
});

test('a line cut by a pole is completed only when exactly one listed phrase fits both pieces', () => {
  assert.equal(glossary.completeAcrossGap('מאפ', 'יה', 2)?.en, 'Bakery');
  assert.equal(glossary.completeAcrossGap('בית מר', 'חת', 2)?.en, 'Pharmacy');
  assert.equal(glossary.completeAcrossGap('ב', 'ה', 3), null, 'two letters read is not enough');
  assert.equal(glossary.completeAcrossGap('ש', 'ם', 4), null);
  assert.equal(glossary.completeAcrossGap('קקק', 'ללל', 2), null, 'no listed phrase');
  assert.equal(glossary.completeAcrossGap('מס', 'ה', 1), null, 'more letters hidden than the bar could cover');
  assert.equal(glossary.completeAcrossGap('חומ', 'ס 18', 2)?.en, 'Hummus 18', 'a price that was read is kept');
});

test('lines for the language pack: read with confidence, clean, two to twelve words; one word stays with the dictionary', () => {
  assert.equal(lineForPack('חנות נעליים', 91), 'חנות נעליים');
  assert.equal(lineForPack('חנות נעליים', null), 'חנות נעליים');
  assert.equal(lineForPack('חנות נעליים', PACK_MIN_CONF - 1), '', 'a shaky reading is not sent');
  assert.equal(lineForPack('מלח', 95), '', 'one word');
  assert.equal(lineForPack('', 95), '');
  assert.equal(lineForPack('ברוך יהוה', 95), '', 'a line with the Name is never sent');
  assert.equal(lineForPack(Array(13).fill('שלום').join(' '), 95), '');
});

test('pack lines are drawn like the other sign lines, and say where they came from', () => {
  assert.equal(signCase('SHOES SHOP'), 'Shoes Shop');
  assert.equal(signCase('big lemon.'), 'Big Lemon');
  assert.equal(signCase('the store is closed on Saturday and on holidays.'), 'The store is closed on Saturday and on holidays');
  assert.equal(signCase(''), '');
  assert.match(sourceLabel('language-pack'), /on this device/); assert.match(sourceLabel('language-pack'), /Check it/);
  assert.doesNotMatch(sourceLabel('language-pack'), /\bAI\b|neural|machine|\bmodel\b/i);
});
