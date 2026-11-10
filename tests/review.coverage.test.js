// Guards for the reviewer packets: no flagged data is silently unclaimed, and derived pronunciation output is
// reviewed through its rules plus a sample, never row by row. Runs on the real data folder, read-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { extractAll, auditScan, coveredFiles } from '../tools/review/lib/extract.mjs';
import { AREAS, CLAIMS, claimFor } from '../tools/review/config.mjs';
import { loadVariants, ruleList, sampleFor, rulesOfRecord, coverage, TRADITIONS, SAMPLE_PER_TRADITION, MIN_PER_RULE, SIGN_RULES } from '../tools/review/lib/pronrules.mjs';
import { buildAll } from '../tools/review/packs-lib.mjs';
import { makeFakeRepo, cleanup, writeJson } from './review.helpers.js';

const real = new URL('..', import.meta.url).pathname;
const haveData = existsSync(join(real, 'data/corpus/registry.json'));
const memo = {};
const extracted = () => (memo.x ||= extractAll(real));

test('catch-all guard: no flagged data file is unclaimed (other-flagged must be empty)', { skip: !haveData }, async () => {
  const { byArea } = await extracted();
  assert.deepEqual(byArea['other-flagged'].map((i) => i.id).slice(0, 20), [],
    'a flagged data file has no area: add an extractor for it, or list it in CLAIMS (tools/review/config.mjs) with a reason');
  const audit = await auditScan(real);
  const covered = coveredFiles(byArea);
  const loose = audit.data.filter((d) => !covered.has(d.file) && !claimFor(d.file)).map((d) => d.file);
  assert.deepEqual(loose, []);
});

test('every claim names a real area and still matches at least one flagged file (no stale claims)', { skip: !haveData }, async () => {
  const audit = await auditScan(real);
  for (const c of CLAIMS) {
    assert.ok(AREAS.some((a) => a.slug === c.area), c.area);
    assert.ok(c.reason.length > 20);
    assert.ok(audit.data.some((d) => c.match.test(d.file)), `claim ${c.match} matches no flagged file`);
  }
});

test('claimed intermediate files are identical copies of the lessons.json entries they stand in for', { skip: !haveData }, () => {
  const lj = JSON.parse(readFileSync(join(real, 'data/curriculum/lessons.json'), 'utf8')).lessons;
  const ix = JSON.parse(readFileSync(join(real, 'data/curriculum/intermediate-index.json'), 'utf8'));
  assert.equal(ix.lessons.length, 50);
  for (const e of ix.lessons) {
    const copy = JSON.parse(readFileSync(join(real, 'data/curriculum', e.file), 'utf8'));
    const reg = lj.find((l) => l.id === e.id);
    assert.ok(reg, `${e.id} registered in lessons.json`);
    assert.deepEqual(copy, reg, `${e.id}: file copy differs from lessons.json, so the claim is not valid`);
    assert.equal(e.title, reg.title);
  }
});

test('intermediate, firstday and speak have their own non-empty areas', { skip: !haveData }, async () => {
  const { byArea } = await extracted();
  assert.ok(byArea.intermediate.length >= 700, 'exercises of I-01..I-50');
  assert.ok(byArea.intermediate.every((i) => /^I-\d+/.test(i.id.split(':')[1]) && i.flip.target.path[0] === 'lessons'));
  assert.ok(byArea.firstday.some((i) => i.source.startsWith('data/firstday/ladder.json')) && byArea.firstday.some((i) => i.source.startsWith('data/firstday/first10.json')) && byArea.firstday.some((i) => i.source.startsWith('data/firstday/onramp.json')));
  assert.ok(byArea.speak.some((i) => i.source.startsWith('data/speak/minimal-pairs.json')) && byArea.speak.some((i) => i.source.startsWith('data/speak/prayers.json')));
});

test('pron-rules: derived rows are sampled, every rule appears on sample rows, each row names its rules', { skip: !haveData }, async () => {
  const { byArea } = await extracted();
  const items = byArea['pron-rules'];
  const variantRows = items.filter((i) => i.source.startsWith('data/pronunciation/variants/'));
  assert.equal(variantRows.length, TRADITIONS.length * SAMPLE_PER_TRADITION, '200 sample rows per tradition, not the 6,630 derived records');
  const data = loadVariants(real);
  assert.ok(variantRows.length < data.records.length / 5);
  for (const t of TRADITIONS) {
    const rows = variantRows.filter((i) => i.id.startsWith(`pron-rules:s:${t}:`));
    assert.equal(rows.length, SAMPLE_PER_TRADITION, t);
    const sample = sampleFor(data, t);
    const cov = coverage(data, t, sample);
    assert.deepEqual(cov.missing, [], `${t}: rules with no sample row`);
    const perRule = new Map();
    for (const x of sample) for (const id of x.rules) perRule.set(id, (perRule.get(id) || 0) + 1);
    const avail = new Map();
    for (const r of data.records) if (r.variants?.[t]) for (const id of rulesOfRecord(r, t)) avail.set(id, (avail.get(id) || 0) + 1);
    for (const [id, n] of avail) assert.ok(perRule.get(id) >= Math.min(MIN_PER_RULE, n), `${t} ${id}`);
    for (const row of rows) assert.match(row.check, /RULES ON THIS ROW: (sign|stress|flag):/, row.id);
  }
  const ruleRows = items.filter((i) => i.id.startsWith('pron-rules:rule:'));
  assert.equal(ruleRows.length, ruleList(real, data).length);
  assert.ok(items.some((i) => i.source === 'data/pronunciation/runtime/rules.json#pages.0'), 'learner-facing rule pages are rows');
  assert.ok(items.every((i) => i.flip === null || i.source.startsWith('data/pronunciation/runtime/rules.json')), 'sample and rule rows are report-only');
});

test('every sign rule in the generator doc has a detector, and the sample is deterministic', { skip: !haveData }, () => {
  const data = loadVariants(real);
  const rules = ruleList(real, data).filter((r) => r.kind === 'sign');
  assert.ok(rules.length >= SIGN_RULES.length);
  assert.ok(rules.every((r) => r.docRow), 'each sign rule is described by a row of docs/pronunciation/VARIANTS.md');
  const a = sampleFor(data, 'ashkenazi').map((x) => x.rec.id).join();
  assert.equal(sampleFor(data, 'ashkenazi').map((x) => x.rec.id).join(), a);
});

test('pack 05 of build-packs is the rules-and-sample pack, with rule ids on sample rows', { skip: !haveData }, () => {
  const all = buildAll(real);
  assert.ok(!all.some((p) => /^pron-(israeli|sephardi|ashkenazi)$/.test(p.key)));
  const p = all.find((x) => x.key === 'pron-rules');
  assert.equal(p.rows.filter((r) => r.id.startsWith('pron:')).length, TRADITIONS.length * SAMPLE_PER_TRADITION);
  for (const r of p.rows.filter((r) => r.id.startsWith('pron:'))) assert.match(r.where_used, /^rules: (sign|stress|flag):/);
});

test('fake repo: an unknown flagged file still lands in the safety net; a claimed derived file does not', async () => {
  const root = await makeFakeRepo();
  try {
    await writeJson(root, 'data/pronunciation/derived/index.json', { proofread: false, files: [] }, 1);
    const { byArea } = await extractAll(root);
    assert.deepEqual(byArea['other-flagged'].map((i) => i.id), ['other-flagged:zzz/extra:x1']);
  } finally { await cleanup(root); }
});
