#!/usr/bin/env node
// Clip each rendered word: trim leading and trailing silence (80 ms kept at each end), normalise loudness exactly as tools/tts/post.mjs does (two-pass, -16 LUFS,
// true-peak limit -1 dBTP), encode mono 44.1 kHz 96 kbps mp3, strip all metadata, verify with ffprobe. Output names are the manifest's own:
//   <work>/clips/take<N>/audio/<voice>/<tradition>/<kind>/<id>.mp3     (voice = m|f; the id and slots are neutral, no vendor or voice name in any file name or tag)
//   node tools/tts/voice_clip.mjs [--work DIR] [--take 1|2] [--jobs N] [--limit N] [--force]
// It reads the render log, not the plan: only clips that were really rendered (and whose raw file still matches the logged hash) are clipped.
// Needs ffmpeg and ffprobe on the PATH (or FFMPEG / FFPROBE set). Resumable: an mp3 newer than its raw file is skipped.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from './lib.mjs';
import { measure, encode, checkMp3, integratedLufs } from './post.mjs';
import { workPaths, defaultWork, appendJsonl, readJsonl, sha256, takeKey, haveFfmpeg } from './voice_lib.mjs';

export async function clipAll({ work, take = 1, jobs = Math.max(1, Math.floor(os.cpus().length / 2)), limit = 0, force = false, log = console.log } = {}) {
  if (!haveFfmpeg()) throw new Error('ffmpeg and ffprobe are needed (install them, or set FFMPEG and FFPROBE)');
  const P = workPaths(work);
  const latest = new Map();
  for (const r of readJsonl(P.log)) if (r.event === 'rendered' && r.take === take) latest.set(takeKey(r, take), r);
  let recs = [...latest.values()]; if (limit) recs = recs.slice(0, limit);
  const stat = { clipped: 0, skipped: 0, missingRaw: 0, failed: 0 }; let next = 0;
  const one = async (r) => {
    const raw = P.raw(take, r, r.file_ext || 'wav');
    if (!fs.existsSync(raw) || sha256(fs.readFileSync(raw)) !== r.audio_sha256) { stat.missingRaw++; log(`SKIP ${r.id} (${r.tradition}/${r.voice}): raw file missing or changed since it was logged`); return; }
    const out = P.clip(take, r);
    if (!force && fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(raw).mtimeMs) { stat.skipped++; return; }
    try {
      await encode(raw, out, await measure(raw));
      const c = checkMp3(out);
      if (!c.ok) { fs.rmSync(out, { force: true }); throw new Error(c.problems.join('; ')); }
      appendJsonl(P.clipLog, { event: 'clipped', ts: new Date().toISOString(), take, id: r.id, kind: r.kind, tradition: r.tradition, voice: r.voice, mock: !!r.mock, raw_sha256: r.audio_sha256,
        mp3_sha256: sha256(fs.readFileSync(out)), bytes: fs.statSync(out).size, duration_s: c.info.duration, lufs: integratedLufs(out) });
      stat.clipped++;
    } catch (e) { stat.failed++; appendJsonl(P.clipLog, { event: 'clip-error', ts: new Date().toISOString(), take, id: r.id, tradition: r.tradition, voice: r.voice, error: String(e.message).slice(0, 300) }); log(`FAILED ${r.id}: ${e.message}`); }
  };
  await Promise.all(Array.from({ length: jobs }, async () => { while (next < recs.length) await one(recs[next++]); }));
  return { ...stat, total: recs.length };
}

export async function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv, ['force', 'help']);
  if (a.help) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n')); return; }
  const work = path.resolve(a.work || defaultWork()); const take = Number(a.take || 1);
  const r = await clipAll({ work, take, jobs: a.jobs ? Number(a.jobs) : undefined, limit: a.limit ? Number(a.limit) : 0, force: !!a.force });
  console.log(`clip take ${take}: ${r.clipped} encoded, ${r.skipped} already done, ${r.missingRaw} raw missing/changed, ${r.failed} failed -> ${path.join(work, 'clips', `take${take}`)}`);
  if (r.failed || r.missingRaw) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
