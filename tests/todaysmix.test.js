import test from 'node:test';
import assert from 'node:assert/strict';
import { mixUnlocked, composeMix } from '../src/home/todaysmix.js';
import catalog from '../data/fun/todays-mix.json' with { type: 'json' };

test('mix stays locked on day 1', () => {
  assert.equal(mixUnlocked({ spokenTurns: 0, distinctDays: 1 }), false);
  assert.equal(mixUnlocked({ spokenTurns: 3, distinctDays: 1 }), false);
});

test('mix unlocks after turns and return day', () => {
  assert.equal(mixUnlocked({ spokenTurns: 3, distinctDays: 2 }), true);
});

test('composeMix returns three routed tiles', () => {
  const mix = composeMix(catalog, { goal: 'both', hasRoute: () => true, rng: () => 0 });
  assert.equal(mix.tiles.length, 3);
  assert.ok(mix.tiles.every((t) => t.href.startsWith('#')));
});
