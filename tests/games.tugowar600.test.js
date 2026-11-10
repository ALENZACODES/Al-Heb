import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BANK, ROUNDS, ROUND_COUNT, buildRound, normRound, PAIRS } from '../src/games/tugowar.view.js';

const root = fileURLToPath(new URL('..', import.meta.url));

test('Tug-of-War has 600 rounds: every pair once each way, six levels of 100', () => {
  assert.equal(BANK.length, 300);
  assert.equal(ROUNDS.length, ROUND_COUNT);
  assert.equal(ROUND_COUNT, 600);
  const seen = new Set(ROUNDS.map((r) => `${r.pairIndex}:${r.reversed}`));
  assert.equal(seen.size, 600);
  for (let lv = 1; lv <= 6; lv++) assert.equal(ROUNDS.filter((r) => r.level === lv).length, 100);
  assert.deepEqual(ROUNDS.slice(0, 12).map((r) => BANK[r.pairIndex][1]), PAIRS.map((p) => p[0]));
});

test('any start works and wraps: 0 -> 600, 601 -> 1, junk -> 1', () => {
  assert.equal(normRound(0), 600);
  assert.equal(normRound(601), 1);
  assert.equal(normRound('abc'), 1);
  assert.equal(normRound(345), 345);
});

test('every round has three different choices and exactly one accepted opposite', () => {
  const opp = new Map();
  for (const b of BANK) {
    (opp.get(b[1]) || opp.set(b[1], new Set()).get(b[1])).add(b[4]);
    (opp.get(b[4]) || opp.set(b[4], new Set()).get(b[4])).add(b[1]);
  }
  for (let n = 1; n <= 600; n++) {
    const q = buildRound(n);
    assert.equal(q.choices.length, 3, `round ${n}`);
    assert.equal(new Set(q.choices.map((c) => c.he)).size, 3, `round ${n} duplicate choice`);
    const right = q.choices.filter((c) => opp.get(q.prompt.he).has(c.he));
    assert.equal(right.length, 1, `round ${n}: ${q.prompt.he}`);
    assert.equal(right[0].he, q.answer.he);
  }
});

test('the generated bank and picture list match the source file', () => {
  execFileSync(process.execPath, ['tools/games/build-tugowar.mjs', '--check'], { cwd: root });
});
