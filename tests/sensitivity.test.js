// Religious-content sensitivity checks: divine-name handling (see docs/sensitivity/CONVENTIONS.md).
// Not a ruling on practice: it pins today's known occurrences in tools/sensitivity/allowlist.json and fails on new ones.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit, summarize } from '../tools/sensitivity/audit.mjs';
import {
  classifyNameWord, findName, speechText, speechSafeText, displayHebrew, displayTranslit, englishGod, isNameVocabItem, versionLabel,
  SPOKEN_NAME, NAME_ABBREV, SETTING_SUGGESTION,
} from '../src/shell/names.js';
import { buildDailyCard } from '../src/speak/daily.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NAME = 'יְהָוָה'; // pointed name as in the source text (built from code points)
const NAME_PLAIN = 'יהוה';
const LA_NAME = 'לַיהוָה';

test('classifyNameWord: exact, prefixed, abbreviation, and non-matches', () => {
  assert.deepEqual(classifyNameWord(NAME), { kind: 'exact', prefix: '' });
  assert.deepEqual(classifyNameWord(NAME_PLAIN), { kind: 'exact', prefix: '' });
  assert.equal(classifyNameWord(LA_NAME).kind, 'prefixed');
  assert.equal(classifyNameWord(SPOKEN_NAME), null);
  assert.equal(classifyNameWord('שלום'), null);
  assert.equal(classifyNameWord('יְיָ').kind, 'abbrev');
  assert.equal(classifyNameWord(''), null);
});

test('findName finds whole words in a sentence with punctuation', () => {
  const s = `בָּרוּךְ אַתָּה ${NAME} אֱלֹהֵינוּ״ ${LA_NAME}׃`;
  const hits = findName(s);
  assert.deepEqual(hits.map((h) => h.kind), ['exact', 'prefixed']);
});

test('speechText replaces the bare name and prefixed forms (prefix kept as written) with the spoken substitute', () => {
  assert.equal(speechText(`x ${NAME} y`), `x ${SPOKEN_NAME} y`);
  assert.equal(speechText(`${NAME_PLAIN}`), SPOKEN_NAME);
  assert.equal(speechText(`a ${LA_NAME}`), `a ${LA_NAME.slice(0, 2)}${SPOKEN_NAME}`);
  assert.equal(speechText('no name here'), 'no name here');
  assert.equal(speechText(''), '');
});

test('speechSafeText: ordinary Hebrew is ok; Latin spellings of the Name fail closed', () => {
  const ok = speechSafeText('שָׁלוֹם');
  assert.equal(ok.ok, true); assert.equal(ok.text, 'שָׁלוֹם');
  const bare = speechSafeText(NAME_PLAIN);
  assert.equal(bare.ok, true); assert.equal(bare.text, SPOKEN_NAME);
  const latin = speechSafeText('say Yahweh here');
  assert.equal(latin.ok, false); assert.equal(latin.reason, 'unresolved-liturgical-name');
});

test('displayHebrew: source by default, abbreviation on request, prefixed untouched', () => {
  assert.equal(displayHebrew(`a ${NAME}`), `a ${NAME}`);
  assert.equal(displayHebrew(`a ${NAME}`, 'abbrev'), `a ${NAME_ABBREV}`);
  assert.equal(displayHebrew(`a ${LA_NAME}`, 'abbrev'), `a ${LA_NAME}`);
});

test('displayTranslit rewrites Latin spellings of the name to Adonai', () => {
  assert.equal(displayTranslit('Yahweh'), 'Adonai');
  assert.equal(displayTranslit('jehovah said'), 'adonai said');
  assert.equal(displayTranslit('YHWH and Yehovah'), 'Adonai and Adonai');
  assert.equal(displayTranslit('Adonai Hashem'), 'Adonai Hashem');
});

test('englishGod: off by default; on writes G-d only for the capitalised word', () => {
  assert.equal(englishGod('God willing'), 'God willing');
  assert.equal(englishGod('God willing', true), 'G-d willing');
  assert.equal(englishGod("God's gift; a god; Godzilla", true), "G-d's gift; a god; Godzilla");
  assert.equal(SETTING_SUGGESTION.default, false);
});

test('isNameVocabItem', () => {
  assert.equal(isNameVocabItem({ he: NAME }), true);
  assert.equal(isNameVocabItem({ he: SPOKEN_NAME }), false);
  assert.equal(isNameVocabItem({ he: NAME_ABBREV }), true);
  assert.equal(isNameVocabItem(null), false);
});

test('the two Name headwords are shown as ה׳ and have no sound in the clip list', () => {
  const words = JSON.parse(fs.readFileSync(path.join(root, 'data/vocab/words.json'), 'utf8')).words;
  const byId = new Map(words.map((w) => [w.id, w]));
  for (const id of ['p6584b7dc', 'p7cb5e293']) {
    const w = byId.get(id);
    assert.ok(w, id);
    assert.equal(w.he, NAME_ABBREV, id);
    assert.equal(isNameVocabItem(w), true, id);
  }
  const lessons = JSON.parse(fs.readFileSync(path.join(root, 'data/curriculum/lessons.json'), 'utf8')).lessons;
  const r15 = lessons.find((l) => l.id === 'r15');
  const r34 = lessons.find((l) => l.id === 'r34');
  assert.equal(r15.words[1].he, NAME_ABBREV);
  assert.equal(r34.words[0].he, NAME_ABBREV);
  const clips = JSON.parse(fs.readFileSync(path.join(root, 'data/vocab/clip-lookup.json'), 'utf8'));
  const blob = JSON.stringify(clips);
  assert.ok(!blob.includes('p6584b7dc') && !blob.includes('p7cb5e293'));
  const sk = (s) => String(s).replace(/[֑-ׇ]/g, '');
  const walk = (o, acc = []) => {
    if (typeof o === 'string') { if (sk(o).includes('יהוה') || o === 'יהוה') acc.push(o); }
    else if (Array.isArray(o)) o.forEach((v) => walk(v, acc));
    else if (o && typeof o === 'object') Object.values(o).forEach((v) => walk(v, acc));
    return acc;
  };
  assert.deepEqual(walk(clips), []);
});

test('versionLabel: says one version is shown when movements vary or are unchecked', () => {
  assert.equal(versionLabel({ denominations: { orthodox: { use: 'as-written' }, conservative: { use: 'varies' }, reform: { use: 'varies' } } }).oneVersion, true);
  assert.equal(versionLabel({ denominations: { orthodox: { use: 'unknown' }, conservative: { use: 'unknown' }, reform: { use: 'unknown' } } }).oneVersion, true);
  assert.equal(versionLabel({ denominations: { orthodox: { use: 'as-written' }, conservative: { use: 'as-written' }, reform: { use: 'as-written' } } }).oneVersion, false);
  assert.equal(versionLabel(null).oneVersion, true);
});

test('allowlist gate: no new or extra occurrences of the name in audio targets, vocab items, Latin spellings or respellings', () => {
  const al = JSON.parse(fs.readFileSync(path.join(root, 'tools/sensitivity/allowlist.json'), 'utf8')).entries;
  const key = (e) => `${e.file}|${e.key}|${e.cls}|${e.kind}`;
  const allowed = new Map(al.map((e) => [key(e), e]));
  for (const e of al) assert.ok(e.reason && e.status, `allowlist entry needs status and reason: ${key(e)}`);
  const gated = new Set(['audio-target', 'vocab-item', 'latin-spelling', 'respell-as-written']);
  const found = audit(root).filter((f) => gated.has(f.cls));
  const bad = [];
  for (const [k, n] of summarize(found)) {
    const a = allowed.get(k);
    if (!a) bad.push(`NEW ${k} x${n}`);
    else if (n > a.max) bad.push(`MORE ${k} x${n} (allowed ${a.max})`);
  }
  assert.deepEqual(bad, [], 'unexpected divine-name occurrences; fix the data or (if the convention allows it) add an allowlist entry with a reason');
});

test('no speak set item and no flashcard-style vocab deck entry offers the name as the item to say', () => {
  const dir = path.join(root, 'data/speak/sets');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const items = j.items || j.words || [];
    for (const it of items) assert.equal(isNameVocabItem(it), false, `${f}: ${it.id}`);
  }
  const order = fs.readFileSync(path.join(root, 'data/vocab/deck-order.json'), 'utf8');
  assert.ok(!/p6584b7dc|p7cb5e293/.test(order), 'the Name recognition items must not be in the flashcard deck order');
});

test('the daily Say it card never offers the name', () => {
  const pool = [
    { id: 'a', he: NAME, translit: 'adonai', set: 's' },
    { id: 'b', he: NAME_PLAIN, translit: 'adonai', set: 's' },
    ...Array.from({ length: 8 }, (_, i) => ({ id: 'w' + i, he: 'שָׁלוֹם'.repeat(1) + 'א'.repeat(i + 1), translit: 'x', set: 's' })),
  ];
  const card = buildDailyCard({ date: '2026-11-04', pool });
  assert.ok(card.items.length > 0);
  for (const it of card.items) assert.equal(isNameVocabItem(it), false);
  assert.ok(!card.items.some((it) => it.id === 'a' || it.id === 'b'));
});

test('English UI strings in src name God only where listed (a "G-d" setting is a recommendation, see CONVENTIONS.md)', () => {
  const hits = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'tools') walk(p); } else if (e.name === 'names.js') continue; else if (/\.(js|mjs)$/.test(e.name)) { const t = fs.readFileSync(p, 'utf8'); if (/\b(God|LORD)\b/.test(t)) hits.push(path.relative(root, p).split(path.sep).join('/')); } } };
  walk(path.join(root, 'src'));
  const expected = ['src/morning/plan.js', 'src/shell/router.js', 'src/curriculum/calendar.quickadd.js' /* the Shema's English in the calendar reminder text */];
  const extra = hits.filter((h) => !expected.includes(h));
  assert.deepEqual(extra, [], 'new English UI text uses the word God; route it through englishGod() from src/shell/names.js');
});

// ---- one shared speech rule: bare, maqaf-compound and prefixed forms; no written name reaches a voice ----
const MAQAF = '\u05BE';

test('speechText substitutes inside maqaf compounds and prefixed forms, keeps the maqaf and the prefix as written', () => {
  const compound = `כְּבוֹד${MAQAF}${NAME}`;
  assert.equal(speechText(compound), `כְּבוֹד${MAQAF}${SPOKEN_NAME}`);
  assert.equal(speechText(`${NAME}${MAQAF}${NAME_PLAIN}`), `${SPOKEN_NAME}${MAQAF}${SPOKEN_NAME}`);
  assert.equal(speechText(`x${MAQAF}${LA_NAME} y`), `x${MAQAF}${LA_NAME.slice(0, 2)}${SPOKEN_NAME} y`);
  assert.equal(speechText(`${NAME}\u05C3`), `${SPOKEN_NAME}\u05C3`, 'sof pasuq after the name is kept');
  assert.equal(speechText('כְּבוֹד'), 'כְּבוֹד', 'other words are untouched');
  assert.equal(speechText(speechText(compound)), speechText(compound), 'idempotent');
  // display is not speech: a name inside a compound is left as written in abbrev mode
  assert.equal(displayHebrew(compound, 'abbrev'), compound);
  assert.ok(findName(compound).some((h) => h.compound && h.kind === 'exact'));
});

test('speech rule over every registry and reader Hebrew string: zero written-name occurrences reach speech', () => {
  const J = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
  const strings = [];
  for (const e of J('data/corpus/registry.json').entries) for (const l of String(e.he).split('\n')) strings.push(l);
  for (const f of fs.readdirSync(path.join(root, 'data/corpus/reader'))) {
    const r = J('data/corpus/reader/' + f);
    for (const v of r.verses) { if (typeof v.he === 'string') strings.push(v.he); for (const t of v.tokens || []) if (typeof t.he === 'string') strings.push(t.he); }
  }
  assert.ok(strings.length >= 159, `expected at least 159 strings, got ${strings.length}`);
  let withName = 0;
  for (const str of strings) {
    const hits = findName(str).filter((h) => h.kind !== 'abbrev');
    if (hits.length) withName++;
    const spoken = speechText(str);
    // no word (or maqaf part) of the spoken text is the name or a prefixed name
    assert.deepEqual(findName(spoken).filter((h) => h.kind !== 'abbrev'), [], `written name reaches speech: ${str}`);
    // the rule changes nothing when the string has no name
    if (!hits.length) assert.equal(spoken, str);
  }
  assert.ok(withName > 0, 'the corpus contains the name, so this test is not vacuous');
});

test('the Torah reader and /read use the shared rule from names.js', async () => {
  const model = await import('../src/torahreader/model.js');
  const sample = `כְּבוֹד${MAQAF}${NAME} ${NAME} ${LA_NAME}`;
  assert.equal(model.spokenText(sample), speechText(sample));
  const read = fs.readFileSync(path.join(root, 'src/corpus/read.view.js'), 'utf8');
  assert.match(read, /import \{ speechText \} from '\.\.\/shell\/names\.js'/);
  assert.ok(!/SPOKEN_ADONAI|TETRAGRAMMATON_SKELETON/.test(read), '/read keeps no private copy of the rule');
  assert.ok(!/split\(TETRAGRAMMATON\)/.test(fs.readFileSync(path.join(root, 'src/torahreader/model.js'), 'utf8')));
});

test('writeGodAsGd: only the word "God" is rewritten; upper-case "GOD" (for example "THE LORD OUR GOD") is left as is on every route', () => {
  assert.equal(englishGod('THE LORD OUR GOD', true), 'THE LORD OUR GOD');
  assert.equal(englishGod('The LORD our God', true), 'The LORD our G-d');
});

test('morning destination title honors the learner English spelling setting', async () => {
  const { MORNING_TITLE, uiEnglish } = await import('../src/shell/names.js');
  assert.equal(uiEnglish({ settings: { get: () => true } }, MORNING_TITLE), 'Start with G-d');
  assert.equal(uiEnglish({ settings: { get: () => false } }, MORNING_TITLE), MORNING_TITLE);
});
