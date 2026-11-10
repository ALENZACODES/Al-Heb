// Camera Translator: pure logic and static rules for the screen. Unit tier (no browser).
// The Camera Translator has no server; several tests here exist to keep it that way.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { containsSacredName, tokens, hebrewTokens, isJunkToken, lineHadNoise, editDistance, createGlossary, regionsFromBoxes, percentBox, sourceLabel, createDictionary, wordBreakdown, wordForWord, shortGloss,
  PREFIX_MEANING, LOOK_ALIKE, twoLookAlikes, repairNumber, hiddenLetterDistance, unsureOfLine, readerImage, otsuThreshold, boxOnOriginal,
  fitText, wrapWords, chooseAlignment, groupBlocks, boxColours, contrastRatio, HELD_NOTE } from '../src/camera/camera-model.js';
import { loadGlossaryData, loadPhrasebook, loadDictionaryIndex } from '../src/camera/camera-client.js';
import { mergeReadings, LETTER_HEIGHT, READER_TARGET_SIDE } from '../src/camera/on-device.js';
import { NAME_SKELETON } from '../src/shell/names.js';
import { ROUTES, matchRoute } from '../src/shell/router.js';
import { isOnDemand, computeManifest } from '../tools/build-precache.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const glossaryData = JSON.parse(read('data/camera/sign-glossary.json'));
const guardFile = JSON.parse(read('data/camera/real-neighbours.json'));
glossaryData.realNeighbours = guardFile.words;      // the app loads the two files together (camera-client.js)
const phrasebook = JSON.parse(read('data/corpus/phrasebook.json')).entries;
const glossary = createGlossary(glossaryData);
const withPhrases = createGlossary(glossaryData, { phrasebook });
const normEn = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

test('camera: the word list agrees with the shared cases (the same file the offline test rig uses)', () => {
  const { cases } = JSON.parse(read('data/camera/glossary-cases.json'));
  assert.ok(cases.length >= 35);
  for (const c of cases) { const r = glossary.translate(c.he); assert.deepEqual([r.en, r.status], [c.en, c.status], c.he); }
  assert.equal(glossary.translate('חנות אופטיקה').translit, 'chanut optika');
  assert.deepEqual(tokens('קפה 12.50!'), ['קפה', '12.50']);
});

test('camera: word list data is well formed, never holds the name, and its dictionary-sourced entries still match the dictionary', () => {
  const keys = glossaryData.entries.map((e) => e.he);
  assert.equal(new Set(keys).size, keys.length); assert.ok(keys.length >= 159);
  const idx = JSON.parse(read('data/vocab/index.json')); const f = (n) => idx.fields.indexOf(n);
  const dict = new Set(idx.rows.map((r) => `${r[f('heUnpointed')]}|${r[f('he')]}|${r[f('translit')]}`));
  let sourced = 0;
  for (const e of glossaryData.entries) {
    assert.ok(e.he && e.en && e.pointed && e.translit, e.he);
    assert.ok(!containsSacredName(e.he) && !containsSacredName(e.pointed), 'the word list never holds the name');
    assert.match(e.en, /^[A-Z]/, `Title Case gloss: ${e.en}`);
    if (e.checked === 'app-dictionary') { sourced++; assert.ok(dict.has(`${e.he}|${e.pointed}|${e.translit}`), `${e.he}: pointing and Latin spelling must be the dictionary's`); }
  }
  assert.ok(sourced >= 50);
  const vocab = new Set(keys.flatMap((k) => k.split(' ')));
  for (const v of glossaryData.variants) assert.ok(vocab.has(v.of), `variant ${v.he} points at a listed word`);
  assert.ok(guardFile.words.length > 3000 && guardFile.words.includes('איפה') && guardFile.words.includes('מלון') === false, 'the guard list holds real words that are not listed');
  assert.match(guardFile.licence, /CC BY-SA 4\.0/); assert.ok(guardFile.frequencyListSha256, 'built with the frequency list, not from repo data alone');
  for (const w of guardFile.words) assert.ok(!vocab.has(w), `${w} is listed, so it cannot also be a guard word`);
  assert.ok(!('realNeighbours' in JSON.parse(read('data/camera/sign-glossary.json'))), 'share-alike words stay out of the project-owned word list file');
  assert.equal(read('data/camera/sign-glossary.json'), read('tools/camera-translate/camera_translate/sign-glossary.json'), 'offline test rig copy of the word list is out of date');
});

test('camera: bilingual lines, repeats, other forms and look-alike letters', () => {
  assert.deepEqual(hebrewTokens('Bus Stop / תחנת אוטובוס Bus Stop / תחנת אוטובוס'), ['תחנת', 'אוטובוס']);
  assert.deepEqual(hebrewTokens('פתוח 24 שעות Open 24 Hours'), ['פתוח', '24', 'שעות']);
  assert.deepEqual(hebrewTokens('OPEN 24 HOURS'), []); assert.deepEqual(hebrewTokens('קפה 12'), ['קפה', '12']);
  assert.ok(twoLookAlikes('ביבר', 'כיכר')); assert.ok(!twoLookAlikes('יהורות', 'זהירות')); assert.ok(!twoLookAlikes('ביכר', 'כיכר')); assert.ok(!twoLookAlikes('אב', 'אבג'));
  assert.equal(LOOK_ALIKE.length, 11);
  assert.equal(repairNumber('2ו'), '12'); assert.equal(repairNumber('05ו'), '150'); assert.equal(repairNumber('12'), null); assert.equal(repairNumber('סו'), null); assert.equal(repairNumber('2א'), null);
  assert.equal(repairNumber('סו', true), '10'); assert.equal(repairNumber('סוס', true), null); assert.equal(repairNumber('08ו001'), null);
  for (const [he, en, status] of [['חנויות אופטיקה', 'Optical Store', 'near'], ['ספריה', 'Library', 'full'], ['השירותים', 'Restrooms', 'full'], ['ביבר דיזנגוף', 'Dizengoff Square', 'near'],
    ['קפה 2ו', 'Coffee 12', 'near'], ['בית קפה', 'Coffee Shop', 'full'], ['מסעדה בשרה', 'Kosher Restaurant', 'near'], ['בשרה', null, 'none']]) {
    const r = glossary.translate(he); assert.deepEqual([r.en, r.status], [en, status], he);
  }
});

test('camera: reader noise, split lines and hidden letters', () => {
  for (const junk of ['6ז0ז5', '|08ו001', 'חוש6פג\\', ':2', '05', '(7', 'ווג\\₪']) assert.equal(isJunkToken(junk), true, junk);
  for (const word of ['חנות', '12', '18.50', '24', '2ו', 'קפה!', '+ית']) assert.equal(isJunkToken(word), false, word);
  assert.deepEqual(hebrewTokens('חנות אופטיקה 6ז0ז5 |08ו001'), ['חנות', 'אופטיקה']);
  assert.equal(lineHadNoise('חנות :21'), true); assert.equal(lineHadNoise('חנות אופטיקה'), false); assert.equal(lineHadNoise('יציאה / )+ואת'), false, 'what follows the slash is the other language');
  assert.equal(editDistance('ביתמקחת', 'ביתמרקחת'), 1); assert.equal(editDistance('', 'אב'), 2);
  assert.equal(hiddenLetterDistance('ביתמקחת', 'ביתמרקחת'), 1, 'one letter of the phrase hidden');
  assert.equal(hiddenLetterDistance('ברוייםהבאים', 'ברוכיםהבאים'), 1, 'a thin stroke read where a letter was hidden');
  assert.equal(hiddenLetterDistance('חנותפרחים', 'חנותספרים'), Infinity, 'a flower shop is not a bookshop: a full letter that is not in the phrase rules it out');
  assert.equal(hiddenLetterDistance('יציאה', 'יציאה'), 0);
  assert.equal(glossary.translate('חנות פרחים').en, null); assert.equal(glossary.translate('חנות דגים').en, 'Fish Store'); assert.equal(glossary.translate('אין חניה').en, 'No Parking');
  for (const [he, en, status] of [['כיכר דיזנגוף / 50816 806ת6לום', 'Dizengoff Square', 'full'], ['בית מ קחת', 'Pharmacy', 'near'], ['שדרות 1 יהודה', 'Ben Yehuda Boulevard', 'near'],
    ['אי כניסה', 'No Entry', 'near'], ['ברובים הגאים', 'Welcome', 'near'], ['תה סו', 'Tea 10', 'near'], ['קפה סוס', null, 'none'], ['מכונית', null, 'none'], ['מ גות', null, 'none']]) {
    const r = glossary.translate(he); assert.deepEqual([r.en, r.status], [en, status], he);
  }
  const regs = regionsFromBoxes([{ text: 'יציאה', x: 300, y: 10, w: 100, h: 40, conf: 95 }, { text: '/', x: 270, y: 10, w: 12, h: 40, conf: 90 }, { text: '%|א]', x: 150, y: 10, w: 100, h: 40, conf: 20 }], glossary);
  assert.deepEqual([regs[0].en, regs[0].he, regs[0].box], ['Exit', 'יציאה', { x: 300, y: 10, w: 100, h: 40 }], 'on a bilingual line only the Hebrew is boxed and replaced');
  assert.equal(regionsFromBoxes([{ text: 'חנות', x: 300, y: 10, w: 100, h: 40 }, { text: ':21', x: 200, y: 10, w: 50, h: 40 }], glossary)[0].partial, true);
});

test('camera: two readings of one photo are merged line by line, and the word list decides', () => {
  const line = (he, y, conf) => regionsFromBoxes([{ text: he, x: 100, y, w: 200, h: 40, conf }], glossary)[0];
  const first = [line('ביבך', 10, 80), line('יציאה', 100, 70), line('נעליים', 200, 60), line('סגור', 300, 90)];
  const second = [line('כיכר', 12, 60), line('יציאת', 98, 95), line('נעלייס', 204, 85)];
  const merged = mergeReadings(first, second);
  assert.deepEqual(merged.map((r) => r.en), ['Square', 'Exit', null, 'Closed']);
  assert.equal(merged[0].he, 'כיכר', 'a reading the list recognises beats one it does not, whatever the confidence');
  assert.equal(merged[1].he, 'יציאה', 'an exact match is not replaced by another reading');
  assert.equal(merged[2].he, 'נעלייס', 'when neither is recognised the more confident reading is kept');
  assert.equal(merged[3].he, 'סגור', 'a line only the first reading found is kept');
  assert.deepEqual(merged.map((r) => r.id), ['r1', 'r2', 'r3', 'r4']);
  assert.ok(LETTER_HEIGHT >= 30 && LETTER_HEIGHT <= 60 && READER_TARGET_SIDE === 1200);
});

test('camera: whole-phrase guessing stays rare on real text (5,000 random pairs of dictionary words)', () => {
  const idx = JSON.parse(read('data/vocab/index.json')); const k = idx.fields.indexOf('heUnpointed');
  const words = [...new Set(idx.rows.map((r) => r[k]).filter((w) => w && !w.includes(' ') && w.length >= 2))];
  let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  let guesses = 0;
  for (let i = 0; i < 5000; i++) { const r = glossary.translate(`${words[Math.floor(rnd() * words.length)]} ${words[Math.floor(rnd() * words.length)]}`); if (r.status === 'near') guesses++; }
  // Measured 2026-11-10 on 20,000 pairs: 5 guesses with the limit of a quarter of the letters rounded down; 53 when rounded up, which is why it is rounded down.
  assert.ok(guesses <= 3, `${guesses} of 5000 random real two-word lines were guessed as a listed phrase`);
});

test('camera: a real word is never "corrected" into a listed word (checked against every word in the app dictionary)', () => {
  for (const real of ['איפה', 'אזור', 'שכנה', 'דוור', 'פלפל', 'מהיר']) assert.equal(glossary.translate(real).en, null, real);
  assert.deepEqual([glossary.translate('אזור לעשן').en, glossary.translate('אזור לעשן').status], ['No Smoking', 'near'], 'unless the result is a listed phrase with the word beside it');
  const idx = JSON.parse(read('data/vocab/index.json')); const k = idx.fields.indexOf('heUnpointed');
  const corrected = [];
  for (const r of idx.rows) { const w = r[k]; if (!w || w.includes(' ')) continue; if (glossary.translate(w).status === 'near') corrected.push(w); }
  assert.deepEqual(corrected, [], 'run python3 tools/camera-translate/build_real_neighbours.py --download after editing the word list');
});

test('camera: the app phrasebook translates whole lines the word list cannot, and an exact phrase beats a guess', () => {
  const r = withPhrases.translate('תודה רבה');
  assert.deepEqual([r.en, r.status, r.from], ['Thank you very much', 'full', 'phrasebook']);
  assert.equal(withPhrases.translate('איפה התחנה').from, 'phrasebook');
  assert.equal(withPhrases.translate('יציאה').from, undefined, 'the sign list answers first');
  assert.equal(glossary.translate('תודה רבה').en, null);
  // With the phrasebook loaded (as the app always has it): listed sign words must still take part in whole-phrase matching,
  // and no phrasebook line may ever be turned into a guess.
  assert.deepEqual([withPhrases.translate('בית מ יקחת').en, withPhrases.translate('ברוי ים הבאים').en], ['Pharmacy', 'Welcome']);
  for (const e of phrasebook) assert.notEqual(withPhrases.translate(e.he).status, 'near', e.he);
  const regs = regionsFromBoxes([{ text: 'רבה', x: 10, y: 10, w: 60, h: 30 }, { text: 'תודה', x: 80, y: 10, w: 80, h: 30 }], withPhrases);
  assert.deepEqual([regs[0].en, regs[0].translationSource], ['Thank you very much', 'phrasebook']);
});

test('camera: review rows (text level): right answers do not fall, wrong answers stay rare, every source phrase translates', () => {
  // Measured 2026-11-10. First review file (cloud reader), 80 rows: 15 right and 12 wrong as reviewed; 39 right, 4 wrong now.
  // Second review file (on-device reader), 88 rows: 33 right and 2 wrong at first; 43 right, 1 wrong now.
  // Both were higher (45 and 50) before the guard list grew from 375 to 3,264 real words: readings that are themselves real
  // words (a neighbour for danger, a postman for post office) are no longer "corrected". That was a deliberate trade.
  for (const [file, n, minRight, maxWrong] of [['review-r1-fails.json', 80, 39, 4], ['review-r2-fails.json', 88, 43, 1]]) {
    const { items } = JSON.parse(read(`tools/camera-translate/tests/fixtures/${file}`));
    assert.equal(items.length, n);
    let ok = 0; let wrong = 0; let source = 0;
    for (const it of items) {
      if (normEn(glossary.translate(it.he).en) === normEn(it.en)) source++;
      const en = glossary.translate(it.ocr).en;
      if (normEn(en) === normEn(it.en)) ok++; else if (en) wrong++;
    }
    assert.equal(source, n, `${file}: every source phrase must translate when read correctly`);
    assert.ok(ok >= minRight, `${file}: only ${ok} right`); assert.ok(wrong <= maxWrong, `${file}: ${wrong} wrong`);
  }
});

test('camera: word boxes become right-to-left lines; a line with the name is held and its text is never returned', () => {
  const boxes = [{ text: 'אופטיקה', x: 100, y: 40, w: 180, h: 50 }, { text: 'חנות', x: 300, y: 42, w: 120, h: 48 },
    { text: 'OPEN', x: 100, y: 140, w: 120, h: 40 }, { text: NAME_SKELETON, x: 100, y: 240, w: 120, h: 40 }, { text: 'ברוך', x: 240, y: 240, w: 120, h: 40 },
    { text: 'נעליים', x: 100, y: 340, w: 120, h: 40 }];
  const regs = regionsFromBoxes(boxes, glossary);
  assert.equal(regs.length, 3);                                   // the Latin-only line is left alone
  assert.deepEqual([regs[0].he, regs[0].en, regs[0].translationSource], ['חנות אופטיקה', 'Optical Store', 'word-list']);
  assert.deepEqual(regs[0].box, { x: 100, y: 40, w: 320, h: 50 });
  assert.deepEqual([regs[1].held, regs[1].he, regs[1].en, regs[1].note], [true, null, null, HELD_NOTE]);
  assert.deepEqual([regs[2].he, regs[2].en, regs[2].translationSource], ['נעליים', null, null]);
  assert.ok(!JSON.stringify(regs).includes(NAME_SKELETON));
  assert.deepEqual(percentBox({ x: 100, y: 50, w: 200, h: 25 }, 400, 200), { left: '25%', top: '25%', width: '50%', height: '12.5%' });
  assert.match(sourceLabel('word-for-word'), /order and the exact meaning can be off/); assert.match(sourceLabel('word-list-near'), /check it/);
  assert.match(sourceLabel('phrasebook'), /phrasebook/); assert.equal(sourceLabel(null), ''); assert.equal(sourceLabel('machine'), '');
});

test('camera: word-by-word help uses the sign list, then the app dictionary, then labelled possibilities, and never guesses', () => {
  const dict = createDictionary({ fields: ['id', 'he', 'heUnpointed', 'en', 'pos', 'frequencyRank', 'translit'], rows: [
    ['a', 'סִפֵּר', 'ספר', 'to tell', 'verb', 10, 'siper'], ['b', 'סֵפֶר', 'ספר', 'book', 'noun', 50, 'sefer'], ['c', 'סַפָּר', 'ספר', 'barber', 'noun', 900, 'sapar'], ['d', 'סְפָר', 'ספר', 'frontier', 'noun', 2000, 'sefar'],
    ['e', 'שֶׁל', 'של', 'of', 'prep', 5, 'shel'], ['f', 'בֵּית סֵפֶר', 'בית ספר', 'school', 'phrase', 7, 'beit sefer']] });
  assert.equal(dict.size, 2);
  const bare = createGlossary({ entries: [{ he: 'מסעדה כשרה', en: 'Kosher Restaurant', pointed: 'מִסְעָדָה כְּשֵׁרָה', translit: "mis'ada kshera" }] });
  assert.deepEqual(dict.senses('ספר').map((x) => [x.en, x.pos]), [['book', 'noun'], ['barber', 'noun'], ['frontier', 'noun']]);
  const w = wordBreakdown('מסעדה כשרה 12 הספר של זזז', bare, dict);
  assert.deepEqual(w.map((x) => [x.word, x.kind]), [['מסעדה כשרה', 'sign-list'], ['12', 'number'], ['הספר', 'prefix'], ['של', 'dictionary'], ['זזז', 'unknown']]);
  assert.equal(w[0].senses[0].en, 'Kosher Restaurant');
  assert.deepEqual(w[2].prefix, { letter: 'ה', meaning: 'the' }); assert.equal(w[2].senses[0].en, 'book');
  assert.deepEqual(wordBreakdown(`ברוך ${NAME_SKELETON}`, bare, dict), [], 'a line with the name is not broken down');
  assert.deepEqual(Object.keys(PREFIX_MEANING), ['ה', 'ו', 'ב', 'ל', 'מ']);
  const d2 = createDictionary({ fields: ['he', 'heUnpointed', 'en', 'pos', 'frequencyRank', 'translit'], rows: [['תַּחֲנָה', 'תחנה', 'station', 'noun', 9, 'tachanah'], ['סֵפֶר', 'ספר', 'book', 'noun', 5, 'sefer'], ['חֲנוּת', 'חנות', 'shop', 'noun', 6, 'chanut']] });
  const none = createGlossary({ entries: [] });
  assert.deepEqual(wordBreakdown('תחנת ספרים בית', none, d2).map((x) => [x.kind, x.senses[0]?.en]), [['joined', 'station'], ['plural', 'book'], ['unknown', undefined]]);
  assert.equal(wordBreakdown('חנות', none, d2)[0].kind, 'dictionary');
  const real = createDictionary(JSON.parse(read('data/vocab/index.json')));
  assert.ok(real.size > 4000); assert.ok(real.senses('של').some((x) => x.translit === 'shel'));
});

test('camera: word-for-word English is drawn only when every word is found as written', () => {
  const dict = createDictionary({ fields: ['he', 'heUnpointed', 'en', 'pos', 'frequencyRank', 'translit'], rows: [
    ['מְחִיר', 'מחיר', "a (good or service's) price, cost", 'noun', 9, 'mechir'], ['חָדָשׁ', 'חדש', 'new, recently made; new', 'adj', 5, 'chadash'], ['סֵפֶר', 'ספר', 'book', 'noun', 5, 'sefer'],
    ['אָרֹךְ', 'ארוך', 'something with a very long and unhelpful explanation that cannot fit', 'adj', 5, 'arokh']] });
  const none = createGlossary({ entries: [] });
  assert.deepEqual(wordForWord('מחיר חדש 15', none, dict), { en: 'New Price 15', pointed: 'מְחִיר חָדָשׁ 15', translit: 'mechir chadash 15' }, 'noun then describing word: English order is swapped');
  assert.equal(wordForWord('חדש מחיר', none, dict).en, 'New Price', 'any other order is left as read');
  assert.equal(wordForWord('ספר גדול', glossary, dict).en, 'Big Book', 'a listed describing word after a dictionary noun is swapped too');
  const two = createDictionary({ fields: ['he', 'heUnpointed', 'en', 'pos', 'frequencyRank', 'translit'], rows: [['מֶלַח', 'מלח', 'salt', 'noun', 9, 'melach'], ['מַלָּח', 'מלח', 'sailor', 'noun', 50, 'malach'], ['דָּג', 'דג', 'fish', 'noun', 5, 'dag'], ['דָּג', 'דג', 'to fish', 'verb', 9, 'dag']] });
  assert.equal(wordForWord('מלח', none, two), null, 'salt or sailor: a spelling with two naming meanings is not drawn');
  assert.equal(wordForWord('דג', none, two).en, 'Fish', 'a verb reading does not make a noun ambiguous');
  assert.equal(wordForWord('מחיר ספרים', none, dict), null, 'a plural is only a possibility, so nothing is drawn');
  assert.equal(wordForWord('מחיר זזז', none, dict), null); assert.equal(wordForWord('12', none, dict), null); assert.equal(wordForWord('ארוך', none, dict), null);
  assert.equal(wordForWord(`מחיר ${NAME_SKELETON}`, none, dict), null);
  assert.equal(shortGloss('to tell (a story), to narrate'), 'Tell'); assert.equal(shortGloss('a bus (vehicle)'), 'Bus'); assert.equal(shortGloss('ice cream'), 'Ice Cream');
  assert.equal(shortGloss('(marks a definite direct object; not translated)'), null);
  const gram = createDictionary({ fields: ['he', 'heUnpointed', 'en', 'pos', 'frequencyRank', 'translit'], rows: [['הֲ', 'ה', 'interrogative particle', 'particle', 3, 'ha'], ['שֶׁל', 'של', 'of', 'prep', 5, 'shel']] });
  assert.equal(wordForWord('ה 12', none, gram), null); assert.equal(wordForWord('של', none, gram), null, 'grammar words are never drawn word for word'); assert.equal(shortGloss(''), null);
});

test('camera: a sign that is not in the word list (each entry hidden in turn) is rarely given a different meaning', async () => {
  const { leaveOneOut } = await import('../tools/camera-translate/leave-one-out.mjs');
  const r = leaveOneOut();
  // Measured 2026-11-10 over 152 entries: 47 the same English, 4 close, 22 different, 79 nothing drawn. "Different" is mostly a
  // near-synonym (Peril for Danger). Before the guard list grew and word-for-word was limited to single-meaning spellings:
  // 49 the same, 40 different, including Parking for Store, Window for Hotel and Calf for Market.
  assert.ok(r.total >= 150);
  assert.ok(r.different <= 24, `${r.different} hidden entries came back with different English`);
  assert.ok(r.same >= 44, `only ${r.same} hidden entries came back the same`);
  const got = Object.fromEntries(r.rows.map((x) => [x.he, x.got]));
  for (const [he, never] of [['חנות', 'Parking'], ['מלון', 'Window'], ['שוק', 'Calf'], ['חלב', 'Chelev'], ['פיצה', 'Pita'], ['מחיר', 'Tomorrow'], ['גן', 'Gene']]) assert.notEqual(got[he], never, `${he} must not become ${never}`);
});

test('camera: reading preparation makes letters dark on light and maps a levelled box back onto the photo', () => {
  const mk = (bg, fg) => { const w = 40, h = 20; const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const letter = y > 6 && y < 14 && x > 8 && x < 30 && x % 4 < 2; d.set(letter ? fg : bg, (y * w + x) * 4); } return { data: d, width: w, height: h }; };
  const blue = mk([20, 70, 150, 255], [255, 255, 255, 255]); const r1 = readerImage(blue, 'binary');
  assert.equal(r1.inverted, true); assert.equal(blue.data[0], 255); assert.equal(blue.data[(8 * 40 + 9) * 4], 0);      // background white, letters black
  const paper = mk([250, 246, 232, 255], [15, 15, 15, 255]); const r2 = readerImage(paper, 'binary');
  assert.equal(r2.inverted, false); assert.equal(paper.data[0], 255); assert.equal(paper.data[(8 * 40 + 9) * 4], 0);
  const grey = mk([20, 70, 150, 255], [255, 255, 255, 255]); readerImage(grey, 'grey'); assert.ok(grey.data[0] > 150 && grey.data[(8 * 40 + 9) * 4] < 10);
  const hist = new Uint32Array(256); hist[10] = 50; hist[240] = 50; const t = otsuThreshold(hist, 100); assert.ok(t >= 10 && t < 240);
  assert.deepEqual(boxOnOriginal({ x: 10, y: 20, w: 30, h: 10 }, 200, 100, 0), { x: 10, y: 20, w: 30, h: 10 });
  const centre = boxOnOriginal({ x: 85, y: 45, w: 30, h: 10 }, 200, 100, 4); assert.ok(Math.abs(centre.x - 85) < 0.01 && Math.abs(centre.y - 45) < 0.01, 'the middle of the picture does not move');
  const edge = boxOnOriginal({ x: 160, y: 45, w: 30, h: 10 }, 200, 100, 4); assert.ok(Math.abs(edge.y - 45) > 3 && Math.abs(edge.y - 45) < 8, 'a box far from the middle moves by about its distance times the tilt');
  assert.deepEqual([edge.w, edge.h], [30, 10]);
});

test('camera: English is sized to its box, wraps when long, and flush-right Hebrew becomes flush-left English', () => {
  const measure = (text, size) => text.length * size * 0.55;
  const one = fitText(measure, 'Exit', 300, 80);
  assert.ok(one.fits && one.lines.length === 1 && measure('Exit', one.size) <= 300 * 0.96 && one.size * 1.12 <= 80 * 1.3);
  const long = fitText(measure, 'Ben Yehuda Boulevard Pedestrian Mall', 260, 200);
  assert.ok(long.fits && long.lines.length >= 2);
  assert.ok(Math.max(...long.lines.map((l) => measure(l, long.size))) <= 260 * 0.96);
  assert.equal(fitText(measure, 'Ben Yehuda Boulevard', 30, 10).fits, false);
  assert.deepEqual(wrapWords(['a', 'b', 'c', 'd'], 2), ['a b', 'c d']);
  const menu = [{ id: 'a', box: { x: 300, y: 10, w: 200, h: 40 } }, { id: 'b', box: { x: 400, y: 70, w: 100, h: 40 } }, { id: 'c', box: { x: 50, y: 400, w: 100, h: 40 } }];
  assert.equal(groupBlocks(menu).length, 2);
  const place = chooseAlignment(menu, 600);
  assert.deepEqual(place.get('a'), { align: 'left', box: { x: 300, y: 10, w: 200, h: 40 } });
  assert.deepEqual(place.get('b'), { align: 'left', box: { x: 300, y: 70, w: 200, h: 40 } });
  assert.equal(place.get('c').align, 'center'); assert.ok(place.get('c').box.w > 100);
});

test('camera: sign colours are read from the picture (white letters on blue stay white on blue)', () => {
  const W = 120, H = 60; const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; const letter = y >= 20 && y < 40 && x >= 30 && x < 90 && x % 6 < 3;
    data.set(letter ? [255, 255, 255, 255] : [20, 70, 150, 255], i);
  }
  const c = boxColours(data, W, H, { x: 30, y: 20, w: 60, h: 20 });
  assert.deepEqual(c.bg, [20, 70, 150]); assert.deepEqual(c.fg, [255, 255, 255]);
  assert.ok(contrastRatio(c.fg, c.bg) > 4.5);
  assert.deepEqual(boxColours(new Uint8ClampedArray(W * H * 4).fill(240), W, H, { x: 30, y: 20, w: 60, h: 20 }).fg, [17, 17, 17]);
});

test('camera: no server. The code can only GET four of the app\'s own data files, stores nothing, and has no address to send to', async () => {
  const seen = [];
  const fake = async (url, init) => { seen.push({ url: String(url), init }); return { ok: true, json: async () => ({ entries: [], words: ['x'] }) }; };
  assert.deepEqual((await loadGlossaryData(fake)).realNeighbours, ['x']); await loadPhrasebook(fake); await loadDictionaryIndex(fake);
  await assert.rejects(loadGlossaryData(async (url) => ({ ok: !String(url).includes('real-neighbours'), json: async () => ({}) })), /word list missing/, 'no guard list, no guessing');
  assert.deepEqual(seen.map((s) => s.url.split('/data/')[1]), ['camera/sign-glossary.json', 'camera/real-neighbours.json', 'corpus/phrasebook.json', 'vocab/index.json']);
  assert.ok(seen.every((s) => s.init === undefined), 'plain GET requests with no body and no options');
  assert.deepEqual(await loadPhrasebook(async () => { throw new Error('offline'); }), []);
  assert.ok(!existsSync(new URL('../data/camera/config.json', import.meta.url)), 'there is no service address file');
  const files = readdirSync(new URL('../src/camera/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => `src/camera/${f}`);
  assert.deepEqual(files.sort(), ['src/camera/camera-client.js', 'src/camera/camera-model.js', 'src/camera/camera.view.js', 'src/camera/on-device.js']);
  for (const f of files) {
    const src = read(f); const code = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/method\s*:|XMLHttpRequest|sendBeacon|WebSocket|EventSource|navigator\.share|\.postMessage\(/.test(code), `${f}: nothing but plain fetches of own files`);
    assert.ok(!/https?:\/\//i.test(code), `${f}: no address of any kind in the code`);
    const calls = code.match(/fetch(?:Impl)?\(/g) || []; const own = code.match(/fetch(?:Impl)?\(new URL\('\.\.\/\.\.\/data\/[a-z/.-]+', import\.meta\.url\)\)/g) || [];
    assert.equal(calls.length, own.length, `${f}: every fetch must name one of the app's own data files and pass no options`);
    assert.ok(!/localStorage|sessionStorage|indexedDB|document\.cookie|caches\./.test(code), `${f}: photos and results are not stored`);
    assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function|<script/i.test(src), `${f}: no HTML strings or script injection`);
    assert.ok(!src.includes(NAME_SKELETON), `${f}: the name is never written out`);
  }
});

test('camera: route is registered, lazy, and kept out of the first-install precache', () => {
  const route = ROUTES.find((r) => r.name === 'camera');
  assert.deepEqual([route.pattern, route.module, route.title], ['/camera', '../camera/camera.view.js', 'Camera Translator']);
  assert.equal(matchRoute('#/camera').route.name, 'camera');
  for (const f of ['src/camera/camera.view.js', 'src/camera/camera-model.js', 'src/camera/camera-client.js', 'src/camera/on-device.js', 'data/camera/sign-glossary.json', 'data/camera/real-neighbours.json']) {
    assert.ok(existsSync(new URL(`../${f}`, import.meta.url)), f); assert.ok(isOnDemand(f), `${f} must be on demand`);
  }
  const m = computeManifest();
  assert.ok(!m.files.some((f) => /^(src|data)\/camera\//.test(f)));
  assert.ok(m.onDemand.includes('src/camera/camera.view.js'));
  for (const eager of ['src/app.js', 'src/shell/router.js', 'src/shell/home.view.js']) assert.ok(!/from '\.\.?\/.*camera/.test(read(eager)), `${eager} must not import the camera code up front`);
});

test('camera: screen wording, privacy page and the way in from Scan', async () => {
  const view = read('src/camera/camera.view.js');
  for (const s of ['Camera Translator', 'Take A Photo', 'Choose A Photo', 'Show The Original', 'Hear The Hebrew', 'Word By Word', 'ON_DEVICE_NOTICE', 'speechSafeText', "imageOrientation: 'from-image'"]) assert.ok(view.includes(s), s);
  assert.match(view, /nothing is sent anywhere/); assert.doesNotMatch(view, /Send Photo|translation service|Google/);
  const { FLOWS, LOCAL_ONLY } = await import('../src/shell/privacy.view.js');
  assert.ok(!FLOWS.some((f) => /camera/i.test(f.id)), 'the Camera Translator makes no request that carries anything of the learner\'s');
  assert.ok(LOCAL_ONLY.some((l) => /Camera Translator reads and translates your photo in your browser/.test(l) && /It has no server/.test(l)));
  assert.ok(read('src/photo/scan.view.js').includes("href: '#/camera'"));
});

test('camera: a reading that looks cut off is offered as a possibility and not drawn on the photo', () => {
  const box = (text, x) => ({ text, x, y: 10, w: 80, h: 40, conf: 90 });
  const one = (...b) => regionsFromBoxes(b, glossary)[0];
  // a kind-of-place word with a stray mark beside it: its companion was probably hidden
  let r = one(box('חנות', 300), box(':21', 200));
  assert.deepEqual([r.en, r.maybe, r.partial, r.translationSource], [null, 'Store', true, null]);
  // the same word alone and clean is a whole sign
  r = one(box('חנות', 300)); assert.deepEqual([r.en, r.maybe], ['Store', null]);
  // a kind-of-place word with only a number is missing its companion, unless it is a word that takes a number
  r = one(box('בית', 300), box('2', 200)); assert.deepEqual([r.en, r.maybe], [null, 'House 2']);
  r = one(box('שער', 300), box('2', 200)); assert.deepEqual([r.en, r.maybe], ['Gate 2', null]);
  // a stray mark beside a number: a digit may be hidden too ("24" read as "4")
  r = one(box('-]', 400), box('4', 300), box('שעות', 200)); assert.deepEqual([r.en, r.partial], [null, true]); assert.ok(r.maybe);
  // two listed words with a stray mark are still drawn, and marked as partly read
  r = one(box('חנות', 400), box('ספרים', 300), box(':2', 200)); assert.deepEqual([r.en, r.maybe, r.partial], ['Bookshop', null, true]);
  assert.equal(unsureOfLine({ en: 'Exit', status: 'full', wordCount: 1, numberCount: 0 }, false), false);
  assert.equal(unsureOfLine({ en: 'Exit', status: 'near', wordCount: 2, numberCount: 0 }, true), true);
  assert.equal(unsureOfLine(null, true), false);
});
