import test from 'node:test';
import assert from 'node:assert/strict';
import {
  place, isComplete, finishRecord, accuracyOf,
  promiseDateISO, formatPromiseDate, promiseLine, FINISH_BEATS,
} from '../src/firstday/minuteone.model.js';

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
  const rec = finishRecord({
    seconds: 42.2, correctBeats: 7, totalBeats: 7, nowISO: '2026-11-06T00:00:00.000Z',
    motivation: 'prayer', level: 'zero', minutes: 5, promiseDate: '2026-11-27',
  });
  assert.equal(rec.done, true);
  assert.equal(rec.seconds, 42);
  assert.equal(rec.accuracy, 100);
  assert.equal(rec.motivation, 'prayer');
  assert.equal(rec.minutes, 5);
});

test('accuracy', () => assert.equal(accuracyOf(6, 7), 86));

test('Busuu promise date is daysOut ahead', () => {
  const iso = promiseDateISO(21, new Date(2026, 10, 6)); // Nov 6 local
  assert.equal(iso, '2026-11-27');
  assert.match(formatPromiseDate(iso), /2026/);
});

test('promise line uses motivation target', () => {
  const line = promiseLine(
    { promiseTarget: 'decode the Shema unaided' },
    { minutes: 5 },
    'Nov 27, 2026',
  );
  assert.match(line, /5 min/);
  assert.match(line, /Shema/);
  assert.match(line, /Nov 27/);
});

test('finish beats: gratitude before words; haptic on streak; save before personalise', () => {
  assert.equal(FINISH_BEATS[0], 'gratitude');
  assert.equal(FINISH_BEATS[1], 'wordsLarge');
  assert.equal(FINISH_BEATS[3], 'streakReveal');
  assert.ok(FINISH_BEATS.indexOf('save') < FINISH_BEATS.indexOf('personalise'));
  assert.ok(FINISH_BEATS.indexOf('nextOpen') < FINISH_BEATS.indexOf('save'));
});
