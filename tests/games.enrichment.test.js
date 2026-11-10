import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { PAIRS } from '../src/games/tugowar.view.js';
import { buildVowelDeck } from '../src/games/vowelcatcher.view.js';

const json = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const GAP_IDS = ['OPP_gap_white_black', 'OPP_gap_expensive_cheap', 'OPP_gap_strong_weak', 'OPP_gap_happy_sad', 'OPP_gap_near_far'];

test('Tug-of-War Opposites pictures cover at least 10 of 12 pairs', async () => {
  const index = await json('../data/img/index.json');
  const approvals = await json('../data/images/approvals.json');
  const groups = ['asset:Opposites I', 'asset:Opposites II', 'asset:Opposites gap'];
  const valid = new Set(Object.entries(index.g).filter(([k]) => groups.includes(k))
    .flatMap(([, [prefix, rows]]) => rows.map((r) => prefix + r[0])));
  const mapped = PAIRS.filter((p) => p.img !== null);
  assert.equal(PAIRS.length, 12);
  assert.ok(mapped.length >= 10, `image gate: ${mapped.length}/12`);
  assert.equal(mapped.length, 12);
  for (const pair of mapped) {
    assert.ok(valid.has(pair.img), pair.img);
    assert.equal(approvals.approvals[pair.img]?.status, 'approved', pair.img);
  }
  const byGloss = Object.fromEntries(PAIRS.map((p) => [p[2], p.img]));
  assert.deepEqual([byGloss.white, byGloss.expensive, byGloss.strong, byGloss.happy, byGloss.near], GAP_IDS);
  assert.equal(byGloss['old (thing)'], 'OPP_two_05');
  assert.ok(PAIRS.every((p) => p.img !== 'OPP_two_04'));
  for (const id of GAP_IDS) {
    for (const edge of [800, 1254]) {
      assert.ok(existsSync(fileURLToPath(new URL(`../assets/img/gen/${id}.${edge}.webp`, import.meta.url))), id);
    }
  }
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
