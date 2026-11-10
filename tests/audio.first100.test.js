// First-100 recording list: docs/voices/first-100.csv and FIRST-100.md must be current and every row must be a real, non-empty manifest clip.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../tools/record-kit/lib.mjs';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';
import { TRADITIONS, TARGET, CSV_REL } from '../tools/audio/first100.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const rows = parseCsv(fs.readFileSync(path.join(root, CSV_REL), 'utf8'));
const manifest = loadManifestFull(root);
const byPath = new Map(manifest.map((e) => [e.path, e]));

test('first100 --check says the CSV and the markdown are current', () => {
  const r = spawnSync(process.execPath, [path.join(root, 'tools/audio/first100.mjs'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
test('exactly 100 clips per tradition, ranked 1..100', () => {
  assert.equal(rows.length, TARGET * TRADITIONS.length);
  for (const t of TRADITIONS) {
    const mine = rows.filter((r) => r.tradition === t);
    assert.equal(mine.length, TARGET, t);
    assert.deepEqual(mine.map((r) => Number(r.rank)), Array.from({ length: TARGET }, (_, i) => i + 1));
  }
});
test('paths are unique and every one exists in the audio manifest (both voices), with the same text', () => {
  const seen = new Set();
  for (const r of rows) for (const col of ['mp3_m', 'mp3_f']) {
    assert.ok(!seen.has(r[col]), `duplicate path ${r[col]}`); seen.add(r[col]);
    const e = byPath.get(r[col]);
    assert.ok(e, `not in manifest: ${r[col]}`);
    assert.equal(e.tradition, r.tradition); assert.equal(e.kind, r.kind); assert.equal(e.id, r.id); assert.equal(e.text, r.pointed_hebrew);
  }
  assert.equal(seen.size, rows.length * 2);
  for (const r of rows) { assert.equal(r.wav_m, r.mp3_m.replace(/\.mp3$/, '.wav')); assert.equal(r.wav_f, r.mp3_f.replace(/\.mp3$/, '.wav')); }
});
test('no row has empty Hebrew, and the Hebrew contains Hebrew letters', () => {
  for (const r of rows) assert.match(r.pointed_hebrew, /[א-ת]/, `${r.tradition}/${r.kind}/${r.id}`);
});
