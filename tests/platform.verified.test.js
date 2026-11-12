// H9 badges tied only to verified completions; completions without a kept passing score are the "unverified era".
import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonBadges } from '../src/platform/verified.js';
import { withCheck } from '../src/curriculum/passmark.js';

const lessons = [{ id: 'r01', track: 'read', title: 'One' }, { id: 'r02', track: 'read', title: 'Two' }, { id: 'I-01', track: 'israel', title: 'Cafe' }];

test('only lessons with a kept passing first-try score count; the rest are listed as the unverified era', () => {
  let checks = withCheck(null, 'r01', 4, 4, 10);
  checks = withCheck(checks, 'r02', 1, 4, 11); // below the pass mark: no pass kept
  const r = lessonBadges({ progress: { completed: { r01: 10, r02: 11, 'I-01': 5 } }, checks, lessons });
  assert.deepEqual(r.verified.map((v) => v.id), ['r01']);
  assert.deepEqual(r.unverified.map((u) => u.id).sort(), ['I-01', 'r02']);
  const b = Object.fromEntries(r.list.map((x) => [x.id, x]));
  assert.equal(b['verified-1'].earned, true);
  assert.equal(b['verified-5'].earned, false); assert.equal(b['verified-5'].have, 1);
  assert.equal(b['track-read'].earned, false); assert.equal(b['track-read'].have, 1); assert.equal(b['track-read'].of, 2);
  assert.equal(b['track-israel'].have, 0);
});

test('a completion with no score at all never earns a badge, even many of them', () => {
  const completed = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`x${i}`, i + 1]));
  const many = Array.from({ length: 60 }, (_, i) => ({ id: `x${i}`, track: 'read', title: `L${i}` }));
  const r = lessonBadges({ progress: { completed }, checks: null, lessons: many });
  assert.equal(r.list.filter((x) => x.earned).length, 0);
  assert.equal(r.unverified.length, 60);
});

test('Lesson Badges page shows earned badges and the unverified era', async () => {
  const { N, tick, memStore } = await import('./torahread.fakedom.js');
  const V = await import('../src/platform/verified.view.js');
  const store = memStore();
  store.m['curriculum.progress'] = { completed: { r01: 10, r02: 11 } };
  store.m['lesson.checks.v1'] = withCheck(null, 'r01', 3, 4, 10);
  const root = new N('main'); V.mount(root, { store }); await tick(80);
  assert.match(root.textContent, /First Verified Lesson: earned/);
  assert.match(root.textContent, /Unverified Era/);
  assert.match(root.textContent, /1 lesson was marked complete without a kept passing score/);
});
