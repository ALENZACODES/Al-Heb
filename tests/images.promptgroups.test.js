import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, copyFileSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { run, mergeManifest, buildGroups } from '../tools/images/build_prompt_groups.mjs';
import { parseCsv } from '../tools/images/ingest_lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'data/images/manifest.csv');
const sha = (t) => createHash('sha256').update(t).digest('hex');

function tmp() { return mkdtempSync(join(tmpdir(), 'alef-pg-')); }

test('promptgroups: running the builder on a copy keeps every manifest row and byte-identical content', () => {
  const d = tmp();
  try {
    const m = join(d, 'manifest.csv'), g = join(d, 'prompt-groups.json');
    copyFileSync(MANIFEST, m);
    const before = readFileSync(m, 'utf8'), rowsBefore = parseCsv(before).length - 1;
    const r = run({ manifest: m, groups: g });
    const after = readFileSync(m, 'utf8');
    assert.equal(parseCsv(after).length - 1, rowsBefore, 'row count unchanged');
    assert.equal(r.merge.appended, 0);
    assert.ok(rowsBefore > 797, 'manifest holds more than the spec rows');
    if (!r.merge.changed) assert.equal(sha(after), sha(before));
    assert.equal(JSON.parse(readFileSync(g, 'utf8')).groups.length, buildGroups().groups.length);
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('promptgroups: a changed prompt updates only the prompt column; other columns and non-spec rows are untouched', () => {
  const [head, ...body] = parseCsv(readFileSync(MANIFEST, 'utf8'));
  const pi = head.indexOf('prompt'), si = head.indexOf('status');
  const specFile = buildGroups().groups[0].rows[0].file;
  const mod = body.map((r) => r.slice());
  const target = mod.find((r) => r[0] === specFile);
  target[pi] = 'STALE PROMPT'; target[si] = 'done';
  const text = [head, ...mod].map((r) => r.map((v) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',')).join('\n') + '\n';
  const res = mergeManifest(text, buildGroups());
  assert.equal(res.changed, true);
  assert.equal(res.updated, 1);
  assert.equal(res.appended, 0);
  const out = parseCsv(res.text).slice(1);
  assert.equal(out.length, body.length);
  out.forEach((r, i) => {
    if (r[0] === specFile) { assert.equal(r[si], 'done'); assert.equal(r[pi], body[i][pi]); r.forEach((v, c) => { if (c !== pi) assert.equal(v, mod[i][c]); }); }
    else assert.deepEqual(r, body[i]);
  });
});

test('promptgroups: spec rows missing from the manifest are appended, nothing is dropped', () => {
  const data = buildGroups();
  const res = mergeManifest('file,set,command,block,width,height,status,prompt\nZZZ_extra.png,x,999,Z,1,1,done,keep me\n', data);
  const rows = parseCsv(res.text).slice(1);
  assert.equal(rows[0][0], 'ZZZ_extra.png');
  assert.equal(rows[0][6], 'done');
  assert.equal(rows.length, 1 + data.groups.reduce((n, g) => n + g.rows.length, 0));
});
