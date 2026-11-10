import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROSTER, rosterById } from '../src/letters/roster.js';

const letters = JSON.parse(readFileSync(new URL('../data/letters/letters.json', import.meta.url), 'utf8'));

test('ROSTER stays in sync with letters.json (id, glyph, English and Hebrew names)', () => {
  assert.equal(ROSTER.length, letters.length);
  assert.deepEqual(ROSTER.map((l) => l.id), letters.map((l) => l.id));
  for (const L of letters) {
    const r = rosterById[L.id];
    assert.equal(r.he, L.he, L.id);
    assert.equal(r.name, L.name, L.id);
    assert.equal(r.nameHe, L.nameHe || '', L.id);
  }
});
