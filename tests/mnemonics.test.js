import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const rd = (p) => JSON.parse(readFileSync(new URL('../data/letters/' + p, import.meta.url)));
test('every letter id has a mnemonic with all fields', () => {
  const L = rd('letters.json'); const M = rd('mnemonics.json').letters;
  for (const l of (L.letters || L)) {
    const m = M.find(x => x.id === l.id);
    assert.ok(m, 'missing ' + l.id);
    for (const k of ['sound', 'word', 'wordSound', 'wordMeaning', 'reason', 'shape', 'story', 'lookalike', 'imageIdea']) assert.ok(m[k] && m[k].length >= 2, l.id + '.' + k);
    assert.ok(/[א-ת]/.test(m.word), l.id + ' word has Hebrew');
    assert.ok(!/[א-ת]/.test(m.imageIdea), l.id + ' image idea must contain no Hebrew');
  }
});
