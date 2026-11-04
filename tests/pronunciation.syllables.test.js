// derived/_syllables-*.json and derived/index.json: syllables + stress for every variants record (rule-generated, unverified).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { memoDisk, PRON_ROOTS } from './helpers/memo.js';
import { join } from 'node:path';
import { buildDerived, derivedFiles, DERIVED_DIR, SHARD_BYTES } from '../tools/pronunciation/build_derived.mjs';
import { TRADITIONS, SHARD_SIZE } from '../tools/pronunciation/build_variants.mjs';

const d = memoDisk('pron-derived', PRON_ROOTS, () => buildDerived());
const sylShards = d.shards.filter((s) => s.head.name === 'syllables');
const recs = sylShards.flatMap((s) => s.records);

test('one syllable record per variants record, in order, no duplicates', () => {
  assert.equal(recs.length, d.built.records.length);
  assert.deepEqual(recs.map((r) => r.i), d.built.records.map((r) => r.id));
  assert.equal(new Set(recs.map((r) => r.i)).size, recs.length);
});

test('words carry syllables, three stress indices in range, rule ids, and IPA syllables that match the variants', () => {
  for (const r of recs) {
    const rec = d.built.records.find((x) => x.id === r.i) ?? null;
    if (!rec) continue;
    for (const w of r.w) {
      if (!w.s.length) { assert.equal(w.st, undefined); continue; }
      assert.equal(w.st.length, 3); assert.equal(w.p.length, 3); assert.equal(w.sr.length, 3);
      w.st.forEach((s, k) => { assert.ok(Number.isInteger(s) && s >= 0 && s < w.s.length, `${r.i} stress ${TRADITIONS[k]}`); assert.equal(w.p[k].length, w.s.length, `${r.i} ${TRADITIONS[k]} syllable count`); assert.ok(d.index.stressRules[w.sr[k]]); });
    }
  }
});

test('IPA syllables re-join to the variants IPA (stress marks aside)', () => {
  const byId = new Map(d.built.records.map((x) => [x.id, x]));
  for (const r of recs.slice(0, 3000)) {
    const rec = byId.get(r.i);
    TRADITIONS.forEach((t, k) => {
      const joined = r.w.filter((w) => w.p).map((w) => w.p[k].join('')).join('');
      assert.equal(joined, rec.variants[t].ipa.replace(/[ˈ.\s-]/g, ''), r.i + ' ' + t);
    });
  }
});

test('known words: shabbat stress is final for Israeli, first for Ashkenazi; shalom is sha-LOM / SHO-lom', () => {
  const find = (he) => recs.find((r) => r.w.length === 1 && r.w[0].h === he);
  const sh = find('שַׁבָּת');
  if (sh) { assert.deepEqual(sh.w[0].st, [1, 1, 0]); assert.deepEqual(sh.w[0].p[2], ['ʃa', 'bɔs']); }
  const mel = recs.find((r) => r.w.length === 1 && r.w[0].h === 'מֶלֶךְ');
  if (mel) assert.deepEqual(mel.w[0].st, [0, 0, 0]);
});

test('shards: <= 2000 records, < 190 KB, indexed, status stated; files on disk are current', () => {
  for (const s of d.shards) { assert.ok(s.head.count <= SHARD_SIZE && s.head.count === s.records.length); assert.equal(s.head.proofread, false); assert.match(s.head.status, /not verified by a native speaker/); }
  const files = derivedFiles(d);
  for (const [f, text] of files) {
    assert.ok(Buffer.byteLength(text) < SHARD_BYTES + 5000, f + ' too big');
    assert.equal(fs.readFileSync(join(DERIVED_DIR, f), 'utf8'), text, `${f} is stale: run node tools/pronunciation/build_derived.mjs`);
  }
  assert.equal(d.index.shards.reduce((n, s) => n + (s.kind === 'syllables' ? s.count : 0), 0), d.built.records.length);
  assert.equal(d.index.counts.records, d.built.records.length);
});

test('runtime-safe files (non-underscore) are small', () => {
  for (const f of ['index.json', 'ssml-profile.json']) assert.ok(fs.statSync(join(DERIVED_DIR, f)).size <= 200 * 1024, f);
});
