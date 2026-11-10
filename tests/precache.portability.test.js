import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { computeManifest } from '../tools/build-precache.mjs';

test('cache version is stable across checkout line endings but tracks text and binary changes', () => {
  const root = mkdtempSync(join(tmpdir(), 'alef-precache-'));
  try {
    for (const dir of ['src', 'data', 'assets']) mkdirSync(join(root, dir));
    for (const f of ['index.html', 'offline.html', 'manifest.webmanifest']) writeFileSync(join(root, f), '{}\n');
    writeFileSync(join(root, 'src/app.js'), 'const value = 1;\n');
    writeFileSync(join(root, 'assets/icon.png'), Buffer.from([0, 13, 10, 255]));
    const initial = computeManifest(root).version;
    writeFileSync(join(root, 'src/app.js'), 'const value = 1;\r\n');
    assert.equal(computeManifest(root).version, initial);
    writeFileSync(join(root, 'src/app.js'), 'const value = 2;\n');
    assert.notEqual(computeManifest(root).version, initial);
    writeFileSync(join(root, 'src/app.js'), 'const value = 1;\n');
    writeFileSync(join(root, 'assets/icon.png'), Buffer.from([0, 10, 255]));
    assert.notEqual(computeManifest(root).version, initial);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
