import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadEngine } from '../src/talk/data.js';
import { normEn, normHe, looseEnTokens, looseHeTokens, bareHeTokens, dice, softlyEqual, firstGloss, foldNumbersEn, editDistance } from '../src/talk/engine.js';
import { translationMatchScore, holdsDivineName, stripNikkud } from '../src/talk/talk.model.js';

const json = (rel) => JSON.parse(readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const engine = await loadEngine();
const he = (text, o = {}) => engine.translate(text, { direction: 'en-he', ...o });
const en = (text, o = {}) => engine.translate(text, { direction: 'he-en', ...o });

test('helpers: keys, tokens, overlap', () => {
  assert.equal(normEn("What's your name?"), 'what is your name');
  assert.equal(normEn('I’m fine — thanks!'), 'i am fine thanks');
  assert.equal(normHe('מָה שְׁלוֹמְךָ?'), 'מה שלומך');
  assert.deepEqual(looseEnTokens('I would like a coffee, please'), ['i', 'want', 'coffee']);
  assert.equal(dice(['a', 'b'], ['a', 'b']), 1);
  assert.equal(dice(['a'], []), 0);
  assert.equal(firstGloss('month; new moon, the day of the new moon'), 'month');
  assert.equal(softlyEqual(['i', 'do', 'not', 'eat', 'meat'], ['i', 'do', 'not', 'eat', 'fish'], new Set()), false);
  assert.equal(foldNumbersEn('it costs twenty five shekels'), 'it costs 25 shekels');
  assert.equal(foldNumbersEn('a hundred shekels'), '100 shekels');
  assert.equal(editDistance('שקיד', 'שקית'), 1);
  assert.equal(editDistance('abc', 'xyzzz', 2), 3);
  assert.deepEqual(looseHeTokens('ניפגש בבית הכנסת'), ['נתראה', 'בבית', 'הכנסת']);
  assert.deepEqual(bareHeTokens('איפה בית החולים'), ['איפה', 'בית', 'חולים']);
});

test('pack: every line has an id, English and Hebrew; ids are unique; no vowel points; no sacred Name', () => {
  const pack = json('data/talk/pack.json');
  assert.equal(pack.schema, 'alef-talk-pack/1');
  assert.equal(pack.review, 'native-speaker-needed');
  const ids = new Set();
  for (const p of pack.phrases) {
    assert.ok(p.id && !ids.has(p.id), `duplicate or missing id ${p.id}`); ids.add(p.id);
    assert.ok(Array.isArray(p.en) && p.en.length && p.en.every((x) => /[A-Za-z]/.test(x)), `${p.id} English`);
    for (const h of [p.he, p.f, p.toF, ...(p.alt || [])].filter((x) => x !== undefined)) {
      assert.match(h, /[א-ת]/, `${p.id} Hebrew`);
      assert.equal(stripNikkud(h), h, `${p.id} is stored without vowel points`);
      assert.doesNotMatch(h, /[A-Za-z]/, `${p.id} Hebrew holds Latin letters`);
      assert.equal(holdsDivineName(h), false, `${p.id} holds a sacred Name`);
    }
  }
  assert.ok(pack.phrases.length >= 300, `lines: ${pack.phrases.length}`);
  for (const n of [...pack.nouns, ...pack.places]) assert.ok(n.en.length && n.en.every((x) => x === x.toLowerCase()) && /[א-ת]/.test(n.he));
  for (const n of pack.nouns) assert.ok(n.g === undefined || ['f', 'p', 'pf'].includes(n.g), `${n.he} gender`);
  for (const v of pack.verbs) assert.ok(/^[a-z ]+$/.test(v.en) && /^ל/.test(v.he), `${v.en} is a to-form`);
  assert.equal(pack.numbers.list.length, 20);
  assert.equal(pack.numbers.tens.length, 9);
});

test('stored lines: English to Hebrew', () => {
  assert.equal(he('Hello.').translation, 'שלום');
  assert.equal(he('Where is the restroom?').translation, 'איפה השירותים?');
  assert.equal(he('where is the bathroom').method, 'phrase');
  assert.equal(he('How much does this cost?').translation, 'כמה זה עולה?');
  assert.equal(he('The check, please').translation, 'את החשבון, בבקשה');
  assert.equal(he('Shabbat shalom').translation, 'שבת שלום');
  assert.equal(he("I'm fine, thanks.").confidence, 'high');
});

test('stored lines: Hebrew to English, with or without vowel points', () => {
  assert.equal(en('בוקר טוב.').translation, 'Good morning');
  assert.equal(en('בֹּקֶר טוֹב').translation, 'Good morning');
  assert.equal(en('תעיתי').translation, "I'm lost");
  assert.equal(en('מוצאי שבת').translation, 'After Shabbat');
  assert.equal(en('איפה בית הכנסת?').translation, 'Where is the synagogue?');
});

test('who is speaking changes the Hebrew "I" form, and the other form stays visible', () => {
  const both = he('I need help');
  assert.equal(both.translation, 'אני צריך עזרה');
  assert.deepEqual(both.variants, [{ label: 'Said by a woman', text: 'אני צריכה עזרה' }]);
  const f = he('I need help', { speaker: 'f' });
  assert.equal(f.translation, 'אני צריכה עזרה');
  assert.deepEqual(f.variants, [{ label: 'Said by a man', text: 'אני צריך עזרה' }]);
  assert.ok(he('Turn left').variants.some((v) => v.label === 'Said to a woman' && v.text === 'פני שמאלה'));
});

test('"please" is carried across, not invented and not dropped', () => {
  assert.equal(he('Water').translation, 'מים');
  assert.equal(he('Water, please').translation, 'מים, בבקשה');
  assert.equal(he('Can I see the menu, please?').translation, 'אפשר לראות את התפריט, בבקשה?');
  assert.equal(en('מים, בבקשה').translation, 'Water, please');
  assert.equal(en('קפה עם חלב, בבקשה.').translation, 'Coffee with milk, please');
});

test('patterns: frames with a noun, place, name or number', () => {
  const cases = [
    ['Where is the hotel?', 'איפה המלון?'],
    ['Where is the train station?', 'איפה תחנת הרכבת?'],
    ['How do I get to the Old City?', 'איך מגיעים לעיר העתיקה?'],
    ['How do I get to the hospital?', 'איך מגיעים לבית החולים?'],
    ['How do I get to the synagogue?', 'איך מגיעים לבית הכנסת?'],
    ['I would like a tea with milk', 'אני רוצה תה עם חלב'],
    ['Coffee without sugar, please', 'קפה בלי סוכר, בבקשה'],
    ['Do you have wifi?', 'יש לכם וויי-פיי?'],
    ['How much is the ticket?', 'כמה עולה הכרטיס?'],
    ['How much are the tickets?', 'כמה עולים הכרטיסים?'],
    ['I am allergic to peanuts', 'יש לי אלרגיה לבוטנים'],
    ['My name is Rachel', 'קוראים לי רחל'],
    ["I'm from Toronto", 'אני מטורונטו'],
    ['A ticket to Haifa, please', 'כרטיס לחיפה, בבקשה'],
    ['Three tickets to Jerusalem', 'שלושה כרטיסים לירושלים'],
    ['I need two tickets', 'אני צריך שני כרטיסים'],
    ['It is seven o’clock', 'השעה שבע'],
    ['The number is five six seven', 'המספר הוא חמש שש שבע'],
    ['See you tomorrow at nine', 'נתראה מחר בתשע'],
    ['I lost my passport', 'איבדתי את הדרכון'],
    ['Can I have the menu?', 'אפשר את התפריט?'],
    ['I am looking for the market', 'אני מחפש את השוק'],
    ['To the airport, please', 'לשדה התעופה, בבקשה'],
  ];
  for (const [src, want] of cases) assert.equal(he(src).translation, want, src);
  assert.equal(he('Where is the museum?').method, 'pattern');
  assert.equal(he('Where is the museum?').confidence, 'medium');
});

test('patterns: Hebrew to English', () => {
  const cases = [
    ['איפה המלון?', 'Where is the hotel?'],
    ['יש לכם חלב?', 'Do you have milk?'],
    ['אני רוצה מים, בבקשה.', 'I want water, please'],
    ['כמה עולה הכרטיס?', 'How much is the ticket?'],
    ['קוראים לי נועה.', 'My name is Noa'],
    ['השעה שמונה.', "It is eight o'clock"],
    ['אין לי כסף.', "I don't have money"],
    ['אני צריכה שקית', 'I need a bag'],
    ['אני צריך שני כרטיסים.', 'I need two tickets'],
    ['סליחה, איפה המוזיאון?', 'Excuse me, where is the museum?'],
  ];
  for (const [src, want] of cases) assert.equal(en(src).translation, want, src);
});

test('a name outside the list stays in English letters and the screen is told', () => {
  const r = he('My name is Zebulon');
  assert.equal(r.translation, 'קוראים לי Zebulon');
  assert.match(r.note, /English letters/);
});

test('refuses instead of guessing: a near line with a different thing in it is never passed off as the answer', () => {
  const french = he("I don't speak French");
  assert.equal(french.ok, false, 'the stored line is about Hebrew');
  assert.equal(french.translation, '');
  assert.ok(french.suggestions.some((s) => /Hebrew/.test(s.en)), 'the Hebrew line is offered as a suggestion, labelled as such');
  for (const src of ['The quarterly report is late again', 'It snowed all night', 'Can I leave my suitcase here?', 'Where do I get off?', 'See you at show']) {
    const r = he(src);
    assert.equal(r.ok, false, src);
    assert.equal(r.method, 'none');
  }
  for (const src of ['הילד נפל', 'תביא לי את זה מחר', 'אתמול הלכתי לים', 'החשבון בפרטנר, בבקשה']) assert.equal(en(src).ok, false, src);
});

test('small extra words do not block a stored line, and the match is named', () => {
  const r = he('Where is the restroom here?');
  assert.equal(r.translation, 'איפה השירותים?');
  assert.equal(r.method, 'close');
  assert.match(r.note, /Closest line/);
});

test('a sacred Name is held in both directions: nothing is translated or suggested', () => {
  for (const r of [en('ברוך יהוה'), he('What does YHWH mean?')]) {
    assert.equal(r.held, true);
    assert.equal(r.ok, false);
    assert.equal(r.translation, '');
    assert.equal(r.method, 'held');
  }
});

test('numbers to 100, money, counted things and agreement', () => {
  const cases = [
    ['It costs twenty shekels', 'זה עולה עשרים שקלים'],
    ['It costs 20 shekels.', 'זה עולה עשרים שקלים'],
    ['It costs twenty five shekels', 'זה עולה עשרים וחמישה שקלים'],
    ['Sixty shekels', 'שישים שקלים'],
    ['Two beers, please', 'שתי בירות, בבקשה'],
    ['We need three rooms', 'אנחנו צריכים שלושה חדרים'],
    ['One falafel and one cola, please', 'פלאפל אחד וקולה אחת, בבקשה'],
    ['We have a reservation for four', 'יש לנו הזמנה לארבעה'],
    ['A table for two', 'שולחן לשניים'],
    ['In ten minutes', 'בעוד עשר דקות'],
    ['What time does the pharmacy close?', 'מתי בית המרקחת נסגר?'],
    ['When does the store close?', 'מתי החנות נסגרת?'],
    ['Is the museum open today?', 'המוזיאון פתוח היום?'],
    ['The door is closed', 'הדלת סגורה'],
    ['The train is late', 'הרכבת מאחרת'],
    ['How much are the shoes?', 'כמה עולות הנעליים?'],
    ['I lost my keys', 'איבדתי את המפתחות שלי'],
  ];
  for (const [src, want] of cases) assert.equal(he(src).translation, want, src);
  assert.equal(en('זה עולה שלושים שקלים').translation, 'It costs thirty shekels');
  assert.equal(en('זה עולה עשרים שקל').translation, 'It costs twenty shekels', 'the spoken singular after a number');
  assert.equal(en('שתי בירות, בבקשה').translation, 'Two beers, please');
  assert.equal(en('המוזיאון סגור היום').translation, 'The museum is closed today');
  assert.equal(en('יש לנו הזמנה לשניים').translation, 'We have a reservation for two');
});

test('to-forms after want, need and may I; a to-form that cannot take a thing refuses one', () => {
  const cases = [
    ['I would like to pay', 'אני רוצה לשלם'],
    ['We want to order now', 'אנחנו רוצים להזמין עכשיו'],
    ['Can I sit here?', 'אפשר לשבת כאן?'],
    ['Where can I park?', 'איפה אפשר לחנות?'],
    ['I want to buy a gift', 'אני רוצה לקנות מתנה'],
    ["I'd like to book a table for six", 'אני רוצה להזמין שולחן לשישה'],
    ['I need to see a doctor', 'אני צריך לראות רופא'],
    ['Can I have a bottle of water?', 'אפשר בקבוק מים?'],
    ['Do you have a menu in English?', 'יש לכם תפריט באנגלית?'],
    ['How much is a ticket to Eilat?', 'כמה עולה כרטיס לאילת?'],
    ['Turn left after the bridge', 'פנה שמאלה אחרי הגשר'],
    ['I want to go to the beach', 'אני רוצה להגיע לחוף הים'],
    ["I don't drink wine", 'אני לא שותה יין'],
    ['Thank you for your help', 'תודה על העזרה'],
    ['Good night and thank you', 'לילה טוב ותודה'],
  ];
  for (const [src, want] of cases) assert.equal(he(src).translation, want, src);
  assert.ok(he('Turn left after the bridge').variants.some((v) => v.label === 'Said to a woman' && v.text === 'פני שמאלה אחרי הגשר'));
  assert.equal(he('I need to see a doctor', { speaker: 'f' }).translation, 'אני צריכה לראות רופא');
  assert.equal(he('Can I leave my suitcase here?').ok, false, '"leave" is stored as "go out": it must not take a thing');
  assert.equal(en('אני רוצה לקנות כרטיס').translation, 'I want to buy a ticket');
  assert.equal(en('איפה אפשר לקנות מים?').translation, 'Where can I buy water?');
  assert.equal(en('פנה ימינה אחרי הגשר').translation, 'Turn right after the bridge');
  assert.equal(en('אנחנו צריכים שני חדרים').translation, 'We need two rooms');
  assert.equal(en('אני לא אוכלת בשר').translation, "I don't eat meat");
});

test('describing words follow the noun or the speaker; clock times; when things start and end', () => {
  const cases = [
    ['The children are hungry', 'הילדים רעבים'],
    ['The room is very dirty', 'החדר מלוכלך מאוד'],
    ['The soup was cold', 'המרק היה קר'],
    ['The shoes are too small', 'הנעליים קטנות מדי'],
    ['The door is open', 'הדלת פתוחה'],
    ['It is not far', 'זה לא רחוק'],
    ['We are ready', 'אנחנו מוכנים'],
    ['I live in Toronto', 'אני גר בטורונטו'],
    ['I am thirty five years old', 'אני בן שלושים וחמש'],
    ['I have two children', 'יש לי שני ילדים'],
    ['At half past eight', 'בשמונה וחצי'],
    ['The service starts at nine', 'התפילה מתחילה בתשע'],
    ['When does the concert start?', 'מתי הקונצרט מתחיל?'],
    ['See you tomorrow at eight thirty', 'נתראה מחר בשמונה וחצי'],
    ['It cost twenty shekels', 'זה עלה עשרים שקלים'],
  ];
  for (const [src, want] of cases) assert.equal(he(src).translation, want, src);
  const tired = he('I am very tired');
  assert.equal(tired.translation, 'אני עייף מאוד');
  assert.deepEqual(tired.variants, [{ label: 'Said by a woman', text: 'אני עייפה מאוד' }]);
  assert.equal(he('I am very tired', { speaker: 'f' }).translation, 'אני עייפה מאוד');
  const back = [
    ['הילדים רעבים', 'The children are hungry'],
    ['החדר לא נקי', 'The room is not clean'],
    ['האוכל היה קר מאוד', 'The food was very cold'],
    ['אני גר בטורונטו', 'I live in Toronto'],
    ['התפילה מתחילה בתשע', 'The service starts at nine'],
    ['בשמונה וחצי', 'At half past eight'],
    ['זה עלה עשרים שקלים', 'It cost twenty shekels'],
  ];
  for (const [src, want] of back) assert.equal(en(src).translation, want, src);
});

test('describing words beside a noun, comparatives, my, another, per night, someone else wants', () => {
  const cases = [
    ['Do you have a bigger room?', 'יש לכם חדר יותר גדול?'],
    ['Cold water, please', 'מים קרים, בבקשה'],
    ['I want a small coffee', 'אני רוצה קפה קטן'],
    ['Can I have another towel?', 'אפשר עוד מגבת?'],
    ['How much is the room per night?', 'כמה עולה החדר ללילה?'],
    ['Where is my room?', 'איפה החדר שלי?'],
    ['My wife is tired', 'אשתי עייפה'],
    ['My husband is sick', 'בעלי חולה'],
    ['We are from Canada', 'אנחנו מקנדה'],
    ['The children want ice cream', 'הילדים רוצים גלידה'],
    ['My daughter needs a doctor', 'הבת שלי צריכה רופא'],
    ['The children want to eat', 'הילדים רוצים לאכול'],
    ['See you on Sunday', 'נתראה ביום ראשון'],
    ['Is the tour in English?', 'הסיור באנגלית?'],
  ];
  for (const [src, want] of cases) assert.equal(he(src).translation, want, src);
  const back = [
    ['יש לכם חדר יותר גדול?', 'Do you have a bigger room?'],
    ['אפשר עוד מגבת?', 'Can I have another towel?'],
    ['אפשר עוד לחם?', 'Can I have more bread?'],
    ['איפה החדר שלי?', 'Where is my room?'],
    ['אנחנו מקנדה', 'We are from Canada'],
    ['הילדים רוצים גלידה', 'The children want ice cream'],
    ['נתראה ביום ראשון', 'See you on Sunday'],
    ['מים קרים, בבקשה', 'Cold water, please'],
  ];
  for (const [src, want] of back) assert.equal(en(src).translation, want, src);
});

test('round 5 frames: not wanting, not working, where a thing is, which, our and this, colours', () => {
  const cases = [
    ["I don't need a receipt", 'אני לא צריך קבלה'],
    ["I don't want to pay", 'אני לא רוצה לשלם'],
    ["The shower doesn't work", 'המקלחת לא עובדת'],
    ['The elevator is not working', 'המעלית לא עובדת'],
    ['Our room is not ready', 'החדר שלנו לא מוכן'],
    ['The prayer book is on the chair', 'הסידור על הכיסא'],
    ['Which platform?', 'איזה רציף?'],
    ['This bus goes to Haifa', 'האוטובוס הזה נוסע לחיפה'],
    ['Is it open on Friday?', 'זה פתוח ביום שישי?'],
    ['Two glasses of red wine, please', 'שתי כוסות יין אדום, בבקשה'],
    ["I'm looking for a gift for my mother", 'אני מחפש מתנה לאמא שלי'],
    ['The fish is very fresh', 'הדג טרי מאוד'],
    ["I don't eat fish", 'אני לא אוכל דגים'],
    ['I have a headache', 'יש לי כאב ראש'],
  ];
  for (const [src, want] of cases) assert.equal(he(src).translation, want, src);
  const back = [
    ['המקלחת לא עובדת', "The shower doesn't work"],
    ['החדר שלנו לא מוכן', 'Our room is not ready'],
    ['אני לא צריך קבלה', "I don't need a receipt"],
    ['בעלי חולה', 'My husband is sick'],
    ['הסידור על הכיסא', 'The prayer book is on the chair'],
    ['כואב לי הראש', 'I have a headache'],
    ['יש לי כאב ראש', 'I have a headache'],
  ];
  for (const [src, want] of back) assert.equal(en(src).translation, want, src);
});

test('hardening: odd input never throws, never leaks a built-in, and never answers with nothing', () => {
  const odd = ['', '   ', '?', '...', '😀', '123', 'a', 'אב', 'the', 'i want', 'i need to', 'how much is', 'אני רוצה', 'איפה', 'two of', 'my my my', 'at', 'in', 'for', 'to',
    '.*+?^${}()|[]\\', '<script>alert(1)</script>', 'x'.repeat(5000), 'שלום '.repeat(400), 'Hello שלום mixed', 'constructor', '__proto__', 'toString', 'hasOwnProperty please',
    'constructor tickets', 'twenty constructor', '0 tickets', '101 shekels', 'I am 500 years old', 'see you at 99', 'it is 99 oclock', 'a table for 0', 'half past', '\n\t'];
  for (const text of odd) for (const direction of ['auto', 'en-he', 'he-en']) for (const speaker of ['', 'f']) {
    const r = engine.translate(text, { direction, speaker });
    assert.equal(typeof r.ok, 'boolean');
    assert.equal(typeof r.translation, 'string');
    if (r.ok) assert.ok(r.translation.length > 0, JSON.stringify(text));
    else assert.equal(r.translation, '');
    assert.doesNotMatch(r.translation, /undefined|null|NaN|\[object|function/, JSON.stringify(text));
  }
});

test('hardening: round trips and small faults from the last review', () => {
  assert.equal(he('Can I change money here?').translation, 'אפשר להחליף כאן כסף?');
  assert.equal(en('אפשר להחליף כאן כסף?').translation, 'Can I change money here?');
  assert.equal(en('אני לא צריך שקית').translation, "I don't need a bag");
  assert.equal(en('אני צריכה שקית, בבקשה').translation, 'I need a bag, please');
  const welcome = he('welcome');
  for (const v of welcome.variants || []) if (v.label === 'Feminine form') assert.match(v.text, /[\u05B0-\u05C7]/, 'the feminine phrasebook form keeps its vowel marks');
  assert.equal(he('It is 99 oclock').ok, false);
});

test('a refused line that sounds like a stored line is offered as "did you mean", never given as the answer', () => {
  const cases = [
    ['מי בא לי קרח?', 'he-en', 'מים, בלי קרח'],
    ['יש לכם אפשרויות סינכרוניות?', 'he-en', 'יש לכם אפשרויות צמחוניות?'],
    ['החשבון בפרטנר, בבקשה.', 'he-en', 'החשבון נפרד, בבקשה'],
    ['איפה השאלמונית לשדה תעופה?', 'he-en', 'אפשר מונית לשדה התעופה?'],
    ['See you at show.', 'en-he', 'נתראה בבית הכנסת'],
  ];
  for (const [src, direction, want] of cases) {
    const r = engine.translate(src, { direction });
    assert.equal(r.ok, false, src);
    assert.equal(r.translation, '', src);
    assert.equal(r.soundsLike, true, src);
    assert.equal(r.suggestions[0].he, want, src);
  }
  assert.notEqual(he('The quarterly report is late again').soundsLike, true);
});

test('a stored phrasebook line names its recorded clip; a changed line does not', () => {
  const r = he('Good morning');
  assert.deepEqual(r.clip, { kind: 'line', id: 'greetings-03' });
  assert.equal(he('Where is the museum?').clip, undefined, 'a pattern has no clip');
  assert.deepEqual(he('Good morning, please').clip, undefined, 'a line with words added is not the recorded line');
});

test('dictionary: used only after it is loaded, first meanings only, always marked low', async () => {
  assert.equal(engine.hasDictionary, false);
  assert.equal(he('Where is the forest?').ok, false);
  assert.equal(await engine.loadDictionary(), true);
  const r = he('Where is the forest?');
  assert.equal(r.translation, 'איפה היער?');
  assert.equal(r.confidence, 'low');
  assert.match(r.note, /dictionary word/);
  assert.equal(he('Where do I get off?').ok, false, 'a small word is not a thing');
  assert.equal(en('יער').translation, 'forest');
  assert.equal(en('יער').method, 'word');
  assert.equal(en('תביא לי את זה מחר').ok, false, 'dictionary glosses are never strung into a sentence');
  const w = en('קפה ועוגה');
  assert.equal(w.method, 'words');
  assert.match(w.note, /Word by word/);
});

test('lines as a listener or a speech recogniser hears them (from the speech review fail list)', () => {
  const heard = [
    ['איפה בית חולים?', /^Where is (the|a) hospital\?$/],
    ['איפה בית כנסת?', /^Where is (the|a) synagogue\?$/],
    ['פנה שמאל ברמזור', /^Turn left at the light$/],
    ['מתי אוטובוס מגיע?', /^What time does the bus arrive\?$/],
    ['תתקשר למשטרה.', /^Call the police$/],
    ['ניפגש בבית הכנסת', /^See you at shul$/],
    ['ניפגש מחר בעשר', /^See you tomorrow at ten$/],
    ['יש קידוש אחרי התפלה?', /^Is there kiddush after the service\?$/],
    ['אני צריך שקיד בבקשה.', /^I need a bag, please$/],
    ['יש לכם אפשרויות סמכוניות?', /^Do you have vegetarian options\?$/],
  ];
  for (const [src, want] of heard) assert.match(en(src).translation, want, src);
  const fixed = en('אני צריך שקיד בבקשה.');
  assert.equal(fixed.method, 'close');
  assert.match(fixed.note, /Read “שקיד” as “שקית”/, 'the correction is shown, not hidden');
  // a real word that was misheard is a different request: it is translated as heard or refused, never bent to a stored line
  assert.equal(en('בלי ביצים בבקשה').translation, 'No eggs, please');
  assert.equal(en('אני צריך שקיות בבקשה').translation, 'I need bags, please');
  assert.equal(en('החשבון בפרטנר, בבקשה').ok, false);
  assert.equal(he('See you at show').ok, false);
});

// ---- scores, reported as measured ---------------------------------------------------------------------------------
function score(file) {
  const samples = json(file).samples;
  let total = 0; let wrong = 0; let refused = 0;
  for (const s of samples) {
    const r = engine.translate(s.source, { direction: s.direction });
    if (!r.ok) { refused += 1; continue; } // a refusal scores 0
    const sc = translationMatchScore(r.translation, s.reference);
    total += sc;
    if (sc < 0.5) wrong += 1;
  }
  return { n: samples.length, score: (100 * total) / samples.length, refused, wrong };
}

test('score: the 100 reference lines the pack was written against (a regression check, not a held-out result)', () => {
  const r = score('tests/fixtures/talk.utterances.json');
  assert.equal(r.n, 100);
  assert.ok(r.score >= 95, `score ${r.score.toFixed(2)}`);
  assert.equal(r.refused, 0);
});

test('score: the round 1 and round 2 fresh sets, both since used to widen the engine (regression checks)', () => {
  const r1 = score('tests/fixtures/talk.fresh.json');
  assert.equal(r1.n, 60);
  assert.ok(r1.score >= 93, `round 1 set ${r1.score.toFixed(2)}`);
  const r2 = score('tests/fixtures/talk.fresh2.json');
  assert.equal(r2.n, 75);
  assert.ok(r2.score >= 86, `round 2 set ${r2.score.toFixed(2)}`);
});

test('score: the round 2 end set, since used to guide new frames (a regression check)', () => {
  const r = score('tests/fixtures/talk.fresh3.json');
  assert.equal(r.n, 40);
  assert.ok(r.score >= 90, `score ${r.score.toFixed(2)}`);
});

test('score: the round 3 end set, since used to guide new frames (a regression check)', () => {
  const r = score('tests/fixtures/talk.fresh4.json');
  assert.equal(r.n, 40);
  assert.ok(r.score >= 93, `score ${r.score.toFixed(2)}`);
});

test('score: the round 4 end set, since used to guide new frames (a regression check)', () => {
  const r = score('tests/fixtures/talk.fresh5.json');
  assert.equal(r.n, 40);
  assert.ok(r.score >= 93, `score ${r.score.toFixed(2)}`);
  assert.equal(en('הרב כאן היום?').translation, 'Is the rabbi here today?', 'a question stays a question');
  assert.equal(en('הרב כאן היום').translation, 'The rabbi is here today');
});

test('score: 40 held-out lines written at the end of round 5 (the honest number; must not fall)', () => {
  const r = score('tests/fixtures/talk.fresh6.json');
  assert.equal(r.n, 40);
  assert.ok(r.score >= 48, `score ${r.score.toFixed(2)}`);
  assert.equal(en('אני רוצה כוס יין לבן').translation, 'I want a glass of white wine');
});
