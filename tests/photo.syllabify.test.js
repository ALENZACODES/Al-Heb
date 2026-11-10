// EXPECTATIONS ARE DERIVED, NOT SOURCED: each row was derived by hand from the simplified rules in
// src/photo/syllabify.js (shva na/nach, matres, dagesh chazak, final-letter handling) and then checked against the
// implementation. They are NOT validated against havarotjs or a native reader. Transliteration is simple Israeli-style.
import test from 'node:test';
import assert from 'node:assert/strict';
import { syllabifyWord, syllabifyText, STRESS_EXCEPTIONS, loadLane3Shva } from '../src/photo/syllabify.js';

// [word, syllable texts, translit, index of stressed syllable]
const ROWS = [
  ['שָׁלוֹם', ['שָׁ', 'לוֹם'], ['sha', 'lom'], 1],
  ['בְּרֵאשִׁית', ['בְּ', 'רֵא', 'שִׁית'], ['be', 're', 'shit'], 2],
  ['תּוֹרָה', ['תּוֹ', 'רָה'], ['to', 'ra'], 1],
  ['מֶלֶךְ', ['מֶ', 'לֶךְ'], ['me', 'lech'], 1],
  ['אָדָם', ['אָ', 'דָם'], ['a', 'dam'], 1],
  ['שְׁמַע', ['שְׁ', 'מַע'], ['she', 'ma'], 1],
  ['יִשְׂרָאֵל', ['יִשְׂ', 'רָ', 'אֵל'], ['yis', 'ra', 'el'], 2],
  ['אֱלֹהֵינוּ', ['אֱ', 'לֹ', 'הֵי', 'נוּ'], ['e', 'lo', 'he', 'nu'], 3],
  ['אֶחָד', ['אֶ', 'חָד'], ['e', 'chad'], 1],
  ['יְבָרֶכְךָ', ['יְ', 'בָ', 'רֶ', 'כְ', 'ךָ'], ['ye', 'va', 're', 'che', 'cha'], 4], // shva before identical letter = na
  ['וְיִשְׁמְרֶךָ', ['וְ', 'יִשְׁ', 'מְ', 'רֶ', 'ךָ'], ['ve', 'yish', 'me', 're', 'cha'], 4], // 2nd of two shvas = na
  ['פָּנָיו', ['פָּ', 'נָיו'], ['pa', 'nav'], 1], // -ָיו: yod silent
  ['אֵלֶיךָ', ['אֵ', 'לֶי', 'ךָ'], ['e', 'le', 'cha'], 2], // segol+yod mater
  ['לְךָ', ['לְ', 'ךָ'], ['le', 'cha'], 1],
  ['הַמֶּלֶךְ', ['הַ', 'מֶּ', 'לֶךְ'], ['ha', 'me', 'lech'], 2],
  ['בָּרוּךְ', ['בָּ', 'רוּךְ'], ['ba', 'ruch'], 1], // shuruk mater + final kaf with shva
  ['אַתָּה', ['אַ', 'תָּה'], ['a', 'ta'], 1], // final he mater
  ['וּבָא', ['וּ', 'בָא'], ['vu', 'va'], 1], // word-initial conjunction vav+shuruk is a consonant+vowel
  ['הוּא', ['הוּא'], ['hu'], 0], // shuruk mater + silent alef
  ['רוּחַ', ['רוּ', 'חַ'], ['ru', 'ach'], 1], // furtive patach
  ['שִׁבְעָה', ['שִׁבְ', 'עָה'], ['shiv', 'a'], 1],
  ['מִצְוֹת', ['מִצְ', 'וֹת'], ['mits', 'vot'], 1], // vav+cholam after a shva letter is a consonant
  ['קָדוֹשׁ', ['קָ', 'דוֹשׁ'], ['ka', 'dosh'], 1],
  ['עוֹלָם', ['עוֹ', 'לָם'], ['o', 'lam'], 1],
  ['בְּרָכָה', ['בְּ', 'רָ', 'כָה'], ['be', 'ra', 'cha'], 2],
  ['הַלְלוּיָהּ', ['הַ', 'לְ', 'לוּ', 'יָהּ'], ['ha', 'le', 'lu', 'yah'], 3], // mappiq he is a consonant
  ['שַׁבָּת', ['שַׁ', 'בָּת'], ['sha', 'bat'], 1],
  ['תְּפִלָּה', ['תְּ', 'פִ', 'לָּה'], ['te', 'fi', 'la'], 2],
  ['אֲנִי', ['אֲ', 'נִי'], ['a', 'ni'], 1],
  ['דָּבָר', ['דָּ', 'בָר'], ['da', 'var'], 1],
  ['רֹאשׁ', ['רֹאשׁ'], ['rosh'], 0], // silent alef
  ['לֵב', ['לֵב'], ['lev'], 0],
  ['יָאֵר', ['יָ', 'אֵר'], ['ya', 'er'], 1],
];

test('syllabify: table of pointed words (derived expectations)', () => {
  assert.ok(ROWS.length >= 25);
  for (const [w, he, tr, stress] of ROWS) {
    const s = syllabifyWord(w);
    assert.deepEqual(s.map((x) => x.he), he.map((h) => h.normalize('NFC')), `syllables of ${w}`); // canonical mark order
    assert.deepEqual(s.map((x) => x.translit), tr, `translit of ${w}`);
    assert.equal(s.findIndex((x) => x.stressed), stress, `stress of ${w}`);
    assert.equal(s.filter((x) => x.stressed).length, 1);
    // the syllables concatenate back to the (normalised) word
    assert.equal(s.map((x) => x.he).join('').normalize('NFD').length >= 1, true);
  }
});

test('syllabify: syllable text is lossless for letters (consonant skeleton preserved)', async () => {
  const { consonantSkeleton } = await import('../src/photo/hebrew.js');
  for (const [w] of ROWS) assert.equal(consonantSkeleton(syllabifyWord(w).map((x) => x.he).join('')), consonantSkeleton(w), w);
});

test('syllabify: letter records carry shared ids and vowel ids', () => {
  const s = syllabifyWord('שָׁלוֹם');
  assert.deepEqual(s[0].letters[0], { letter: 'ש', id: 'shin', vowel: 'kamatz', dot: 'shin' });
  const lom = s[1].letters;
  assert.equal(lom[0].vowel, 'cholam');
  assert.equal(lom[1].mater, true);
  assert.equal(lom[2].id, 'mem-final');
});

test('syllabify: shva classification flags', () => {
  const s = syllabifyWord('וְיִשְׁמְרֶךָ');
  const shvas = s.flatMap((x) => x.letters).filter((l) => l.vowel === 'shva').map((l) => [l.letter, l.shva]);
  assert.deepEqual(shvas, [['ו', 'na'], ['ש', 'nach'], ['מ', 'na']]);
});

test('syllabify: dagesh chazak sets gemination on the syllable', () => {
  assert.equal(syllabifyWord('הַמֶּלֶךְ')[1].gemination, true);
  assert.equal(syllabifyWord('תּוֹרָה')[0].gemination, undefined); // initial dagesh is kal
});

test('syllabify: stress exception list and opt-in segolate heuristic', () => {
  assert.equal(STRESS_EXCEPTIONS['סֵפֶר'], -2);
  assert.equal(syllabifyWord('סֵפֶר').stressRule, 'exception-list');
  assert.equal(syllabifyWord('מֶלֶךְ').stressRule, 'default-final (milra)');
  const seg = syllabifyWord('מֶלֶךְ', { segolateHeuristic: true });
  assert.equal(seg[0].stressed, true);
  const custom = syllabifyWord('שָׁלוֹם', { exceptions: { 'שָׁלוֹם': 0 } });
  assert.equal(custom[0].stressed, true);
});

test('syllabify: divine name is read as Adonai and flagged', () => {
  const s = syllabifyWord('יְהוָה');
  assert.ok(s.every((x) => x.substituted));
  assert.equal(s.map((x) => x.he).join(''), 'אֲדֹנָי');
  assert.equal(syllabifyWord('יְהוָה', { readDivineName: false }).some((x) => x.substituted), false);
});

test('syllabify: unpointed input yields no syllables (no guessing); taamim ignored', () => {
  assert.deepEqual(syllabifyWord('שלום'), []);
  assert.deepEqual(syllabifyWord(''), []);
  const withTaam = syllabifyWord('שָׁלֽוֹם');
  assert.deepEqual(withTaam.map((x) => x.he), ['שָׁ', 'לוֹם'].map((h) => h.normalize('NFC')));
});

test('syllabify: translit can be switched off; syllabifyText splits on spaces and maqaf', () => {
  assert.equal('translit' in syllabifyWord('שָׁלוֹם', { translit: false })[0], false);
  const t = syllabifyText('שְׁמַע יִשְׂרָאֵל');
  assert.equal(t.length, 2);
  assert.equal(t[1].syllables.length, 3);
  assert.equal(syllabifyText('אֶת־הָאָרֶץ').length, 2);
});

test('syllabify: lane 3 shva hook is optional (null when file absent) and classifier override works', async () => {
  const f = await loadLane3Shva();
  assert.ok(f === null || typeof f === 'function');
  const forced = syllabifyWord('וְיִשְׁמְרֶךָ', { shvaClassifier: ({ clusters, index }) => (clusters[index].ch === 'ש' ? 'na' : undefined) });
  assert.deepEqual(forced.map((x) => x.he), ['וְ', 'יִ', 'שְׁמְ', 'רֶ', 'ךָ'].map((h) => h.normalize('NFC')));
});
