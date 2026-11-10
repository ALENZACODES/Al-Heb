import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { loadProgressData, mergeTimedReadGates, TIMED_READ_BELTS } from '../src/progress/data.js';
import { expandRange } from '../src/progress/model.js';
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
test('belt gates: every belt has gates, ids exist, signs and letters are real, lesson ranges expand to real lessons', () => {
  for (const b of D.belts.belts) {
    assert.ok(D.gates.gates[b.id]?.length, 'gates for ' + b.id);
    for (const id of expandRange(b.lessons)) assert.ok(D.lessons.some((l) => l.id === id), id);
    for (const g of D.gates.gates[b.id]) {
      assert.ok(KINDS.has(g.kind)); for (const e of g.entries ?? []) assert.ok(regIds.has(e), e);
      for (const i of g.ids ?? []) assert.ok(ALL_LETTERS.includes(i) || ALL_SIGNS.includes(i), i);
    }
  }
  assert.ok(D.lessons.some((l) => l.id === D.gates.nameLesson));
});
test('timed-read gates replace the unmeasured placeholders for grey and black; other belts untouched; inputs not mutated', () => {
  for (const belt of TIMED_READ_BELTS) {
    assert.ok(rawBeltGates.gates[belt].every((g) => g.kind === 'unmeasured'), `${belt}: belt-gates.json still holds only the placeholder`);
    assert.ok(D.gates.gates[belt].length > 0 && D.gates.gates[belt].every((g) => g.kind === 'timedRead'), `${belt}: timedRead after merge`);
    assert.ok(!D.gates.gates[belt].some((g) => g.kind === 'unmeasured'));
  }
  for (const belt of Object.keys(rawBeltGates.gates)) if (!TIMED_READ_BELTS.includes(belt)) assert.deepEqual(D.gates.gates[belt], rawBeltGates.gates[belt]);
  assert.equal(D.gates.nameLesson, rawBeltGates.nameLesson);
  assert.equal(rawBeltGates.gates.grey[0].kind, 'unmeasured', 'merge must not mutate the loaded belt-gates object');
  // wpm numbers come only from the timed-read file, which ties each to belts.json wpmTarget (tested in tests/timedread.model.test.js)
  const belts = JSON.parse(readFileSync(new URL('../data/curriculum/belts.json', import.meta.url), 'utf8')).belts;
  for (const belt of TIMED_READ_BELTS) for (const g of D.gates.gates[belt]) { assert.equal(g.minWpm, belts.find((b) => b.id === belt).wpmTarget); assert.match(g.label, /self-reported/); }
  assert.ok(!/wpm|per minute/i.test(JSON.stringify(Object.fromEntries(Object.entries(D.gates.gates).filter(([b]) => !TIMED_READ_BELTS.includes(b))))));
});
test('mergeTimedReadGates: no timed file, empty, or malformed entries leave the placeholders alone', () => {
  assert.deepEqual(mergeTimedReadGates(rawBeltGates, null).gates, rawBeltGates.gates);
  assert.deepEqual(mergeTimedReadGates(rawBeltGates, { gates: {} }).gates, rawBeltGates.gates);
  assert.deepEqual(mergeTimedReadGates(rawBeltGates, { gates: { grey: [{ kind: 'timedRead' }], black: 'x' } }).gates, rawBeltGates.gates); // no minWpm, not a list
  const m = mergeTimedReadGates(rawBeltGates, { gates: { grey: timedGates.gates.grey, white: [{ kind: 'timedRead', minWpm: 1 }] } });
  assert.equal(m.gates.grey[0].kind, 'timedRead'); assert.equal(m.gates.black[0].kind, 'unmeasured');
  assert.deepEqual(m.gates.white, rawBeltGates.gates.white, 'only grey and black may be replaced');
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
