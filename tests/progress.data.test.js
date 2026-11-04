import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { loadProgressData } from '../src/progress/data.js';
import { expandRange } from '../src/progress/model.js';
import { ALL_LETTERS, ALL_SIGNS } from '../src/progress/model.js';

const D = await loadProgressData();
const regIds = new Set(D.registry.map((e) => e.id));
const KINDS = new Set(['letters', 'signs', 'decode', 'decodeWords', 'checkpoint', 'lessonsThrough', 'srsMature', 'spotit', 'loanwords', 'vocabBand', 'phrases', 'unmeasured']);

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
test('belts that need a timed read are marked unmeasured, and no gate invents a wpm number', () => {
  assert.ok(D.gates.gates.grey.some((g) => g.kind === 'unmeasured')); assert.ok(D.gates.gates.black.some((g) => g.kind === 'unmeasured'));
  assert.ok(!/wpm|per minute/i.test(JSON.stringify(D.gates.gates)));
});
test('draft status is declared in both data files', () => {
  assert.match(D.milestones.status, /draft/); assert.match(D.gates.status, /draft/);
});
test('docs exist and state the limits', () => {
  assert.ok(existsSync(new URL('../docs/progress/README.md', import.meta.url)));
  const spec = readFileSync(new URL('../docs/progress/timed-read-spec.md', import.meta.url), 'utf8');
  assert.match(spec, /not (built|measured)/i);
});
