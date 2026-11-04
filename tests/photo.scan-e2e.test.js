// End-to-end: real in-browser OCR in headless Chromium on a generated SYNTHETIC image. Skipped if Playwright/Chromium are unavailable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let runScan = null;
try { ({ runScan } = await import('../tools/ocr-bench/e2e-scan.mjs')); } catch { /* no playwright */ }
const img = (n) => join(root, 'data/photo/_benchmark/images', n);

test('e2e #/scan: prayer image -> real OCR text, corpus match, word cards, no external requests', { skip: !runScan || !existsSync(img('siddur-bless-priestly-2__clean.png')) }, async () => {
  mkdirSync(join(root, 'docs/screens'), { recursive: true });
  const r = await runScan({ image: img('siddur-bless-priestly-2__clean.png'), mode: 'prayer', shot: join(root, 'docs/screens/scan-real.png') });
  assert.deepEqual(r.errors, []);
  assert.ok(r.ocrLines.length >= 1 && /[א-ת]/.test(r.ocrLines[0]), 'OCR text shown');
  assert.ok(r.cards.length >= 4); assert.ok(r.syllableButtons >= 8);
  assert.ok(r.matches.some((m) => /Numbers 6:25/.test(m)));
  assert.deepEqual(r.externalOrigins, []);
  assert.match(r.accuracyNotice, /not been measured on real photos/);
  assert.match(r.noTranslation, /Translation unavailable offline/);
  assert.ok(r.translateSetup);
  assert.ok(r.letterButtons >= 8 && r.hearButtons >= 4);
  assert.ok(r.translitRows.length >= 4 && r.translitRows[0].filter((t, i) => i % 2 === 0).join() === 'Israeli,Sephardi,Ashkenazi');
  assert.ok(r.vendorRequests.includes('heb.traineddata'));
});
test('e2e #/scan: unpointed sign image -> OCR text, warning that vowels are unavailable offline, cards without syllables', { skip: !runScan || !existsSync(img('sign-directions-05__clean.png')) }, async () => {
  const r = await runScan({ image: img('sign-directions-05__clean.png'), mode: 'sign' });
  assert.deepEqual(r.errors, []);
  assert.match(r.ocrLines[0], /ישר/);
  assert.ok(r.warns.some((w) => /no vowelizer/.test(w)));
  assert.ok(r.cards.includes('ישר'));
});
