import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const rd = (p) => JSON.parse(readFileSync(new URL('../data/letters/' + p, import.meta.url)));
const L = rd('letters.json'); const MN = rd('mnemonics.json');
const M = MN.letters; const V = MN.variants;
const HEB = /[֐-׿]/;

test('every letter id has a mnemonic with all fields', () => {
  for (const l of (L.letters || L)) {
    const m = M.find(x => x.id === l.id);
    assert.ok(m, 'missing ' + l.id);
    for (const k of ['sound', 'word', 'wordSound', 'wordMeaning', 'reason', 'shape', 'story', 'lookalike', 'imageIdea']) assert.ok(m[k] && m[k].length >= 2, l.id + '.' + k);
    assert.ok(/[א-ת]/.test(m.word), l.id + ' word has Hebrew');
    assert.ok(!/[א-ת]/.test(m.imageIdea), l.id + ' image idea must contain no Hebrew');
  }
});

test('revision 2 fields: soundAnchor, altStory (different from story), caption <= 60 chars, no Hebrew in captions or stories', () => {
  for (const m of [...M, ...V]) {
    assert.ok(m.soundAnchor && m.soundAnchor.length >= 3, m.id + ' soundAnchor');
    assert.ok(m.altStory && m.altStory.length >= 20 && m.altStory !== m.story, m.id + ' altStory');
    assert.ok(m.caption && m.caption.length <= 60, m.id + ' caption length ' + (m.caption || '').length);
    for (const k of ['caption', 'story', 'altStory', 'soundAnchor', 'imageIdea', 'shape']) assert.ok(!HEB.test(m[k]), m.id + '.' + k + ' must not contain Hebrew');
  }
});

test('four variants (vet, khaf, fe, sin) point to real parents and have pointed words', () => {
  assert.deepEqual(V.map(v => v.id), ['vet', 'khaf', 'fe', 'sin']);
  for (const v of V) {
    assert.ok(M.find(x => x.id === v.parent), v.id + ' parent');
    assert.ok(/[ְ-ׇ]/.test(v.word), v.id + ' word is pointed');
    for (const k of ['sound', 'story', 'lookalike', 'imageIdea', 'wordSound', 'wordMeaning']) assert.ok(v[k], v.id + '.' + k);
  }
});

test('honesty: no mnemonic states an ancient-pictograph origin as fact', () => {
  const claims = /\b(was|were) (originally )?(drawn|a picture|a pictograph)|originally (a|an) (picture|drawing)|ancient (hebrew|egyptians?) drew|(is|was|are) proven|historically (it )?(was|is) a\b/i;
  for (const m of [...M, ...V]) for (const k of ['reason', 'story', 'altStory', 'shape']) assert.ok(!claims.test(m[k] || ''), m.id + '.' + k + ': ' + m[k]);
  // every "reason" that mentions a picture must be hedged
  for (const m of M) if (/\b(picture|ox|fish|eye|tent|head|mouth|wave|tooth|teeth|house|camel|hand)\b/i.test(m.reason) && /\b(drawn|picture|origin)\b/i.test(m.reason)) assert.match(m.reason, /(often|popular|story|taught|uncertain|debated|not (a )?(proven|established))/i, m.id + ' reason must be hedged: ' + m.reason);
  assert.match(MN.meta.note, /never as proven history/);
});

test('weak-before letters now have a sound-anchored, distinct story', () => {
  for (const id of ['nun', 'mem', 'ayin', 'tet', 'tav', 'samekh', 'chet', 'tsadi']) {
    const m = M.find(x => x.id === id);
    assert.ok(m.story.length >= 60, id + ' story length');
    // sound anchor words must actually appear in the story or alt story
    const first = m.soundAnchor.match(/[A-Za-z]{3,}/g) || [];
    assert.ok(first.some(w => new RegExp(w, 'i').test(m.story + ' ' + m.altStory)) || id === 'ayin', id + ' anchor word appears in story');
  }
  assert.match(M.find(x => x.id === 'nun').story, /\bNun\b/);
  assert.match(M.find(x => x.id === 'tsadi').story, /pizza/i);
  assert.match(M.find(x => x.id === 'chet').soundAnchor, /Chanukah/);
});
