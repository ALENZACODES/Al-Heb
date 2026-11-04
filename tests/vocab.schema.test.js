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

// ---- round 2: tags, function words, forms, overrides (data quality pass; still no native-speaker review)
const OV = JSON.parse(fs.readFileSync(new URL('../data/vocab/overrides.json', import.meta.url), 'utf8'));
const TAGSET = Object.keys(data.tags || {});
const byId = new Map(E.map((e) => [e.id, e]));
const entry = (lemma, pos) => E.filter((e) => e.lemma === lemma && (!pos || e.pos === pos)).sort((a, b) => a.rank - b.rank)[0];

test('tags are drawn from the declared vocabulary; function words carry fn and the function tag', () => {
  assert.ok(TAGSET.includes('function') && TAGSET.includes('jewish-life') && TAGSET.includes('prayer'));
  for (const e of E) {
    for (const t of e.tags || []) assert.ok(TAGSET.includes(t), `${e.rank} tag ${t}`);
    assert.equal(!!e.fn, (e.tags || []).includes('function'), `fn/function mismatch at rank ${e.rank}`);
  }
  const fn = E.filter((e) => e.fn);
  assert.ok(fn.length >= 150, `only ${fn.length} function words`);
  for (const e of E) if (['prep', 'conj', 'particle', 'det', 'intj'].includes(e.pos)) assert.ok(e.fn, `${e.lemma} (${e.pos}) not flagged as function word`);
});

test('regressions reported by the UI review', () => {
  assert.equal(entry('ב', 'prep').fn, 'preposition');
  assert.equal(entry('ל', 'prep').fn, 'preposition');
  assert.equal(entry('לא').pos, 'particle');
  assert.equal(entry('בית', 'noun').topic, 'Home');
  const he = entry('הוה', 'verb');
  assert.ok(he.isForm && byId.get(he.formOf).lemma === 'היה');
  assert.ok(!/constitute/.test(he.gloss));
  assert.ok(byId.get(he.formOf).formIds.includes(he.id));
  assert.ok(byId.get(he.formOf).rank < he.rank + 5);
  assert.match(entry('היה', 'verb').gloss, /^to be/);
  assert.ok(entry('הם', 'pron') && entry('מים', 'noun') && entry('כל'), 'basic function words/nouns must be present');
  assert.equal(entry('קפה', 'noun').gloss, 'coffee');
  assert.ok(E.some((e) => (e.tags || []).includes('jewish-life')) && E.some((e) => (e.tags || []).includes('prayer')));
});

test('non-function Misc Nouns share is below 16%, and verbs/non-verbs agree with topic', () => {
  const misc = E.filter((e) => e.topic === 'Misc Nouns' && !e.fn);
  assert.ok(misc.length / E.length < 0.16, `${misc.length}`);
  for (const e of E) assert.equal(e.pos === 'verb', e.topic === 'Verbs', `${e.rank} ${e.lemma}`);
  for (const e of E.filter((x) => x.pos === 'verb' && !x.isForm)) assert.match(e.gloss, /^(to |can\b)/, `${e.rank} ${e.lemma}: ${e.gloss}`);
});

test('forms: references resolve, forms[] entries are well formed', () => {
  for (const e of E) {
    if (e.isForm) { assert.ok(byId.has(e.formOf), e.id); assert.ok(byId.get(e.formOf).formIds.includes(e.id)); }
    for (const id of e.formIds || []) assert.equal(byId.get(id).formOf, e.id);
    for (const f of e.forms || []) { assert.match(f.he, /^[א-ת ]+$/); assert.ok(f.pointed === null || NIQ.test(f.pointed)); assert.ok(f.label); }
    for (const id of e.sameSpelling || []) assert.equal(byId.get(id).lemma, e.lemma);
  }
  assert.ok(E.filter((e) => e.forms && e.forms.length).length >= 10);
});

test('overrides: every key exists or was displaced, lemma matches, nothing claims to be proofread, reasons present', () => {
  let live = 0;
  for (const [id, o] of Object.entries(OV.overrides)) {
    assert.ok(o.reason !== undefined && o.lemma, id);
    const e = byId.get(id);
    if (!e) continue;
    live++;
    assert.equal(e.lemma, o.lemma, id);
    assert.equal(e.overridden, true);
    assert.equal(e.proofread, false);
    if ('gloss' in o) assert.equal(e.gloss, o.gloss);
  }
  assert.ok(live >= 150, `${live} live overrides`);
  for (const a of OV.additions) assert.ok(E.some((e) => e.lemma === a.lemma && e.pos === a.pos), `addition missing: ${a.lemma}`);
});

test('rank-sharing homographs: the more common pointed word holds the higher rank (swaps recorded in overrides)', () => {
  for (const [id, o] of Object.entries(OV.overrides)) {
    if (!o.swapRankWith) continue;
    const a = byId.get(id), b = byId.get(o.swapRankWith);
    assert.ok(a && b && a.lemma === b.lemma);
    assert.ok(b.rank < a.rank, `${a.lemma}: ${b.gloss} should outrank ${a.gloss}`);
  }
});
