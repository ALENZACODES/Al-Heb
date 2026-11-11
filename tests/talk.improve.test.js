// Talk, 2026-11-11: short phrases ("very complex"), single words with more than one sense, tidy endings and capitals,
// lines of more than one sentence, "today" in a sentence frame, and the back-test tool.
// No language pack is loaded here: a stand-in pack answers, so these run in the plain unit run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../src/talk/data.js';
import { translateLine, SECOND_LABEL, SECOND_NOTE, FAST_PATH, LEFT_IN_ENGLISH, LEFT_IN_HEBREW, MODEL_NOTE_HE, MODEL_NOTE_EN } from '../src/talk/hybrid.js';
import { finishLine, matchEnding, sentenceCase } from '../src/talk/nmt/postedit.js';
import { sentences } from '../src/talk/nmt/sentences.js';
import { pairs, chrF } from '../tools/talk/nmt/backtest.mjs';

const engine = await loadEngine(); await engine.loadDictionary();
const packSaying = (map, calls = []) => ({ ready: () => true, translate: async (d, t) => { calls.push([d, t]); return map[t] ?? ''; } });

test('a short phrase with no stored line: without the pack the result names the pack; with it the phrase is translated', async () => {
  const bare = await translateLine(engine, null, 'very complex', { direction: 'en-he' });
  assert.equal(bare.ok, false); assert.equal(bare.needsPack, 'en-he', 'the screen offers the English to Hebrew pack');
  const r = await translateLine(engine, packSaying({ 'very complex': 'מורכב מאוד.' }), 'very complex', { direction: 'en-he' });
  assert.equal(r.ok, true); assert.equal(r.method, 'model');
  assert.equal(r.translation, 'מורכב מאוד', 'the full stop the pack added to a phrase typed without one is taken off');
  const back = await translateLine(engine, packSaying({ 'מסובך מאוד': 'Very Complicated' }), 'מסובך מאוד', { direction: 'he-en' });
  assert.equal(back.translation, 'Very complicated', 'headline capitals on a short phrase are put back to a plain phrase');
});

test('the ending follows the line as typed: only a lone added full stop is removed', () => {
  assert.equal(matchEnding('טוב מאוד.', 'very good'), 'טוב מאוד');
  assert.equal(matchEnding('טוב מאוד.', 'Very good.'), 'טוב מאוד.');
  assert.equal(matchEnding('מה שלומך?', 'how are you'), 'מה שלומך?', 'a question mark is kept');
  assert.equal(matchEnding('Hurry!', 'מהר'), 'Hurry!');
  assert.equal(matchEnding('Just...', 'פשוט'), 'Just...', 'three dots are not a full stop');
  assert.equal(matchEnding('', 'x'), '');
  assert.equal(matchEnding('כן.', 'yes!'), 'כן.', 'a line typed with a closing mark is left alone');
});

test('capitals: ordinary words go back to lower case, names keep theirs, sentences are not touched', () => {
  const common = (w) => ['very', 'complicated', 'new', 'book', 'old', 'town', 'am', 'big', 'house'].includes(w);
  assert.equal(sentenceCase('Very Complicated', 'מסובך מאוד', common), 'Very complicated');
  assert.equal(sentenceCase('New Book', 'ספר חדש', common), 'New book');
  assert.equal(sentenceCase('Tel Aviv', 'תל אביב', common), 'Tel Aviv', 'a word the list does not know is a name');
  assert.equal(sentenceCase('Shabbat Shalom', 'שבת שלום', common), 'Shabbat Shalom');
  assert.equal(sentenceCase('I Am Tom', 'אני תום', common), 'I am Tom');
  assert.equal(sentenceCase('The big house', 'הבית הגדול', common), 'The big house', 'already a plain phrase');
  assert.equal(sentenceCase('Big House.', 'בית גדול.', common), 'Big House.', 'a line typed with a closing mark is left alone');
  assert.equal(sentenceCase('Very Complicated', 'מסובך מאוד', null), 'Very Complicated', 'no word list, no change');
  assert.equal(finishLine('- very complicated', 'מסובך מאוד', 'he-en', { commonEnglish: common }), 'Very complicated');
});

test('the dictionary tells an ordinary English word from a name', () => {
  for (const w of ['very', 'book', 'house', 'good', 'water']) assert.equal(engine.knowsEnglish(w), true, w);
  for (const w of ['aviv', 'shalom', 'hashanah', 'tom', 'zzzz', '']) assert.equal(engine.knowsEnglish(w), false, w);
});

test('one dictionary word: with the pack on the device its different word is shown as a second choice', async () => {
  const first = await translateLine(engine, null, 'complex', { direction: 'en-he' });
  assert.equal(first.method, 'word'); assert.equal(first.needsPack, undefined, 'a dictionary word never asks for a download');
  const calls = [];
  const r = await translateLine(engine, packSaying({ complex: 'מורכב.' }, calls), 'complex', { direction: 'en-he' });
  assert.equal(r.method, 'word'); assert.equal(r.translation, first.translation, 'the dictionary word stays first');
  assert.deepEqual(r.variants.at(-1), { label: SECOND_LABEL, text: 'מורכב' });
  assert.match(r.note, new RegExp(SECOND_NOTE.replace(/[.]/g, '\\.')));
  assert.equal(calls.length, 1);
  // the pack agrees (vowel points and a full stop set aside): nothing is added
  const same = await translateLine(engine, packSaying({ complex: first.translation + '.' }), 'complex', { direction: 'en-he' });
  assert.equal((same.variants || []).some((v) => v.label === SECOND_LABEL), false);
  assert.equal(same.note, first.note);
  // the pack fails or says nothing: the dictionary answer stands
  const broken = await translateLine(engine, { ready: () => true, translate: async () => { throw new Error('x'); } }, 'complex', { direction: 'en-he' });
  assert.equal(broken.translation, first.translation); assert.equal((broken.variants || []).length, (first.variants || []).length);
  const silent = await translateLine(engine, packSaying({}), 'complex', { direction: 'en-he' });
  assert.equal((silent.variants || []).some((v) => v.label === SECOND_LABEL), false);
});

test('a stored line is still never sent to the pack', async () => {
  const calls = [];
  const r = await translateLine(engine, packSaying({}, calls), 'Where is the hotel?', { direction: 'en-he' });
  assert.ok(FAST_PATH.has(r.method)); assert.equal(calls.length, 0);
});

test('back test: the sentence list is fixed by its seed, has no repeats, and is made of short one-script lines', () => {
  const a = pairs({ seed: 7 }), b = pairs({ seed: 7 }), c = pairs({ seed: 8 });
  assert.ok(a.length >= 4000, `${a.length} pairs`);
  assert.deepEqual(a.slice(0, 50), b.slice(0, 50), 'the same seed picks the same sentences');
  assert.notDeepEqual(a.slice(0, 50).map((p) => p.id), c.slice(0, 50).map((p) => p.id));
  assert.equal(new Set(a.map((p) => p.he + '|' + p.en)).size, a.length);
  for (const p of a.slice(0, 500)) { assert.doesNotMatch(p.he, /[a-zA-Z]/); assert.doesNotMatch(p.en, /[֐-׿]/); assert.ok(p.en.split(/\s+/).length <= 14); }
  const short = pairs({ short: true });
  assert.ok(short.length > 100 && short.every((p) => p.en.split(/\s+/).length <= 3));
});

test('back test: the letters score is 1 for the same words, 0 for nothing, and gives part marks for a close wording', () => {
  assert.equal(chrF('שלום עולם', 'שלום עולם'), 1);
  assert.equal(chrF('Very good.', 'very good'), 1, 'case and punctuation are set aside');
  assert.equal(chrF('', 'x'), 0);
  const close = chrF('He is very tired', 'He is tired'), far = chrF('The dog ran away', 'He is tired');
  assert.ok(close > 0.4 && close < 1, String(close)); assert.ok(far < 0.25 && far < close, String(far));
});

test('a lone dictionary word carries its vowel marks, so the screen can show the unambiguous spelling', () => {
  const r = engine.translate('vinegar', { direction: 'en-he' });
  assert.equal(r.method, 'word'); assert.equal(r.pointed, 'חֹמֶץ');
  assert.equal(engine.translate('the vinegar', { direction: 'en-he' }).pointed, undefined, 'only the lone word, as it stands in the dictionary');
});

test('a sentence frame filled from the dictionary does not double the article', () => {
  const r = engine.translate('אני רוצה לקנות ספה', { direction: 'he-en' });
  assert.equal(r.translation, 'I want to buy a sofa');
  assert.doesNotMatch(engine.translate('יש לי מיגרנה', { direction: 'he-en' }).translation, /\ban a\b/);
});

test('with the pack on the device a frame filled from the dictionary goes to the pack; a frame from the checked table does not', async () => {
  const calls = [];
  const pack = packSaying({ 'אני רוצה רום.': 'I want rum.' }, calls);
  const low = engine.translate('אני רוצה רום.', { direction: 'he-en' });
  assert.equal(low.method, 'pattern'); assert.equal(low.confidence, 'low');
  const r = await translateLine(engine, pack, 'אני רוצה רום.', { direction: 'he-en' });
  assert.equal(r.method, 'model'); assert.equal(r.translation, 'I want rum.');
  const kept = await translateLine(engine, null, 'אני רוצה רום.', { direction: 'he-en' });
  assert.equal(kept.method, 'pattern'); assert.equal(kept.needsPack, 'he-en', 'without the pack the frame answer stands and the pack is offered');
  const table = await translateLine(engine, pack, 'איפה המעלית?', { direction: 'he-en' });
  assert.equal(table.method, 'pattern'); assert.equal(calls.length, 1, 'the checked frame never went to the pack');
});

test('a line is cut into sentences only where that is safe', () => {
  const cut = (t) => sentences(t);
  assert.deepEqual(cut('very complex'), ['very complex']);
  assert.deepEqual(cut("Don't cry. Everything will be OK."), ["Don't cry.", 'Everything will be OK.']);
  assert.deepEqual(cut('אל תבכה. הכל יהיה בסדר.'), ['אל תבכה.', 'הכל יהיה בסדר.']);
  assert.deepEqual(cut('שלום! אני חדש כאן.'), ['שלום!', 'אני חדש כאן.']);
  assert.deepEqual(cut('מה שלומך? טוב, תודה. ואתה?'), ['מה שלומך?', 'טוב, תודה.', 'ואתה?'], 'a comma does not cut');
  assert.deepEqual(cut("I can't stop. The brakes..."), ["I can't stop.", 'The brakes...']);
  assert.deepEqual(cut('Yes!!! Really?! OK.'), ['Yes!!!', 'Really?!', 'OK.']);
  assert.deepEqual(cut('"How are you?" "I am fine, thank you."'), ['"How are you?"', '"I am fine, thank you."'], 'a closing quote stays with its sentence');
  assert.deepEqual(cut('No. I do not want it.'), ['No.', 'I do not want it.']);
  // not the end of a sentence
  assert.deepEqual(cut('I met Dr. Cohen. He is nice.'), ['I met Dr. Cohen.', 'He is nice.']);
  assert.deepEqual(cut('Take bus No. 5. It stops here.'), ['Take bus No. 5.', 'It stops here.']);
  assert.deepEqual(cut('The U.S. Army is big. I saw it.'), ['The U.S. Army is big.', 'I saw it.']);
  assert.deepEqual(cut('J. K. Rowling wrote it. I read it.'), ['J. K. Rowling wrote it.', 'I read it.']);
  assert.deepEqual(cut('It costs 3.50 shekels. Is that OK?'), ['It costs 3.50 shekels.', 'Is that OK?']);
  assert.deepEqual(cut('ת.ד. 12 ירושלים. תודה.'), ['ת.ד. 12 ירושלים.', 'תודה.']);
  assert.deepEqual(cut('Wait... what is it?'), ['Wait... what is it?'], 'the next part does not start like a sentence');
  assert.deepEqual(cut("The bus leaves at 5 p.m. Don't be late."), ["The bus leaves at 5 p.m. Don't be late."], 'when in doubt the line is left whole');
  assert.deepEqual(cut('1. Bread'), ['1. Bread'], 'a list number');
  assert.deepEqual(cut('  Hi.  '), ['Hi.']);
  assert.deepEqual(cut(''), []);
  assert.deepEqual(cut(null), []);
  // nothing is lost or changed: the parts put back together are the line
  for (const line of ["Don't cry. Everything will be OK.", 'מה שלומך? טוב, תודה. ואתה?', '"How are you?" "I am fine, thank you."', 'Yes!!! Really?! OK.']) assert.equal(cut(line).join(' '), line);
});

test('the pack gets a line of two sentences one sentence at a time, and no sentence is lost', async () => {
  const calls = [];
  // a stand-in that behaves as the pack did in the back test: given both sentences at once it answers with the second only
  const pack = packSaying({ 'אל תבכה. הכל יהיה בסדר.': "Everything's gonna be okay.", 'אל תבכה.': "Don't cry.", 'הכל יהיה בסדר.': "Everything's gonna be okay." }, calls);
  const r = await translateLine(engine, pack, 'אל תבכה. הכל יהיה בסדר.', { direction: 'he-en' });
  assert.equal(r.method, 'model');
  assert.equal(r.translation, "Don't cry. Everything's gonna be okay.");
  assert.deepEqual(calls.map((c) => c[1]), ['אל תבכה.', 'הכל יהיה בסדר.'], 'asked sentence by sentence, in order');
  assert.equal(r.note, MODEL_NOTE_EN);
});

test('a line of one sentence goes to the pack whole, as before', async () => {
  const calls = [];
  const r = await translateLine(engine, packSaying({ 'The spoon goes to the right of the knife.': 'הכף מימין לסכין.' }, calls), 'The spoon goes to the right of the knife.', { direction: 'en-he' });
  assert.equal(r.translation, 'הכף מימין לסכין.');
  assert.deepEqual(calls, [['en-he', 'The spoon goes to the right of the knife.']]);
  assert.equal(r.note, MODEL_NOTE_HE);
});

test('inside a longer line a sentence the stored lines hold comes from them, with its closing mark; the pack does the rest', async () => {
  const calls = [];
  const stored = engine.translate('Thank you.', { direction: 'en-he' });
  assert.equal(stored.method, 'phrase', 'a stored line');
  const pack = packSaying({ 'My suitcase has a broken wheel.': 'למזוודה שלי יש גלגל שבור.' }, calls);
  const r = await translateLine(engine, pack, 'Thank you. My suitcase has a broken wheel.', { direction: 'en-he' });
  assert.equal(r.method, 'model');
  assert.equal(r.translation, `${stored.translation}. למזוודה שלי יש גלגל שבור.`);
  assert.deepEqual(calls.map((c) => c[1]), ['My suitcase has a broken wheel.'], 'the stored sentence never went to the pack');
  // a question keeps its mark
  const q = await translateLine(engine, packSaying({ 'My suitcase has a broken wheel.': 'למזוודה שלי יש גלגל שבור.' }), 'My suitcase has a broken wheel. Where is the hotel?', { direction: 'en-he' });
  assert.match(q.translation, /^למזוודה שלי יש גלגל שבור\. .+\?$/);
});

test('if the pack has no answer for one of the sentences the line is tried whole', async () => {
  const calls = [];
  const pack = packSaying({ 'Zzz qqq. Xxx www.': 'תשובה אחת.', 'Zzz qqq.': '', 'Xxx www.': 'משהו.' }, calls);
  const r = await translateLine(engine, pack, 'Zzz qqq. Xxx www.', { direction: 'en-he' });
  assert.equal(r.translation, 'תשובה אחת.');
  assert.deepEqual(calls.map((c) => c[1]), ['Zzz qqq.', 'Zzz qqq. Xxx www.']);
});

test('a word the pack copied across untranslated is pointed out', async () => {
  const r = await translateLine(engine, packSaying({ 'It looks like a slam dunk.': 'זה נראה כמו טריקה dunk.' }), 'It looks like a slam dunk.', { direction: 'en-he' });
  assert.equal(r.note, `${LEFT_IN_ENGLISH} ${MODEL_NOTE_HE}`);
  const back = await translateLine(engine, packSaying({ 'הוא אכל גפילטע פיש מוזר.': 'He ate weird גפילטע fish.' }), 'הוא אכל גפילטע פיש מוזר.', { direction: 'he-en' });
  assert.equal(back.note, `${LEFT_IN_HEBREW} ${MODEL_NOTE_EN}`);
  const clean = await translateLine(engine, packSaying({ 'It looks easy to me.': 'זה נראה לי קל.' }), 'It looks easy to me.', { direction: 'en-he' });
  assert.equal(clean.note, MODEL_NOTE_HE);
  for (const text of [LEFT_IN_ENGLISH, LEFT_IN_HEBREW]) assert.doesNotMatch(text, /\b(model|machine|AI|neural|algorithm)\b/i);
});

test('"today" and "tomorrow" in a sentence frame are when-words, not things', () => {
  const he = (t) => engine.translate(t, { direction: 'he-en' });
  assert.equal(he('אני רוצה לאכול היום בחוץ.').translation, 'I want to eat outside today', 'was "I want to eat the day outside"');
  assert.equal(he('אני רוצה לאכול בחוץ היום').translation, 'I want to eat outside today');
  assert.equal(he('אני רוצה לאכול מחר בחוץ').translation, 'I want to eat outside tomorrow', 'was "I want to eat a tomorrow outside"');
  assert.equal(he('אני רוצה לאכול היום').translation, 'I want to eat today');
  assert.equal(he('אני רוצה לשלם עכשיו').translation, 'I want to pay now');
  for (const line of ['אני רוצה היום', 'אני צריך היום', 'איפה היום?']) {
    const r = he(line);
    assert.ok(!(r.ok && FAST_PATH.has(r.method)), `${line}: no frame answer`);
    if (r.ok) assert.doesNotMatch(r.translation, /the day/);
  }
  // stored lines with "today" are untouched
  assert.equal(he('איזה יום היום?').translation, 'What day is it today?');
  assert.equal(he('היום').translation, 'Today');
  const en = (t) => engine.translate(t, { direction: 'en-he' });
  assert.equal(en('I want to eat outside today').translation, 'אני רוצה לאכול בחוץ היום');
  assert.equal(en('I want to eat here now').translation, 'אני רוצה לאכול כאן עכשיו');
  assert.equal(en('I want to eat today').translation, 'אני רוצה לאכול היום');
});
