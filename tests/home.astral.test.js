import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MODEH_ANI, prayerKey, pickPrayer, prayerAudioPath } from '../src/shell/prayer-veil.js';

const data = JSON.parse(readFileSync(new URL('../data/homepage/prayers.json', import.meta.url), 'utf8'));
const bank = data.prayers;

test('opening prayer bank is exactly 80 distinct pointed, sourced Hebrew and English entries', () => {
  assert.equal(data.reviewStatus, 'ASSEMBLED_FOR_REVIEW');
  assert.equal(bank.length, 80);
  assert.equal(new Set(bank.map((p) => p.he)).size, 80);
  assert.ok(bank.some((p) => p.he === MODEH_ANI.he));
  for (const p of bank) {
    assert.deepEqual(Object.keys(p).sort(), ['en', 'he', 'source', 'tr']);
    assert.match(p.he, /[\u05B0-\u05C7]/);
    assert.match(p.he, /[\u05D0-\u05EA]/);
    assert.ok(p.en.length > 10);
    assert.ok(p.source.length > 12);
    assert.ok(typeof p.tr === 'string' && p.tr.length > 5, 'every blessing carries phonetic English');
    assert.match(p.tr, /^[A-Za-z]/);
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
  assert.match(src, /\? 9000 : 6000/);
  assert.match(src, /document\.addEventListener\('alef:ready'/);
  // The dwell starts only once the prayer has rendered AND the app is ready:
  // a slow first visit installs the offline copy before the page settles, and
  // counting from render alone ate the dwell (owner report, Nov 7 2026).
  assert.match(src, /rendered && readySeen && !holding && !closed/);
  assert.match(src, /rendered = true;\s*\n\s*arm\(\);/);
  // A started Listen play counts toward the prayer-voice medallion; a failed
  // play never counts.
  assert.match(src, /LISTEN_COUNT_KEY/);
  assert.match(src, /p\.then\(\(\) => \{\s*\n\s*\/\/ Playback started/);
  assert.match(src, /prefers-reduced-motion/);
  const boot = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(boot, /dispatchEvent\(new Event\('alef:ready'\)\)/);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="alef-prayer-veil"/);
  assert.match(html, /id="alef-prayer-tr"/);
  assert.match(html, /id="alef-prayer-skip"/);
});

test('veil audio map: prayerAudioPath resolves by bank position and voice, null when unmapped', () => {
  const fake = { prayers: bank, audio: { '1': { m: 'audio/homepage/veil-001-m.mp3', f: 'audio/homepage/veil-001-f.mp3' } } };
  assert.equal(prayerAudioPath(fake, bank[0], 'f'), 'audio/homepage/veil-001-f.mp3');
  assert.equal(prayerAudioPath(fake, bank[0], 'm'), 'audio/homepage/veil-001-m.mp3');
  assert.equal(prayerAudioPath(fake, bank[1], 'f'), null); // position 2 unmapped
  assert.equal(prayerAudioPath({ prayers: bank }, bank[0], 'f'), null); // a bank without an audio map
  assert.equal(prayerAudioPath(null, bank[0], 'f'), null);
  assert.equal(prayerAudioPath(fake, MODEH_ANI, 'f'), 'audio/homepage/veil-001-f.mp3'); // fallback matches bank[0] by key
});
