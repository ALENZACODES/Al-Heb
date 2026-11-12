// J9 search everything: lessons, books, root families, prayers, Torah references and Torah verse text, with Hebrew input.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadIndexes, searchAll, parseTorahRef, searchTorahText, searchLessons, searchRoots, searchTexts } from '../src/platform/search-more.js';

const ix = await loadIndexes();

test('indexes load from the app data', () => {
  assert.ok(ix.lessons.length >= 100 && ix.books.length >= 50 && ix.roots.length >= 300 && ix.registry.length >= 50);
  assert.equal(ix.torah.length, 5);
});

test('English and Hebrew (pointed or not) find lessons, books, roots and texts that exist', () => {
  const titles = (q) => Object.fromEntries(searchAll(ix, q).map(([t, rows]) => [t, rows]));
  const en = titles('shabbat'), he = titles('שבת'), pointed = titles('שַׁבָּת');
  for (const g of ['Lessons', 'Little Books', 'Root Families', 'Prayers and Texts']) assert.ok(en[g]?.length, `English: ${g}`);
  assert.ok(he['Root Families']?.length && pointed['Root Families']?.length, 'Hebrew with and without points finds the root');
  for (const [, rows] of searchAll(ix, 'shabbat')) for (const r of rows) assert.match(r.href, /^#\/(learn\?lesson=|book\/|roots\?letters=|read\/|torahreader\?)/);
  const l = searchLessons(ix.lessons, 'shema')[0];
  assert.ok(ix.lessons.some((x) => `#/learn?lesson=${x.id}` === l.href));
  const r = searchRoots(ix.roots, 'כון')[0];
  assert.ok(ix.roots.some((f) => `#/roots?letters=${encodeURIComponent(f.root)}` === r.href));
  assert.deepEqual(searchAll(ix, 'zzqqxx'), []);
});

test('Torah references in English or Hebrew open the reader at the chapter and verse; impossible ones are not offered', () => {
  assert.equal(parseTorahRef('Genesis 12:1', ix.torah).href, '#/torahreader?book=genesis&chapter=12&verse=1');
  assert.equal(parseTorahRef('gen 3', ix.torah).href, '#/torahreader?book=genesis&chapter=3');
  assert.equal(parseTorahRef('בְּרֵאשִׁית 1', ix.torah).href, '#/torahreader?book=genesis&chapter=1');
  assert.equal(parseTorahRef('deut 6 4', ix.torah).verse, 4);
  assert.equal(parseTorahRef('Genesis 51', ix.torah), null);
  assert.equal(parseTorahRef('Genesis 1:99', ix.torah), null);
  assert.equal(parseTorahRef('Psalms 23', ix.torah), null);
});

test('Torah verse text: whole Hebrew words without points, English words, stops at the limit, and the divine name is shown as ה׳', async () => {
  const r = await searchTorahText('שלום', ix.torah, { limit: 3 });
  assert.equal(r.hits.length, 3); assert.equal(r.complete, false);
  for (const h of r.hits) assert.match(h.href, /^#\/torahreader\?book=\w+&chapter=\d+&verse=\d+$/);
  const n = await searchTorahText('יהוה', ix.torah, { limit: 2 });
  for (const h of n.hits) { assert.doesNotMatch(h.he, /יְהוָה|יהוה/); assert.match(h.he, /ה׳/); }
  const e = await searchTorahText('beginning', ix.torah, { limit: 1 });
  assert.equal(e.hits[0].label, 'Genesis 1:1');
  const c = await searchTorahText('שלום', ix.torah, { cancelled: () => true });
  assert.equal(c.complete, false); assert.equal(c.hits.length, 0);
  assert.equal((await searchTorahText('a', ix.torah)).hits.length, 0, 'too short: nothing loaded');
  for (const x of searchTexts(ix.registry, 'shema')) assert.doesNotMatch(x.he, /יְהוָה/);
});

test('the search page loads these groups on demand and offers the Torah text search as a button', () => {
  const v = readFileSync(new URL('../src/shell/search.view.js', import.meta.url), 'utf8');
  assert.match(v, /import\('\.\.\/platform\/search-more\.js'\)/);
  assert.match(v, /Search every Torah verse for/);
  assert.match(v, /torahRun\+\+/, 'leaving the page cancels a running verse search');
});
