// Preflight tool: pure verdict logic with pretend computers (--mock), plus one real-probe smoke run. Nothing is installed, downloaded or rendered.
// A GO from a mock environment says nothing about any real machine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evaluate, MOCK_PRESETS, DEFAULTS, parseCli } from '../tools/tts/preflight.mjs';

const P = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'tools', 'tts', 'preflight.mjs');
const cli = (...a) => spawnSync(process.execPath, [P, ...a], { encoding: 'utf8' });
const json = (...a) => JSON.parse(cli('--json', ...a).stdout);

test('mock ready: GO, exit 0, and it says it is a pretend computer', () => {
  const r = cli('--mock', 'ready');
  assert.equal(r.status, 0);
  assert.match(r.stdout, /MOCK ENVIRONMENT/);
  assert.match(r.stdout, /\nGO\./);
  assert.match(r.stdout, /does not say any voice will sound right/);
  assert.match(r.stdout, /synthetic-unreviewed/);
});

test('each missing piece gives NO-GO naming that piece and a fix, exit 1', () => {
  const want = { 'no-disk': 'disk', 'no-python': 'python', 'no-torch': 'torch', 'no-ffmpeg': 'ffmpeg' };
  for (const [preset, name] of Object.entries(want)) {
    const r = cli('--mock', preset);
    assert.equal(r.status, 1, preset);
    assert.match(r.stdout, new RegExp(`NO-GO\\. Missing: ${name}\\.`), preset);
    const j = json('--mock', preset);
    assert.equal(j.verdict, 'NO-GO'); assert.equal(j.firstFailure.name, name); assert.ok(j.firstFailure.fix.length > 10);
  }
  assert.match(cli('--mock', 'no-disk').stdout, /Free at least [\d.]+ GB more/);
  assert.match(cli('--mock', 'no-torch').stdout, /pip install chatterbox-tts/);
});

test('no GPU, CPU-only torch and small VRAM are warnings (CPU is slow, not impossible), never silent', () => {
  for (const preset of ['no-gpu', 'small-vram']) {
    const j = json('--mock', preset);
    assert.equal(j.verdict, 'GO WITH WARNINGS', preset);
    assert.equal(cli('--mock', preset).status, 0);
    assert.ok(j.checks.some((c) => c.name === 'gpu' && c.status === 'warn'));
  }
  const j = json('--mock', 'cpu-torch');
  assert.ok(j.checks.some((c) => c.name === 'torch-cuda' && c.status === 'warn'), 'GPU present but torch cannot use it');
  assert.match(cli('--mock', 'no-gpu').stdout, /speed not measured/);
});

test('model files: missing is a warning (they download on first run) unless --offline, then a failure', () => {
  const env = { ...JSON.parse(cli('--json', '--mock', 'ready').stdout), };
  const mk = (models) => evaluate({ mock: true, platform: 'linux', arch: 'x64', nodeVersion: '22.0.0', freeDiskGB: 100, diskPath: '/x', ramGB: 32, freeRamGB: 20, gpu: { name: 'G', totalMB: 12288, freeMB: 12000 },
    python: { cmd: 'python3', version: '3.11.9', torch: '2.6', cuda: true, mps: false, chatterbox: true, fasterWhisper: true }, ffmpeg: true, ffprobe: true, models, refs: null }, { offline: false });
  assert.equal(env.verdict, 'GO');
  assert.equal(mk({ chatterbox: false, whisper: true, cache: '/c' }).verdict, 'GO WITH WARNINGS');
  const off = evaluate({ mock: true, platform: 'linux', arch: 'x64', nodeVersion: '22.0.0', freeDiskGB: 100, diskPath: '/x', ramGB: 32, freeRamGB: 20, gpu: null, python: { cmd: 'python3', version: '3.11.9', torch: '2.6', cuda: false, mps: false, chatterbox: true, fasterWhisper: true }, ffmpeg: true, ffprobe: true, models: { chatterbox: false, whisper: false, cache: '/c' }, refs: null }, { offline: true });
  assert.equal(off.verdict, 'NO-GO'); assert.equal(off.firstFailure.name, 'model-files');
});

test('thresholds are overridable and labelled as placeholders, not measurements', () => {
  assert.deepEqual(Object.keys(DEFAULTS).sort(), ['minDiskGB', 'minRamGB', 'minVramGB']);
  assert.match(cli('--mock', 'ready').stdout, /placeholder minimum \d+ GB, not a measured need/);
  const r = cli('--mock-env', '{"freeDiskGB":40}', '--min-disk-gb', '50');
  assert.equal(r.status, 1); assert.match(r.stdout, /Missing: disk/);
  assert.equal(cli('--mock-env', '{"freeDiskGB":40}', '--min-disk-gb', '30').status, 0);
});

test('Python version: 3.11 ok, 3.10/3.12 warn, 3.13 and 2.x fail; old Node fails', () => {
  const base = { mock: true, platform: 'linux', arch: 'x64', nodeVersion: '22.0.0', freeDiskGB: 100, diskPath: '/x', ramGB: 32, freeRamGB: 20, gpu: { name: 'G', totalMB: 12288, freeMB: 12000 }, ffmpeg: true, ffprobe: true, models: { chatterbox: true, whisper: true, cache: '/c' }, refs: null };
  const py = (version) => ({ cmd: 'python3', version, torch: '2.6', cuda: true, mps: false, chatterbox: true, fasterWhisper: true });
  const v = (version, extra = {}) => evaluate({ ...base, python: py(version), ...extra }).checks.find((c) => c.name === 'python').status;
  assert.deepEqual(['3.11.9', '3.10.4', '3.12.1', '3.13.1', '2.7.18'].map((x) => v(x)), ['ok', 'warn', 'warn', 'fail', 'fail']);
  assert.equal(evaluate({ ...base, python: py('3.11.9'), nodeVersion: '18.19.0' }).firstFailure.name, 'node');
});

test('reference WAVs: missing file fails, identical audio for man and woman fails, different audio passes', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-'));
  const a = path.join(d, 'a.wav'), b = path.join(d, 'b.wav'), c = path.join(d, 'c.wav');
  fs.writeFileSync(a, 'AAAA'); fs.writeFileSync(b, 'BBBB'); fs.writeFileSync(c, 'AAAA');
  const real = (...x) => JSON.parse(cli('--json', ...x).stdout);
  // the real probe is used here only for refs; assert on the ref checks, not on the whole verdict
  const refs = (x, y) => real('--ref-m', x, '--ref-f', y).checks.filter((k) => k.name.startsWith('ref-'));
  assert.ok(refs(a, b).every((k) => k.status === 'ok'));
  assert.equal(refs(a, c).find((k) => k.name === 'ref-differ').status, 'fail');
  assert.equal(refs(a, path.join(d, 'none.wav')).find((k) => k.name === 'ref-f').status, 'fail');
  fs.rmSync(d, { recursive: true, force: true });
});

test('real probe smoke run: well-formed report on whatever machine this is, changes nothing', () => {
  const work = path.join(os.tmpdir(), `pf-work-${process.pid}`);
  const j = json('--work', work);
  assert.equal(j.mock, false);
  assert.ok(['GO', 'GO WITH WARNINGS', 'NO-GO'].includes(j.verdict));
  for (const n of ['node', 'disk', 'ram', 'python', 'gpu', 'ffmpeg', 'ffprobe', 'model-files']) assert.ok(j.checks.some((c) => c.name === n), n);
  assert.equal(fs.existsSync(work), false, 'preflight must not create the work folder');
  assert.equal(j.exitCode, j.verdict === 'NO-GO' ? 1 : 0);
});

test('bad arguments are refused with exit 2', () => {
  assert.equal(cli('--mock', 'nonsense').status, 2);
  assert.equal(cli('--frobnicate').status, 2);
  assert.throws(() => parseCli(['--min-disk-gb', '-3']));
  assert.ok(Object.keys(MOCK_PRESETS).includes('ready'));
});
