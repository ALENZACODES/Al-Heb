import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCorpus } from '../src/corpus/corpus.js';
import { loadProgressData } from '../src/progress/data.js';
import { readSnapshot, readableNow } from '../src/progress/model.js';
import { gradeLines, knownSet } from '../src/progress/decode.js';
import * as M from '../src/service/model.js';

const S = await M.loadServiceData({ loadCorpus });
const P = await loadProgressData();
const fakeStore = (m = {}) => ({ get: (k, f) => (k in m ? m[k] : f), set() {} });

test('orders file is sound against registry, guide, gaps; every marker quote is really in the guide', () => {
  assert.deepEqual(M.validateOrders(S.orders, S.byId, S.guide, S.hasGap), []);
  assert.deepEqual(Object.keys(S.orders.orders).sort(), [...M.ORDER_IDS].sort());
});

test('markers: only where the guide says so; Friday evening (no guide wording) has none', () => {
  for (const it of S.orders.orders['friday-night'].items) assert.equal(M.markersFor(S.orders, 'friday-night', it.id).length, 0);
  const cards = M.buildCards(S.orders, 'shabbat-morning', S.byId, 'sephardi');
  const am = cards.find((c) => c.id === 'amidah-lips');
  assert.deepEqual(am.markers.map((m) => m.kind), ['stand', 'silent']);
  assert.equal(cards.find((c) => c.id === 'shema-1').markerKnown, false);
  assert.equal(cards.find((c) => c.id === 'kaddish-1').markerKnown, false);
  assert.ok(!cards.some((c) => c.markers.some((m) => m.kind === 'sit')), 'the guide never says sit');
  // tampered quote is caught
  const bad = structuredClone(S.orders); bad.markers['shabbat-morning']['aleinu-1'][0].quote = 'Everyone sits';
  assert.match(M.validateOrders(bad, S.byId, S.guide, S.hasGap).join('\n'), /quote not in guide/);
});

test('cards: registry text only, tradition changes transliteration, english from registry', () => {
  for (const oid of M.FOLLOW_IDS) {
    const a = M.buildCards(S.orders, oid, S.byId, 'sephardi'), b = M.buildCards(S.orders, oid, S.byId, 'ashkenazi');
    assert.equal(a.length, S.orders.orders[oid].items.length);
    a.forEach((c, i) => { assert.equal(c.he.join('\n'), S.byId.get(c.id).he.split('\n').map((x) => x.trim()).filter(Boolean).join('\n')); assert.ok(c.en.length > 0); assert.equal(c.n, i + 1); assert.equal(c.tr.length, c.he.length); });
    assert.ok(a.some((c, i) => c.tr.join() !== b[i].tr.join()), 'ashkenazi differs somewhere');
  }
});

test('coverage reuses progress decode: fresh learner 0%, all lessons done is high, partial is rounded down', () => {
  const fresh = readableNow(readSnapshot(fakeStore()), P);
  for (const oid of M.ORDER_IDS) {
    const c = M.coverage(S.orders.orders[oid], fresh.lines, fresh.known);
    assert.equal(c.pct, 0); assert.ok(c.lines > 0); assert.equal(c.gaps, S.orders.orders[oid].gaps.length);
  }
  const all = P.lessons.map((l) => l.id);
  const done = readableNow(readSnapshot(fakeStore({ 'curriculum.progress': { completed: Object.fromEntries(all.map((i) => [i, 1])) } })), P);
  const c100 = M.coverage(S.orders.orders['shabbat-morning'], done.lines, done.known);
  assert.ok(c100.pct > 50, `after every lesson: ${c100.pct}`);
  // synthetic: 1 of 3 lines known -> 33, never 34
  const known = knownSet(['alef'], []);
  const lines = gradeLines([{ id: 'x', he: 'א\nב\nג' }], known).map((l) => ({ ...l, entryId: 'shema-1' }));
  const c = M.coverage({ items: [{ id: 'shema-1', moment: 'm' }], gaps: [] }, lines, known);
  assert.equal(c.pct, 33);
  assert.match(M.coverageSentence('Friday evening', c), /1 of the 3 lines ALEF holds/);
});

test('wording: decodable is not fluent; draft and copyright notices present', () => {
  assert.match(M.COVERAGE_NOTE, /does not mean you read it fluently/);
  assert.match(M.DRAFT_NOTICE, /not reviewed by a rabbi/i);
  assert.match(M.COPYRIGHT_NOTICE, /Mishkan T'filah[\s\S]*copyrighted/);
  assert.equal(JSON.stringify(S.orders).match(/page \d|p\. ?\d/i), null);
});

test('clipFor: only a real file counts, speech fallback does not', () => {
  const card = { id: 'shema-1', he: ['x'] };
  assert.equal(M.clipFor({ status: () => ({ source: 'tts-fallback' }) }, card, 'israeli'), null);
  assert.equal(M.clipFor(null, card, 'israeli'), null);
  assert.deepEqual(M.clipFor({ status: (k) => ({ source: k === 'line' ? 'file' : 'none' }) }, card, 'israeli'), { kind: 'line', id: 'shema-1' });
});
