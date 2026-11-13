import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, normalize } from '../../src/retention/state.js';
import { earn, PRICES, buyUnlock, grantEarnedOutfits, shopState, SHOP_EARNED_OUTFITS, earnedNeedLine } from '../../src/retention/gems.js';

const NOW = Date.parse('2026-11-13T10:00:00-05:00');
const base = () => earn(defaults(NOW, 'install-t2'), 500, 'goal', NOW);

test('earned outfits are not in the paid catalog and have a clear need line', () => {
  assert.equal(SHOP_EARNED_OUTFITS.length, 2);
  assert.match(earnedNeedLine(SHOP_EARNED_OUTFITS[0]), /5 finished lessons/);
  assert.match(earnedNeedLine(SHOP_EARNED_OUTFITS[1]), /7-day streak/);
});

test('the lesson pin is granted at five finished lessons, not before', () => {
  const early = grantEarnedOutfits({ ...base(), lessonsFinished: 4 }, { lessons: 4, streak: 0 });
  assert.ok(!shopState(early).outfits.includes('pin'));
  const got = grantEarnedOutfits({ ...base(), lessonsFinished: 5 }, { lessons: 5, streak: 0 });
  assert.ok(shopState(got).outfits.includes('pin'));
  assert.ok(shopState(got).earnedOutfits.includes('pin'));
  assert.equal(shopState(got).outfitActive, 'pin');
  assert.equal(got.gems.balance, 500, 'earning costs no gems');
});

test('the week badge is granted at a 7-day streak, and does not replace a worn outfit', () => {
  let rec = buyUnlock(base(), 'outfit', 'scarf', NOW).rec;
  assert.equal(shopState(rec).outfitActive, 'scarf');
  rec = grantEarnedOutfits(rec, { lessons: 0, streak: 7 });
  assert.ok(shopState(rec).outfits.includes('badge'));
  assert.ok(shopState(rec).outfits.includes('scarf'));
  assert.equal(shopState(rec).outfitActive, 'scarf', 'a worn outfit stays on');
});

test('grant is stable once earned, and normalize keeps pin and badge', () => {
  const once = grantEarnedOutfits({ ...base(), lessonsFinished: 10 }, { lessons: 10, streak: 7 });
  const again = grantEarnedOutfits(once, { lessons: 10, streak: 7 });
  assert.deepEqual(shopState(again).outfits, shopState(once).outfits);
  const n = normalize(once, NOW);
  assert.ok(n.shop.outfits.includes('pin') && n.shop.outfits.includes('badge'));
  assert.deepEqual(n.shop.earnedOutfits.slice().sort(), ['badge', 'pin']);
});

test('bought outfits are unchanged: scarf still costs 120 gems', () => {
  const r = buyUnlock(base(), 'outfit', 'scarf', NOW);
  assert.equal(r.ok, true);
  assert.equal(r.rec.gems.balance, 500 - PRICES.outfit);
  assert.equal(buyUnlock(base(), 'outfit', 'pin', NOW).reason, 'unknown');
});
