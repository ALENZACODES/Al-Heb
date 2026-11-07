// tools/audio/ingest.mjs: matching rules, checks, dry run writes nothing, --apply status/provenance, no-ffmpeg degradation, budget, delivery audit.
// Fixtures are generated tones, silence and clipped waves (pure Node WAV writer, ffmpeg for mp3/ogg). No speech anywhere.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { run, report, matchFile, buildIndex, nameCandidates, readWav, metrics, judge, deliveryAudit, detectTools, loadListing, OUTSIDE_SOURCE } from '../tools/audio/ingest.mjs';
import { checkMp3 } from '../tools/tts/post.mjs';
import { fileLabel, isSyntheticStatus } from '../src/shell/audio-labels.js';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOLS = detectTools();
const HAVE_FF = TOOLS.ffmpeg && TOOLS.ffprobe;
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `ingest-test-${p}-`));
const rm = (d) => fs.rmSync(d, { recursive: true, force: true });

function wav({ sec = 0.6, hz = 440, amp = 0.5, rate = 22050, channels = 1, list = false, silent = false, lead = 0 }) {
  const n = Math.round(sec * rate); const lead_n = Math.round(lead * rate);
  const data = Buffer.alloc(n * channels * 2);
  for (let i = 0; i < n; i++) for (let c = 0; c < channels; c++) {
    let v = silent || i < lead_n ? 0 : Math.sin((2 * Math.PI * hz * i) / rate) * amp * 32767;
    v = Math.max(-32768, Math.min(32767, Math.round(v))); data.writeInt16LE(v, (i * channels + c) * 2);
  }
  const fmt = Buffer.alloc(16); fmt.writeUInt16LE(1, 0); fmt.writeUInt16LE(channels, 2); fmt.writeUInt32LE(rate, 4); fmt.writeUInt32LE(rate * channels * 2, 8); fmt.writeUInt16LE(channels * 2, 12); fmt.writeUInt16LE(16, 14);
  const chunk = (id, b) => { const h = Buffer.alloc(8); h.write(id, 0, 'latin1'); h.writeUInt32LE(b.length, 4); return Buffer.concat([h, b, b.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]); };
  const info = list ? chunk('LIST', Buffer.concat([Buffer.from('INFO', 'latin1'), chunk('ISFT', Buffer.from('somegen 1.0\0', 'latin1'))])) : Buffer.alloc(0);
  const body = Buffer.concat([Buffer.from('WAVE', 'latin1'), chunk('fmt ', fmt), info, chunk('data', data)]);
  const head = Buffer.alloc(8); head.write('RIFF', 0, 'latin1'); head.writeUInt32LE(body.length, 4);
  return Buffer.concat([head, body]);
}
const entry = (voice, tradition, kind, id, extra = {}) => ({ path: `audio/${voice}/${tradition}/${kind}/${id}.mp3`, voice, tradition, kind, id, text: 'שָׁב', status: 'missing', source: 'none', group: 'lesson-word', ...extra });
function miniManifest() {
  const e = [];
  for (const v of ['m', 'f']) for (const t of ['israeli', 'sephardi', 'ashkenazi']) e.push(entry(v, t, 'word', 'r01-w1'), entry(v, t, 'word', 'r01-w2'), entry(v, t, 'letter', 'alef', { group: 'letter', text: 'אָלֶף' }));
  e.push(entry('m', 'israeli', 'line', 'shema-1', { group: 'prayer-line' }), entry('m', 'israeli', 'prayer', 'shema-1', { group: 'prayer-whole' }));
  e.push(entry('m', 'israeli', 'word', 'r01-w3', { status: 'recorded', source: 'file-present-provenance-unverified' }));
  e.push(entry('f', 'israeli', 'word', 'r01-w3', { status: 'synthetic-reviewed', source: 'tts-hebrew' }));
  return e;
}
/** scratch repo root: mini manifest, a copy of sw.js, empty src/data/audio. */
function scratchRoot(entries = miniManifest()) {
  const root = tmp('root'); fs.mkdirSync(path.join(root, 'data/audio'), { recursive: true }); fs.mkdirSync(path.join(root, 'src'));
  fs.writeFileSync(path.join(root, 'data/audio/manifest.json'), JSON.stringify(entries, null, 1) + '\n');
  fs.writeFileSync(path.join(root, 'data/audio/summary.json'), JSON.stringify({ total: entries.length, recorded: 1, tts: 1 }) + '\n');
  fs.copyFileSync(path.join(REPO, 'sw.js'), path.join(root, 'sw.js'));
  for (const f of ['index.html', 'offline.html', 'manifest.webmanifest']) fs.writeFileSync(path.join(root, f), '<!-- fixture -->');
  return root;
}
const put = (dir, rel, buf) => { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, buf); };

test('matching rules: case, extension, folders, suffixes, numbers; never a guess', () => {
  const idx = buildIndex(miniManifest());
  const M = (rel, o) => matchFile(rel, idx, o);
  assert.equal(M('audio/m/israeli/word/r01-w1.mp3').entry.path, 'audio/m/israeli/word/r01-w1.mp3');
  assert.equal(M('M/Israeli/Word/R01-W1.WAV').entry.path, 'audio/m/israeli/word/r01-w1.mp3', 'case and extension do not matter');
  assert.equal(M('r01-w1_sephardi_f.ogg').entry.path, 'audio/f/sephardi/word/r01-w1.mp3', 'suffixes in any order');
  assert.equal(M('ashkenazi-male-r01-w2.m4a').entry.path, 'audio/m/ashkenazi/word/r01-w2.mp3', 'prefixes');
  assert.equal(M('0007_r01-w2.israeli.female.wav').entry.path, 'audio/f/israeli/word/r01-w2.mp3', 'running number and dotted tokens');
  assert.equal(M('female/sephardi/alef.wav').entry.path, 'audio/f/sephardi/letter/alef.mp3', 'folders set voice and tradition');
  assert.equal(M('x/israeli/m/shema-1_line.wav').entry.path, 'audio/m/israeli/line/shema-1.mp3', 'kind from the name picks line over prayer');
  // ambiguity is reported, never guessed
  const a = M('r01-w1.wav'); assert.equal(a.result, 'ambiguous'); assert.match(a.reason, /voice, tradition/);
  assert.equal(M('shema-1.wav').result, 'ambiguous', 'line vs prayer');
  assert.equal(M('r01-w1.wav', { voice: 'm', tradition: 'israeli' }).entry.path, 'audio/m/israeli/word/r01-w1.mp3', 'CLI defaults fill open dimensions');
  assert.equal(M('israeli/r01-w1_sephardi.wav').result, 'ambiguous', 'folder and name disagree');
  assert.equal(M('nothing-like-an-id.wav').result, 'unmatched');
  assert.equal(M('r01-w9_m.wav').result, 'unmatched');
  assert.equal(M('sephardi/r01-w3_m.wav').result, 'unmatched', 'id exists but not for that tradition');
  assert.ok(nameCandidates('r01-w1_m', idx).some((c) => c.id === 'r01-w1' && c.tags.voice === 'm'));
});

test('WAV reader and metrics: tone, silence, clipping, metadata chunks', () => {
  const t = readWav(wav({ list: true })); assert.equal(t.rate, 22050); assert.equal(t.channels, 1); assert.deepEqual(t.tags, ['LIST/INFO']);
  const m = metrics(t.samples, 1, 22050); assert.ok(m.peakDb > -7 && m.peakDb < -5.5, String(m.peakDb)); assert.equal(m.clipRuns, 0); assert.equal(m.allSilent, false);
  assert.equal(metrics(readWav(wav({ silent: true })).samples, 1, 22050).allSilent, true);
  const c = metrics(readWav(wav({ amp: 1.6 })).samples, 1, 22050); assert.ok(c.clippedPct > 5 && c.clipRuns > 0);
  const l = metrics(readWav(wav({ lead: 0.3, sec: 0.8 })).samples, 1, 22050); assert.ok(Math.abs(l.leadSec - 0.3) < 0.03, String(l.leadSec));
  assert.equal(readWav(Buffer.from('not a wav at all, just text padding padding padding')), null);
  const e = miniManifest()[0];
  assert.match(judge({ analysed: true, duration: 0.1, rate: 22050, channels: 1, lufs: -20, m }, e, '').fails.join(), /too short/);
  assert.match(judge({ analysed: true, duration: 30, rate: 22050, channels: 1, lufs: -20, m }, e, '').fails.join(), /too long/);
  assert.match(judge({ analysed: true, duration: 0.6, rate: 22050, channels: 1, lufs: -20, m: c }, e, '').fails.join(), /clipped/);
  assert.match(judge({ analysed: true, duration: 0.6, rate: 22050, channels: 1, lufs: -20, m }, e, 'שלום').fails.join(), /listing text/);
  assert.deepEqual(judge({ analysed: true, duration: 0.6, rate: 22050, channels: 1, lufs: -20, m }, e, 'שב').fails, [], 'unpointed listing text of the same letters is fine');
});

function batch(dir) {
  put(dir, 'm/israeli/r01-w1.wav', wav({ list: true }));                 // good, carries a tag chunk
  put(dir, 'f_israeli_r01-w1.wav', wav({ hz: 330, sec: 0.7 }));          // good, name tokens
  put(dir, 'sephardi/m/r01-w2.wav', wav({ silent: true }));              // silent
  put(dir, 'ashkenazi/f/r01-w2.wav', wav({ amp: 1.8 }));                 // clipped
  put(dir, 'israeli/m/alef.wav', wav({}));                               // letter: human-only
  put(dir, 'israeli/m/r01-w3.wav', wav({}));                             // recorded: protected
  put(dir, 'israeli/f/r01-w3.wav', wav({}));                             // reviewed: protected
  put(dir, 'r01-w2.wav', wav({}));                                       // ambiguous
  put(dir, 'mystery.wav', wav({}));                                      // unmatched
  put(dir, 'israeli/m/r01-w2.wav', wav({ sec: 0.05 }));                  // too short
  put(dir, 'notes.txt', 'hello'); put(dir, '__MACOSX/._x.wav', 'junk');
}

test('dry run: reports, checks, and writes nothing', async () => {
  const root = scratchRoot(), inp = tmp('in'); batch(inp);
  const before = fs.readFileSync(path.join(root, 'data/audio/manifest.json'), 'utf8');
  try {
    const res = await run({ input: inp, root, tryConvert: 0 });
    const st = (rel) => res.files.find((f) => f.rel === rel)?.state;
    assert.equal(st('m/israeli/r01-w1.wav'), 'ready'); assert.equal(st('f_israeli_r01-w1.wav'), 'ready');
    assert.equal(st('sephardi/m/r01-w2.wav'), 'rejected'); assert.match(res.files.find((f) => f.rel === 'sephardi/m/r01-w2.wav').fails.join(), /silent/);
    assert.equal(st('ashkenazi/f/r01-w2.wav'), 'rejected'); assert.match(res.files.find((f) => f.rel === 'ashkenazi/f/r01-w2.wav').fails.join(), /clipped/);
    assert.equal(st('israeli/m/alef.wav'), 'human-only'); assert.equal(st('israeli/m/r01-w3.wav'), 'protected'); assert.equal(st('israeli/f/r01-w3.wav'), 'protected');
    assert.equal(st('r01-w2.wav'), 'ambiguous'); assert.equal(st('mystery.wav'), 'unmatched'); assert.equal(st('israeli/m/r01-w2.wav'), 'rejected');
    assert.equal(res.ignored['.txt'], 1); assert.ok(!res.files.some((f) => /MACOSX/.test(f.rel)), 'AppleDouble junk skipped');
    assert.ok(res.files.find((f) => f.rel === 'm/israeli/r01-w1.wav').a.tags.length, 'tag chunk noticed (it is stripped on conversion)');
    const text = report(res);
    assert.match(text, /DRY RUN: nothing was written/); assert.match(text, /cannot tell you/); assert.match(text, /correct Hebrew/);
    assert.equal(fs.readFileSync(path.join(root, 'data/audio/manifest.json'), 'utf8'), before, 'manifest untouched');
    assert.ok(!fs.existsSync(path.join(root, 'audio')), 'no audio written');
    assert.equal(res.apply, false);
  } finally { rm(root); rm(inp); }
});

test('apply: converts, strips tags, neutral names, synthetic-unreviewed + provenance, protected entries untouched', { skip: !HAVE_FF && 'ffmpeg/ffprobe not installed' }, async () => {
  const root = scratchRoot(), inp = tmp('in'); batch(inp);
  try {
    const res = await run({ input: inp, root, apply: true, batch: 'fixture batch', now: () => '2026-01-01T00:00:00.000Z' });
    assert.equal(res.errors.length, 0, res.errors.join()); assert.equal(res.applied, 2);
    const m = JSON.parse(fs.readFileSync(path.join(root, 'data/audio/manifest.json'), 'utf8'));
    for (const p of ['audio/m/israeli/word/r01-w1.mp3', 'audio/f/israeli/word/r01-w1.mp3']) {
      const e = m.find((x) => x.path === p); const f = path.join(root, p);
      assert.equal(e.status, 'synthetic-unreviewed'); assert.equal(e.source, OUTSIDE_SOURCE); assert.ok(isSyntheticStatus(e.status)); assert.notEqual(e.status, 'recorded');
      assert.equal(e.synth.origin, OUTSIDE_SOURCE); assert.equal(e.synth.reviewed, false); assert.equal(e.synth.redistributionCleared, false); assert.equal(e.synth.batch, 'fixture batch');
      const probed = checkMp3(f); assert.ok(probed.ok, 'mono 44.1 kHz mp3 with no tags or encoder string: ' + probed.problems.join()); assert.ok(probed.info.bit_rate >= 80000 && probed.info.bit_rate <= 112000, `bitrate ${probed.info.bit_rate}`);
      const side = fs.readFileSync(`${f}.meta.json`, 'utf8'); const sj = JSON.parse(side);
      assert.equal(sj.status, 'synthetic-unreviewed'); assert.equal(sj.reviewed, false); assert.deepEqual(sj.synth, e.synth);
      assert.ok(!/r01-w1\.wav|f_israeli|somegen/.test(side), 'original file names and tags are not copied');
      assert.match(fileLabel(e.status, e.tradition, e.source), /outside generator.*not a recorded teacher.*unreviewed/);
    }
    assert.equal(Object.keys(m.find((x) => x.path === 'audio/m/israeli/word/r01-w1.mp3')).pop(), 'synth', 'synth is the last key, as build_manifest.mjs writes it');
    assert.equal(m.find((x) => x.path === 'audio/m/israeli/word/r01-w3.mp3').status, 'recorded');
    assert.equal(m.find((x) => x.path === 'audio/f/israeli/word/r01-w3.mp3').status, 'synthetic-reviewed');
    assert.equal(m.find((x) => x.path === 'audio/m/israeli/letter/alef.mp3').status, 'missing');
    assert.equal(m.filter((x) => x.status === 'recorded').length, 1, 'no new recorded entry');
    assert.ok(!fs.existsSync(path.join(root, 'audio/m/sephardi/word/r01-w2.mp3')), 'rejected clip not written');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'data/audio/summary.json'), 'utf8')), { total: m.length, recorded: 1, tts: 3 });
    assert.match(report(res), /APPLIED/);
    // second run: entries now hold a synthetic clip, so they are left alone unless --replace
    const again = await run({ input: inp, root, tryConvert: 0 });
    assert.equal(again.files.find((f) => f.rel === 'm/israeli/r01-w1.wav').state, 'exists');
  } finally { rm(root); rm(inp); }
});

test('dry run converts a sample in a scratch folder and measures real size', { skip: !HAVE_FF && 'ffmpeg/ffprobe not installed' }, async () => {
  const root = scratchRoot(), inp = tmp('in'); batch(inp);
  try {
    const res = await run({ input: inp, root, tryConvert: 2 });
    assert.equal(res.convertSample.n, 2); assert.equal(res.convertSample.ok, 2); assert.ok(res.convertSample.measuredBytes > 1000);
    assert.ok(Math.abs(res.convertSample.sample[0].lufs - -16) < 3, 'loudness lands near -16 LUFS: ' + res.convertSample.sample[0].lufs);
    assert.ok(!fs.existsSync(path.join(root, 'audio')));
  } finally { rm(root); rm(inp); }
});

test('mp3, ogg and stereo inputs are analysed and converted when ffmpeg exists', { skip: !HAVE_FF && 'ffmpeg/ffprobe not installed' }, async () => {
  const root = scratchRoot(), inp = tmp('in'), src = tmp('src');
  try {
    put(src, 'a.wav', wav({ sec: 0.8, channels: 2, rate: 44100 }));
    const enc = (out, args) => assert.equal(spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(src, 'a.wav'), ...args, path.join(inp, out)]).status, 0);
    fs.mkdirSync(inp, { recursive: true });
    enc('m_israeli_r01-w1.mp3', ['-metadata', 'title=secret title', '-c:a', 'libmp3lame']);
    enc('m_israeli_r01-w2.ogg', ['-c:a', 'libvorbis']);
    enc('f_israeli_r01-w2.m4a', ['-c:a', 'aac']);
    const res = await run({ input: inp, root, apply: true });
    assert.equal(res.errors.length, 0, res.errors.join()); assert.equal(res.applied, 3, JSON.stringify(res.files.map((f) => [f.rel, f.state, f.fails])));
    const mp3 = res.files.find((f) => f.rel.endsWith('.mp3')); assert.ok(mp3.a.tags.includes('title'), 'input tag seen');
    for (const f of res.files) assert.ok(checkMp3(path.join(root, f.target)).ok);
    assert.ok(!fs.readFileSync(path.join(root, 'audio/m/israeli/word/r01-w1.mp3')).includes('secret title'));
  } finally { rm(root); rm(inp); rm(src); }
});

test('without ffmpeg: wav is analysed in Node, other formats are "unchecked", --apply refuses and writes nothing', async () => {
  const root = scratchRoot(), inp = tmp('in');
  put(inp, 'm_israeli_r01-w1.wav', wav({})); put(inp, 'm_israeli_r01-w2.mp3', Buffer.from('fake mp3 bytes'));
  const before = fs.readFileSync(path.join(root, 'data/audio/manifest.json'), 'utf8');
  try {
    const dry = await run({ input: inp, root, noFfmpeg: true });
    assert.equal(dry.files.find((f) => f.rel.endsWith('.wav')).state, 'ready', 'a wav is fully checked by the built-in reader');
    assert.equal(dry.files.find((f) => f.rel.endsWith('.mp3')).state, 'unchecked');
    assert.match(report(dry), /NOT found/);
    const ap = await run({ input: inp, root, noFfmpeg: true, apply: true });
    assert.match(ap.errors.join(), /needs ffmpeg/); assert.equal(ap.applied, 0);
    assert.equal(fs.readFileSync(path.join(root, 'data/audio/manifest.json'), 'utf8'), before); assert.ok(!fs.existsSync(path.join(root, 'audio')));
  } finally { rm(root); rm(inp); }
});

test('size budget: over budget flags exit code 1 and --apply refuses', async () => {
  const root = scratchRoot(), inp = tmp('in'); put(inp, 'm_israeli_r01-w1.wav', wav({ sec: 1.5 }));
  try {
    const r = await run({ input: inp, root, tryConvert: 0, thresholds: { budgetMb: 0.001 } });
    assert.equal(r.budget.over, true); assert.equal(r.exitCode, 1); assert.match(report(r), /OVER BUDGET/);
    const ap = await run({ input: inp, root, apply: true, thresholds: { budgetMb: 0.001 } });
    assert.match(ap.errors.join(), /budget/); assert.equal(ap.applied, 0); assert.ok(!fs.existsSync(path.join(root, 'audio')));
    const ok = await run({ input: inp, root, tryConvert: 0 }); assert.equal(ok.budget.over, false); assert.ok(ok.budget.newEstimatedBytes > 16000 && ok.budget.newEstimatedBytes < 24000, String(ok.budget.newEstimatedBytes));
  } finally { rm(root); rm(inp); }
});

test('listing file (csv and json) overrides name guessing and flags problems', async () => {
  const root = scratchRoot(), inp = tmp('in'), l = tmp('list');
  put(inp, 'gen_0001.wav', wav({})); put(inp, 'gen_0002.wav', wav({})); put(inp, 'gen_0003.wav', wav({}));
  fs.writeFileSync(path.join(l, 'list.csv'), 'filename,id,voice,tradition,text\ngen_0001.wav,r01-w1,male,Israeli,שָׁב\ngen_0002.wav,r01-w2,f,sephardi,שלום\nghost.wav,r01-w1,m,israeli,\n');
  fs.writeFileSync(path.join(l, 'list.json'), JSON.stringify({ 'gen_0003.wav': { path: 'audio/m/ashkenazi/word/r01-w2.mp3' } }));
  try {
    const csv = loadListing(path.join(l, 'list.csv')); assert.equal(csv.rows[0].voice, 'm'); assert.equal(csv.rows[0].tradition, 'israeli');
    const res = await run({ input: inp, root, listing: path.join(l, 'list.csv'), tryConvert: 0 });
    const g = (n) => res.files.find((f) => f.rel === n);
    assert.equal(g('gen_0001.wav').target, 'audio/m/israeli/word/r01-w1.mp3'); assert.equal(g('gen_0001.wav').state, 'ready');
    assert.equal(g('gen_0002.wav').state, 'rejected'); assert.match(g('gen_0002.wav').fails.join(), /listing text/);
    assert.equal(g('gen_0003.wav').state, 'unmatched', 'not in this listing and no id in the name');
    assert.match(res.listingProblems.join(), /ghost\.wav/);
    const js = await run({ input: inp, root, listing: path.join(l, 'list.json'), tryConvert: 0 });
    assert.equal(js.files.find((f) => f.rel === 'gen_0003.wav').target, 'audio/m/ashkenazi/word/r01-w2.mp3');
  } finally { rm(root); rm(inp); rm(l); }
});

test('two files for one entry are both held back', async () => {
  const root = scratchRoot(), inp = tmp('in'); put(inp, 'a/m_israeli_r01-w1.wav', wav({})); put(inp, 'b/m_israeli_r01-w1.wav', wav({ hz: 500 }));
  try { const res = await run({ input: inp, root, tryConvert: 0 }); assert.deepEqual(res.files.map((f) => f.state), ['duplicate-target', 'duplicate-target']); } finally { rm(root); rm(inp); }
});

test('a .zip input is extracted to scratch and cleaned up', { skip: spawnSync('zip', ['-v']).status !== 0 || spawnSync('unzip', ['-v']).status !== 0 }, async () => {
  const root = scratchRoot(), inp = tmp('in'), z = tmp('zip'); put(inp, 'm_israeli_r01-w1.wav', wav({}));
  try {
    assert.equal(spawnSync('zip', ['-qr', path.join(z, 'b.zip'), '.'], { cwd: inp }).status, 0);
    const res = await run({ input: path.join(z, 'b.zip'), root, tryConvert: 0 }); assert.equal(res.counts.ready, 1);
  } finally { rm(root); rm(inp); rm(z); }
});

test('delivery audit: the real repo keeps clips out of the precache and caches them at runtime only', () => {
  const a = deliveryAudit(REPO); assert.ok(a.ok, JSON.stringify(a.items.filter((i) => !i.ok)));
  assert.ok(a.items.some((i) => /none under audio\//.test(i.text)) && a.items.some((i) => /cached cache-first at runtime/.test(i.text)));
  const root = scratchRoot();
  try {
    fs.writeFileSync(path.join(root, 'precache-manifest.js'), 'self.ALEF_PRECACHE = ["audio/m/israeli/word/x.mp3"];');
    const bad = deliveryAudit(root); assert.equal(bad.ok, false); assert.ok(bad.items.some((i) => !i.ok && /precache-manifest/.test(i.text)));
    fs.writeFileSync(path.join(root, 'sw.js'), 'const AUDIO = /\\.(png)$/i;');
    assert.equal(deliveryAudit(root).ok, false, 'a service worker that does not treat mp3 as runtime audio fails the check');
    // clips under audio/ and even inside data/ never enter computeManifest's list
    fs.mkdirSync(path.join(root, 'audio/m'), { recursive: true }); fs.writeFileSync(path.join(root, 'audio/m/x.mp3'), 'x'); fs.writeFileSync(path.join(root, 'data/audio/y.mp3'), 'x');
    fs.copyFileSync(path.join(REPO, 'sw.js'), path.join(root, 'sw.js')); fs.rmSync(path.join(root, 'precache-manifest.js'));
    assert.ok(deliveryAudit(root).ok);
  } finally { rm(root); }
});

test('command line: exit code, --report and --json files, usage error', { skip: !HAVE_FF && 'ffmpeg/ffprobe not installed' }, () => {
  const root = scratchRoot(), inp = tmp('in'), out = tmp('out'); put(inp, 'm_israeli_r01-w1.wav', wav({}));
  const cli = path.join(REPO, 'tools/audio/ingest.mjs');
  try {
    const r = spawnSync(process.execPath, [cli, inp, '--root', root, '--report', path.join(out, 'r.md'), '--json', path.join(out, 'r.json'), '--try-convert', '0'], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr + r.stdout); assert.match(fs.readFileSync(path.join(out, 'r.md'), 'utf8'), /DRY RUN/);
    assert.equal(JSON.parse(fs.readFileSync(path.join(out, 'r.json'), 'utf8')).files[0].state, 'ready');
    assert.ok(!fs.existsSync(path.join(root, 'audio')));
    assert.equal(spawnSync(process.execPath, [cli], { encoding: 'utf8' }).status, 2);
    assert.equal(spawnSync(process.execPath, [cli, path.join(out, 'nope')], { encoding: 'utf8' }).status, 2);
  } finally { rm(root); rm(inp); rm(out); }
});
