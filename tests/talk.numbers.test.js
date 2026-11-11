// Talk: the numbers typed in a line come out of the translation unchanged (src/talk/nmt/numbers.js, src/talk/hybrid.js).
// Every "pack answer" below is one the shipped language pack really gave for that line on 2026-11-11.
// No language pack is loaded here: a stand-in pack answers, so these run in the plain unit run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadEngine } from '../src/talk/data.js';
import { translateLine, CHECK_NUMBERS, MODEL_NOTE_HE, MODEL_NOTE_EN } from '../src/talk/hybrid.js';
import { numbersIn, plainMoney, keepShekels, keepUnits, unitsChanged, settleNumbers, maskNumbers, unmaskNumbers, hasWord } from '../src/talk/nmt/numbers.js';
import { lines, judge, shekelsKept, strayColon, FRAMES } from '../tools/talk/nmt/numbers-test.mjs';

const engine = await loadEngine(); await engine.loadDictionary();
const packSaying = (map, calls = []) => ({ ready: () => true, translate: async (d, t) => { calls.push(t); return map[t] ?? ''; } });
/** How a number is written as a word, from the stored number table: what the screen path gives the check. */
const wordsFor = (n) => { const w = engine.numberWords(n); return [...w.en, ...w.he]; };

test('a number is read as typed: digits with the marks between them', () => {
  assert.deepEqual(numbersIn('Call 054-123-4567 at 20:30, it costs 1,250.50 on 12/05/2027. Room 417').map((t) => t.text), ['054-123-4567', '20:30', '1,250.50', '12/05/2027', '417']);
  assert.deepEqual(numbersIn('ב-5:30 ל-6 אנשים.').map((t) => t.text), ['5:30', '6'], 'the hyphen of a Hebrew prefix and the full stop are not part of the number');
  assert.deepEqual(numbersIn('Flight LY315, gate B7').map((t) => t.key), ['315', '7']);
  assert.deepEqual(numbersIn('no numbers here'), []);
});

test('a changed number is put back when it is clear which one it was', () => {
  const fixed = (answer, line, want) => assert.deepEqual(settleNumbers(answer, line), { text: want, state: 'fixed' });
  fixed('מספר הטלפון שלי הוא 054-113-4567.', 'My phone number is 054-123-4567.', 'מספר הטלפון שלי הוא 054-123-4567.');
  fixed('My phone number is 054-23-4567.', 'מספר הטלפון שלי הוא 054-123-4567.', 'My phone number is 054-123-4567.');
  fixed('My phone number is 20-451-0704.', 'מספר הטלפון שלי הוא 02-451-0704.', 'My phone number is 02-451-0704.');
  fixed('שילמתי 9.50 דולר על הכרטיסים.', 'I paid $99.50 for the tickets.', 'שילמתי 99.50 דולר על הכרטיסים.');
  fixed('We arrive at 9:15 and leave at 6:40.', 'אנחנו מגיעים ב-9:15 ועוזבים ב-18:40.', 'We arrive at 9:15 and leave at 18:40.');
  fixed('We arrive at 5:15 and leave at 10:35.', 'אנחנו מגיעים ב-17:15 ועוזבים ב-22:35.', 'We arrive at 17:15 and leave at 22:35.');
  fixed('אנחנו מגיעים בשעה 9: 15 ולעזוב בשעה 18: 40.', 'We arrive at 9:15 and leave at 18:40.', 'אנחנו מגיעים בשעה 9:15 ולעזוב בשעה 18:40.');
  fixed('The flight is on 5/12/2027.', 'הטיסה ב-12/05/2027.', 'The flight is on 12/05/2027.');
  fixed("That's 1,850 shekels a month.", 'זה עולה 181.50 שקלים בחודש.', "That's 181.50 shekels a month.");
  fixed('from 10:00 to 10:00', 'מ-10:00 עד 22:00', 'from 10:00 to 22:00');
});

test('what is right is left alone', () => {
  const same = (answer, line) => assert.deepEqual(settleNumbers(answer, line, { wordsFor }), { text: answer, state: 'same' });
  same('מספר החדר שלי הוא 417.', 'My room number is 417.');
  same('יש שבעה ימים בשבוע.', 'There are 7 days in a week.');                       // a small number written as a word
  same('תן לי 3 קילו עגבניות ושני קילו של מלפפונים.', 'Give me 3 kilos of tomatoes and 2 kilos of cucumbers.');
  same('יש 24 שעות ביום.', 'There are twenty-four hours in a day.');               // a word written as a number
  same('It is half past eight: 8:30.', 'עכשיו שמונה וחצי.');                        // no number typed: nothing to compare

  same('I need 2 tickets for 20 people', 'I need 2 tickets for twenty people');
  // a clock time said the other way round, with the half of the day said: the same time
  same("The meeting's at 9:45 p.m.", 'הפגישה בשעה 21:45.');
  same('We leave at 6:40 PM.', 'אנחנו עוזבים ב-18:40.');
  same('הפגישה ב-9:45 בערב.', 'The meeting is at 21:45.');
  same('הפגישה ב-21:45.', 'The meeting is at 9:45 p.m.');
  same('at 12:30 p.m.', 'ב-12:30');
});

test('a number with the right digits is written the way it was typed', () => {
  const fixed = (answer, line, want) => assert.deepEqual(settleNumbers(answer, line, { wordsFor }), { text: want, state: 'fixed' });
  fixed('זה עולה 8.386.', 'It costs 8,386 shekels.', 'זה עולה 8,386.');                                  // a thousand turned into a fraction
  fixed('It is 1250 shekels', 'זה 1,250 שקלים', 'It is 1,250 shekels');
  fixed('הוא נולד ב-13: 06.2028 והיא נולדה בשנת 2019.', 'He was born on 13.06.2028 and she was born in 2019.', 'הוא נולד ב-13.06.2028 והיא נולדה בשנת 2019.');
  fixed('הסיסמה היא 44719920.', 'The password is 4471 9920.', 'הסיסמה היא 4471 9920.');
  fixed('The flight is on 12.05.2027.', 'הטיסה ב-12/05/2027.', 'The flight is on 12/05/2027.');
  fixed('Call 0541234567 at 9: 15.', 'התקשרו ל-054-123-4567 ב-9:15.', 'Call 054-123-4567 at 9:15.');
  // with another number put back in the same line
  fixed('From 10:00 to 10:00, 1250 shekels.', 'מ-10:00 עד 22:00, 1,250 שקלים.', 'From 10:00 to 22:00, 1,250 shekels.');
  // pieces with a word between them are not one number
  assert.deepEqual(settleNumbers('Room 44 and 71.', 'חדר 4471.', { wordsFor }), { text: 'Room 44 and 71.', state: 'unsure' }, 'two numbers where one was typed');
  assert.deepEqual(settleNumbers('חדר 4471.', 'Room 44 and 71.', { wordsFor }), { text: 'חדר 4471.', state: 'unsure' }, 'one number where two were typed with a word between');
});

test('a twelve-hour time with no "p.m." is not the time that was typed', () => {
  assert.deepEqual(settleNumbers("The meeting's at 9:45.", 'הפגישה בשעה 21:45.'), { text: "The meeting's at 21:45.", state: 'fixed' });
  assert.deepEqual(settleNumbers('הפגישה ב-21:45.', 'The meeting is at 9:45.'), { text: 'הפגישה ב-9:45.', state: 'fixed' }, 'the pack may not move a time to the evening by itself');
});

test('numbers that cannot be matched are reported, not guessed, and the answer goes back as the pack wrote it', () => {
  assert.deepEqual(settleNumbers('nothing here', 'חדר 417'), { text: 'nothing here', state: 'unsure' }, 'a long number is gone');
  assert.equal(settleNumbers('Room 417 and 9031', 'חדר 417').state, 'unsure', 'a long number that was never typed');
  assert.equal(settleNumbers('', 'חדר 417').state, 'unsure');
  // a number that is nothing like the one typed is not "put back": 6 is not a bad copy of 196
  assert.deepEqual(settleNumbers("I'm 6 tall.", 'הגובה שלי 196.'), { text: "I'm 6 tall.", state: 'unsure' });
  assert.deepEqual(settleNumbers('I weigh 185.', 'אני שוקל 81.'), { text: 'I weigh 185.', state: 'unsure' });
  // one put back would leave another missing: nothing is changed
  assert.deepEqual(settleNumbers('Call 054-113-4567.', 'התקשרו ל-054-123-4567 ובקשו את חדר 417.'), { text: 'Call 054-113-4567.', state: 'unsure' });
});

test('units of measure: a change of family is reported and the numbers are left alone', () => {
  assert.equal(unitsChanged('אני שוקל 81 קילו.', 'I weigh 81 pounds.'), true);
  assert.equal(unitsChanged('אני שוקל 81 קילו.', 'I weigh 81 kilos.'), false);
  assert.equal(unitsChanged('זה 417 קילומטר מכאן.', "It's 417 miles from here."), true);
  assert.equal(unitsChanged('It is 5 miles from here.', 'זה 5 קילומטרים מכאן.'), true);
  assert.equal(unitsChanged('הגובה שלי 196 סנטימטר.', 'I\'m 6\'2".'), true, 'feet and inches');
  assert.equal(unitsChanged('הגובה שלי 196.', 'I\'m 6\'2".'), true, 'feet and inches the line never had, even with no unit typed');
  assert.equal(unitsChanged('I am 6 feet tall.', 'אני בגובה 2 מטר.'), true);
  // everyday words that are not units here
  assert.equal(unitsChanged('הלכתי 3 קילומטרים', 'I walked 3 kilometers on foot'), false);
  assert.equal(unitsChanged('הלכתי 3 קילומטרים', 'I walked 3 kilometers and my feet hurt'), false);
  assert.equal(unitsChanged('המטרה שלי היא 100 נקודות', 'My goal is 100 points'), false, 'מטרה is not מטר');
  assert.equal(unitsChanged('My feet hurt after 5 km', 'הרגליים שלי כואבות אחרי 5 ק"מ'), false);
  // the check itself: a typed number is never put beside another unit
  assert.deepEqual(settleNumbers('I weigh 185 pounds.', 'אני שוקל 81 קילו.'), { text: 'I weigh 185 pounds.', state: 'unsure' });
  assert.deepEqual(settleNumbers('I\'m 6\'2".', 'הגובה שלי 196 סנטימטר.'), { text: 'I\'m 6\'2".', state: 'unsure' });
  assert.deepEqual(settleNumbers('זה 5 קילומטרים מכאן.', 'It is 5 miles from here.'), { text: 'זה 5 קילומטרים מכאן.', state: 'unsure' }, 'the number is right and the unit is not');
});

test('units of measure, Hebrew to English: a metric word of the line is put back after its number', () => {
  const back = (answer, line) => keepUnits(answer, line, 'he-en');
  assert.equal(back('I weigh 81 pounds.', 'אני שוקל 81 קילו.'), 'I weigh 81 kilos.');
  assert.equal(back("It's 417 miles from here.", 'זה 417 קילומטר מכאן.'), "It's 417 kilometers from here.");
  assert.equal(back('It is 1 mile away.', 'זה 1 ק"מ מכאן.'), 'It is 1 kilometer away.');
  assert.equal(back('Add 250 ounces of flour.', 'הוסיפו 250 גרם קמח.'), 'Add 250 grams of flour.');
  assert.equal(back('I have 2 gallons of water.', 'יש לי 2 ליטר מים.'), 'I have 2 liters of water.');
  assert.equal(back('I bought a farm of 32 acres.', 'קניתי חווה בת 32 דונם.'), 'I bought a farm of 32 dunams.', 'a dunam is about a quarter of an acre');
  // from the back test: "32 דונם" came back as "20 acres". The unit goes back; 20 is not a bad copy of 32, so the number is reported
  assert.deepEqual(settleNumbers(back("I bought a farm that's 20 acres on my retirement.", 'קניתי חווה בת 32 דונם לרגל יציאתי לגמלאות.'), 'קניתי חווה בת 32 דונם לרגל יציאתי לגמלאות.'), { text: "I bought a farm that's 20 dunams on my retirement.", state: 'unsure' });
  // then the number check finishes the job where the number is a bad copy, and reports where it is another number
  assert.deepEqual(settleNumbers(back('I weigh 185 pounds.', 'אני שוקל 81 קילו.'), 'אני שוקל 81 קילו.'), { text: 'I weigh 185 kilos.', state: 'unsure' }, '185 is not a bad copy of 81: reported');
  assert.deepEqual(settleNumbers(back('I weigh 31 pounds.', 'אני שוקל 81 קילו.'), 'אני שוקל 81 קילו.'), { text: 'I weigh 81 kilos.', state: 'fixed' });
  // left alone
  assert.equal(back('I got two gallons of water.', 'יש לי 2 ליטר מים.'), 'I got two gallons of water.', 'only right after digits; the change of family is still reported');
  assert.equal(unitsChanged('יש לי 2 ליטר מים.', 'I got two gallons of water.'), true);
  assert.equal(back('I weigh 81 pounds.', 'אני שוקל 81 פאונד.'), 'I weigh 81 pounds.', 'the line said pounds');
  assert.equal(back('He lost 5 pounds, about 2 kilos.', 'הוא ירד 2 קילו.'), 'He lost 5 pounds, about 2 kilos.', 'the answer already has the metric word');
  assert.equal(keepUnits('זה 5 קילומטרים מכאן.', 'It is 5 miles from here.', 'en-he'), 'זה 5 קילומטרים מכאן.', 'English to Hebrew is reported, not rewritten');
});

test('with the stored number table a small number must be in the answer as digits or as its word', () => {
  assert.deepEqual(engine.numberWords(2), { en: ['two'], he: ['שתיים', 'שניים', 'שני', 'שתי'] });
  assert.deepEqual(engine.numberWords(21).en, ['twenty-one']);
  assert.deepEqual(engine.numberWords(250), { en: [], he: [] }, 'the table stops at 100');
  const state = (answer, line) => settleNumbers(answer, line, { wordsFor }).state;
  // written as a word: right
  assert.equal(state('יש שבעה ימים בשבוע.', 'There are 7 days in a week.'), 'same');
  assert.equal(state('שולחן לשלוש בשעה 16:40, בבקשה.', 'Table for 3 at 16:40, please.'), 'same', 'a Hebrew number word with a prefix letter');
  assert.equal(state('תן לי 3 קילו עגבניות ושני קילו של מלפפונים.', 'Give me 3 kilos of tomatoes and 2 kilos of cucumbers.'), 'same');
  assert.equal(state('Table for four at 12:40, please.', 'שולחן ל-4 בשעה 12:40, בבקשה.'), 'same');
  assert.equal(state('Twenty-one people came.', 'באו 21 אנשים.'), 'same');
  assert.deepEqual(settleNumbers('Table for six at 8:30, please.', 'שולחן ל-6 בשעה 20:30, בבקשה.', { wordsFor }), { text: 'Table for six at 20:30, please.', state: 'fixed' }, 'the time is put back and the six is there as a word');
  // not there at all: lost
  assert.equal(state('שולחן ל-10: 10, בבקשה.', 'Table for 10 at 10:10, please.'), 'unsure', 'the pack ran "10 at 10:10" into "10:10"');
  assert.equal(state('שולחן ל-8: 30, בבקשה.', 'Table for 8 at 8:30, please.'), 'unsure');
  assert.equal(state('Room 417', 'חדר 417 בקומה 4'), 'unsure');
  assert.equal(state('אני נשאר יומיים.', 'I am staying 2 days.'), 'unsure', 'a dual form is not in the table: asked again with a stand-in number');
  // let through: "1" as the singular, and an ordinal
  assert.equal(state('אני צריך כרטיס.', 'I need 1 ticket.'), 'same');
  assert.equal(state('הקומה השלישית.', 'The 3rd floor.'), 'same');
  assert.equal(hasWord('שולחן לשניים, בבקשה', 'שניים'), true);
  assert.equal(hasWord('ובשש בערב', 'שש'), true);
  assert.equal(hasWord('ששון ושמחה', 'שש'), false, 'a longer word that starts the same way');
  assert.equal(hasWord('חמישים שקלים', 'חמש'), false);
  assert.equal(hasWord('Twenty-One people', 'twenty-one'), true);
  assert.equal(hasWord('a sixpack', 'six'), false);
  assert.equal(hasWord('anything', ''), false);
  // without the table only digits count: nothing is guessed
  assert.equal(settleNumbers('יש שבעה ימים בשבוע.', 'There are 7 days in a week.').state, 'unsure');
  assert.deepEqual(settleNumbers('I weigh 31 kilos.', 'אני שוקל 81 קילו.'), { text: 'I weigh 81 kilos.', state: 'fixed' });
  // a number written as a word is never "put back" over another number that came from a word
  assert.deepEqual(settleNumbers('אני צריך שני כרטיסים ל-20 אנשים.', 'I need 2 tickets for twenty people.', { wordsFor }), { text: 'אני צריך שני כרטיסים ל-20 אנשים.', state: 'same' });
});

test('money: the shekel sign is written as the word for the pack, and shekels do not come back as dollars', () => {
  assert.equal(plainMoney('It costs ₪120. Or 50 NIS, or 1 ₪, or ₪1,250.50', 'en-he'), 'It costs 120 shekels. Or 50 shekels, or 1 shekel, or 1,250.50 shekels');
  assert.equal(plainMoney('זה עולה 120 ₪. או 50 ש"ח, או ₪1, או 12.50₪', 'he-en'), 'זה עולה 120 שקלים. או 50 שקלים, או 1 שקל, או 12.50 שקלים');
  assert.equal(plainMoney('I paid $20 and 30 euros.', 'en-he'), 'I paid $20 and 30 euros.', 'other money is not touched');
  assert.equal(plainMoney('no money', 'en-he'), 'no money');
  assert.equal(keepShekels("That'll be 50 bucks.", 'זה עולה 50 שקלים.', 'he-en'), "That'll be 50 shekels.");
  assert.equal(keepShekels('The price is $12.50.', 'המחיר הוא 12.50 שקלים.', 'he-en'), 'The price is 12.50 shekels.');
  assert.equal(keepShekels('Do you have change for $100?', 'יש לך עודף מ-100 שקל?', 'he-en'), 'Do you have change for 100 shekels?');
  assert.equal(keepShekels('The price is $12.50.', 'המחיר הוא 12.50 דולר.', 'he-en'), 'The price is $12.50.', 'a dollar price stays in dollars');
  assert.equal(keepShekels('It is 5 dollars or 20 shekels.', 'זה 5 דולר או 20 שקלים.', 'he-en'), 'It is 5 dollars or 20 shekels.', 'a line with both is left alone');
  assert.equal(keepShekels('זה עולה 50 דולר.', 'It costs 50 shekels.', 'en-he'), 'זה עולה 50 דולר.', 'only Hebrew to English: the other way was not seen to go wrong');
});

test('stand-in numbers: each typed number is swapped out and put back in its place', () => {
  const m = maskNumbers('Table for 6 at 20:30, please. Call 054-123-4567 or 417.');
  assert.equal(m.text, 'Table for 528 at 639, please. Call 741 or 852.', '417 is in the line, so it is not used as a stand-in');
  assert.equal(unmaskNumbers('שולחן ל-528 ב-639, בבקשה. התקשר 741 או 852.', m), 'שולחן ל-6 ב-20:30, בבקשה. התקשר 054-123-4567 או 417.');
  assert.equal(unmaskNumbers('התקשר 741 או 852. שולחן ל-528 ב-639, בבקשה.', m), 'התקשר 054-123-4567 או 417. שולחן ל-6 ב-20:30, בבקשה.', 'the order may change');
  assert.equal(unmaskNumbers('שולחן ל-528 ב-639, בבקשה. התקשר 741.', m), null, 'a stand-in is missing');
  assert.equal(unmaskNumbers('שולחן ל-528 ב-639, בבקשה. התקשר 741 או 852 או 7.', m), 'שולחן ל-6 ב-20:30, בבקשה. התקשר 054-123-4567 או 417 או 7.', 'another number is left as it is: the result is compared with the line again');
  assert.equal(unmaskNumbers('שולחן ל-528 ב-528, בבקשה. התקשר 741 או 852.', m), null, 'a stand-in twice');
  assert.equal(maskNumbers('no numbers'), null);
  assert.equal(maskNumbers('1 2 3 4 5 6 7 8 9 10'), null, 'more numbers than stand-ins: not tried');
});

test('on the screen path a changed phone number is put back and nothing is said about it', async () => {
  const calls = [];
  const r = await translateLine(engine, packSaying({ 'My phone number is 054-123-4567.': 'מספר הטלפון שלי הוא 054-113-4567.' }, calls), 'My phone number is 054-123-4567.', { direction: 'en-he' });
  assert.equal(r.translation, 'מספר הטלפון שלי הוא 054-123-4567.');
  assert.equal(r.note, MODEL_NOTE_HE); assert.equal(r.confidence, 'medium');
  assert.equal(calls.length, 1, 'one question to the pack');
});

test('on the screen path two numbers that ran into one are settled by asking again with stand-in numbers', async () => {
  const calls = [];
  const pack = packSaying({ 'Table for 6 at 20:30, please.': 'שולחן ל-6: 30, בבקשה.', 'Table for 417 at 528, please.': 'שולחן ל-417 ב-528, בבקשה.' }, calls);
  const r = await translateLine(engine, pack, 'Table for 6 at 20:30, please.', { direction: 'en-he' });
  assert.equal(r.translation, 'שולחן ל-6 ב-20:30, בבקשה.');
  assert.deepEqual(calls, ['Table for 6 at 20:30, please.', 'Table for 417 at 528, please.']);
  assert.equal(r.note, MODEL_NOTE_HE, 'settled: no warning');
});

test('on the screen path a small number swallowed by a time is found out and settled the same way', async () => {
  const calls = [];
  const pack = packSaying({ 'Table for 10 at 10:10, please.': 'שולחן ל-10: 10, בבקשה.', 'Table for 417 at 528, please.': 'שולחן ל-417 ב-528, בבקשה.' }, calls);
  const r = await translateLine(engine, pack, 'Table for 10 at 10:10, please.', { direction: 'en-he' });
  assert.equal(r.translation, 'שולחן ל-10 ב-10:10, בבקשה.');
  assert.equal(calls.length, 2); assert.equal(r.note, MODEL_NOTE_HE);
  // a number word is enough: no second question
  const one = [];
  const w = await translateLine(engine, packSaying({ 'Table for 2 at 23:55, please.': 'שולחן לשניים בשעה 23: 55, בבקשה.' }, one), 'Table for 2 at 23:55, please.', { direction: 'en-he' });
  assert.equal(w.translation, 'שולחן לשניים בשעה 23:55, בבקשה.'); assert.equal(one.length, 1);
});

test('on the screen path numbers that cannot be settled are shown with a warning and low confidence', async () => {
  const pack = packSaying({ 'Table for 6 at 20:30, please.': 'שולחן ל-6: 30, בבקשה.', 'Table for 417 at 528, please.': 'שולחן ל-417, בבקשה.' });
  const r = await translateLine(engine, pack, 'Table for 6 at 20:30, please.', { direction: 'en-he' });
  assert.equal(r.ok, true);
  assert.equal(r.note, `${CHECK_NUMBERS} ${MODEL_NOTE_HE}`, 'the warning comes first');
  assert.equal(r.confidence, 'low');
  assert.doesNotMatch(CHECK_NUMBERS, /\b(model|machine|AI|neural|algorithm)\b/i);
});

test('on the screen path shekels stay shekels, and the shekel sign is given to the pack as the word', async () => {
  const r = await translateLine(engine, packSaying({ 'שילמתי 200 שקלים על הנעליים.': 'I paid 200 bucks for the shoes.' }), 'שילמתי 200 שקלים על הנעליים.', { direction: 'he-en' });
  assert.equal(r.translation, 'I paid 200 shekels for the shoes.'); assert.equal(r.note, MODEL_NOTE_EN);
  const calls = [];
  const sign = await translateLine(engine, packSaying({ 'The big one is 50 shekels too much.': 'הגדול יקר מדי ב-50 שקל.' }, calls), 'The big one is ₪50 too much.', { direction: 'en-he' });
  assert.deepEqual(calls, ['The big one is 50 shekels too much.']);
  assert.equal(sign.translation, 'הגדול יקר מדי ב-50 שקל.');
});

test('on the screen path a unit and a number that both came back changed are both put right', async () => {
  const line = 'קניתי חווה בת 32 דונם לרגל יציאתי לגמלאות.';
  const pack = packSaying({ [line]: "I bought a farm that's 20 acres on my retirement.", 'קניתי חווה בת 417 דונם לרגל יציאתי לגמלאות.': 'I bought a farm of 417 acres for my retirement.' });
  const r = await translateLine(engine, pack, line, { direction: 'he-en' });
  assert.equal(r.translation, 'I bought a farm of 32 dunams for my retirement.');
  assert.equal(r.note, MODEL_NOTE_EN);
  // kilos answered in pounds with another number: the same road
  const kilos = await translateLine(engine, packSaying({ 'החבילה שוקלת 19 קילו.': 'The package weighs 20 pounds.', 'החבילה שוקלת 417 קילו.': 'The package weighs 417 pounds.' }), 'החבילה שוקלת 19 קילו.', { direction: 'he-en' });
  assert.equal(kilos.translation, 'The package weighs 19 kilos.'); assert.equal(kilos.note, MODEL_NOTE_EN);
  // and when the second try does not settle it either, the pack's answer is shown with the unit put back and the warning
  const stuck = await translateLine(engine, packSaying({ 'החבילה שוקלת 19 קילו.': 'The package weighs 20 pounds.' }), 'החבילה שוקלת 19 קילו.', { direction: 'he-en' });
  assert.equal(stuck.translation, 'The package weighs 20 kilos.'); assert.equal(stuck.note, `${CHECK_NUMBERS} ${MODEL_NOTE_EN}`);
  // English to Hebrew a changed unit is reported, with the pack's own answer left as it is
  const miles = await translateLine(engine, packSaying({ 'It is 5 miles from here.': 'זה 5 קילומטרים מכאן.', 'It is 417 miles from here.': 'זה 417 קילומטרים מכאן.' }), 'It is 5 miles from here.', { direction: 'en-he' });
  assert.equal(miles.translation, 'זה 5 קילומטרים מכאן.'); assert.equal(miles.note, `${CHECK_NUMBERS} ${MODEL_NOTE_HE}`); assert.equal(miles.confidence, 'low');
});

test('a line with no number goes to the pack once and comes back as the pack gave it', async () => {
  const calls = [];
  const r = await translateLine(engine, packSaying({ 'The spoon goes to the right of the knife.': 'הכף מימין לסכין.' }, calls), 'The spoon goes to the right of the knife.', { direction: 'en-he' });
  assert.equal(r.translation, 'הכף מימין לסכין.'); assert.equal(calls.length, 1);
});

test('the number test: the same seed gives the same lines, every frame has a number, and the judge is strict', () => {
  const a = lines({ per: 3, seed: 7 }), b = lines({ per: 3, seed: 7 });
  assert.deepEqual(a, b);
  assert.equal(a.length, 3 * (FRAMES['en-he'].length + FRAMES['he-en'].length));
  assert.equal(FRAMES['en-he'].length, 20); assert.equal(FRAMES['he-en'].length, 20);
  for (const s of a) assert.ok(numbersIn(s.source).length >= 1, s.source);
  assert.notDeepEqual(lines({ per: 3, seed: 8 }), a);
  assert.equal(judge('Room 417 at 20:30', 'חדר 417 ב-20:30').intact, true);
  assert.equal(judge('Room 417 at 20:30', 'חדר 417 ב-8:30').intact, false);
  assert.equal(judge('חדר 417 ב-20:30', 'Room 417 at 8:30 p.m.').intact, true, 'the same time said the twelve-hour way');
  assert.equal(judge('חדר 417 ב-20:30', 'Room 417 at 8:30').intact, false);
  assert.equal(judge('Room 417', 'חדר').intact, false, 'a long number lost');
  assert.equal(judge('Table for 6', 'שולחן לשישה').intact, true, 'a small count written as its word');
  assert.equal(judge('שולחן ל-4', 'Table for four').intact, true);
  assert.equal(judge('Table for 6', 'שולחן').intact, false, 'a small count that is not there as digits or as a word is lost');
  assert.equal(judge('Table for 10 at 10:10, please.', 'שולחן ל-10:10, בבקשה.').intact, false, 'two numbers run into one');
  assert.equal(judge('I need 1 ticket', 'אני צריך כרטיס').intact, true, '"1" may be the singular');
  assert.equal(judge('Table for 6', 'שולחן ל-9').intact, false);
  assert.equal(judge('at 9:15', 'ב-9: 15').intact, true, 'a stray space in a time is a blemish, counted on its own');
  assert.equal(strayColon('ב-9: 15'), true); assert.equal(strayColon('ב-9:15'), false);
  assert.equal(judge('Room 417', '').intact, false);
  assert.equal(shekelsKept('זה עולה 50 שקלים.', "That'll be 50 bucks.", 'he-en'), false);
  assert.equal(shekelsKept('זה עולה 50 שקלים.', "That'll be 50 shekels.", 'he-en'), true);
  assert.equal(shekelsKept('זה עולה 50 דולר.', "That'll be $50.", 'he-en'), true);
});
