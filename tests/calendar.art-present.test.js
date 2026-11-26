import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ART_PRESENT, ART_BASE } from '../src/curriculum/calendar.markers.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('every calendar art name the view will request is on disk (no 404 probes), and the full set is listed', () => {
  for (const name of ART_PRESENT) assert.ok(existsSync(join(ROOT, `${ART_BASE}/${name}.png`)), `${ART_BASE}/${name}.png`);
  assert.equal(ART_PRESENT.size, 13);
  assert.ok(ART_PRESENT.has('header'));
});
