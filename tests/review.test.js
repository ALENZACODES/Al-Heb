import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildAll, idIndex, toCsv, parseCsv, toHtml, COLUMNS } from '../tools/review/packs-lib.mjs';
import { PACKS, FAMILIES, REVIEWER_TYPES } from '../tools/review/instructions.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fx = (n) => path.join(root, 'tests', 'review-fixtures', n);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'alef-review-'));
const ingest = (args) => spawnSync('node', [path.join(root, 'tools/review/ingest.mjs'), ...args], { encoding: 'utf8' });
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex');
const all = buildAll(root);

test('every pack has rows, the required columns and globally unique ids', () => {
  assert.equal(all.length, PACKS.length);
  const seen = new Set();
  for (const p of all) {
    assert.ok(p.rows.length > 0, p.key);
    for (const r of p.rows) {
      assert.deepEqual(Object.keys(r), COLUMNS);
      assert.ok(r.id && r.hebrew !== undefined);
      assert.ok(!seen.has(r.id), 'duplicate id ' + r.id);
      seen.add(r.id);
      assert.equal(r.verdict, '');
    }
  }
  assert.equal(all.find((p) => p.key === 'inter').rows.length > 0, true);
  assert.equal(all.find((p) => p.key === 'vocab').rows.length, 1000);
});

test('CSV round-trips, including commas, quotes and Hebrew', () => {
  const rows = [{ id: 'x:1', hebrew: 'שָׁלוֹם', transliteration: 'a,b', english: 'say "hi"', tradition: 'israeli', where_used: 'l1\nl2', verdict: '', correction: '', notes: '' }];
  const back = parseCsv(toCsv(rows));
  assert.deepEqual(back[0], COLUMNS);
  assert.deepEqual(back[1].slice(0, 6), ['x:1', 'שָׁלוֹם', 'a,b', 'say "hi"', 'israeli', 'l1\nl2']);
});

test('HTML is self-contained, RTL, escaped and carries all three reviewer types', () => {
  const p = all[0];
  const h = toHtml(p, [{ ...p.rows[0], english: '<b>&' }]);
  assert.match(h, /dir="rtl"/);
  assert.match(h, /<style>/);
  assert.ok(!/<script|src=|href=|https?:\/\//i.test(h));
  assert.ok(h.includes('&lt;b&gt;&amp;'));
  for (const t of Object.values(REVIEWER_TYPES)) assert.ok(h.includes(t));
  for (const v of ['OK', 'Fix', 'Unsure']) assert.ok(h.includes(v));
});

test('each content family gives all three reviewer types judge and do-not-judge lists', () => {
  for (const p of PACKS) assert.ok(FAMILIES[p.family], p.key);
  for (const f of Object.values(FAMILIES)) for (const t of Object.keys(REVIEWER_TYPES)) {
    assert.ok(['primary', 'optional', 'skip'].includes(f[t].role));
    assert.ok(f[t].judge.length && f[t].skip.length);
  }
});

test('builder writes only under the output directory and is deterministic', () => {
  const guard = ['data/curriculum/lessons.json', 'data/corpus/registry.json', 'data/vocab/words.json'].map((f) => [f, sha(f)]);
  const run = () => execFileSync('node', [path.join(root, 'tools/review/build-packs.mjs'), '--out', path.join(tmp, 'o')], { encoding: 'utf8' });
  run();
  const a = fs.readFileSync(path.join(tmp, 'o/packs/01-core-lessons.csv'), 'utf8');
  run();
  assert.equal(fs.readFileSync(path.join(tmp, 'o/packs/01-core-lessons.csv'), 'utf8'), a);
  for (const [f, h] of guard) assert.equal(sha(f), h);
  const status = fs.readFileSync(path.join(tmp, 'o/STATUS.md'), 'utf8');
  const hasStore = fs.existsSync(path.join(root, 'data/review/verdicts.json'));
  if (!hasStore) assert.match(status, /Reviewed: 0 of \d+ rows/);
});

test('ingest dry run is the default and writes nothing', () => {
  const out = path.join(tmp, 'dry.json');
  const r = ingest([fx('good.csv'), '--reviewer', 'Test Person', '--type', 'teacher', '--date', '2026-01-01', '--out', out]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /DRY RUN/);
  assert.match(r.stdout, /accepted 3/);
  assert.ok(!fs.existsSync(out));
});

test('ingest --write records verdicts, is idempotent, and leaves data untouched', () => {
  const out = path.join(tmp, 'v.json');
  const guard = sha('data/curriculum/lessons.json');
  const args = [fx('good.csv'), '--reviewer', 'Test Person', '--type', 'teacher', '--date', '2026-01-01', '--out', out, '--write'];
  assert.equal(ingest(args).status, 0);
  const first = fs.readFileSync(out, 'utf8');
  const j = JSON.parse(first);
  assert.equal(Object.keys(j.verdicts).length, 3);
  assert.equal(j.verdicts['core:r01:w1'][0].verdict, 'OK');
  assert.equal(j.verdicts['core:r02:w1'][0].verdict, 'Fix');
  assert.equal(j.verdicts['core:r02:w1'][0].notes, 'needs, a comma');
  assert.equal(j.verdicts['core:r02:w2'][0].verdict, 'Unsure');
  const again = ingest(args);
  assert.match(again.stdout, /new 0, changed 0, unchanged 3/);
  assert.equal(fs.readFileSync(out, 'utf8'), first);
  // a second reviewer type is kept alongside, not merged
  assert.equal(ingest([fx('good.csv'), '--reviewer', 'Cantor A', '--type', 'cantor', '--date', '2026-01-02', '--out', out, '--write']).status, 0);
  assert.equal(JSON.parse(fs.readFileSync(out, 'utf8')).verdicts['core:r01:w1'].length, 2);
  assert.equal(sha('data/curriculum/lessons.json'), guard);
});

test('ingest rejects unknown ids, bad verdicts, Fix without correction and stale Hebrew', () => {
  const out = path.join(tmp, 'bad.json');
  const r = ingest([fx('bad.csv'), '--reviewer', 'T', '--type', 'native', '--date', '2026-01-01', '--out', out, '--write']);
  assert.equal(r.status, 1);
  for (const m of [/unknown id/, /is not OK, Fix or Unsure/, /Fix needs a correction/, /stale sheet/]) assert.match(r.stdout, m);
  assert.ok(!fs.existsSync(out), 'nothing written when rows are rejected');
  const p = ingest([fx('bad.csv'), '--reviewer', 'T', '--type', 'native', '--date', '2026-01-01', '--out', out, '--write', '--partial']);
  assert.equal(p.status, 1);
  assert.equal(Object.keys(JSON.parse(fs.readFileSync(out, 'utf8')).verdicts).length, 1);
});

test('ingest reports missing columns and usage errors', () => {
  const out = path.join(tmp, 'x.json');
  const c = ingest([fx('nocols.csv'), '--reviewer', 'T', '--type', 'native', '--date', '2026-01-01', '--out', out]);
  assert.equal(c.status, 1);
  assert.match(c.stdout, /missing column/);
  assert.equal(ingest([fx('good.csv'), '--type', 'wizard', '--date', 'x']).status, 2);
  assert.equal(ingest(['--reviewer', 'T', '--type', 'native', '--date', '2026-01-01']).status, 2);
});

test('new review files contain no AI or tool names', () => {
  const re = new RegExp(['chat' + 'gpt', 'clau' + 'de', 'anthro' + 'pic', 'open' + 'ai', 'g' + 'pt-', 'dal' + 'l-?e', 'midjour' + 'ney', 'co-auth' + 'ored'].join('|'), 'i');
  const files = ['tools/review/instructions.mjs', 'tools/review/packs-lib.mjs', 'tools/review/verdicts-lib.mjs', 'tools/review/build-packs.mjs', 'tools/review/ingest.mjs', 'tests/review.test.js', 'docs/review/STATUS.md', 'docs/review/INSTRUCTIONS.md'];
  for (const f of files) assert.ok(!re.test(fs.readFileSync(path.join(root, f), 'utf8')), f);
});

test('idIndex covers every row', () => {
  assert.equal(idIndex(all).size, all.reduce((n, p) => n + p.rows.length, 0));
});
