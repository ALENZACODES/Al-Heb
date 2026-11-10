import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCorpus, letterInventory } from '../src/corpus/corpus.js';
import { BASE_LETTER_IDS, FINAL_LETTER_IDS } from '../src/corpus/normalize.js';

const corpus = await loadCorpus();
const priestly = ['bless-priestly-1', 'bless-priestly-2', 'bless-priestly-3'].map((i) => corpus.getText(i).he).join('\n');

test('Priestly Blessing inventory reproduces the research: 15 words, 60 letters, 13 base letters', () => {
  const inv = letterInventory(priestly);
  assert.equal(inv.words, 15);
  assert.equal(inv.letterCount, 60);
  assert.deepEqual(inv.distinctBaseLetters, ['alef', 'bet', 'he', 'vav', 'chet', 'yod', 'kaf', 'lamed', 'mem', 'nun', 'pe', 'resh', 'shin']);
  assert.equal(inv.distinctBaseLetters.length, 13);
  assert.deepEqual(inv.missingBaseLetters, ['gimel', 'dalet', 'zayin', 'tet', 'samekh', 'ayin', 'tsadi', 'qof', 'tav']);
  assert.deepEqual(inv.finalsPresent, ['kaf-final', 'mem-final']);
  assert.equal(inv.letters['kaf-final'], 6, 'research: final kaf 6x');
});

test('Priestly Blessing: final mem occurs TWICE (shalom and v\'yasem); the research notes said 1x', () => {
  // Mismatch with the research note (which listed only shalom). The data says two: וְיָשֵׂם and שָׁלוֹם.
  assert.equal(letterInventory(priestly).letters['mem-final'], 2);
});

test('Priestly Blessing: 7 vowel signs with the research counts; no patach/shuruk/chataf', () => {
  const inv = letterInventory(priestly);
  assert.deepEqual(inv.distinctVowels.sort(), ['cholam', 'chirik', 'kamatz', 'kubutz', 'segol', 'shva', 'tzere'].sort());
  assert.equal(inv.distinctVowels.length, 7);
  assert.deepEqual(inv.vowels, { kamatz: 18, shva: 10, segol: 5, tzere: 4, chirik: 3, cholam: 1, kubutz: 1 });
  assert.equal(inv.marks.dagesh, 5);
  assert.equal(inv.marks['shin-dot'], 2);
  assert.equal(inv.marks['sin-dot'], 2);
  for (const absent of ['patach', 'shuruk', 'chataf-patach', 'chataf-segol', 'chataf-kamatz']) assert.ok(!inv.vowels[absent], absent);
});

test('Shema (Deut 6:4) inventory reproduces the research: 6 words, 25 letters, 12 letters, 9 vowel signs incl. shuruk and chataf-segol', () => {
  const inv = letterInventory(corpus.getText('shema-1').he);
  assert.equal(inv.words, 6);
  assert.equal(inv.letterCount, 25);
  assert.equal(inv.distinctBaseLetters.length, 12);
  assert.deepEqual(inv.finalsPresent, []);
  assert.deepEqual(inv.vowels, { kamatz: 4, shva: 4, tzere: 2, patach: 1, chirik: 1, segol: 1, cholam: 1, shuruk: 1, 'chataf-segol': 1 });
  assert.equal(inv.distinctVowels.length, 9);
  assert.equal(inv.marks['shin-dot'], 1);
  assert.equal(inv.marks['sin-dot'], 1);
});

test('Shema + V\'ahavta opening (Deut 6:4-5): 16 words, 64 letters, 16 letters, 1 final kaf (research)', () => {
  const inv = letterInventory(corpus.getText('shema-1').he + ' ' + corpus.getText('vahavta-1').he);
  assert.equal(inv.words, 16, 'research counts a maqaf as a word break');
  assert.equal(inv.tokens, 13, 'reading tokens keep maqaf-joined pairs together: 3 pairs fewer');
  assert.equal(inv.letterCount, 64);
  assert.equal(inv.distinctBaseLetters.length, 16);
});

test('Other research counts: Num 12:13b (5 words, 11 letters, 6 distinct), Mah Tovu (6 words, 26 letters, 15 distinct), Mi Chamocha (12 words, 42 letters, 16 distinct)', () => {
  const a = letterInventory(corpus.getText('num-12-13').he);
  assert.deepEqual([a.words, a.letterCount, a.distinctBaseLetters.length], [5, 11, 6]);
  const b = letterInventory(corpus.getText('mah-tovu-1').he);
  assert.deepEqual([b.words, b.letterCount, b.distinctBaseLetters.length], [6, 26, 15]);
  assert.equal(b.tokens, 5);
  const c = letterInventory(corpus.getText('mi-chamocha-1').he);
  assert.deepEqual([c.words, c.letterCount, c.distinctBaseLetters.length], [12, 42, 16]);
});

test('letterInventory unit cases: shuruk vs dagesh, qamats-qatan, ids are the shared ones, accents ignored', () => {
  const inv = letterInventory('הוּא כָּ חׇכְמָה שׁ שׂ');
  assert.equal(inv.vowels.shuruk, 1);
  assert.equal(inv.marks.dagesh, 1, 'the kaf dagesh counts, the shuruk dot does not');
  assert.ok(inv.vowels.kamatz >= 3, 'qamats-qatan U+05C7 counts as kamatz');
  assert.equal(letterInventory('בָּרֽוּךְ֑').letters['kaf-final'], 1);
  for (const id of Object.keys(inv.letters)) assert.ok([...BASE_LETTER_IDS, ...FINAL_LETTER_IDS].includes(id), id);
  assert.equal(BASE_LETTER_IDS.length + FINAL_LETTER_IDS.length, 27);
});
