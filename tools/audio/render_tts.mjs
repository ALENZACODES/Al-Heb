#!/usr/bin/env node
// Batch TTS renderer. DRY-RUN BY DEFAULT: lists what would be sent, characters, and approximate cost. Live calls need --execute.
//   node tools/audio/render_tts.mjs --provider google --voice m [--tradition israeli] [--kinds word,line,prayer] [--limit N] [--execute]
//   node tools/audio/render_tts.mjs --provider google --voice both --kinds prayer --ids docs/audio/redo-israeli-2026-11-07.txt --redo --execute
//   node tools/audio/render_tts.mjs --provider google --tradition sephardi --voice both --kinds letter,vowel,syllable,word,line,prayer
// Options:
//   --voice m|f|both       which voice slot(s) to render
//   --tradition t          israeli (default), sephardi, ashkenazi, a comma list, or both (= sephardi,ashkenazi); each tradition is its own run
//   --kinds a,b            manifest kinds (default syllable,word,line,prayer)
//   --ids <file>           only the ids listed in the file (one per line, # comments allowed); any kind unless --kinds is also given
//   --redo                 render even when the manifest already has a file (replaces it in place)
//   --limit N              first N rows only
//   --no-normalize         skip the loudness pass (default: two-pass EBU R128 to -16 LUFS, mono 44.1 kHz 96 kbps, like every clip in audio/)
//   --no-cap               skip the tempo cap for sephardi/ashkenazi clips (default: a clip longer than 1.26 x its Israeli counterpart is sped up to exactly 1.26 x, same pitch)
//   --no-mark              do not update the manifest rows after a sephardi/ashkenazi render (default: rows take status synthetic-unreviewed, source tts-respelled-israeli-voice)
//   --allow-warnings       render rows whose text has warnings (unpointed Hebrew, Latin mixed in); default: refuse and list them
// Sephardi and Ashkenazi (owner decision 2026-11-07 22:56, docs/audio/ACCENT-VOICES-2026-11-08.md): the row set is that tradition's manifest rows
// (status missing, or every row with --redo); the text SENT is the tradition's English-letter respelling of the row's pointed Hebrew
// (tools/audio/accent.mjs respellFor: src/pronunciation/forTradition.js respell, scheme 'siddur', the "how to say it" line the app shows,
// so Ashkenazi reads "shabos"); the voice is the same Israeli voice as the Israeli run (he-IL WaveNet pair by default; a Chirp 3 HD voice
// only with GOOGLE_TTS_ALLOW_HD=1, and Chirp reads Latin letters differently, so listen first), language code he-IL. The sidecar records
// spokenText, madeFrom: 'respelling', voiceName, tradition, israeliRef and the tempo cap result. Only the google provider renders these.
// Google: the default voices are the approved Israeli Hebrew pair (he-IL-Wavenet-B, he-IL-Wavenet-A); see tools/audio/tts/google.mjs.
import { loadManifestFull } from './manifest_io.mjs';
import { buildSidecar, LICENCE_NOT_CLEARED, LICENCE_PAID_CLOUD } from './sidecar.mjs';
import { ACCENT_TRADITIONS, ACCENT_SOURCES, ACCENT_STATUS, TEMPO_CAP, respellFor, israeliRef, capClip, markAccentRows } from './accent.mjs';
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
export const TRADITIONS = ['israeli', ...ACCENT_TRADITIONS];
export const isAccentTradition = (t) => ACCENT_TRADITIONS.includes(t);

/**
 * Rows to render for one voice set and one tradition. Israeli rows are sent as their pointed Hebrew; sephardi/ashkenazi rows get
 * `spokenText` = the tradition's respelling (and `israeliRef`, the Israeli clip of the same voice/kind/id, for the tempo cap).
 */
export function selectEntries(manifest, { voice, tradition = 'israeli', kinds = DEFAULT_KINDS, limit, onlyMissing = true, ids, kindsExplicit = false }) {
  if (!TRADITIONS.includes(tradition)) throw new Error(`refusing tradition "${tradition}": not one of ${TRADITIONS.join(', ')}`);
  const voicesWanted = voice === 'both' ? ['m', 'f'] : [voice];
  const idSet = ids ? new Set(ids) : null;
  // An alias row (a one-line prayer that doubles as its line) is skipped in kind mode but kept in id mode: its own file is what the player serves when it exists.
  let rows = manifest.filter((e) => voicesWanted.includes(e.voice) && e.tradition === tradition
    && (idSet ? idSet.has(e.id) && (!kindsExplicit || kinds.includes(e.kind)) : (kinds.includes(e.kind) && !e.aliasOf))
    && (!onlyMissing || e.status === 'missing'));
  if (limit) rows = rows.slice(0, limit);
  if (isAccentTradition(tradition)) rows = rows.map((r) => ({ ...r, spokenText: respellFor(r.text, tradition), israeliRef: israeliRef(r.path) }));
  return rows;
}

/** One id per line; blank lines and # comments ignored. */
export function readIdList(file) {
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.replace(/#.*$/, '').trim()).filter(Boolean);
}

/** The text a row sends: its respelling for sephardi/ashkenazi rows, its pointed Hebrew otherwise. */
export const textToSend = (r) => (typeof r.spokenText === 'string' ? r.spokenText : r.text);

/** Cost at list price. The rate follows the voice each row will get (env overrides included), so a Chirp 3 HD run is priced as Chirp. */
export function estimate(rows, provider, env = process.env) {
  const clean = provider.cleanHebrewForTts || ((t) => t);
  const rate = (r) => (provider.priceFor && provider.voiceNameFor ? provider.priceFor(provider.voiceNameFor(r.voice, env)) : provider.pricePerMillionChars);
  let chars = 0, usd = 0;
  for (const r of rows) { const n = [...clean(textToSend(r))].length; chars += n; usd += (n / 1e6) * rate(r); } // code points; niqqud marks counted (billing treatment unverified)
  return { clips: rows.length, chars, usd };
}

/** Rows whose text the provider flags (unpointed Hebrew, mixed scripts); a sephardi/ashkenazi row with no respelling is flagged too. */
export function warnedRows(rows, provider) {
  return rows.map((r) => {
    const warnings = provider.textWarnings ? provider.textWarnings(textToSend(r)) : [];
    if (typeof r.spokenText === 'string' && !r.spokenText) warnings.push('no respelling could be made from the pointed Hebrew');
    return { row: r, warnings };
  }).filter((x) => x.warnings.length);
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

/** A dropped connection ("fetch failed") is retried 4 times (2, 4, 8, 16 s) and its real cause printed; an HTTP error from the
 *  provider (bad key, quota) is not retried. */
export async function withRetry(fn, label = '', log = console.log, waits = [2000, 4000, 8000, 16000]) {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e) {
      const cause = e && e.cause ? (e.cause.code || e.cause.message || String(e.cause)) : '';
      const network = /fetch failed|network|ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|UND_ERR|socket/i.test(`${e && e.message} ${cause}`);
      if (!network || i >= waits.length) { if (cause) e.message = `${e.message} (${cause})${label ? ` at ${label}` : ''}`; throw e; }
      log(`  network error at ${label}: ${e.message}${cause ? ` (${cause})` : ''}; retrying in ${waits[i] / 1000}s`);
      await new Promise((res) => setTimeout(res, waits[i]));
    }
  }
}

/**
 * Render rows. Israeli rows: file + `tts:<provider>` sidecar as before. Sephardi/ashkenazi rows (spokenText set): the respelling is
 * sent, the clip is normalized, then tempo-capped against the Israeli counterpart (cap, default 1.26; `cap: 0` skips), and the
 * sidecar carries the accent provenance. Returns the written paths; `onMeta(row, meta)` is told each sidecar (used to mark rows).
 */
export async function renderBatch({ provider, rows, root = ROOT, fetchImpl = fetch, env = process.env, now = () => new Date().toISOString(), log = console.log, normalize = false, cap = TEMPO_CAP, onMeta = null }) {
  const written = [];
  for (const r of rows) {
    const accent = typeof r.spokenText === 'string';
    const buf = await withRetry(() => provider.synthesize({ text: textToSend(r), voice: r.voice, env, ...(accent ? { languageCode: 'he-IL' } : {}) }, fetchImpl), r.path, log);
    const out = path.join(root, r.path);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    const normalized = normalize ? normalizeClip(out) : false;
    // Full sidecar (fix #21): engine + voice id + tradition + the exact input text and its hash + render time + licence.
    // buf.voiceName (when the provider returns it) wins: it is the voice that spoke.
    const voiceId = buf.voiceName ?? (typeof provider.voiceName === 'function' ? provider.voiceName({ voice: r.voice, env }) : (provider.voices?.[r.voice] ?? null));
    const voiceName = voiceId || undefined;
    const at = now();
    const baseSidecar = (over) => buildSidecar({
      status: 'tts', source: `tts:${provider.id}`, engine: provider.id, voiceId, tradition: r.tradition, inputText: r.text,
      // Fix #22: renders through the paid-cloud provider record the vendor-terms
      // position (customer-owned, docs/audio/CONTRACT.md); every other provider
      // keeps 'not cleared' until its terms are recorded the same way. The
      // licence field is not a counsel clearance: redistributionCleared stays false.
      ingestedAt: at, licence: provider.id === 'google' ? LICENCE_PAID_CLOUD : LICENCE_NOT_CLEARED,
      note: provider.id === 'google'
        ? 'Synthetic voice; licence customer-owned under the vendor terms (docs/audio/CONTRACT.md); redistribution clearance still needs counsel'
        : 'TTS output redistribution rights not confirmed by counsel',
      renderedAt: at, redistributionCleared: false,
      ...(buf.spokenText ? { spokenText: buf.spokenText } : {}),
      ...(normalize ? { normalized } : {}),
      ...over,
    });
    let meta;
    if (accent) {
      const isr = r.israeliRef ? path.join(root, r.israeliRef) : null;
      const tempo = cap > 0 && isr && fs.existsSync(isr) ? capClip(out, isr, { cap, normalize: normalize ? normalizeClip : null, israeliRef: r.israeliRef }) : null;
      meta = {
        ...baseSidecar({ status: ACCENT_STATUS, source: ACCENT_SOURCES.israeliVoice }),
        provider: provider.id,
        tradition: r.tradition, madeFrom: r.madeFrom || 'respelling', ...(voiceName ? { voiceName } : {}), languageCode: 'he-IL',
        spokenText: buf.spokenText || r.spokenText, hebrew: r.text, israeliRef: r.israeliRef || null,
        tempo: tempo || { applied: false, factor: 1, cap, before: null, after: null, israeliSec: null, israeliRef: r.israeliRef || null, note: 'no Israeli counterpart on disk, so no cap was applied' },
        ...(normalize ? { normalized } : {}),
        note: `Synthetic voice: the Israeli ${r.voice === 'm' ? 'man' : 'woman'} voice reading the ${r.tradition} ${r.madeFrom === 'hebrew-script' ? 'reading written in pointed Hebrew letters (tools/audio/ashkenazi_script.mjs)' : 'English-letter respelling, not pointed Hebrew'}. Not a human recording; no human has listened to it. Licence customer-owned under the vendor terms (docs/audio/CONTRACT.md); redistribution clearance still needs counsel.`,
      };
    } else {
      meta = baseSidecar({});
    }
    fs.writeFileSync(`${out}.meta.json`, JSON.stringify(meta, null, 1) + '\n');
    if (onMeta) onMeta(r, meta);
    const tempoNote = meta.tempo && meta.tempo.applied ? ` (tempo x${meta.tempo.factor.toFixed(3)}: ${meta.tempo.before.toFixed(2)}s -> ${meta.tempo.after.toFixed(2)}s, Israeli ${meta.tempo.israeliSec.toFixed(2)}s)` : '';
    written.push(r.path); log(`wrote ${r.path}${normalized ? ' (normalized)' : ''}${tempoNote}`);
  }
  return written;
}

/** Per-kind row counts, for the dry-run summary. */
export function countByKind(rows) {
  const out = {};
  for (const r of rows) out[r.kind] = (out[r.kind] || 0) + 1;
  return out;
}

function parseArgs(argv) {
  const a = { execute: false, normalize: true, redo: false, allowWarnings: false, cap: true, mark: true };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--execute') a.execute = true;
    else if (k === '--dry-run') a.execute = false;
    else if (k === '--redo') a.redo = true;
    else if (k === '--no-normalize') a.normalize = false;
    else if (k === '--no-cap') a.cap = false;
    else if (k === '--no-mark') a.mark = false;
    else if (k === '--allow-warnings') a.allowWarnings = true;
    else if (k.startsWith('--')) a[k.slice(2)] = argv[++i];
  }
  return a;
}

/** '--tradition' value -> list of traditions ('both' = the two respelled traditions). */
export function traditionList(v) {
  if (!v) return ['israeli'];
  const list = v === 'both' ? [...ACCENT_TRADITIONS] : v.split(',').map((s) => s.trim()).filter(Boolean);
  for (const t of list) if (!TRADITIONS.includes(t)) throw new Error(`--tradition ${t}: not one of ${TRADITIONS.join(', ')} (or both)`);
  return list;
}

export async function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv);
  const provider = PROVIDERS[a.provider];
  if (!provider) { console.error(`--provider required: ${Object.keys(PROVIDERS).join('|')}`); process.exit(2); }
  if (!['m', 'f', 'both'].includes(a.voice)) { console.error('--voice m|f|both required'); process.exit(2); }
  let traditions;
  try { traditions = traditionList(a.tradition); } catch (e) { console.error(e.message); process.exit(2); }
  if (traditions.some(isAccentTradition) && provider.id !== 'google') { console.error('sephardi/ashkenazi clips are made with the Israeli he-IL voices of the google provider only'); process.exit(2); }
  const manifest = loadManifestFull(ROOT);
  const ids = a.ids ? readIdList(path.resolve(ROOT, a.ids)) : undefined;
  const kinds = a.kinds ? a.kinds.split(',') : DEFAULT_KINDS;
  const nameOf = (v) => (provider.voiceNameFor ? provider.voiceNameFor(v) : provider.voices[v]);
  const voiceLabel = a.voice === 'both' ? `m=${nameOf('m')}, f=${nameOf('f')}` : nameOf(a.voice);
  const clean = provider.cleanHebrewForTts || ((t) => t);
  for (const tradition of traditions) {
    const accent = isAccentTradition(tradition);
    const rows = selectEntries(manifest, { voice: a.voice, tradition, kinds, limit: a.limit ? +a.limit : undefined, onlyMissing: !a.redo, ids, kindsExplicit: !!a.kinds });
    if (ids) { const found = new Set(rows.map((r) => r.id)); const lost = ids.filter((i) => !found.has(i)); if (lost.length) console.log(`ids not in the manifest for this voice/tradition: ${lost.length} (${lost.slice(0, 10).join(', ')}${lost.length > 10 ? ', ...' : ''})`); }
    const est = estimate(rows, provider);
    console.log(`${a.execute ? 'EXECUTE' : 'DRY RUN'}: provider=${provider.id} tradition=${tradition} voice=${a.voice} (${voiceLabel})${a.redo ? ' REDO (replaces existing files)' : ''}${accent ? ` text=English-letter ${tradition} respelling, language he-IL, tempo cap ${a.cap ? `${TEMPO_CAP}x the Israeli clip` : 'off'}` : ''}`);
    for (const r of rows.slice(0, 25)) console.log(`  ${r.path}  ${clean(textToSend(r))}${accent ? `  [${r.text}]` : ''}`);
    if (rows.length > 25) console.log(`  ... ${rows.length - 25} more`);
    const byKind = countByKind(rows);
    console.log(`rows per kind: ${Object.keys(byKind).sort().map((k) => `${k}=${byKind[k]}`).join(' ') || 'none'}`);
    console.log(`clips=${est.clips} characters=${est.chars} est. cost=US$${est.usd.toFixed(4)} (${PRICE_LABEL}; ignores free tiers; billing of niqqud marks unverified)`);
    const warned = warnedRows(rows, provider);
    if (warned.length) {
      console.log(`${warned.length} row(s) with text warnings${a.allowWarnings ? ' (rendering anyway: --allow-warnings)' : ' (skipped; fix the text or pass --allow-warnings)'}:`);
      for (const w of warned.slice(0, 20)) console.log(`  ${w.row.id}: ${w.warnings.join('; ')}  ${w.row.text}`);
    }
    const todo = a.allowWarnings ? rows : rows.filter((r) => !warned.some((w) => w.row === r));
    if (accent) {
      const noRef = todo.filter((r) => !fs.existsSync(path.join(ROOT, r.israeliRef)));
      console.log(`Israeli counterparts on disk: ${todo.length - noRef.length} of ${todo.length}${noRef.length ? ` (no cap possible for ${noRef.length}: ${noRef.slice(0, 5).map((r) => r.id).join(', ')}${noRef.length > 5 ? ', ...' : ''})` : ''}`);
    }
    if (!a.execute) { console.log('Dry run only. No network calls made. Add --execute to render (needs credentials: ' + provider.env.join(', ') + ').'); continue; }
    console.log('Reminder: TTS redistribution rights for Azure/Google output are unconfirmed; files are tagged redistributionCleared:false.');
    const marks = new Map();
    await renderBatch({ provider, rows: todo, normalize: a.normalize, cap: a.cap ? TEMPO_CAP : 0, onMeta: (r, meta) => { if (accent) marks.set(r.path, { source: meta.source }); } });
    if (accent && a.mark && marks.size) {
      const res = markAccentRows(ROOT, marks);
      console.log(`manifest: ${res.marked.length} ${tradition} row(s) now status ${ACCENT_STATUS}, source ${ACCENT_SOURCES.israeliVoice}${res.skipped.length ? `; ${res.skipped.length} skipped (recorded/reviewed)` : ''}${res.notFound.length ? `; ${res.notFound.length} path(s) not in any manifest` : ''}`);
      console.log('Next: node tools/audio/summary.mjs, then listen to a few before pushing (docs/audio/ACCENT-VOICES-2026-11-08.md has the checklist).');
    } else {
      console.log(`rendered ${todo.length} clip(s). Next: node tools/audio/mark_present.mjs for rows that were missing (or tools/tts/manifest_update.mjs for the local pipeline), then listen to a few before pushing.`);
    }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
