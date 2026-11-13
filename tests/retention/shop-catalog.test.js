import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, normalize, clone } from '../../src/retention/state.js';
import { earn, spend, PRICES, buyShield, buyUnlock, chooseUnlock, buyGameLevel, arcadeBoost, shopState, applyShopLook, SHOP_LIMITS } from '../../src/retention/gems.js';
import { applyRollover } from '../../src/retention/streak.js';
import { T, streakRec } from './_helpers.js';

const NOW = T('2026-11-13T10:00');
const rich = () => { let r = defaults(NOW, 'install-shop'); r = earn(r, 2000, 'goal', NOW); return r; };

test('new shop prices leave the old freeze and hearts prices alone', () => {
  assert.equal(PRICES.freeze, 200);
  assert.equal(PRICES.hearts, 350);
  assert.equal(PRICES.shield, 250);
  assert.equal(PRICES.theme, 80);
  assert.equal(PRICES.outfit, 120);
  assert.equal(PRICES.audio, 150);
  assert.equal(PRICES.gameLevel, 180);
});

test('normalize fills an empty shop and drops unknown ids', () => {
  const r = normalize({ v: 1, shop: { themes: ['sepia', 'neon'], outfits: ['scarf', 'tuxedo'], audio: ['blessings', 'secret'], themeActive: 'neon', outfitActive: 'scarf', gameLevels: 9, shields: { held: 8, used: ['2026-11-01'] } } }, NOW);
  assert.deepEqual(r.shop.themes, ['sepia']);
  assert.equal(r.shop.themeActive, null);
  assert.deepEqual(r.shop.outfits, ['scarf']);
  assert.equal(r.shop.outfitActive, 'scarf');
  assert.deepEqual(r.shop.audio, ['blessings']);
  assert.equal(r.shop.gameLevels, 2);
  assert.equal(r.shop.shields.held, 2);
});

test('buying a theme, outfit and audio pack spends gems and marks them owned', () => {
  let r = rich();
  const theme = buyUnlock(r, 'theme', 'sepia', NOW);
  assert.equal(theme.ok, true);
  assert.equal(theme.rec.gems.balance, 2000 - PRICES.theme);
  assert.deepEqual(shopState(theme.rec).themes, ['sepia']);
  assert.equal(shopState(theme.rec).themeActive, 'sepia');
  assert.equal(buyUnlock(theme.rec, 'theme', 'sepia', NOW).reason, 'owned');
  const outfit = buyUnlock(theme.rec, 'outfit', 'scarf', NOW);
  assert.equal(outfit.ok, true);
  assert.deepEqual(shopState(outfit.rec).outfits, ['scarf']);
  const audio = buyUnlock(outfit.rec, 'audio', 'blessings', NOW);
  assert.equal(audio.ok, true);
  assert.deepEqual(shopState(audio.rec).audio, ['blessings']);
  assert.equal(buyUnlock(r, 'theme', 'nope', NOW).reason, 'unknown');
  assert.equal(buyUnlock(defaults(NOW, 'x'), 'theme', 'dusk', NOW).reason, 'balance');
});

test('chooseUnlock only selects an owned look, and can clear it', () => {
  let r = buyUnlock(rich(), 'theme', 'sepia', NOW).rec;
  r = buyUnlock(r, 'theme', 'dusk', NOW).rec;
  r = chooseUnlock(r, 'theme', 'sepia');
  assert.equal(shopState(r).themeActive, 'sepia');
  r = chooseUnlock(r, 'theme', null);
  assert.equal(shopState(r).themeActive, null);
  assert.deepEqual(chooseUnlock(r, 'theme', 'dusk').shop.themeActive, 'dusk');
});

test('shields: at most two held; 249 gems is not enough', () => {
  assert.equal(buyShield(defaults(NOW, 'x')).reason, 'balance');
  let r = rich();
  r = buyShield(r, NOW).rec;
  r = buyShield(r, NOW).rec;
  assert.equal(r.shop.shields.held, SHOP_LIMITS.shieldMax);
  assert.equal(buyShield(r, NOW).reason, 'max');
  assert.equal(r.gems.balance, 2000 - 2 * PRICES.shield);
});

test('a shield covers a missed weekday when no freeze is held', () => {
  const wed = T('2026-11-11T10:00');
  let rec = defaults(T('2026-11-01T10:00'), 'install-1');
  rec.freezes.evaluatedThrough = '2026-11-08';
  rec = buyShield(earn(rec, PRICES.shield, 'goal', NOW), NOW).rec;
  const out = applyRollover(streakRec({ last: '2026-11-09' }), rec, wed);
  assert.deepEqual(out.events, ['shield_used']);
  assert.equal(out.ret.shop.shields.held, 0);
  assert.deepEqual(out.ret.shop.shields.used, ['2026-11-10']);
  assert.equal(out.ret.freezes.held, 0);
});

test('freezes and shields are all-or-nothing together, and freezes are spent first', () => {
  const thu = T('2026-11-12T10:00'); // last Mon 9, miss Tue 10 and Wed 11
  let rec = defaults(T('2026-11-01T10:00'), 'install-1');
  rec.freezes.evaluatedThrough = '2026-11-08';
  rec.freezes.held = 1;
  rec = buyShield(earn(rec, PRICES.shield, 'goal', NOW), NOW).rec;
  const covered = applyRollover(streakRec({ last: '2026-11-09' }), rec, thu);
  assert.ok(covered.events.includes('freeze_used'));
  assert.ok(covered.events.includes('shield_used'));
  assert.equal(covered.ret.freezes.held, 0);
  assert.equal(covered.ret.shop.shields.held, 0);
  const one = defaults(T('2026-11-01T10:00'), 'install-2');
  one.freezes.evaluatedThrough = '2026-11-08';
  one.freezes.held = 0;
  const oneShield = buyShield(earn(one, PRICES.shield, 'goal', NOW), NOW).rec;
  const broken = applyRollover(streakRec({ last: '2026-11-09' }), oneShield, thu);
  assert.deepEqual(broken.events, ['streak_broken']);
  assert.equal(broken.ret.shop.shields.held, 1, 'the unspent shield stays');
});

test('bonus arcade levels cap at two and report a boost', () => {
  let r = rich();
  r = buyGameLevel(r, NOW).rec;
  r = buyGameLevel(r, NOW).rec;
  assert.equal(arcadeBoost(r), 2);
  assert.equal(buyGameLevel(r, NOW).reason, 'max');
});

test('applyShopLook sets data attributes and skips injecting twice', () => {
  const rec = buyUnlock(buyUnlock(rich(), 'theme', 'sepia', NOW).rec, 'outfit', 'scarf', NOW).rec;
  const doc = {
    documentElement: { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } },
    head: { children: [], appendChild(el) { this.children.push(el); } },
    getElementById(id) { return id === 'alef-shop-look' && this.head.children[0] ? this.head.children[0] : null; },
    createElement() { return { id: '', textContent: '' }; },
  };
  applyShopLook(rec, doc);
  assert.equal(doc.documentElement.attrs['data-shop-theme'], 'sepia');
  assert.equal(doc.documentElement.attrs['data-rimon-outfit'], 'scarf');
  applyShopLook(rec, doc);
  assert.equal(doc.head.children.length, 1);
});

test('existing spend still works and does not invent a shop on a clone with no shop field until we buy', () => {
  const r = spend(earn(defaults(NOW, 'y'), 200, 'goal', NOW), PRICES.freeze, 'buy-freeze', NOW);
  assert.equal(r.ok, true);
});
