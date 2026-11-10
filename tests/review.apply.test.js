import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { buildPackets } from '../tools/review/build_packet.mjs';
import { applyReview, formatReport } from '../tools/review/apply_review.mjs';
import { toCsv, parseCsvObjects } from '../tools/review/lib/csv.mjs';
import { COLUMNS } from '../tools/review/config.mjs';
import { makeFakeRepo, cleanup, snapshot, DATA_FILES, sheetName } from './review.helpers.js';

const exec = promisify(execFile);

async function setup() {
  const root = await makeFakeRepo();
  const out = join(root, 'docs/review/out');
  await buildPackets({ root, out, noPdf: true, quiet: true });
  const load = async (f) => parseCsvObjects(await readFile(join(out, f), 'utf8')).records;
  const sheetPath = join(root, 'returned.csv');
  const save = (rows) => writeFile(sheetPath, toCsv(COLUMNS, rows));
  return { root, out, load, save, sheetPath };
}
const pick = (rows, id) => rows.find((r) => r.id === id);
const json = async (root, rel) => JSON.parse(await readFile(join(root, rel), 'utf8'));

test('dry run is the default: nothing is written, report says so', async () => {
  const s = await setup();
  try {
    const rows = await s.load(sheetName('prayers'));
    const r = pick(rows, 'prayers:shema-1'); r.status = 'ok'; r.reviewer = 'R. Cohen'; r.review_date = '2026-02-03';
    await s.save([r]);
    const before = await snapshot(s.root, DATA_FILES);
    const res = await applyReview({ files: [s.sheetPath], root: s.root });
    assert.equal(res.dryRun, true);
    assert.equal(res.flips.length, 1);
    assert.deepEqual(await snapshot(s.root, DATA_FILES), before);
    await assert.rejects(stat(join(s.root, 'docs/review/ledger.jsonl')));
    assert.match(formatReport(res), /DRY RUN/);
  } finally { await cleanup(s.root); }
});

test('--apply flips proofread only for ok rows that have a reviewer and a valid date', async () => {
  const s = await setup();
  try {
    const rows = await s.load(sheetName('prayers'));
    const a = pick(rows, 'prayers:shema-1'); a.status = 'ok'; a.reviewer = 'R. Cohen'; a.review_date = '2026-02-03';
    const b = pick(rows, 'prayers:yigdal'); b.status = 'ok'; // no reviewer, no date
    await s.save([a, b]);
    const res = await applyReview({ files: [s.sheetPath], root: s.root, apply: true });
    assert.equal(res.flips.length, 1);
    assert.ok(res.errors.some((e) => e.id === 'prayers:yigdal' && /reviewer/.test(e.why)));
    // errors present -> all-or-nothing: nothing written
    assert.deepEqual(res.wrote, []);
    assert.equal((await json(s.root, 'data/corpus/registry.json')).entries[0].proofread, false);
    // now without the bad row
    await s.save([a]);
    const res2 = await applyReview({ files: [s.sheetPath], root: s.root, apply: true });
    assert.deepEqual(res2.wrote, ['data/corpus/registry.json']);
    const reg = await json(s.root, 'data/corpus/registry.json');
    assert.equal(reg.entries[0].proofread, true);
    assert.equal(reg.entries[0].reviewedBy, 'R. Cohen');
    assert.equal(reg.entries[0].reviewedOn, '2026-02-03');
    assert.equal(reg.entries[2].proofread, false, 'other records untouched');
    const ledger = (await readFile(join(s.root, 'docs/review/ledger.jsonl'), 'utf8')).trim().split('\n').map((l) => JSON.parse(l));
    assert.equal(ledger[0].id, 'prayers:shema-1');
    assert.equal(ledger[0].reviewer, 'R. Cohen');
  } finally { await cleanup(s.root); }
});

test('--reviewer / --date supply missing values; bad dates and bad statuses are refused', async () => {
  const s = await setup();
  try {
    const rows = await s.load(sheetName('prayers'));
    const a = pick(rows, 'prayers:shema-1'); a.status = 'OK '; // case/space tolerant
    const b = pick(rows, 'prayers:yigdal'); b.status = 'ok'; b.reviewer = 'X'; b.review_date = '03/02/2026';
    const c = pick(rows, 'prayers:meta:shema-1'); c.status = 'maybe';
    await s.save([a, b, c]);
    const res = await applyReview({ files: [s.sheetPath], root: s.root, reviewer: 'Rabbi T', date: '2026-03-04' });
    assert.equal(res.flips.length, 1);
    assert.equal(res.flips[0].by, 'Rabbi T', 'CLI default reviewer fills the blank column');
    assert.ok(res.errors.some((e) => /YYYY-MM-DD/.test(e.why)));
    assert.ok(res.errors.some((e) => /invalid status/.test(e.why)));
  } finally { await cleanup(s.root); }
});

test('fix rows change the text but do NOT mark the record reviewed; unsure/blank rows change nothing', async () => {
  const s = await setup();
  try {
    const rows = await s.load(sheetName('prayers'));
    const fix = pick(rows, 'prayers:yigdal'); fix.status = 'fix'; fix.corrected_text = 'יִגְדַּל אֱלֹהִים חַי וְיִשְׁתַּבַּח'; fix.reviewer = 'R'; fix.review_date = '2026-02-03';
    const uns = pick(rows, 'prayers:shema-1'); uns.status = 'unsure'; uns.reviewer_notes = 'ask the cantor';
    await s.save([fix, uns, pick(rows, 'prayers:meta:shema-1')]);
    const res = await applyReview({ files: [s.sheetPath], root: s.root, apply: true });
    assert.equal(res.counts.fix, 1); assert.equal(res.counts.unsure, 1); assert.equal(res.counts.blank, 1);
    const reg = await json(s.root, 'data/corpus/registry.json');
    assert.equal(reg.entries[2].he, 'יִגְדַּל אֱלֹהִים חַי וְיִשְׁתַּבַּח');
    assert.equal(reg.entries[2].proofread, false);
    assert.equal(reg.entries[2].reviewedBy, undefined);
    assert.equal(reg.entries[0].proofread, false);
    assert.match(formatReport(res), /ask the cantor/);
  } finally { await cleanup(s.root); }
});

test('stale or in-place-edited Hebrew cells are refused', async () => {
  const s = await setup();
  try {
    const rows = await s.load(sheetName('prayers'));
    const r = pick(rows, 'prayers:shema-1'); r.status = 'ok'; r.reviewer = 'R'; r.review_date = '2026-02-03'; r.hebrew = r.hebrew + 'X';
    await s.save([r]);
    const res = await applyReview({ files: [s.sheetPath], root: s.root });
    assert.equal(res.flips.length, 0);
    assert.match(res.errors[0].why, /corrected_text/);
  } finally { await cleanup(s.root); }
});

test('ok with corrected_text, duplicate ids, unknown ids and missing columns are reported', async () => {
  const s = await setup();
  try {
    const rows = await s.load(sheetName('prayers'));
    const a = pick(rows, 'prayers:shema-1'); a.status = 'ok'; a.reviewer = 'R'; a.review_date = '2026-02-03'; a.corrected_text = 'x';
    const b = pick(rows, 'prayers:yigdal'); b.status = 'ok'; b.reviewer = 'R'; b.review_date = '2026-02-03';
    await s.save([a, b, { ...b }, { ...b, id: 'prayers:nope' }]);
    const res = await applyReview({ files: [s.sheetPath], root: s.root });
    assert.ok(res.errors.some((e) => /ok but corrected_text/.test(e.why)));
    assert.ok(res.errors.some((e) => /appears 2 times/.test(e.why)));
    assert.ok(res.warnings.some((w) => /not found/.test(w.why)));
    await writeFile(s.sheetPath, 'foo,bar\n1,2\n');
    await assert.rejects(applyReview({ files: [s.sheetPath], root: s.root }), /missing required column/);
  } finally { await cleanup(s.root); }
});

test('vocab: one ok flips the canonical file AND the tier pack copy; fix goes to both and to the overrides patch', async () => {
  const s = await setup();
  try {
    const rows = await s.load(sheetName('vocab-top1000'));
    const a = pick(rows, 'vocab-top1000:va'); a.status = 'ok'; a.reviewer = 'T'; a.review_date = '2026-05-06';
    const b = pick(rows, 'vocab-top1000:vb'); b.status = 'fix'; b.corrected_text = 'שָׁלוֹם!'; 
    const g = pick(rows, 'vocab-top1000:vb'); g.corrected_text = 'en: peace; hello';
    await s.save([a, g]);
    const res = await applyReview({ files: [s.sheetPath], root: s.root, apply: true });
    assert.deepEqual(res.errors, []);
    const canon = await json(s.root, 'data/vocab/vocab5000.json');
    const pack = await json(s.root, 'data/vocab/packs/vocab5k-tier-500.json');
    assert.equal(canon.entries[0].proofread, true); assert.equal(pack.entries[0].proofread, true);
    assert.equal(canon.entries[0].reviewedBy, 'T'); assert.equal(pack.entries[0].reviewedOn, '2026-05-06');
    assert.equal(canon.entries[1].gloss, 'peace; hello'); assert.equal(pack.entries[1].gloss, 'peace; hello');
    assert.equal(canon.entries[1].proofread, false);
    assert.equal(canon.entries[2].proofread, false);
    const patch = await json(s.root, 'docs/review/vocab-overrides-patch.json');
    assert.deepEqual(patch, { vb: { gloss: 'peace; hello' } });
    // the compact one-entry-per-line layout is preserved
    const raw = await readFile(join(s.root, 'data/vocab/vocab5000.json'), 'utf8');
    assert.equal(raw.split('\n').length, 7);
  } finally { await cleanup(s.root); }
});

test('container roll-up: dialogue is marked reviewed only when every line is ok; partial leaves it false', async () => {
  const s = await setup();
  try {
    const rows = await s.load(sheetName('dialogues'));
    const l1 = pick(rows, 'dialogues:d-one-l1'); l1.status = 'ok'; l1.reviewer = 'N'; l1.review_date = '2026-06-07';
    await s.save([l1]);
    let res = await applyReview({ files: [s.sheetPath], root: s.root, apply: true });
    assert.equal(res.rollups.length, 0);
    assert.ok(res.notes.some((n) => /1\/2/.test(n)));
    let d = await json(s.root, 'data/curriculum/dialogues.json');
    assert.equal(d.dialogues[0].proofread, false);
    assert.equal(d.dialogues[0].lines[0].proofread, true);
    // build a fresh sheet (line 1 is no longer flagged) and finish line 2
    const out = join(s.root, 'docs/review/out2');
    await buildPackets({ root: s.root, out, noPdf: true, quiet: true });
    const rows2 = parseCsvObjects(await readFile(join(out, sheetName('dialogues')), 'utf8')).records;
    assert.equal(rows2.length, 1);
    rows2[0].status = 'ok'; rows2[0].reviewer = 'N'; rows2[0].review_date = '2026-06-08';
    await s.save(rows2);
    res = await applyReview({ files: [s.sheetPath], root: s.root, apply: true });
    assert.equal(res.rollups.length, 1);
    d = await json(s.root, 'data/curriculum/dialogues.json');
    assert.equal(d.dialogues[0].proofread, true);
    assert.equal(d.proofread, false, 'the file-level flag is never changed automatically');
  } finally { await cleanup(s.root); }
});

test('records with only a file-level draft flag get a record-level proofread inserted (compact layout kept)', async () => {
  const s = await setup();
  try {
    const rows = await s.load(sheetName('lessons'));
    const w = pick(rows, 'lessons:r01:w1'); w.status = 'ok'; w.reviewer = 'T'; w.review_date = '2026-05-06';
    await s.save([w]);
    await applyReview({ files: [s.sheetPath], root: s.root, apply: true });
    const raw = await readFile(join(s.root, 'data/curriculum/lessons.json'), 'utf8');
    assert.ok(raw.includes('"translit":null,"proofread":true,"reviewedBy":"T","reviewedOn":"2026-05-06"}'), raw);
    assert.equal(JSON.parse(raw).lessons[0].proofread, undefined);
  } finally { await cleanup(s.root); }
});

test('strokes and clergy items use their own flags (validated / clergyReviewed)', async () => {
  const s = await setup();
  try {
    const st = (await s.load(sheetName('letter-strokes')))[0]; st.status = 'ok'; st.reviewer = 'T'; st.review_date = '2026-05-06';
    const cl = pick(await s.load(sheetName('prayers')), 'prayers:meta:shema-1'); cl.status = 'ok'; cl.reviewer = 'Rabbi'; cl.review_date = '2026-05-06';
    await s.save([st, cl]);
    const res = await applyReview({ files: [s.sheetPath], root: s.root, apply: true });
    assert.deepEqual(res.errors, []);
    const L = await json(s.root, 'data/letters/letters.json');
    assert.equal(L[0].print.validated, true); assert.equal(L[0].print.needsNativeReview, false);
    const M = await json(s.root, 'data/corpus/prayer-meta.json');
    assert.equal(M.entries['shema-1'].clergyReviewed, true);
  } finally { await cleanup(s.root); }
});

test('report-only items (opening prayer) can be recorded OK but write no data file', async () => {
  const s = await setup();
  try {
    const r = (await s.load(sheetName('opening-prayer')))[0]; r.status = 'ok'; r.reviewer = 'Rabbi'; r.review_date = '2026-05-06';
    await s.save([r]);
    const before = await snapshot(s.root, DATA_FILES);
    const res = await applyReview({ files: [s.sheetPath], root: s.root, apply: true });
    assert.deepEqual(res.wrote, []);
    assert.deepEqual(await snapshot(s.root, DATA_FILES), before);
    assert.ok(res.warnings.some((w) => /report-only/.test(w.why)));
    assert.match(await readFile(join(s.root, 'docs/review/ledger.jsonl'), 'utf8'), /ok-report-only/);
  } finally { await cleanup(s.root); }
});

test('CLI: exits 0 on a clean dry run, 1 when rows are rejected, and prints the report', async () => {
  const s = await setup();
  try {
    const rows = await s.load(sheetName('prayers'));
    const a = pick(rows, 'prayers:shema-1'); a.status = 'ok'; a.reviewer = 'R'; a.review_date = '2026-02-03';
    await s.save([a]);
    const cli = fileURLToPath(new URL('../tools/review/apply_review.mjs', import.meta.url));
    const good = await exec('node', [cli, s.sheetPath, '--root', s.root]);
    assert.match(good.stdout, /DRY RUN/);
    a.review_date = '';
    await s.save([a]);
    await assert.rejects(exec('node', [cli, s.sheetPath, '--root', s.root]), (e) => e.code === 1 && /Errors/.test(e.stdout));
  } finally { await cleanup(s.root); }
});

test('generic areas: nested fields are corrected with a dotted prefix, flips land on the right record', async () => {
  const s = await setup();
  try {
    const rows = await s.load(sheetName('israel-everyday'));
    const r = rows.find((x) => x.id.endsWith('fl-yalla')); r.status = 'fix'; r.corrected_text = 'example.he: יַאלְלָה, נֵלֵךְ הַבַּיְתָה';
    const x = (await s.load(sheetName('other-flagged')))[0]; x.status = 'ok'; x.reviewer = 'T'; x.review_date = '2026-05-06';
    await s.save([r, x]);
    const res = await applyReview({ files: [s.sheetPath], root: s.root, apply: true });
    assert.deepEqual(res.errors, []);
    const f = await json(s.root, 'data/israel/fillers.json');
    assert.equal(f.fillers[0].example.he, 'יַאלְלָה, נֵלֵךְ הַבַּיְתָה');
    assert.equal(f.fillers[0].proofread, false);
    assert.equal(f.fillers[0].he, 'יַאלְלָה');
    const z = await json(s.root, 'data/zzz/extra.json');
    assert.equal(z.items[0].needsNativeReview, false);
    assert.equal(z.items[0].proofread, true);
    assert.equal(z.items[0].reviewedBy, 'T');
  } finally { await cleanup(s.root); }
});

test('a row without a field prefix is refused when the item has several writable fields', async () => {
  const s = await setup();
  try {
    const r = (await s.load(sheetName('israel-everyday')))[0]; r.status = 'fix'; r.corrected_text = 'יַאלְלָה';
    await s.save([r]);
    const res = await applyReview({ files: [s.sheetPath], root: s.root });
    assert.ok(res.warnings.some((w) => /field prefix/.test(w.why)));
    assert.equal(res.fixes.length, 0);
  } finally { await cleanup(s.root); }
});
