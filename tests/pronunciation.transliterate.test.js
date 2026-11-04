// Lane 3: transliteration engine tests.
//
// HONESTY NOTE on expectations.
//  - SOURCED: the same-word pairs (Shabbat/Shabbos, brit/bris, Adonai/Adonoy, Yitgadal/Yisgadal, ...) come
//    from My Jewish Learning, Chabad, Jewfaq and Pealim (see data/pronunciation/drills.json `pairs`). Those
//    sources give spellings, not an algorithm; the comparison below ignores apostrophes, hyphens and doubled
//    letters because the sources use English spelling conventions (Shabbos, chosson) that the engine does not.
//  - DERIVED BY ME (not sourced): every expected string for the 15 Priestly Blessing words. The pointed text is
//    Sefaria's (Numbers 6:24-26, via the research notes). The expectations were written by hand from the
//    rules in the notes (jewfaq-style siddur scheme, shva rules, tav/kamatz/tzere switches). The notes' own
//    word table is also the researcher's rendering, not a published transliteration, and it writes
//    yevarekh'kha where this engine writes yevarekhkha (no apostrophe for the silent shva).
//  - No native speaker has reviewed any of these.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transliterate, resolveOptions } from '../src/pronunciation/transliterate.js';
import { stripTaamim } from '../src/pronunciation/hebrew.js';

const VERSE = 'יְבָרֶכְךָ֥ יהוה וְיִשְׁמְרֶֽךָ׃ / יָאֵ֨ר יהוה ׀ פָּנָ֛יו אֵלֶ֖יךָ וִֽיחֻנֶּֽךָּ׃ / יִשָּׂ֨א יהוה ׀ פָּנָיו֙ אֵלֶ֔יךָ וְיָשֵׂ֥ם לְךָ֖ שָׁלֽוֹם׃';
const WORDS = VERSE.split(/\s+/).filter((w) => w && w !== '/' && w !== '׀');

// hand-derived (see header)
const ISRAELI = ['yevarekhkha', 'adonai', 'veyishmerekha', "ya'er", 'adonai', 'panav', 'elekha', 'vichuneka',
  'yisa', 'adonai', 'panav', 'elekha', 'veyasem', 'lekha', 'shalom'];
const ASHKENAZI = ['yevorekhkho', 'adonoy', 'veyishmerekho', "yo'eir", 'adonoy', 'ponov', 'eilekho', 'vichuneko',
  'yiso', 'adonoy', 'ponov', 'eilekho', 'veyoseim', 'lekho', 'sholom'];

test('Priestly Blessing fixture has 15 words', () => {
  assert.equal(WORDS.length, 15);
});

test('Israeli rendering of every Priestly Blessing word matches the hand-written expectation', () => {
  WORDS.forEach((w, i) => assert.equal(transliterate(w, { scheme: 'siddur', tradition: 'israeli' }), ISRAELI[i], `word ${i + 1}: ${w}`));
});

test('Ashkenazi rendering of every Priestly Blessing word matches the hand-written expectation', () => {
  WORDS.forEach((w, i) => assert.equal(transliterate(w, { scheme: 'ashkenazi-siddur' }), ASHKENAZI[i], `word ${i + 1}: ${w}`));
  assert.equal(transliterate(WORDS[0], { scheme: 'siddur', tradition: 'ashkenazi' }), ASHKENAZI[0]);
});

test('cantillation, meteg and paseq do not change the output', () => {
  WORDS.forEach((w, i) => assert.equal(transliterate(stripTaamim(w)), transliterate(w), `word ${i + 1}`));
  assert.equal(transliterate(VERSE), transliterate(stripTaamim(VERSE)));
});

test('sephardi and israeli give identical Latin output in this version (documented)', () => {
  for (const w of WORDS) assert.equal(transliterate(w, { tradition: 'sephardi' }), transliterate(w, { tradition: 'israeli' }));
});

const loose = (s) => s.toLowerCase().replace(/['\-’]/g, '').replace(/(.)\1+/g, '$1');

test('sourced same-word pairs: engine agrees with the published spellings (loose comparison)', () => {
  const pairs = JSON.parse(fs.readFileSync(new URL('../data/pronunciation/drills.json', import.meta.url))).pairs;
  assert.ok(pairs.length >= 8);
  for (const p of pairs) {
    const o = p.engineOptions ?? {};
    assert.equal(loose(transliterate(p.he, { ...o, tradition: 'israeli' })), loose(p.israeli), `israeli ${p.id}`);
    assert.equal(loose(transliterate(p.he, { ...o, tradition: 'ashkenazi' })), loose(p.ashkenazi), `ashkenazi ${p.id}`);
  }
});

test('the four headline pairs from the lane brief', () => {
  assert.equal(transliterate('שַׁבָּת', { geminate: true }), 'shabbat');
  assert.equal(transliterate('שַׁבָּת', { scheme: 'ashkenazi-siddur', geminate: true }), 'shabbos');
  assert.equal(transliterate('בְּרִית', { shvaMode: 'colloquial' }), 'brit');
  assert.equal(transliterate('בְּרִית', { scheme: 'ashkenazi-siddur', shvaMode: 'colloquial' }), 'bris');
  assert.equal(transliterate('אֲדֹנָי'), 'adonai');
  assert.equal(transliterate('אֲדֹנָי', { tradition: 'ashkenazi' }), 'adonoy');
  assert.equal(transliterate('יִתְגַּדַּל'), 'yitgadal');
  assert.equal(transliterate('יִתְגַּדַּל', { tradition: 'ashkenazi' }), 'yisgadal');
  // a tav WITH dagesh stays t in Ashkenazi
  assert.equal(transliterate('תּוֹרָה', { tradition: 'ashkenazi' })[0], 't');
});

test('liturgical mode keeps the initial shva na (berit); colloquial drops it', () => {
  assert.equal(transliterate('בְּרִית'), 'berit');
  assert.equal(transliterate('זְמַן', { shvaMode: 'colloquial' }), 'zman');
  assert.equal(transliterate('וְיָשֵׂם', { shvaMode: 'colloquial' }), 'veyasem'); // vav prefix keeps its e
});

test('letters: dagesh, begadkefat, shin/sin, final forms, tsadi, chet/khaf', () => {
  assert.equal(transliterate('בַּ'), 'ba');
  assert.equal(transliterate('בַ'), 'va');
  assert.equal(transliterate('פֹּה'), 'poh');
  assert.equal(transliterate('אֶף'), 'ef');
  assert.equal(transliterate('שָׁ'), 'sha');
  assert.equal(transliterate('שָׂ'), 'sa');
  assert.equal(transliterate('חֶדֶר'), 'cheder');
  assert.equal(transliterate('חֶדֶר', { scheme: 'academic' }), 'ẖeder');
  assert.equal(transliterate('כֹּל'), 'kol');
  assert.equal(transliterate('לֶךְ'), 'lekh');
  assert.equal(transliterate('צָץ'), 'tzatz');
  assert.equal(transliterate('צָץ', { scheme: 'academic' }), 'tsats');
  assert.equal(transliterate('קָם'), 'kam');
});

test('matres lectionis: shuruk, cholam male, chirik male, tzere male, -av, -ai', () => {
  assert.equal(transliterate('סוּס'), 'sus');
  assert.equal(transliterate('שָׁלוֹם'), 'shalom');
  assert.equal(transliterate('אִמָּא'), 'ima');
  assert.equal(transliterate('בִּישׁ'), 'bish');
  assert.equal(transliterate('בֵּית'), 'beit');
  assert.equal(transliterate('פָּנָיו'), 'panav');
  assert.equal(transliterate('אֲדֹנָי', { scheme: 'academic' }), 'adonay');
  assert.equal(transliterate('מִצְוֹת'), 'mitzvot'); // consonant vav after shva, not a mater
  assert.equal(transliterate('וּבָא'), 'uva'); // conjunctive shuruk at word start
});

test('alef/ayin: apostrophe only between vowels, silent word-initially; final he', () => {
  assert.equal(transliterate('אָב'), 'av');
  assert.equal(transliterate('יַעֲקֹב'), "ya'akov");
  assert.equal(transliterate('תּוֹרָה'), 'torah');
  assert.equal(transliterate('תּוֹרָה', { scheme: 'academic' }), 'tora');
  assert.equal(transliterate('לָהּ'), 'lah'); // mappiq: he is pronounced
});

test('kamatz katan: only U+05C7 and the small unverified list', () => {
  assert.equal(transliterate('כָּל'), 'kol');
  assert.equal(transliterate('וְכָל'), 'vekhol');
  assert.equal(transliterate('חָכְמָה'), 'chokhmah');
  assert.equal(transliterate('תָּכְנִית'), 'tokhnit');
  assert.equal(transliterate('קָרְבָּן'), 'korban');
  assert.equal(transliterate('מַאֲכָל'), "ma'akhal"); // ends in the letters of kol but is not kol
  assert.equal(transliterate('בׇ'), 'vo'); // explicit kamatz katan glyph
  // KNOWN LIMITATION (TODO): a kamatz katan that is not on the list, e.g. אָכְלָה (okhla), is read as a
  // plain kamatz and its shva comes out vocal. This asserts the current (wrong) behaviour so it is visible.
  assert.equal(transliterate('אָכְלָה'), 'akhelah');
});

test('text handling: spaces kept, maqaf becomes hyphen, punctuation passes through, sof pasuq dropped', () => {
  assert.equal(transliterate('שָׁלוֹם עֲלֵיכֶם'), "shalom aleikhem");
  assert.equal(transliterate('אֶת־כָּל׃'), 'et-kol');
  assert.equal(transliterate('שָׁלוֹם, (1)'), 'shalom, (1)');
  assert.equal(transliterate(''), '');
});

test('options: capitalize, shvaStyle, kamatz aw, cholam oy, bad scheme throws', () => {
  assert.equal(transliterate('שָׁלוֹם', { capitalize: true }), 'Shalom');
  assert.equal(transliterate('בְּרִית', { shvaStyle: "'" }), "b'rit");
  assert.equal(transliterate('בָּרוּךְ', { tradition: 'ashkenazi', kamatz: 'aw' }), 'bawrukh');
  assert.equal(transliterate('שָׁלוֹם', { tradition: 'ashkenazi', cholam: 'oy' }), 'sholoym');
  assert.throws(() => transliterate('א', { scheme: 'nope' }), RangeError);
  assert.throws(() => transliterate('א', { tradition: 'nope' }), RangeError);
  assert.equal(resolveOptions({ scheme: 'ashkenazi-siddur', tradition: 'israeli' }).tradition, 'ashkenazi');
});

test('regression: initial and mid-word he before a vav vowel letter is kept', () => {
  const cases = {
    'הוּא': 'hu', 'הוֹדוּ': 'hodu', 'הוֹלֵךְ': 'holekh', 'הוּלַד': 'hulad', 'וְהוּא': 'vehu',
    'מְהוּמָה': 'mehumah', 'יְהוּדִי': 'yehudi', 'תַּהֲלוּכָה': 'tahalukhah', 'הוֹאִיל': "ho'il",
  };
  for (const [he, lat] of Object.entries(cases)) assert.equal(transliterate(he), lat, he);
  assert.equal(transliterate('הוּא', { tradition: 'ashkenazi' }), 'hu');
});

test('he edge cases: final he is shown or silent, mappiq he always sounds, no vowel-less middle he', () => {
  assert.equal(transliterate('תּוֹרָה'), 'torah');
  assert.equal(transliterate('תּוֹרָה', { finalHe: 'silent' }), 'tora');
  assert.equal(transliterate('לָהּ'), 'lah');
  assert.equal(transliterate('גָּבוֹהַּ'), 'gavoah'); // furtive patach: the a is read before the mappiq he
  assert.equal(transliterate('הַר'), 'har');
});

test('silent letters and matres: alef, ayin, yod, vav', () => {
  assert.equal(transliterate('אוֹר'), 'or');
  assert.equal(transliterate('עוֹלָם'), 'olam');
  assert.equal(transliterate('בָּאוּ'), "ba'u");
  assert.equal(transliterate('שְׁמַע'), 'shema');
  assert.equal(transliterate('לֹא'), 'lo');
  assert.equal(transliterate('מוֹשִׁיעַ'), "moshi'a");
});

test('shva edge cases', () => {
  assert.equal(transliterate('וַיְהִי'), 'vayhi');
  assert.equal(transliterate('הִנְנִי'), 'hineni');
  assert.equal(transliterate('שְׁתַּיִם'), 'shtayim');
  assert.equal(transliterate('מִצְוֹת'), 'mitzvot');
  assert.equal(transliterate('וּבְנֵי'), 'uvenei');
  assert.equal(transliterate('קוֹלְךָ'), 'kolekha');
  assert.equal(transliterate('מַלְכֵּנוּ'), 'malkenu');
});

// Furtive patach (patach ganuv): word-final chet / mappiq he + patach is read with the vowel BEFORE the consonant.
// Convention (ruach, not rucha); same in all three traditions. Ayin keeps the apostrophe form and is unchanged.
test('furtive patach: final chet and mappiq he put the a before the consonant', () => {
  const cases = [['רוּחַ', 'ruach'], ['כֹּחַ', 'koach'], ['הִצְלִיחַ', 'hitzliach'], ['הִשְׁתּוֹחֵחַ', 'hishtocheach'], ['שָׁמֵחַ', 'shameach'], ['אֱלוֹהַּ', 'eloah'], ['גָּבֹהַּ', 'gavoah']];
  for (const [he, want] of cases) {
    assert.equal(transliterate(he, { tradition: 'israeli' }), want, he);
    assert.equal(transliterate(he, { tradition: 'sephardi' }), want, he);
  }
  assert.equal(transliterate('רוּחַ', { tradition: 'ashkenazi' }), 'ruach');
  assert.equal(transliterate('שָׁמֵחַ', { tradition: 'ashkenazi' }), 'shomeiach'); // vowels differ, furtive order does not
  assert.equal(transliterate('רוּחַ', { scheme: 'academic' }), 'ruaẖ');
  assert.equal(transliterate('לִשְׁמֹעַ'), "lishmo'a");
  // not furtive: chet with patach that is not word-final, or a final chet after a consonant with no full vowel
  assert.equal(transliterate('חַם'), 'cham');
  assert.equal(transliterate('פֶּתַח'), 'petach');
});

// V0-CONTENT-CHECK X1/X2: kamatz katan forms and the exceptions data file
test('kamatz katan: קָדְשׁוֹ and וּבְכָל read with o; exceptions.json mirrors the code list', async () => {
  const { readFileSync } = await import('node:fs');
  const { KAMATZ_KATAN_FORMS } = await import('../src/pronunciation/kamatz-katan.js');
  const { respellAll } = await import('../src/pronunciation/forTradition.js');
  for (const t of ['israeli', 'sephardi', 'ashkenazi']) {
    assert.equal(respellAll('קָדְשׁוֹ')[t], 'kodsho');
    assert.equal(respellAll('וּבְכָל')[t], 'uvekhol');
  }
  assert.equal(respellAll('מַאֲכָל').israeli, 'ma\'akhal'); // not a כָּל stem
  const data = JSON.parse(readFileSync(new URL('../data/pronunciation/exceptions.json', import.meta.url), 'utf8'));
  assert.deepEqual(data.kamatzKatanForms.map((e) => e.he), KAMATZ_KATAN_FORMS.map((e) => e.he));
  for (const e of [...data.kamatzKatanForms, ...data.candidates]) assert.equal(e.status, 'needs-native-review');
  assert.ok(data.candidates.every((e) => e.applied === false));
});
