import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { MODEH_ANI, prayerKey, pickPrayer, prayerAudioPath, AUDIO_STATES, isAutoplayBlock, startsBlockedPlayback } from '../src/shell/prayer-veil.js';

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

test('veil audio: every clip in the bank map exists on disk, both voices, 80 prayers', () => {
  const { existsSync } = require('node:fs');
  assert.equal(Object.keys(data.audio).length, 80);
  for (let i = 1; i <= 80; i++) for (const v of ['m', 'f']) {
    const path = data.audio[String(i)]?.[v];
    assert.ok(path, `prayer ${i} voice ${v} is mapped`);
    assert.ok(existsSync(new URL('../' + path, import.meta.url)), `${path} exists`);
  }
});

test('veil autoplay: the clip starts as the prayer renders; a policy refusal asks for a tap instead of giving up', () => {
  const src = readFileSync(new URL('../src/shell/prayer-veil.js', import.meta.url), 'utf8');
  // autoplay attempt right after the Listen button is revealed
  assert.match(src, /listenBtn\.hidden = false;[\s\S]{0,400}startPlayback\(\{ auto: true \}\)/);
  // only the automatic attempt may turn NotAllowedError into the tap prompt; a Listen tap that fails hides the controls
  assert.match(src, /if \(auto && isAutoplayBlock\(err\)\) \{ blockedByPolicy\(\); return; \}/);
  // the first tap on a blocked veil starts the clip and swallows the click that would dismiss it
  assert.match(src, /veil\.addEventListener\('pointerdown', onFirstGesture\)/);
  assert.match(src, /if \(Date\.now\(\) < swallowClickUntil\)/);
  // the veil holds while the clip plays and closes 1 s after it ends
  assert.match(src, /audio\.onended = \(\) => \{ setAudioState\('idle'\); releaseAfter\(1000\); \}/);
  // the listen count moves once per prayer, only after play() resolved
  assert.match(src, /if \(!counted\) \{ counted = true;/);
  // the audio-free setting and the opt-out are still honoured before any clip is touched
  assert.match(src, /prefs\.audioFree \? null : prayerAudioPath/);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="alef-prayer-audio-prompt"[^>]*hidden/);
  assert.match(html, /id="alef-prayer-listen" aria-pressed="false" hidden/);
});

test('veil audio states: labels, prompt and pressed state per state', () => {
  assert.equal(AUDIO_STATES.idle.label, 'Listen to this prayer');
  assert.equal(AUDIO_STATES.playing.label, 'Pause the prayer');
  assert.equal(AUDIO_STATES.playing.pressed, 'true');
  assert.equal(AUDIO_STATES.paused.label, 'Continue the prayer');
  assert.equal(AUDIO_STATES.blocked.prompt, 'Tap anywhere to hear the prayer');
  for (const k of ['idle', 'playing', 'paused']) assert.equal(AUDIO_STATES[k].prompt, '', `${k} shows no prompt`);
});

test('veil autoplay: NotAllowedError is the browser policy; other media errors are real failures', () => {
  assert.equal(isAutoplayBlock({ name: 'NotAllowedError', message: 'play() failed because the user didn\'t interact with the document first.' }), true);
  assert.equal(isAutoplayBlock({ name: 'NotSupportedError', message: 'no supported source' }), false);
  assert.equal(isAutoplayBlock({ name: 'AbortError', message: 'interrupted by a new load request' }), false);
  assert.equal(isAutoplayBlock(null), false);
  assert.equal(isAutoplayBlock(undefined), false);
});

test('veil autoplay: which gestures start a blocked clip (buttons, Escape and Tab keep their own meaning)', () => {
  const inButton = { closest: (sel) => (/button/.test(sel) ? {} : null) };
  const blank = { closest: () => null };
  assert.equal(startsBlockedPlayback({ type: 'pointerdown', target: blank }), true);
  assert.equal(startsBlockedPlayback({ type: 'pointerdown', target: inButton }), false, 'Skip, Close, Don\'t show again and Listen keep their own handlers');
  assert.equal(startsBlockedPlayback({ type: 'keydown', key: 'Enter', target: blank }), true);
  assert.equal(startsBlockedPlayback({ type: 'keydown', key: ' ', target: blank }), true);
  assert.equal(startsBlockedPlayback({ type: 'keydown', key: 'Escape', target: blank }), false);
  assert.equal(startsBlockedPlayback({ type: 'keydown', key: 'Tab', target: blank }), false);
  assert.equal(startsBlockedPlayback({ type: 'keydown', key: 'r', ctrlKey: true, target: blank }), false);
  assert.equal(startsBlockedPlayback({ type: 'keydown', key: 'Enter', target: inButton }), false);
  assert.equal(startsBlockedPlayback(null), false);
});
