// Outside-voice pipeline (tools/tts/voice_*.mjs): plan, voice list, render, clip, three judges, hand-off. NO real service is ever called and no key exists:
// the render and recognition code is exercised against a local stand-in HTTP server (recorded-shape replies) and against --mock tones.
// Mock tones prove the plumbing and the judge logic only. They say nothing about any real voice, accent or respelling.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildVoicePlan, formatEstimate, WARNINGS } from '../tools/tts/voice_plan.mjs';
import { describeVoice, fetchVoices } from '../tools/tts/voice_list.mjs';
import { renderItems, selectItems } from '../tools/tts/voice_render.mjs';
import { clipAll } from '../tools/tts/voice_clip.mjs';
import { runJudges, judgeJ1, J1, makeRecogniser, loadVerdicts, bandProfile, pearson } from '../tools/tts/voice_judge.mjs';
import { buildHandoff, COLS, COLS14 } from '../tools/tts/voice_handoff.mjs';
import { checkMp3 } from '../tools/tts/post.mjs';
import { loadVoiceConfig, normHebrew, similarity, skeleton, wavFromPcm, readWav, workPaths, scrub, serviceBase, readJsonl, writeAtomic, haveFfmpeg, mockWav, sha256 } from '../tools/tts/voice_lib.mjs';
import { SERVICE } from '../tools/tts/voice_service.config.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FF = haveFfmpeg();
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), `voice-test-${p}-`));
const rm = (d) => fs.rmSync(d, { recursive: true, force: true });
const KEY = 'test-key-9f3a1c77d2e84b60'; // a made-up string for the stand-in server; not a real key
const VENDOR = new RegExp(['eleven', 'labs'].join('\\s*'), 'i');
const walk = (d, out = []) => { for (const n of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, n.name); n.isDirectory() ? walk(p, out) : out.push(p); } return out; };
const cfgMock = () => loadVoiceConfig(path.join(REPO, 'tools', 'tts', 'voices.config.json'));
const cfgReal = (over = {}) => { const c = cfgMock(); c.voices.m.voiceId = 'VOICE_M_TEST'; c.voices.f.voiceId = 'VOICE_F_TEST'; return { ...c, ...over }; };
const ffTest = FF ? test : test.skip;

async function mockWork(words = 3, { take2 = true } = {}) {
  const work = tmp('work'); const plan = await buildVoicePlan(REPO, { words });
  await renderItems(plan.items, { work, take: 1, cfg: cfgMock(), mock: true });
  if (take2) await renderItems(plan.items, { work, take: 2, cfg: cfgMock(), mock: true });
  return { work, plan };
}

// ---------- one place names the service; no key; no vendor name elsewhere ----------
test('the service address, key variable and header live in ONE config file; no vendor name in other tracked voice files; no key anywhere', () => {
  const files = ['tools/tts/voice_plan.mjs', 'tools/tts/voice_list.mjs', 'tools/tts/voice_render.mjs', 'tools/tts/voice_clip.mjs', 'tools/tts/voice_judge.mjs', 'tools/tts/voice_handoff.mjs', 'tools/tts/voice_lib.mjs',
    'tools/tts/voices.config.json', 'docs/tts/VOICE-SERVICE-RUNBOOK.md', 'tests/tts.voice.test.js', 'tests/fixtures/voice/voices.list.shape.json'];
  for (const f of files) {
    const t = fs.readFileSync(path.join(REPO, f), 'utf8');
    assert.ok(!VENDOR.test(t), `${f} names the vendor`);
    assert.ok(!new RegExp(['xi', 'api', 'key'].join('-'), 'i').test(t), `${f} holds the header name`);
    assert.ok(!/https?:\/\/api\./i.test(t), `${f} holds an API address`);
    if (f.startsWith('tools/')) assert.ok(!t.includes(SERVICE.keyEnv), `${f} holds the key variable name (it belongs in voice_service.config.mjs only)`);
  }
  assert.match(fs.readFileSync(path.join(REPO, 'tools/tts/voice_service.config.mjs'), 'utf8'), /keyEnv/);
  const cfg = fs.readFileSync(path.join(REPO, 'tools/tts/voices.config.json'), 'utf8');
  assert.match(cfg, /PASTE_MAN_VOICE_ID_HERE/); assert.match(cfg, /PASTE_WOMAN_VOICE_ID_HERE/);
});

test('serviceBase accepts https or loopback http only (the key is sent there)', () => {
  assert.equal(serviceBase({}), SERVICE.baseUrl);
  assert.equal(serviceBase({ [SERVICE.baseUrlOverrideEnv]: 'http://127.0.0.1:9/' }), 'http://127.0.0.1:9');
  assert.throws(() => serviceBase({ [SERVICE.baseUrlOverrideEnv]: 'http://evil.example.com' }), /https/);
  assert.equal(scrub(`oops ${KEY} oops`, { [SERVICE.keyEnv]: KEY }), 'oops [key removed] oops');
});

// ---------- plan ----------
test('plan: both traditions x m,f for N words, priority order first, respelling (not Hebrew) is the text, human-only kinds refused', async () => {
  const plan = await buildVoicePlan(REPO, { words: 20 });
  assert.equal(plan.counts.words, 20); assert.equal(plan.counts.clips, 80);
  const first = plan.items.slice(0, 4).map((i) => `${i.tradition}/${i.voice}`);
  assert.deepEqual(first, ['sephardi/m', 'sephardi/f', 'ashkenazi/m', 'ashkenazi/f']);
  assert.equal(plan.items[0].id, 'r01-w1', 'highest priority rank first');
  for (const it of plan.items) {
    assert.ok(!/[֐-׿]/.test(it.speak), 'the text sent is the respelling, never Hebrew');
    assert.ok(/[֐-׿]/.test(it.he), 'the pointed Hebrew is carried alongside');
    assert.equal(it.path, `audio/${it.voice}/${it.tradition}/${it.kind}/${it.id}.mp3`);
    assert.equal(it.kind, 'word');
  }
  const sw = JSON.parse(fs.readFileSync(path.join(REPO, 'data/tts/soundwords.sephardi.json'), 'utf8')).items.find((x) => x.id === 'r01-w1');
  assert.equal(plan.items[0].speak, sw.soundtext.normalize('NFC'), 'respelling carried unchanged from repo data');
  const sum = plan.items.reduce((a, b) => a + b.chars, 0); assert.equal(plan.characters.take1Total, sum); assert.equal(plan.characters.withTake2, sum * 2);
  assert.equal(Object.keys(plan.characters.byTraditionVoice).length, 4);
  await assert.rejects(buildVoicePlan(REPO, { kinds: ['letter'] }), /human-only/);
  await assert.rejects(buildVoicePlan(REPO, { traditions: ['israeli'] }), /Israeli voices are made elsewhere/);
  await assert.rejects(buildVoicePlan(REPO, { slots: ['x'] }), /m or f/);
});

test('plan: --max-clips, --batch-size, --resume; the estimate comes before any call and states no price', async () => {
  const p = await buildVoicePlan(REPO, { maxClips: 10, batchSize: 4 });
  assert.equal(p.counts.clips, 10); assert.deepEqual([...new Set(p.items.map((i) => i.batch))], [1, 2, 3]); assert.equal(p.items[9].batch, 3);
  const { work } = await mockWork(2, { take2: false });
  const r = await buildVoicePlan(REPO, { words: 4, resumeWork: work });
  assert.ok(!r.items.some((i) => ['r01-w1', 'r03-w1'].includes(i.id) && i.tradition === 'sephardi' && i.voice === 'm'), 'already rendered items are left out on resume');
  assert.ok(r.counts.skipped.alreadyRendered > 0);
  const text = formatEstimate(p);
  assert.match(text, /CHARACTER BUDGET/); assert.match(text, /sephardi\/m/); assert.match(text, /ashkenazi\/f/); assert.match(text, /check your plan/i);
  assert.match(text, /commercial-use/i); assert.match(text, /licence not cleared/i);
  assert.ok(!/[$€£]|\bUSD\b|\bper 1,?000\b|\bcosts? about\b/i.test(text), 'no price is stated as a fact');
  assert.ok(WARNINGS.some((w) => /shared voice library/.test(w)) && WARNINGS.some((w) => /Plan limits/.test(w)));
  rm(work);
});

// ---------- voice list ----------
test('voice list: fields useful for picking; never chooses; paginates; key from the environment only', async () => {
  const fx = JSON.parse(fs.readFileSync(path.join(REPO, 'tests/fixtures/voice/voices.list.shape.json'), 'utf8'));
  const rows = fx.voices.map(describeVoice);
  assert.equal(rows[0].name, 'Example Voice A'); assert.match(rows[0].labels, /gender=male/); assert.equal(rows[1].shared_library_voice, true); assert.equal(rows[2].preview_url, '');
  const seen = []; let n = 0;
  const server = http.createServer((req, res) => { seen.push({ url: req.url, key: req.headers[SERVICE.keyHeader] }); n++; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(n === 1 ? { ...fx, voices: fx.voices.slice(0, 2), has_more: true, next_page_token: 'tok' } : { ...fx, voices: fx.voices.slice(2), has_more: false })); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  try {
    const env = { [SERVICE.keyEnv]: KEY, [SERVICE.baseUrlOverrideEnv]: `http://127.0.0.1:${server.address().port}` };
    const v = await fetchVoices({ env }); assert.equal(v.length, 3); assert.equal(seen.length, 2); assert.match(seen[1].url, /next_page_token=tok/); assert.equal(seen[0].key, KEY);
    await assert.rejects(fetchVoices({ env: {} }), /set the key first/);
  } finally { server.close(); }
});

// ---------- render against a stand-in server ----------
function stub(handler) {
  const calls = []; const server = http.createServer((req, res) => {
    const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8'); const call = { url: req.url, headers: req.headers, body: body.startsWith('{') ? JSON.parse(body) : body, n: calls.length + 1, t: Date.now() }; calls.push(call); handler(call, res);
    });
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, calls, env: { [SERVICE.keyEnv]: KEY, [SERVICE.baseUrlOverrideEnv]: `http://127.0.0.1:${server.address().port}` } })));
}
const pcmReply = (res, ms = 400) => { const n = 24 * ms; const b = Buffer.alloc(n * 2); for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.sin(i / 8) * 9000), i * 2); res.writeHead(200, { 'content-type': 'audio/pcm', 'request-id': `req-${Math.random().toString(16).slice(2, 8)}` }); res.end(b); };

test('render: fixed settings, respelled text, voice id per slot, retries 429 (Retry-After) and 5xx with backoff, atomic files, log has provenance and no key', async () => {
  const plan = await buildVoicePlan(REPO, { words: 2, traditions: ['sephardi'] }); // 4 items
  const s = await stub((c, res) => { if (c.n === 1) { res.writeHead(429, { 'retry-after': '1' }); res.end('{"detail":"rate"}'); } else if (c.n === 2) { res.writeHead(503); res.end('busy'); } else pcmReply(res); });
  const work = tmp('render');
  try {
    const t0 = Date.now();
    const r = await renderItems(plan.items, { work, take: 1, cfg: cfgReal(), env: s.env, rate: 600, backoffMs: 20 });
    assert.equal(r.rendered, 4); assert.equal(r.failed, 0);
    assert.ok(Date.now() - t0 >= 900, 'Retry-After of 1 s was honoured');
    const first = s.calls.find((c) => c.n === 3); // first successful request
    assert.equal(first.headers[SERVICE.keyHeader], KEY);
    assert.match(first.url, /^\/v1\/text-to-speech\/VOICE_M_TEST\?output_format=pcm_24000$/);
    assert.equal(first.body.text, plan.items[0].speak); assert.equal(first.body.model_id, 'eleven_multilingual_v2'); assert.equal(first.body.seed, 20261105);
    assert.deepEqual(Object.keys(first.body.voice_settings).sort(), ['similarity_boost', 'speed', 'stability', 'style', 'use_speaker_boost']);
    assert.ok(!('language_code' in first.body), 'no language code is sent by default (not supported for this model)');
    assert.equal(s.calls[3].url.includes('VOICE_F_TEST'), true, 'woman slot uses its own voice id');
    const sig = (c) => JSON.stringify({ ...c.body, text: 0 }); assert.equal(sig(s.calls[2]), sig(s.calls[3]), 'same settings and seed on every call of a take');
    const log = readJsonl(workPaths(work).log); const rec = log.filter((l) => l.event === 'rendered');
    assert.equal(rec.length, 4); assert.equal(log.filter((l) => l.event === 'retry').length, 2);
    for (const x of rec) {
      assert.equal(x.status, 'synthetic-unreviewed'); assert.equal(x.licence, 'licence not cleared'); assert.ok(/[֐-׿]/.test(x.he)); assert.ok(!/[֐-׿]/.test(x.text_sent));
      assert.equal(x.voice_id, x.voice === 'm' ? 'VOICE_M_TEST' : 'VOICE_F_TEST'); assert.equal(x.seed, 20261105); assert.ok(x.request_id); assert.equal(x.sample_rate, 24000);
      assert.ok(fs.existsSync(workPaths(work).raw(1, x))); assert.equal(sha256(fs.readFileSync(workPaths(work).raw(1, x))), x.audio_sha256);
    }
    assert.ok(walk(work).every((f) => !f.endsWith('.part')), 'no half-written files');
    for (const f of walk(work)) assert.ok(!fs.readFileSync(f).includes(KEY), `the key is in ${f}`);
    // take 2: only the seed differs
    s.calls.length = 0; await renderItems(plan.items.slice(0, 1), { work, take: 2, cfg: cfgReal(), env: s.env, rate: 600 });
    assert.equal(s.calls[0].body.seed, 7740123); assert.deepEqual(s.calls[0].body.voice_settings, first.body.voice_settings);
  } finally { s.server.close(); rm(work); }
});

test('render: 401 stops the whole run; a 422 fails one item and goes on; errors never contain the key; safe stop then resume', async () => {
  const plan = await buildVoicePlan(REPO, { words: 3, traditions: ['sephardi'], slots: ['m'] }); // 3 items
  let s = await stub((c, res) => { res.writeHead(401, { 'content-type': 'application/json' }); res.end(JSON.stringify({ detail: { status: 'quota_exceeded', message: `key ${KEY} out of quota` } })); });
  let work = tmp('fatal');
  try {
    const r = await renderItems(plan.items, { work, take: 1, cfg: cfgReal(), env: s.env, rate: 600, backoffMs: 5 });
    assert.equal(r.rendered, 0); assert.equal(s.calls.length, 1, 'stopped after the first fatal reply'); assert.match(r.stopReason, /key, quota, plan or voice-id problem/);
    for (const f of walk(work)) assert.ok(!fs.readFileSync(f).includes(KEY));
  } finally { s.server.close(); rm(work); }
  let hits = 0; s = await stub((c, res) => { if (++hits === 1) { res.writeHead(422); res.end('{"detail":"bad"}'); } else pcmReply(res); }); work = tmp('item');
  try {
    const r = await renderItems(plan.items, { work, take: 1, cfg: cfgReal(), env: s.env, rate: 600, backoffMs: 5 });
    assert.equal(r.failed, 1); assert.equal(r.rendered, 2); assert.equal(s.calls.length, 3);
    // safe stop: stop after the first item, then resume renders only what is left
    const work2 = tmp('stop'); let seen = 0; s.calls.length = 0;
    const r2 = await renderItems(plan.items, { work: work2, take: 1, cfg: cfgReal(), env: s.env, rate: 600, shouldStop: () => seen++ >= 1 });
    assert.equal(r2.rendered, 1); assert.equal(r2.stopped, true);
    const left = selectItems(plan, work2, { take: 1 }); assert.equal(left.alreadyDone, 1); assert.equal(left.items.length, 2);
    const r3 = await renderItems(left.items, { work: work2, take: 1, cfg: cfgReal(), env: s.env, rate: 600 });
    assert.equal(r3.rendered, 2); assert.equal(selectItems(plan, work2, { take: 1 }).items.length, 0);
    assert.equal(readJsonl(workPaths(work2).log).filter((l) => l.event === 'rendered').length, 3, 'no clip rendered twice');
    // a file changed on disk since it was logged is not trusted: it is rendered again
    const first = plan.items[0]; fs.appendFileSync(workPaths(work2).raw(1, first), 'x'); assert.equal(selectItems(plan, work2, { take: 1 }).items.length, 1);
    rm(work2);
  } finally { s.server.close(); rm(work); }
});

test('render: a character cap stops the run; an unreachable server gives up after the stated attempts; the CLI refuses placeholders and needs --yes', async () => {
  const plan = await buildVoicePlan(REPO, { words: 3, traditions: ['sephardi'], slots: ['m'] });
  const work = tmp('cap');
  const r = await renderItems(plan.items, { work, take: 1, cfg: cfgMock(), mock: true, maxChars: plan.items[0].chars + 1 });
  assert.equal(r.rendered, 1); assert.match(r.stopReason, /character cap/); rm(work);
  const s = await stub((c, res) => { res.writeHead(500); res.end('no'); }); const w2 = tmp('giveup');
  try {
    const r2 = await renderItems(plan.items.slice(0, 1), { work: w2, take: 1, cfg: cfgReal(), env: s.env, rate: 6000, backoffMs: 2, maxAttempts: 3 });
    assert.equal(r2.failed, 1); assert.equal(s.calls.length, 3); assert.match(readJsonl(workPaths(w2).log).find((l) => l.event === 'item-error').error, /gave up after 3 attempts/);
  } finally { s.server.close(); rm(w2); }
  const planFile = path.join(tmp('cli'), 'plan.json'); fs.writeFileSync(planFile, JSON.stringify(plan));
  const run = (args, env = {}) => spawnSync(process.execPath, [path.join(REPO, 'tools/tts/voice_render.mjs'), '--plan', planFile, '--work', tmp('cliwork'), ...args], { encoding: 'utf8', env: { ...process.env, [SERVICE.keyEnv]: '', ...env } });
  assert.match(run(['--yes']).stderr, /set the key first/);
  assert.match(run(['--yes'], { [SERVICE.keyEnv]: KEY }).stderr, /placeholder/);
  const dry = run(['--dry-run']); assert.match(dry.stdout, /characters will be sent/); assert.match(dry.stdout, /nothing was sent/);
  const noYes = run([], { [SERVICE.keyEnv]: KEY }); assert.ok(noYes.status !== 0);
  assert.ok(!noYes.stdout.includes(KEY) && !noYes.stderr.includes(KEY));
});

// ---------- WAV and text helpers ----------
test('wav wrapper round-trips; Hebrew comparison ignores niqqud, punctuation, spaces and final forms', () => {
  const pcm = Buffer.alloc(200); const w = readWav(wavFromPcm(pcm, 24000)); assert.equal(w.rate, 24000); assert.equal(w.samples.length, 100);
  assert.equal(normHebrew('שָׁלוֹם!'), normHebrew('שלומ')); assert.equal(normHebrew('מֶלֶךְ'), 'מלכ'); assert.equal(similarity('שָׁלוֹם', 'שלום'), 1);
  assert.equal(similarity('שלום', ''), 0); assert.ok(similarity('שלום', 'שלוט') < 1 && similarity('שלום', 'שלוט') >= 0.7); assert.ok(similarity('שלום', 'ארץ') < 0.5);
  assert.equal(skeleton('שלום'), 'שלמ');
});

// ---------- clip ----------
ffTest('clip: mono 44.1 kHz mp3, no metadata, neutral names that are the manifest paths, only logged renders', async () => {
  const { work, plan } = await mockWork(2, { take2: false });
  try {
    const r = await clipAll({ work, take: 1, jobs: 2, log: () => {} });
    assert.equal(r.clipped, 8); assert.equal(r.failed, 0);
    for (const it of plan.items) {
      const f = workPaths(work).clip(1, it); assert.ok(f.endsWith(it.path.replace('audio/', `audio${path.sep}`).split('/').join(path.sep)) || f.endsWith(it.path), f);
      const c = checkMp3(f); assert.ok(c.ok, c.problems.join()); const buf = fs.readFileSync(f); assert.ok(!buf.includes('Lavf') && !buf.includes('LAME') && buf.slice(0, 3).toString('latin1') !== 'ID3');
    }
    assert.equal((await clipAll({ work, take: 1, log: () => {} })).skipped, 8, 'resumable');
    // a raw file changed after logging is refused, not clipped
    const it = plan.items[0]; fs.appendFileSync(workPaths(work).raw(1, it), 'zz'); const r2 = await clipAll({ work, take: 1, force: true, log: () => {} }); assert.equal(r2.missingRaw, 1);
  } finally { rm(work); }
});

// ---------- judges ----------
ffTest('J1: passes a clean clip; fails a cut-off tail, clipping, silence, wrong length; each verdict carries measured values', async () => {
  const work = tmp('j1'); const plan = await buildVoicePlan(REPO, { words: 4, traditions: ['sephardi'], slots: ['m'] });
  try {
    await renderItems(plan.items, { work, take: 1, cfg: cfgMock(), mock: true, mockTruncate: (it) => it.id === plan.items[1].id });
    // item 2: loud, hard-clipped samples; item 3: silence
    const P = workPaths(work); const recs = readJsonl(P.log).filter((l) => l.event === 'rendered');
    const clipWav = Buffer.alloc(24000 * 2); for (let i = 0; i < 24000; i++) clipWav.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(Math.sin(i / 7) * 90000))), i * 2); writeAtomic(P.raw(1, recs[2]), wavFromPcm(clipWav, 24000));
    writeAtomic(P.raw(1, recs[3]), wavFromPcm(Buffer.alloc(24000 * 2), 24000));
    for (const r of recs) { const l = readJsonl(P.log); const x = l.find((q) => q.id === r.id && q.event === 'rendered'); x.audio_sha256 = sha256(fs.readFileSync(P.raw(1, r))); fs.appendFileSync(P.log, JSON.stringify(x) + '\n'); }
    await clipAll({ work, take: 1, log: () => {}, force: true });
    const v = recs.map((r) => judgeJ1(readJsonl(P.log).filter((l) => l.event === 'rendered' && l.id === r.id).pop(), { work }));
    assert.equal(v[0].verdict, 'pass', v[0].reasons.join()); assert.ok(v[0].measured.lufs !== undefined && v[0].measured.silence_ratio !== undefined && v[0].measured.tail_below_peak_db >= 30 && v[0].measured.sample_rate === 44100);
    assert.equal(v[1].verdict, 'fail'); assert.match(v[1].reasons.join(), /cut off|end/);
    assert.equal(v[2].verdict, 'fail'); assert.match(v[2].reasons.join(), /full scale/);
    assert.equal(v[3].verdict, 'fail'); assert.match(v[3].reasons.join(), /clip file missing|silent|too short|silence/);
    assert.ok(v[0].thresholds.maxSilenceRatio > 0);
    const wrong = judgeJ1({ ...readJsonl(P.log).filter((l) => l.event === 'rendered')[0], text_sent: 'a'.repeat(60) }, { work }); assert.equal(wrong.verdict, 'fail'); assert.match(wrong.reasons.join(), /too short for 60 letters/);
    const longish = judgeJ1({ ...readJsonl(P.log).filter((l) => l.event === 'rendered')[0], text_sent: 'a' }, { work, th: { ...J1, maxSecBase: 0.1, maxSecPerLetter: 0.1 } }); assert.match(longish.reasons.join(), /too long/);
  } finally { rm(work); }
});

ffTest('J2: the recogniser transcript is compared with the expected Hebrew; wrong audio fails; a local command can be the recogniser', async () => {
  const { work, plan } = await mockWork(3, { take2: false });
  try {
    await clipAll({ work, take: 1, log: () => {} });
    const recs = readJsonl(workPaths(work).log).filter((l) => l.event === 'rendered');
    const rec = makeRecogniser({ cfg: cfgMock(), mode: 'mock', items: recs });
    let out = await runJudges({ work, which: ['j2'], recogniser: rec, log: () => {} }); assert.equal(out.j2.pass, 12);
    // replace one clip by the clip of another word: the "heard" text no longer matches the expected Hebrew
    const P = workPaths(work); const a = plan.items.find((i) => i.id === 'r01-w1' && i.tradition === 'sephardi' && i.voice === 'm'); const b = plan.items.find((i) => i.id === 'r03-w1' && i.tradition === 'sephardi' && i.voice === 'm');
    fs.copyFileSync(P.clip(1, b), P.clip(1, a));
    out = await runJudges({ work, which: ['j2'], recogniser: rec, log: () => {} }); assert.equal(out.j2.fail, 1);
    const v = loadVerdicts(work, 'j2').get('m/sephardi/word/r01-w1'); assert.equal(v.verdict, 'fail'); assert.ok(v.measured.similarity < 0.7); assert.ok(v.measured.expected && v.measured.heard && v.thresholds.minSimilarity === 0.7);
    // a command recogniser (a tiny script that prints a fixed Hebrew word)
    const script = path.join(tmp('cmd'), 'say.mjs'); fs.writeFileSync(script, "console.log('שלומ');");
    const cmd = makeRecogniser({ cfg: { recogniser: { mode: 'command', command: [process.execPath, script, '{file}'] } }, mode: 'command' });
    assert.equal(await cmd.transcribe(P.clip(1, a)), 'שלומ'); assert.match(cmd.id, /^command:/);
    assert.throws(() => makeRecogniser({ cfg: { recogniser: { mode: 'command' } }, mode: 'command' }), /command array/);
  } finally { rm(work); }
});

ffTest('J2 over HTTP: multipart speech-to-text request carries the key, model and Hebrew language; the answer text is compared; transcripts are cached', async () => {
  const { work } = await mockWork(1, { take2: false });
  const s = await stub((c, res) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ language_code: 'heb', language_probability: 0.9, text: 'שב', words: [] })); });
  try {
    await clipAll({ work, take: 1, log: () => {} });
    const rec = makeRecogniser({ cfg: cfgMock(), mode: 'service', env: s.env });
    const out = await runJudges({ work, which: ['j2'], recogniser: rec, log: () => {} });
    assert.equal(s.calls.length, 4); assert.equal(s.calls[0].url, '/v1/speech-to-text'); assert.equal(s.calls[0].headers[SERVICE.keyHeader], KEY);
    assert.match(String(s.calls[0].headers['content-type']), /multipart\/form-data/); assert.match(s.calls[0].body, /name="model_id"/); assert.match(s.calls[0].body, /name="language_code"\r\n\r\nhe/);
    assert.equal(out.j2.pass + out.j2.fail, 4);
    const before = s.calls.length; await runJudges({ work, which: ['j2'], recogniser: rec, force: true, log: () => {} }); assert.equal(s.calls.length, before, 'cached transcripts are not sent twice');
    for (const f of walk(work)) assert.ok(!fs.readFileSync(f).includes(KEY));
  } finally { s.server.close(); rm(work); }
});

ffTest('J3: needs a second take; compares lengths, transcripts and spectrum; flags an outlier against the other voice slot', async () => {
  const { work, plan } = await mockWork(2, { take2: true });
  try {
    await clipAll({ work, take: 1, log: () => {} }); await clipAll({ work, take: 2, log: () => {} });
    const rec = makeRecogniser({ cfg: cfgMock(), mode: 'mock', items: readJsonl(workPaths(work).log).filter((l) => l.event === 'rendered') });
    let out = await runJudges({ work, which: ['j3'], recogniser: rec, log: () => {} }); assert.equal(out.j3.pass, 8, JSON.stringify([...loadVerdicts(work, 'j3').values()].map((v) => v.reasons)));
    const v = loadVerdicts(work, 'j3').get('m/sephardi/word/r01-w1'); assert.ok(v.measured.duration_ratio > 0.9 && v.measured.duration_ratio < 1.1); assert.ok(v.measured.spectral_similarity > 0.85); assert.ok(v.measured.transcript_similarity === 1); assert.ok(v.measured.duration_vs_other_voice > 0.9);
    // a long woman clip: outlier vs the man's clip of the same word
    const P = workPaths(work); const f = plan.items.find((i) => i.id === 'r01-w1' && i.tradition === 'sephardi' && i.voice === 'f');
    const long = mockWav({ id: f.id, tradition: f.tradition, speak: 'x'.repeat(60), voice: 'f' }); const lf = path.join(tmp('long'), 'l.wav'); fs.writeFileSync(lf, long);
    const { encode, measure } = await import('../tools/tts/post.mjs'); await encode(lf, P.clip(1, f), await measure(lf)); await encode(lf, P.clip(2, f), await measure(lf));
    out = await runJudges({ work, which: ['j3'], recogniser: rec, log: () => {} });
    assert.match(loadVerdicts(work, 'j3').get('f/sephardi/word/r01-w1').reasons.join(), /outlier against the other voice/);
    // no second take: fails, not passes
    fs.rmSync(P.clip(2, plan.items[2]));
    out = await runJudges({ work, which: ['j3'], recogniser: rec, log: () => {} });
    const k = `${plan.items[2].voice}/${plan.items[2].tradition}/${plan.items[2].kind}/${plan.items[2].id}`; assert.match(loadVerdicts(work, 'j3').get(k).reasons.join(), /no second take/);
    // spectral helpers
    const a = new Int16Array(8000).map((_, i) => Math.sin(i / 3) * 8000), b2 = new Int16Array(8000).map((_, i) => Math.sin(i / 3) * 4000);
    assert.ok(pearson(bandProfile(a), bandProfile(b2)) > 0.99); assert.ok(pearson(bandProfile(a), bandProfile(new Int16Array(8000).map((_, i) => Math.sin(i / 0.6) * 8000))) < 0.9);
  } finally { rm(work); }
});

// ---------- hand-off ----------
ffTest('hand-off: unanimous passes only; 14 columns + tradition, voice_slot, respelled_text; failures listed with reasons; mock needs --allow-mock; stale verdicts do not count; README is honest', async () => {
  const { work, plan } = await mockWork(3, { take2: true });
  try {
    await clipAll({ work, take: 1, log: () => {} }); await clipAll({ work, take: 2, log: () => {} });
    const rec = makeRecogniser({ cfg: cfgMock(), mode: 'mock', items: readJsonl(workPaths(work).log).filter((l) => l.event === 'rendered') });
    await runJudges({ work, recogniser: rec, log: () => {} });
    const out = path.join(work, 'h', 'OUT');
    assert.throws(() => buildHandoff({ work, out }), /mock/);
    const r = buildHandoff({ work, out, allowMock: true }); assert.ok(r.dest.endsWith('-MOCK-DO-NOT-INGEST')); assert.equal(r.counts.passed, 12);
    assert.equal(COLS14.join(','), 'id,he,source_file,source_text_sha256,source_structural,recognition,consistency,overall,human_approved,status,wav_file,wav_sha256,mp3_file,mp3_sha256');
    const csv = fs.readFileSync(path.join(r.dest, 'manifest.csv'), 'utf8').split('\n'); assert.equal(csv[0], COLS.join(',')); assert.equal(COLS.slice(-3).join(), 'tradition,voice_slot,respelled_text');
    const mj = JSON.parse(fs.readFileSync(path.join(r.dest, 'manifest.json'), 'utf8')); assert.equal(mj.rows.length, 12);
    for (const row of mj.rows) { assert.equal(row.overall, 'unanimous-machine-pass'); assert.equal(row.human_approved, 'False'); assert.equal(row.status, 'synthetic-unreviewed'); assert.equal(row.licence, 'licence not cleared');
      assert.ok(fs.existsSync(path.join(r.dest, row.mp3_file))); assert.equal(sha256(fs.readFileSync(path.join(r.dest, row.mp3_file))), row.mp3_sha256); assert.match(row.mp3_file, /^audio\/(m|f)\/(sephardi|ashkenazi)\/word\/[a-z0-9-]+\.mp3$/); }
    assert.equal(walk(path.join(r.dest, 'audio')).length, 12);
    assert.ok(fs.existsSync(path.join(r.dest, 'listen', 'sephardi-m.html')) && fs.existsSync(path.join(r.dest, 'listen', 'ashkenazi-f.csv')));
    const readme = fs.readFileSync(path.join(r.dest, 'README.md'), 'utf8'); assert.match(readme, /MOCK RUN/); assert.match(readme, /NOT human-reviewed/); assert.match(readme, /does \*\*not\*\* mean/); assert.match(readme, /Ashkenazi or Sephardi/); assert.match(readme, /licence not cleared/i); assert.match(readme, /native listener/);
    for (const f of walk(r.dest).filter((x) => /\.(md|csv|json|html)$/.test(x))) { const t = fs.readFileSync(f, 'utf8'); assert.ok(!VENDOR.test(t), f); assert.ok(!new RegExp(['anthro' + 'pic', 'open' + 'ai', 'chat' + 'gpt'].join('|'), 'i').test(t), f); }
    // a failure: break one judge verdict by editing the clip after judging (stale) -> not copied, listed with a reason
    const P = workPaths(work); const it = plan.items[0]; fs.appendFileSync(P.clip(1, it), 'junk');
    const r2 = buildHandoff({ work, out, allowMock: true }); assert.equal(r2.counts.passed, 11); assert.equal(r2.counts.failed, 1);
    const fails = JSON.parse(fs.readFileSync(path.join(r2.dest, 'failures.json'), 'utf8')); assert.match(fails[0].reasons, /different file/);
    assert.ok(!fs.existsSync(path.join(r2.dest, `audio/${it.voice}/${it.tradition}/word/${it.id}.mp3`)));
    assert.ok(fs.readFileSync(path.join(r2.dest, 'failures.csv'), 'utf8').includes('reasons'));
  } finally { rm(work); }
});
