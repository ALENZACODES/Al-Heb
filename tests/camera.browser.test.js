// End-to-end #/camera in headless Chromium under the site's real Content-Security-Policy. Browser tier (slow).
// Images are SYNTHETIC signs (tools/camera-translate/tests). Skipped when Playwright is missing.
// The Camera Translator has no server: every test also checks that nothing but the app's own address is contacted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let runCamera = null;
try { ({ runCamera } = await import('../tools/camera-translate/e2e-camera.mjs')); } catch { /* no playwright */ }
const sign = (n) => join(root, 'tools/camera-translate/tests/signs', n);
const fixture = (n) => join(root, 'tools/camera-translate/tests/fixtures', n);
const TESSERACT_LOG = /Estimating resolution/;   // the vendored reader prints this line to the console; it is not a page error
const clean = (r) => { assert.deepEqual(r.errors.filter((e) => !TESSERACT_LOG.test(e)), []); assert.deepEqual(r.posts, []); assert.deepEqual(r.externalOrigins, []); assert.equal(r.origins.length, 1); };

test('e2e #/camera: read on the device, English drawn on the photo, toggle, tap a line, word by word', { skip: !runCamera || !existsSync(sign('optical-store.jpg')) }, async () => {
  const r = await runCamera({ image: sign('optical-store.jpg') }); clean(r);
  assert.equal(r.h1, 'Camera Translator');
  assert.match(r.modeNote, /stays on this device/); assert.match(r.modeNote, /nothing is sent anywhere/);
  assert.deepEqual(r.lines, ['1. Optical Store']);
  assert.equal(r.alt, 'Your photo with the Hebrew replaced by English'); assert.equal(r.src, 'blob:');
  assert.equal(r.toggle, 'Show The Original'); assert.equal(r.afterToggle.toggle, 'Show The English'); assert.equal(r.afterToggle.alt, 'Your photo as taken');
  assert.match(r.detail, /Sounds like: chanut optika/); assert.match(r.detail, /English: Optical Store/);
  assert.equal(r.words.length, 1); assert.match(r.words[0], /chanut optika: Optical Store/);
});

test('e2e #/camera: a phone photo with camera details and a position: the saved translated photo carries none', { skip: !runCamera || !existsSync(fixture('phone-photo-with-exif.jpg')) }, async () => {
  const original = readFileSync(fixture('phone-photo-with-exif.jpg'));
  assert.ok(original.includes(Buffer.from('Exif\0\0')) && original.includes(Buffer.from('TestCam')), 'the fixture must really carry camera details');
  const r = await runCamera({ image: fixture('phone-photo-with-exif.jpg') }); clean(r);
  assert.deepEqual(r.lines, ['1. Optical Store']); assert.equal(r.save, 'aleph-translated-photo.jpg');
  assert.deepEqual([r.saved[0], r.saved[1], r.saved[2]], [0xff, 0xd8, 0xff]);
  assert.ok(!r.saved.includes(Buffer.from('Exif\0\0')) && !r.saved.includes(Buffer.from('TestCam')), 'no camera details in the saved photo');
});

test('e2e #/camera: a tilted sign is straightened, and the tap targets follow the picture that is showing', { skip: !runCamera || !existsSync(sign('caution-stairs.jpg')) }, async () => {
  const r = await runCamera({ image: sign('caution-stairs.jpg') }); clean(r);
  assert.deepEqual(r.lines, ['1. Caution', '2. Stairs']);
  assert.ok(r.notices.some((n) => /straightened/.test(n)));
  assert.equal(r.hits.length, 2); assert.equal(r.afterToggle.hits.length, 2);
  assert.notEqual(r.hits[0].top, r.afterToggle.hits[0].top, 'on the photo as taken the target sits where the tilted line is');
});

test('e2e #/camera: lines outside the sign list: the app dictionary translates word for word, or the line is left alone', { skip: !runCamera || !existsSync(fixture('outside-list-big-house.jpg')) }, async () => {
  const house = await runCamera({ image: fixture('outside-list-big-house.jpg') }); clean(house);
  assert.deepEqual(house.lines, ['1. Big House']); assert.match(house.detail, /Word for word from the Aleph dictionary/); assert.equal(house.dictionaryFetched, true);
  const shoes = await runCamera({ image: sign('shoe-shop.jpg') }); clean(shoes);
  assert.deepEqual(shoes.lines, ['1. Not translated']);
  assert.equal(shoes.toggle, null, 'nothing was drawn, so there is no translated photo to switch to');
  assert.match(shoes.detail, /No English is available for this line here/); assert.doesNotMatch(shoes.detail, /null|undefined/);
  assert.equal(shoes.words.length, 2); assert.match(shoes.words[0], /chanut: Store/);
});

test('e2e #/camera: on a bilingual sign only the Hebrew half is replaced', { skip: !runCamera || !existsSync(fixture('bilingual-exit.jpg')) }, async () => {
  const r = await runCamera({ image: fixture('bilingual-exit.jpg') }); clean(r);
  assert.deepEqual(r.lines, ['1. Exit']);
  assert.equal(r.hits.length, 1);
  assert.ok(parseFloat(r.hits[0].width) < 45, `the tap target covers the Hebrew word only, not the whole line (${r.hits[0].width})`);
  assert.ok(parseFloat(r.hits[0].left) > 45, 'and it sits on the right, where the Hebrew is');
});
