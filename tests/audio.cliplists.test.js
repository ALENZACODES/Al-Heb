// Recording-kit clip lists: every CSV row is a real, still-missing manifest entry of its slot with the manifest's own Hebrew,
// ids are unique, take_ok is empty, and the counts reconcile to the coverage tool.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../tools/record-kit/lib.mjs';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';
import { computeCoverage } from '../tools/audio/coverage.mjs';
import { DIR, COLS, SLOTS, TARGET, build } from '../tools/audio/clip_lists.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = loadManifestFull(root);
const key = (e) => `${e.voice}|${e.tradition}|${e.kind}|${e.id}`;
const byKey = new Map(manifest.map((e) => [key(e), e]));
const cov = computeCoverage(manifest);

for (const slot of SLOTS) {
  test(`clip list ${slot}: rows exist in the manifest, are missing, unique, and reconcile to coverage`, () => {
    const [voice, tradition] = slot.split('-');
    const text = fs.readFileSync(path.join(root, DIR, `recording-kit-${slot}-clip-list.csv`), 'utf8');
    assert.equal(text.split('\n')[0], COLS.join(','));
    const rows = parseCsv(text);
    assert.ok(rows.length <= TARGET);
    const stillMissing = cov.filter((c) => c.voice === voice && c.tradition === tradition).reduce((n, c) => n + c.missing, 0);
    if (stillMissing > 0) assert.ok(rows.length > 0, `${slot}: ${stillMissing} clips missing but the list is empty`);
    const seen = new Set();
    for (const r of rows) {
      const e = byKey.get(`${voice}|${tradition}|${r.kind}|${r.id}`);
      assert.ok(e, `${slot}: ${r.kind}/${r.id} is not in the manifest`);
      assert.equal(r.pointed_hebrew, e.text);
      assert.equal(e.status, 'missing'); assert.ok(!e.optional && !e.aliasOf);
      assert.equal(r.take_ok, '');
      assert.ok(!seen.has(r.id + r.kind), `duplicate ${r.id}`); seen.add(r.id + r.kind);
    }
    const missing = cov.filter((c) => c.voice === voice && c.tradition === tradition);
    const g = (n) => (missing.find((c) => c.group === n) || { missing: 0 }).missing;
    assert.ok(rows.filter((r) => r.kind === 'word').length + rows.filter((r) => r.kind === 'line').length === rows.length);
    assert.ok(rows.length <= missing.reduce((n, c) => n + c.missing, 0));
    assert.ok(rows.filter((r) => r.kind === 'line').length <= g('prayer-line'));
  });
}

test('files are current and the README states produced=0 while no audio files exist', () => {
  const b = build(root);
  for (const [rel, body] of Object.entries(b.files)) assert.equal(fs.readFileSync(path.join(root, rel), 'utf8'), body, `${rel} is stale (node tools/audio/clip_lists.mjs --write)`);
  const readme = fs.readFileSync(path.join(root, DIR, 'README.md'), 'utf8');
  const onDisk = manifest.filter((e) => fs.existsSync(path.join(root, e.path))).length;
  if (onDisk === 0) assert.match(readme, /produced=0\b/);
  for (const s of b.summary) assert.equal(s.covMissing, cov.filter((c) => c.voice === s.slot[0] && c.tradition === s.slot.slice(2)).reduce((n, c) => n + c.missing, 0));
});
