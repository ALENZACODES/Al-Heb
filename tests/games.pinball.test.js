import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPinballDeck, launchBall, stepBall } from '../src/games/pinball.view.js';
const targets = [{ id: 'a', x: 20 }, { id: 'b', x: 50 }, { id: 'c', x: 80 }];
const fresh = () => ({ x: 50, y: 90, vx: 0, vy: 0, armed: false });
test('idle physics never earns a hit, even on a bumper', () => {
  const b = fresh(); b.x = 20; b.y = 20;
  for (let i = 0; i < 36000; i++) assert.equal(stepBall(b, 1 / 60, targets, 'a'), null);
});
test('all three bumpers are reachable by flippers; only the matching letter succeeds', () => {
  for (const target of targets) {
    const b = fresh(); assert.equal(launchBall(b, target.x), true);
    assert.equal(launchBall(b, target.x), false);
    let hit;
    for (let i = 0; i < 150 && !hit; i++) hit = stepBall(b, 1 / 60, targets, target.id);
    assert.equal(hit?.id, target.id); assert.equal(hit?.correct, true); assert.equal(b.armed, false);
    assert.equal(stepBall(b, 0, targets, target.id), null);
  }
  const b = fresh(); launchBall(b, 20); let hit;
  for (let i = 0; i < 150 && !hit; i++) hit = stepBall(b, 1 / 60, targets, 'b');
  assert.equal(hit?.correct, false);
});
test('incomplete letter records are omitted', () => {
  assert.deepEqual(buildPinballDeck([{ id: 'a', he: 'א', name: 'Alef' }, { id: 'b' }]), [{ id: 'a', he: 'א', name: 'Alef' }]);
});
