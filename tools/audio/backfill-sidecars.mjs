#!/usr/bin/env node
// Backfill .mp3.meta.json sidecars for every synthetic clip (fix #21).
//   node tools/audio/backfill-sidecars.mjs [--check] [--write] [--force] [--shard <name>] [--limit N] [--root <repo>]
// Default is --check: report what would change, write nothing. --write performs it.
// --force rewrites sidecars that already carry the full field set. --shard limits the
// run to one manifest file (core | kind-word | words-israeli | words-sephardi |
// words-ashkenazi) so a large backfill can be committed in slices.
//
// What it writes: the canonical sidecar (tools/audio/sidecar.mjs) for every manifest
// entry with a synthetic clip (status tts / synthetic-unreviewed / synthetic-reviewed).
// It trusts the manifest: an entry with status tts is treated as a clip. If an mp3 is
// missing from disk its sidecar is still written — the manifest is the catalogue, and
// finding missing mp3s is fix #23's reconciliation, not this script's job.
//
// What it can and cannot state (read before believing a backfilled sidecar):
// - tradition, voice slot, input Hebrew text: from the manifest entry. Solid.
// - engine + voice id: SLOT-LEVEL, not per-clip verified. The production record says
//   the paid-cloud library was rendered on Google Cloud TTS with the Israeli WaveNet
//   pair the owner passed for production 2026-11-05 — m he-IL-Wavenet-B, f
//   he-IL-Wavenet-A (docs/audio/CASTING-REPORT.md rows 14-15, 39-40;
//   docs/audio/ISRAELI-VOICE-2026-11-07.md). Tradition clips were rendered from
//   respellings through those same Israeli voices. No per-clip render log survives
//   to prove it clip by clip, so every backfilled sidecar says so in its note.
// - respelled input text: NOT recorded anywhere for the paid-cloud tradition clips.
//   inputText is the manifest Hebrew text and inputTextKind says
//   'respelling-unrecorded'; inputSha256 is the hash of that text, not of the
//   respelling that was actually sent. A future render that records its respelling
//   writes inputTextKind 'respelling' with the real sound word.
// - the 108 tts:google prayer clips (Nov 7 sprint): rendered through the then-default
//   HD voices — docs/audio/ISRAELI-VOICE-2026-11-07.md documents the regression and
//   the ordered WaveNet redo — and no voice id was recorded at render time, so
//   voiceId stays null rather than guessed. If the redo replaced those clips, re-run
//   this script after the manifest changes: it upgrades sidecars whose values differ.
//   Exception: a tts:google clip whose existing sidecar records a voiceName and a
//   renderedAt (a later re-render with a recorded voice) upgrades to THAT voice id
//   and render time — the Nov 7 note does not apply to it, and the render-time
//   record is never overwritten with the null-voice form.
// - ingestedAt: null unless the existing sidecar already carries a renderedAt (the
//   108 prayer sidecars do). The render date of the paid-cloud library was not recorded.
// - licence: 'not cleared' everywhere until counsel clears redistribution/sale in
//   writing (docs/audio/CONTRACT.md is fix #22's job, not this script's).
//
// Skipped, with counts in the report: entries with no clip (status missing), human
// clips (status recorded — a different provenance, not this schema), entries with an
// unknown source, entries with no text. Entries whose source is one of the ingested
// sources (outside-synthetic, tts-respelled, tts-hebrew) are skipped too: their
// sidecars are the ingest-time record and the manifest must agree with them (fix #23
// reconciled 111 such rows); a paid-cloud plan must never overwrite them.
// Sidecars whose clip has no manifest entry (orphans) are reported, never deleted.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSidecar, sidecarComplete, missingSidecarFields, LICENCE_NOT_CLEARED } from './sidecar.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Slot-level production voice ids (see header — slot-level, not per-clip verified). */
export const PRODUCTION_VOICES = Object.freeze({ m: 'he-IL-Wavenet-B', f: 'he-IL-Wavenet-A' });
export const PRODUCTION_ENGINE = 'google-cloud-tts';

/** Manifest files, in the same set tools/audio/manifest_io.mjs reads. */
export const MANIFEST_FILES = Object.freeze([
  ['core', 'data/audio/manifest.json'],
  ['kind-word', 'data/audio/manifest-kind-word.json'],
  ['words-israeli', 'data/audio/manifest-words-israeli.json'],
  ['words-sephardi', 'data/audio/manifest-words-sephardi.json'],
  ['words-ashkenazi', 'data/audio/manifest-words-ashkenazi.json'],
]);

const SYNTHETIC_STATUSES = new Set(['tts', 'synthetic-unreviewed', 'synthetic-reviewed']);

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function loadEntries(root) {
  const out = [];
  for (const [shard, rel] of MANIFEST_FILES) {
    const p = path.join(root, rel);
    if (!fs.existsSync(p)) continue;
    for (const e of readJson(p)) out.push({ ...e, _shard: shard });
  }
  return out;
}

function listSidecars(root) {
  const dir = path.join(root, 'audio');
  const found = [];
  if (!fs.existsSync(dir)) return found;
  const walk = (d) => {
    for (const n of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, n.name);
      if (n.isDirectory()) walk(p);
      else if (n.name.endsWith('.mp3.meta.json')) found.push(p);
    }
  };
  walk(dir);
  return found;
}

/**
 * Decide what a manifest entry's sidecar should be. Returns
 * { action: 'create'|'upgrade'|'skip', reason, sidecar }.
 * `existing` is the parsed sidecar already on disk, or null.
 */
export function planSidecar(entry, existing = null) {
  if (!SYNTHETIC_STATUSES.has(entry.status)) {
    return { action: 'skip', reason: entry.status === 'missing' ? 'no-clip' : entry.status === 'recorded' ? 'human-clip' : `status-${entry.status}`, sidecar: null };
  }
  if (entry.text == null || entry.text === '') return { action: 'skip', reason: 'no-text', sidecar: null };
  const voiceId = PRODUCTION_VOICES[entry.voice];
  // A later re-render records its own voice and time on the sidecar it writes
  // (voiceName + renderedAt). That record is the truth for this clip: it replaces
  // the Nov 7 no-voice form instead of being overwritten by it. A voice id is
  // only trusted when it rides on a render-time record (voiceName, or a voiceId
  // with a renderedAt) — a bare voiceId with no render time is not evidence.
  const recordedVoice = existing?.voiceName ?? (existing?.renderedAt ? (existing?.voiceId ?? null) : null);
  const recordedAt = existing?.renderedAt ?? null;
  let engine;
  let inputTextKind;
  let note;
  if (entry.source === 'paid-cloud') {
    if (!voiceId) return { action: 'skip', reason: `voice-${entry.voice}`, sidecar: null };
    engine = PRODUCTION_ENGINE;
    if (entry.tradition === 'israeli') {
      inputTextKind = 'hebrew';
      note = 'Backfilled from the manifest (fix #21): paid-cloud library rendered on Google Cloud TTS with the Israeli WaveNet pair the owner passed for production 2026-11-05 (m he-IL-Wavenet-B, f he-IL-Wavenet-A; docs/audio/CASTING-REPORT.md). Slot-level provenance, not per-clip verified; render date not recorded.';
    } else if (entry.tradition === 'sephardi' || entry.tradition === 'ashkenazi') {
      inputTextKind = 'respelling-unrecorded';
      note = 'Backfilled from the manifest (fix #21): paid-cloud library rendered on Google Cloud TTS with the Israeli WaveNet pair (see CASTING-REPORT.md) reading a respelling. The respelled Latin input actually sent was not recorded, so inputText is the manifest Hebrew text. Slot-level provenance, not per-clip verified; render date not recorded.';
    } else {
      return { action: 'skip', reason: `tradition-${entry.tradition}`, sidecar: null };
    }
  } else if (entry.source === 'tts:google') {
    engine = PRODUCTION_ENGINE;
    inputTextKind = 'hebrew';
    if (recordedVoice && recordedAt) {
      note = `Backfilled from the manifest (fix #21): re-rendered ${recordedAt.slice(0, 10)} with the recorded voice ${recordedVoice}; the voice id and render time are taken from the render-time sidecar, not guessed.`;
    } else if (recordedVoice) {
      note = `Backfilled from the manifest (fix #21): the render-time sidecar records the voice ${recordedVoice}; the render time was not recorded, so ingestedAt stays null.`;
    } else {
      note = 'Backfilled from the manifest (fix #21): rendered 2026-11-07 through the then-default HD voices; the voice id was not recorded at render time, so voiceId is null rather than guessed (docs/audio/ISRAELI-VOICE-2026-11-07.md documents the regression and the ordered WaveNet redo).';
    }
  } else {
    return { action: 'skip', reason: `source-${entry.source}`, sidecar: null };
  }
  const sidecar = buildSidecar({
    status: entry.status,
    source: entry.source,
    engine,
    // tts:google clips: no voice id was recorded; null is honest — unless the
    // existing sidecar records the voice the re-render actually used (see note).
    voiceId: entry.source === 'tts:google' ? (recordedVoice ?? null) : voiceId,
    tradition: entry.tradition,
    inputText: entry.text,
    // Preserve a render date the clip already records (render_tts writes ingestedAt;
    // the 108 prayer sidecars carry renderedAt); otherwise null — never invented.
    ingestedAt: existing?.ingestedAt ?? existing?.renderedAt ?? null,
    licence: LICENCE_NOT_CLEARED,
    note,
    inputTextKind,
    ...(existing?.renderedAt ? { renderedAt: existing.renderedAt } : {}),
    // Render-time facts the canonical fields do not carry: keep them, do not drop.
    ...(existing?.spokenText ? { spokenText: existing.spokenText } : {}),
    ...(existing?.normalized != null ? { normalized: existing.normalized } : {}),
    ...(existing?.redistributionCleared != null ? { redistributionCleared: existing.redistributionCleared } : {}),
  });
  if (!existing) return { action: 'create', reason: 'no-sidecar', sidecar };
  // Idempotent: a sidecar that already says exactly what this plan would say is
  // left alone — including one whose render date is honestly unknown (ingestedAt
  // null on both sides). Only a real difference rewrites it.
  const compared = ['status', 'source', 'engine', 'voiceId', 'tradition', 'inputText', 'inputSha256', 'ingestedAt', 'licence', 'inputTextKind', 'note'];
  const same = compared.every((f) => (existing[f] ?? null) === (sidecar[f] ?? null));
  if (same) return { action: 'skip', reason: sidecarComplete(existing) ? 'already-complete' : 'already-planned', sidecar: null };
  if (sidecarComplete(existing)) return { action: 'upgrade', reason: 'values-differ', sidecar };
  return { action: 'upgrade', reason: `missing-fields:${missingSidecarFields(existing).join(',')}`, sidecar };
}

/**
 * Run the backfill. With write=false nothing is written (report only).
 * Returns { total, created, upgraded, skipped, alreadyComplete, orphans, errors, byShard }.
 */
export function backfill({ root = ROOT, write = false, force = false, shard = null, limit = null, log = () => {} } = {}) {
  const entries = loadEntries(root).filter((e) => !shard || e._shard === shard);
  const sliced = limit ? entries.slice(0, limit) : entries;
  const res = { total: sliced.length, created: 0, upgraded: 0, skipped: {}, alreadyComplete: 0, orphans: [], errors: [], byShard: {} };
  const allPaths = new Set(loadEntries(root).map((e) => e.path));
  for (const e of sliced) {
    const metaPath = path.join(root, `${e.path}.meta.json`);
    let existing = null;
    try {
      if (fs.existsSync(metaPath)) existing = readJson(metaPath);
    } catch (err) { res.errors.push(`${metaPath}: unreadable (${err.message})`); }
    const plan = planSidecar(e, existing);
    if (plan.action === 'skip') {
      res.skipped[plan.reason] = (res.skipped[plan.reason] || 0) + 1;
      if (plan.reason === 'already-complete') res.alreadyComplete++;
      continue;
    }
    if (write) {
      fs.mkdirSync(path.dirname(metaPath), { recursive: true });
      fs.writeFileSync(metaPath, JSON.stringify(plan.sidecar, null, 1) + '\n');
    }
    if (plan.action === 'create') res.created++;
    else res.upgraded++;
    res.byShard[e._shard] = (res.byShard[e._shard] || 0) + 1;
    if (plan.action === 'create') log(`  ${write ? 'wrote' : 'would write'} ${e.path}.meta.json`);
  }
  for (const p of listSidecars(root)) {
    const clip = path.relative(root, p).split(path.sep).join('/').replace(/\.meta\.json$/, '');
    if (!allPaths.has(clip)) res.orphans.push(path.relative(root, p).split(path.sep).join('/'));
  }
  return res;
}

function parseArgs(argv) {
  const a = { write: false, force: false, shard: null, limit: null, root: ROOT };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--write') a.write = true;
    else if (k === '--check') a.write = false;
    else if (k === '--force') a.force = true;
    else if (k === '--shard') a.shard = argv[++i];
    else if (k === '--limit') a.limit = +argv[++i];
    else if (k === '--root') a.root = path.resolve(argv[++i]);
    else if (k === '--help') { console.log('usage: node tools/audio/backfill-sidecars.mjs [--check|--write] [--force] [--shard <name>] [--limit N] [--root <repo>]'); process.exit(0); }
    else { console.error(`unknown argument: ${k}`); process.exit(2); }
  }
  if (a.shard && !MANIFEST_FILES.some(([n]) => n === a.shard)) { console.error(`unknown shard: ${a.shard} (one of ${MANIFEST_FILES.map(([n]) => n).join(', ')})`); process.exit(2); }
  return a;
}

export function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv);
  const res = backfill({ ...a, log: () => {} });
  const skippedTotal = Object.values(res.skipped).reduce((n, v) => n + v, 0);
  console.log(`${a.write ? 'WROTE' : 'CHECK (nothing written)'}: ${res.total} manifest entries${a.shard ? ` (shard ${a.shard})` : ''}${a.limit ? ` (limit ${a.limit})` : ''}`);
  console.log(`  create: ${res.created}; upgrade: ${res.upgraded}; skip: ${skippedTotal}`);
  for (const [reason, n] of Object.entries(res.skipped).sort((x, y) => y[1] - x[1])) console.log(`    skip ${reason}: ${n}`);
  if (Object.keys(res.byShard).length) console.log(`  by shard: ${Object.entries(res.byShard).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  if (res.orphans.length) console.log(`  orphans (sidecar with no manifest entry, left alone): ${res.orphans.length} (first: ${res.orphans[0]})`);
  if (res.errors.length) { console.log(`  errors: ${res.errors.length}`); for (const e of res.errors.slice(0, 10)) console.log(`    ${e}`); }
  if (!a.write && (res.created || res.upgraded)) console.log('  Re-run with --write to perform it (per-shard for commit-sized slices).');
  return res;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
