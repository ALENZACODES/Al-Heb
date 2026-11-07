import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODEH_ANI, prayerKey, pickPrayer } from '../src/shell/prayer-veil.js';
import { autoplayAllowed, clipFor, createEntryPlayback } from '../src/shell/prayer-audio.js';

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
  assert.match(html, /id="alef-prayer-play"/);
});

test('an opening entry plays only its own Israeli clip, and a blocked start is not another voice', async () => {
  const catalog = JSON.parse(readFileSync(new URL('../data/homepage/prayer-audio.json', import.meta.url), 'utf8'));
  const covered = catalog.clips.filter((c) => c.f && c.m);
  assert.ok(covered.length > 0);
  for (const clip of covered) {
    assert.equal(clipFor(catalog, clip.he, 'f'), clip.f);
    assert.equal(clipFor(catalog, clip.he, 'm'), clip.m);
    assert.equal(clipFor(catalog, clip.he, 'sephardi'), null);
    assert.match(clip.f, /^audio\/f\/israeli\//);
    assert.match(clip.m, /^audio\/m\/israeli\//);
  }
  assert.equal(clipFor(catalog, 'אין קטע כזה', 'f'), null);
  assert.equal(autoplayAllowed({ audioFree: true }), false);
  assert.equal(autoplayAllowed({ calmMode: true }), false);
  assert.equal(autoplayAllowed({ soundEffects: false }), false);
  assert.equal(autoplayAllowed({ soundEffects: true, voice: 'm' }), true);
  const blocked = createEntryPlayback({
    path: covered[0].f,
    AudioCtor: class { play() { return Promise.reject(new Error('autoplay')); } load() {} pause() {} removeAttribute() {} addEventListener() {} },
  });
  assert.deepEqual(await blocked.start(), { ok: false, reason: 'autoplay-blocked' });
  const plays = [];
  const ok = createEntryPlayback({
    path: covered[0].m,
    AudioCtor: class { constructor(src) { plays.push(src); this.paused = false; } play() { this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } load() {} removeAttribute() {} addEventListener() {} },
  });
  assert.equal((await ok.start()).ok, true);
  ok.stop();
  assert.deepEqual(plays, [covered[0].m]);
});
