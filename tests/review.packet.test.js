import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { extractAll, ownFlags, auditScan } from '../tools/review/lib/extract.mjs';
import { buildPackets } from '../tools/review/build_packet.mjs';
import { COLUMNS, AREAS } from '../tools/review/config.mjs';
import { parseCsvObjects } from '../tools/review/lib/csv.mjs';
import { makeFakeRepo, cleanup, snapshot, DATA_FILES, sheetName } from './review.helpers.js';

test('ownFlags recognises every flag family and ignores reviewed records', () => {
  assert.deepEqual(ownFlags({ proofread: false }), ['proofread:false']);
  assert.ok(ownFlags({ needsNativeReview: true }).includes('needsNativeReview'));
  assert.ok(ownFlags({ typedFromMemory: true }).includes('typedFromMemory'));
  assert.ok(ownFlags({ needsVerification: true }).includes('needsVerification'));
  assert.ok(ownFlags({ status: 'transcribed-needs-check' }).length);
  assert.ok(ownFlags({ review: 'native-speaker-needed: pointing' }).length);
  assert.ok(ownFlags({ quality: 'draft' }).length);
  assert.deepEqual(ownFlags({ proofread: true, typedFromMemory: false, status: 'verified' }), []);
  assert.deepEqual(ownFlags(null), []);
});

test('extractAll on the fake repo: only unreviewed items, correct areas and ids', async () => {
  const root = await makeFakeRepo();
  try {
    const { byArea, items } = await extractAll(root);
    const ids = items.map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length, 'ids unique');
    assert.deepEqual(byArea.prayers.filter((i) => !i.id.includes('meta:')).map((i) => i.id), ['prayers:yigdal', 'prayers:shema-1'], 'transcribed-needs-check first, reviewed record skipped');
    assert.ok(ids.includes('prayers:meta:shema-1'));
    assert.equal(byArea['opening-prayer'].length, 2);
    assert.equal(byArea['israel-everyday'].length, 1, 'reviewed filler skipped');
    const y = byArea['israel-everyday'][0];
    assert.match(y.he, /יַאלְלָה/); assert.match(y.he, /example: /);
    assert.ok(y.fields.he && y.fields['example.he']);
    assert.deepEqual(byArea['other-flagged'].map((i) => i.id), ['other-flagged:zzz/extra:x1'], 'unknown flagged files are never skipped');
    assert.match(byArea['opening-prayer'][0].he, /הִנֵּנִי/);
    assert.equal(byArea.dialogues.length, 2);
    assert.equal(byArea.lessons.length, 2, 'lesson row + one word row');
    assert.deepEqual(byArea['vocab-top1000'].map((i) => i.id), ['vocab-top1000:va', 'vocab-top1000:vb']);
    assert.deepEqual(byArea['vocab-rest'].map((i) => i.id), ['vocab-rest:vc']);
    assert.equal(byArea['letter-strokes'].length, 1, 'only the print record is flagged');
    assert.match(byArea['letter-strokes'][0].svg, /<svg/);
    for (const it of items) { assert.ok(it.check.length > 20, `${it.id} has a what-to-check text`); assert.ok(it.flags.length, `${it.id} has a flag reason`); }
    const va = byArea['vocab-top1000'][0];
    assert.equal(va.flip.targets.length, 2, 'vocab flip reaches vocab5000 and its tier pack');
    assert.equal(va.fields.he.targets.length, 2);
  } finally { await cleanup(root); }
});

test('auditScan counts flagged records per data file and doc markers', async () => {
  const root = await makeFakeRepo();
  try {
    const a = await auditScan(root);
    const reg = a.data.find((d) => d.file === 'data/corpus/registry.json');
    assert.equal(reg.flags.proofread, 2);
    assert.ok(a.docs.some((d) => d.file === 'docs/NOTE.md'));
  } finally { await cleanup(root); }
});

test('buildPackets writes one sheet per non-empty area with the required columns, and never touches data', async () => {
  const root = await makeFakeRepo();
  try {
    const before = await snapshot(root, DATA_FILES);
    const out = join(root, 'docs/review/out');
    const { manifest } = await buildPackets({ root, out, noPdf: true, quiet: true, date: '2026-01-02' });
    assert.deepEqual(await snapshot(root, DATA_FILES), before, 'data unchanged');
    for (const c of ['id', 'area', 'hebrew', 'transliteration', 'english', 'what_to_check', 'status', 'corrected_text', 'reviewer_notes']) assert.ok(COLUMNS.includes(c), c);
    const files = await readdir(out);
    assert.ok(files.includes('manifest.json') && files.includes('index.html'));
    const sheet = parseCsvObjects(await readFile(join(out, sheetName('prayers')), 'utf8'));
    assert.deepEqual(sheet.header, COLUMNS);
    assert.equal(sheet.records.length, 3);
    assert.equal(sheet.records[0].id, 'prayers:yigdal');
    assert.equal(sheet.records[0].status, '');
    assert.ok(sheet.records[0].hebrew.includes('יִגְדַּל'));
    const html = await readFile(join(out, sheetName('prayers', 'html')), 'utf8');
    assert.match(html, /lang="he" dir="rtl"/);
    assert.match(html, /prayers:shema-1/);
    assert.ok(!files.includes(sheetName('vocab-rest', 'html')), 'vocab-rest is sheet only');
    assert.ok(files.includes(sheetName('vocab-rest')));
    assert.equal(manifest.totalItems, manifest.areas.reduce((s, a) => s + a.items, 0));
    assert.ok(manifest.totalHours > 0);
    assert.equal(manifest.generated, '2026-01-02');
    assert.deepEqual(manifest.audit.dataFilesNotCoveredByAnyArea, []);
  } finally { await cleanup(root); }
});

test('buildPackets removes stale packet files from an earlier run', async () => {
  const root = await makeFakeRepo();
  try {
    const out = join(root, 'docs/review/out');
    await buildPackets({ root, out, noPdf: true, quiet: true });
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(out, '99-old.csv'), 'x');
    await buildPackets({ root, out, noPdf: true, quiet: true });
    assert.ok(!(await readdir(out)).includes('99-old.csv'));
  } finally { await cleanup(root); }
});

test('area config: unique slugs, numbered by priority order, priorities non-decreasing', () => {
  assert.equal(new Set(AREAS.map((a) => a.slug)).size, AREAS.length);
  AREAS.forEach((a, i) => assert.equal(a.n, i + 1));
  for (let i = 1; i < AREAS.length; i++) assert.ok(AREAS[i].priority >= AREAS[i - 1].priority, AREAS[i].slug);
  assert.equal(AREAS[0].slug, 'opening-prayer');
  assert.equal(AREAS[1].slug, 'prayers');
});

test('real repo smoke: extractors run on the real data folder with unique ids and no thrown errors', async () => {
  const real = fileURLToPath(new URL('..', import.meta.url));
  const { existsSync } = await import('node:fs');
  if (!existsSync(join(real, 'data/corpus/registry.json'))) return;
  const { byArea, items } = await extractAll(real);
  assert.equal(new Set(items.map((i) => i.id)).size, items.length);
  assert.ok(byArea.prayers.length >= 70, 'all registry records are listed');
  assert.ok(byArea['vocab-top1000'].length <= 1000);
});
