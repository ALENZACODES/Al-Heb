// Religious-content sensitivity checks: divine-name handling (see docs/sensitivity/CONVENTIONS.md).
// Not a ruling on practice: it pins today's known occurrences in tools/sensitivity/allowlist.json and fails on new ones.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit, summarize } from '../tools/sensitivity/audit.mjs';
import {
  classifyNameWord, findName, speechText, displayHebrew, displayTranslit, englishGod, isNameVocabItem, versionLabel,
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

test('speechText replaces the bare name with the spoken substitute and leaves prefixed forms for review', () => {
  assert.equal(speechText(`x ${NAME} y`), `x ${SPOKEN_NAME} y`);
  assert.equal(speechText(`${NAME_PLAIN}`), SPOKEN_NAME);
  assert.equal(speechText(`a ${LA_NAME}`), `a ${LA_NAME}`);
  assert.equal(speechText('no name here'), 'no name here');
  assert.equal(speechText(''), '');
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
  assert.equal(isNameVocabItem(null), false);
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
  const expected = ['src/morning/plan.js', 'src/shell/router.js'];
  const extra = hits.filter((h) => !expected.includes(h));
  assert.deepEqual(extra, [], 'new English UI text uses the word God; route it through englishGod() from src/shell/names.js');
});
