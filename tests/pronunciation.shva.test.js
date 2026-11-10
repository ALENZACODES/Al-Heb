// Lane 3: shva na / nach classifier tests.
// Words marked "synthetic" or "from memory" are NOT from a source; they exercise a rule mechanism only.
// Rule texts come from the Sefaria sheet 626927 / Hillel Torah packet / Chazzanut Esnoga, summarised in
// research_notes/.../hebrew_vowels_pronunciation.md (Key Questions 3 and 7).

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWord } from '../src/pronunciation/hebrew.js';
import { classifyShvas, SHVA_RULES } from '../src/pronunciation/shva.js';

const verdicts = (w, opts) => [...classifyShvas(parseWord(w), opts).values()].map((v) => `${v.na ? 'na' : 'nach'}:${v.rule}`);

test('B1: word-initial shva is vocal (zman, yeladim)', () => {
  assert.deepEqual(verdicts('זְמַן'), ['na:B1']);
  assert.deepEqual(verdicts('יְלָדִים'), ['na:B1']);
});

test('B3: mid-word and final shva are silent (malkhei-type word, final kaf)', () => {
  assert.deepEqual(verdicts('יְבָרֶכְךָ'), ['na:B1', 'nach:B3']);
  assert.deepEqual(verdicts('בָּרוּךְ'), ['nach:B2']); // final
});

test('B2: of two shvas in a row the first is silent and the second vocal (yishmeru, nafshekha)', () => {
  assert.deepEqual(verdicts('יִשְׁמְרוּ'), ['nach:B3', 'na:B2']);
  assert.deepEqual(verdicts('נַפְשְׁךָ'), ['nach:B3', 'na:B2']); // Sefaria sheet example
});

test('B2: two shvas at the end of a word are both silent (synthetic pointing from memory)', () => {
  assert.deepEqual(verdicts('וַיֵּשְׁתְּ'), ['nach:B3', 'nach:B2']);
});

test('L1: shva under a letter with dagesh chazak is vocal (dibru)', () => {
  assert.deepEqual(verdicts('דִּבְּרוּ'), ['na:L1']);
  assert.deepEqual(verdicts('דִּבְּרוּ', { level: 1 }), ['nach:B3']);
});

test('L2: first of two identical letters is vocal (hineni)', () => {
  assert.deepEqual(verdicts('הִנְנִי'), ['na:L2']);
});

test('L3 (HEURISTIC): after an unaccented long vowel the shva is vocal (kolkha); level 1 leaves it silent', () => {
  const m = classifyShvas(parseWord('קוֹלְךָ'));
  assert.equal(m.get(2).na, true);
  assert.equal(m.get(2).rule, 'L3');
  assert.equal(m.get(2).heuristic, true);
  assert.deepEqual(verdicts('קוֹלְךָ', { level: 1 }), ['nach:B3']);
});

test('L4: meteg on the preceding letter makes the shva vocal (synthetic word)', () => {
  assert.deepEqual(verdicts('מַֽלְכֵי'), ['na:L4']);
});

test('X1: initial shva of shtayim is silent', () => {
  assert.deepEqual(verdicts('שְׁתַּיִם'), ['nach:X1']);
});

test('rules table is honest about what is a TODO', () => {
  const todo = SHVA_RULES.filter((r) => r.status === 'todo').map((r) => r.id);
  assert.deepEqual(todo, ['T1', 'T2', 'T3', 'T4', 'T5']);
  assert.ok(SHVA_RULES.some((r) => r.status === 'implemented-heuristic' && r.id === 'L3'));
  for (const r of SHVA_RULES) assert.ok(r.text && r.source && [1, 2].includes(r.level));
});

test('parseWord reads marks in any order and ignores cantillation', () => {
  const a = parseWord('שָׁ');
  const b = parseWord('שָׁ');
  assert.deepEqual(a, b);
  assert.equal(a[0].dot, 'shin');
  assert.equal(parseWord('בָּ֑')[0].taam, true);
});
