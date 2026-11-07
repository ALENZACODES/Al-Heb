import test from 'node:test';
import assert from 'node:assert/strict';
import { nextLesson } from '../src/shell/home.view.js';
import { lessons } from '../src/curriculum/lessons.js';

test('Home continues from accepted placement, then its next lesson, without completing skipped lessons', () => {
  const state = { completed: {}, placementStart: 'r10' };
  assert.equal(nextLesson(lessons, state, 'read').id, 'r10');
  state.completed.r10 = 1;
  assert.equal(nextLesson(lessons, state, 'read').id, 'r11');
  assert.deepEqual(Object.keys(state.completed), ['r10']);
  assert.equal(nextLesson(lessons, state, 'israel').id, 'il01');
});
test('Home ignores unknown or cross-track placement and preserves the beginner entry', () => {
  for (const placementStart of [null, 'unknown', 'il10']) {
    assert.equal(nextLesson(lessons, { completed: {}, placementStart }, 'read').id, 'r01');
  }
});
test('Home does not loop back to skipped lessons after finishing the placed track', () => {
  const read = lessons.filter(l => l.track === 'read');
  const completed = Object.fromEntries(read.slice(9).map(l => [l.id, 1]));
  assert.equal(nextLesson(lessons, { completed, placementStart: 'r10' }, 'read'), undefined);
  assert.equal(completed.r01, undefined);
});
