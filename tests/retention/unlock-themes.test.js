import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, normalize } from '../../src/retention/state.js';
import { earn, PRICES, buyUnlock, chooseUnlock, shopState, applyShopLook, SHOP_THEMES, SHOP_PROGRESS_THEMES, themeNeedLine, themeGateOpen, themePrice } from '../../src/retention/gems.js';

const NOW = Date.parse('2026-11-13T10:00:00');
const rich = (lessons = 0) => {
  let r = defaults(NOW, 'install-themes');
  r.lessonsFinished = lessons;
  r = earn(r, 2000, 'goal', NOW);
  return r;
};

test('T1 looks stay at 80 gems with no progress gate, and progress looks cost 100', () => {
  assert.equal(PRICES.theme, 80);
  assert.equal(PRICES.progressTheme, 100);
  assert.equal(PRICES.freeze, 200);
  assert.deepEqual(SHOP_THEMES.map((x) => x.id), ['sepia', 'dusk']);
  assert.deepEqual(SHOP_PROGRESS_THEMES.map((x) => x.id), ['ink', 'olive', 'type']);
  assert.equal(themePrice(SHOP_THEMES[0]), 80);
  assert.equal(themePrice(SHOP_PROGRESS_THEMES[0]), 100);
  const open = buyUnlock(rich(0), 'theme', 'sepia', NOW);
  assert.equal(open.ok, true);
  assert.equal(open.rec.gems.balance, 2000 - 80);
});

test('Night ink stays locked before 10 finished lessons, even with gems', () => {
  const item = SHOP_PROGRESS_THEMES.find((x) => x.id === 'ink');
  assert.match(themeNeedLine(item), /10 finished lessons/);
  assert.equal(themeGateOpen(item, { lessons: 9 }), false);
  const locked = buyUnlock(rich(9), 'theme', 'ink', NOW, { lessons: 9, streak: 20 });
  assert.equal(locked.ok, false);
  assert.equal(locked.reason, 'locked');
  assert.equal(locked.rec.gems.balance, 2000);
  assert.deepEqual(shopState(locked.rec).themes, []);
});

test('Night ink can be bought after 10 finished lessons, and becomes the active look', () => {
  const out = buyUnlock(rich(10), 'theme', 'ink', NOW, { lessons: 10, streak: 0 });
  assert.equal(out.ok, true);
  assert.equal(out.rec.gems.balance, 2000 - 100);
  assert.deepEqual(shopState(out.rec).themes, ['ink']);
  assert.equal(shopState(out.rec).themeActive, 'ink');
  assert.equal(buyUnlock(out.rec, 'theme', 'ink', NOW, { lessons: 10 }).reason, 'owned');
});

test('Olive grove unlocks after a 7-day streak, not before', () => {
  const item = SHOP_PROGRESS_THEMES.find((x) => x.id === 'olive');
  assert.match(themeNeedLine(item), /7-day streak/);
  assert.equal(buyUnlock(rich(20), 'theme', 'olive', NOW, { lessons: 20, streak: 6 }).reason, 'locked');
  const out = buyUnlock(rich(20), 'theme', 'olive', NOW, { lessons: 20, streak: 7 });
  assert.equal(out.ok, true);
  assert.equal(shopState(out.rec).themeActive, 'olive');
});

test('Clear type unlocks after 15 finished lessons', () => {
  const item = SHOP_PROGRESS_THEMES.find((x) => x.id === 'type');
  assert.match(themeNeedLine(item), /15 finished lessons/);
  assert.equal(buyUnlock(rich(14), 'theme', 'type', NOW, { lessons: 14 }).reason, 'locked');
  const out = buyUnlock(rich(15), 'theme', 'type', NOW, { lessons: 15 });
  assert.equal(out.ok, true);
  assert.equal(shopState(out.rec).themes.includes('type'), true);
});

test('normalize keeps unlocked progress looks and still drops unknown ids', () => {
  const r = normalize({ v: 1, shop: { themes: ['ink', 'olive', 'type', 'neon'], themeActive: 'type' } }, NOW);
  assert.deepEqual(r.shop.themes, ['ink', 'olive', 'type']);
  assert.equal(r.shop.themeActive, 'type');
});

test('applyShopLook paints a progress theme, and chooseUnlock can return to the usual look', () => {
  let r = buyUnlock(rich(15), 'theme', 'type', NOW, { lessons: 15 }).rec;
  const attrs = {};
  const doc = {
    documentElement: { attrs, setAttribute(k, v) { attrs[k] = v; }, removeAttribute(k) { delete attrs[k]; } },
    getElementById: () => null,
    createElement: () => ({ id: '', textContent: '', setAttribute() {} }),
    head: { appendChild() {} },
  };
  applyShopLook(r, doc);
  assert.equal(attrs['data-shop-theme'], 'type');
  r = chooseUnlock(r, 'theme', null);
  applyShopLook(r, doc);
  assert.equal(attrs['data-shop-theme'], undefined);
});
