import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkAspect, classifyName, csvCell, editDistance, parseCsv, suggestStems, toCsv, makePaths, buildGeneratedManifest, webCap,
} from '../tools/images/ingest_lib.mjs';
import { ingest, decide, status, assignmentCsv } from '../tools/images/ingest.mjs';
import { validate } from '../tools/images/validate.mjs';
import { writeSheets, esc } from '../tools/images/ingest_sheets.mjs';
import { createImgResolver } from '../book/img.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, 'images.ingest_fixtures.py');
const hasPil = spawnSync('python3', ['-I', '-c', 'import PIL'], {}).status === 0;
const hasTess = spawnSync('tesseract', ['--list-langs'], { encoding: 'utf8' }).stdout?.includes('heb');
const skipPy = hasPil ? false : 'Pillow not installed';
const skipOcr = hasPil && hasTess ? false : 'Pillow or tesseract (heb) not installed';

const made = [];
const tmp = () => { const d = mkdtempSync(join(tmpdir(), 'alef-ingtest-')); made.push(d); return d; };
after(() => { for (const d of made) rmSync(d, { recursive: true, force: true }); });
const fixtures = (dir, specs) => execFileSync('python3', ['-I', FIX, dir, JSON.stringify(specs)]);
const pyJson = (code, ...args) => JSON.parse(execFileSync('python3', ['-I', '-c', code, ...args], { encoding: 'utf8' }));

/** mini repo root: manifest with awkward CSV (commas, quotes and a newline inside the prompt). */
function miniRoot() {
  const root = tmp(); mkdirSync(join(root, 'data/images'), { recursive: true });
  const hdr = 'file,set,command,block,width,height,status,prompt\n';
  const rows = [
    'T01_cup.png,s1,1,A,1024,1024,pending,"A cup, with ""quotes"" <script>alert(1)</script>\nsecond line"',
    'T02_wide.png,s1,2,A,1792,1024,pending,"wide scene"',
    'T03_text.png,s1,3,B,1024,1024,pending,"text trap"',
    'T04_bad.png,s1,4,B,1024,1024,pending,"square row"',
    'T05_var.png,s1,5,B,1024,1024,pending,"variant only"',
    'ICON_t06.png,s2,6,F,512,512,pending,"Simple icon on transparent background"',
    'T07_never.png,s1,7,C,1024,1024,pending,"never generated"',
  ];
  writeFileSync(join(root, 'data/images/manifest.csv'), hdr + rows.join('\n') + '\n');
  return { root, paths: makePaths(root, { originals: join(tmp(), 'orig') }) };
}

// ---------- pure helpers ----------
test('csv: quoted commas, doubled quotes and newlines round-trip', () => {
  const rows = parseCsv('a,b\n"x,1","he said ""hi""\nbye"\n');
  assert.deepEqual(rows, [['a', 'b'], ['x,1', 'he said "hi"\nbye']]);
  assert.deepEqual(parseCsv(toCsv(['h'], [['a,b'], ['q"r']])), [['h'], ['a,b'], ['q"r']]);
  assert.equal(csvCell('plain'), 'plain');
});
test('the real manifest parses and every stem is safe and unique', async () => {
  const { loadManifest } = await import('../tools/images/ingest_lib.mjs');
  const rows = loadManifest(new URL('../data/images/manifest.csv', import.meta.url).pathname);
  assert.equal(rows.length, 1797); // 797 original rows + the 1000 Run 3 rows (data/images/run3.csv)
  assert.equal(new Set(rows.map((r) => r.stem)).size, 1797);
});
test('classifyName: exact, case, plain duplicate suffix; generator default names are never matched', () => {
  const stems = new Set(['L05_dalet_quirky', 'L01_alef_print_mnemonic']);
  assert.deepEqual(classifyName('L05_dalet_quirky.png', stems), { kind: 'exact', stem: 'L05_dalet_quirky' });
  assert.equal(classifyName('l05_dalet_quirky.PNG', stems).kind, 'case');
  assert.equal(classifyName('L05_dalet_quirky (1).png', stems).kind, 'variant');
  assert.equal(classifyName('L05_dalet_quirky(2).png', stems).kind, 'variant');
  assert.equal(classifyName('L05_dalet_quirky - Copy.png', stems).kind, 'variant');
  for (const n of ['Generated Image Nov 3, 2026, 10_32_11 AM.png', 'image (1).png', 'L05_dalet_quirky_2.png', 'L05 dalet quirky.png', 'L05_dalet_quirky.v2.png']) assert.equal(classifyName(n, stems).kind, 'none', n);
  assert.equal(classifyName('sub/dir/L01_alef_print_mnemonic.webp', stems).kind, 'exact');
});
test('suggestStems only suggests near misses and edit distance is right', () => {
  assert.equal(editDistance('kitten', 'sitting'), 3);
  assert.deepEqual(suggestStems('L05 dalet quirky.png', ['L05_dalet_quirky', 'X']), ['L05_dalet_quirky']);
  assert.deepEqual(suggestStems('Generated Image Nov 3.png', ['L05_dalet_quirky']), []);
});
test('checkAspect: exact, substituted native aspect (never cropped), mismatch', () => {
  assert.equal(checkAspect(1024, 1024, 1024, 1024).level, 'exact');
  assert.equal(checkAspect(1536, 1024, 1792, 1024).level, 'substituted');
  assert.equal(checkAspect(1024, 1536, 1024, 1280).level, 'substituted');
  assert.equal(checkAspect(1792, 1024, 1792, 1024).level, 'exact');
  assert.equal(checkAspect(1024, 1536, 1024, 1024).level, 'mismatch');
  assert.equal(checkAspect(1536, 1024, 1024, 1536).ok, false);
  assert.equal(webCap({ width: 512, height: 512 }), 800);
  assert.equal(webCap({ width: 1792, height: 1024 }), 1600);
});
test('assignmentCsv leaves assign_id blank', () => {
  const t = parseCsv(assignmentCsv([{ file: 'a b.png', suggested: ['X'], reason: 'r', width: 1, height: 2, sha256: 'abc' }]));
  assert.deepEqual(t[0].slice(0, 2), ['file', 'assign_id']); assert.equal(t[1][1], '');
});
test('buildGeneratedManifest lists approved images only', () => {
  const prov = { images: { a: { width: 1, height: 1, variants: [{ edge: 800, file: 'a.800.webp', width: 1, height: 1 }] }, b: { width: 1, height: 1, variants: [{ edge: 800, file: 'b.800.webp', width: 1, height: 1 }] } } };
  const m = buildGeneratedManifest(prov, { approvals: { a: { status: 'approved' }, b: { status: 'rejected' } } });
  assert.deepEqual(Object.keys(m.images), ['a']); assert.equal(m.count, 1);
});

// ---------- end to end with synthetic images ----------
test('ingest end to end: matching, checks, web copies, metadata stripped, provenance, never-guess report', { skip: skipPy }, async () => {
  const { root, paths } = miniRoot();
  const inDir = join(tmp(), 'in');
  fixtures(inDir, [
    { name: 'T01_cup.png', w: 1024, h: 1024, kind: 'meta' },
    { name: 'T01_cup (1).png', w: 1024, h: 1024, kind: 'meta' },          // same bytes? no: regenerated identically -> check below
    { name: 'T02_wide.png', w: 1536, h: 1024 },
    { name: 'T04_bad.png', w: 1024, h: 1536 },                           // wrong shape for a square row
    { name: 'T05_var (1).png', w: 1024, h: 1024, seed: 3 },              // only a renamed duplicate exists
    { name: 'ICON_t06.png', w: 1024, h: 1024 },                          // opaque icon: should flag not_transparent
    { name: 'Generated Image Nov 3, 2026, 10_32_11 AM.png', w: 1024, h: 1024, seed: 9 },
    { name: 'nested/ignore.txt', w: 4, h: 4 },
  ].filter((s) => !s.name.includes('/')));
  writeFileSync(join(inDir, 'notes.txt'), 'x'); writeFileSync(join(inDir, '.DS_Store'), 'x');
  const rep = await ingest({ paths, inputs: [inDir], ocr: false, now: '2026-11-05T00:00:00.000Z' });
  const ids = rep.ingested.map((x) => x.id).sort();
  assert.deepEqual(ids, ['ICON_t06', 'T01_cup', 'T02_wide', 'T05_var']);
  assert.equal(rep.rejectedFiles.length, 1, JSON.stringify(rep.rejectedFiles)); assert.match(rep.rejectedFiles[0].reason, /aspect mismatch/);
  assert.equal(rep.unmatched.length, 1); assert.match(rep.unmatched[0].file, /Generated Image/);
  assert.equal(rep.unmatched[0].width, 1024);
  assert.ok(rep.contentDuplicates.some((d) => d.sameAs?.includes('T01_cup.png')), 'identical " (1)" copy reported as duplicate, not re-ingested');
  assert.equal(rep.ingested.find((x) => x.id === 'T05_var').matchedBy, 'renamed-duplicate');
  assert.ok(rep.skipped.length >= 2);
  const csv = parseCsv(readFileSync(paths.assignCsv, 'utf8'));
  assert.equal(csv.length, 2); assert.equal(csv[1][1], '');

  const prov = JSON.parse(readFileSync(paths.provenance, 'utf8')).images;
  const p1 = prov.T01_cup;
  assert.equal(p1.humanApproved, false); assert.equal(p1.ingestedAt, '2026-11-05T00:00:00.000Z');
  assert.match(p1.tool, /image generator/); assert.match(p1.prompt, /<script>/); assert.equal(p1.command, 1);
  assert.equal(p1.promptSha256.length, 64); assert.equal(p1.metadataStripped, true);
  assert.deepEqual(p1.variants.map((v) => v.edge), [800, 1024]);   // 1024 source: never upscaled to 1600
  assert.ok(prov.T02_wide.flags.includes('aspect_substituted'));
  assert.ok(prov.ICON_t06.flags.includes('not_transparent'));
  assert.deepEqual(prov.ICON_t06.variants.map((v) => v.edge), [800]);  // icon rows are capped at 800

  // web copy: right size, webp, NO exif / icc; original keeps its metadata and lives outside the repo tree
  const web = pyJson('import sys,json\nfrom PIL import Image\nim=Image.open(sys.argv[1]);print(json.dumps({"f":im.format,"s":im.size,"icc":bool(im.info.get("icc_profile")),"exif":len(im.getexif())}))', join(paths.genDir, 'T01_cup.800.webp'));
  assert.deepEqual(web, { f: 'WEBP', s: [800, 800], icc: false, exif: 0 });
  const orig = pyJson('import sys,json\nfrom PIL import Image\nim=Image.open(sys.argv[1]);print(json.dumps({"exif":len(im.getexif()),"s":im.size}))', join(paths.originals, 'T01_cup.png'));
  assert.equal(orig.exif > 0, true); assert.deepEqual(orig.s, [1024, 1024]);
  assert.ok(!paths.originals.startsWith(root + '/'), 'originals outside the repo root');

  // nothing approved by default; manifest empty
  assert.equal(JSON.parse(readFileSync(paths.generated, 'utf8')).count, 0);
  assert.equal(validate({ paths }).errors.length, 0);

  // re-run: unchanged; different bytes for the same id: conflict until --replace (which resets approval)
  const again = await ingest({ paths, inputs: [inDir], ocr: false });
  assert.equal(again.unchanged.length, 4); assert.equal(again.ingested.length, 0);
  const d2 = join(tmp(), 'in2'); fixtures(d2, [{ name: 'T01_cup.png', w: 1024, h: 1024, seed: 5 }]);
  const conflict = await ingest({ paths, inputs: [d2], ocr: false });
  assert.equal(conflict.conflicts.length, 1);
  decide({ paths, ids: ['T01_cup'], status: 'approved' });
  assert.equal(JSON.parse(readFileSync(paths.generated, 'utf8')).count, 1);
  const rep2 = await ingest({ paths, inputs: [d2], ocr: false, replace: true });
  assert.deepEqual(rep2.replaced, ['T01_cup']);
  assert.equal(JSON.parse(readFileSync(paths.generated, 'utf8')).count, 0, 'replacing an image drops its approval');
  assert.ok(readdirSync(paths.originals).some((f) => /^T01_cup\.[0-9a-f]{8}\.png$/.test(f)), 'old original archived');
  assert.equal(validate({ paths }).errors.length, 0);
});

test('assignment CSV: generator-named file is used only after the user assigns it', { skip: skipPy }, async () => {
  const { paths } = miniRoot();
  const inDir = join(tmp(), 'in'); fixtures(inDir, [{ name: 'Generated Image Nov 3, 2026, 10_32_11 AM.png', w: 1024, h: 1024 }]);
  const r1 = await ingest({ paths, inputs: [inDir], ocr: false });
  assert.equal(r1.ingested.length, 0); assert.equal(r1.unmatched.length, 1);
  const rows = parseCsv(readFileSync(paths.assignCsv, 'utf8'));
  rows[1][1] = 'T07_never';
  const f = join(tmp(), 'assign.csv'); writeFileSync(f, toCsv(rows[0], rows.slice(1)));
  const r2 = await ingest({ paths, inputs: [inDir], ocr: false, assign: f });
  assert.deepEqual(r2.ingested.map((x) => x.id), ['T07_never']); assert.equal(r2.ingested[0].matchedBy, 'assignment-csv');
  assert.equal(existsSync(paths.assignCsv), false, 'stale assignment csv removed');
  const bad = join(tmp(), 'bad.csv'); writeFileSync(bad, 'file,assign_id\nx.png,NOT_AN_ID\n');
  const r3 = await ingest({ paths, inputs: [inDir], ocr: false, assign: bad });
  assert.match(r3.notes.join(' '), /not a manifest id/);
});

test('zip input: members are flattened (zip-slip proof), junk skipped, ingest works', { skip: skipPy }, async () => {
  const { root, paths } = miniRoot();
  const d = tmp();
  fixtures(d, [{ name: 'T01_cup.png', w: 1024, h: 1024, zip: 'batch.zip' }, { name: 'sub/T02_wide.png', w: 1536, h: 1024, zip: 'batch.zip' }, { name: '../../evil_T03_text.png', w: 1024, h: 1024, zip: 'batch.zip' }]);
  const rep = await ingest({ paths, inputs: [join(d, 'batch.zip')], ocr: false });
  assert.deepEqual(rep.ingested.map((x) => x.id).sort(), ['T01_cup', 'T02_wide']);
  assert.equal(rep.unmatched.length, 1);                      // the traversal member is just an unmatched name
  assert.ok(!existsSync(join(d, '..', 'evil_T03_text.png')) && !existsSync(join(root, '..', 'evil_T03_text.png')));
  assert.ok(rep.skipped.some((s) => /MACOSX/.test(s.name)));
  const bogus = join(d, 'fake.zip'); writeFileSync(bogus, 'not a zip');
  await assert.rejects(() => ingest({ paths, inputs: [bogus], ocr: false }), /not a readable zip/);
  const trunc = join(d, 'trunc.png'); writeFileSync(trunc, Buffer.from('89504e470d0a1a0a0000', 'hex'));
  const rep2 = await ingest({ paths, inputs: [trunc], ocr: false });   // name matches nothing
  assert.equal(rep2.unmatched.length, 1);
});

test('corrupt or non-image bytes with a matching name are rejected, not ingested', { skip: skipPy }, async () => {
  const { paths } = miniRoot();
  const d = tmp(); writeFileSync(join(d, 'T01_cup.png'), 'this is not a png');
  const rep = await ingest({ paths, inputs: [d], ocr: false });
  assert.equal(rep.ingested.length, 0); assert.match(rep.rejectedFiles[0].reason, /unreadable/);
});

test('OCR flags Latin and Hebrew text but not a plain illustration; approve refuses flagged images unless forced', { skip: skipOcr }, async () => {
  const { paths } = miniRoot();
  const d = join(tmp(), 'in');
  fixtures(d, [{ name: 'T01_cup.png', w: 1024, h: 1024 }, { name: 'T03_text.png', w: 1024, h: 1024, kind: 'latin' }, { name: 'T05_var.png', w: 1024, h: 1024, kind: 'hebrew' }]);
  const rep = await ingest({ paths, inputs: [d], jobs: 3 });
  const f = Object.fromEntries(rep.ingested.map((x) => [x.id, x.flags]));
  assert.ok(!f.T01_cup.includes('contains_text'), 'plain picture must not be flagged');
  assert.ok(f.T03_text.includes('contains_text')); assert.ok(f.T05_var.includes('contains_text'));
  const prov = JSON.parse(readFileSync(paths.provenance, 'utf8')).images;
  assert.ok(prov.T05_var.ocr.blobs.some((b) => /[א-ת]{3}/.test(b.t)));
  const r = decide({ paths, ids: ['T01_cup', 'T03_text'], status: 'approved' });
  assert.deepEqual(r.applied, ['T01_cup']); assert.equal(r.skipped[0].id, 'T03_text');
  assert.equal(validate({ paths }).errors.length, 0);
  const forced = decide({ paths, ids: ['T03_text'], status: 'approved', force: true });
  assert.deepEqual(forced.applied, ['T03_text']);
  const v = validate({ paths }); assert.equal(v.errors.length, 0); assert.ok(v.warnings.some((w) => /by force/.test(w)));
});

test('approve / reject / reset / globs / unknown ids; generated-manifest and validate stay consistent', { skip: skipPy }, async () => {
  const { paths } = miniRoot();
  const d = join(tmp(), 'in'); fixtures(d, [{ name: 'T01_cup.png', w: 1024, h: 1024 }, { name: 'T02_wide.png', w: 1536, h: 1024 }, { name: 'T05_var.png', w: 1024, h: 1024, seed: 2 }]);
  await ingest({ paths, inputs: [d], ocr: false });
  assert.equal(status({ paths }).per.A.approved, 0, 'default is unapproved');
  const r = decide({ paths, ids: ['T0*', 'NOPE', 'T07_never', 'X*'], status: 'approved' });
  assert.equal(r.applied.length, 3); assert.equal(r.errors.length, 3);
  assert.match(r.errors.join(' '), /not ingested yet/);
  let m = JSON.parse(readFileSync(paths.generated, 'utf8')); assert.equal(m.count, 3);
  assert.deepEqual(m.images.T02_wide.files.map((f) => f.edge), [800, 1536]);
  decide({ paths, ids: ['T01_cup'], status: 'rejected', note: 'wrong cup' });
  decide({ paths, ids: ['T02_wide'], status: 'reset' });
  m = JSON.parse(readFileSync(paths.generated, 'utf8')); assert.deepEqual(Object.keys(m.images), ['T05_var']);
  const ap = JSON.parse(readFileSync(paths.approvals, 'utf8')).approvals;
  assert.equal(ap.T01_cup.status, 'rejected'); assert.equal(ap.T01_cup.note, 'wrong cup'); assert.equal(ap.T02_wide, undefined);
  assert.equal(validate({ paths }).errors.length, 0);
  const s = status({ paths });
  assert.equal(s.per.A.rejected, 1); assert.equal(s.per.C.missing, 1);
  // tamper: delete a web file and desync the manifest -> validate must complain
  rmSync(join(paths.genDir, 'T05_var.800.webp'));
  writeFileSync(paths.generated, JSON.stringify({ version: 1, images: { T01_cup: { files: [] } } }));
  const e = validate({ paths }).errors.join('\n');
  assert.match(e, /web file missing/); assert.match(e, /out of date/); assert.match(e, /published but not approved/);
});

test('contact sheets: one HTML per block, prompts escaped, ids present, missing rows shown', { skip: skipPy }, async () => {
  const { paths } = miniRoot();
  const d = join(tmp(), 'in'); fixtures(d, [{ name: 'T01_cup.png', w: 1024, h: 1024 }]);
  await ingest({ paths, inputs: [d], ocr: false });
  decide({ paths, ids: ['T01_cup'], status: 'approved' });
  const { files } = writeSheets({ paths });
  assert.ok(files.some((f) => f.endsWith('block-A.html')) && files.some((f) => f.endsWith('index.html')));
  const html = readFileSync(join(paths.sheets, 'block-A.html'), 'utf8');
  assert.ok(!html.includes('<script>alert(1)'), 'prompt text must be escaped');
  assert.ok(html.includes('&lt;script&gt;alert(1)')); assert.ok(html.includes('T01_cup.800.webp')); assert.ok(html.includes('T02_wide'));
  const href = html.match(/<img loading="lazy" src="([^"]+)"/)[1];
  assert.ok(existsSync(join(paths.sheets, href)), 'thumbnail path resolves from the sheet folder: ' + href);
  assert.match(html, /const BASE=\{"T01_cup":"approved"\}/);
  const c = readFileSync(join(paths.sheets, 'block-C.html'), 'utf8'); assert.match(c, /not generated yet/);
  assert.equal(esc('<"&\'>'), '&lt;&quot;&amp;&#39;&gt;');
});

// ---------- resolver hook ----------
test('resolver: approved generated image replaces the placeholder; real file wins; unapproved never appears', () => {
  const gen = { dir: 'gen', images: { A1: { files: [{ edge: 800, file: 'A1.800.webp' }, { edge: 1600, file: 'A1.1600.webp' }] }, S1: { files: [{ edge: 512, file: 'S1.512.webp' }] } } };
  const r = createImgResolver({ base: 'assets/img', files: ['REAL.svg'], generated: gen });
  assert.equal(r.src('A1.png'), 'assets/img/gen/A1.800.webp');
  assert.equal(r.src('A1', { width: 1500 }), 'assets/img/gen/A1.1600.webp');
  assert.equal(r.src('A1', { width: 5000 }), 'assets/img/gen/A1.1600.webp');
  assert.equal(r.src('S1', { width: 800 }), 'assets/img/gen/S1.512.webp');
  assert.equal(r.src('NOT_YET'), 'assets/img/placeholders/NOT_YET.svg');
  assert.equal(r.isGenerated('A1'), true); assert.equal(r.isReal('A1'), true); assert.equal(r.isGenerated('NOT_YET'), false);
  assert.equal(r.src('REAL'), 'assets/img/REAL.svg');
  r.setGenerated({ images: {} }); assert.equal(r.src('A1'), 'assets/img/placeholders/A1.svg');
  assert.equal(createImgResolver({}).src('A1'), 'assets/img/placeholders/A1.svg', 'no generated option: old behaviour');
});
test('the committed generated-manifest.json (if present) validates against the real manifest', () => {
  const p = makePaths();
  if (!existsSync(p.generated)) return;
  const m = JSON.parse(readFileSync(p.generated, 'utf8'));
  assert.equal(m.count, Object.keys(m.images).length);
  const v = validate({ paths: p });
  assert.deepEqual(v.errors, []);
});
