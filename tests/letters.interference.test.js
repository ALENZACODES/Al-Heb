import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { warningAfterWrongTap, pairKey } from '../src/letters/interference.js';
const rd = (p) => JSON.parse(readFileSync(new URL('../data/letters/' + p, import.meta.url)));
const I = rd('interference.json'); const C = rd('confusables.json'); const L = rd('letters.json'); const ids = new Set(L.map(l => l.id));

test('pair keys are sorted and every key references real letter ids', () => {
  for (const [k, hint] of Object.entries(I.pairs)) {
    const [a, b] = k.split('|');
    assert.equal(pairKey(a, b), k, 'key not sorted: ' + k);
    assert.ok(ids.has(a) && ids.has(b), k);
    assert.ok(hint.length > 20 && !/[֐-׿]/.test(hint), k + ' hint');
  }
});

test('no warning on a correct tap, and none for letters that are not look-alikes', () => {
  assert.equal(warningAfterWrongTap('bet', 'bet', I, C), null);
  assert.equal(warningAfterWrongTap('lamed', 'alef', I, C), null);
  assert.equal(warningAfterWrongTap('bet', 'shin', I, C), null);
});

test('a wrong tap on a look-alike gives the specific pair hint, in either direction', () => {
  const a = warningAfterWrongTap('dalet', 'resh', I, C), b = warningAfterWrongTap('resh', 'dalet', I, C);
  assert.equal(a.source, 'pair'); assert.equal(a.hint, b.hint);
  assert.match(a.hint, /corner/);
});

test('letters in a confusables set without their own pair entry fall back to the set hint', () => {
  const w = warningAfterWrongTap('bet', 'kaf-final', I, { sets: [{ id: 'x', letters: ['bet', 'kaf-final'], hint: 'set hint here' }] });
  assert.deepEqual(w && [w.source, w.hint], ['set', 'set hint here']);
});

test('every pair inside every confusable set yields some hint after a wrong tap', () => {
  for (const s of C.sets.filter(x => x.letters.length > 1)) for (const a of s.letters) for (const b of s.letters) {
    if (a === b) continue;
    assert.ok(warningAfterWrongTap(a, b, I, C), a + ' vs ' + b);
  }
});
