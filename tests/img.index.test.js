import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildIndex, buildIndexFrom, serialize, parseCsv, ROOT, INDEX_PATH, MAX_BYTES } from '../tools/img/build_index.mjs';
import { createImageResolver } from '../src/img/resolve.js';

test('data/img/index.json is in sync with the manifests (regenerate and compare) and within MAX_BYTES (256 KB)', () => {
  assert.ok(existsSync(join(ROOT, INDEX_PATH)), 'run node tools/img/build_index.mjs');
  const disk = readFileSync(join(ROOT, INDEX_PATH), 'utf8');
  assert.equal(disk, serialize(buildIndex(ROOT)), 'stale index: run node tools/img/build_index.mjs');
  assert.ok(Buffer.byteLength(disk) <= MAX_BYTES, `${Buffer.byteLength(disk)} bytes`);
});

test('every image id in every manifest is in the index with a non-empty alt and a valid aspect', () => {
  const idx = JSON.parse(readFileSync(join(ROOT, INDEX_PATH), 'utf8'));
  const R = createImageResolver({ index: idx, approvals: {}, showUnapproved: true });
  const want = new Set();
  for (const f of ['data/images/manifest.csv', 'data/images/inter-pending.csv']) for (const r of parseCsv(readFileSync(join(ROOT, f), 'utf8'))) want.add(r.file.replace(/\.png$/, ''));
  for (const r of parseCsv(readFileSync(join(ROOT, 'data/images/block-j.csv'), 'utf8'))) want.add(r.id);
  const seen = new Set(); let withFile = 0;
  for (const [pre, rows] of Object.values(idx.g)) for (const r of rows) seen.add(pre + r[0]);
  for (const r of Object.values(idx.w)) seen.add(r[0]);
  for (const id of want) assert.ok(seen.has(id), `missing from index: ${id}`);
  for (const id of seen) { const r = R.resolve('id', id); if (r) { withFile++; assert.ok(r.alt.length > 5, id); assert.match(r.aspect, /^\d+:\d+$/); } }
  assert.ok(withFile >= 1, 'at least the generated files are resolvable');
});

test('real approvals resolve only ingested artwork; empty approvals resolve nothing', () => {
  const idx = JSON.parse(readFileSync(join(ROOT, INDEX_PATH), 'utf8'));
  const ap = JSON.parse(readFileSync(join(ROOT, 'data/images/approvals.json'), 'utf8'));
  const R = createImageResolver({ index: idx, approvals: ap });
  const n = Object.values(ap.approvals || {}).filter((a) => a.status === 'approved').length;
  assert.equal(R.stats().approvedIngested, n);
  const empty = createImageResolver({ index: idx, approvals: {} });
  for (const [k, id] of [['letter', 'alef'], ['letter', 'bet'], ['vowel', 'kamatz'], ['id', 'BG_cafe'], ['id', 'CHAR_ari_neutral']]) assert.equal(empty.resolve(k, id), null, `${k}:${id}`);
});

test('build is deterministic and handles quoted CSV', () => {
  const rows = parseCsv('a,b\n1,"x, ""y""\nz"\n');
  assert.deepEqual(rows, [{ a: '1', b: 'x, "y"\nz' }]);
  const src = { manifest: [{ file: 'BG_x.png', set: 's', width: '10', height: '10' }], altText: {}, edges: {} };
  assert.equal(serialize(buildIndexFrom(src)), serialize(buildIndexFrom(src)));
});
