// Scale guards for audio delivery. Additive: reads the limits from sw.js and tools/audio/ingest.mjs, hard-codes none of them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';
import { DEFAULTS } from '../tools/audio/ingest.mjs';

const SW = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const MAX_CLIP_BYTES = +/const MAX_CLIP_BYTES = (\d+) \* 1024/.exec(SW)[1] * 1024;

test('every learning and prayer clip fits the service worker offline cap', () => {
  let n = 0;
  for (const e of loadManifestFull()) {
    if (e.status === 'missing' || e.status === 'plays-israeli') continue; // plays-israeli: no file of its own
    const size = fs.statSync(new URL('../' + e.path, import.meta.url)).size; n++;
    assert.ok(size <= MAX_CLIP_BYTES, `${e.path} is ${size} bytes, over the worker cap of ${MAX_CLIP_BYTES}`);
  }
  assert.ok(n > 0);
});

test('the ingest per-clip cap never allows a clip the service worker would refuse to cache', () => {
  assert.ok(DEFAULTS.maxClipKb * 1024 <= MAX_CLIP_BYTES, `ingest maxClipKb ${DEFAULTS.maxClipKb} KB exceeds sw.js cap ${MAX_CLIP_BYTES} bytes`);
});
