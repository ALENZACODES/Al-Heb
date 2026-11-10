import test from 'node:test';
import assert from 'node:assert/strict';
import { veilDue, localDay, VEIL_FREQUENCY } from '../src/shell/prayer-veil.js';

test('opening prayer: once a day, not on every reload', () => {
  assert.equal(VEIL_FREQUENCY, 'once-a-day');
  assert.equal(veilDue('', '2026-11-09'), true, 'first visit shows it');
  assert.equal(veilDue('2026-11-09', '2026-11-09'), false, 'a reload the same day does not');
  assert.equal(veilDue('2026-11-08', '2026-11-09'), true, 'the next day shows it again');
  assert.equal(localDay(new Date(2026, 0, 5)), '2026-01-05');
});
