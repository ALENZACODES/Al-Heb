import test from 'node:test';
import assert from 'node:assert/strict';
import { place, isComplete, finishRecord, accuracyOf } from '../src/firstday/minuteone.model.js';

const letters = ['alef', 'bet', 'alef'];

test('places אבא in order', () => {
  let p = [];
  let r = place(p, letters, 'bet');
  assert.equal(r.ok, false);
  r = place(p, letters, 'alef'); assert.equal(r.ok, true); p = r.placed;
  r = place(p, letters, 'bet'); assert.equal(r.ok, true); p = r.placed;
  r = place(p, letters, 'alef'); assert.equal(r.ok, true); p = r.placed;
  assert.equal(isComplete(p, letters), true);
});

test('finish record', () => {
  const rec = finishRecord({ seconds: 42.2, correctBeats: 7, totalBeats: 7, nowISO: '2026-11-06T00:00:00.000Z' });
  assert.equal(rec.done, true);
  assert.equal(rec.seconds, 42);
  assert.equal(rec.accuracy, 100);
});

test('accuracy', () => assert.equal(accuracyOf(6, 7), 86));
