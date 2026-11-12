// M-02 (12 Nov audit): global Search matches transliteration through the Dictionary's own matcher.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { searchWords, isTranslitHit } from '../src/shell/search.js';
import { translitFor } from '../src/vocab/model.js';
import * as vocabView from '../src/vocab/vocab.view.js';
import { loadTier, TIER_BANDS } from '../src/vocab/loader.js';

let all = [];
for (const t of TIER_BANDS) all = all.concat(await loadTier(t));
const tlOf = (tradition) => { const c = new Map(); return (e) => { if (!c.has(e)) c.set(e, [translitFor(e, tradition)].filter(Boolean)); return c.get(e); }; };

test('M-02: "shalom" finds the word for peace in global Search, labelled as a transliteration match', () => {
  const tl = tlOf('sephardi');
  const hits = searchWords(all, 'shalom', 15, tl);
  const peace = hits.find((e) => e.lemma === 'שלום');
  assert.ok(peace, 'shalom must find שלום');
  assert.equal(hits[0], peace, 'the exact transliteration leads');
  assert.equal(isTranslitHit(peace, 'shalom', tl), true);
  assert.equal(isTranslitHit(peace, 'peace', tl), false, 'a gloss hit is not labelled as transliteration');
});

test('M-02: without a transliteration function, Search behaves as before (shalom finds nothing)', () => {
  assert.equal(searchWords(all, 'shalom').length, 0);
});

test('M-02: Search and the Dictionary share one transliteration function (no copy)', () => {
  assert.equal(vocabView.translitFor, translitFor);
  const view = readFileSync(new URL('../src/shell/search.view.js', import.meta.url), 'utf8');
  assert.match(view, /import \{ translitFor, TRAD \} from '\.\.\/vocab\/model\.js'/);
  const search = readFileSync(new URL('../src/shell/search.js', import.meta.url), 'utf8');
  assert.match(search, /from '\.\.\/vocab\/rank\.js'/);
  assert.doesNotMatch(search, /transliterate\(/);
});

test('M-02: short Latin queries do not flood results with transliteration prefixes; gloss hits still lead', () => {
  const tl = tlOf('sephardi');
  const peace = searchWords(all, 'peace', 5, tl);
  assert.equal(peace[0].lemma, 'שלום');
  for (const e of searchWords(all, 'sh', 15, tl)) assert.equal(isTranslitHit(e, 'sh', tl), false);
});

test('search count is singular for one result ("1 result", not "1 results")', () => {
  const src = readFileSync(new URL('../src/shell/search.view.js', import.meta.url), 'utf8');
  assert.equal((src.match(/total === 1 \? '1 result' : t\('search\.count', \{ n: total \}\)/g) || []).length, 2);
});
