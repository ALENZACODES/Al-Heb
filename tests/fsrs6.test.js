// FSRS-6 module: compared with numbers produced by the reference library (ts-fsrs 6.0.0) on 30 fixed review histories.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WEIGHTS, retrievability, interval, first, next, replay, onDueDays } from '../src/fsrs/fsrs6.js';

const FIX = JSON.parse(readFileSync(new URL('./fixtures/fsrs6-reference.json', import.meta.url), 'utf8'));

test('fixture is the reference output: 30 histories, weights equal the ones in the module', () => {
  assert.equal(FIX.sequences.length, 30);
  assert.deepEqual(FIX.params.w, [...WEIGHTS]);
  const n = FIX.sequences.reduce((a, s) => a + s.steps.length, 0); assert.ok(n >= 200, `only ${n} steps`);
  const ratings = new Set(FIX.sequences.flatMap((s) => s.steps.map((x) => x.rating))); assert.deepEqual([...ratings].sort(), [1, 2, 3, 4]);
});
test('every step of every history matches the reference to 1e-6 (stability, difficulty, retrievability before, interval)', () => {
  let checked = 0;
  for (const [i, seq] of FIX.sequences.entries()) {
    const rows = replay(seq.steps.map((s) => ({ gapDays: s.gapDays, rating: s.rating })));
    rows.forEach((r, k) => {
      const e = seq.steps[k];
      assert.ok(Math.abs(r.stability - e.stability) < 1e-6, `seq ${i} step ${k} stability ${r.stability} vs ${e.stability}`);
      assert.ok(Math.abs(r.difficulty - e.difficulty) < 1e-6, `seq ${i} step ${k} difficulty ${r.difficulty} vs ${e.difficulty}`);
      assert.equal(r.scheduledDays, e.scheduledDays, `seq ${i} step ${k} interval`);
      if (e.retrievabilityBefore !== null) assert.ok(Math.abs(r.retrievabilityBefore - e.retrievabilityBefore) < 1e-6, `seq ${i} step ${k} retrievability`);
      checked++;
    });
  }
  assert.ok(checked >= 200);
});
test('curve facts: recall is 0.9 when elapsed equals stability; interval for 0.9 target is about the stability', () => {
  assert.ok(Math.abs(retrievability(10, 10) - 0.9) < 1e-6);
  assert.equal(retrievability(0, 5), 1);
  assert.equal(interval(10), 10);
  assert.ok(interval(10, 0.8) > 10 && interval(10, 0.95) < 10);
  assert.throws(() => interval(5, 0)); assert.throws(() => interval(5, 1.2));
});
test('rating order: a better first rating gives higher stability and lower difficulty', () => {
  const f = [1, 2, 3, 4].map((g) => first(g));
  for (let i = 1; i < 4; i++) { assert.ok(f[i].stability > f[i - 1].stability); assert.ok(f[i].difficulty < f[i - 1].difficulty); }
});
test('an Again never raises stability; recall ratings never lower it', () => {
  let st = first(3);
  for (const days of [1, 3, 10, 30]) {
    assert.ok(next(st, days, 1).stability <= st.stability);
    for (const g of [2, 3, 4]) assert.ok(next(st, days, g).stability >= st.stability);
    st = next(st, days, 3);
  }
});
test('on-due-day Good answers grow the interval; bad input throws', () => {
  const rows = onDueDays([3, 3, 3, 3, 3]);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].scheduledDays > rows[i - 1].scheduledDays);
  assert.equal(rows[1].gapDays, rows[0].scheduledDays);
  assert.throws(() => first(0)); assert.throws(() => next(first(3), -1, 3)); assert.throws(() => next({ stability: 0, difficulty: 0 }, 1, 3));
});
test('module is pure: imports nothing', () => { assert.doesNotMatch(readFileSync(new URL('../src/fsrs/fsrs6.js', import.meta.url), 'utf8'), /^\s*import /m); });
