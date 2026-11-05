import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { unpoint, shownWord, spokenForm, hasDivineName, wordsOfLine, wordsWithStops, pointCount } from '../src/torahread/pointing.js';
import { loadTorahRead } from '../src/torahread/data.js';

const J = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const course = await loadTorahRead();
const HE = /[֐-׿]/;
const CANT = /[֑-֯]/;

test('unpoint removes points, dagesh, dots, verse end; maqaf becomes a space', () => {
  assert.equal(unpoint('לֹא־תִקֹּם וְלֹא־תִטֹּר׃'), 'לא תקם ולא תטר');
  assert.equal(unpoint('שְׁמַע יִשְׂרָאֵל'), 'שמע ישראל');
  assert.equal(pointCount(unpoint('בְּרֵאשִׁית')), 0);
});
test('shownWord: level 1 pointed, level 3 bare, level 2 fades by position', () => {
  const w = 'בָּרָא';
  assert.equal(shownWord(w, 1, { level: 1 }).text, w);
  assert.equal(shownWord(w, 1, { level: 3 }).pointed, false);
  const s1 = [0, 1, 2, 3, 4, 5].map((i) => shownWord(w, i, { level: 2, stage: 1 }).pointed);
  const s2 = [0, 1, 2, 3, 4, 5].map((i) => shownWord(w, i, { level: 2, stage: 2 }).pointed);
  assert.deepEqual(s1, [true, true, false, true, true, false]);
  assert.deepEqual(s2, [true, false, false, true, false, false]);
  assert.ok(s2.filter(Boolean).length < s1.filter(Boolean).length);
});
test('divine name is replaced by Adonai for the spoken form, prefixes included', () => {
  assert.ok(hasDivineName('יְהוָה'));
  assert.ok(hasDivineName('לַיהוָה'));
  assert.equal(spokenForm('לַיהוָה'), 'לַאֲדֹנָי');
  assert.ok(!hasDivineName('אֲדֹנָי'));
});

test('verses.json: pointed Hebrew, no cantillation, PD labels and sources recorded', () => {
  const v = J('data/torahread/verses.json').entries;
  assert.equal(v.length, 7);
  for (const e of v) {
    assert.ok(HE.test(e.he) && !CANT.test(e.he), e.id);
    assert.ok(pointCount(e.he) >= wordsOfLine(e.he).length, `${e.id} is pointed`);
    assert.equal(e.englishLicense, 'Public Domain');
    assert.match(e.englishSource, /JPS 1917/);
    assert.match(e.license, /tanach\.us\/License\.html/);
    assert.match(e.sourceUrl, /^https:\/\/tanach\.us\/Books\//);
    assert.equal(e.proofread, false);
    assert.ok(e.english.length > 10);
  }
  const reg = J('data/corpus/registry.json').entries;
  assert.equal(v.find((x) => x.id === 'gen-1-1').he, 'בְּרֵאשִׁית בָּרָא אֱלֹהִים אֵת הַשָּׁמַיִם וְאֵת הָאָרֶץ׃');
  assert.ok(reg.find((r) => r.id === 'shema-1'));
});

test('words30.json: 30 entries sorted by count, pointed forms consistent with their spelling', () => {
  const w = J('data/torahread/words30.json');
  assert.equal(w.words.length, 30);
  for (let i = 1; i < 30; i++) assert.ok(w.words[i - 1].count >= w.words[i].count);
  assert.equal(w.words[0].unpointed, 'את');
  for (const x of w.words) {
    assert.equal(unpoint(x.pointed).replace(/ /g, ''), x.unpointed, x.unpointed);
    assert.ok(x.gloss.length > 1);
    for (const o of x.others) assert.equal(unpoint(o.he).replace(/ /g, ''), x.unpointed);
  }
  assert.match(w.glossNote, /CC BY-SA/);
});
test('words30 vocabId cross-references point at data/vocab entries with the same pointed form (read-only)', () => {
  const w = J('data/torahread/words30.json').words.filter((x) => x.vocabId);
  assert.ok(w.length >= 10);
  const rows = new Map(J('data/vocab/index.json').rows.map((r) => [r[0], r]));
  for (const x of w) assert.equal(rows.get(x.vocabId)[1].normalize('NFC'), x.pointed.normalize('NFC'), x.unpointed);
});

test('ladder: every item resolves and carries licence + attribution; the Torah blessings are present', () => {
  assert.equal(course.groups.map((g) => g.id).join(), 'priestly,shema,torah-blessings,verses');
  const keys = course.items.map((i) => i.key);
  for (const k of ['bless-priestly-1', 'bless-priestly-2', 'bless-priestly-3', 'shema-1', 'torah-barchu', 'torah-bless-1', 'torah-bless-2']) assert.ok(keys.includes(k), k);
  for (const i of course.items) { assert.ok(i.attribution && i.license, i.key); assert.ok(i.wordCount > 0); assert.equal(i.proofread, false); }
  assert.equal(new Set(keys).size, keys.length);
});

test('aliyah.json: blessing ids exist in the registry, certainty is explicit, unknowns are recorded, no Hebrew typed here', () => {
  const a = J('data/torahread/aliyah.json');
  const ids = a.steps.filter((s) => s.prayerId).map((s) => s.prayerId);
  assert.deepEqual(ids.slice(0, 3), ['torah-barchu', 'torah-bless-1', 'torah-bless-2']);
  for (const id of ids) assert.ok(course.corpus.getText(id), id);
  for (const s of a.steps) assert.ok(['common', 'varies', 'unknown'].includes(s.certainty), s.id);
  assert.equal(a.reviewed, false);
  for (const r of a.differences.rows) assert.equal(r.values.length, 3);
  assert.ok(a.differences.rows.some((r) => r.values.includes('unknown')));
  for (const f of ['aliyah', 'trope']) assert.ok(!HE.test(readFileSync(new URL(`../data/torahread/${f}.json`, import.meta.url), 'utf8')), `${f}.json has no typed Hebrew`);
  // ladder.json: Hebrew only as example words in the tips, each present in this course's own Torah data
  const tips = J('data/torahread/ladder.json').tips.join(' ');
  const pool = new Set([...J('data/torahread/words30.json').words.map((x) => x.unpointed), ...J('data/torahread/verses.json').entries.flatMap((e) => unpoint(e.he).split(/\s+/))]);
  const ex = tips.match(/[\u05D0-\u05EA]+/g) || [];
  assert.ok(ex.length >= 3);
  for (const e of ex) assert.ok(pool.has(e), `tip example ${e} occurs in the Torah data`);
});
test('trope.json: explainer present, marked unreviewed, points a beginner to a cantor', () => {
  const t = J('data/torahread/trope.json');
  assert.equal(t.reviewed, false);
  assert.ok(t.whyNotHere.length >= 3 && t.whatToDo.some((x) => /cantor/i.test(x)));
});

test('wordsWithStops: same words as wordsOfLine, and says which word the source gives a sof pasuq', () => {
  const line = 'שְׁמַע יִשְׂרָאֵל אֶחָד׃';
  assert.deepEqual(wordsWithStops(line).map((x) => x.word), wordsOfLine(line));
  assert.deepEqual(wordsWithStops(line).map((x) => x.stop), [false, false, true]);
  assert.deepEqual(wordsWithStops('בְּרֵאשִׁית בָּרָא').map((x) => x.stop), [false, false]);
});
