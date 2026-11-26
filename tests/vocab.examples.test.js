// Dictionary example sentences come from the app's own books and dialogues (25 Nov 2026 critique): the file is current, every
// example is a real line with its own English, and at most MAX per word.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildExamples, render, OUT, MAX, glossStems } from '../tools/vocab/build-examples.mjs';

const root = new URL('../', import.meta.url);
const j = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));

test('data/vocab/examples.json is current (node tools/vocab/build-examples.mjs)', () => {
  assert.equal(readFileSync(new URL(OUT, root), 'utf8'), render(buildExamples()));
});

test('every example is a real line of its book or dialogue, at most MAX per word', () => {
  const ex = j(OUT); const books = {}; const dialogues = Object.fromEntries((j('data/curriculum/dialogues.json').dialogues || []).map((d) => [d.id, d]));
  assert.ok(Object.keys(ex).length > 200);
  for (const [id, list] of Object.entries(ex)) {
    assert.ok(list.length >= 1 && list.length <= MAX, id);
    for (const x of list) {
      if (x.book) { books[x.book] ||= j(`data/books/${x.book}.json`); const p = books[x.book].pages.find((q) => q.n === x.page); assert.equal(p.he, x.he, id); assert.equal(p.en, x.en, id); }
      else assert.ok(dialogues[x.dialogue].lines.some((l) => l.he === x.he && l.en === x.en), id);
    }
  }
});

test('gloss stems drop notes and short words', () => {
  assert.deepEqual(glossStems('coffee (a drink)'), ['coffe']); assert.deepEqual(glossStems('to be sated'), ['sate']);
});
