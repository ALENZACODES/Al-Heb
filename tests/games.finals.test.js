// Final forms on the 22-key keyboard (25 Nov 2026 audit: Meltdown's אָדָם was unwinnable; Mini Crossword already took מ for ם).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { baseLetter, sameKey, ALPHABET, bareLetters } from '../src/games/arcade.model.js';

test('every final maps to a key on the 22-key keyboard', () => {
  for (const f of 'ךםןףץ') assert.ok(ALPHABET.includes(baseLetter(f)), f);
  assert.equal(baseLetter('א'), 'א');
  assert.ok(sameKey('ם', 'מ')); assert.ok(sameKey('מ', 'ם')); assert.ok(!sameKey('ם', 'ן'));
});

test('a word with a final is winnable from the 22 keys (אָדָם)', () => {
  const letters = [...bareLetters('אָדָם')];
  const keys = new Set(letters.map(baseLetter));
  assert.ok([...keys].every((k) => ALPHABET.includes(k)));
});

test('Meltdown and Mini Crossword use the shared rule; physical final keys press their regular key', () => {
  const m = readFileSync(new URL('../src/games/meltdown.view.js', import.meta.url), 'utf8');
  assert.match(m, /found\.has\(baseLetter\(l\)\)/); assert.match(m, /const want = baseLetter\(e\.key\)/);
  assert.match(m, /drawWord = \(\) => [^\n]*found\.has\(baseLetter\(ch\)\)/, 'a final letter shows once its regular key is found');
  const c = readFileSync(new URL('../src/games/minicross.view.js', import.meta.url), 'utf8');
  assert.match(c, /sameKey\(have, want\)/);
});
