// H10 export my data: CSV beside the existing JSON backup; import stays the JSON backup (Settings restore, #/move).
import test from 'node:test';
import assert from 'node:assert/strict';
import { cell, toCSV, cardsCSV, lessonsCSV, inventory } from '../src/platform/export.js';
import { review, newCard } from '../src/curriculum/srs.js';
import { createStore, createMemoryStorage } from '../src/store.js';

test('CSV cells are quoted when needed and formulas are defused', () => {
  assert.equal(cell('plain'), 'plain');
  assert.equal(cell('a,b'), '"a,b"');
  assert.equal(cell('say "shalom"'), '"say ""shalom"""');
  assert.equal(cell('=HYPERLINK(1)'), "'=HYPERLINK(1)");
  assert.equal(cell('-3'), '-3');
  assert.equal(cell(null), '');
  assert.equal(toCSV([['a', 'b'], [1, 'x\ny']]), 'a,b\r\n1,"x\ny"\r\n');
});

test('review cards and lessons export with dates and the answer log', () => {
  let c = newCard({ id: 'letter:bet', kind: 'letter', now: 0 });
  c = review(c, 3, Date.UTC(2026, 10, 10), { init: [0.4, 1.2, 3, 8], grow: 1 });
  const csv = cardsCSV({ 'srs.cards': { [c.id]: c }, 'srs.vocab': [{ id: 'v,1', state: 'new', due: 0 }] });
  const lines = csv.trim().split('\r\n');
  assert.equal(lines[0], 'deck,card,kind,state,stability_days,difficulty,reviews,lapses,last_review,next_review,answer_log');
  assert.match(lines[1], /^Lessons,letter:bet,letter,review,3\.000,5\.500,1,0,2026-11-10T00:00:00\.000Z,2026-11-13T00:00:00\.000Z,2026-11-10:3$/);
  assert.match(lines[2], /^Dictionary and Word Sprint,"v,1",,new,/);
  assert.equal(lessonsCSV({ completed: { r02: Date.UTC(2026, 10, 2), r01: Date.UTC(2026, 10, 1) } }), 'lesson,completed_at\r\nr01,2026-11-01T00:00:00.000Z\r\nr02,2026-11-02T00:00:00.000Z\r\n');
  assert.equal(lessonsCSV(null), 'lesson,completed_at\r\n');
  assert.deepEqual(inventory({ a: 1, b: 'xyz' }).map((x) => x.key), ['b', 'a']);
});

test('My Data page lists what is stored and offers JSON, two CSVs and the existing ways back in', async () => {
  const { N, tick } = await import('./torahread.fakedom.js');
  const V = await import('../src/platform/mydata.view.js');
  const store = createStore({ storage: createMemoryStorage() });
  store.set('curriculum.progress', { completed: { r01: 1 } });
  const root = new N('main'); V.mount(root, { store }); await tick(10);
  const text = root.textContent;
  for (const s of ['My Data', 'backup file (JSON)', 'Review cards as a spreadsheet (CSV)', 'Lessons completed as a spreadsheet (CSV)', 'curriculum.progress', 'Nothing is sent anywhere']) assert.ok(text.includes(s), s);
  assert.ok(root.all((n) => n.tag === 'a').some((a) => a.attrs.href === '#/move'));
  assert.ok(root.all((n) => n.tag === 'a').some((a) => a.attrs.href === '#/settings'));
  assert.equal(root.queryAll('h1').length, 1);
});
