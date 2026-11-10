import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadEngine } from '../src/talk/data.js';
import { normEn, normHe, looseEnTokens, dice, softlyEqual, firstGloss } from '../src/talk/engine.js';
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
  assert.ok(pack.phrases.length >= 180, `lines: ${pack.phrases.length}`);
  for (const n of [...pack.nouns, ...pack.places]) assert.ok(n.en.length && n.en.every((x) => x === x.toLowerCase()) && /[א-ת]/.test(n.he));
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
  const fish = he("I don't eat fish");
  assert.equal(fish.ok, false, 'the stored line is about meat');
  assert.equal(fish.translation, '');
  assert.ok(fish.suggestions.some((s) => /meat/.test(s.en)), 'the meat line is offered as a suggestion, labelled as such');
  for (const src of ['The quarterly report is late again', 'Can someone help me with my suitcase?', 'What time does the museum open?']) {
    const r = he(src);
    assert.equal(r.ok, false, src);
    assert.equal(r.method, 'none');
  }
  assert.equal(en('החנות סגורה היום').ok, false);
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

test('dictionary: used only after it is loaded, and always marked low', async () => {
  assert.equal(engine.hasDictionary, false);
  assert.equal(he('Where is the bridge?').ok, false);
  assert.equal(await engine.loadDictionary(), true);
  const r = he('Where is the bridge?');
  assert.equal(r.ok, true);
  assert.equal(r.confidence, 'low');
  assert.match(r.note, /dictionary word/);
  const w = en('האוטובוס מאחר');
  assert.equal(w.method, 'words');
  assert.match(w.note, /Word by word/);
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

test('score: 60 fresh lines written after the pack (the honest number; must not fall)', () => {
  const r = score('tests/fixtures/talk.fresh.json');
  assert.equal(r.n, 60);
  assert.ok(r.score >= 68, `score ${r.score.toFixed(2)}`);
  assert.ok(r.refused <= 16, `refused ${r.refused}`);
});
