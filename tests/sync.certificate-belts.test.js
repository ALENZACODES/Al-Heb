// Belts on the certificate of lessons (25 Nov 2026 critique, item 14): counted only from rows that meet the pass rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { beltRows } from '../src/sync/certificate.view.js';

const all = [{ id: 'r01', level: 'white' }, { id: 'r02', level: 'white' }, { id: 'r05', level: 'yellow' }, { id: 'x', level: 'nope' }];
test('a whole belt is completed on the date of its last lesson; a part belt is counted; unscored rows never count', () => {
  const ev = { rows: [{ id: 'r01', status: 'meets', completedAt: 10 }, { id: 'r02', status: 'meets', completedAt: 20 }, { id: 'r05', status: 'unscored' }] };
  assert.deepEqual(beltRows(ev, all), [{ belt: 'white', name: 'White belt', done: 2, of: 2, whole: true, on: 20 }]);
  const part = { rows: [{ id: 'r01', status: 'meets', completedAt: 5 }, { id: 'r05', status: 'meets', completedAt: 6 }] };
  assert.deepEqual(beltRows(part, all).map((b) => [b.belt, b.done, b.of, b.whole]), [['white', 1, 2, false], ['yellow', 1, 1, true]]);
  assert.deepEqual(beltRows({ rows: [] }, all), []);
});
