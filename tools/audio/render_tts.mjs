#!/usr/bin/env node
// Batch TTS renderer. DRY-RUN BY DEFAULT: lists what would be sent, characters, and approximate cost. Live calls need --execute.
//   node tools/audio/render_tts.mjs --provider google --voice m [--tradition israeli] [--kinds word,line,prayer] [--limit N] [--execute]
//   node tools/audio/render_tts.mjs --provider google --voice both --kinds prayer --ids docs/audio/redo-israeli-2026-11-07.txt --redo --execute
// Options:
//   --voice m|f|both       which voice slot(s) to render
//   --kinds a,b            manifest kinds (default syllable,word,line,prayer)
//   --ids <file>           only the ids listed in the file (one per line, # comments allowed); any kind unless --kinds is also given
//   --redo                 render even when the manifest already has a file (replaces it in place)
//   --limit N              first N rows only
//   --no-normalize         skip the loudness pass (default: two-pass EBU R128 to -16 LUFS, mono 44.1 kHz 96 kbps, like every clip in audio/)
//   --allow-warnings       render rows whose text has warnings (unpointed Hebrew, Latin mixed in); default: refuse and list them
// Refuses --tradition ashkenazi/sephardi: no TTS offers those; Ashkenazi audio must be human-recorded.
// Google: the default voices are the approved Israeli Hebrew pair (he-IL-Wavenet-B, he-IL-Wavenet-A); see tools/audio/tts/google.mjs.
import { loadManifestFull } from './manifest_io.mjs';
import { buildSidecar, LICENCE_NOT_CLEARED } from './sidecar.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as azure from './tts/azure.mjs';
import * as google from './tts/google.mjs';
import * as elevenlabs from './tts/elevenlabs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PROVIDERS = { azure, google, elevenlabs };
export const PRICE_LABEL = 'list price verified on fetched pages 2026-11-03, see data/audio/tts-prices.json (azure row inferred for he-IL voices)';
export const DEFAULT_KINDS = ['syllable', 'word', 'line', 'prayer'];

export function selectEntries(manifest, { voice, tradition = 'israeli', kinds = DEFAULT_KINDS, limit, onlyMissing = true, ids, kindsExplicit = false }) {
  if (tradition !== 'israeli') throw new Error(`refusing tradition "${tradition}": no TTS provider offers it (Web/cloud voices are Modern Israeli Hebrew). Record a human.`);
  const voicesWanted = voice === 'both' ? ['m', 'f'] : [voice];
  const idSet = ids ? new Set(ids) : null;
  // An alias row (a one-line prayer that doubles as its line) is skipped in kind mode but kept in id mode: its own file is what the player serves when it exists.
  let rows = manifest.filter((e) => voicesWanted.includes(e.voice) && e.tradition === tradition
    && (idSet ? idSet.has(e.id) && (!kindsExplicit || kinds.includes(e.kind)) : (kinds.includes(e.kind) && !e.aliasOf))
    && (!onlyMissing || e.status === 'missing'));
  if (limit) rows = rows.slice(0, limit);
  return rows;
}

/** One id per line; blank lines and # comments ignored. */
export function readIdList(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.replace(/#.*$/, '').trim()).filter(Boolean);
}

/** Cost at list price. The rate follows the voice each row will get (env overrides included), so a Chirp 3 HD run is priced as Chirp. */
export function estimate(rows, provider, env = process.env) {
  const clean = provider.cleanHebrewForTts || ((t) => t);
  const rate = (r) => (provider.priceFor && provider.voiceNameFor ? provider.priceFor(provider.voiceNameFor(r.voice, env)) : provider.pricePerMillionChars);
  let chars = 0, usd = 0;
  for (const r of rows) { const n = [...clean(r.text)].length; chars += n; usd += (n / 1e6) * rate(r); } // code points; niqqud marks counted (billing treatment unverified)
  return { clips: rows.length, chars, usd };
}

/** Rows whose text the provider flags (unpointed Hebrew, mixed scripts). Empty when the provider has no checker. */
export function warnedRows(rows, provider) {
  if (!provider.textWarnings) return [];
  return rows.map((r) => ({ row: r, warnings: provider.textWarnings(r.text) })).filter((x) => x.warnings.length);
}

/** Loudness-normalize one clip in place to the repo's delivery format. Returns false (and leaves the file) when ffmpeg is absent. */
export function normalizeClip(file, { lufs = -16, tp = -1.5, lra = 11 } = {}) {
  if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) return false;
  const probe = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', `loudnorm=I=${lufs}:TP=${tp}:LRA=${lra}:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' });
  const json = (probe.stderr || '').match(/\{[\s\S]*\}/);
  let filt = `loudnorm=I=${lufs}:TP=${tp}:LRA=${lra}`;
  if (json) {
    try {
      const s = JSON.parse(json[0]);
      filt += `:measured_I=${s.input_i}:measured_TP=${s.input_tp}:measured_LRA=${s.input_lra}:measured_thresh=${s.input_thresh}:offset=${s.target_offset}:linear=true`;
    } catch { /* single pass */ }
  }
  const tmp = path.join(os.tmpdir(), `alef-norm-${process.pid}-${Date.now()}.mp3`);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', file, '-af', filt, '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '96k', tmp]);
  if (r.status !== 0 || !fs.existsSync(tmp)) return false;
  fs.copyFileSync(tmp, file); fs.unlinkSync(tmp);
  return true;
}

export async function renderBatch({ provider, rows, root = ROOT, fetchImpl = fetch, env = process.env, now = () => new Date().toISOString(), log = console.log, normalize = false }) {
  const written = [];
  for (const r of rows) {
    const buf = await provider.synthesize({ text: r.text, voice: r.voice, env }, fetchImpl);
    const out = path.join(root, r.path);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    const normalized = normalize ? normalizeClip(out) : false;
    // Full sidecar (fix #21): engine + voice id + tradition + the exact input text
    // and its hash + render time + licence. The voice id is resolved the same way
    // the request resolved it, so the sidecar names the voice that actually spoke.
    // buf.voiceName (when the provider returns it) wins: it is the voice that spoke.
    const voiceId = buf.voiceName ?? (typeof provider.voiceName === 'function' ? provider.voiceName({ voice: r.voice, env }) : (provider.voices?.[r.voice] ?? null));
    const at = now();
    const meta = buildSidecar({
      status: 'tts',
      source: `tts:${provider.id}`,
      engine: provider.id,
      voiceId,
      tradition: r.tradition,
      inputText: r.text,
      ingestedAt: at,
      licence: LICENCE_NOT_CLEARED,
      note: 'TTS output redistribution rights not confirmed by counsel',
      renderedAt: at,
      redistributionCleared: false,
      ...(buf.spokenText ? { spokenText: buf.spokenText } : {}),
      ...(normalize ? { normalized } : {}),
    });
    fs.writeFileSync(`${out}.meta.json`, JSON.stringify(meta, null, 1) + '\n');
    written.push(r.path); log(`wrote ${r.path}${normalized ? ' (normalized)' : ''}`);
  }
  return written;
}

function parseArgs(argv) {
  const a = { execute: false, normalize: true, redo: false, allowWarnings: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--execute') a.execute = true;
    else if (k === '--dry-run') a.execute = false;
    else if (k === '--redo') a.redo = true;
    else if (k === '--no-normalize') a.normalize = false;
    else if (k === '--allow-warnings') a.allowWarnings = true;
    else if (k.startsWith('--')) a[k.slice(2)] = argv[++i];
  }
  return a;
}

export async function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv);
  const provider = PROVIDERS[a.provider];
  if (!provider) { console.error(`--provider required: ${Object.keys(PROVIDERS).join('|')}`); process.exit(2); }
  if (!['m', 'f', 'both'].includes(a.voice)) { console.error('--voice m|f|both required'); process.exit(2); }
  const manifest = loadManifestFull(ROOT);
  const ids = a.ids ? readIdList(path.resolve(ROOT, a.ids)) : undefined;
  const rows = selectEntries(manifest, { voice: a.voice, tradition: a.tradition, kinds: a.kinds ? a.kinds.split(',') : DEFAULT_KINDS, limit: a.limit ? +a.limit : undefined, onlyMissing: !a.redo, ids, kindsExplicit: !!a.kinds });
  if (ids) { const found = new Set(rows.map((r) => r.id)); const lost = ids.filter((i) => !found.has(i)); if (lost.length) console.log(`ids not in the manifest for this voice/tradition: ${lost.length} (${lost.slice(0, 10).join(', ')}${lost.length > 10 ? ', ...' : ''})`); }
  const est = estimate(rows, provider);
  const nameOf = (v) => (provider.voiceNameFor ? provider.voiceNameFor(v) : provider.voices[v]);
  const voiceLabel = a.voice === 'both' ? `m=${nameOf('m')}, f=${nameOf('f')}` : nameOf(a.voice);
  console.log(`${a.execute ? 'EXECUTE' : 'DRY RUN'}: provider=${provider.id} voice=${a.voice} (${voiceLabel})${a.redo ? ' REDO (replaces existing files)' : ''}`);
  const clean = provider.cleanHebrewForTts || ((t) => t);
  for (const r of rows.slice(0, 25)) console.log(`  ${r.path}  ${clean(r.text)}`);
  if (rows.length > 25) console.log(`  ... ${rows.length - 25} more`);
  console.log(`clips=${est.clips} characters=${est.chars} est. cost=US$${est.usd.toFixed(4)} (${PRICE_LABEL}; ignores free tiers; billing of niqqud marks unverified)`);
  const warned = warnedRows(rows, provider);
  if (warned.length) {
    console.log(`${warned.length} row(s) with text warnings${a.allowWarnings ? ' (rendering anyway: --allow-warnings)' : ' (skipped; fix the text or pass --allow-warnings)'}:`);
    for (const w of warned.slice(0, 20)) console.log(`  ${w.row.id}: ${w.warnings.join('; ')}  ${w.row.text}`);
  }
  const todo = a.allowWarnings ? rows : rows.filter((r) => !warned.some((w) => w.row === r));
  if (!a.execute) { console.log('Dry run only. No network calls made. Add --execute to render (needs credentials: ' + provider.env.join(', ') + ').'); return; }
  console.log('Reminder: TTS redistribution rights for Azure/Google output are unconfirmed; files are tagged redistributionCleared:false.');
  await renderBatch({ provider, rows: todo, normalize: a.normalize });
  console.log(`rendered ${todo.length} clip(s). Next: node tools/audio/build_manifest.mjs (or tools/tts/manifest_update.mjs) so the app lists them, then listen to a few before pushing.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
