// Live camera frame checks (src/photo/live-capture.js): pure maths, no camera.
import test from 'node:test';
import assert from 'node:assert/strict';
import { toGray, frameStats, frameMotion, createSteadyGate, HINTS, liveCameraAvailable } from '../src/photo/live-capture.js';

const W = 64, H = 48;
/** A gray test card: dark "letters" (vertical bars) on a light ground; blur > 0 smears the edges. */
function card({ ground = 210, ink = 30, blur = 0, shift = 0 } = {}) {
  const g = new Uint8ClampedArray(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[y * W + x] = ((x + shift) % 8) < 3 && y > 8 && y < 40 ? ink : ground;
  for (let pass = 0; pass < blur; pass++) {
    const c = g.slice();
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; g[i] = (c[i - 1] + c[i] + c[i + 1] + c[i - W] + c[i + W]) / 5; }
  }
  return g;
}

test('toGray uses luma weights', () => {
  const g = toGray(new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 255, 0, 0, 255]), 3, 1);
  assert.deepEqual([...g], [255, 0, 76]);
});

test('sharpness falls with blur; brightness and glare are measured', () => {
  const sharp = frameStats(card(), W, H), soft = frameStats(card({ blur: 3 }), W, H);
  assert.ok(sharp.sharpness > 3 * soft.sharpness, `${sharp.sharpness} vs ${soft.sharpness}`);
  assert.ok(sharp.brightness > 100 && sharp.brightness < 210);
  assert.equal(frameStats(card({ ground: 255 }), W, H).glare > 0.5, true);
});

test('motion is zero for the same frame and large for a moved one', () => {
  assert.equal(frameMotion(card(), card()), 0);
  assert.ok(frameMotion(card(), card({ shift: 4 })) > 10);
  assert.equal(frameMotion(null, card()), Infinity);
});

test('the gate waits for several sharp, steady frames, and says what is wrong first', () => {
  const gate = createSteadyGate({ need: 3 });
  const s = frameStats(card(), W, H);
  assert.equal(gate.push(frameStats(card({ ground: 20, ink: 5 }), W, H), 0).hint, 'dark');
  assert.equal(gate.push(frameStats(card({ ground: 255 }), W, H), 0).hint, 'glare');
  assert.equal(gate.push(frameStats(new Uint8ClampedArray(W * H).fill(128), W, H), 0).hint, 'flat');
  assert.equal(gate.push(s, 20).hint, 'moving');
  const r1 = gate.push(s, 0), r2 = gate.push(s, 0), r3 = gate.push(s, 0);
  assert.deepEqual([r1.ready, r2.ready, r3.ready], [false, false, true]);
  assert.equal(r3.hint, 'ready');
  // After a sharper frame has been seen, a blurred one is "not sharp yet" even if steady.
  assert.equal(gate.push(frameStats(card({ blur: 3 }), W, H), 0).hint, 'blurry');
  for (const k of ['dark', 'glare', 'flat', 'moving', 'blurry', 'ready']) assert.equal(typeof HINTS[k], 'string');
});

test('live camera availability needs getUserMedia on a secure page', () => {
  assert.equal(liveCameraAvailable({ navigator: {} }), false);
  assert.equal(liveCameraAvailable({ navigator: { mediaDevices: { getUserMedia() {} } }, isSecureContext: true }), true);
  assert.equal(liveCameraAvailable({ navigator: { mediaDevices: { getUserMedia() {} } }, isSecureContext: false }), false);
});
