#!/usr/bin/env node
// Post-process rendered WAV -> final MP3, named exactly like the manifest paths: <out>/audio/<voice>/<tradition>/<kind>/<id>.mp3
//   node tools/tts/post.mjs [--plan tools/tts/plan.json] [--work ~/alef-tts-work] [--limit N] [--force]
// Per clip: trim leading/trailing silence, EBU R128 loudness normalise to -16 LUFS (two-pass loudnorm, TP -1.5 dBTP, LRA 11),
// mono, 44.1 kHz, CBR 64 kbps MP3, ALL metadata stripped (no ID3, no Xing/Info header, no encoder string), then verified with ffprobe. --jobs N runs N ffmpeg pipelines in parallel (default half the CPUs).
// Resumable: an MP3 newer than its WAV is skipped. Needs ffmpeg + ffprobe on PATH (override with FFMPEG / FFPROBE).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { TTS_DIR, defaultWork, parseArgs, clipPath } from './lib.mjs';

export const TARGET = { I: -16, TP: -1.5, LRA: 11 };
const FF = () => process.env.FFMPEG || 'ffmpeg';
const FP = () => process.env.FFPROBE || 'ffprobe';
export const TRIM = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08,areverse';
const run = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
const runAsync = (cmd, args, binary = false) => new Promise((resolve) => {
  const p = spawn(cmd, args); const out = [], err = [];
  p.stdout.on('data', (d) => out.push(d)); p.stderr.on('data', (d) => err.push(d));
  p.on('error', (e) => resolve({ status: -1, stdout: Buffer.alloc(0), stderr: String(e) }));
  p.on('close', (status) => resolve({ status, stdout: binary ? Buffer.concat(out) : Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8') }));
});
const pcm = async (file) => (await runAsync(FF(), ['-v', 'error', '-i', file, '-f', 's16le', '-'], true)).stdout;

/** Pass 1: measure. Returns null when the clip is too short/quiet to measure (loudnorm then reports -inf). */
export async function measure(wav) {
  const r = await runAsync(FF(), ['-hide_banner', '-nostats', '-i', wav, '-af', `${TRIM},loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:print_format=json`, '-f', 'null', '-']);
  const m = /\{[^{}]*"input_i"[^{}]*\}/s.exec(r.stderr || '');
  if (r.status !== 0 || !m) throw new Error(`ffmpeg measure failed for ${wav}: ${(r.stderr || '').slice(-300)}`);
  const j = JSON.parse(m[0]);
  const num = (k) => Number(j[k]);
  if (![num('input_i'), num('input_tp'), num('input_lra'), num('input_thresh'), num('target_offset')].every(Number.isFinite)) return null;
  return j;
}

export async function encode(wav, outMp3, j) {
  const ln = j
    ? `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true`
    : `loudnorm=I=${TARGET.I}:TP=${TARGET.TP}:LRA=${TARGET.LRA}`; // single-pass fallback for clips too short to measure
  fs.mkdirSync(path.dirname(outMp3), { recursive: true });
  const tmp = outMp3 + '.part.mp3';
  const r = await runAsync(FF(), ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-af', `${TRIM},${ln}`, '-ar', '44100', '-ac', '1',
    '-map_metadata', '-1', '-map_chapters', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact',
    '-c:a', 'libmp3lame', '-b:a', '64k', '-reservoir', '0', '-write_xing', '0', '-id3v2_version', '0', '-write_id3v1', '0', tmp]);
  if (r.status !== 0) throw new Error(`ffmpeg encode failed for ${wav}: ${(r.stderr || '').slice(-300)}`);
  // -reservoir 0 keeps every frame self-contained, so the padding can be zeroed without changing a sample (with the reservoir on, it cannot).
  // libmp3lame writes its version string ("LAME3.100", sometimes cut short) into the padding of EVERY frame, even with bitexact flags.
  // Zero it. The decoded audio must stay sample-identical; if it does not, the clip is refused rather than shipped altered.
  const buf = fs.readFileSync(tmp);
  const txt = buf.toString('latin1');
  for (const m of txt.matchAll(/LAME(\d+\.\d+[A-Za-z0-9]*)?|Lavc[\x20-\x7e]*|Lavf[\x20-\x7e]*/g)) buf.fill(0, m.index, m.index + m[0].length);
  const scrubbed = tmp + '.scrub.mp3';
  fs.writeFileSync(scrubbed, buf);
  const [a, b] = await Promise.all([pcm(tmp), pcm(scrubbed)]);
  if (a.length === 0 || !a.equals(b)) { fs.rmSync(tmp); fs.rmSync(scrubbed); throw new Error(`tag scrub changed the decoded audio of ${wav}`); }
  fs.renameSync(scrubbed, outMp3);
  fs.rmSync(tmp);
  return { measured: !!j };
}

/** ffprobe: returns {ok, problems[], info}. ok only if mono, 44100 Hz, mp3, and no tags of any kind, and no encoder string in the bytes. */
export function checkMp3(file) {
  const problems = [];
  const r = run(FP(), ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file]);
  if (r.status !== 0) return { ok: false, problems: ['ffprobe failed: ' + (r.stderr || '').slice(0, 200)], info: null };
  const j = JSON.parse(r.stdout);
  const s = j.streams[0] || {};
  if (j.streams.length !== 1) problems.push(`${j.streams.length} streams (cover art or data?)`);
  if (s.codec_name !== 'mp3') problems.push(`codec ${s.codec_name}`);
  if (s.channels !== 1) problems.push(`channels ${s.channels}`);
  if (String(s.sample_rate) !== '44100') problems.push(`sample rate ${s.sample_rate}`);
  const tags = { ...(j.format.tags || {}), ...(s.tags || {}) };
  if (Object.keys(tags).length) problems.push('tags present: ' + Object.keys(tags).join(','));
  const buf = fs.readFileSync(file);
  if (buf.slice(0, 3).toString('latin1') === 'ID3') problems.push('ID3v2 header present');
  if (buf.length > 128 && buf.slice(buf.length - 128, buf.length - 125).toString('latin1') === 'TAG') problems.push('ID3v1 tag present');
  const txt = buf.toString('latin1');
  for (const w of ['LAME', 'Lavc', 'Lavf', 'Xing', 'Info\0']) if (txt.includes(w)) problems.push(`byte string "${w.replace('\0', '')}" present`);
  return { ok: problems.length === 0, problems, info: { duration: Number(j.format.duration), bit_rate: Number(j.format.bit_rate) } };
}

/** Integrated loudness (LUFS) of a file via ffmpeg ebur128; null if unmeasurable. */
export function integratedLufs(file) {
  const r = run(FF(), ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128', '-f', 'null', '-']);
  const m = /Integrated loudness:\s*\n\s*I:\s*(-?[\d.]+) LUFS/.exec(r.stderr || '');
  return m ? Number(m[1]) : null;
}

export async function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv, ['force']);
  const plan = JSON.parse(fs.readFileSync(path.resolve(a.plan || path.join(TTS_DIR, 'plan.json')), 'utf8'));
  const work = path.resolve(a.work || defaultWork());
  const jobs = Math.max(1, Number(a.jobs || Math.max(1, Math.floor(os.cpus().length / 2))));
  let items = plan.items;
  if (a.limit) items = items.slice(0, Number(a.limit));
  let done = 0, skipped = 0, missing = 0, bad = 0, next = 0;
  const one = async (it) => {
    const wav = path.join(work, 'raw', it.voice, it.tradition, it.kind, `${it.id}.wav`);
    if (!fs.existsSync(wav)) { missing++; return; }
    const out = path.join(work, 'mp3', clipPath(it.voice, it.tradition, it.kind, it.id));
    if (!a.force && fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(wav).mtimeMs) { skipped++; return; }
    try {
      await encode(wav, out, await measure(wav));
      const c = checkMp3(out);
      if (!c.ok) { bad++; fs.rmSync(out); console.error(`REJECTED ${it.id}: ${c.problems.join('; ')}`); return; }
      done++;
    } catch (e) { bad++; console.error(`FAILED ${it.id}: ${e.message}`); }
  };
  await Promise.all(Array.from({ length: jobs }, async () => { while (next < items.length) await one(items[next++]); }));
  console.log(`post: ${done} encoded, ${skipped} already done, ${missing} without a rendered WAV, ${bad} failed -> ${path.join(work, 'mp3')}`);
  if (bad) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
