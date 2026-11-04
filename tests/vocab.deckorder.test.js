import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const { ROOT } = await import('../tools/vocab/frequency.mjs');
const { buildDeck, eligible, themeQuotas, posGroup, DECK_SIZE, POS_QUOTA, SLACK } = await import('../tools/vocab/deck_order.mjs');

const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vocab/words.json'), 'utf8')).words;
const byId = new Map(words.map((w) => [w.id, w]));
const deck = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vocab/deck-order.json'), 'utf8'));

test('exactly 1,000 distinct words, positions 1..1000, 10 blocks of 100', () => {
  assert.equal(deck.entries.length, DECK_SIZE);
  assert.equal(new Set(deck.entries.map((e) => e.id)).size, DECK_SIZE);
  deck.entries.forEach((e, i) => { assert.equal(e.pos, i + 1); assert.equal(e.block, Math.floor(i / 100) + 1); assert.ok(byId.has(e.id)); });
  assert.equal(new Set(deck.entries.map((e) => e.block)).size, 10);
});

test('every entry is a projection of its words.json record; no phrases or unknown POS', () => {
  for (const e of deck.entries) {
    const w = byId.get(e.id);
    assert.equal(e.he, w.he); assert.equal(e.en, w.en); assert.equal(e.partOfSpeech, w.pos); assert.equal(e.theme, w.topic); assert.equal(e.frequencyRank, w.frequencyRank);
    assert.equal(w.kind, 'word'); assert.notEqual(w.pos, 'unknown');
  }
});

test('frequency first: inside each theme the order follows effective rank', () => {
  const last = {};
  for (const e of deck.entries) {
    if (last[e.theme] !== undefined) assert.ok(e.effectiveRank >= last[e.theme], `${e.theme} out of order at ${e.pos}`);
    last[e.theme] = e.effectiveRank;
  }
  const rank = (e) => e.effectiveRank;
  const mean = (a) => a.reduce((s, e) => s + rank(e), 0) / a.length;
  const top = deck.entries.filter((e) => e.frequencyRank <= 20 && !e.flags.includes('homograph'));
  assert.ok(top.length >= 8 && top.every((e) => e.pos <= 400), 'the commonest words come early');
});

test('theme and part-of-speech balance: caps hold except for counted relaxed slots', () => {
  const tq = deck.quotas.theme;
  assert.deepEqual(tq, themeQuotas(eligible(words)));
  let over = 0;
  for (const [t, n] of Object.entries(deck.counts.theme)) over += Math.max(0, n - Math.ceil(tq[t] * SLACK));
  for (const [g, n] of Object.entries(deck.counts.posGroup)) assert.ok(n <= Math.ceil(POS_QUOTA[g] * SLACK) + deck.relaxed, `${g} ${n}`);
  assert.ok(over <= deck.relaxed, `${over} over theme caps but only ${deck.relaxed} relaxed slots`);
  assert.ok(Object.keys(deck.counts.theme).length >= 20, 'nearly every theme is represented');
  assert.ok(Object.keys(deck.counts.posGroup).length === 4);
  const max = Math.max(...Object.values(deck.counts.theme));
  assert.ok(max < 250, `no theme dominates (${max})`);
});

test('themes are spread through the order, not clumped (each 250-word quarter holds most big themes)', () => {
  for (const [t, n] of Object.entries(deck.counts.theme)) {
    if (n < 40) continue;
    for (let q = 0; q < 4; q++) {
      const c = deck.entries.slice(q * 250, (q + 1) * 250).filter((e) => e.theme === t).length;
      assert.ok(c >= Math.floor(n / 4) - 3 && c <= Math.ceil(n / 4) + 3, `${t} quarter ${q + 1}: ${c} of ${n}`);
    }
  }
});

test('flags are honest and the rule is documented in file and tool', () => {
  assert.ok(deck.entries.some((e) => e.flags.includes('gloss-machine')));
  assert.ok(deck.entries.some((e) => e.flags.includes('homograph')));
  assert.match(deck.rule, /stride|spread/);
  assert.match(fs.readFileSync(path.join(ROOT, 'tools/vocab/deck_order.mjs'), 'utf8'), /THE RULE/);
});

test('deck-order.json equals a fresh build; words.json untouched', () => {
  const before = fs.readFileSync(path.join(ROOT, 'data/vocab/words.json'));
  const fresh = buildDeck(ROOT);
  assert.deepEqual(fresh.entries.map((e) => e.id), deck.entries.map((e) => e.id), 'stale: rerun tools/vocab/deck_order.mjs');
  assert.ok(before.equals(fs.readFileSync(path.join(ROOT, 'data/vocab/words.json'))));
  assert.equal(posGroup('prep'), 'function'); assert.equal(posGroup('noun'), 'noun');
});
