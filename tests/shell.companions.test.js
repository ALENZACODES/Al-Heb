import test from 'node:test';
import assert from 'node:assert/strict';
import { poseForRoute, teacherOrder } from '../src/shell/companions.js';

// The teachers band (owner's order, 2026-11-07): Ari and Noa appear on every screen,
// posed for the kind of page. These mappings are the contract.
test('companions: pose fits the kind of page', () => {
  assert.equal(poseForRoute('torahreader'), 'synagogue');
  assert.equal(poseForRoute('service'), 'synagogue');
  assert.equal(poseForRoute('morning'), 'synagogue');
  assert.equal(poseForRoute('listen'), 'listen');
  assert.equal(poseForRoute('read'), 'listen');
  assert.equal(poseForRoute('books'), 'listen');
  assert.equal(poseForRoute('progress'), 'celebrate');
  assert.equal(poseForRoute('awards'), 'celebrate');
  assert.equal(poseForRoute('games'), 'celebrate');
  assert.equal(poseForRoute('israel'), 'telaviv');
  assert.equal(poseForRoute('dialogues'), 'telaviv');
  assert.equal(poseForRoute('learn'), 'speak');
  assert.equal(poseForRoute('letters'), 'speak');
  assert.equal(poseForRoute('placement'), 'speak');
  assert.equal(poseForRoute('speak'), 'speak');
  assert.equal(poseForRoute('settings'), 'neutral');
  assert.equal(poseForRoute('welcome'), 'neutral');
  assert.equal(poseForRoute('tugowar'), 'neutral'); // individual games carry their own art
  assert.equal(poseForRoute('no-such-route'), 'neutral');
  assert.equal(poseForRoute(undefined), 'neutral');
});

test('companions: the chosen voice leads the pair', () => {
  assert.deepEqual(teacherOrder('f'), ['noa', 'ari']);
  assert.deepEqual(teacherOrder('m'), ['ari', 'noa']);
  assert.deepEqual(teacherOrder(undefined), ['noa', 'ari']);
});
