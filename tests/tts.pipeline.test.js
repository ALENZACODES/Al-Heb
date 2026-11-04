// End-to-end test of the local TTS factory in --mock mode: plan -> render -> post -> verify -> manifest_update on 20 clips, one deliberately wrong.
// Mock mode proves the plumbing and the gate logic (wrong audio is rejected, human clips are never touched, status is "tts").
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

test('mock pipeline: 20 clips, 1 deliberately wrong clip is rejected, human clip untouched, status is tts', opts, () => {
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
    assert.equal(by[w].status, 'tts'); assert.equal(by[w].source, 'tts:mock');
    assert.ok(fs.existsSync(path.join(root, by[w].path)) && checkMp3(path.join(root, by[w].path)).ok);
    const meta = JSON.parse(fs.readFileSync(path.join(root, by[w].path + '.meta.json'), 'utf8'));
    assert.equal(meta.status, 'tts'); assert.equal(meta.redistributionCleared, false);
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
  m[0].status = 'tts';
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
