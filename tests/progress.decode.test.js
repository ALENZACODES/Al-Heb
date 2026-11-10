import test from 'node:test';
import assert from 'node:assert/strict';
import { requirementsOf, splitWords, gradeLines, gradeWords, knownSet, entriesDecodable, wordsDecodable, unlockers, NAME_TOKEN } from '../src/progress/decode.js';

const sorted = (s) => [...s].sort();

test('requirementsOf: letters and every sign in a pointed word', () => {
  assert.deepEqual(sorted(requirementsOf('שָׁלוֹם')), sorted(['shin', 'shin-dot', 'kamatz', 'lamed', 'vav', 'cholam', 'mem-final']));
  assert.deepEqual(sorted(requirementsOf('בַּת')), sorted(['bet', 'patach', 'dagesh', 'tav']));
});
test('requirementsOf: shuruk is a vav with only a dot, not a dagesh', () => {
  assert.deepEqual(sorted(requirementsOf('וּ')), ['shuruk', 'vav']);
  assert.ok(requirementsOf('בּ').has('dagesh'));
  assert.ok(!requirementsOf('וּ').has('dagesh'));
});
test('requirementsOf: the Name is one exception token, kamatz-katan and holam-haser map to known signs', () => {
  assert.deepEqual([...requirementsOf('יְהוָה')], [NAME_TOKEN]);
  assert.ok(requirementsOf('כׇּל').has('kamatz'));
  assert.ok(requirementsOf('וֺ').has('cholam'));
});
test('requirementsOf ignores cantillation, sof pasuk and Latin text', () => {
  assert.deepEqual(sorted(requirementsOf('אָ֑ב׃ x')), sorted(['alef', 'kamatz', 'bet']));
});
test('splitWords splits on spaces and maqaf and drops punctuation-only tokens', () => {
  assert.deepEqual(splitWords('כָּל־בֵּית ׃ אָמֵן'), ['כָּל', 'בֵּית', 'אָמֵן']);
});

const known = (l, s, n = false) => knownSet(l, s, n);
test('gradeLines: full, almost (exactly one unknown), no; multi-line entries split per line', () => {
  const entries = [{ id: 'a', title: 'A', he: 'שָׁב\nשָׁבּ\nשָׁבּוֹ' }];
  const k = known(['shin', 'bet'], ['shin-dot', 'kamatz']);
  const g = gradeLines(entries, k);
  assert.deepEqual(g.map((l) => l.id), ['a#1', 'a#2', 'a#3']);
  assert.deepEqual(g.map((l) => l.status), ['full', 'almost', 'no']);
  assert.deepEqual(g[1].missing, ['dagesh']);
});
test('gradeLines: a single-line entry keeps its own id', () => {
  assert.equal(gradeLines([{ id: 'x', he: 'בָּ' }], known(['bet'], ['kamatz', 'dagesh']))[0].id, 'x');
});
test('the Name counts as known only when the Name lesson was done', () => {
  const e = [{ id: 'n', he: 'יְהוָה' }];
  assert.equal(gradeLines(e, known([], [], false))[0].status, 'almost');
  assert.equal(gradeLines(e, known([], [], true))[0].status, 'full');
});
test('entriesDecodable needs every line and a known entry id; wordsDecodable needs non-empty list', () => {
  const entries = [{ id: 'a', he: 'שָׁב\nשָׁבּ' }];
  const k = known(['shin', 'bet'], ['shin-dot', 'kamatz']);
  assert.equal(entriesDecodable(entries, ['a'], k), false);
  assert.equal(entriesDecodable(entries, ['missing'], k), false);
  assert.equal(entriesDecodable([{ id: 'b', he: 'שָׁב' }], ['b'], k), true);
  assert.equal(wordsDecodable([], k), false);
});
test('gradeWords counts distinct words, most frequent first; unlockers rank the sign that opens most lines', () => {
  const k = known(['shin', 'bet'], ['shin-dot', 'kamatz']);
  const lines = [{ he: 'שָׁב שָׁב שָׁבּ' }, { he: 'שָׁבּ' }];
  const w = gradeWords(lines, k);
  assert.equal(w.total, 2);
  assert.deepEqual(w.full.map((x) => [x.he, x.count]), [['שָׁב', 2]]);
  assert.deepEqual(w.almost.map((x) => x.missing), ['dagesh']);
  const g = gradeLines([{ id: 'a', he: 'שָׁבּ\nשָׁבּ\nשָׁבּוֹ' }], k);
  assert.deepEqual(unlockers(g), [{ id: 'dagesh', lines: 2 }]);
});
