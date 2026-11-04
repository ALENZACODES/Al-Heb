import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { upToTier, inTierBand, byTopic, nextNew, cardFor } from '../src/vocab/vocab.js';

const data = JSON.parse(fs.readFileSync(new URL('../data/vocab/vocab5000.json', import.meta.url), 'utf8'));
const E = data.entries;
const NIQ = /[ְ-ׇ]/;
const strip = (s) => s.replace(/[֑-ׇ]/g, '').replace(/־/g, ' ');
const TOPICS = ['Animals', 'Transportation', 'Location', 'Clothing', 'Colours', 'People', 'Professions', 'Society', 'Art', 'Beverages', 'Food', 'Home', 'Electronics', 'Body', 'Nature', 'Materials', 'Math/Measurements', 'Misc Nouns', 'Directions', 'Seasons', 'Months', 'Days', 'Time', 'Verbs', 'Adjectives', 'Pronouns', 'Numbers'];

test('exactly 5000 entries with contiguous ranks', () => {
  assert.equal(data.schema, 'alef-vocab5k/1');
  assert.equal(E.length, 5000);
  assert.equal(data.count, 5000);
  E.forEach((e, i) => assert.equal(e.rank, i + 1));
});

test('required fields and types', () => {
  for (const e of E) {
    assert.equal(typeof e.id, 'string');
    assert.match(e.lemma, /^[א-ת' "-]+$/, e.lemma);
    assert.ok(e.gloss && e.gloss.length >= 1 && !['a', 'an', 'the'].includes(e.gloss) && e.gloss.length <= 90, `gloss ${e.rank}`);
    assert.ok(['noun', 'verb', 'adj', 'adv', 'prep', 'pron', 'num', 'conj', 'intj', 'det', 'particle'].includes(e.pos), e.pos);
    assert.equal(e.proofread, false, 'nothing is proofread yet; do not claim otherwise');
    assert.equal(typeof e.needsPointing, 'boolean');
    assert.ok(TOPICS.includes(e.topic), e.topic);
  }
});

test('ids and (form, pos) pairs are unique', () => {
  assert.equal(new Set(E.map((e) => e.id)).size, E.length);
  assert.equal(new Set(E.map((e) => (e.pointed || e.lemma) + '|' + e.pos)).size, E.length);
});

test('pointing: never invented, flagged when absent, consistent with the lemma', () => {
  for (const e of E) {
    if (e.pointed === null) {
      assert.equal(e.needsPointing, true);
      assert.equal(e.pointedSource, null);
    } else {
      assert.equal(e.needsPointing, false);
      assert.match(e.pointed, NIQ);
      assert.equal(e.pointedSource, 'wiktionary');
      // Wiktionary points without matres lectionis (ktiv haser), so compare consonant skeletons ignoring vav/yod
      const sk = (x) => x.normalize('NFC').replace(/[\u05D5\u05D9]/g, '').replace(/\s+/g, ' ');
      assert.equal(sk(strip(e.pointed)), sk(e.lemma), `lemma/pointed mismatch at rank ${e.rank}`);
    }
  }
});

test('all 27 topics exist and meta counts match', () => {
  assert.deepEqual(data.topics, TOPICS);
  for (const t of TOPICS) assert.ok(E.some((e) => e.topic === t), `topic missing: ${t}`);
  const c = {};
  E.forEach((e) => (c[e.topic] = (c[e.topic] || 0) + 1));
  assert.equal(Object.values(c).reduce((a, b) => a + b, 0), 5000);
});

test('tiers 500 / 1000 / 2000 / 5000 are exact and nested', () => {
  assert.equal(upToTier(data, 500).length, 500);
  assert.equal(upToTier(data, 1000).length, 1000);
  assert.equal(upToTier(data, 2000).length, 2000);
  assert.equal(inTierBand(data, 5000).length, 3000);
  assert.deepEqual(data.tiers, { 500: 500, 1000: 1000, 2000: 2000, 5000: 5000 });
  for (const e of E) assert.equal(e.tier, e.rank <= 500 ? 500 : e.rank <= 1000 ? 1000 : e.rank <= 2000 ? 2000 : 5000);
});

test('helpers', () => {
  assert.ok(byTopic(data, 'Colours').length >= 10);
  const n = nextNew(data, new Set([E[0].id]), 5, 500);
  assert.equal(n.length, 5);
  assert.equal(n[0].rank, 2);
  const c = cardFor(E[0]);
  assert.equal(c.id, E[0].id);
});

test('essential topic words are reachable early', () => {
  const g = (lemma) => E.find((e) => e.lemma === lemma);
  for (const l of ['יום ראשון', 'ינואר', 'חורף', 'כחול', 'צפון', 'ימין']) assert.ok(g(l), l);
  assert.ok(g('כחול').tier <= 1000);
});
