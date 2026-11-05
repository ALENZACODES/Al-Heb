#!/usr/bin/env node
// Ingest a batch of audio clips that came from an OUTSIDE generator (format and layout not known in advance).
//   node tools/audio/ingest.mjs <folder | extracted-zip folder | .zip> [options]          DRY RUN (default): report only, writes nothing
//   node tools/audio/ingest.mjs <input> --apply [options]                                  convert, write audio/, sidecars, manifest
// Options:
//   --root <repo>          repo root to read the manifest from and write to (default: this repo)
//   --listing <csv|json>   optional listing the generator supplied (columns/keys: file, id, voice, tradition, kind, path, text); see docs/audio/INGEST-CLIPS.md
//   --voice m|f  --tradition israeli|sephardi|ashkenazi  --kind word|line|prayer|...   default for a dimension the file name/folders do not state
//   --report <file>        also write the markdown report there (e.g. docs/audio/INGEST-REPORT.md)     --json <file>  full machine-readable result
//   --min-sec 0.2 --max-sec 20 --min-rate 16000 --max-clip-pct 0.5 --max-clip-kb 200 --budget-mb 300 --over-budget-ok
//   --strict               warnings reject a clip too       --replace  allow overwriting an existing synthetic clip       --allow-human-only-groups
//   --try-convert N        (dry run) convert N sample clips into a scratch folder to prove the pipeline and measure real sizes (default 3)
//   --jobs N  --max-list N  --batch-note "text"  --batch "label"  --no-delivery-check
// WHAT IT NEVER DOES: write status "recorded" (a human recording); touch an entry that is "recorded" or "synthetic-reviewed"; change anything without --apply;
// judge whether the speech is correct Hebrew (no tool can; a native listener must).
// Matching is by FILE NAME and FOLDERS to the manifest id (rules in matchFile / docs/audio/INGEST-CLIPS.md). Never guesses: unmatched and ambiguous files are reported.
// Delivery format = the repo's: mono 44.1 kHz 64 kbps MP3, loudness -16 LUFS, all metadata stripped (same encoder as tools/tts/post.mjs).
// Needs ffmpeg + ffprobe for anything but reading .wav files; without them the report says what could not be checked and --apply refuses to convert.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadManifestFull } from './manifest_io.mjs';
import { manifestFiles } from '../tts/manifest_update.mjs';
import { measure, encode, checkMp3, integratedLufs, TARGET } from '../tts/post.mjs';
import { parseCsv, parseArgs, stripNiqqud } from '../tts/lib.mjs';
import { HUMAN_ONLY_GROUPS } from './coverage.mjs';
import { computeManifest } from '../build-precache.mjs';
import { summaryOf } from './build_manifest.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUTSIDE_SOURCE = 'outside-synthetic';
export const INGEST_STATUS = 'synthetic-unreviewed'; // the only status this tool writes
const PROTECTED = new Set(['recorded', 'synthetic-reviewed']); // never overwritten
export const AUDIO_EXT = new Set(['.wav', '.mp3', '.ogg', '.oga', '.opus', '.m4a', '.aac', '.flac', '.webm']);
const TRAD_ALIAS = { israeli: ['israeli', 'isr', 'il'], sephardi: ['sephardi', 'sep', 'sefardi', 'sfaradi'], ashkenazi: ['ashkenazi', 'ash', 'ashk'] };
const VOICE_ALIAS = { m: ['m', 'male', 'man'], f: ['f', 'female', 'woman'] };
export const DEFAULTS = Object.freeze({
  minSec: 0.2, maxSec: 20, minRate: 16000, silenceDb: -50, silentPeakDb: -60, maxClipPct: 0.5, maxClipKb: 200, budgetMb: 300,
  maxGapSec: 1.0, maxEdgeSec: 2.0, maxSilenceRatio: 0.7, minLufs: -50, warnLufsLow: -40, warnLufsHigh: -8, maxInputMb: 50,
});

// ---------- tools ----------
const FF = () => process.env.FFMPEG || 'ffmpeg';
const FP = () => process.env.FFPROBE || 'ffprobe';
export function detectTools() {
  const ok = (c) => { try { return spawnSync(c, ['-version'], { encoding: 'utf8' }).status === 0; } catch { return false; } };
  return { ffmpeg: ok(FF()), ffprobe: ok(FP()) };
}
const runAsync = (cmd, args, binary = false) => new Promise((resolve) => {
  let p; try { p = spawn(cmd, args); } catch (e) { return resolve({ status: -1, stdout: binary ? Buffer.alloc(0) : '', stderr: String(e) }); }
  const out = [], err = [];
  p.stdout.on('data', (d) => out.push(d)); p.stderr.on('data', (d) => err.push(d));
  p.on('error', (e) => resolve({ status: -1, stdout: binary ? Buffer.alloc(0) : '', stderr: String(e) }));
  p.on('close', (status) => resolve({ status, stdout: binary ? Buffer.concat(out) : Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8') }));
});
async function pmap(items, jobs, fn) {
  const res = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(jobs, items.length || 1)) }, async () => { while (next < items.length) { const i = next++; res[i] = await fn(items[i], i); } }));
  return res;
}

// ---------- reading the input folder ----------
/** Walk without following symlinks; skips hidden files, __MACOSX and AppleDouble (._*) files. */
export function walkInput(dir) {
  const files = [], skipped = { symlinks: 0, hidden: 0 };
  const rec = (d) => {
    for (const n of fs.readdirSync(d).sort()) {
      const p = path.join(d, n);
      const st = fs.lstatSync(p);
      if (st.isSymbolicLink()) { skipped.symlinks++; continue; }
      if (n.startsWith('.') || n === '__MACOSX') { skipped.hidden++; continue; }
      if (st.isDirectory()) rec(p); else if (st.isFile()) files.push({ abs: p, rel: path.relative(dir, p).split(path.sep).join('/'), size: st.size });
    }
  };
  rec(dir);
  return { files, skipped };
}
/** A .zip is extracted with the system `unzip` into a fresh scratch folder (returned; the caller removes it). Throws honestly when unzip is missing. */
export function extractZip(zip) {
  const r = spawnSync('unzip', ['-v'], { encoding: 'utf8' });
  if (r.error || r.status !== 0) throw new Error('cannot read a .zip here: the `unzip` program is not installed. Extract the zip yourself and pass the folder.');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alef-ingest-zip-'));
  const x = spawnSync('unzip', ['-q', '-o', zip, '-d', dir], { encoding: 'utf8' });
  if (x.status !== 0 && x.status !== 1) { fs.rmSync(dir, { recursive: true, force: true }); throw new Error('unzip failed: ' + (x.stderr || '').slice(0, 200)); }
  return dir;
}

// ---------- matching ----------
export function buildIndex(entries) {
  const byId = new Map();
  for (const e of entries) { const k = e.id.toLowerCase(); (byId.get(k) || byId.set(k, []).get(k)).push(e); }
  const kinds = [...new Set(entries.map((e) => e.kind))];
  const tok = new Map(); // token -> [dimension, value]
  for (const [v, al] of Object.entries(TRAD_ALIAS)) for (const a of al) tok.set(a, ['tradition', v]);
  for (const [v, al] of Object.entries(VOICE_ALIAS)) for (const a of al) tok.set(a, ['voice', v]);
  for (const k of kinds) tok.set(k.toLowerCase(), ['kind', k]);
  return { byId, tok, kinds, entries };
}
const SEPS = ['_', '.', '-', ' '];
/** Candidate (id, tags) pairs for a base name (no extension): the whole name, or the name with known tokens (tradition, voice, kind, a leading running number) peeled from either end. */
export function nameCandidates(base, index) {
  const out = []; const seen = new Set();
  const visit = (s, tags, depth) => {
    s = s.replace(/^[_.\-\s]+|[_.\-\s]+$/g, '');
    const key = s + '|' + JSON.stringify(tags);
    if (!s || seen.has(key)) return; seen.add(key);
    if (index.byId.has(s)) out.push({ id: s, tags, depth });
    if (depth >= 4) return;
    for (const [t, [dim, val]] of index.tok) {
      if (tags[dim] && tags[dim] !== val) continue;
      for (const sep of SEPS) {
        if (s.endsWith(sep + t)) visit(s.slice(0, -(t.length + 1)), { ...tags, [dim]: val }, depth + 1);
        if (s.startsWith(t + sep)) visit(s.slice(t.length + 1), { ...tags, [dim]: val }, depth + 1);
      }
    }
    const m = /^(\d+)[_.\-\s]+(.+)$/.exec(s); if (m) visit(m[2], tags, depth + 1);
    const m2 = /^(.+?)[_.\-\s]+(\d+)$/.exec(s); if (m2 && !index.byId.has(s)) visit(m2[1], tags, depth + 1); // trailing running number, only when the whole name is not itself an id
  };
  visit(base, {}, 0);
  return out;
}
function dirTags(relDir, index) {
  const tags = {};
  for (const seg of relDir.toLowerCase().split('/').filter(Boolean)) { const t = index.tok.get(seg); if (t) tags[t[0]] = t[1]; } // the deepest segment wins
  return tags;
}
const DIMS = ['voice', 'tradition', 'kind'];
/**
 * Match one file to ONE manifest entry or say why not.
 * Rules (also in docs/audio/INGEST-CLIPS.md): case and extension are ignored; folders named like a voice (m, f, male, female), tradition (israeli, sephardi, ashkenazi, short forms isr, sep, ash)
 * or kind (word, line, ...) set that dimension; the same words peeled from either end of the file name (alef_sephardi_f.wav, israeli-m-r01-w1.mp3) do too; a leading or trailing running number
 * is ignored; what remains must be exactly a manifest id. A dimension still open after that is filled from --voice/--tradition/--kind; if several entries remain the file is AMBIGUOUS (never guessed).
 */
export function matchFile(rel, index, o = {}) {
  const ext = path.extname(rel); const base = path.basename(rel, ext).toLowerCase();
  const dir = path.dirname(rel) === '.' ? '' : path.dirname(rel);
  const row = o.listingRow || null;
  const folder = dirTags(dir, index);
  let cands;
  if (row && row.manifestPath) {
    const hit = index.entries.find((e) => e.path.toLowerCase() === row.manifestPath.toLowerCase());
    return hit ? { result: 'matched', entry: hit, how: 'listing path' } : { result: 'unmatched', reason: `listing path ${row.manifestPath} is not in the manifest` };
  }
  if (row && row.id) cands = index.byId.has(row.id.toLowerCase()) ? [{ id: row.id.toLowerCase(), tags: {}, depth: 0 }] : [];
  else cands = nameCandidates(base, index);
  if (!cands.length) return { result: 'unmatched', reason: row && row.id ? `listing id "${row.id}" is not a manifest id` : 'no manifest id found in the file name' };
  const ids = [...new Set(cands.map((c) => c.id))];
  if (ids.length > 1) return { result: 'ambiguous', reason: `file name fits several ids: ${ids.slice(0, 5).join(', ')}` };
  // merge tags from every way of reading the name for that id (a conflict between readings is ambiguity)
  let tags = {};
  const readings = [...new Map(cands.map((c) => [JSON.stringify(c.tags), c.tags])).values()].sort((a, b) => Object.keys(b).length - Object.keys(a).length);
  const nameTags = readings[0]; // the fullest reading of the name
  tags = { ...nameTags };
  for (const d of DIMS) {
    const fromRow = row && row[d];
    if (fromRow) { if (tags[d] && tags[d] !== fromRow) return { result: 'ambiguous', reason: `${d}: listing says ${fromRow}, file name says ${tags[d]}` }; tags[d] = fromRow; }
    if (folder[d]) { if (tags[d] && tags[d] !== folder[d]) return { result: 'ambiguous', reason: `${d}: folder says ${folder[d]}, file name says ${tags[d]}` }; tags[d] = folder[d]; }
    if (!tags[d] && o[d]) tags[d] = o[d];
  }
  const all = index.byId.get(ids[0]);
  const left = all.filter((e) => DIMS.every((d) => !tags[d] || e[d] === tags[d]));
  if (left.length === 1) return { result: 'matched', entry: left[0], how: Object.keys(tags).length ? 'name+tags' : 'name' };
  if (!left.length) return { result: 'unmatched', reason: `id "${ids[0]}" exists but not for ${DIMS.filter((d) => tags[d]).map((d) => `${d}=${tags[d]}`).join(', ')}` };
  const open = DIMS.filter((d) => new Set(left.map((e) => e[d])).size > 1);
  return { result: 'ambiguous', reason: `id "${ids[0]}" has ${left.length} entries; not stated: ${open.join(', ')} (use folders, name suffixes, a listing, or --${open[0]})` };
}

/** Listing file (csv or json). Keys are matched case-insensitively. Returns Map(lowercased relative path or base name -> row). */
export function loadListing(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  let rows;
  if (/\.json$/i.test(file)) {
    const j = JSON.parse(text);
    rows = Array.isArray(j) ? j : Object.entries(j).map(([k, v]) => (typeof v === 'string' ? { file: k, id: v } : { file: k, ...v }));
  } else rows = parseCsv(text);
  const pick = (r, names) => { for (const k of Object.keys(r)) if (names.includes(k.toLowerCase().trim())) return String(r[k] ?? '').trim(); return ''; };
  const map = new Map(); const rowsOut = [];
  for (const r of rows) {
    const f = pick(r, ['file', 'filename', 'file_name', 'audio_file', 'audio', 'wav', 'mp3', 'clip']);
    const p = pick(r, ['path', 'manifest_path']);
    const row = {
      file: f || (p && !/^audio\//i.test(p) ? p : ''), id: pick(r, ['id', 'clip_id', 'item_id', 'manifest_id', 'key']), manifestPath: /^audio\//i.test(p) ? p : '',
      voice: pick(r, ['voice']).toLowerCase(), tradition: pick(r, ['tradition']).toLowerCase(), kind: pick(r, ['kind', 'type']).toLowerCase(), text: pick(r, ['text', 'hebrew', 'transcript']),
    };
    row.voice = Object.entries(VOICE_ALIAS).find(([, al]) => al.includes(row.voice))?.[0] || row.voice;
    row.tradition = Object.entries(TRAD_ALIAS).find(([, al]) => al.includes(row.tradition))?.[0] || row.tradition;
    if (!row.file) continue;
    rowsOut.push(row);
    const k = row.file.replace(/\\/g, '/').toLowerCase();
    map.set(k, row); map.set(path.posix.basename(k), row);
  }
  return { map, rows: rowsOut };
}

// ---------- reading audio ----------
/** Minimal RIFF/WAVE reader (PCM 8/16/24/32 and float32). Returns samples as interleaved Int16. Also lists metadata chunks. */
export function readWav(buf) {
  if (buf.length < 44 || buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WAVE') return null;
  let pos = 12, fmt = null, data = null; const tags = [];
  while (pos + 8 <= buf.length) {
    const id = buf.toString('latin1', pos, pos + 4); let size = buf.readUInt32LE(pos + 4); const start = pos + 8;
    if (start + size > buf.length) size = buf.length - start;
    if (id === 'fmt ') { fmt = { tag: buf.readUInt16LE(start), channels: buf.readUInt16LE(start + 2), rate: buf.readUInt32LE(start + 4), bits: buf.readUInt16LE(start + 14) }; if (fmt.tag === 0xfffe && size >= 26) fmt.tag = buf.readUInt16LE(start + 24); }
    else if (id === 'data') data = buf.subarray(start, start + size);
    else if (id === 'LIST' || id === 'id3 ' || id === 'ID3 ' || id === 'bext' || id === 'iXML' || id === 'smpl' || id === 'cue ') tags.push(id.trim() + (id === 'LIST' ? '/' + buf.toString('latin1', start, start + 4) : ''));
    pos = start + size + (size & 1);
  }
  if (!fmt || !data || !fmt.channels || !fmt.rate) return null;
  const bytes = fmt.bits / 8; const n = Math.floor(data.length / bytes);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * bytes; let v;
    if (fmt.tag === 3 && fmt.bits === 32) v = Math.max(-1, Math.min(1, data.readFloatLE(o))) * 32767;
    else if (fmt.tag !== 1) return null;
    else if (fmt.bits === 8) v = (data[o] - 128) * 256;
    else if (fmt.bits === 16) v = data.readInt16LE(o);
    else if (fmt.bits === 24) v = data.readIntLE(o, 3) / 256;
    else if (fmt.bits === 32) v = data.readInt32LE(o) / 65536;
    else return null;
    out[i] = Math.max(-32768, Math.min(32767, Math.round(v)));
  }
  return { rate: fmt.rate, channels: fmt.channels, bits: fmt.bits, samples: out, tags, duration: n / fmt.channels / fmt.rate };
}

const dB = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
/** Peak, RMS, clipping and silence figures from interleaved 16-bit samples. */
export function metrics(samples, channels, rate, silenceDb = DEFAULTS.silenceDb) {
  const frames = Math.floor(samples.length / channels);
  let peak = 0, sumSq = 0, clipped = 0, clipRuns = 0; const run = new Array(channels).fill(0); const chPeak = new Array(channels).fill(0);
  const win = Math.max(1, Math.round(rate * 0.01)); const nWin = Math.ceil(frames / win); const winDb = new Array(nWin);
  for (let w = 0; w < nWin; w++) {
    let s = 0, c = 0;
    for (let f = w * win; f < Math.min(frames, (w + 1) * win); f++) for (let ch = 0; ch < channels; ch++) {
      const v = samples[f * channels + ch]; const a = Math.abs(v);
      if (a > peak) peak = a; if (a > chPeak[ch]) chPeak[ch] = a;
      s += v * v; c++;
      if (a >= 32700) { clipped++; if (++run[ch] === 3) clipRuns++; } else run[ch] = 0;
    }
    sumSq += s; winDb[w] = c ? dB(Math.sqrt(s / c) / 32768) : -Infinity;
  }
  const total = frames * channels;
  const silent = winDb.map((x) => x < silenceDb);
  const first = silent.indexOf(false), last = silent.lastIndexOf(false);
  let maxGap = 0, cur = 0;
  if (first >= 0) for (let i = first; i <= last; i++) { if (silent[i]) { cur++; maxGap = Math.max(maxGap, cur); } else cur = 0; }
  const sec = (n) => n * win / rate;
  return {
    frames, duration: frames / rate, peakDb: dB(peak / 32768), rmsDb: dB(Math.sqrt(sumSq / Math.max(1, total)) / 32768),
    channelPeakDb: chPeak.map((p) => dB(p / 32768)), clippedPct: total ? (clipped / total) * 100 : 0, clipRuns,
    allSilent: first < 0, leadSec: first < 0 ? sec(nWin) : sec(first), trailSec: first < 0 ? 0 : sec(nWin - 1 - last), maxGapSec: sec(maxGap), silenceRatio: nWin ? silent.filter(Boolean).length / nWin : 1,
  };
}

/** Everything the checker can learn about one input file. Never throws. */
export async function analyzeFile(abs, tools, o = {}) {
  const r = { analysed: false, notes: [], tags: [], codec: null, rate: null, channels: null, duration: null, lufs: null, m: null, ext: path.extname(abs).toLowerCase() };
  let buf = null;
  const size = fs.statSync(abs).size; r.size = size;
  if (size > (o.maxInputMb ?? DEFAULTS.maxInputMb) * 1048576) { r.error = `file is ${(size / 1048576).toFixed(0)} MB; not analysed`; return r; }
  let pcm = null;
  if (tools.ffprobe && tools.ffmpeg && !o.noFfmpeg) {
    const pr = await runAsync(FP(), ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', abs]);
    let j = null; try { j = JSON.parse(pr.stdout); } catch { /* unreadable */ }
    if (pr.status !== 0 || !j) { r.error = 'ffprobe cannot read this file (not audio, truncated or unsupported)'; return r; }
    const a = (j.streams || []).find((s) => s.codec_type === 'audio');
    if (!a) { r.error = 'no audio stream'; return r; }
    r.codec = a.codec_name; r.rate = Number(a.sample_rate); r.channels = Number(a.channels);
    r.duration = Number(j.format?.duration ?? a.duration); if (!Number.isFinite(r.duration)) r.duration = null;
    r.tags = [...Object.keys(j.format?.tags || {}), ...Object.keys(a.tags || {})].map((k) => k.toLowerCase());
    const extra = (j.streams || []).filter((s) => s.codec_type !== 'audio').length; if (extra) r.tags.push(`${extra} non-audio stream(s) (cover art or data)`);
    r.tags = [...new Set(r.tags)];
    if (r.duration != null && r.duration > Math.max(120, (o.maxSec ?? DEFAULTS.maxSec) * 3)) { r.analysed = true; r.notes.push('very long file; levels not measured'); return r; }
    const dec = await runAsync(FF(), ['-hide_banner', '-nostats', '-v', 'info', '-i', abs, '-vn', '-af', 'ebur128', '-f', 's16le', '-acodec', 'pcm_s16le', '-'], true);
    if (dec.status !== 0 || !dec.stdout.length) { r.error = 'ffmpeg cannot decode this file'; return r; }
    pcm = new Int16Array(dec.stdout.buffer.slice(dec.stdout.byteOffset, dec.stdout.byteOffset + (dec.stdout.length & ~1)));
    const lm = /Integrated loudness:\s*\n\s*I:\s*(-?[\d.]+|-inf) LUFS/.exec(dec.stderr);
    r.lufs = lm ? (lm[1] === '-inf' ? -Infinity : Number(lm[1])) : null;
  } else {
    if (r.ext !== '.wav') { r.notes.push(`not analysed: ${r.ext} needs ffmpeg/ffprobe (only .wav is read without them)`); return r; }
    buf = fs.readFileSync(abs); const w = readWav(buf);
    if (!w) { r.error = 'not a PCM or float WAV that the built-in reader understands'; return r; }
    r.codec = 'wav'; r.rate = w.rate; r.channels = w.channels; r.duration = w.duration; r.tags = w.tags; pcm = w.samples;
    r.notes.push('loudness (LUFS) not measured without ffmpeg');
  }
  r.m = metrics(pcm, r.channels, r.rate, o.silenceDb ?? DEFAULTS.silenceDb);
  if (r.duration == null || Math.abs(r.duration - r.m.duration) > 0.05) r.duration = r.m.duration; // trust the decoded length
  r.analysed = true;
  return r;
}

/** Turn the analysis into rejections (fails) and warnings. */
export function judge(a, entry, listingText, o = {}) {
  const t = { ...DEFAULTS, ...o }; const fails = [], warns = [];
  if (a.error) return { fails: [a.error], warns };
  if (!a.analysed) return { fails, warns, notAnalysed: true };
  if (!a.m) return { fails, warns };
  if (a.duration < t.minSec) fails.push(`too short (${a.duration.toFixed(2)} s < ${t.minSec} s)`);
  if (a.duration > t.maxSec) fails.push(`too long (${a.duration.toFixed(1)} s > ${t.maxSec} s)`);
  if (a.rate < 8000) fails.push(`sample rate ${a.rate} Hz is too low`); else if (a.rate < t.minRate) warns.push(`low sample rate (${a.rate} Hz)`);
  if (a.channels > 2) warns.push(`${a.channels} channels (will be mixed to mono)`);
  if (a.m.allSilent || a.m.peakDb < t.silentPeakDb) fails.push(`silent (peak ${fmtDb(a.m.peakDb)})`);
  else {
    if (a.m.clippedPct > t.maxClipPct) fails.push(`clipped (${a.m.clippedPct.toFixed(2)}% of samples at full scale)`);
    else if (a.m.clipRuns > 0) warns.push(`some clipping (${a.m.clipRuns} run(s) at full scale)`);
    if (a.lufs !== null && a.lufs < t.minLufs) fails.push(`inaudibly quiet (${fmtDb(a.lufs)} LUFS)`);
    else if (a.lufs !== null && (a.lufs < t.warnLufsLow || a.lufs > t.warnLufsHigh)) warns.push(`unusual loudness (${a.lufs.toFixed(1)} LUFS; it is normalised on conversion)`);
    if (a.m.leadSec > t.maxEdgeSec || a.m.trailSec > t.maxEdgeSec) warns.push(`long silence at the edge (${a.m.leadSec.toFixed(1)} s start, ${a.m.trailSec.toFixed(1)} s end; trimmed on conversion)`);
    if (a.m.maxGapSec > t.maxGapSec) warns.push(`silent gap of ${a.m.maxGapSec.toFixed(1)} s inside the clip (two clips joined, or speech cut?)`);
    if (a.m.silenceRatio > t.maxSilenceRatio) warns.push(`${Math.round(a.m.silenceRatio * 100)}% of the clip is silence`);
    if (a.channels === 2 && a.m.channelPeakDb.length === 2 && Math.abs(a.m.channelPeakDb[0] - a.m.channelPeakDb[1]) > 30) warns.push('one stereo channel is almost silent');
  }
  const letters = stripNiqqud(entry ? entry.text : '').replace(/\s/g, '').length;
  if (letters && a.duration > 0 && a.duration > 0.2) { // a rough length-for-text sanity check, NOT a correctness check
    const per = a.m && !a.m.allSilent ? (a.duration - a.m.leadSec - a.m.trailSec) / letters : a.duration / letters;
    if (per < 0.04) warns.push(`very short for its text (${per.toFixed(2)} s per letter; spoken text cut off?)`);
    else if (per > 1.2) warns.push(`very long for its text (${per.toFixed(2)} s per letter; extra speech or padding?)`);
  }
  if (listingText && /[א-ת]/.test(listingText) && entry && /[א-ת]/.test(entry.text) && stripNiqqud(listingText) !== stripNiqqud(entry.text))
    fails.push('the listing text does not match the manifest text (wrong clip for this id?)');
  return { fails, warns };
}
const fmtDb = (x) => (x === -Infinity ? '-inf' : x.toFixed(1));

// ---------- delivery checks (precache / service worker) ----------
/** The clips must stay out of the precache and be cached at runtime only. Read from the real build script and sw.js, not assumed. */
export function deliveryAudit(root = ROOT) {
  const res = { ok: true, items: [] };
  const add = (ok, text) => { res.items.push({ ok, text }); if (!ok) res.ok = false; };
  try {
    const m = computeManifest(root);
    const bad = [...m.files, ...m.onDemand].filter((f) => /^audio\//.test(f) || /\.(mp3|wav|ogg|m4a|opus)$/i.test(f));
    add(bad.length === 0, bad.length ? `tools/build-precache.mjs would put ${bad.length} audio file(s) in the precache (first: ${bad[0]})` : `tools/build-precache.mjs computeManifest(): ${m.files.length} precached + ${m.onDemand.length} on-demand files, none under audio/ and none with an audio extension`);
  } catch (e) { add(false, 'could not run computeManifest: ' + e.message); }
  const pm = path.join(root, 'precache-manifest.js');
  if (fs.existsSync(pm)) { const hit = /["']audio\//.test(fs.readFileSync(pm, 'utf8')); add(!hit, hit ? 'precache-manifest.js lists an audio/ file' : 'precache-manifest.js (as committed) lists no audio/ file'); }
  const swp = path.join(root, 'sw.js');
  if (fs.existsSync(swp)) {
    const sw = fs.readFileSync(swp, 'utf8');
    const m1 = /const AUDIO = \/(.+)\/([a-z]*);/.exec(sw); const m2 = /const RUNTIME = '([^']+)'/.exec(sw);
    let matches = false; try { matches = !!m1 && new RegExp(m1[1], m1[2]).test('/audio/m/israeli/word/x.mp3'); } catch { /* */ }
    add(matches && !!m2 && /AUDIO\.test\(url\.pathname\) \? RUNTIME/.test(sw), matches && m2 ? `sw.js: .mp3 matches its AUDIO pattern and is cached cache-first at runtime in "${m2[1]}", filled only when a clip is requested` : 'sw.js: could not confirm that audio files are cached at runtime only');
    res.items.push({ ok: true, text: /headers\.has\('range'\)/.test(sw) ? 'sw.js lets Range requests go to the network uncached, so a browser that plays audio with Range requests may never fill the cache (not tested here)' : 'sw.js has no Range-request bypass' });
  } else add(false, 'sw.js not found');
  const bs = path.join(root, 'tools', 'build-static.mjs');
  if (fs.existsSync(bs)) res.items.push({ ok: true, text: /SHIP_DIRS = \[[^\]]*'audio'/.test(fs.readFileSync(bs, 'utf8')) ? 'tools/build-static.mjs ships audio/ in the static site folder (clips are served, not precached): hosting size counts them' : 'tools/build-static.mjs does not list audio/ in SHIP_DIRS' });
  return res;
}

// ---------- the run ----------
const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function dirBytes(dir) { let n = 0; if (!fs.existsSync(dir)) return 0; for (const x of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, x.name); if (x.isDirectory()) n += dirBytes(p); else if (/\.(mp3|m4a|ogg|wav)$/i.test(x.name)) n += fs.statSync(p).size; } return n; }
const estBytes = (a) => Math.max(0, Math.round(((a?.duration ?? 0) - (a?.m ? Math.min(a.m.leadSec, 99) + Math.min(a.m.trailSec, 99) : 0) + 0.13) * 8000)); // 64 kbps = 8000 B/s

/**
 * Core pipeline. opts: { input, root, apply, listing, voice, tradition, kind, thresholds..., jobs, tryConvert, batch, batchNote, strict, replace, allowHumanOnly, now }
 * Returns a result object (see report()). Writes nothing unless opts.apply.
 */
export async function run(opts) {
  const root = path.resolve(opts.root || ROOT);
  const t = { ...DEFAULTS, ...(opts.thresholds || {}) };
  const tools = opts.tools || detectTools(); if (opts.noFfmpeg) { tools.ffmpeg = false; tools.ffprobe = false; }
  const res = { root, input: opts.input, apply: !!opts.apply, tools, thresholds: t, files: [], counts: {}, ignored: {}, listingProblems: [], skipped: {}, errors: [], applied: 0, convertSample: null, delivery: null };
  let input = path.resolve(opts.input), scratch = null;
  if (!fs.existsSync(input)) throw new Error(`input not found: ${opts.input}`);
  if (fs.statSync(input).isFile()) { if (!/\.zip$/i.test(input)) throw new Error('input must be a folder or a .zip'); scratch = extractZip(input); input = scratch; }
  try {
    const entries = loadManifestFull(root); const index = buildIndex(entries);
    const { files, skipped } = walkInput(input); res.skipped = skipped;
    const audio = files.filter((f) => AUDIO_EXT.has(path.extname(f.rel).toLowerCase()));
    for (const f of files) if (!AUDIO_EXT.has(path.extname(f.rel).toLowerCase())) { const e = path.extname(f.rel).toLowerCase() || '(none)'; res.ignored[e] = (res.ignored[e] || 0) + 1; }
    let listing = null;
    if (opts.listing) {
      listing = loadListing(path.resolve(opts.listing)); res.listingRows = listing.rows.length;
      const have = new Set(audio.flatMap((f) => [f.rel.toLowerCase(), path.posix.basename(f.rel).toLowerCase()]));
      for (const r of listing.rows) if (!have.has(r.file.replace(/\\/g, '/').toLowerCase()) && !have.has(path.posix.basename(r.file).toLowerCase())) res.listingProblems.push(`listed but no such audio file: ${r.file}`);
    }
    // 1. match by name
    const hashes = new Map();
    for (const f of audio) {
      const row = listing ? (listing.map.get(f.rel.toLowerCase()) || listing.map.get(path.posix.basename(f.rel).toLowerCase())) : null;
      const m = matchFile(f.rel, index, { voice: opts.voice, tradition: opts.tradition, kind: opts.kind, listingRow: row });
      const rec = { rel: f.rel, abs: f.abs, size: f.size, ...m, fails: [], warns: [], state: m.result, listingText: row?.text || '' };
      if (m.result === 'matched') {
        const e = m.entry; rec.target = e.path;
        if (PROTECTED.has(e.status)) { rec.state = 'protected'; rec.reason = `entry is "${e.status}"; never overwritten`; }
        else if (HUMAN_ONLY_GROUPS.has(e.group) && !opts.allowHumanOnly) { rec.state = 'human-only'; rec.reason = `group "${e.group}" (letters, vowels, syllables) is human-recording only`; }
        else if ((isSyn(e.status) || fs.existsSync(path.join(root, e.path))) && !opts.replace) { rec.state = 'exists'; rec.reason = `already has ${isSyn(e.status) ? 'a synthetic clip' : 'a file'}; use --replace to overwrite a synthetic one`; }
      }
      res.files.push(rec);
    }
    // 2. two files for one entry
    const byTarget = new Map();
    for (const r of res.files) if (r.target && r.state === 'matched') (byTarget.get(r.target) || byTarget.set(r.target, []).get(r.target)).push(r);
    for (const [tg, rs] of byTarget) if (rs.length > 1) for (const r of rs) { r.state = 'duplicate-target'; r.reason = `${rs.length} files match ${tg}: ${rs.map((x) => x.rel).slice(0, 4).join(', ')}`; }
    // 3. analyse matched ones
    const todo = res.files.filter((r) => r.state === 'matched');
    const jobs = opts.jobs || Math.max(1, Math.floor(os.cpus().length / 2));
    await pmap(todo, jobs, async (r) => {
      r.a = await analyzeFile(r.abs, tools, { ...t, noFfmpeg: opts.noFfmpeg });
      const j = judge(r.a, r.entry || findEntry(entries, r.target), r.listingText, t);
      r.fails = j.fails; r.warns = j.warns; r.notAnalysed = !!j.notAnalysed;
      r.sha = sha256(r.abs);
      r.estBytes = estBytes(r.a);
      if (r.estBytes > t.maxClipKb * 1024 && !r.fails.length) r.fails.push(`output would be about ${(r.estBytes / 1024).toFixed(0)} KB (> ${t.maxClipKb} KB per clip)`);
    });
    const bySha = new Map();
    for (const r of todo) if (r.sha) (bySha.get(r.sha) || bySha.set(r.sha, []).get(r.sha)).push(r);
    for (const rs of bySha.values()) if (rs.length > 1) for (const r of rs) r.warns.push(`byte-identical to ${rs.length - 1} other file(s) (e.g. ${rs.find((x) => x !== r).rel}); a generator repeating one clip?`);
    for (const r of todo) { if (r.fails.length) { r.state = 'rejected'; } else if (opts.strict && r.warns.length) { r.state = 'rejected'; r.fails.push('--strict: ' + r.warns.join('; ')); } else if (r.notAnalysed) r.state = tools.ffmpeg ? 'rejected' : 'unchecked'; else r.state = 'ready'; }
    for (const r of todo) if (r.state === 'rejected' && !r.fails.length) r.fails.push('could not be analysed');
    // 4. budget
    const ready = res.files.filter((r) => r.state === 'ready' || r.state === 'unchecked');
    const newBytes = ready.reduce((n, r) => n + (r.estBytes || 0), 0);
    const existing = dirBytes(path.join(root, 'audio'));
    res.budget = { budgetMb: t.budgetMb, existingBytes: existing, newEstimatedBytes: newBytes, totalMb: (existing + newBytes) / 1048576, over: (existing + newBytes) / 1048576 > t.budgetMb, perClipMaxKb: t.maxClipKb,
      avgKb: ready.length ? newBytes / ready.length / 1024 : 0, fullManifestEstimateMb: ready.length ? (newBytes / ready.length) * entries.length / 1048576 : null, entries: entries.length };
    // 5. dry-run conversion sample
    if (!opts.apply && tools.ffmpeg && tools.ffprobe && (opts.tryConvert ?? 3) > 0) {
      const readyOnes = res.files.filter((r) => r.state === 'ready'); const n = Math.min(opts.tryConvert ?? 3, readyOnes.length);
      if (n) {
        const sc = fs.mkdtempSync(path.join(os.tmpdir(), 'alef-ingest-try-')); const sample = []; let bytes = 0, estB = 0;
        try {
          for (let i = 0; i < n; i++) {
            const r = readyOnes[Math.floor((i * readyOnes.length) / n)]; const out = path.join(sc, `${i}.mp3`);
            try { await encode(r.abs, out, await measure(r.abs)); const c = checkMp3(out); const lu = integratedLufs(out); sample.push({ ok: c.ok, problems: c.problems, lufs: lu, bytes: fs.statSync(out).size }); bytes += fs.statSync(out).size; estB += r.estBytes; }
            catch (e) { sample.push({ ok: false, problems: [e.message.slice(0, 160)] }); }
          }
        } finally { fs.rmSync(sc, { recursive: true, force: true }); }
        res.convertSample = { n, ok: sample.filter((s) => s.ok).length, sample, measuredBytes: bytes, estimatedBytes: estB };
      }
    }
    // 6. delivery audit
    if (!opts.noDeliveryCheck) res.delivery = deliveryAudit(root);
    // 7. apply
    if (opts.apply) await applyAll(res, entries, root, opts, tools, jobs, t);
    // counts
    for (const r of res.files) res.counts[r.state] = (res.counts[r.state] || 0) + 1;
    res.counts.audioFiles = audio.length; res.counts.otherFiles = files.length - audio.length;
    res.exitCode = (res.budget.over && !opts.overBudgetOk) || (res.delivery && !res.delivery.ok) || res.errors.length || (res.convertSample && res.convertSample.ok < res.convertSample.n) ? 1 : 0;
    return res;
  } finally { if (scratch) fs.rmSync(scratch, { recursive: true, force: true }); }
}
const isSyn = (s) => s === 'tts' || s === 'synthetic-unreviewed' || s === 'synthetic-reviewed';
const findEntry = (entries, p) => entries.find((e) => e.path === p);

async function applyAll(res, entries, root, opts, tools, jobs, t) {
  const ready = res.files.filter((r) => r.state === 'ready');
  if (!tools.ffmpeg || !tools.ffprobe) { res.errors.push('--apply needs ffmpeg and ffprobe (to convert and strip metadata); nothing was written'); return; }
  if (res.budget.over && !opts.overBudgetOk) { res.errors.push(`--apply refused: total ${res.budget.totalMb.toFixed(0)} MB would exceed the ${t.budgetMb} MB budget (raise --budget-mb or pass --over-budget-ok after deciding where the clips will be hosted)`); return; }
  if (res.delivery && !res.delivery.ok) { res.errors.push('--apply refused: the delivery check failed (clips could end up in the precache); see the report'); return; }
  const now = (opts.now || (() => new Date().toISOString()))();
  const files = manifestFiles(root).map((rel) => ({ rel, list: JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')), changed: false }));
  const byPath = new Map(); for (const f of files) for (const e of f.list) byPath.set(e.path, { e, f });
  const done = [];
  await pmap(ready, jobs, async (r) => {
    const hit = byPath.get(r.target); if (!hit) { r.state = 'rejected'; r.fails.push('entry vanished from the manifest'); return; }
    const dst = path.join(root, r.target); const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alef-ingest-'));
    const tmp = path.join(tmpDir, 'clip.mp3');
    try {
      await encode(r.abs, tmp, await measure(r.abs));
      const c = checkMp3(tmp);
      if (!c.ok) throw new Error('output failed the metadata check: ' + c.problems.join('; '));
      if (!(c.info.duration >= t.minSec)) throw new Error(`converted clip is only ${c.info.duration} s`);
      const size = fs.statSync(tmp).size; if (size > t.maxClipKb * 1024) throw new Error(`converted clip is ${(size / 1024).toFixed(0)} KB (> ${t.maxClipKb} KB)`);
      const lu = integratedLufs(tmp); r.outLufs = lu; r.outBytes = size; r.outSec = c.info.duration;
      if (lu !== null && Math.abs(lu - TARGET.I) > 3) r.warns.push(`loudness after conversion ${lu.toFixed(1)} LUFS (target ${TARGET.I})`);
      fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(tmp, dst);
      const synth = { origin: OUTSIDE_SOURCE, reviewed: false, redistributionCleared: false, licence: 'unknown: not cleared', batch: opts.batch || null, note: opts.batchNote || null, inputSha256: r.sha, ingestedAt: now, ingestedBy: 'tools/audio/ingest.mjs' };
      fs.writeFileSync(`${dst}.meta.json`, JSON.stringify({
        status: INGEST_STATUS, source: OUTSIDE_SOURCE, synth, reviewed: false, redistributionCleared: false,
        note: 'Synthetic clip from an outside source (provenance and licence not verified). Not a human recording. No human has listened to it; whether the speech is correct Hebrew is unknown. Converted by tools/audio/ingest.mjs (original file name and tags not kept).',
      }, null, 1) + '\n');
      hit.e.status = INGEST_STATUS; hit.e.source = OUTSIDE_SOURCE; hit.e.synth = synth; hit.f.changed = true; // synth last, as tools/tts/manifest_update.mjs and build_manifest.mjs do
      r.state = 'applied'; done.push(r); res.applied++;
    } catch (e) { r.state = 'rejected'; r.fails.push('conversion failed: ' + e.message.slice(0, 200)); try { fs.rmSync(dst, { force: true }); } catch { /* */ } }
    finally { fs.rmSync(tmpDir, { recursive: true, force: true }); }
  });
  for (const f of files) if (f.changed) fs.writeFileSync(path.join(root, f.rel), JSON.stringify(f.list, null, 1) + '\n');
  if (done.length) { // keep the tiny precached summary in step with the manifest, as build_manifest.mjs would
    const all = files.flatMap((f) => f.list); const sp = path.join(root, 'data/audio/summary.json');
    if (fs.existsSync(sp)) fs.writeFileSync(sp, JSON.stringify(summaryOf(all)) + '\n');
  }
}

// ---------- report ----------
const mb = (b) => (b / 1048576).toFixed(1);
export function report(res, o = {}) {
  const maxList = o.maxList ?? 200; const L = [];
  const by = (s) => res.files.filter((r) => r.state === s);
  const list = (title, rows, fmt) => { if (!rows.length) return; L.push(`### ${title} (${rows.length})`, ''); for (const r of rows.slice(0, maxList)) L.push(`- ${fmt(r)}`); if (rows.length > maxList) L.push(`- ... ${rows.length - maxList} more (see --json)`); L.push(''); };
  L.push(`# Audio ingest report (${res.apply ? 'APPLIED' : 'DRY RUN: nothing was written'})`, '');
  L.push(`- input: \`${path.basename(res.input)}\`; repo root: \`${res.root}\``);
  L.push(`- tools: ffmpeg ${res.tools.ffmpeg ? 'found' : 'NOT found'}, ffprobe ${res.tools.ffprobe ? 'found' : 'NOT found'}${res.tools.ffmpeg && res.tools.ffprobe ? '' : ' (non-WAV files cannot be analysed or converted; levels/loudness are not measured; --apply will refuse)'}`);
  L.push(`- audio files found: ${res.counts.audioFiles}; other files ignored: ${res.counts.otherFiles}${Object.keys(res.ignored).length ? ' (' + Object.entries(res.ignored).map(([k, v]) => `${k} x${v}`).join(', ') + ')' : ''}${res.skipped.symlinks || res.skipped.hidden ? `; skipped ${res.skipped.symlinks} symlink(s), ${res.skipped.hidden} hidden` : ''}`);
  if (res.listingRows != null) L.push(`- listing file: ${res.listingRows} row(s)`);
  L.push('', '## Summary', '', '| state | files | meaning |', '|---|---:|---|');
  const meaning = { ready: 'matched, passed every check; would be written with --apply', applied: 'converted and written, manifest updated', unchecked: 'matched but could not be analysed (no ffmpeg); not written', rejected: 'matched but failed a check', unmatched: 'no manifest id found', ambiguous: 'several possible entries; never guessed', 'duplicate-target': 'two or more files for one entry', exists: 'entry already has a clip', protected: 'entry is a human or reviewed clip', 'human-only': 'letters/vowels/syllables are human-recording only' };
  for (const [s, m] of Object.entries(meaning)) if (res.counts[s]) L.push(`| ${s} | ${res.counts[s]} | ${m} |`);
  L.push('');
  const matched = res.files.filter((r) => r.target);
  if (matched.length) {
    const cnt = {}; for (const r of matched) { const k = r.target.split('/').slice(1, 4).join('/'); cnt[k] = (cnt[k] || 0) + 1; }
    L.push('Matched by voice/tradition/kind: ' + Object.entries(cnt).sort().map(([k, v]) => `${k} ${v}`).join('; '), '');
  }
  list('Rejected', by('rejected'), (r) => `\`${r.rel}\` -> ${r.target}: ${r.fails.join('; ')}`);
  list('Ambiguous', by('ambiguous'), (r) => `\`${r.rel}\`: ${r.reason}`);
  list('Unmatched', by('unmatched'), (r) => `\`${r.rel}\`: ${r.reason}`);
  list('Several files for one entry', by('duplicate-target'), (r) => `\`${r.rel}\`: ${r.reason}`);
  list('Not written (protected, existing or human-only)', [...by('protected'), ...by('exists'), ...by('human-only')], (r) => `\`${r.rel}\` -> ${r.target}: ${r.reason}`);
  list('Could not be analysed', by('unchecked'), (r) => `\`${r.rel}\` -> ${r.target}: ${(r.a?.notes || []).join('; ')}`);
  if (res.listingProblems.length) { L.push(`### Listing problems (${res.listingProblems.length})`, ''); for (const p of res.listingProblems.slice(0, maxList)) L.push(`- ${p}`); L.push(''); }
  const warned = res.files.filter((r) => r.warns.length && (r.state === 'ready' || r.state === 'applied'));
  list('Warnings on clips that passed (listen to these first)', warned, (r) => `\`${r.rel}\`: ${r.warns.join('; ')}`);
  const ok = res.files.filter((r) => r.a && r.a.analysed && r.a.m);
  if (ok.length) {
    const stats = (f) => { const v = ok.map(f).filter(Number.isFinite).sort((a, b) => a - b); return v.length ? `min ${v[0].toFixed(2)}, median ${v[Math.floor(v.length / 2)].toFixed(2)}, max ${v[v.length - 1].toFixed(2)}` : 'n/a'; };
    L.push('## Input measurements (analysed clips)', '', `- duration s: ${stats((r) => r.a.duration)}`, `- sample rates: ${[...new Set(ok.map((r) => r.a.rate))].join(', ')} Hz; channels: ${[...new Set(ok.map((r) => r.a.channels))].join(', ')}; codecs: ${[...new Set(ok.map((r) => r.a.codec))].join(', ')}`);
    if (ok.some((r) => r.a.lufs != null)) L.push(`- integrated loudness LUFS: ${stats((r) => r.a.lufs)}`);
    L.push(`- peak dBFS: ${stats((r) => r.a.m.peakDb)}`, `- clips with metadata/tags that conversion strips: ${ok.filter((r) => r.a.tags.length).length}`, '');
  }
  const b = res.budget;
  L.push('## Size budget', '', `- already under audio/: ${mb(b.existingBytes)} MB; new clips (${res.apply ? 'written' : 'estimated at 64 kbps'}): ${mb(b.newEstimatedBytes)} MB; total ${b.totalMb.toFixed(1)} MB against a budget of ${b.budgetMb} MB: **${b.over ? 'OVER BUDGET' : 'within budget'}**`);
  if (b.avgKb) L.push(`- average ${b.avgKb.toFixed(1)} KB per clip; if all ${b.entries} manifest entries had a clip of this size, about ${b.fullManifestEstimateMb.toFixed(0)} MB (a projection, not a measurement)`);
  L.push(`- per-clip cap ${b.perClipMaxKb} KB. The ${b.budgetMb} MB budget is this tool's default, not a hosting-platform limit; committing clips to git makes the repository history grow by that much permanently.`, '');
  if (res.convertSample) { const c = res.convertSample; L.push('## Conversion sample (scratch folder, deleted)', '', `- ${c.ok} of ${c.n} sample clips converted and passed the metadata check (mono 44.1 kHz 64 kbps MP3, no tags, no encoder string); measured ${c.measuredBytes} B against estimated ${c.estimatedBytes} B; loudness after: ${c.sample.map((s) => (s.lufs == null ? 'n/a' : s.lufs.toFixed(1))).join(', ')} LUFS (target ${TARGET.I})`); for (const s of c.sample) if (!s.ok) L.push(`- FAILED sample: ${s.problems.join('; ')}`); L.push(''); }
  if (res.delivery) { L.push('## Delivery checks (precache and service worker)', ''); for (const i of res.delivery.items) L.push(`- ${i.ok ? 'OK' : 'PROBLEM'}: ${i.text}`); L.push(''); }
  for (const e of res.errors) L.push(`**ERROR:** ${e}`, '');
  if (res.apply) L.push(`## Applied`, '', `- ${res.applied} clip(s) written to audio/, each with a \`.meta.json\` sidecar; manifest entries set to status \`${INGEST_STATUS}\`, source \`${OUTSIDE_SOURCE}\`, provenance in \`synth\` (not reviewed, licence not cleared). Next: \`node tools/audio/build_manifest.mjs --check\`, \`node tools/build-precache.mjs\`, run the tests, commit.`, '');
  else L.push('## Next', '', 'Nothing was changed. Fix or accept the lists above, then re-run with `--apply`.', '');
  L.push('## What this report cannot tell you', '', '- Whether the speech is correct Hebrew, the right word, the right vowels or the right tradition. Only a native listener can judge that. Every clip stays `synthetic-unreviewed` until a person has listened.', '- Who made the clips, under what terms, and whether they may be redistributed or sold. The tool records `outside generator, not reviewed, licence not cleared`; get the terms in writing.', '- Voice quality, accent and naturalness. The length-for-text check is a rough sanity filter only.');
  return L.join('\n') + '\n';
}

// ---------- CLI ----------
export async function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv, ['apply', 'strict', 'replace', 'allow-human-only-groups', 'over-budget-ok', 'no-delivery-check', 'help']);
  if (a.help || !a._.length) { console.log('usage: node tools/audio/ingest.mjs <folder|.zip> [--apply] [--listing file] [--voice m|f] [--tradition t] [--kind k] [--report file] [--json file] ... (see header of this file)'); process.exitCode = a.help ? 0 : 2; return; }
  const num = (k) => (a[k] != null ? Number(a[k]) : undefined);
  const th = {}; for (const [k, f] of [['minSec', 'min-sec'], ['maxSec', 'max-sec'], ['minRate', 'min-rate'], ['maxClipPct', 'max-clip-pct'], ['maxClipKb', 'max-clip-kb'], ['budgetMb', 'budget-mb']]) if (num(f) != null) th[k] = num(f);
  let res;
  try {
    res = await run({ input: a._[0], root: a.root, apply: !!a.apply, listing: a.listing, voice: a.voice, tradition: a.tradition, kind: a.kind, thresholds: th, jobs: num('jobs'), tryConvert: num('try-convert'),
      strict: !!a.strict, replace: !!a.replace, allowHumanOnly: !!a['allow-human-only-groups'], overBudgetOk: !!a['over-budget-ok'], noDeliveryCheck: !!a['no-delivery-check'], batch: a.batch, batchNote: a['batch-note'] });
  } catch (e) { console.error('ingest: ' + e.message); process.exitCode = 2; return; }
  const text = report(res, { maxList: num('max-list') });
  console.log(text);
  if (a.report) fs.writeFileSync(path.resolve(a.report), text);
  if (a.json) fs.writeFileSync(path.resolve(a.json), JSON.stringify({ ...res, files: res.files.map(({ abs, entry, a: an, ...r }) => ({ ...r, analysis: an ? { ...an, m: an.m } : null })) }, null, 1) + '\n');
  process.exitCode = res.exitCode;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
