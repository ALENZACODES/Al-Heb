// Mechanical audit sweep (tools/vocab/audit_checks.mjs) against its baseline (data/vocab/audit-baseline.json).
// Reproduces the full-set checks of the 2026-11-04 vocabulary audit; see docs/vocab/AUDIT-RESPONSE.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const { ROOT } = await import('../tools/vocab/frequency.mjs');
const { runChecks, readBaseline, diffBaseline, CHECKS, BASELINE_PATH } = await import('../tools/vocab/audit_checks.mjs');
const { isHiddenRecord, visibleRecords } = await import('../src/vocab/loader.js');

const run = runChecks(ROOT);
const baseline = readBaseline(ROOT);
const vocab = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vocab/vocab5000.json'), 'utf8')).entries;
const byRank = (r) => vocab.find((e) => e.rank === r);
const byId = (id) => vocab.find((e) => e.id === id);

test('baseline file exists and covers every check', () => {
  assert.ok(baseline, `${BASELINE_PATH} missing; run node tools/vocab/audit_checks.mjs --write-baseline`);
  assert.equal(baseline.schema, 'alef-vocab-audit-baseline/1');
  for (const c of CHECKS) { assert.ok(Array.isArray(baseline.hits[c]), c); assert.equal(baseline.counts[c], baseline.hits[c].length, c); }
});

test('no new hits outside the baseline (null pointed, Hebrew in gloss, verb gloss form, duplicate (lemma, pointed), circular gloss, furtive patach translit)', () => {
  const { fresh } = diffBaseline(run, baseline);
  for (const c of CHECKS) assert.deepEqual(fresh[c].map((h) => `${h.key} rank ${h.rank} ${h.lemma}: ${h.detail}`), [], `new ${c} hits`);
});

test('baseline is not stale (a fixed hit must be removed by --write-baseline)', () => {
  const { stale } = diffBaseline(run, baseline);
  for (const c of CHECKS) assert.deepEqual(stale[c], [], `stale ${c} keys`);
  assert.deepEqual(run.counts, baseline.counts);
});

test('audit fixes are in the built file: no Hebrew in any gloss; March, sandek, garlic, cucumber, blue', () => {
  assert.equal(run.counts['hebrew-in-gloss'], 0);
  assert.equal(byId('v9e04887c').gloss, 'March (month)');
  assert.equal(byId('vd5c1fc73').gloss, 'sandek (the person who holds the baby at a circumcision)');
  const shum = byId('v505f48c6'); assert.equal(shum.gloss, 'garlic'); assert.equal(shum.topic, 'Food');
  assert.equal(byId('v0a0c3d9d').gloss, 'cucumber');
  assert.equal(byId('v7ba41398').gloss, 'blue');
  assert.equal(byId('v32e7afd6').gloss, 'to, for (prefix)');
  // the words.json side of the same corrections
  const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vocab/words.json'), 'utf8')).words;
  const w = (id) => words.find((x) => x.id === id);
  assert.equal(w('h79986a16').en, 'garlic'); assert.deepEqual(w('h79986a16').alt, ['name, sake, purpose, cause']);
  assert.equal(w('hd91e4a26').en, 'cucumber'); assert.deepEqual(w('hd91e4a26').alt, ['Armenian cucumber, vegetable melon']);
  assert.equal(w('h1782f762').en, 'sandek (the person who holds the baby at a circumcision)');
});

test('the three unpointed entries are still honestly flagged, and the plene "now" is a form of the pointed entry', () => {
  for (const id of ['v66f62b1a', 'vdf2737fe', 'vba010668']) { const e = byId(id); assert.equal(e.pointed, null); assert.equal(e.needsPointing, true); }
  const now = byId('v66f62b1a'); assert.equal(now.isForm, true); assert.equal(now.formOf, 'v994abac9');
  assert.equal(byId('v994abac9').pointed, 'עַכְשָׁו');
  assert.ok(byId('v994abac9').formIds.includes('v66f62b1a'));
});

test('withheld slang glosses are not printed as the bare word "slang"', () => {
  for (const id of ['v86404c39', 'v73a6f0a9']) { const e = byId(id); assert.equal(e.gloss, '(slang; gloss withheld pending review)'); assert.ok(e.tags.includes('needs-check')); }
  assert.ok(!vocab.some((e) => e.gloss === 'slang'));
  // flags.hidden mirrors words.json, is kept by split-tiers, and src/vocab/loader.js drops the records from every list
  for (const id of ['v86404c39', 'v73a6f0a9']) assert.deepEqual(byId(id).flags, { hidden: true });
  const hiddenInTiers = [];
  for (const t of [500, 1000, 2000, 5000]) {
    const pack = JSON.parse(fs.readFileSync(path.join(ROOT, `data/vocab/packs/vocab5k-tier-${t}.json`), 'utf8'));
    const list = Array.isArray(pack) ? pack : pack.entries;
    for (const e of list) { if (isHiddenRecord(e)) hiddenInTiers.push(e.id); assert.ok(!visibleRecords(list).some((x) => x.id === e.id && isHiddenRecord(x))); }
  }
  assert.deepEqual(hiddenInTiers.sort(), ['v73a6f0a9', 'v86404c39']);
});

test('rank 937 is the month, not the "energy" noun (different pointing)', () => {
  const e = byRank(937); assert.equal(e.lemma, 'מרץ'); assert.equal(e.pointed, 'מֶרְץ'); assert.equal(e.topic, 'Months'); assert.equal(e.curatedCore, true);
});
