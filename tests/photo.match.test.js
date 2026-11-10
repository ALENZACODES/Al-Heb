import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { matchPrayer, weightedDistance, containmentDistance, buildCandidates, FIXTURE_REGISTRY, DEFAULT_THRESHOLD } from '../src/photo/match-prayer.js';
import { consonantSkeleton } from '../src/photo/hebrew.js';

const PB2 = 'יאר יהוה פניו אליך ויחנך'; // unpointed OCR of Num 6:25

test('exact unpointed line matches the fixture with score 1 and returns pointed text', () => {
  const m = matchPrayer(PB2);
  assert.equal(m.id, 'fixture.priestly-blessing');
  assert.equal(m.score, 1);
  assert.equal(m.matched, true);
  assert.equal(m.source, 'fixture');
  assert.equal(m.lineIndex, 1);
  assert.match(m.pointed, /יָאֵר/);
});
test('OCR resh->dalet confusion is cheap and still matches', () => {
  const m = matchPrayer('יאד יהוה פניו אליך ויחנך');
  assert.equal(m.id, 'fixture.priestly-blessing');
  assert.equal(m.matched, true);
  assert.ok(m.score < 1 && m.score > 0.95);
});
test('vav->yod confusion', () => {
  const m = matchPrayer('יאר יהוה פניי אליך וייחנך'.replace('פניי', 'פניו'));
  assert.equal(m.matched, true);
  const m2 = matchPrayer('יאר יהוה פנייו אליך ויחנך'); // extra yod
  assert.equal(m2.matched, true);
});
test('dropped letters: one and three', () => {
  assert.equal(matchPrayer('יאר יהוה פנו אליך ויחנך').matched, true);
  const m3 = matchPrayer('יאר יהוה פנו אלי ויחנ');
  assert.equal(m3.id, 'fixture.priestly-blessing');
  assert.equal(m3.matched, true);
});
test('Shema line, with finals and extra spaces and punctuation noise', () => {
  const m = matchPrayer('  שמע   ישראל, יהוה אלהינו יהוה אחד ');
  assert.equal(m.id, 'fixture.shema');
  assert.equal(m.score, 1);
});
test('pointed OCR input works the same (marks are ignored)', () => {
  assert.equal(matchPrayer('שְׁמַע יִשְׂרָאֵל').id, 'fixture.shema');
});
test('unrelated text is below threshold; no-Hebrew returns null', () => {
  const m = matchPrayer('חלב גבינה ולחם טרי');
  assert.equal(m.matched, false);
  assert.ok(m.score < DEFAULT_THRESHOLD);
  assert.equal(matchPrayer('hello 123'), null);
  assert.equal(matchPrayer(''), null);
});
test('fragment (OCR line is part of a longer corpus line) is recognised', () => {
  const m = matchPrayer('יהוה אלהינו יהוה אחד');
  assert.equal(m.id, 'fixture.shema');
  assert.equal(m.kind, 'fragment');
  assert.equal(m.matched, true);
});
test('distance primitives', () => {
  assert.equal(weightedDistance('אבג', 'אבג'), 0);
  assert.equal(weightedDistance('אבג', 'אב'), 1);
  assert.equal(weightedDistance('ר', 'ד'), 0.5);
  assert.equal(weightedDistance('א', 'ת'), 1);
  assert.equal(containmentDistance('בג', 'אבגד'), 0);
});
test('registry shapes: array and {entries}; multi-line entries also give a whole-block candidate', () => {
  const reg = [{ id: 'x', ref: 'X', he: 'אֵל\nמֶלֶךְ', english: 'God / king' }];
  assert.equal(buildCandidates(reg).length, 3);
  assert.equal(buildCandidates({ entries: reg }).length, 3);
  const m = matchPrayer('מלך', reg);
  assert.equal(m.source, 'registry');
  assert.equal(m.english, 'God / king');
  assert.equal(FIXTURE_REGISTRY.every((e) => consonantSkeleton(e.he).length > 5), true);
});
test('real data/corpus/registry.json (only if lane 5 has produced it)', { skip: !existsSync(new URL('../data/corpus/registry.json', import.meta.url)) }, () => {
  const reg = JSON.parse(readFileSync(new URL('../data/corpus/registry.json', import.meta.url), 'utf8'));
  const cands = buildCandidates(reg);
  assert.ok(cands.length > 0, 'registry yields candidates (shape: array or {entries|texts|items})');
  const c = cands.find((x) => x.skeleton.length >= 8);
  const m = matchPrayer(c.pointed, reg);
  assert.equal(m.score, 1);
  assert.equal(consonantSkeleton(m.pointed), c.skeleton);
});
