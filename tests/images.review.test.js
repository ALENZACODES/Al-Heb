import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, symlinkSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { stateOf, approvalsFromState, decisionsFromState, redoIds, collectEntries, pageHtml, OUT } from '../tools/images/review_page.mjs';
import { main as ingestMain, syncApprovalMirror } from '../tools/images/ingest.mjs';
import { validate } from '../tools/images/validate.mjs';
import { buildGeneratedManifest, loadApprovals, loadProvenance, makePaths, writeJsonAtomic } from '../tools/images/ingest_lib.mjs';
import { plan, appendText, run, readRows, HEAD } from '../tools/images/append_manifest_rows.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = { entries: null, base: null };
const D = () => (DATA.entries ? DATA : Object.assign(DATA, collectEntries(ROOT)));
const NOW = '2026-11-04T12:00:00.000Z';

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), 'alef-review-'));
  mkdirSync(join(root, 'data/images'), { recursive: true });
  for (const f of ['approvals.json', 'provenance.json', 'generated-manifest.json', 'manifest.csv']) copyFileSync(join(ROOT, 'data/images', f), join(root, 'data/images', f));
  mkdirSync(join(root, 'assets/img'), { recursive: true });
  symlinkSync(join(ROOT, 'assets/img/gen'), join(root, 'assets/img/gen'), 'junction');
  return root;
}

test('review: state logic (effective state, redo = rejected with note, clear)', () => {
  const base = { version: 1, note: 'n', approvals: { A: { status: 'approved', at: 'x' }, B: { status: 'rejected', at: 'x', note: 'redo' }, C: { status: 'rejected', at: 'x' } } };
  assert.deepEqual(['A', 'B', 'C', 'Z'].map((i) => stateOf(base, {}, i)), ['approved', 'redo', 'rejected', 'unapproved']);
  assert.equal(stateOf(base, { Z: 'approved' }, 'Z'), 'approved');
  const a = approvalsFromState(base, { A: 'unapproved', Z: 'approved', Y: 'redo', C: 'rejected' }, { Z: ['contains_text'] }, NOW);
  assert.equal(a.version, 1); assert.equal(a.note, 'n');
  assert.ok(!('A' in a.approvals));
  assert.deepEqual(a.approvals.Z, { status: 'approved', at: NOW, forcedDespite: ['contains_text'] });
  assert.deepEqual(a.approvals.Y, { status: 'rejected', at: NOW, note: 'redo' });
  assert.deepEqual(a.approvals.C, base.approvals.C, 'unchanged entries keep their original timestamp');
  assert.deepEqual(a.approvals.B, base.approvals.B);
  assert.deepEqual(decisionsFromState(base, { A: 'unapproved', Z: 'approved', Y: 'redo', C: 'rejected', B: 'rejected' }), { approve: ['Z'], reject: ['Y'], reset: ['A'] });
  assert.deepEqual(redoIds(base, { Y: 'redo' }, ['A', 'B', 'Y', 'C']), ['B', 'Y']);
});

test('review: page lists every ingested image with the right flag counts and embeds the shared logic', () => {
  const { entries, base } = D();
  const prov = loadProvenance(makePaths(ROOT));
  assert.deepEqual(entries.map((e) => e.id).sort(), Object.keys(prov.images).sort());
  assert.equal(entries.filter((e) => e.reasons.includes('text')).length, 51);
  assert.equal(entries.filter((e) => e.reasons.includes('aspect')).length, 85);
  assert.equal(entries.filter((e) => e.reasons.includes('backdrop')).length, 58);
  const html = pageHtml({ entries, base });
  for (const e of entries) assert.ok(html.includes(`data-id="${e.id}"`), e.id);
  for (const fn of [stateOf, approvalsFromState, decisionsFromState, redoIds]) assert.ok(html.includes(fn.toString()), fn.name);
  assert.match(html, /aria-label="Approve L01_alef_print_s1"/);
  assert.match(html, /Download approvals\.json/); assert.match(html, /Download decisions\.json/);
  assert.doesNotMatch(html, /\bAI\b|\u0063laude|\u0063hatgpt/i);
  // the embedded script parses
  const script = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
  assert.doesNotThrow(() => new Function(script));
  assert.ok(OUT.replaceAll('\\', '/').endsWith('data/images/review/index.html'));
});

test('review: roundtrip. The page approvals.json and decisions.json agree with what ingest.mjs records, and validate passes', async () => {
  const { entries, base } = D();
  const ids = { clean: 'L01_alef_print_mnemonic', flagged: 'L01_alef_print_v1', rej: 'BG_cafe', redo: 'CHAR_ari_sheet' };
  for (const id of Object.values(ids)) assert.ok(entries.some((e) => e.id === id), id);
  assert.deepEqual(entries.find((e) => e.id === ids.flagged).blocking, ['contains_text']);
  const changes = { [ids.clean]: 'approved', [ids.flagged]: 'approved', [ids.rej]: 'rejected', [ids.redo]: 'redo' };
  const blocking = Object.fromEntries(entries.filter((e) => e.blocking.length).map((e) => [e.id, e.blocking]));
  const page = approvalsFromState(base, changes, blocking, NOW);
  const dec = decisionsFromState(base, changes);
  assert.deepEqual(dec, { approve: [ids.flagged, ids.clean].sort(), reject: [ids.rej, ids.redo].sort(), reset: [] });

  // route 1 (supported): apply-decisions through ingest.mjs
  const r1 = tempRoot();
  try {
    const f = join(r1, 'decisions.json'); writeFileSync(f, JSON.stringify(dec));
    const log = console.log; console.log = () => {};
    let code; try { code = await ingestMain(['apply-decisions', f, '--root', r1, '--force']); } finally { console.log = log; }
    assert.equal(code, 0);
    const got = JSON.parse(readFileSync(join(r1, 'data/images/approvals.json'), 'utf8'));
    assert.deepEqual(Object.keys(got.approvals).sort(), Object.keys(page.approvals).sort());
    for (const [id, e] of Object.entries(page.approvals)) {
      assert.equal(got.approvals[id].status, e.status, id);
      assert.deepEqual(got.approvals[id].forcedDespite, e.forcedDespite, id);
    }
    assert.deepEqual(got.approvals[ids.flagged].forcedDespite, ['contains_text']);
    assert.deepEqual(Object.keys(got), Object.keys(base).filter((k) => k in got));
    const v = validate({ root: r1 });
    assert.deepEqual(v.errors, []);
    assert.equal(v.approved, 2);
  } finally { rmSync(r1, { recursive: true, force: true }); }

  // route 2: the downloaded approvals.json dropped over approvals.json, then the mirror and generated manifest rebuilt
  const r2 = tempRoot();
  try {
    const p = makePaths(r2);
    writeJsonAtomic(p.approvals, page);
    const ap = loadApprovals(p); assert.deepEqual(ap, page);
    const prov = loadProvenance(p); syncApprovalMirror(prov, ap);
    writeJsonAtomic(p.provenance, prov); writeJsonAtomic(p.generated, buildGeneratedManifest(prov, ap));
    const v = validate({ root: r2 });
    assert.deepEqual(v.errors, []);
    assert.deepEqual(Object.keys(JSON.parse(readFileSync(p.generated, 'utf8')).images).sort(), [ids.clean, ids.flagged].sort());
  } finally { rmSync(r2, { recursive: true, force: true }); }
});

test('review: approving a text-flagged image without forcedDespite would fail validate (so the page always records it)', () => {
  const { entries, base } = D();
  const blocking = Object.fromEntries(entries.filter((e) => e.blocking.length).map((e) => [e.id, e.blocking]));
  const changes = Object.fromEntries(Object.keys(blocking).map((id) => [id, 'approved']));
  const out = approvalsFromState(base, changes, blocking, NOW);
  for (const id of Object.keys(blocking)) assert.deepEqual(out.approvals[id].forcedDespite, blocking[id], id);
});

// ---------- append_manifest_rows ----------
const mrow = (file, extra = {}) => ({ file, set: 's', command: '201', block: 'I', width: '1792', height: '1024', status: 'pending', prompt: 'p, "q"', ...extra });

test('append: plan skips present stems and duplicates within the source, and flags invalid rows', () => {
  const p = plan([mrow('A.png')], [mrow('A.png'), mrow('B.png'), mrow('B.png'), mrow('bad name.png'), mrow('C.png', { width: 'x' }), mrow('D.png', { prompt: '' })]);
  assert.deepEqual(p.append.map((r) => r.file), ['B.png']);
  assert.deepEqual(p.present, ['A.png', 'B.png']);
  assert.equal(p.invalid.length, 3);
  assert.equal(appendText('x\n', []), '');
  assert.equal(appendText('x', [mrow('B.png')]).startsWith('\n'), true);
});

test('append: dry run writes nothing; real run appends once, keeps old bytes, is idempotent', () => {
  const dir = mkdtempSync(join(tmpdir(), 'alef-append-'));
  try {
    const man = join(dir, 'manifest.csv'), src = join(dir, 'inter.csv'), src2 = join(dir, 'j.csv');
    const old = readFileSync(join(ROOT, 'data/images/manifest.csv'), 'utf8');
    writeFileSync(man, old);
    copyFileSync(join(ROOT, 'data/images/inter-pending.csv'), src);
    writeFileSync(src2, `${HEAD.join(',')}\nJ-01.png,block_j,301,J,1024,1024,pending,"a, b"\n${readFileSync(src, 'utf8').split('\n')[1]}\n`);
    let r = run({ manifest: man, sources: [src], dry: true });
    assert.equal(r.appended, 100); assert.equal(r.wrote, false); assert.equal(readFileSync(man, 'utf8'), old);
    r = run({ manifest: man, sources: [src] });
    assert.equal(r.wrote, true);
    const now = readFileSync(man, 'utf8');
    assert.ok(now.startsWith(old), 'existing bytes untouched');
    assert.equal(readRows(man).length, readRows(join(ROOT, 'data/images/manifest.csv')).length + 100);
    r = run({ manifest: man, sources: [src] });
    assert.equal(r.appended, 0); assert.equal(r.present, 100); assert.equal(readFileSync(man, 'utf8'), now);
    r = run({ manifest: man, sources: [src, src2] });
    assert.equal(r.appended, 1); assert.ok(readFileSync(man, 'utf8').startsWith(now));
    writeFileSync(src2, 'file,set\nx,y\n');
    assert.throws(() => run({ manifest: man, sources: [src2] }), /header must contain/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('append: appended rows are readable by ingest (loadManifest) and the real manifest is not modified here', async () => {
  const { loadManifest } = await import('../tools/images/ingest_lib.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'alef-append2-'));
  try {
    const man = join(dir, 'manifest.csv');
    copyFileSync(join(ROOT, 'data/images/manifest.csv'), man);
    run({ manifest: man, sources: [join(ROOT, 'data/images/inter-pending.csv')] });
    const rows = loadManifest(man);
    const i = rows.find((r) => r.stem === 'I-01-img1');
    assert.ok(i && i.width === 1792 && i.height === 1024 && i.block === 'I' && /No text of any kind/.test(i.prompt));
    assert.equal(readRows(join(ROOT, 'data/images/manifest.csv')).some((r) => r.file === 'I-01-img1.png'), false, 'manifest.csv itself must stay as it was until the user appends');
  } finally { rmSync(dir, { recursive: true, force: true }); }
  assert.ok(readdirSync(join(ROOT, 'data/images')).includes('inter-pending.csv'));
});

// ---------- block J ----------
import { loadBlockJ, blockJAlt } from '../tools/images/block_j_rows.mjs';
import { matchBlockJ, matchFolder as matchJFolder, pasteFileByCommand } from '../tools/images/match_blockj.mjs';
import { render as renderRunbook, blockJ as runbookBlockJ } from '../tools/images/build_runbook.mjs';
import { previewEntries } from '../tools/images/review_page.mjs';

const J = loadBlockJ();
const PASTE = join(ROOT, 'docs/images/paste');

test('block J: 1000 unique ids J-NNNN, every alt is non-empty plain text of sensible length (csv alt used as is)', () => {
  assert.equal(J.length, 1000);
  assert.equal(new Set(J.map((r) => r.id)).size, 1000);
  J.forEach((r, i) => assert.equal(r.id, `J-${String(i + 1).padStart(4, '0')}`));
  for (const r of J) {
    assert.ok(r.alt.trim().length >= 10 && r.alt.length <= 200, `${r.id}: alt "${r.alt}"`);
    assert.equal(blockJAlt(r), r.alt.replace(/\s+/g, ' ').trim());
    assert.doesNotMatch(r.alt, /\bAI\b|\u0063laude|\u0063hatgpt/i, r.id);
  }
  assert.match(blockJAlt({ id: 'J-9999', alt: '', kind: 'word-object', set: 'j_vocab_arts-sports-set01' }), /^Flat illustration \(word object\) from the set vocab arts sports set01\.$/);
});

test('block J: the manifest altText map carries every J id with the csv alt', () => {
  const man = JSON.parse(readFileSync(join(ROOT, 'data/images/generated-manifest.json'), 'utf8'));
  for (const r of J) assert.equal(man.altText[r.id], blockJAlt(r), r.id);
});

test('block J: matcher classifies names, and its paste-file numbering agrees with the real j-NN.txt files', () => {
  const r = matchBlockJ(['J-0001.png', 'J-0002 (1).png', 'j-0003.png', 'J-0014.png', 'J-0014.webp', 'stray.png', 'readme.txt'], J);
  assert.deepEqual(r.matched.map((m) => m.id), ['J-0001', 'J-0003', 'J-0014']);
  assert.deepEqual(r.variants.map((m) => m.id), ['J-0002']);
  assert.equal(r.caseFixed.length, 1);
  assert.deepEqual(r.duplicates.map((d) => d.id), ['J-0014']);
  assert.deepEqual(r.unmatched, ['stray.png']);
  assert.equal(r.missing.length, 997);
  assert.deepEqual(r.perPasteFile.slice(0, 2).map((p) => [p.file, p.present, p.total]), [['j-01.txt', 2, 13], ['j-02.txt', 1, 13]]);
  const byCmd = pasteFileByCommand(J);
  for (const [cmd, file] of byCmd) {
    const text = readFileSync(join(PASTE, file), 'utf8');
    const inFile = [...text.matchAll(/^\d+\. FILENAME: (J-\d{4})\.png /gm)].map((m) => m[1]);
    assert.deepEqual(inFile, J.filter((x) => Number(x.command) === cmd).map((x) => x.id), file);
  }
  const dir = mkdtempSync(join(tmpdir(), 'alef-j-'));
  try {
    for (const row of J) writeFileSync(join(dir, row.file), 'x');
    const full = matchJFolder(dir, J);
    assert.equal(full.matched.length, 1000); assert.equal(full.missing.length, 0); assert.ok(full.perPasteFile.every((p) => p.present === p.total));
    assert.equal(readdirSync(dir).length, 1000);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('block J: runbook has step 4 read from disk (78 files, 1000 images) and is current', () => {
  const j = runbookBlockJ();
  assert.equal(j.files.length, 78); assert.equal(j.rows, 1000);
  assert.equal(j.files.reduce((n, f) => n + f.count, 0), 1000);
  const md = readFileSync(join(ROOT, 'docs/images/RUNBOOK.md'), 'utf8');
  assert.equal(md, renderRunbook(), 'RUNBOOK.md is stale: run node tools/images/build_runbook.mjs');
  assert.match(md, /\| 4 \|.*J-MASTER\.txt.*j-78\.txt.* \| 1000 \|/);
  assert.match(md, /- block J \(1000\): j-01:13/);
  assert.match(md, /match_blockj\.mjs/);
  assert.ok(md.indexOf('inter-01') < md.indexOf('J-MASTER'));
  const none = mkdtempSync(join(tmpdir(), 'alef-rb-'));
  try { assert.equal(runbookBlockJ(none), null, 'no block J files, no step 4'); } finally { rmSync(none, { recursive: true, force: true }); }
});

test('block J: append tool accepts block-j.csv (extra columns ignored) and writes only the 8 manifest columns', () => {
  const dir = mkdtempSync(join(tmpdir(), 'alef-jappend-'));
  try {
    const man = join(dir, 'manifest.csv');
    copyFileSync(join(ROOT, 'data/images/manifest.csv'), man);
    const r = run({ manifest: man, sources: [join(ROOT, 'data/images/block-j.csv')] });
    assert.equal(r.appended, 1000);
    const rows = readRows(man);
    const row = rows.find((x) => x.file === 'J-0001.png');
    assert.deepEqual(Object.keys(row), HEAD);
    assert.equal(row.block, 'J'); assert.equal(row.command, '301'); assert.equal(rows.length, readRows(join(ROOT, 'data/images/manifest.csv')).length + 1000);
    assert.equal(run({ manifest: man, sources: [join(ROOT, 'data/images/block-j.csv')] }).appended, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('block J: review page previews returned, not-yet-ingested files with csv alt (view only); ingested ones are unaffected', () => {
  const dir = mkdtempSync(join(tmpdir(), 'alef-jrev-'));
  try {
    for (const f of ['J-0001.png', 'J-0500.webp', 'I-01-img1.png', 'other.png', 'L01_alef_print_v1.png']) writeFileSync(join(dir, f), 'x');
    const jAlt = new Map(J.map((r) => [r.id, blockJAlt(r)]));
    const ingested = new Set(Object.keys(JSON.parse(readFileSync(join(ROOT, 'data/images/provenance.json'), 'utf8')).images));
    const pv = previewEntries(dir, OUT, ingested, jAlt, ROOT);
    assert.deepEqual(pv.map((p) => p.id), ['I-01-img1', 'J-0001', 'J-0500']);
    assert.equal(pv.find((p) => p.id === 'J-0001').alt, J[0].alt);
    assert.match(pv.find((p) => p.id === 'I-01-img1').alt, /^Illustration: A congregation/);
    const { entries, base } = collectEntries(ROOT, { folder: dir });
    const data = collectEntries(ROOT, { folder: dir });
    assert.equal(data.previews.length, 3); assert.equal(entries.length, Object.keys(loadProvenance(makePaths(ROOT)).images).length);
    const html = pageHtml(data);
    assert.match(html, /class="tile prev" data-id="J-0001"/);
    assert.match(html, /not ingested yet/);
    assert.doesNotMatch(html, /aria-label="Approve J-0001"/, 'preview tiles have no approve button');
    assert.match(html, /\.tile:not\(\.prev\)/);
    assert.deepEqual(approvalsFromState(base, {}, {}, NOW), base, 'previews never enter approvals.json');
    assert.equal(pageHtml(collectEntries(ROOT)).includes('class="tile prev"'), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

import { wrongAspect, imageSizes } from '../tools/images/match_blockj.mjs';
test('block J: wrong aspect is detected from real image dimensions (python3 -I PIL), unreadable files are skipped', () => {
  const dir = mkdtempSync(join(tmpdir(), 'alef-jasp-'));
  try {
    const py = 'from PIL import Image\nImage.new("RGB",(64,64)).save("J-0001.png")\nImage.new("RGB",(96,64)).save("J-0002.png")\n';
    const r = spawnSync('python3', ['-I', '-c', py], { cwd: dir });
    assert.equal(r.status, 0, String(r.stderr));
    writeFileSync(join(dir, 'J-0003.png'), 'not an image');
    const matched = ['J-0001', 'J-0002', 'J-0003'].map((id) => ({ file: `${id}.png`, id }));
    const sizes = imageSizes(dir, matched.map((m) => m.file));
    assert.deepEqual(sizes.get('J-0002.png'), [96, 64]); assert.equal(sizes.has('J-0003.png'), false);
    const bad = wrongAspect(matched, sizes, J.slice(0, 3));
    assert.equal(J[0].width, J[0].height); assert.equal(J[1].width, J[1].height);
    assert.deepEqual(bad.map((b) => b.id), ['J-0002']);
    assert.equal(wrongAspect(matched, new Map([['J-0001.png', [1024, 1024]]]), J).length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
