import test from 'node:test';
import assert from 'node:assert/strict';
import { stripNiqqud, stripTaamim, stripMarks, consonantSkeleton, isHebrew, isPointed, tokenise, sanityCheck, foldFinals } from '../src/photo/hebrew.js';

test('stripNiqqud removes points but keeps letters, maqaf and sof pasuq', () => {
  assert.equal(stripNiqqud('שָׁלוֹם'), 'שלום');
  assert.equal(stripNiqqud('אֶת־הָאָרֶץ׃'), 'את־הארץ׃');
});
test('stripTaamim removes cantillation only', () => {
  assert.equal(stripTaamim('בְּרֵאשִׁ֖ית'), 'בְּרֵאשִׁית');
  assert.equal(stripMarks('בְּרֵאשִׁ֖ית'), 'בראשית');
});
test('consonantSkeleton folds finals, drops punctuation and Latin', () => {
  assert.equal(consonantSkeleton('שָׁלוֹם'), 'שלומ');
  assert.equal(consonantSkeleton('מֶלֶךְ'), 'מלכ');
  assert.equal(consonantSkeleton('ךםןףץ'), 'כמנפצ');
  assert.equal(consonantSkeleton('אֶת־הָאָרֶץ׃ 123 abc'), 'אתהארצ');
  assert.equal(consonantSkeleton('אב גד', { keepSpaces: true }), 'אב גד');
  assert.equal(foldFinals('ם'), 'מ');
});
test('consonantSkeleton handles presentation forms (U+FB2A shin with dot)', () => {
  assert.equal(consonantSkeleton('שׁלום'), 'שלומ');
});
test('isHebrew / isPointed / tokenise', () => {
  assert.equal(isHebrew('abc 123'), false);
  assert.equal(isHebrew('abc ש'), true);
  assert.equal(isPointed('שלום'), false);
  assert.equal(isPointed('שָׁלוֹם'), true);
  assert.deepEqual(tokenise('אֶת־הָאָרֶץ  שלום'), ['אֶת', 'הָאָרֶץ', 'שלום']);
  assert.deepEqual(tokenise(''), []);
});
test('sanityCheck flags stray marks and mixed tokens', () => {
  assert.equal(sanityCheck('שָׁלוֹם').ok, true);
  assert.equal(sanityCheck('ָשלום').ok, false);
  assert.match(sanityCheck('ב50').issues.join(), /mixes Hebrew/);
  assert.match(sanityCheck('שׁלום').issues.join(), /presentation/);
});
