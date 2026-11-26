// Printable workbooks per belt (25 Nov 2026 critique, item 7): built only from the app's own data, so they cannot drift.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BELTS, CHAPTERS, buildWorkbook, bookCompanion, clusters, describe, matchSet, PRAYER_MAX } from '../src/workbook/model.js';
import { transliterate } from '../src/pronunciation/transliterate.js';

const j = (p) => JSON.parse(readFileSync(new URL('../data/' + p, import.meta.url), 'utf8'));
const books = j('books/index.json').books;
const bookData = Object.fromEntries(books.map((b) => [b.id, j(`books/${b.id}.json`)]));
const SRC = { lessons: j('curriculum/lessons.json').lessons, letters: j('letters/letters.json'), niqqud: j('pronunciation/niqqud.json').records, registry: j('corpus/registry.json').entries, books, bookData, transliterate };

test('every belt with lessons gives a workbook with something to print', () => {
  for (const b of BELTS) { const wb = buildWorkbook(b.id, SRC); assert.ok(wb.lessons.length > 0, b.id); assert.ok(wb.chapters.length >= 2, `${b.id}: ${describe(wb)}`); }
});

test('the white belt covers exactly its lessons\' letters and vowels, with stroke paths', () => {
  const wb = buildWorkbook('white', SRC);
  const lessons = SRC.lessons.filter((l) => l.level === 'white');
  const letters = new Set(lessons.flatMap((l) => l.letters));
  const ch = wb.chapters.find((c) => c.id === 'letters');
  assert.deepEqual(new Set(ch.letters.map((l) => l.id)), letters);
  assert.ok(ch.letters.every((l) => l.strokes.length > 0 && l.strokes.every((s) => /^M/.test(s.path))));
  assert.equal(ch.letters.find((l) => l.id === 'shin').he, 'שׁ');
});

test('vowel drills put each sign on the belt\'s letters and answer in the chosen reading style', () => {
  const ash = buildWorkbook('white', { ...SRC, tradition: 'ashkenazi' }).chapters.find((c) => c.id === 'vowels');
  const isr = buildWorkbook('white', { ...SRC, tradition: 'israeli' }).chapters.find((c) => c.id === 'vowels');
  const kA = ash.rows.find((r) => r.id === 'kamatz'), kI = isr.rows.find((r) => r.id === 'kamatz');
  assert.ok(kA.cells.every((c) => /ָ/.test(c.he)));
  assert.notDeepEqual(kA.cells.map((c) => c.sound), kI.cells.map((c) => c.sound)); // Ashkenazi kamatz is "o"
});

test('word building tiles hold exactly the word\'s letters, never already in order', () => {
  const ch = buildWorkbook('yellow', SRC).chapters.find((c) => c.id === 'build');
  for (const x of ch.items) {
    assert.deepEqual([...x.tiles].sort(), [...clusters(x.answer)].sort());
    assert.notEqual(x.tiles.join(''), clusters(x.answer).join(''), x.answer);
  }
});

test('match sets: every item has one meaning and the key is right', () => {
  const s = matchSet([{ he: 'א', en: 'one' }, { he: 'ב', en: 'two' }, { he: 'ג', en: 'three' }], 'seed');
  for (const a of s.answers) { const [n, k] = a.split('-'); assert.equal(s.meanings.find((m) => m.key === k).en, ['one', 'two', 'three'][n - 1]); }
});

test('prayer lines never spell out the divine name, carry transliteration, and are capped', () => {
  const wb = buildWorkbook('intermediate', SRC);
  const ch = wb.chapters.find((c) => c.id === 'prayers');
  assert.ok(ch.lines.length <= PRAYER_MAX); assert.ok(ch.more > 0);
  for (const l of ch.lines) { assert.doesNotMatch(l.he.replace(/[֑-ׇ]/g, ''), /יהוה/); assert.ok(l.translit.length > 0, l.id); }
});

test('every one of the 63 books gets a companion whose answers are true to the book', () => {
  for (const b of books) {
    const c = bookCompanion(bookData[b.id], b.id); assert.ok(c, b.id);
    const pages = bookData[b.id].pages;
    for (const w of c.where) assert.equal(pages.find((p) => p.n === w.page).en, w.en);
    for (const a of c.match.answers) { const [n, k] = a.split('-'); const item = c.match.items[n - 1]; assert.equal(pages.find((p) => p.he === item.he).en, c.match.meanings.find((m) => m.key === k).en); }
    if (c.hunt) { const n = pages.reduce((t, p) => t + p.he.replace(/[֑-ׇ]/g, '').replace(/[^א-ת ]/g, '').split(/\s+/).filter((x) => x === c.hunt.he).length, 0); assert.equal(n, c.hunt.count, b.id); }
  }
});

test('chapters can be chosen, and the belt picks its books by level', () => {
  const wb = buildWorkbook('white', { ...SRC, chapters: ['letters'] });
  assert.deepEqual(wb.chapters.map((c) => c.id), ['letters']);
  const all = buildWorkbook('white', { ...SRC, chapters: ['books'] });
  assert.deepEqual(all.chapters[0].books.map((b) => b.id), books.filter((b) => b.level === 'Grade 1').map((b) => b.id));
  assert.equal(buildWorkbook('white', { ...SRC, chapters: ['books'], bookIds: 'all' }).chapters[0].books.length, 63);
  assert.equal(CHAPTERS.length, 6);
});
