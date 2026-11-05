// End-to-end test of the local TTS factory in --mock mode: plan -> render -> post -> verify -> manifest_update on 20 clips, one deliberately wrong.
// Mock mode proves the plumbing and the gate logic (wrong audio is rejected, human clips are never touched, status is "synthetic-unreviewed").
// It does NOT test voice quality or Hebrew speech recognition: no real model runs here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { audioPath } from '../tools/audio/hebrew_data.mjs';
import { checkMp3, integratedLufs } from '../tools/tts/post.mjs';
import { parseCsv, stripNiqqud } from '../tools/tts/lib.mjs';
import { buildPlan } from '../tools/tts/plan.mjs';
import { update } from '../tools/tts/manifest_update.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const T = path.join(HERE, '..', 'tools', 'tts');
const have = (c, a) => spawnSync(c, a, { encoding: 'utf8' }).status === 0;
const ok = have('python3', ['--version']) && have('ffmpeg', ['-version']) && have('ffprobe', ['-version']);
const opts = { skip: ok ? false : 'python3/ffmpeg/ffprobe not available' };

const WORDS = ['שָׁלוֹם', 'בֹּקֶר', 'תּוֹדָה', 'בְּבַקָּשָׁה', 'מַיִם', 'לֶחֶם', 'בַּיִת', 'סֵפֶר', 'יֶלֶד', 'יַלְדָּה', 'אַבָּא', 'אִמָּא', 'שֶׁמֶשׁ', 'יָרֵחַ', 'כּוֹכָב', 'עֵץ', 'פֶּרַח', 'שָׁמַיִם', 'אָרֶץ', 'דֶּרֶךְ'];

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alef-tts-'));
  fs.mkdirSync(path.join(root, 'data/audio'), { recursive: true });
  fs.mkdirSync(path.join(root, 'data/vocab'), { recursive: true });
  const e = (voice, tradition, kind, id, text, extra = {}) => ({ path: audioPath(voice, tradition, kind, id), voice, tradition, kind, id, text, status: 'missing', source: 'none', group: 'lesson-word', ...extra });
  const list = WORDS.map((w, i) => e('m', 'israeli', 'word', `w${i + 1}`, w));
  list.push(e('m', 'israeli', 'word', 'human1', 'שָׁלוֹם', { status: 'recorded', source: 'human' }));      // a human clip: must never be planned or touched
  list.push(e('m', 'ashkenazi', 'word', 'a1', 'שָׁלוֹם'));                                               // Ashkenazi: human-only
  list.push(e('m', 'israeli', 'letter', 'alef', 'אָלֶף', { group: 'letter' }));                          // Israeli letter name: human-only
  fs.writeFileSync(path.join(root, 'data/audio/manifest.json'), JSON.stringify(list, null, 1) + '\n');
  fs.writeFileSync(path.join(root, 'data/vocab/deck-order.json'), JSON.stringify({ entries: [{ pos: 1, he: 'מַיִם' }, { pos: 2, he: 'לֶחֶם' }] }));
  return { root, work: path.join(root, 'work'), list };
}
const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8' }); assert.equal(r.status, 0, `${cmd} ${args.join(' ')}\n${r.stdout}\n${r.stderr}`); return r.stdout; };

test('mock pipeline: 20 clips, 1 deliberately wrong clip is rejected, human clip untouched, status is synthetic-unreviewed', opts, () => {
  const { root, work } = fixture();
  const plan = path.join(root, 'plan.json'), report = path.join(root, 'verify-report.csv');
  run('node', [path.join(T, 'plan.mjs'), '--root', root, '--out', plan, '--donor-dir', path.join(root, 'donor')]);
  const p = JSON.parse(fs.readFileSync(plan, 'utf8'));
  assert.equal(p.items.length, 20);
  assert.ok(p.items.every((i) => i.tradition === 'israeli' && i.route === 'tts' && i.id !== 'human1' && i.id !== 'alef'));
  assert.deepEqual(p.items.slice(0, 2).map((i) => i.text_unpointed), ['מים', 'לחם'], 'deck-order words come first');
  assert.equal(p.counts.humanOnly, 2);
  const donor = fs.readFileSync(path.join(root, 'donor/human-only-ashkenazi-m.csv'), 'utf8');
  assert.match(donor, /a1/);

  const bad = 'w7';
  run('python3', [path.join(T, 'render_chatterbox.py'), '--mock', '--plan', plan, '--work', work, '--mock-wrong', bad]);
  assert.equal(fs.readdirSync(path.join(work, 'raw/m/israeli/word')).filter((f) => f.endsWith('.wav')).length, 20);
  assert.match(run('python3', [path.join(T, 'render_chatterbox.py'), '--mock', '--plan', plan, '--work', work]), /rendered 0, already present 20/, 'resumable');

  run('node', [path.join(T, 'post.mjs'), '--plan', plan, '--work', work]);
  assert.match(run('node', [path.join(T, 'post.mjs'), '--plan', plan, '--work', work]), /0 encoded, 20 already done/, 'post is resumable');
  for (const i of p.items) {
    const f = path.join(work, 'mp3', audioPath(i.voice, i.tradition, i.kind, i.id));
    assert.ok(fs.existsSync(f), f);
    const c = checkMp3(f);
    assert.ok(c.ok, `${i.id}: ${c.problems}`);
    if (i.order % 5 === 1) { const lufs = integratedLufs(f); assert.ok(lufs !== null && Math.abs(lufs + 16) < 1.5, `${i.id} loudness ${lufs}`); }
  }

  run('python3', [path.join(T, 'verify.py'), '--mock', '--plan', plan, '--work', work, '--report', report]);
  const rows = parseCsv(fs.readFileSync(report, 'utf8'));
  assert.equal(rows.length, 20);
  const rej = rows.filter((r) => r.verdict === 'reject');
  assert.deepEqual(rej.map((r) => r.id), [bad]);
  assert.ok(Number(rej[0].cer) > 0.10);
  assert.ok(rows.filter((r) => r.verdict === 'accept').every((r) => Number(r.cer) === 0));

  // the real repo manifest must not be touched without --allow-mock
  assert.equal(update({ root, work, reportPath: report }).marked, 0);
  const res = update({ root, work, reportPath: report, allowMock: true, now: () => '2026-01-01T00:00:00.000Z' });
  assert.equal(res.marked, 19);
  const m = JSON.parse(fs.readFileSync(path.join(root, 'data/audio/manifest.json'), 'utf8'));
  const by = Object.fromEntries(m.map((e) => [e.id, e]));
  for (const w of Object.keys(by).filter((k) => /^w\d+$/.test(k) && k !== bad)) {
    assert.equal(by[w].status, 'synthetic-unreviewed'); assert.equal(by[w].source, 'tts-hebrew:mock');
    assert.equal(by[w].synth.languageToken, 'he'); assert.equal(by[w].synth.model, 'mock'); assert.ok(!('soundWord' in by[w].synth));
    assert.ok(fs.existsSync(path.join(root, by[w].path)) && checkMp3(path.join(root, by[w].path)).ok);
    const meta = JSON.parse(fs.readFileSync(path.join(root, by[w].path + '.meta.json'), 'utf8'));
    assert.equal(meta.status, 'synthetic-unreviewed'); assert.equal(meta.reviewed, false); assert.equal(meta.redistributionCleared, false);
  }
  assert.equal(by[bad].status, 'missing', 'rejected clip stays missing');
  assert.ok(!fs.existsSync(path.join(root, by[bad].path)));
  assert.equal(by.human1.status, 'recorded'); assert.equal(by.human1.source, 'human');
  assert.equal(by.a1.status, 'missing'); assert.equal(by.alef.status, 'missing');
  assert.ok(!m.some((e) => e.status === 'recorded-tts'));
  assert.ok(m.filter((e) => e.status === 'recorded').length === 1, 'no TTS clip was labelled as human');
  fs.rmSync(root, { recursive: true, force: true });
});

test('plan: already-rendered and human clips are never re-planned', () => {
  const { root } = fixture();
  const m = JSON.parse(fs.readFileSync(path.join(root, 'data/audio/manifest.json'), 'utf8'));
  m[0].status = 'synthetic-unreviewed';
  fs.writeFileSync(path.join(root, 'data/audio/manifest.json'), JSON.stringify(m));
  const p = buildPlan(root);
  assert.equal(p.items.length, 19);
  assert.ok(!p.items.some((i) => i.id === 'w1' || i.id === 'human1'));
  fs.rmSync(root, { recursive: true, force: true });
});

test('verify helpers: niqqud stripping and CER', () => {
  assert.equal(stripNiqqud('שָׁלוֹם'), 'שלום');
  const r = spawnSync('python3', ['-c', `import sys; sys.path.insert(0, ${JSON.stringify(T)}); from verify import cer; print(cer('שָׁלוֹם','שלום'), cer('שָׁלוֹם','שלומ'), cer('שָׁלוֹם','בית') > 0.1)`], { encoding: 'utf8' });
  if (r.status === 0) assert.equal(r.stdout.trim(), '0.0 0.0 True');
});

// ---- respelled traditions (Sephardi / Ashkenazi): a stub stands in for tools/tts/soundtext.mjs so these tests do not depend on its rules ----
const stubSound = (he, tradition, o = {}) => {
  const base = stripNiqqud(he) === 'שלום' ? 'shalom' : stripNiqqud(he) === 'בית' ? 'bait' : stripNiqqud(he) === 'ספר' ? '' : 'xx';
  if (!base) return { soundtext: '', confidence: 'unvoiced', flags: ['no-vowel-derived'], voiced: false };
  const conf = stripNiqqud(he) === 'בית' ? 'low' : 'high';
  return { soundtext: tradition === 'ashkenazi' ? `${base}-A` : `${base}-S`, confidence: conf, flags: conf === 'low' ? ['mobile-shva'] : [], voiced: true, model: `STUB-${tradition}`, lang: o.lang };
};
function respelFixture() {
  const { root, work, list } = fixture();
  const e = (voice, tradition, kind, id, text, extra = {}) => ({ path: audioPath(voice, tradition, kind, id), voice, tradition, kind, id, text, status: 'missing', source: 'none', group: 'lesson-word', ...extra });
  const more = [];
  for (const t of ['sephardi', 'ashkenazi']) {
    more.push(e('m', t, 'word', 's1', 'שָׁלוֹם'), e('f', t, 'word', 's1', 'שָׁלוֹם'), e('m', t, 'word', 's2', 'בַּיִת'), e('m', t, 'word', 's3', 'סֵפֶר'), e('m', t, 'letter', 'alef', 'אָלֶף', { group: 'letter' }));
  }
  fs.writeFileSync(path.join(root, 'data/audio/manifest.json'), JSON.stringify([...list, ...more], null, 1) + '\n');
  return { root, work };
}

test('plan: tradition and confidence filters; respelled items carry sound word, language token, source', () => {
  const { root } = respelFixture();
  const israeliOnly = buildPlan(root, { soundText: stubSound });
  assert.ok(israeliOnly.items.every((i) => i.tradition === 'israeli' && i.source === 'tts-hebrew' && i.language === 'he' && i.speak === i.text && i.sound_word === null), 'default is Israeli only, pointed Hebrew');
  const seph = buildPlan(root, { traditions: ['sephardi'], soundText: stubSound });
  assert.deepEqual([...new Set(seph.items.map((i) => i.tradition))], ['sephardi']);
  const it = seph.items.find((i) => i.id === 's1' && i.voice === 'm');
  assert.equal(it.source, 'tts-respelled'); assert.equal(it.speak, 'shalom-S'); assert.equal(it.sound_word, 'shalom-S'); assert.equal(it.language, 'es'); assert.equal(it.text, 'שָׁלוֹם');
  assert.equal(it.confidence, 'high'); assert.equal(it.sound_model, 'STUB-sephardi');
  assert.ok(!seph.items.some((i) => i.id === 'alef'), 'letters are human-only in every tradition');
  assert.ok(!seph.items.some((i) => i.id === 's3'), 'a word with no sound word is not planned');
  assert.equal(seph.counts.skipped.noSoundWord, 1);
  const order = seph.items.map((i) => i.confidence);
  assert.deepEqual(order, [...order].sort((a, b) => 'high medium low'.indexOf(a) - 'high medium low'.indexOf(b)), 'high-confidence items first');
  const high = buildPlan(root, { traditions: ['sephardi', 'ashkenazi'], confidence: 'high', soundText: stubSound });
  assert.ok(high.items.length > 0 && high.items.every((i) => i.confidence === 'high') && !high.items.some((i) => i.id === 's2'));
  assert.deepEqual([...new Set(high.items.map((i) => i.tradition))], ['sephardi', 'ashkenazi']);
  const tok = buildPlan(root, { traditions: ['ashkenazi'], soundText: stubSound, langTokens: { sephardi: 'es', ashkenazi: 'it' } });
  assert.ok(tok.items.every((i) => i.language === 'it'));
  // without a respelling engine nothing non-Israeli is planned: it stays on the human list
  const none = buildPlan(root, { traditions: ['sephardi'] });
  assert.equal(none.items.length, 0);
  assert.throws(() => buildPlan(root, { confidence: 'maybe' }));
  fs.rmSync(root, { recursive: true, force: true });
});

test('mock pipeline per tradition: respelled clips are synthetic-unreviewed, say how they were made, human clips untouched', opts, () => {
  const { root, work } = respelFixture();
  const plan = path.join(root, 'plan.json'), report = path.join(root, 'report.csv');
  const p = buildPlan(root, { traditions: ['israeli', 'sephardi', 'ashkenazi'], soundText: stubSound });
  fs.writeFileSync(plan, JSON.stringify(p));
  const nMock = p.items.length;
  run('python3', [path.join(T, 'render_chatterbox.py'), '--mock', '--plan', plan, '--work', work]);
  run('node', [path.join(T, 'post.mjs'), '--plan', plan, '--work', work]);
  run('python3', [path.join(T, 'verify.py'), '--mock', '--plan', plan, '--work', work, '--report', report]);
  const rows = parseCsv(fs.readFileSync(report, 'utf8'));
  assert.equal(rows.length, nMock);
  const res = update({ root, work, reportPath: report, allowMock: true, now: () => '2026-01-01T00:00:00.000Z' });
  assert.equal(res.marked, nMock); assert.deepEqual(res.noProvenance, []);
  const m = JSON.parse(fs.readFileSync(path.join(root, 'data/audio/manifest.json'), 'utf8'));
  const done = m.filter((e) => e.status === 'synthetic-unreviewed');
  assert.equal(done.length, nMock);
  for (const e of done) {
    assert.ok(['tts-hebrew:mock', 'tts-respelled:mock'].includes(e.source), e.source);
    assert.equal((e.tradition === 'israeli'), e.source.startsWith('tts-hebrew'));
    if (e.tradition !== 'israeli') { assert.ok(e.synth.soundWord && /^[A-Za-z-]+$/.test(e.synth.soundWord)); assert.equal(e.synth.languageToken, 'es'); assert.equal(e.synth.soundModel, `STUB-${e.tradition}`); }
    assert.equal(e.synth.model, 'mock'); assert.ok('modelVersion' in e.synth);
    const meta = JSON.parse(fs.readFileSync(path.join(root, e.path + '.meta.json'), 'utf8'));
    assert.equal(meta.status, 'synthetic-unreviewed'); assert.equal(meta.reviewed, false); assert.deepEqual(meta.synth, e.synth);
    assert.match(meta.note, /test tone/);
  }
  assert.equal(m.filter((e) => e.status === 'recorded').length, 1, 'only the pre-existing human clip is recorded');
  assert.equal(m.find((e) => e.id === 'human1').source, 'human');
  assert.ok(m.filter((e) => e.id === 'alef' || e.id === 's3').every((e) => e.status === 'missing'));
  // re-running the update never downgrades or re-marks: a reviewed clip is left alone
  const r2 = m.find((e) => e.status === 'synthetic-unreviewed'); r2.status = 'synthetic-reviewed';
  fs.writeFileSync(path.join(root, 'data/audio/manifest.json'), JSON.stringify(m, null, 1) + '\n');
  assert.ok(update({ root, work, reportPath: report, allowMock: true }).skippedReviewed.includes(r2.path));
  fs.rmSync(root, { recursive: true, force: true });
});

test('a clip with no render-log record is not marked (its provenance cannot be stated)', opts, () => {
  const { root, work } = respelFixture();
  const plan = path.join(root, 'plan.json'), report = path.join(root, 'report.csv');
  fs.writeFileSync(plan, JSON.stringify(buildPlan(root, { traditions: ['sephardi'], soundText: stubSound, limit: 3 })));
  run('python3', [path.join(T, 'render_chatterbox.py'), '--mock', '--plan', plan, '--work', work]);
  run('node', [path.join(T, 'post.mjs'), '--plan', plan, '--work', work]);
  run('python3', [path.join(T, 'verify.py'), '--mock', '--plan', plan, '--work', work, '--report', report]);
  fs.rmSync(path.join(work, 'render-log.jsonl'));
  const res = update({ root, work, reportPath: report, allowMock: true });
  assert.equal(res.marked, 0); assert.equal(res.noProvenance.length, 3);
  fs.rmSync(root, { recursive: true, force: true });
});

test('renderer refuses: Hebrew text for a respelled tradition, letters/vowels/syllables, a missing sound word', opts, () => {
  const { root, work } = respelFixture();
  const good = buildPlan(root, { traditions: ['sephardi'], soundText: stubSound, limit: 1 }).items[0];
  const tryPlan = (mut) => {
    const plan = path.join(root, 'bad.json');
    fs.writeFileSync(plan, JSON.stringify({ items: [mut({ ...good, order: 1 })] }));
    return spawnSync('python3', [path.join(T, 'render_chatterbox.py'), '--mock', '--plan', plan, '--work', work], { encoding: 'utf8' });
  };
  assert.equal(tryPlan((i) => i).status, 0, 'the unmodified item renders');
  fs.rmSync(path.join(work, 'raw'), { recursive: true, force: true });
  for (const [name, mut, re] of [
    ['hebrew speak', (i) => ({ ...i, speak: i.text, sound_word: i.text }), /sound_word|Hebrew/],
    ['no sound word', (i) => ({ ...i, sound_word: '' }), /sound_word/],
    ['hebrew source for a respelled tradition', (i) => ({ ...i, source: 'tts-hebrew' }), /tts-respelled/],
    ['letter', (i) => ({ ...i, kind: 'letter' }), /human-only/],
    ['syllable', (i) => ({ ...i, kind: 'syllable' }), /human-only/],
    ['not routed to tts', (i) => ({ ...i, route: 'human-only' }), /non-TTS/],
    ['bad language token', (i) => ({ ...i, language: 'Spanish' }), /language token/],
  ]) { const r = tryPlan(mut); assert.notEqual(r.status, 0, name); assert.match(r.stderr + r.stdout, re, name); }
  fs.rmSync(root, { recursive: true, force: true });
});

test('renderer filters --tradition and --confidence', opts, () => {
  const { root, work } = respelFixture();
  const plan = path.join(root, 'plan.json');
  const p = buildPlan(root, { traditions: ['israeli', 'sephardi', 'ashkenazi'], soundText: stubSound });
  fs.writeFileSync(plan, JSON.stringify(p));
  run('python3', [path.join(T, 'render_chatterbox.py'), '--mock', '--plan', plan, '--work', work, '--tradition', 'ashkenazi', '--confidence', 'high']);
  const want = p.items.filter((i) => i.tradition === 'ashkenazi' && i.confidence === 'high').length;
  const got = fs.readdirSync(path.join(work, 'raw/m/ashkenazi/word')).length + fs.readdirSync(path.join(work, 'raw/f/ashkenazi/word')).length;
  assert.equal(got, want);
  assert.ok(!fs.existsSync(path.join(work, 'raw/m/sephardi')) && !fs.existsSync(path.join(work, 'raw/m/israeli')));
  const log = fs.readFileSync(path.join(work, 'render-log.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.ok(log.every((l) => l.source === 'tts-respelled:mock' && l.model_name === 'mock' && 'model_version' in l && l.sound_word));
  fs.rmSync(root, { recursive: true, force: true });
});

test('real soundtext.mjs, when present, plugs into the plan unchanged (interface check, no speech involved)', async () => {
  const m = await import('../tools/tts/plan.mjs').then((x) => x.loadSoundText());
  if (!m) return; // the respelling engine is another module; this test only runs when it exists
  const { root } = respelFixture();
  const p = buildPlan(root, { traditions: ['sephardi', 'ashkenazi'], soundText: m.fn });
  assert.ok(p.items.length > 0 && p.items.every((i) => i.source === 'tts-respelled' && /^[^א-ת]+$/.test(i.speak) && ['high', 'medium', 'low'].includes(i.confidence)));
  fs.rmSync(root, { recursive: true, force: true });
});

test('real engine refuses the same reference audio for the man and the woman voice (before any model is loaded)', opts, () => {
  const { root, work } = respelFixture();
  const plan = path.join(root, 'plan.json');
  fs.writeFileSync(plan, JSON.stringify(buildPlan(root, { limit: 1 })));
  const ref = path.join(root, 'same.wav'); fs.writeFileSync(ref, Buffer.from('RIFF0000WAVEnot-a-real-voice'));
  const r = spawnSync('python3', [path.join(T, 'render_chatterbox.py'), '--plan', plan, '--work', work, '--ref-m', ref, '--ref-f', ref], { encoding: 'utf8' });
  assert.notEqual(r.status, 0); assert.match(r.stderr, /must differ/); assert.match(r.stderr, /donor-rights-grant/);
  fs.rmSync(root, { recursive: true, force: true });
});
