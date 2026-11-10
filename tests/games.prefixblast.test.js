import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { buildPrefixDeck, completePrefix, PREFIXES } from '../src/games/prefixblast.view.js';
const json = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const words = readdirSync(new URL('../data/vocab/themes', import.meta.url)).filter(p => p.endsWith('set01.json')).flatMap(p => json('data/vocab/themes/' + p).words);
const data = { words, registry: json('data/corpus/registry.json').entries };
test('attested noun deck covers all four prefixes; every wrong prefix fails closed', () => {
  const deck = buildPrefixDeck(data);
  assert.ok(deck.length >= 10);
  assert.equal(new Set(deck.map(r => r.prefix)).size, 4);
  for (const r of deck) {
    assert.ok(r.id.startsWith('reg:'));
    assert.ok(words.some(w => w.id === r.wordId && w.pos === 'noun'));
    for (const p of PREFIXES) assert.equal(completePrefix(r, p.id), p.id === r.prefix ? r.he : null);
  }
  assert.equal(completePrefix(null, 'ה'), null);
  assert.equal(completePrefix(deck[0], 'unknown'), null);
});
