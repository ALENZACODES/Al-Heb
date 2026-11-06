import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PAIRS } from '../src/games/tugowar.view.js';
import { buildVowelDeck } from '../src/games/vowelcatcher.view.js';

const json = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

test('Tug-of-War pictures are exact known Opposites index entries', async () => {
  const index = await json('../data/img/index.json');
  const valid = new Set(Object.entries(index.g).filter(([k]) => k === 'asset:Opposites I' || k === 'asset:Opposites II')
    .flatMap(([, [prefix, rows]]) => rows.map((r) => prefix + r[0])));
  const mapped = PAIRS.filter((p) => p.img !== null);
  assert.equal(PAIRS.length, 12);
  assert.equal(mapped.length, 7); // Known semantic matches; remaining five must not be mislabelled.
  for (const pair of mapped) assert.ok(valid.has(pair.img), pair.img);
  for (const pair of PAIRS) assert.ok(Object.hasOwn(pair, 'img'));
});

test('Vowel Catcher derives letters and marks from authoritative data', async () => {
  const letters = await json('../data/letters/letters.json');
  const niqqud = await json('../data/pronunciation/niqqud.json');
  const deck = buildVowelDeck(letters, niqqud);
  assert.equal(deck.LETTERS.length, 5);
  assert.equal(deck.MARKS.length, 7);
  for (const letter of deck.LETTERS) {
    assert.equal(letter.img.kind, 'letter');
    assert.ok(letters.some((row) => row.id === letter.id && row.he === letter.glyph));
  }
  for (const mark of deck.MARKS) {
    assert.equal(mark.img.kind, 'vowel');
    const row = niqqud.records.find((r) => r.id === mark.id);
    assert.equal(row.shape, row.base + mark.point);
    assert.ok(mark.variants.every((v) => v.id));
  }
});

test('Vowel Catcher returns empty decks when files are unavailable', () => {
  const deck = buildVowelDeck(null, null);
  assert.deepEqual(deck, { LETTERS: [], MARKS: [] });
});
