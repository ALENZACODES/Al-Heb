import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildIndex, buildIndexFrom, serialize, splitIndex, parseCsv, ROOT, INDEX_PATH, ALIASES_PATH, MAX_BYTES } from '../tools/img/build_index.mjs';
import { createImageResolver } from '../src/img/resolve.js';

test('data/img/index.json is in sync with the manifests (regenerate and compare) and within MAX_BYTES (256 KB); word aliases in their own file', () => {
  assert.ok(existsSync(join(ROOT, INDEX_PATH)), 'run node tools/img/build_index.mjs');
  const disk = readFileSync(join(ROOT, INDEX_PATH), 'utf8');
  const { index, aliases } = splitIndex(buildIndex(ROOT));
  assert.equal(disk, serialize(index), 'stale index: run node tools/img/build_index.mjs');
  assert.equal(readFileSync(join(ROOT, ALIASES_PATH), 'utf8'), serialize(aliases), 'stale aliases: run node tools/img/build_index.mjs');
  assert.ok(!('x' in JSON.parse(disk)), 'aliases stay out of the installed index');
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

test('a Block J picture whose row was also appended to manifest.csv stays linked to its word', () => {
  const blockJ = [{ id: 'J-0001', set: 'j_vocab_arts-sports-set01', kind: 'word-object', key: 'h0000beef', width: '1024', height: '1024', alt: 'Flat illustration for the Hebrew word meaning "soldier".' }];
  const manifest = [{ file: 'J-0001.png', set: 'j_vocab_arts-sports-set01', width: '1024', height: '1024' }];
  const ix = buildIndexFrom({ manifest, blockJ, edges: { 'J-0001': [800, 1024] } });
  assert.ok(ix.w.h0000beef, 'word row present');
  assert.equal(ix.w.h0000beef[0], 'J-0001');
  assert.ok(!Object.keys(ix.g).some((k) => k.startsWith('asset:j-vocab')), 'not filed as a loose asset');
  const r = createImageResolver({ index: ix, approvals: { 'J-0001': { status: 'approved' } } });
  assert.match(r.resolve('word', 'h0000beef')?.src || '', /J-0001\.\d+\.webp$/);
});

test('word aliases: a dictionary-list id finds the picture of the same word under its older id, homographs stay apart', async () => {
  const { wordAliases } = await import('../tools/img/build_index.mjs');
  const dict = [
    { id: 'h1', he: 'חַיָּל', en: 'soldier' },
    { id: 'h2', he: 'דָּג', en: 'to fish' },
    { id: 'h3', he: 'חָלָב', en: 'milk' },
    { id: 'h4', he: 'אִי', en: 'an island' },
  ];
  const list = [
    { id: 'v1', pointed: 'חַיָּל', gloss: 'soldier' },
    { id: 'v2', pointed: 'דָּג', gloss: 'fish' },          // noun vs the verb picture: not linked
    { id: 'v3', pointed: 'חָלַב', gloss: 'to milk' },      // other pointing: not linked
    { id: 'v4', pointed: 'אִי', gloss: 'if' },             // homograph, no shared meaning: not linked
    { id: 'v5', pointed: 'אִי', gloss: 'island' },
  ];
  assert.deepEqual(wordAliases(dict, list, new Set(['h1', 'h2', 'h3', 'h4'])), { v1: 'h1', v5: 'h4' });
  const ix = buildIndexFrom({ blockJ: [{ id: 'J-0001', set: 's', kind: 'word-object', key: 'h1', width: '1024', height: '1024', alt: 'x' }], edges: { 'J-0001': [800] }, dict, list });
  assert.deepEqual(ix.x, { v1: 'h1' });
  const r = createImageResolver({ index: ix, approvals: { 'J-0001': { status: 'approved' } } });
  assert.equal(r.resolve('word', 'v1')?.id, 'J-0001');
  assert.equal(r.resolve('word', 'v2'), null);
});
