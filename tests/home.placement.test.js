import test from 'node:test';
import assert from 'node:assert/strict';
import { openStart } from '../src/placement/start.js';
import { lessons } from '../src/curriculum/lessons.js';
test('placement never bypasses prerequisites or completes skipped lessons', () => {
  const done = [];
  assert.deepEqual(openStart(lessons, done, 'r10'), { id: 'r01', wanted: 'r10', locked: true });
  assert.deepEqual(done, []);
  const prior = lessons.filter(l => l.track === 'read').slice(0, 9).map(l => l.id);
  assert.equal(openStart(lessons, prior, 'r10').id, 'r10');
  assert.equal(openStart(lessons, [...prior, 'r10'], 'r10').id, 'r11');
});
test('unknown or cross-track placement preserves the beginner entry', () => {
  for (const wanted of [null, 'unknown', 'il10']) assert.equal(openStart(lessons, [], wanted).id, 'r01');
});
