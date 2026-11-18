// The daily goal a learner picked on the older Daily page (loops.v1) carries into the XP goal the first time only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, save, carriedGoal } from '../../src/retention/state.js';

const mem = (init = {}) => { const m = new Map(Object.entries(init)); return { get: (k) => m.get(k), set: (k, v) => m.set(k, v), m }; };

test('no retention record yet: a loops.v1 goal of 50 becomes the XP goal', () => {
  assert.equal(load(mem({ 'loops.v1': { v: 1, goal: 50 } })).goal, 50);
});
test('a goal that is not one of the choices, or no loops record, leaves the default 20', () => {
  assert.equal(load(mem({ 'loops.v1': { v: 1, goal: 45 } })).goal, 20);
  assert.equal(load(mem()).goal, 20);
  assert.equal(carriedGoal({ get: () => { throw new Error('blocked'); } }), 0);
});
test('a saved retention record always wins over loops.v1', () => {
  const s = mem({ 'loops.v1': { v: 1, goal: 50 } });
  save(s, (r) => ({ ...r, goal: 10 }));
  assert.equal(load(s).goal, 10);
});
test('the first save keeps the carried goal', () => {
  const s = mem({ 'loops.v1': { v: 1, goal: 30 } });
  save(s, (r) => ({ ...r, lessonsFinished: 1 }));
  assert.equal(s.m.get('retention.v1').goal, 30);
});
