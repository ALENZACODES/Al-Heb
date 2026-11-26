// Stress in the dictionary's "Say it" line (25 Nov 2026 critique, item 9): capitals on the stressed syllable, with the two common
// patterns the bare last-syllable rule gets wrong, and the syllable chips keeping their own contract.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chipsFor, hyphenated } from '../src/pronunciation/syllables.js';

const stress = JSON.parse(readFileSync(new URL('../data/pronunciation/stress.json', import.meta.url), 'utf8'));
const say = (w, pos = 'noun') => hyphenated(chipsFor(w, { tradition: 'israeli', stress, pos, patterns: true }));

test('dictionary stress: last syllable by default, segolates and -ayim on the one before, everyday family words first', () => {
  assert.equal(say('שָׁלוֹם'), 'sha-LOM'); assert.equal(say('תּוֹדָה'), 'to-DA'); assert.equal(say('יָפֶה', 'adjective'), 'ya-FE');
  assert.equal(say('חֶדֶר'), 'CHE-der'); assert.equal(say('דֶּלֶת'), 'DE-let'); assert.equal(say('מַחְבֶּרֶת'), 'mach-BE-ret');
  assert.equal(say('מַיִם'), 'MA-yim'); assert.equal(say('שָׁמַיִם'), 'sha-MA-yim');
  assert.equal(say('אַבָּא'), 'A-ba'); assert.equal(say('סַבְתָּא'), 'SAV-ta');
});

test('verbs keep the last syllable; the chips without patterns keep last-syllable-unless-listed', () => {
  assert.match(say('דִּבֶּר', 'verb'), /BER$/);
  assert.equal(hyphenated(chipsFor('חֶדֶר', { tradition: 'israeli', stress })), 'che-DER');
});
