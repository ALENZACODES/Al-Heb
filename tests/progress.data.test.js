import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { loadProgressData, mergeTimedReadGates, TIMED_READ_BELTS } from '../src/progress/data.js';
const await_ranks = await import('../src/curriculum/ranks.js');
import { ALL_LETTERS, ALL_SIGNS } from '../src/progress/model.js';

const D = await loadProgressData();
const regIds = new Set(D.registry.map((e) => e.id));
const KINDS = new Set(['letters', 'signs', 'decode', 'decodeWords', 'checkpoint', 'lessonsThrough', 'srsMature', 'spotit', 'loanwords', 'vocabBand', 'phrases', 'timedRead', 'unmeasured']);
const rawBeltGates = JSON.parse(readFileSync(new URL('../data/progress/belt-gates.json', import.meta.url), 'utf8'));
const timedGates = JSON.parse(readFileSync(new URL('../data/timedread/gates.json', import.meta.url), 'utf8'));

test('milestones: valid kinds, existing registry ids and lesson ids, ids unique, hrefs are hash routes', () => {
  const seen = new Set();
  for (const [goal, p] of Object.entries(D.milestones.paths)) {
    assert.ok(['read', 'israel'].includes(goal));
    for (const m of p.milestones) {
      assert.ok(KINDS.has(m.kind), m.id); assert.ok(!seen.has(m.id), 'dup ' + m.id); seen.add(m.id);
      assert.match(m.href, /^#\//); assert.ok(m.label.length > 3);
      for (const e of m.entries ?? []) assert.ok(regIds.has(e), `${m.id}: ${e}`);
      if (m.kind === 'lessonsThrough') assert.ok(D.lessons.some((l) => l.id === m.through && l.track === m.track), m.id);
    }
  }
});
test('skill checks: keyed by real rank ids, ids exist, signs and letters are real; every rank resolves to real lessons', () => {
  const { resolveRanks } = await_ranks;
  const ranks = resolveRanks(D.belts, D.lessons), rankIds = new Set(ranks.map((r) => r.id));
  for (const r of ranks) { assert.ok(r.lessons.length > 0, r.id); for (const id of r.lessons) assert.ok(D.lessons.some((l) => l.id === id), id); }
  for (const [rank, gs] of Object.entries(D.gates.gates)) {
    assert.ok(rankIds.has(rank), 'skill checks for unknown rank ' + rank);
    for (const g of gs) {
      assert.ok(KINDS.has(g.kind)); for (const e of g.entries ?? []) assert.ok(regIds.has(e), e);
      for (const i of g.ids ?? []) assert.ok(ALL_LETTERS.includes(i) || ALL_SIGNS.includes(i), i);
    }
  }
  assert.ok(D.lessons.some((l) => l.id === D.gates.nameLesson));
});
test('timed-read checks replace the unmeasured placeholders for G5 and E5; other ranks untouched; inputs not mutated', () => {
  assert.deepEqual(TIMED_READ_BELTS, ['G5', 'E5']);
  for (const rank of TIMED_READ_BELTS) {
    assert.ok(rawBeltGates.gates[rank].every((g) => g.kind === 'unmeasured'), `${rank}: belt-gates.json still holds only the placeholder`);
    assert.ok(D.gates.gates[rank].length > 0 && D.gates.gates[rank].every((g) => g.kind === 'timedRead'), `${rank}: timedRead after merge`);
    assert.ok(!D.gates.gates[rank].some((g) => g.kind === 'unmeasured'));
  }
  for (const rank of Object.keys(rawBeltGates.gates)) if (!TIMED_READ_BELTS.includes(rank)) assert.deepEqual(D.gates.gates[rank], rawBeltGates.gates[rank]);
  assert.equal(D.gates.nameLesson, rawBeltGates.nameLesson);
  assert.equal(rawBeltGates.gates.G5[0].kind, 'unmeasured', 'merge must not mutate the loaded belt-gates object');
  // wpm numbers come only from the timed-read file, which ties each to the rank's wpmTarget in belts.json
  const ranks = JSON.parse(readFileSync(new URL('../data/curriculum/belts.json', import.meta.url), 'utf8')).ranks;
  for (const rank of TIMED_READ_BELTS) for (const g of D.gates.gates[rank]) { assert.equal(g.minWpm, ranks.find((r) => r.id === rank).wpmTarget); assert.match(g.label, /self-reported/); }
  assert.ok(!/wpm|per minute/i.test(JSON.stringify(Object.fromEntries(Object.entries(D.gates.gates).filter(([b]) => !TIMED_READ_BELTS.includes(b))))));
});
test('mergeTimedReadGates: no timed file, empty, or malformed entries leave the placeholders alone', () => {
  assert.deepEqual(mergeTimedReadGates(rawBeltGates, null).gates, rawBeltGates.gates);
  assert.deepEqual(mergeTimedReadGates(rawBeltGates, { gates: {} }).gates, rawBeltGates.gates);
  assert.deepEqual(mergeTimedReadGates(rawBeltGates, { gates: { G5: [{ kind: 'timedRead' }], E5: 'x' } }).gates, rawBeltGates.gates); // no minWpm, not a list
  const m = mergeTimedReadGates(rawBeltGates, { gates: { G5: timedGates.gates.G5, P0: [{ kind: 'timedRead', minWpm: 1 }] } });
  assert.equal(m.gates.G5[0].kind, 'timedRead'); assert.equal(m.gates.E5[0].kind, 'unmeasured');
  assert.deepEqual(m.gates.P0, rawBeltGates.gates.P0, 'only G5 and E5 may be replaced');
});
test('service orders are loaded for the siddur coverage line and every order item is a registry text', () => {
  assert.ok(D.orders && D.orders.orders);
  for (const o of Object.values(D.orders.orders)) for (const it of o.items) assert.ok(regIds.has(it.id), it.id);
});
test('draft status is declared in both data files', () => {
  assert.match(D.milestones.status, /draft/); assert.match(D.gates.status, /draft/);
});
test('docs exist and state the limits', () => {
  assert.ok(existsSync(new URL('../docs/progress/README.md', import.meta.url)));
  const spec = readFileSync(new URL('../docs/progress/timed-read-spec.md', import.meta.url), 'utf8');
  assert.match(spec, /not (built|measured)/i);
});
