import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cellsOf } from '../src/curriculum/hebrew.js';
import {
  LEVELS, SUGGEST_AFTER, EXCLUDED, FINAL_OF, FINAL_FORM, sofitProblems, applyFinalForm, knownLetters, eligibleWords, suggestLevel, pickNext,
  buildBank, letterIds, plainOf, isSimpleWord, vowelMarkCount
} from '../src/wordtrace/bank.js';
import { build } from '../src/wordtrace/build.mjs';
import { expectedCells, buildTray, createBoard, composeCell, MARKS, MARK_IDS, hasNiqqud, markLabel } from '../src/wordtrace/niqqud.js';
import { GUIDES, MISS_LIMIT, judgeRound, createFade, rateWord, applyRating, dueWordIds, recordProgress, saveOutcome, cardId, CARDS_KEY, PROGRESS_KEY } from '../src/wordtrace/flow.js';

const rd = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const bank = rd('data/wordtrace/words.json');
const letters = rd('data/letters/letters.json');
const letterIdsAll = new Set(letters.map(l => l.id));
const niqqudData = rd('data/pronunciation/niqqud.json');
const SHALOM = bank.words.find(w => w.plain === 'שלום' && w.level === 'prayer').he;

// ------------------------------------------------------------------ bank data
test('data/wordtrace/words.json is current (rebuilding from course data gives the same file)', () => {
  assert.deepEqual(build(), bank);
});

test('every bank word is a simple pointed word whose letters all have stroke data in both scripts', () => {
  assert.ok(bank.words.length > 150);
  const seen = new Set();
  for (const w of bank.words) {
    assert.ok(isSimpleWord(w.he), w.he);
    assert.ok(!seen.has(w.he), 'duplicate ' + w.he); seen.add(w.he);
    assert.deepEqual(w.letters, letterIds(w.he)); assert.equal(w.n, w.letters.length); assert.equal(w.plain, plainOf(w.he));
    assert.ok(w.en && typeof w.en === 'string', 'gloss for ' + w.he);
    assert.ok(vowelMarkCount(w.he) >= 1, 'has a vowel mark ' + w.he);
    for (const id of w.letters) {
      assert.ok(letterIdsAll.has(id), id);
      const l = letters.find(x => x.id === id);
      assert.ok(l.print.strokes.length && l.cursive.strokes.length, id);
    }
    assert.ok(['lesson', 'vocab', 'prayerwords'].includes(w.src));
    assert.ok(['course-data', 'wiktionary', 'wiktionary-needs-review'].includes(w.pointing));
  }
});

test('levels: 2-letter and 3-letter by length, prayer list for the rest; progression is non-empty', () => {
  assert.deepEqual(LEVELS.map(l => l.id), ['two', 'three', 'prayer']);
  for (const w of bank.words) {
    if (w.level === 'two') assert.equal(w.n, 2, w.he);
    if (w.level === 'three') assert.equal(w.n, 3, w.he);
    if (w.level === 'prayer') assert.ok(w.n >= 2 && w.n <= 6, w.he);
  }
  for (const lv of LEVELS) assert.ok(bank.words.filter(w => w.level === lv.id).length >= 20, lv.id);
  const shalom = bank.words.find(w => w.he === SHALOM);
  assert.equal(shalom.n, 4); assert.ok(shalom.letters.includes('mem-final'));
  assert.ok(bank.words.some(w => w.src === 'prayerwords'));
});

test('the Tetragrammaton is never offered for writing practice', () => {
  for (const w of bank.words) assert.ok(!EXCLUDED.includes(w.he));
  assert.ok(!bank.words.some(w => w.plain === 'יהוה'));
});

test('sofit: final forms appear only as the last letter in every bank word, and a regular form never ends a word', () => {
  for (const w of bank.words) assert.deepEqual(sofitProblems(w.he), [], w.he);
  assert.ok(bank.words.some(w => FINAL_OF[w.letters.at(-1)]), 'bank contains words ending in a final form');
  assert.deepEqual(sofitProblems('מםא'), ['final mem-final at position 2 of 3']);
  assert.deepEqual(sofitProblems('אמ'), ['mem is last but not in final form']);
});

test('applyFinalForm converts only the last letter and keeps points', () => {
  assert.equal(applyFinalForm('שלומ'), 'שלום');
  assert.equal(applyFinalForm('בא'), 'בא');
  assert.equal(applyFinalForm('מֶלֶכ'), 'מֶלֶך');
  for (const [fin, reg] of Object.entries(FINAL_OF)) assert.equal(FINAL_FORM[reg], fin);
});

// ------------------------------------------------------------------ eligibility and picking
test('knownLetters: a final form is known when its regular form is; eligibility uses only known letters', () => {
  const k = knownLetters(['mem', 'bet'], ['alef']);
  assert.ok(k.has('mem-final') && k.has('alef') && !k.has('kaf-final'));
  const el = eligibleWords(bank, k, { level: 'two' });
  assert.ok(el.length > 0);
  for (const w of el) assert.ok(w.letters.every(id => k.has(id)), w.he);
  assert.equal(eligibleWords(bank, new Set(), { level: 'two' }).length, 0);
  assert.equal(eligibleWords(bank, null, { level: 'two' }).length, bank.words.filter(w => w.level === 'two').length, 'null = any letters');
});

test('suggestLevel moves up after SUGGEST_AFTER words are done at a level; pickNext prefers due words, then unseen', () => {
  const all = null;
  assert.equal(suggestLevel(bank, {}, 'print', all), 'two');
  const twos = bank.words.filter(w => w.level === 'two').slice(0, SUGGEST_AFTER);
  const prog = { print: Object.fromEntries(twos.map(w => [w.he, { done: 1 }])) };
  assert.equal(suggestLevel(bank, prog, 'print', all), 'three');
  assert.equal(suggestLevel(bank, prog, 'cursive', all), 'two', 'progress is per script');
  const words = bank.words.filter(w => w.level === 'two');
  assert.equal(pickNext(words, { dueIds: [words[5].he] }).he, words[5].he);
  assert.equal(pickNext(words, { progress: { print: { [words[0].he]: { done: 1 } } }, script: 'print' }).he, words[1].he);
  assert.notEqual(pickNext(words, { avoid: words[0].he }).he, words[0].he);
  assert.equal(pickNext([], {}), null);
});

test('buildBank is deterministic and applies the 4+ letter siddur filter', () => {
  const src = { lessons: [{ id: 'x1', track: 'read', letters: ['alef'], words: [
    { he: 'אָב', en: 'father' }, { he: 'בְּרָכָה', en: 'blessing' }, { he: 'קַרְטִיס', en: 'ticket' }] }],
    vocab: [], prayerWords: [], siddurText: 'ברכה אב' };
  const a = buildBank(src), b = buildBank(src);
  assert.deepEqual(a, b);
  assert.deepEqual(a.words.map(w => [w.plain, w.level]), [['אב', 'two'], ['ברכה', 'prayer']]);
  assert.deepEqual(a.lessonLetters, { x1: ['alef'] });
});

// ------------------------------------------------------------------ niqqud
test('MARKS code points agree with data/pronunciation/niqqud.json', () => {
  for (const id of MARK_IDS) {
    const rec = niqqudData.records.find(r => r.id === id);
    assert.ok(rec, id);
    const cp = 'U+' + MARKS[id].char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    assert.ok(rec.codepoints.includes(cp), `${id} ${cp} in ${rec.codepoints}`);
  }
});

test('expectedCells: shalom has shin dot + kamatz, lamed none, vav cholam, final mem none', () => {
  const c = expectedCells(SHALOM);
  assert.equal(c.length, 4);
  assert.deepEqual(c.map(x => x.base), ['shin', 'lamed', 'vav', 'mem-final']);
  assert.deepEqual(c[0].marks, ['kamatz', 'shin-dot']);
  assert.deepEqual(c[1].marks, []);
  assert.deepEqual(c[2].marks, ['cholam']);
  assert.ok(hasNiqqud(SHALOM));
  assert.equal(hasNiqqud('אב'), false);
});

test('tray holds every needed mark, at most 6, with plausible extras, in a fixed order', () => {
  for (const w of bank.words) {
    const tray = buildTray(w.he);
    const need = new Set(expectedCells(w.he).flatMap(c => c.marks));
    assert.ok(tray.length <= Math.max(6, need.size), w.he);
    for (const m of need) assert.ok(tray.includes(m), `${w.he} tray misses ${m}`);
    assert.deepEqual(tray, [...tray].sort((a, b) => MARK_IDS.indexOf(a) - MARK_IDS.indexOf(b)));
  }
  assert.ok(buildTray(SHALOM).length > 3, 'distractors added');
});

test('board scoring: exact set per cell, toggle removes, extras and misses are wrong, reveal fills the answer', () => {
  const b = createBoard(SHALOM);
  assert.equal(b.place(0, 'kamatz'), true);
  assert.equal(b.place(0, 'kamatz'), false, 'second tap removes');
  b.place(0, 'kamatz'); b.place(0, 'shin-dot'); b.place(2, 'cholam');
  b.place(1, 'patach'); // wrong: lamed should be bare
  let r = b.check();
  assert.equal(r.correct, 3); assert.equal(r.total, 4); assert.equal(r.perfect, false);
  assert.deepEqual(r.perCell[1].extra, ['patach']);
  b.place(1, 'patach'); assert.equal(b.check().perfect, true);
  const c = createBoard(SHALOM); c.place(0, 'kamatz'); // missing shin dot
  assert.deepEqual(c.check().perCell[0].missing, ['shin-dot']);
  const d = createBoard(SHALOM); d.reveal(); assert.equal(d.check().perfect, true);
  d.clear(); assert.equal(d.check().correct, 2, 'lamed and mem-final are bare so already right');
  assert.throws(() => b.place(9, 'kamatz')); assert.throws(() => b.place(0, 'nope'));
});

test('shuruk is the dagesh on a vav; composeCell orders shin dot, dagesh, vowel', () => {
  const c = expectedCells('בוּ');
  assert.deepEqual(c[1].marks, ['dagesh']);
  assert.equal(composeCell('ש', ['kamatz', 'shin-dot']), 'שָׁ');
  assert.equal(composeCell('ב', ['kamatz', 'dagesh']), 'בָּ');
  assert.ok(markLabel('kamatz').includes('below')); assert.ok(markLabel('cholam').includes('above'));
});

// ------------------------------------------------------------------ flow, rating, SRS hook
test('judgeRound: forced strokes or MISS_LIMIT mistakes are a miss; assisted is neither miss nor clean', () => {
  assert.deepEqual(judgeRound({ mistakes: 0, forced: 0, assisted: false }), { missed: false, clean: true, assisted: false });
  assert.equal(judgeRound({ mistakes: MISS_LIMIT - 1, forced: 0, assisted: false }).clean, true);
  assert.equal(judgeRound({ mistakes: MISS_LIMIT, forced: 0, assisted: false }).missed, true);
  assert.equal(judgeRound({ mistakes: 0, forced: 1, assisted: false }).missed, true);
  const a = judgeRound({ mistakes: 9, forced: 3, assisted: true });
  assert.deepEqual([a.missed, a.clean, a.assisted], [false, false, true]);
});

test('fade: solid -> dotted -> blank, a miss repeats the level, assisted does not advance, finished only after a clean blank round', () => {
  assert.deepEqual([...GUIDES], ['solid', 'dotted', 'blank']);
  const f = createFade();
  assert.equal(f.guide, 'solid');
  let r = f.finishRound({ mistakes: 0, forced: 0, assisted: false }); assert.equal(r.nextGuide, 'dotted');
  r = f.finishRound({ mistakes: 5, forced: 0, assisted: false }); assert.equal(f.guide, 'dotted'); assert.equal(r.missed, true);
  r = f.finishRound({ mistakes: 0, forced: 0, assisted: true }); assert.equal(f.guide, 'dotted');
  r = f.finishRound({ mistakes: 1, forced: 0, assisted: false }); assert.equal(f.guide, 'blank'); assert.equal(f.finished, false);
  r = f.finishRound({ mistakes: 0, forced: 0, assisted: false }); assert.equal(r.finished, true); assert.equal(r.nextGuide, null);
  assert.deepEqual(f.stats(), { rounds: 5, missedRounds: 1, assistedRounds: 1, finished: true, guide: 'blank' });
});

test('rateWord: 1 for missed rounds or <50% vowels, 2 for assisted/skipped/some wrong vowels, 3 clean', () => {
  const base = { missedRounds: 0, assistedRounds: 0, skipped: false, niqqud: { correct: 4, total: 4 } };
  assert.equal(rateWord(base), 3);
  assert.equal(rateWord({ ...base, missedRounds: 1 }), 1);
  assert.equal(rateWord({ ...base, niqqud: { correct: 1, total: 4 } }), 1);
  assert.equal(rateWord({ ...base, niqqud: { correct: 3, total: 4 } }), 2);
  assert.equal(rateWord({ ...base, assistedRounds: 1 }), 2);
  assert.equal(rateWord({ ...base, skipped: true }), 2);
  assert.equal(rateWord({ ...base, niqqud: null }), 3, 'word with no vowels to place');
});

test('SRS hook: a miss creates a card and schedules it; a clean pass only reviews an existing card; due list is per script', () => {
  const now = Date.UTC(2026, 10, 3);
  const id = cardId('print', SHALOM);
  assert.equal(id, 'wordtrace:print:' + SHALOM);
  let cards = applyRating({}, id, 3, now);
  assert.deepEqual(cards, {}, 'clean first pass creates nothing');
  cards = applyRating(cards, id, 1, now);
  assert.equal(cards[id].kind, 'wordtrace'); assert.equal(cards[id].lapses >= 0, true);
  assert.deepEqual(dueWordIds(cards, 'print', now + 11 * 60 * 1000), [SHALOM], 'Again => due in about 10 minutes');
  assert.deepEqual(dueWordIds(cards, 'print', now), [], 'not due yet');
  assert.deepEqual(dueWordIds(cards, 'cursive', now + 1e9), [], 'cursive has its own cards');
  const later = applyRating(cards, id, 3, now + 11 * 60 * 1000);
  assert.ok(later[id].due > cards[id].due, 'a Good review pushes it out');
  assert.equal(cards[id].reps, 1, 'input is not mutated');
});

test('recordProgress counts done/missed/best per script', () => {
  let p = recordProgress({}, { he: 'x', script: 'print', rating: 1, now: 0 });
  p = recordProgress(p, { he: 'x', script: 'print', rating: 3, now: 1000 });
  assert.deepEqual([p.print.x.done, p.print.x.missed, p.print.x.best], [2, 1, 3]);
  assert.equal(p.cursive, undefined);
});

test('saveOutcome works with a sync store and an async store, and survives a throwing store', async () => {
  const mk = (async) => { const m = {}; return { m, get: (k, d) => { const v = m[k] === undefined ? d : m[k]; return async ? Promise.resolve(v) : v; }, set: (k, v) => { m[k] = v; return async ? Promise.resolve() : undefined; } }; };
  for (const async of [false, true]) {
    const s = mk(async);
    const r = await saveOutcome(s, { he: SHALOM, script: 'print', rating: 1 }, 5000);
    assert.ok(r.card); assert.equal(s.m[PROGRESS_KEY].print[SHALOM].done, 1); assert.ok(s.m[CARDS_KEY][cardId('print', SHALOM)]);
    const r3 = await saveOutcome(s, { he: 'other', script: 'print', rating: 3 }, 6000);
    assert.equal(r3.card, null); assert.equal(s.m[CARDS_KEY]['wordtrace:print:other'], undefined);
  }
  const bad = { get() { throw new Error('boom'); }, set() { throw new Error('boom'); } };
  const r = await saveOutcome(bad, { he: 'x', script: 'print', rating: 1 }, 1);
  assert.ok(r.progress.print.x);
  await saveOutcome(null, { he: 'x', script: 'print', rating: 1 }, 1);
});
