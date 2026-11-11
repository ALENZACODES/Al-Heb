// Double tap unlocks a locked lesson, and the choice is kept (owner, 2026-11-11: move freely from one lesson to another).
import test from 'node:test';
import assert from 'node:assert/strict';
import { UNLOCK_KEY, DOUBLE_TAP_MS, loadUnlocked, unlockLesson, stillLocked, doubleTap } from '../src/curriculum/unlock.js';

const memStore = (init = {}) => { const m = { ...init }; return { get: async (k) => m[k], set: async (k, v) => { m[k] = v; }, m }; };

test('double tap: the second tap inside the window unlocks; a slow second tap is a new first tap', () => {
  let t = 1000; const log = [];
  const tap = doubleTap(() => log.push('unlock'), () => log.push('note'), () => t);
  tap(); assert.deepEqual(log, ['note']);
  t += DOUBLE_TAP_MS - 1; tap(); assert.deepEqual(log, ['note', 'unlock']);
  t += 50; tap(); assert.deepEqual(log, ['note', 'unlock', 'note'], 'after an unlock the count starts again');
  t += DOUBLE_TAP_MS + 1; tap(); assert.deepEqual(log, ['note', 'unlock', 'note', 'note'], 'too slow: still locked');
  t += 10; tap(); assert.equal(log.at(-1), 'unlock');
});

test('an unlocked lesson is kept, is no longer locked, and nothing is marked done', async () => {
  const store = memStore({ 'curriculum.progress': { completed: { r01: 1 } } });
  const ctx = { store };
  const lesson = { id: 'r05', prerequisites: ['r04'] };
  assert.deepEqual(stillLocked(lesson, { r01: 1 }, await loadUnlocked(ctx)), ['r04']);
  await unlockLesson(ctx, 'r05', 123);
  assert.deepEqual(store.m[UNLOCK_KEY], { r05: 123 });
  await unlockLesson(ctx, 'r05', 999);
  assert.equal(store.m[UNLOCK_KEY].r05, 123, 'the first unlock time stays');
  const unlocked = await loadUnlocked(ctx);
  assert.ok(unlocked.has('r05'));
  assert.deepEqual(stillLocked(lesson, { r01: 1 }, unlocked), []);
  assert.deepEqual(stillLocked({ id: 'r06', prerequisites: ['r05'] }, { r01: 1 }, unlocked), ['r05'], 'unlocking one lesson does not unlock the next');
  assert.deepEqual(store.m['curriculum.progress'], { completed: { r01: 1 } }, 'progress is untouched');
  assert.deepEqual(stillLocked(lesson, new Set(['r04']), new Set()), [], 'a finished earlier lesson opens it as before');
});

test('a store that cannot be read means nothing is unlocked, not an error', async () => {
  assert.equal((await loadUnlocked({ store: { get: async () => { throw new Error('x'); } } })).size, 0);
  assert.equal((await loadUnlocked(null)).size, 0);
});
