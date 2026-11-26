// "Did you mean" for the dictionary search (25 Nov 2026 audit: "shlom" returned "No words match" with no suggestions).
import test from 'node:test';
import assert from 'node:assert/strict';
import { editDistance, suggestSpellings } from '../src/vocab/rank.js';

const E = [{ he: 'שָׁלוֹם', lemma: 'שלום', gloss: 'peace; hello', translit: 'shalom', rank: 1 }, { he: 'אַבָּא', lemma: 'אבא', gloss: 'father, dad', translit: 'abba', rank: 2 }, { he: 'מַיִם', lemma: 'מים', gloss: 'water', translit: 'mayim', rank: 3 }];

test('edit distance counts one slip, a swap of neighbours as one, and stops early', () => {
  assert.equal(editDistance('shlom', 'shalom'), 1); assert.equal(editDistance('watre', 'water'), 1); assert.equal(editDistance('abc', 'xyzw', 1), 2);
});
test('close spellings in transliteration, English and Hebrew; nothing for short or far queries', () => {
  assert.deepEqual(suggestSpellings(E, 'shlom'), [{ text: 'shalom', kind: 'transliteration' }]);
  assert.deepEqual(suggestSpellings(E, 'watr'), [{ text: 'water', kind: 'English' }]);
  assert.deepEqual(suggestSpellings(E, 'שלם'), [{ text: 'שלום', kind: 'hebrew' }]);
  assert.deepEqual(suggestSpellings(E, 'sh'), []); assert.deepEqual(suggestSpellings(E, 'zzzzzz'), []);
});
