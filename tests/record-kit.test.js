// Record kit: zip writer, filename logic, script loading, page build, ingest (ffmpeg fixtures) and a headless-browser run (skipped without Playwright).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as L from '../tools/record-kit/lib.mjs';
import { buildHtml } from '../tools/record-kit/build.mjs';
import { ingest } from '../tools/record-kit/ingest.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const haveFf = spawnSync('ffmpeg', ['-version']).status === 0 && spawnSync('ffprobe', ['-version']).status === 0;
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));

test('crc32 known vector and zip round trip (store only, utf-8 names)', () => {
  assert.equal(L.crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const files = [{ name: 'audio/m/sephardi/word/x.wav', data: new Uint8Array([1, 2, 3, 250, 0, 9]) }, { name: 'manifest.csv', data: 'a,b\r\nשלום,2\r\n' }, { name: 'empty.txt', data: '' }];
  const z = L.zipStore(files, new Date(2026, 10, 4, 12, 0, 0));
  const back = L.zipRead(z);
  assert.deepEqual(back.map((f) => f.name), files.map((f) => f.name));
  assert.deepEqual([...back[0].data], [1, 2, 3, 250, 0, 9]);
  assert.equal(new TextDecoder().decode(back[1].data), 'a,b\r\nשלום,2\r\n');
  const bad = z.slice(); bad[60] ^= 0xff; // corrupt a stored byte
  assert.throws(() => L.zipRead(bad), /CRC|corrupt|zip/);
});
test('zip is accepted by an independent reader (python zipfile)', { skip: spawnSync('python3', ['-c', '1']).status !== 0 }, () => {
  const d = tmp('rk-zip-'); const f = path.join(d, 't.zip');
  fs.writeFileSync(f, L.zipStore([{ name: 'a/b.bin', data: new Uint8Array(70000).fill(7) }, { name: 'שלום.txt', data: 'hi' }]));
  const r = spawnSync('python3', ['-c', "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(','.join(i.filename for i in z.infolist()), z.getinfo('a/b.bin').compress_type)", f], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr); assert.equal(r.stdout.trim(), 'a/b.bin,שלום.txt 0');
});
test('zipRead inflates deflated entries from OS-made zips when given an inflate function', { skip: spawnSync('python3', ['-c', '1']).status !== 0 }, () => {
  const d = tmp('rk-zd-'); const f = path.join(d, 'd.zip');
  spawnSync('python3', ['-c', "import zipfile,sys;z=zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED);z.writestr('x.txt','hello '*500)", f]);
  const files = L.zipRead(new Uint8Array(fs.readFileSync(f)), (u) => zlib.inflateRawSync(u));
  assert.equal(new TextDecoder().decode(files[0].data), 'hello '.repeat(500));
  assert.throws(() => L.zipRead(new Uint8Array(fs.readFileSync(f))), /inflate/);
});

test('filename logic follows audio/<voice>/<tradition>/<kind>/<id>', () => {
  assert.equal(L.clipPath('m', 'sephardi', 'word', 'ha3cf2c46'), 'audio/m/sephardi/word/ha3cf2c46.wav');
  assert.equal(L.clipPath('f', 'israeli', 'letter', 'alef', 'mp3'), 'audio/f/israeli/letter/alef.mp3');
  assert.equal(L.clipPath('m', 'ashkenazi', 'word', '../bad id/x'), 'audio/m/ashkenazi/word/bad-id-x.wav');
  assert.throws(() => L.clipPath('x', 'israeli', 'word', 'a')); assert.throws(() => L.clipPath('m', 'french', 'word', 'a')); assert.throws(() => L.clipPath('m', 'israeli', 'nope', 'a')); assert.throws(() => L.clipPath('m', 'israeli', 'word', '///'));
  assert.deepEqual(L.parseClipPath('audio/f/sephardi/prayer/bless-priestly-1.WAV'), { voice: 'f', tradition: 'sephardi', kind: 'prayer', id: 'bless-priestly-1', ext: 'wav' });
  for (const bad of ['audio/x/israeli/word/a.wav', 'audio/m/israeli/word/../a.wav', 'x/m/israeli/word/a.wav', 'audio/m/israeli/word/a']) assert.equal(L.parseClipPath(bad), null);
  assert.equal(L.exportName('Rabbi Dr. Y. Cohen-Lévy', '2026-11-04T10:00:00Z'), 'alef-recordings-rabbi-dr-y-cohen-levy-2026-11-04.zip');
});
test('every id in the three repo scripts yields a valid, unique clip path', () => {
  for (const t of L.TRADITIONS) {
    const rows = L.parseCsv(fs.readFileSync(path.join(root, `docs/voices/recording-script-${t}.csv`), 'utf8'));
    const items = L.normalizeItems(rows, { tradition: t, kind: 'word' });
    assert.equal(items.length, rows.length, t); assert.ok(items.every((i) => i.he && i.id === L.safeId(i.id)));
    const paths = items.map((i) => L.clipPath('m', t, i.kind, i.id)); assert.equal(new Set(paths).size, paths.length);
    assert.ok(paths.every((p) => L.parseClipPath(p)));
  }
});
test('normalizeItems handles the master slate (one row per voice) and recordings_needed columns', () => {
  const a = L.normalizeItems(L.parseCsv('tradition,voice,section,kind,id,pointed_hebrew\n"israeli","m","letter","letter","alef","אָלֶף"\n"israeli","f","letter","letter","alef","אָלֶף"\n"sephardi","m","letter","letter","alef","אָלֶף"\n'), { tradition: 'israeli', voice: 'f' });
  assert.deepEqual(a.map((x) => [x.id, x.kind, x.tradition]), [['alef', 'letter', 'israeli']]);
  const b = L.normalizeItems(L.parseCsv('id,tradition,voice,kind,text_he,text_niqqud,transliteration\n"bet","israeli","f","letter","בית","בֵּית","bet"\n'), {});
  assert.equal(b[0].he, 'בֵּית'); assert.equal(b[0].translit, 'bet');
  assert.equal(L.itemsFromJson('{"items":[{"id":"a b","he":"אָ"}]}').items[0].id, 'a-b');
});

test('analysis: peak, clipping, silence, quiet; wav header', () => {
  const sr = 8000, sine = (amp, n = 4000) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin(i / 7));
  assert.deepEqual(L.warningsFor(L.analyze(sine(0.5), sr)), []);
  assert.deepEqual(L.warningsFor(L.analyze(sine(1.5).map((x) => Math.max(-1, Math.min(1, x))), sr)), ['clipping']);
  assert.deepEqual(L.warningsFor(L.analyze(new Float32Array(4000), sr)), ['silent']);
  assert.deepEqual(L.warningsFor(L.analyze(sine(0.02), sr)), ['quiet']);
  assert.ok(L.warningsFor(L.analyze(sine(0.5, 100), sr)).includes('too-short'));
  assert.ok(Math.abs(L.analyze(sine(0.5), sr).peakDb - (-6.02)) < 0.2);
  const w = L.encodeWav(sine(0.5), sr), dv = new DataView(w.buffer);
  assert.equal(String.fromCharCode(...w.slice(0, 4)), 'RIFF'); assert.equal(dv.getUint32(24, true), sr); assert.equal(w.length, 44 + 8000);
  assert.equal(L.consentComplete({ volunteer_name: 'A', required: { age18: true, grant: true, own_voice: true } }), true);
  assert.equal(L.consentComplete({ volunteer_name: 'A', required: { age18: true, grant: true } }), false);
  const rec = L.consentRecord({ volunteerName: 'A', required: { age18: true, grant: true, own_voice: true }, acceptedAt: 'x', donorRef: 'd' });
  assert.equal(rec.ai_clone_consent, false); assert.match(rec.text[0], /lawyer review/i);
});

test('built page is one self-contained file: lib inlined, no external URLs, scripts parse, optional bundle embedded', () => {
  const html = buildHtml();
  assert.ok(!/^export /m.test(html)); assert.ok(html.includes('function zipStore')); assert.ok(html.includes('const BUNDLE = null;'));
  assert.ok(!/(src|href)=["']?https?:/i.test(html) && !/@import|fetch\(/.test(html));
  for (const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) assert.doesNotThrow(() => new Function(m[1]));
  const b = buildHtml({ bundle: { items: [{ id: 'a', kind: 'word', tradition: 'sephardi', he: 'א</script>' }] } });
  assert.ok(!b.includes('א</script>')); assert.match(b, /const BUNDLE = \{"items"/);
  assert.equal(fs.readFileSync(path.join(root, 'tools/record-kit/recorder.html'), 'utf8'), html, 'recorder.html is stale: run node tools/record-kit/build.mjs');
});

// ---- ingest ----
const ff = (out, filter, dur = 1) => spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', filter, '-t', String(dur), '-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le', out]);
function fixture() {
  const d = tmp('rk-ing-'); const rootDir = path.join(d, 'repo'); fs.mkdirSync(path.join(rootDir, 'data/audio'), { recursive: true });
  const ids = ['good', 'loud', 'mute', 'missing-id', 'taken', 'scriptword'];
  fs.mkdirSync(path.join(rootDir, 'docs/voices'), { recursive: true }); fs.writeFileSync(path.join(rootDir, 'docs/voices/recording-script-sephardi.csv'), 'order,id,pointed_hebrew\n1,scriptword,א\n');
  const entries = ids.filter((i) => i !== 'missing-id' && i !== 'scriptword').map((id) => ({ path: `audio/m/sephardi/word/${id}.mp3`, voice: 'm', tradition: 'sephardi', kind: 'word', id, text: 'א', status: id === 'taken' ? 'recorded' : 'missing', source: 'none' }));
  fs.writeFileSync(path.join(rootDir, 'data/audio/manifest-words-sephardi.json'), JSON.stringify(entries));
  const wav = {}; const w = path.join(d, 'wav'); fs.mkdirSync(w);
  ff(path.join(w, 'good.wav'), 'sine=frequency=220:sample_rate=44100,volume=4');
  ff(path.join(w, 'loud.wav'), 'sine=frequency=220:sample_rate=44100,volume=8');
  ff(path.join(w, 'mute.wav'), 'anullsrc=r=44100:cl=mono');
  for (const id of ids) wav[id] = fs.readFileSync(path.join(w, `${['missing-id', 'taken', 'scriptword'].includes(id) ? 'good' : id}.wav`));
  const consent = { version: 'v', donor_ref: 'abc123', volunteer_name: 'Test Reader', required: { age18: true, grant: true, own_voice: true }, ai_clone_consent: false };
  const mk = (extra = [], c = consent) => L.zipStore([...ids.map((id) => ({ name: `audio/m/sephardi/word/${id}.wav`, data: wav[id] })), ...extra, { name: 'manifest.csv', data: L.toCsv(L.MANIFEST_COLS, ids.map((id) => ({ item_id: id, path: `audio/m/sephardi/word/${id}.wav`, voice: 'm', tradition: 'sephardi', duration_s: 1, peak_dbfs: id === 'good' ? -6.02 : '' }))) }, ...(c ? [{ name: 'consent.json', data: JSON.stringify(c) }] : [])]);
  const zip = path.join(d, 'e.zip'); fs.writeFileSync(zip, mk());
  return { d, rootDir, zip, mk, consent };
}
test('ingest dry run validates names, peaks, silence, manifest and writes nothing', { skip: !haveFf }, async () => {
  const f = fixture(); const before = fs.readFileSync(path.join(f.rootDir, 'data/audio/manifest-words-sephardi.json'), 'utf8');
  const r = await ingest({ input: f.zip, root: f.rootDir, work: path.join(f.d, 'work') });
  assert.deepEqual(r.fatal, []); assert.deepEqual(r.accepted.map((c) => c.path), ['audio/m/sephardi/word/good.mp3', 'audio/m/sephardi/word/scriptword.mp3']); assert.ok(r.warnings.some((w) => /no audio-manifest entry yet/.test(w)));
  const why = Object.fromEntries(r.rejected.map((x) => [path.basename(x.name), x.errors.join(' ')]));
  assert.match(why['loud.wav'], /clipping/); assert.match(why['mute.wav'], /silent/); assert.match(why['missing-id.wav'], /not in the audio manifest nor/); assert.match(why['taken.wav'], /already has a human recording/);
  assert.equal(r.applied, false); assert.equal(fs.readFileSync(path.join(f.rootDir, 'data/audio/manifest-words-sephardi.json'), 'utf8'), before);
  assert.ok(!fs.existsSync(path.join(f.rootDir, 'audio'))); assert.ok(!fs.existsSync(path.join(f.d, 'work')));
  assert.ok(Math.abs(r.accepted[0].peakDb + 6.02) < 0.5, String(r.accepted[0].peakDb));
});
test('ingest refuses everything without complete consent, and rejects unsafe zip paths', { skip: !haveFf }, async () => {
  const f = fixture();
  const z1 = path.join(f.d, 'n.zip'); fs.writeFileSync(z1, f.mk([], null));
  const r1 = await ingest({ input: z1, root: f.rootDir }); assert.equal(r1.accepted.length, 0); assert.match(r1.fatal[0], /consent/);
  const z2 = path.join(f.d, 'p.zip'); fs.writeFileSync(z2, f.mk([], { ...f.consent, required: { ...f.consent.required, grant: false } }));
  assert.equal((await ingest({ input: z2, root: f.rootDir })).accepted.length, 0);
  const z3 = path.join(f.d, 'u.zip'); fs.writeFileSync(z3, L.zipStore([{ name: '../evil.txt', data: 'x' }]));
  await assert.rejects(ingest({ input: z3, root: f.rootDir }), /unsafe path/);
});
test('ingest --apply runs the post chain, marks the manifest recorded, keeps consent out of the repo', { skip: !haveFf, timeout: 60000 }, async () => {
  const f = fixture(); const work = path.join(f.d, 'work');
  const r = await ingest({ input: f.zip, root: f.rootDir, work, apply: true });
  assert.equal(r.applied, true); assert.equal(r.accepted.length, 2); assert.ok(fs.existsSync(path.join(f.rootDir, 'audio/m/sephardi/word/scriptword.mp3')));
  const mp3 = path.join(f.rootDir, 'audio/m/sephardi/word/good.mp3'); assert.ok(fs.existsSync(mp3));
  const { checkMp3 } = await import('../tools/tts/post.mjs'); assert.deepEqual(checkMp3(mp3).problems, []);
  const man = JSON.parse(fs.readFileSync(path.join(f.rootDir, 'data/audio/manifest-words-sephardi.json'), 'utf8'));
  assert.equal(man.find((e) => e.id === 'good').status, 'recorded'); assert.equal(man.find((e) => e.id === 'loud').status, 'missing');
  const meta = JSON.parse(fs.readFileSync(mp3 + '.meta.json', 'utf8')); assert.equal(meta.status, 'recorded'); assert.equal(meta.aiCloneConsent, false);
  assert.ok(!JSON.stringify(meta).includes('Test Reader'));
  const all = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) e.isDirectory() ? walk(path.join(d, e.name)) : all.push(path.join(d, e.name)); })(f.rootDir);
  assert.ok(all.every((p) => !/consent/.test(p))); assert.ok(fs.existsSync(path.join(r.stagedIn, 'consent', 'consent.json')));
});

test('ingest --apply on the REAL manifest flips exactly one entry (the clip recorded) to recorded', { skip: !haveFf, timeout: 60000 }, async () => {
  const d = tmp('rk-real-'); const rootDir = path.join(d, 'repo'); fs.mkdirSync(path.join(rootDir, 'data/audio'), { recursive: true });
  const rels = ['manifest.json', ...L.TRADITIONS.map((t) => `manifest-words-${t}.json`)];
  for (const r of rels) fs.copyFileSync(path.join(root, 'data/audio', r), path.join(rootDir, 'data/audio', r));
  const snap = () => new Map(rels.flatMap((r) => JSON.parse(fs.readFileSync(path.join(rootDir, 'data/audio', r), 'utf8'))).map((e) => [e.path, JSON.stringify(e)]));
  const before = snap();
  const id = L.parseCsv(fs.readFileSync(path.join(root, 'docs/voices/recording-script-sephardi.csv'), 'utf8'))[0].id;
  const w = path.join(d, 'g.wav'); ff(w, 'sine=frequency=220:sample_rate=44100,volume=4');
  const name = `audio/m/sephardi/word/${id}.wav`;
  const consent = { version: 'v', donor_ref: 'abc123', volunteer_name: 'Test Reader', required: { age18: true, grant: true, own_voice: true }, ai_clone_consent: false };
  const zip = path.join(d, 'e.zip');
  fs.writeFileSync(zip, L.zipStore([{ name, data: fs.readFileSync(w) }, { name: 'consent.json', data: JSON.stringify(consent) }]));
  const r = await ingest({ input: zip, root: rootDir, work: path.join(d, 'work'), apply: true });
  assert.equal(r.applied, true); assert.equal(r.accepted.length, 1);
  const after = snap(); const changed = [...after].filter(([p, j]) => before.get(p) !== j);
  assert.deepEqual(changed.map(([p]) => p), [`audio/m/sephardi/word/${id}.mp3`]);
  const e = JSON.parse(changed[0][1]); assert.equal(e.status, 'recorded'); assert.equal(e.source, 'human:record-kit');
  assert.equal(after.size, before.size);
});

// ---- headless browser ----
const requireC = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = requireC(p)); break; } catch { /* try next */ } }
test('headless Chromium with a fake microphone: consent gate, record, resume after reload, zip export', { skip: !chromium, timeout: 90000 }, async () => {
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  try {
    const page = await (await browser.newContext({ acceptDownloads: true, permissions: ['microphone'] })).newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto('file://' + path.join(root, 'tools/record-kit/recorder.html'));
    assert.equal(await page.locator('#b-consent').isDisabled(), true);
    await page.fill('#f-name', 'Test Reader'); for (const k of ['age18', 'grant', 'own_voice']) await page.check('#cb-' + k);
    assert.equal(await page.isChecked('#cb-ai_clone'), false); await page.click('#b-consent');
    await page.setInputFiles('#f-file', path.join(root, 'docs/voices/recording-script-sephardi.csv'));
    await page.waitForSelector('#s-rec:not(.hidden)'); assert.equal(await page.getAttribute('#i-he', 'dir'), 'rtl');
    await page.click('#b-rec'); await page.waitForTimeout(1500); await page.click('#b-rec');
    await page.waitForFunction(() => /1 recorded/.test(document.getElementById('p-text').textContent), null, { timeout: 10000 });
    await page.reload(); await page.waitForSelector('#s-resume:not(.hidden)'); await page.click('#b-resume'); await page.waitForSelector('#s-rec:not(.hidden)');
    assert.match(await page.textContent('#p-text'), /1 recorded/);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#b-export')]);
    const out = path.join(tmp('rk-dl-'), 'x.zip'); await dl.saveAs(out);
    const names = L.zipRead(new Uint8Array(fs.readFileSync(out))).map((f) => f.name);
    assert.deepEqual(names, ['audio/m/sephardi/word/ha3cf2c46.wav', 'manifest.csv', 'consent.json', 'consent.txt']); assert.deepEqual(errs, []);
  } finally { await browser.close(); }
});
