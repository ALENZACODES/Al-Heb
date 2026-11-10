#!/usr/bin/env node
// Preflight for the local TTS run: is THIS computer ready, and if not, what exactly is missing? Changes nothing, downloads nothing, renders nothing.
//   node tools/tts/preflight.mjs [--work <dir>] [--min-disk-gb 10] [--min-vram-gb 6] [--min-ram-gb 8] [--ref-m a.wav --ref-f b.wav] [--offline] [--json]
//   node tools/tts/preflight.mjs --mock ready|no-disk|no-python|no-torch|no-gpu|cpu-torch|no-ffmpeg|small-vram    (a pretend computer, for tests; says so in its output)
//   node tools/tts/preflight.mjs --mock-env '{"freeDiskGB":3,...}'                                              (same, with your own fields)
// Zero dependencies. Python is asked only if a python executable exists (python3, python, py -3), and only with `python -I`.
// What the thresholds are: --min-disk-gb, --min-vram-gb and --min-ram-gb are placeholders chosen by this tool, NOT measured needs of the model.
// The real figures are unmeasured (see docs/tts/SMALL-DISK.md); change them once you have measured your first 20 clips.
// Verdict: NO-GO if any check failed (the first failure is named, with the command that fixes it), GO WITH WARNINGS if only warnings, GO otherwise.
// GO means "nothing this tool can see is missing". It does not mean the voices will sound right: nobody has listened to any output.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const GB = 1024 ** 3;
export const DEFAULTS = Object.freeze({ minDiskGB: 10, minVramGB: 6, minRamGB: 8 });
export const MOCK_PRESETS = Object.freeze({
  ready: {},
  'no-disk': { freeDiskGB: 2.5 },
  'no-python': { python: null },
  'no-torch': { python: { cmd: 'python3', version: '3.11.9', torch: null, cuda: false, mps: false, chatterbox: false, fasterWhisper: false } },
  'no-gpu': { gpu: null, python: { cmd: 'python3', version: '3.11.9', torch: '2.6.0+cpu', cuda: false, mps: false, chatterbox: true, fasterWhisper: true } },
  'cpu-torch': { python: { cmd: 'python3', version: '3.11.9', torch: '2.6.0+cpu', cuda: false, mps: false, chatterbox: true, fasterWhisper: true } },
  'no-ffmpeg': { ffmpeg: false },
  'small-vram': { gpu: { name: 'Mock GPU', totalMB: 4096, freeMB: 3800 } },
});
const READY = () => ({
  mock: true, platform: 'linux', arch: 'x64', nodeVersion: '22.0.0', freeDiskGB: 120, diskPath: '/mock/work', ramGB: 32, freeRamGB: 20,
  gpu: { name: 'Mock GPU', totalMB: 12288, freeMB: 11500 },
  python: { cmd: 'python3', version: '3.11.9', torch: '2.6.0+cu124', cuda: true, mps: false, chatterbox: true, fasterWhisper: true },
  ffmpeg: true, ffprobe: true,
  models: { chatterbox: true, whisper: true, cache: '/mock/hf' },
  refs: null,
});

const run = (cmd, args, opt = {}) => { try { return spawnSync(cmd, args, { encoding: 'utf8', timeout: opt.timeout || 20000, windowsHide: true }); } catch (e) { return { status: -1, error: e, stdout: '', stderr: '' }; } };
const works = (cmd, args) => { const r = run(cmd, args); return !r.error && r.status === 0; };
const verParts = (v) => String(v || '').split(/[.+]/).slice(0, 2).map((x) => parseInt(x, 10) || 0);

function nearestExisting(p) { let d = path.resolve(p); while (!fs.existsSync(d)) { const u = path.dirname(d); if (u === d) break; d = u; } return d; }
export function freeDiskGB(p) { try { const s = fs.statfsSync(nearestExisting(p)); return (Number(s.bavail) * Number(s.bsize)) / GB; } catch { return null; } }

function probeGpu() {
  const r = run('nvidia-smi', ['--query-gpu=name,memory.total,memory.free', '--format=csv,noheader,nounits']);
  if (r.error || r.status !== 0 || !r.stdout.trim()) return null;
  const [name, total, free] = r.stdout.trim().split('\n')[0].split(',').map((x) => x.trim());
  return { name, totalMB: Number(total), freeMB: Number(free) };
}

const PY_SNIPPET = [
  'import json,sys,importlib.util as u',
  'o={"version":".".join(map(str,sys.version_info[:3])),"torch":None,"cuda":False,"mps":False}',
  'try:',
  ' import importlib.metadata as m; o["torch"]=m.version("torch")',
  ' import torch; o["cuda"]=bool(torch.cuda.is_available()); o["mps"]=bool(getattr(torch.backends,"mps",None) and torch.backends.mps.is_available())',
  'except Exception as e: o["torchError"]=type(e).__name__',
  'o["chatterbox"]=u.find_spec("chatterbox") is not None',
  'o["fasterWhisper"]=u.find_spec("faster_whisper") is not None',
  'print(json.dumps(o))',
].join('\n');

function probePython() {
  const cands = process.platform === 'win32' ? [['py', ['-3']], ['python', []], ['python3', []]] : [['python3', []], ['python', []]];
  for (const [cmd, pre] of cands) {
    if (!works(cmd, [...pre, '--version'])) continue;
    const r = run(cmd, [...pre, '-I', '-c', PY_SNIPPET], { timeout: 120000 });
    let j = null; try { j = JSON.parse((r.stdout || '').trim().split('\n').pop()); } catch { /* fall through */ }
    if (!j) { const v = run(cmd, [...pre, '--version']); return { cmd: [cmd, ...pre].join(' '), version: String(v.stdout || v.stderr).replace(/^Python\s+/, '').trim(), torch: null, cuda: false, mps: false, chatterbox: false, fasterWhisper: false, error: 'could not run the package check' }; }
    return { cmd: [cmd, ...pre].join(' '), ...j };
  }
  return null;
}

function hfCache() {
  if (process.env.HF_HUB_CACHE) return process.env.HF_HUB_CACHE;
  if (process.env.HF_HOME) return path.join(process.env.HF_HOME, 'hub');
  return path.join(os.homedir(), '.cache', 'huggingface', 'hub');
}
function probeModels() {
  const cache = hfCache();
  let dirs = []; try { dirs = fs.readdirSync(cache); } catch { /* none */ }
  const has = (re) => dirs.some((d) => re.test(d));
  return { chatterbox: has(/^models--ResembleAI--chatterbox/i), whisper: has(/^models--Systran--faster-whisper-large-v3$/i), cache };
}

const digest = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 12);
function probeRefs(m, f) {
  const o = { m: null, f: null };
  for (const [k, p] of [['m', m], ['f', f]]) if (p) o[k] = fs.existsSync(p) ? { path: p, digest: digest(p) } : { path: p, missing: true };
  return (m || f) ? o : null;
}

export function probe(opts = {}) {
  const work = path.resolve(opts.work || process.env.ALEF_TTS_WORK || path.join(os.homedir(), 'alef-tts-work'));
  return {
    mock: false, platform: process.platform, arch: process.arch, nodeVersion: process.versions.node,
    freeDiskGB: freeDiskGB(work), diskPath: work, ramGB: os.totalmem() / GB, freeRamGB: os.freemem() / GB,
    gpu: probeGpu(), python: probePython(),
    ffmpeg: works(process.env.FFMPEG || 'ffmpeg', ['-version']), ffprobe: works(process.env.FFPROBE || 'ffprobe', ['-version']),
    models: probeModels(), refs: probeRefs(opts.refM, opts.refF),
  };
}

const fmt = (n) => (n == null ? 'unknown' : n.toFixed(1));
const install = process.platform === 'win32' ? 'py -3.11 -m venv %USERPROFILE%\\alef-tts-venv' : 'python3.11 -m venv ~/alef-tts-venv && source ~/alef-tts-venv/bin/activate';

/** env -> { verdict, exitCode, checks[], firstFailure }. Pure: the tests drive it with pretend environments. */
export function evaluate(env, o = {}) {
  const t = { ...DEFAULTS, ...Object.fromEntries(Object.entries({ minDiskGB: o.minDiskGB, minVramGB: o.minVramGB, minRamGB: o.minRamGB }).filter(([, v]) => v != null)) };
  const checks = [];
  const add = (name, status, detail, fix = null) => checks.push({ name, status, detail, fix });
  const nodeMajor = parseInt(String(env.nodeVersion).split('.')[0], 10);
  add('node', nodeMajor >= 20 ? 'ok' : 'fail', `Node ${env.nodeVersion}`, nodeMajor >= 20 ? null : 'Install Node 20 or newer (nodejs.org).');

  if (env.freeDiskGB == null) add('disk', 'warn', `could not read free space for ${env.diskPath}`, 'Check free space yourself before you start.');
  else add('disk', env.freeDiskGB >= t.minDiskGB ? 'ok' : 'fail', `${fmt(env.freeDiskGB)} GB free where the work folder goes (${env.diskPath}); placeholder minimum ${t.minDiskGB} GB, not a measured need`,
    env.freeDiskGB >= t.minDiskGB ? null : `Free at least ${fmt(t.minDiskGB - env.freeDiskGB)} GB more, or point ALEF_TTS_WORK at a bigger drive (docs/tts/SMALL-DISK.md). The Python packages and model cache are on the drive that holds your home folder, check that one too.`);

  add('ram', env.ramGB >= t.minRamGB ? 'ok' : 'warn', `${fmt(env.ramGB)} GB total, ${fmt(env.freeRamGB)} GB free; placeholder minimum ${t.minRamGB} GB, not a measured need`, env.ramGB >= t.minRamGB ? null : 'Close other programs; loading the model may fail or swap heavily.');

  const py = env.python;
  if (!py) {
    add('python', 'fail', 'no Python found (tried python3 / python / py -3)', `Install Python 3.11, then: ${install}`);
  } else {
    const [maj, min] = verParts(py.version);
    const okv = maj === 3 && min >= 10 && min <= 12;
    add('python', okv ? (min === 11 ? 'ok' : 'warn') : 'fail', `Python ${py.version} (${py.cmd})${min === 11 ? '' : '; docs/tts/README.md was written for 3.11'}`, okv ? (min === 11 ? null : 'Python 3.11 is the version the docs name; other versions are untested here.') : `Use Python 3.11: ${install}`);
    add('torch', py.torch ? 'ok' : 'fail', py.torch ? `torch ${py.torch}` : 'torch is not installed in this Python', py.torch ? null : 'Inside the virtual environment, install torch first (NVIDIA: the CUDA build from pytorch.org), then: pip install chatterbox-tts faster-whisper');
    add('chatterbox-tts', py.chatterbox ? 'ok' : 'fail', py.chatterbox ? 'package found' : 'package chatterbox-tts not installed', py.chatterbox ? null : 'pip install chatterbox-tts');
    add('faster-whisper', py.fasterWhisper ? 'ok' : 'fail', py.fasterWhisper ? 'package found' : 'package faster-whisper not installed (the acceptance gate needs it)', py.fasterWhisper ? null : 'pip install faster-whisper');
  }

  const g = env.gpu;
  if (g) {
    const vram = g.totalMB / 1024;
    add('gpu', vram >= t.minVramGB ? 'ok' : 'warn', `${g.name}, ${fmt(vram)} GB VRAM (${fmt(g.freeMB / 1024)} GB free); placeholder minimum ${t.minVramGB} GB, not a measured need`,
      vram >= t.minVramGB ? null : 'Less VRAM than the placeholder: try --device cpu (slow) or close programs using the GPU. Whether it fits is unmeasured.');
    if (py && py.torch && !py.cuda) add('torch-cuda', 'warn', `an NVIDIA GPU is present but torch ${py.torch} cannot use it (CPU-only build?)`, 'Reinstall torch with the CUDA build from pytorch.org, or render with --device cpu (much slower; speed not measured).');
  } else if (env.platform === 'darwin' && env.arch === 'arm64') {
    add('gpu', py && py.mps ? 'ok' : 'warn', py && py.mps ? 'Apple silicon, torch reports MPS available' : 'Apple silicon, torch MPS not confirmed', py && py.mps ? null : 'Use --device mps once torch reports it; otherwise --device cpu.');
  } else {
    add('gpu', 'warn', 'no NVIDIA GPU found (nvidia-smi missing or failed)', 'CPU rendering works per the docs but is slow (speed not measured). Use --device cpu.');
  }

  add('ffmpeg', env.ffmpeg ? 'ok' : 'fail', env.ffmpeg ? 'found' : 'ffmpeg not on the path', env.ffmpeg ? null : (process.platform === 'win32' ? 'winget install Gyan.FFmpeg  (then open a new PowerShell window)' : 'sudo apt install ffmpeg   (or: brew install ffmpeg)'));
  add('ffprobe', env.ffprobe ? 'ok' : 'fail', env.ffprobe ? 'found' : 'ffprobe not on the path (it ships with ffmpeg)', env.ffprobe ? null : 'Install ffmpeg as above; ffprobe comes with it.');

  const m = env.models || {};
  const miss = [!m.chatterbox && 'Chatterbox weights', !m.whisper && 'faster-whisper large-v3 weights'].filter(Boolean);
  add('model-files', miss.length ? (o.offline ? 'fail' : 'warn') : 'ok', miss.length ? `not in the cache (${m.cache}): ${miss.join(', ')}` : `Chatterbox and faster-whisper weights found in ${m.cache}`,
    miss.length ? (o.offline ? 'You asked for --offline: download the weights while online first (run the 20-clip pilot once).' : 'They download on the first real run; that needs internet and disk (size not measured). Nothing is downloaded by this tool.') : null);

  if (env.refs) {
    for (const k of ['m', 'f']) {
      const r = env.refs[k];
      if (r) add(`ref-${k}`, r.missing ? 'fail' : 'ok', r.missing ? `reference WAV not found: ${r.path}` : `reference WAV ${k} found (digest ${r.digest})`, r.missing ? 'Check the path, or use --allow-default-voice for a technical test only (nothing from that run may ship).' : null);
    }
    if (env.refs.m && env.refs.f && !env.refs.m.missing && !env.refs.f.missing && env.refs.m.digest === env.refs.f.digest) add('ref-differ', 'fail', 'the man and woman reference WAVs are the same audio', 'Use two different voices you own or whose donor signed docs/voices/donor-rights-grant.md.');
  }

  const fails = checks.filter((c) => c.status === 'fail'), warns = checks.filter((c) => c.status === 'warn');
  const verdict = fails.length ? 'NO-GO' : warns.length ? 'GO WITH WARNINGS' : 'GO';
  return { verdict, exitCode: fails.length ? 1 : 0, checks, firstFailure: fails[0] || null, thresholds: t, mock: !!env.mock };
}

export function render(res) {
  const L = [];
  if (res.mock) L.push('MOCK ENVIRONMENT: this is a pretend computer used for testing, not a reading of yours.');
  for (const c of res.checks) L.push(`[${c.status.toUpperCase().padEnd(4)}] ${c.name}: ${c.detail}${c.fix ? `\n       -> ${c.fix}` : ''}`);
  L.push('');
  if (res.verdict === 'NO-GO') L.push(`NO-GO. Missing: ${res.firstFailure.name}. ${res.firstFailure.fix}${res.checks.filter((c) => c.status === 'fail').length > 1 ? `  (${res.checks.filter((c) => c.status === 'fail').length} problems in total, listed above)` : ''}`);
  else if (res.verdict === 'GO WITH WARNINGS') L.push('GO WITH WARNINGS. Nothing is missing, but read the warnings above: speed and fit are unmeasured on this machine.');
  else L.push('GO. Nothing this tool can see is missing.');
  L.push('This does not say any voice will sound right. No clip has been listened to; every clip the pipeline writes is "synthetic-unreviewed".');
  return L.join('\n');
}

export function parseCli(argv) {
  const a = { json: false, offline: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const val = () => argv[++i];
    if (k === '--json') a.json = true; else if (k === '--offline') a.offline = true;
    else if (k === '--work') a.work = val();
    else if (k === '--min-disk-gb') a.minDiskGB = Number(val()); else if (k === '--min-vram-gb') a.minVramGB = Number(val()); else if (k === '--min-ram-gb') a.minRamGB = Number(val());
    else if (k === '--ref-m') a.refM = val(); else if (k === '--ref-f') a.refF = val();
    else if (k === '--mock') { a.mock = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'ready'; }
    else if (k === '--mock-env') a.mockEnv = val();
    else throw new Error(`unknown argument ${k}`);
  }
  for (const k of ['minDiskGB', 'minVramGB', 'minRamGB']) if (k in a && !(a[k] > 0)) throw new Error(`--${k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())} needs a positive number`);
  return a;
}

export function main(argv = process.argv.slice(2)) {
  const a = parseCli(argv);
  let env;
  if (a.mock || a.mockEnv) {
    const preset = a.mock ? MOCK_PRESETS[a.mock] : {};
    if (a.mock && !preset) throw new Error(`unknown --mock preset "${a.mock}" (use ${Object.keys(MOCK_PRESETS).join(', ')})`);
    env = { ...READY(), ...preset, ...(a.mockEnv ? JSON.parse(a.mockEnv) : {}) };
  } else env = probe(a);
  const res = evaluate(env, a);
  console.log(a.json ? JSON.stringify(res, null, 1) : render(res));
  return res;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main().exitCode; } catch (e) { console.error(e.message); process.exitCode = 2; }
}
