// Rimon flip-book scheduler (src/shell/mascot.js): pure logic, no DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createScheduler, framePaths, loadFrames, DEFAULT_ACTIONS } from '../src/shell/mascot.js';

const seq = (vals) => { let i = 0; return () => vals[i++ % vals.length]; };
const take = (s, n) => Array.from({ length: n }, () => s.next());

test('framePaths names every frame of the order sheet under assets/img/rimon/frames', () => {
  const p = framePaths();
  assert.equal(Object.values(p).flat().length, Object.values(DEFAULT_ACTIONS).reduce((a, b) => a + b, 0));
  assert.equal(p.idle[0], 'assets/img/rimon/frames/idle-01.png');
  assert.equal(p.yawn[2], 'assets/img/rimon/frames/yawn-03.png');
  assert.equal(Object.values(p).flat().length, 19);
});

test('no frames at all: the scheduler is empty and yields null', () => {
  const s = createScheduler({ idle: [], smile: [] });
  assert.equal(s.empty, true);
  assert.equal(s.next(), null);
  assert.equal(s.still(), null);
});

test('idle loop: eyes-open frame held, blink frames one tick each, loop repeats', () => {
  const idle = ['i1', 'i2', 'i3', 'i4'];
  const s = createScheduler({ idle }, { idleHold: 3, random: () => 0.99 }); // random never below actionChance: no action
  assert.deepEqual(take(s, 9), ['i1', 'i1', 'i1', 'i2', 'i3', 'i4', 'i1', 'i1', 'i1']);
  assert.equal(s.action, 'idle');
});

test('a random action plays once after an idle loop, then idle resumes from the first frame', () => {
  const frames = { idle: ['i1', 'i2'], smile: ['s1'], wave: ['w1', 'w2'] };
  // first call decides whether to act (0.1 < 0.2: yes), second picks which (0.9 -> last of the sorted others: wave)
  const s = createScheduler(frames, { idleHold: 1, actionHold: 2, actionChance: 0.2, random: seq([0.1, 0.9, 0.99]) });
  assert.deepEqual(take(s, 2), ['i1', 'i2']);
  assert.equal(s.action, 'wave');
  assert.deepEqual(take(s, 4), ['w1', 'w1', 'w2', 'w2']);
  assert.equal(s.action, 'idle');
  assert.deepEqual(take(s, 2), ['i1', 'i2']);
});

test('actions with no loaded frames are never chosen', () => {
  const frames = { idle: ['i1'], smile: [], laugh: ['l1'] };
  const s = createScheduler(frames, { idleHold: 1, actionHold: 1, actionChance: 1, random: () => 0 });
  const seen = new Set(take(s, 40));
  assert.deepEqual([...seen].sort(), ['i1', 'l1']);
});

test('without idle frames the actions take turns and never stall', () => {
  const s = createScheduler({ smile: ['s1'], nod: ['n1', 'n2'] }, { actionHold: 1, random: seq([0, 0.99]) });
  const out = take(s, 6);
  assert.ok(out.every(Boolean));
  assert.ok(out.includes('s1') && out.includes('n1') && out.includes('n2'));
});

test('still() for reduced motion is the first idle frame, else the first frame that exists', () => {
  assert.equal(createScheduler({ idle: ['i1', 'i2'], wave: ['w1'] }).still(), 'i1');
  assert.equal(createScheduler({ idle: [], wave: ['w1'] }).still(), 'w1');
});

test('loadFrames keeps only the frames whose Image() loaded, in order, and never throws', async () => {
  class FakeImage {
    set src(v) { queueMicrotask(() => (/-02\.png$/.test(v) ? this.onerror() : this.onload())); }
  }
  const got = await loadFrames(framePaths({ idle: 3, wink: 1 }), FakeImage);
  assert.deepEqual(got.idle, ['assets/img/rimon/frames/idle-01.png', 'assets/img/rimon/frames/idle-03.png']);
  assert.deepEqual(got.wink, ['assets/img/rimon/frames/wink-01.png']);
  const none = await loadFrames(framePaths({ idle: 2 }), undefined);
  assert.deepEqual(none.idle, []);
});
