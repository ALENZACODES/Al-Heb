import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODEH_ANI, prayerKey, pickPrayer } from '../src/shell/prayer-veil.js';

const data = JSON.parse(readFileSync(new URL('../data/homepage/prayers.json', import.meta.url), 'utf8'));
const bank = data.prayers;

test('opening prayer bank is exactly 80 distinct pointed, sourced Hebrew and English entries', () => {
  assert.equal(data.reviewStatus, 'ASSEMBLED_FOR_REVIEW');
  assert.equal(bank.length, 80);
  assert.equal(new Set(bank.map((p) => p.he)).size, 80);
  assert.ok(bank.some((p) => p.he === MODEH_ANI.he));
  for (const p of bank) {
    assert.deepEqual(Object.keys(p).sort(), ['en', 'he', 'source']);
    assert.match(p.he, /[\u05B0-\u05C7]/);
    assert.match(p.he, /[\u05D0-\u05EA]/);
    assert.ok(p.en.length > 10);
    assert.ok(p.source.length > 12);
  }
});

test('random picker excludes the previous prayer without biasing an eligible candidate to fallback', () => {
  const first = bank[0];
  const next = pickPrayer(bank, prayerKey(first), () => 0);
  assert.notEqual(prayerKey(next), prayerKey(first));
  const again = pickPrayer(bank, prayerKey(next), () => .999999);
  assert.notEqual(prayerKey(again), prayerKey(next));
  assert.deepEqual(pickPrayer([], 'x'), MODEH_ANI);
  assert.deepEqual(pickPrayer(null, 'x'), MODEH_ANI);
  assert.deepEqual(pickPrayer([bank[0], bank[1]], prayerKey(bank[0]), () => 0), bank[1]);
});

test('opening card has a hard timeout, skip controls and ready signal before the app route', () => {
  const src = readFileSync(new URL('../src/shell/prayer-veil.js', import.meta.url), 'utf8');
  assert.match(src, /\? 800 : 2200/);
  assert.match(src, /document\.addEventListener\('alef:ready'/);
  assert.match(src, /veil\.addEventListener\('click'/);
  assert.match(src, /prefers-reduced-motion/);
  const boot = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(boot, /dispatchEvent\(new Event\('alef:ready'\)\)/);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="alef-prayer-veil"/);
  assert.match(html, /id="alef-prayer-skip"/);
});
