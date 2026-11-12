import { manifestText } from './manifest_io.mjs';
// Shared helpers for the Sephardi and Ashkenazi ("accent") clips: the respelling the Israeli voice reads, the tempo cap against the
// Israeli counterpart, and the manifest marking that admits a clip to playback. Owner decision (John Khan, 2026-11-07 22:56), see
// docs/audio/ACCENT-VOICES-2026-11-08.md. Used by tools/audio/render_tts.mjs (--tradition sephardi|ashkenazi) and
// tools/audio/tempo_cap.mjs. No network here; ffmpeg/ffprobe are spawned for durations and the tempo change.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ACCENT_SOURCES, isAccentSource } from '../../src/audio/player.js';
import { respell } from '../../src/pronunciation/forTradition.js';
import { cleanHebrewForTts } from './tts/google.mjs';

export { ACCENT_SOURCES, isAccentSource };
/** Traditions whose clips are made from the respelling (the Israeli tradition is made from pointed Hebrew). */
export const ACCENT_TRADITIONS = Object.freeze(['sephardi', 'ashkenazi']);
/** A tradition clip may be at most this many times the length of the Israeli clip of the same id and voice. */
export const TEMPO_CAP = 1.26;
/** Manifest status written for an admitted synthetic accent clip: a computer-made clip no human has listened to. */
export const ACCENT_STATUS = 'synthetic-unreviewed';
export const MANIFEST_FILES = Object.freeze(['data/audio/manifest.json', 'data/audio/manifest-kind-word.json', 'data/audio/manifest-words-israeli.json', 'data/audio/manifest-words-sephardi.json', 'data/audio/manifest-words-ashkenazi.json']);

/** Path of the Israeli clip of the same voice, kind and id ('audio/m/sephardi/line/x.mp3' -> 'audio/m/israeli/line/x.mp3'). */
export const israeliRef = (clipPath) => String(clipPath).replace(/\/(sephardi|ashkenazi)\//, '/israeli/');

/**
 * The text the Israeli voice is sent for a tradition row: the pointed Hebrew cleaned as for an Israeli render (cantillation, sof
 * pasuq and meteg off, maqaf -> space), then respelled in English letters for the tradition (src/pronunciation/forTradition.js
 * respell, scheme 'siddur': the "how to say it" line the app shows). '' when nothing can be produced.
 */
export function respellFor(text, tradition) {
  if (!ACCENT_TRADITIONS.includes(tradition)) throw new Error(`respellFor: ${tradition} is not a respelled tradition`);
  return respell(cleanHebrewForTts(text), tradition).replace(/\s+/g, ' ').trim();
}

/**
 * Speed-up factor that brings a clip of newSec to exactly cap x israeliSec. 1 when the clip is already within the cap, when either
 * duration is unknown, or when the clip is shorter than the Israeli one (a clip is never slowed down).
 */
export function tempoFactor(newSec, israeliSec, cap = TEMPO_CAP) {
  if (!(newSec > 0) || !(israeliSec > 0) || !(cap > 0)) return 1;
  const limit = cap * israeliSec;
  return newSec > limit ? newSec / limit : 1;
}

/** ffmpeg filter string for a speed-up factor: one atempo inside 0.5–2.0, a chain of atempo=2.0 steps plus the remainder beyond it. */
export function atempoChain(factor) {
  if (!(factor > 0)) throw new Error(`atempoChain: bad factor ${factor}`);
  if (factor < 1) throw new Error(`atempoChain: ${factor} would slow the clip down; clips are only sped up`);
  const parts = [];
  let f = factor;
  while (f > 2) { parts.push('atempo=2.0'); f /= 2; }
  parts.push(`atempo=${f.toFixed(6)}`);
  return parts.join(',');
}

const have = (bin) => spawnSync(bin, ['-version'], { stdio: 'ignore' }).status === 0;
export const haveFfmpeg = () => have('ffmpeg');

/**
 * Exact audible duration in seconds: the file decoded to mono 44.1 kHz PCM and its samples counted, so the mp3 encoder's padding
 * (which ffprobe's format duration includes, about 0.05 s per file) does not count. null when the file is missing or undecodable.
 */
export function clipDuration(file) {
  if (!fs.existsSync(file)) return null;
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 's16le', '-ac', '1', '-ar', '44100', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0 || !r.stdout) return null;
  return r.stdout.length / (2 * 44100);
}

/** Re-encode `file` in place at `factor` x speed, same pitch, in the repo's delivery format (mono 44.1 kHz 96 kbps mp3). */
export function applyTempo(file, factor, { out = file } = {}) {
  const tmp = path.join(os.tmpdir(), `alef-tempo-${process.pid}-${Date.now()}.mp3`);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', file, '-af', atempoChain(factor), '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', tmp]);
  if (r.status !== 0 || !fs.existsSync(tmp)) throw new Error(`ffmpeg atempo failed for ${file}: ${String(r.stderr || '').trim()}`);
  fs.copyFileSync(tmp, out); fs.unlinkSync(tmp);
  return out;
}

/**
 * Cap one clip against its Israeli counterpart. Measures both, and when the clip is over cap x the Israeli length speeds it up to
 * exactly the cap (same pitch) and runs `normalize(file)` again when given. Returns what happened, for the sidecar:
 * { applied, factor, cap, before, after, israeliSec, israeliRef } (after === before when nothing was applied; israeliSec null when
 * the Israeli file is absent, in which case nothing is applied).
 */
export function capClip(file, israeliFile, { cap = TEMPO_CAP, normalize = null, dry = false, israeliRef: ref } = {}) {
  const before = clipDuration(file);
  const israeliSec = israeliFile ? clipDuration(israeliFile) : null;
  const factor = tempoFactor(before, israeliSec, cap);
  const out = { applied: false, factor: 1, cap, before, after: before, israeliSec, israeliRef: ref ?? israeliFile ?? null };
  if (factor <= 1 || dry) { out.factor = factor; return out; }
  applyTempo(file, factor);
  if (typeof normalize === 'function') normalize(file);
  out.applied = true; out.factor = factor; out.after = clipDuration(file);
  return out;
}

/** Read an existing sidecar (or {}) so a rewrite keeps what the renderer recorded. */
export function readMeta(file) {
  try { return JSON.parse(fs.readFileSync(`${file}.meta.json`, 'utf8')); } catch { return {}; }
}
export function writeMeta(file, meta) {
  fs.writeFileSync(`${file}.meta.json`, JSON.stringify(meta, null, 1) + '\n');
}

/**
 * Mark manifest rows by clip path: status ACCENT_STATUS and the given admitted `source`, `equivalentTo` dropped (the row now has a
 * clip of its own), `synth` set when given. Never touches a 'recorded' or 'synthetic-reviewed' row and never writes a source outside
 * ACCENT_SOURCES. `updates` is a Map path -> { source, synth? }. Returns { marked, skipped, notFound }.
 */
export function markAccentRows(root, updates, { dry = false } = {}) {
  const res = { marked: [], skipped: [], notFound: [] };
  const pending = new Map(updates);
  for (const rel of MANIFEST_FILES) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) continue;
    const list = JSON.parse(fs.readFileSync(abs, 'utf8'));
    let changed = false;
    for (const e of list) {
      const u = pending.get(e.path);
      if (!u) continue;
      pending.delete(e.path);
      if (!isAccentSource(u.source)) throw new Error(`markAccentRows: ${u.source} is not an admitted accent source`);
      if (e.status === 'recorded' || e.status === 'synthetic-reviewed') { res.skipped.push(e.path); continue; }
      if (!ACCENT_TRADITIONS.includes(e.tradition)) { res.skipped.push(e.path); continue; }
      e.status = ACCENT_STATUS; e.source = u.source;
      delete e.equivalentTo; delete e.plays; // a clip of its own: no longer the Israeli stand-in
      if (u.synth && typeof u.synth === 'object') { delete e.synth; e.synth = u.synth; }
      res.marked.push(e.path); changed = true;
    }
    if (changed && !dry) fs.writeFileSync(abs, manifestText(list));
  }
  res.notFound = [...pending.keys()];
  return res;
}
