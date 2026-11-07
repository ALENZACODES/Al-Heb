#!/usr/bin/env node
// Check and (optionally) ingest a zip or folder exported by tools/record-kit/recorder.html.
//   node tools/record-kit/ingest.mjs <export.zip|folder> [--root <repo>] [--work ~/alef-record-work] [--report report.csv] [--apply]
// DRY RUN BY DEFAULT: validates and prints what would change; writes nothing (apart from an optional --report CSV).
// Validation per clip: name follows audio/<m|f>/<tradition>/<kind>/<id>.<ext>; the path (as .mp3) exists in data/audio/manifest*.json; the file
// decodes; duration 0.25 to 30 s; no clipping (peak >= -0.1 dBFS) and not silent (errors reject the clip); quiet or a mismatch with the page's
// manifest.csv (duration, peak, voice, tradition) is a warning. consent.json must exist with every required box ticked, else nothing is accepted.
// --apply: runs the same chain as tools/tts/post.mjs (trim to 80 ms head and tail, two-pass loudnorm to -16 LUFS, true peak -1 dBTP, mono 44.1 kHz CBR 96 kbps MP3, all metadata stripped, verified),
// stages MP3s under <work>/<donor>/audio/, copies accepted ones into <root>/audio/ with a .meta.json sidecar (status "recorded"), and sets the
// manifest entry to status "recorded". Consent files are copied to <work>/<donor>/consent/ and are NEVER copied into the repo (they hold a real name).
// Same-text copies: some lesson-word ids (r04-w1, r04-w2, r05-w1, ...) have exactly the pointed text of another word with the same voice and
// tradition. One recording fills them all: for every accepted clip, each other manifest entry (kind word, group lesson-word, same voice, tradition and
// text (groups lesson-word, vocab-word, vocab-alias, vocab-extra: so a clip recorded under r01-w1 also fills the vocab id of the same text), not already recorded unless --replace, not itself in this export) gets the same MP3 under its own path, a .meta.json with "copyOf", and
// status "recorded" plus a "copyOf" field in the manifest. Dry run lists them. --no-copies turns this off.
// Needs ffmpeg + ffprobe on PATH (FFMPEG / FFPROBE override). It never touches an entry already marked "recorded" unless --replace is given.
import fs from 'node:fs';
const COPY_GROUPS = new Set(['lesson-word', 'vocab-word', 'vocab-alias', 'vocab-extra']);
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseCsv, parseClipPath, analyze, warningsFor, zipRead, toCsv, THRESH, consentComplete, slug } from './lib.mjs';
import { REPO_ROOT } from '../tts/lib.mjs';
import { measure, encode, checkMp3 } from '../tts/post.mjs';

const FF = () => process.env.FFMPEG || 'ffmpeg';
const SR = 48000;
export const AUDIO_EXT = new Set(['wav', 'flac', 'ogg', 'webm', 'm4a', 'mp3', 'aac', 'opus']);
export const LIMITS = { maxSeconds: 30, durTolerance: 0.25, peakTolerance: 1.5 };

export function decode(file) {
  const r = spawnSync(FF(), ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 28 });
  if (r.error || r.status !== 0 || !r.stdout.length) return null;
  const b = r.stdout; return new Float32Array(b.buffer, b.byteOffset, Math.floor(b.length / 4));
}

const manifestShards = (root) => ['data/audio/manifest.json', 'data/audio/manifest-kind-word.json', ...['israeli', 'sephardi', 'ashkenazi'].map((t) => `data/audio/manifest-words-${t}.json`)].filter((r) => fs.existsSync(path.join(root, r)));

/** Read an export (zip or folder) into [{name, data}]; refuses path traversal. */
export function readExport(input) {
  const st = fs.statSync(input);
  if (st.isDirectory()) {
    const out = [];
    const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else out.push({ name: path.relative(input, p).split(path.sep).join('/'), data: fs.readFileSync(p) }); } };
    walk(input); return out;
  }
  const files = zipRead(new Uint8Array(fs.readFileSync(input)), (u8) => zlib.inflateRawSync(u8));
  for (const f of files) if (f.name.startsWith('/') || f.name.split('/').includes('..') || /^[A-Za-z]:/.test(f.name)) throw new Error(`unsafe path in zip: ${f.name}`);
  return files;
}

export async function ingest({ input, root = REPO_ROOT, work = path.join(os.homedir(), 'alef-record-work'), apply = false, replace = false, copies = true, now = () => new Date().toISOString() }) {
  const files = readExport(input).filter((f) => !/(^|\/)(__MACOSX|\.DS_Store)/.test(f.name));
  const res = { fatal: [], accepted: [], rejected: [], warnings: [], unknownFiles: [], plan: [], donor: null, applied: false };
  const byName = new Map(files.map((f) => [f.name, f]));
  // consent gate
  let consent = null;
  try { consent = JSON.parse(Buffer.from(byName.get('consent.json')?.data || '').toString('utf8')); } catch { /* handled below */ }
  if (!consent) res.fatal.push('consent.json is missing or unreadable: nothing is accepted without the recorded consent');
  else if (!consentComplete({ required: consent.required, volunteer_name: consent.volunteer_name })) res.fatal.push('consent.json: a required box is not ticked or the name is empty: nothing is accepted');
  res.donor = consent && consent.donor_ref ? String(consent.donor_ref).replace(/[^a-z0-9]/gi, '') : null;
  if (consent && !res.donor) res.fatal.push('consent.json has no donor_ref');
  // page manifest.csv
  const mcsv = byName.get('manifest.csv');
  const rows = mcsv ? parseCsv(Buffer.from(mcsv.data).toString('utf8')) : [];
  if (!mcsv) res.warnings.push('manifest.csv missing: duration/peak cannot be cross-checked');
  const rowByPath = new Map(rows.map((r) => [r.path, r]));
  // repo manifest
  const shards = manifestShards(root).map((rel) => ({ rel, list: JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')), changed: false }));
  const entry = new Map(); for (const s of shards) for (const e of s.list) entry.set(e.path, { e, s });
  // ids that are legitimate recording targets but have no manifest entry (the 1,000-word scripts use corpus word ids)
  const scriptIds = new Set();
  const readCsv = (rel) => { try { return parseCsv(fs.readFileSync(path.join(root, rel), 'utf8')); } catch { return []; } };
  for (const t of ['israeli', 'sephardi', 'ashkenazi']) for (const r of readCsv(`docs/voices/recording-script-${t}.csv`)) scriptIds.add(`${t}/word/${r.id}`);
  for (const r of readCsv('docs/voices/recording-script.csv')) scriptIds.add(`${r.tradition}/${r.kind}/${r.id}`);
  const seen = new Set();
  for (const f of files) {
    if (!f.name.startsWith('audio/')) continue;
    const ext = f.name.split('.').pop().toLowerCase();
    if (ext === 'json' || !AUDIO_EXT.has(ext)) { res.unknownFiles.push(f.name); continue; }
    const rej = (...why) => res.rejected.push({ name: f.name, errors: why });
    const pc = parseClipPath(f.name);
    if (!pc) { rej('name does not match audio/<m|f>/<tradition>/<kind>/<id>.<ext>'); continue; }
    const mp3Path = `audio/${pc.voice}/${pc.tradition}/${pc.kind}/${pc.id}.mp3`;
    if (seen.has(mp3Path)) { rej('duplicate of another file for the same clip'); continue; }
    seen.add(mp3Path);
    const errors = [], warns = [];
    const hit = entry.get(mp3Path);
    if (!hit && !scriptIds.has(`${pc.tradition}/${pc.kind}/${pc.id}`)) errors.push(`${mp3Path} is not in the audio manifest nor in any docs/voices recording script (wrong id, kind or tradition?)`);
    else if (!hit) warns.push('script word with no audio-manifest entry yet: the clip is staged and copied, the manifest is not changed');
    const row = rowByPath.get(f.name);
    if (mcsv && !row) warns.push('not listed in manifest.csv');
    if (row && (row.voice !== pc.voice || row.tradition !== pc.tradition)) errors.push('manifest.csv voice/tradition disagrees with the file path');
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rk-in-')), `clip.${ext}`);
    fs.writeFileSync(tmp, f.data);
    const samples = decode(tmp); fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
    let a = null;
    if (!samples) errors.push('file does not decode (corrupt or unsupported)');
    else {
      a = analyze(samples, SR);
      const w = warningsFor(a);
      if (w.includes('clipping')) errors.push(`clipping (peak ${a.peakDb.toFixed(2)} dBFS)`);
      if (w.includes('silent')) errors.push(`silent (peak ${a.peakDb.toFixed(1)} dBFS)`);
      if (w.includes('too-short')) errors.push(`too short (${a.duration.toFixed(2)} s, minimum ${THRESH.minSeconds} s)`);
      if (a.duration > LIMITS.maxSeconds) errors.push(`too long (${a.duration.toFixed(1)} s, maximum ${LIMITS.maxSeconds} s)`);
      if (w.includes('quiet')) warns.push(`quiet (peak ${a.peakDb.toFixed(1)} dBFS)`);
      if (row) {
        if (Math.abs(Number(row.duration_s) - a.duration) > LIMITS.durTolerance) warns.push(`duration ${a.duration.toFixed(2)} s differs from manifest.csv ${row.duration_s} s`);
        const pk = Number(row.peak_dbfs); if (Number.isFinite(pk) && Math.abs(pk - a.peakDb) > LIMITS.peakTolerance) warns.push(`peak ${a.peakDb.toFixed(1)} dBFS differs from manifest.csv ${pk} dBFS`);
      }
    }
    if (hit && hit.e.status === 'recorded' && !replace) errors.push('manifest already has a human recording for this clip (use --replace to overwrite)');
    else if (hit && hit.e.status === 'recorded') warns.push('replaces an existing human recording');
    else if (hit && /^(tts|synthetic-)/.test(hit.e.status)) warns.push('replaces a synthetic clip');
    if (errors.length) { rej(...errors); continue; }
    res.accepted.push({ name: f.name, path: mp3Path, ...pc, duration: a.duration, peakDb: a.peakDb, rmsDb: a.rmsDb, warnings: warns, data: f.data, recordedAt: row?.recorded_at || '' });
    for (const w of warns) res.warnings.push(`${f.name}: ${w}`);
  }
  for (const r of rows) if (!files.some((f) => f.name === r.path)) res.warnings.push(`manifest.csv lists ${r.path} but the file is absent`);
  if (res.fatal.length) { res.plan = []; res.rejected.push(...res.accepted.map((c) => ({ name: c.name, errors: ['blocked by consent check'] }))); res.accepted = []; }
  res.plan = res.accepted.map((c) => ({ path: c.path, action: (entry.has(c.path) ? 'set manifest status "recorded", ' : 'no manifest entry (left unchanged), ') + 'copy mp3 + .meta.json', from: c.name }));
  // same-text copies (see header)
  res.copies = [];
  if (copies) {
    const taken = new Set([...res.accepted.map((c) => c.path), ...res.rejected.map((r) => r.name).map((n) => (parseClipPath(n) ? `audio/${parseClipPath(n).voice}/${parseClipPath(n).tradition}/${parseClipPath(n).kind}/${parseClipPath(n).id}.mp3` : ''))]);
    const all = shards.flatMap((s) => s.list);
    for (const c of res.accepted) {
      const src = entry.get(c.path)?.e; if (!src || src.kind !== 'word' || !COPY_GROUPS.has(src.group) || !src.text) continue;
      for (const e of all) {
        if (e.path === c.path || taken.has(e.path) || e.kind !== 'word' || !COPY_GROUPS.has(e.group) || e.voice !== src.voice || e.tradition !== src.tradition || e.text !== src.text) continue;
        if (e.status === 'recorded' && !replace) continue;
        taken.add(e.path); res.copies.push({ path: e.path, copyOf: c.path });
      }
    }
    for (const k of res.copies) res.plan.push({ path: k.path, action: `copy of ${k.copyOf} (same text): set manifest status "recorded", copy mp3 + .meta.json`, from: k.copyOf });
  }
  res.aiClone = consent ? consent.ai_clone_consent === true : false;

  if (apply && !res.fatal.length && res.accepted.length) res.applied = await applyAll(res, { root, work, shards, entry, consent, byName, now, files });
  return res;
}

async function applyAll(res, { root, work, shards, entry, consent, byName, now }) {
  const dir = path.join(work, `${slug(consent.volunteer_name)}-${res.donor}`);
  fs.mkdirSync(path.join(dir, 'consent'), { recursive: true });
  for (const n of ['consent.json', 'consent.txt', 'manifest.csv']) if (byName.has(n)) fs.writeFileSync(path.join(dir, 'consent', n), byName.get(n).data);
  const raw = path.join(dir, 'raw');
  const done = [];
  for (const c of res.accepted) {
    const src = path.join(raw, c.name); fs.mkdirSync(path.dirname(src), { recursive: true }); fs.writeFileSync(src, c.data);
    const out = path.join(dir, 'mp3', c.path);
    try {
      await encode(src, out, await measure(src));
      const chk = checkMp3(out);
      if (!chk.ok) { res.rejected.push({ name: c.name, errors: ['post chain output failed checks: ' + chk.problems.join('; ')] }); fs.rmSync(out, { force: true }); continue; }
    } catch (e) { res.rejected.push({ name: c.name, errors: ['post chain failed: ' + e.message] }); continue; }
    const dst = path.join(root, c.path); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(out, dst);
    fs.writeFileSync(`${dst}.meta.json`, JSON.stringify({ status: 'recorded', source: 'human:record-kit', recordedAt: c.recordedAt || now(), ingestedAt: now(), donorRef: res.donor, aiCloneConsent: res.aiClone, consentVersion: consent.version, note: 'Human recording. Rights per the volunteer consent held outside the repo; check docs/voices/donor-rights-grant.md before release.' }, null, 1) + '\n');
    const h = entry.get(c.path); if (h) { h.e.status = 'recorded'; h.e.source = 'human:record-kit'; delete h.e.synth; h.s.changed = true; }
    done.push(c);
  }
  res.accepted = done;
  const doneSet = new Set(done.map((c) => c.path)); res.copies = res.copies.filter((k) => doneSet.has(k.copyOf));
  for (const k of res.copies) {
    const from = path.join(root, k.copyOf), dst = path.join(root, k.path);
    fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(from, dst);
    const base = JSON.parse(fs.readFileSync(`${from}.meta.json`, 'utf8'));
    fs.writeFileSync(`${dst}.meta.json`, JSON.stringify({ ...base, copyOf: k.copyOf, note: 'Copy of another id with the same pointed text, same voice and tradition. ' + base.note }, null, 1) + '\n');
    const h = entry.get(k.path); if (h) { h.e.status = 'recorded'; h.e.source = 'human:record-kit'; delete h.e.synth; h.e.copyOf = k.copyOf; h.s.changed = true; }
  }
  for (const s of shards) if (s.changed) fs.writeFileSync(path.join(root, s.rel), JSON.stringify(s.list, null, 1) + '\n');
  res.stagedIn = dir;
  return true;
}

export function formatReport(res, apply) {
  const L = [];
  L.push(apply ? 'INGEST (applied)' : 'DRY RUN: nothing was written. Re-run with --apply to post-process and update the manifest.');
  for (const f of res.fatal) L.push(`FATAL: ${f}`);
  L.push(`same-text copies ${res.copies.length}`);
  L.push(`accepted ${res.accepted.length}, rejected ${res.rejected.length}, warnings ${res.warnings.length}${res.donor ? `, donor ${res.donor}, AI-clone consent: ${res.aiClone ? 'YES' : 'no'}` : ''}`);
  for (const r of res.rejected) L.push(`  REJECT ${r.name}: ${r.errors.join('; ')}`);
  for (const w of res.warnings.slice(0, 40)) L.push(`  warn ${w}`);
  if (res.warnings.length > 40) L.push(`  ... ${res.warnings.length - 40} more warnings`);
  if (res.unknownFiles.length) L.push(`ignored non-audio files: ${res.unknownFiles.join(', ')}`);
  if (!apply) for (const p of res.plan.slice(0, 20)) L.push(`  would: ${p.path}: ${p.action}`);
  if (!apply && res.plan.length > 20) L.push(`  ... ${res.plan.length - 20} more`);
  if (res.stagedIn) L.push(`staged MP3s and consent files in ${res.stagedIn} (consent files stay out of the repo)`);
  return L.join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  const o = { apply: false, replace: false, copies: true };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') o.apply = true; else if (a === '--replace') o.replace = true; else if (a === '--no-copies') o.copies = false;
    else if (a === '--root') o.root = path.resolve(argv[++i]); else if (a === '--work') o.work = path.resolve(argv[++i]); else if (a === '--report') o.report = path.resolve(argv[++i]);
    else if (a.startsWith('--')) { console.error('unknown option ' + a); process.exit(2); } else pos.push(a);
  }
  if (pos.length !== 1) { console.error('usage: node tools/record-kit/ingest.mjs <export.zip|folder> [--apply] [--replace] [--no-copies] [--root R] [--work W] [--report out.csv]'); process.exit(2); }
  const res = await ingest({ input: path.resolve(pos[0]), root: o.root, work: o.work, apply: o.apply, replace: o.replace, copies: o.copies });
  console.log(formatReport(res, o.apply));
  if (o.report) fs.writeFileSync(o.report, toCsv(['file', 'verdict', 'detail'], [...res.accepted.map((c) => ({ file: c.name, verdict: 'accept', detail: c.warnings.join('; ') })), ...res.rejected.map((r) => ({ file: r.name, verdict: 'reject', detail: r.errors.join('; ') }))]));
  if (res.fatal.length || res.rejected.length) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
