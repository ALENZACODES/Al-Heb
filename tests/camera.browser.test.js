// End-to-end #/camera in headless Chromium under the site's real Content-Security-Policy. Browser tier (slow).
// Images are SYNTHETIC signs (tools/camera-translate/tests/signs). Skipped when Playwright, or for the service case Python + FastAPI + Tesseract, are missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let runCamera = null;
try { ({ runCamera } = await import('../tools/camera-translate/e2e-camera.mjs')); } catch { /* no playwright */ }
const sign = (n) => join(root, 'tools/camera-translate/tests/signs', n);
const py = spawnSync('python3', ['-c', 'import fastapi, uvicorn, cv2, PIL; import shutil, sys; sys.exit(0 if shutil.which("tesseract") else 1)']);
const TESSERACT_LOG = /Estimating resolution/;   // the vendored reader prints this line to the console; it is not a page error

test('e2e #/camera with no service: read on the device, English drawn on the photo, toggle, tap a line, nothing leaves the device', { skip: !runCamera || !existsSync(sign('optical-store.jpg')) }, async () => {
  const r = await runCamera({ image: sign('optical-store.jpg') });
  assert.deepEqual(r.errors.filter((e) => !TESSERACT_LOG.test(e)), []);            // includes CSP violations
  assert.equal(r.h1, 'Camera Translator');
  assert.match(r.modeNote, /not set up for this site yet/); assert.match(r.modeNote, /Nothing leaves your device/);
  assert.deepEqual(r.lines, ['1. Optical Store']);
  assert.equal(r.alt, 'Your photo with the Hebrew replaced by English'); assert.equal(r.src, 'blob:');
  assert.equal(r.toggle, 'Show The Original'); assert.equal(r.afterToggle.toggle, 'Show The English'); assert.equal(r.afterToggle.alt, 'Your photo as taken');
  assert.match(r.detail, /Sounds like: chanut optika/); assert.match(r.detail, /English: Optical Store/);
  assert.equal(r.save, 'aleph-translated-photo.jpg');
  assert.equal(r.words.length, 1); assert.match(r.words[0], /chanut optika: Optical Store/); assert.match(r.words[0], /built-in sign word list/);
  assert.equal(r.dictionaryFetched, true, 'the dictionary is fetched only after Word By Word is pressed (from the app\'s own origin)');
  assert.deepEqual(r.posts, []); assert.deepEqual(r.externalOrigins, []);
  assert.equal(r.origins.length, 1, 'only the app\'s own origin is contacted');
});

test('e2e #/camera with the service on a loopback port: notice before sending, one metadata-free JPEG posted, translated photo shown', { skip: !runCamera || py.status !== 0 || !existsSync(join(root, 'tools/camera-translate/tests/fixtures/phone-photo-with-exif.jpg')) }, async () => {
  const phone = join(root, 'tools/camera-translate/tests/fixtures/phone-photo-with-exif.jpg');
  const original = readFileSync(phone);
  assert.ok(original.includes(Buffer.from('Exif\0\0')) && original.includes(Buffer.from('TestCam')), 'the fixture must really carry camera details');
  const r = await runCamera({ image: phone, service: true });
  assert.deepEqual(r.errors.filter((e) => !TESSERACT_LOG.test(e)), []);
  assert.match(r.sendNotice, /Location and camera details are removed/); assert.match(r.sendNotice, /not kept/);
  assert.equal(r.health.storesPhotos, false);
  assert.deepEqual(r.lines, ['1. Optical Store']);
  assert.equal(r.caption, 'Read and translated by the translation service.');
  assert.equal(r.posts.length, 1); assert.equal(r.posts[0].type, 'image/jpeg');
  const body = r.posts[0].body;
  assert.deepEqual([body[0], body[1], body[2]], [0xff, 0xd8, 0xff]);
  assert.ok(!body.includes(Buffer.from('Exif\0\0')) && !body.includes(Buffer.from('TestCam')), 'the uploaded photo carries no camera details');
  assert.deepEqual(r.externalOrigins, []);
});

test('e2e #/camera: a sign outside the word list stays untranslated on the photo, and Word By Word still explains each word', { skip: !runCamera || !existsSync(sign('bookshop.jpg')) }, async () => {
  const r = await runCamera({ image: sign('bookshop.jpg') });
  assert.deepEqual(r.errors.filter((e) => !TESSERACT_LOG.test(e)), []);
  assert.deepEqual(r.lines, ['1. Not translated']);
  assert.equal(r.toggle, null, 'nothing was drawn, so there is no translated photo to switch to');
  assert.match(r.detail, /No English is available for this line here/); assert.doesNotMatch(r.detail, /null|undefined/);
  assert.equal(r.words.length, 2);
  assert.match(r.words[0], /chanut: Store/); assert.match(r.words[1], /sefer: book/); assert.match(r.words[1], /may be the plural/);
  assert.deepEqual(r.externalOrigins, []);
});
