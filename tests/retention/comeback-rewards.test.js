import './_helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { T } from './_helpers.js';
import { defaults } from '../../src/retention/state.js';
import { welcomeBack, isComebackDay, comebackReward, comebackTier, comebackView, COMEBACK } from '../../src/retention/recap.js';

const fresh = (last, o = {}) => {
  const r = Object.assign(defaults(T('2026-10-01T10:00'), 'install-1'), { lessonsFinished: 9 }, o);
  if (last) r.sessions = [{ s: T(last), e: T(last) + 10 * 60 * 1000 }];
  r.hearts.n = 1;
  return r;
};

test('the refresher and the gem reward step up with the gap, and never mention a streak', () => {
  assert.deepEqual(comebackReward(7), { days: 7, tier: 'short', gems: 10, review: 5 });
  assert.deepEqual(comebackReward(13), { days: 13, tier: 'short', gems: 10, review: 5 });
  assert.deepEqual(comebackReward(14), { days: 14, tier: 'mid', gems: 15, review: 10 });
  assert.deepEqual(comebackReward(29), { days: 29, tier: 'mid', gems: 15, review: 10 });
  assert.deepEqual(comebackReward(30), { days: 30, tier: 'long', gems: 20, review: 15 });
  assert.equal(comebackTier(9), 'short');
  assert.equal(COMEBACK.gems.short, 10);
  for (const t of ['short', 'mid', 'long']) {
    assert.doesNotMatch(String(COMEBACK.gems[t]), /streak|shame|broke/i);
  }
});

test('welcome back after 9 days: 10 gems once, 5 old cards, hearts filled, paid only once', () => {
  const r = fresh('2026-11-01T19:00');
  const out = welcomeBack(r, T('2026-11-10T09:00'));
  assert.equal(out.back, true);
  assert.equal(out.days, 9);
  assert.equal(out.gems, 10);
  assert.equal(out.review, 5);
  assert.equal(out.rec.hearts.n, 5);
  assert.equal(out.rec.gems.balance, 10);
  assert.equal(out.rec.gems.ledger.at(-1).why, 'comeback');
  assert.equal(isComebackDay(out.rec, T('2026-11-10T20:00')), true);
  assert.equal(welcomeBack(out.rec, T('2026-11-10T12:00')).back, false);
  assert.equal(welcomeBack(out.rec, T('2026-11-10T12:00')).rec.gems.balance, 10, 'pays once');
  const v = comebackView(out.rec, T('2026-11-10T12:00'));
  assert.deepEqual([v.days, v.gems, v.review, v.href], [9, 10, 5, '#/learn?review=1']);
  assert.equal(r.gems.balance, 0, 'input untouched');
});

test('a longer absence gets a larger warm-up and a larger welcome-back reward', () => {
  const mid = welcomeBack(fresh('2026-10-20T19:00'), T('2026-11-10T09:00'));
  assert.deepEqual([mid.back, mid.days, mid.gems, mid.review], [true, 21, 15, 10]);
  const long = welcomeBack(fresh('2026-09-01T19:00'), T('2026-11-10T09:00'));
  assert.ok(long.days >= 30);
  assert.deepEqual([long.back, long.gems, long.review], [true, 20, 15]);
  assert.equal(comebackView(long.rec, T('2026-11-10T09:00')).review, 15);
});
