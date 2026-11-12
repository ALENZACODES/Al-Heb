// J4 printable worksheets from the learner's lessons (lesson data only), printed with a print stylesheet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSheet, currentLesson, seededOrder } from '../src/platform/worksheet.js';

const L = JSON.parse(readFileSync(new URL('../data/curriculum/lessons.json', import.meta.url), 'utf8')).lessons;
const letters = JSON.parse(readFileSync(new URL('../data/letters/letters.json', import.meta.url), 'utf8'));
const letterList = Array.isArray(letters) ? letters : letters.letters;

test('the current lesson is the first not completed', () => {
  assert.equal(currentLesson(L, {}).id, L[0].id);
  assert.equal(currentLesson(L, { [L[0].id]: 1 }).id, L[1].id);
  const all = Object.fromEntries(L.map((l) => [l.id, 1]));
  assert.equal(currentLesson(L, all).id, L.at(-1).id);
});

test('the sheet holds only the lesson\'s own letters and words, and the answer key matches the shuffled meanings', () => {
  const lesson = L.find((l) => l.id === 'r03');
  const s = buildSheet(lesson, letterList);
  assert.deepEqual(s.letters.map((x) => x.name), lesson.letters.map((id) => letterList.find((l) => l.id === id).name));
  assert.deepEqual(s.copy.map((w) => w.en), lesson.words.map((w) => w.en));
  for (const a of s.match.answers) {
    const [n, key] = a.split(' ');
    assert.equal(s.match.meanings.find((m) => m.key === key).en, s.copy[Number(n) - 1].en);
  }
  assert.deepEqual(seededOrder(5, 'r03'), seededOrder(5, 'r03'), 'a reprint keeps the same order');
  for (const l of L) for (const w of buildSheet(l, letterList).copy) assert.doesNotMatch(w.he, /יְהוָה|יהוה/);
});

test('the page has a lesson picker, a Print button and a print stylesheet; Workbook links to it', async () => {
  const { N, tick, memStore } = await import('./torahread.fakedom.js');
  const V = await import('../src/platform/worksheet.view.js');
  const store = memStore(); store.m['curriculum.progress'] = { completed: { [L[0].id]: 1 } };
  const root = new N('main'); const un = V.mount(root, { store }); await tick(120);
  assert.match(root.textContent, new RegExp(L[1].title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.ok(root.all((n) => n.tag === 'button').some((b) => /Print/.test(b.textContent)));
  assert.ok(root.queryAll('label').some((l) => l.attrs.for === 'ws-lesson'));
  un();
  const src = readFileSync(new URL('../src/platform/worksheet.view.js', import.meta.url), 'utf8');
  assert.match(src, /@media print/);
  assert.match(readFileSync(new URL('../src/shell/workbook.view.js', import.meta.url), 'utf8'), /#\/worksheet/);
});
