// Talk language pack end to end in headless Chromium under the site's real Content-Security-Policy. Browser tier (slow).
// Skipped when Playwright is missing. Downloads the Hebrew to English pack from the local server (about 91 MB).
import test from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let runTalk = null; let runCameraWithPack = null;
try { ({ runTalk, runCameraWithPack } = await import('../tools/talk/nmt/e2e-talk.mjs')); } catch { /* no playwright */ }

test('e2e #/talk: nothing of the pack is fetched until asked; download with progress; a new line is translated; a reload finds the pack on the device', { skip: !runTalk, timeout: 400000 }, async () => {
  const r = await runTalk({ direction: 'he-en' });
  assert.deepEqual(r.errors, []); assert.deepEqual(r.posts, []); assert.deepEqual(r.externalOrigins, []);
  assert.match(r.packText, /Hebrew to English: about \d+ MB to download/); assert.match(r.packText, /Wi-Fi/);
  assert.equal(r.packRequestsBefore, 0, 'no pack or runtime file before the learner asks');
  assert.equal(r.before.translation, ''); assert.match(r.before.note, /language pack can translate it/);
  assert.ok(r.progress.length >= 5 && r.progress[r.progress.length - 1] === 100, 'the progress bar moved to 100');
  for (let i = 1; i < r.progress.length; i++) assert.ok(r.progress[i] >= r.progress[i - 1], 'progress never goes back');
  assert.match(r.packNote, /is ready\. It works offline/);
  assert.equal(r.results[0].badge, 'Translated on this device'); assert.match(r.results[0].translation, /dog/i); assert.match(r.results[0].note, /not from a checked line/);
  assert.equal(r.results[1].badge, 'Built from a sentence pattern', 'a line the stored lines hold still comes from them');
  assert.ok(r.cache.names.includes('alef-talk-pack-v1')); assert.ok(r.cache.bytes > 80 * 1048576 && r.cache.bytes < 110 * 1048576);
  assert.equal(r.refetched, 0, 'after a reload no pack part is downloaded again');
  assert.equal(r.again.translation, r.results[0].translation);
});

test('e2e #/camera with the pack on the device: a sign outside the sign list is translated as a whole line; a listed sign still comes from the list', { skip: !runCameraWithPack, timeout: 400000 }, async () => {
  const sign = (n) => join(root, 'tools/camera-translate/tests', n);
  const r = await runCameraWithPack({ images: [sign('signs/shoe-shop.jpg'), sign('fixtures/outside-list-salt.jpg'), sign('signs/optical-store.jpg')] });
  assert.deepEqual(r.errors, []); assert.deepEqual(r.posts, []); assert.deepEqual(r.externalOrigins, []);
  assert.match(r.packNote, /language pack is on this device/);
  assert.match(r.out[0].lines[0], /Shoe/i); assert.match(r.out[0].detail, /Translated on this device by the language pack/);
  assert.deepEqual(r.out[1].lines, ['1. Not translated'], 'one word with two meanings stays with the dictionary rule');
  assert.deepEqual(r.out[2].lines, ['1. Optical Store']); assert.match(r.out[2].detail, /From the built-in word list/);
});
