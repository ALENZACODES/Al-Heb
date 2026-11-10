#!/usr/bin/env node
// Tempo cap for EXISTING Sephardi / Ashkenazi clips on disk (owner decision 2026-11-07 22:56, docs/audio/ACCENT-VOICES-2026-11-08.md):
// a tradition clip may be at most 1.26 x the length of the Israeli clip of the same voice, kind and id. DRY RUN BY DEFAULT.
//   node tools/audio/tempo_cap.mjs --tradition sephardi --voice both [--kinds line,word] [--cap 1.26] [--dry-run | --execute] [--admit-all] [--limit N]
// Dry run: lists every own-tradition file over the cap with its current and target duration, and totals per kind.
// --execute: each file over the cap is sped up to exactly the cap (ffmpeg atempo, same pitch; a chain of atempo filters beyond 2x; a clip
// is never slowed down), loudness-normalized again, and its sidecar records tempo { applied, factor, cap, before, after, israeliSec,
// israeliRef }. RE-ADMISSION: a rewritten file's manifest row is updated to status synthetic-unreviewed and source
// 'tts-respelled-tempo-capped' (or keeps 'tts-respelled-israeli-voice' when the renderer made it), which src/audio/player.js admits
// to playback (isAccentClip); every other old respelled file stays retired. --admit-all also marks files already within the cap
// (no rewrite, tempo.factor 1) so a whole slice can be re-admitted at once; without it only rewritten files are re-admitted.
// Files with no Israeli counterpart on disk are listed and left alone (no cap can be measured, so they stay retired).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifestFull } from './manifest_io.mjs';
import { normalizeClip } from './render_tts.mjs';
import { ACCENT_TRADITIONS, ACCENT_SOURCES, ACCENT_STATUS, TEMPO_CAP, israeliRef, clipDuration, tempoFactor, capClip, readMeta, writeMeta, markAccentRows, haveFfmpeg, isAccentSource } from './accent.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ALL_KINDS = ['letter', 'vowel', 'syllable', 'word', 'line', 'prayer'];

/** Own-tradition rows that have a file on disk (status not missing), for the voice set and kinds. */
export function selectExisting(manifest, { tradition, voice, kinds = ALL_KINDS, root = ROOT, limit }) {
  if (!ACCENT_TRADITIONS.includes(tradition)) throw new Error(`--tradition ${tradition}: sephardi or ashkenazi`);
  const voices = voice === 'both' ? ['m', 'f'] : [voice];
  let rows = manifest.filter((e) => e.tradition === tradition && voices.includes(e.voice) && kinds.includes(e.kind) && e.status !== 'missing' && !e.aliasOf
    && e.path && fs.existsSync(path.join(root, e.path)));
  if (limit) rows = rows.slice(0, limit);
  return rows;
}

/**
 * Measure every row against its Israeli counterpart. Returns per-row records { row, israeliRef, before, israeliSec, factor, target, over, noRef }
 * and totals per kind { files, over, noRef, within }.
 */
export function measure(rows, { root = ROOT, cap = TEMPO_CAP, log = null } = {}) {
  const out = [];
  const totals = {};
  let i = 0;
  for (const row of rows) {
    const t = (totals[row.kind] ||= { files: 0, over: 0, within: 0, noRef: 0, secondsOver: 0 });
    t.files += 1;
    const ref = israeliRef(row.path);
    const refAbs = path.join(root, ref);
    const before = clipDuration(path.join(root, row.path));
    const israeliSec = fs.existsSync(refAbs) ? clipDuration(refAbs) : null;
    const factor = tempoFactor(before, israeliSec, cap);
    const rec = { row, israeliRef: ref, before, israeliSec, factor, target: israeliSec ? Math.min(before ?? 0, cap * israeliSec) : null, over: factor > 1, noRef: israeliSec === null };
    if (rec.noRef) t.noRef += 1; else if (rec.over) { t.over += 1; t.secondsOver += before - cap * israeliSec; } else t.within += 1;
    out.push(rec);
    i += 1;
    if (log && i % 250 === 0) log(`  measured ${i}/${rows.length}`);
  }
  return { records: out, totals };
}

function parseArgs(argv) {
  const a = { execute: false, admitAll: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--execute') a.execute = true;
    else if (k === '--dry-run') a.execute = false;
    else if (k === '--admit-all') a.admitAll = true;
    else if (k.startsWith('--')) a[k.slice(2)] = argv[++i];
  }
  return a;
}

export async function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv);
  if (!ACCENT_TRADITIONS.includes(a.tradition)) { console.error('--tradition sephardi|ashkenazi required'); process.exit(2); }
  if (!['m', 'f', 'both'].includes(a.voice)) { console.error('--voice m|f|both required'); process.exit(2); }
  if (!haveFfmpeg()) { console.error('ffmpeg is required (durations are measured by decoding)'); process.exit(2); }
  const cap = a.cap ? Number(a.cap) : TEMPO_CAP;
  if (!(cap > 1)) { console.error('--cap must be greater than 1'); process.exit(2); }
  const kinds = a.kinds ? a.kinds.split(',') : ALL_KINDS;
  const manifest = loadManifestFull(ROOT);
  const rows = selectExisting(manifest, { tradition: a.tradition, voice: a.voice, kinds, limit: a.limit ? +a.limit : undefined });
  console.log(`${a.execute ? 'EXECUTE' : 'DRY RUN'}: tempo cap ${cap}x the Israeli clip, tradition=${a.tradition} voice=${a.voice} kinds=${kinds.join(',')}; ${rows.length} own-tradition file(s) on disk`);
  const { records, totals } = measure(rows, { cap, log: console.log });
  const over = records.filter((r) => r.over);
  const noRef = records.filter((r) => r.noRef);
  console.log('files over the cap (current -> target seconds, Israeli seconds):');
  for (const r of over) console.log(`  ${r.row.path}  ${r.before.toFixed(2)} -> ${r.target.toFixed(2)}  (Israeli ${r.israeliSec.toFixed(2)}, x${r.factor.toFixed(3)})`);
  if (!over.length) console.log('  none');
  if (noRef.length) { console.log(`no Israeli counterpart on disk (left alone, stays retired): ${noRef.length}`); for (const r of noRef.slice(0, 20)) console.log(`  ${r.row.path}`); }
  console.log('per kind: kind files over within noRef secondsOver');
  for (const k of Object.keys(totals).sort()) { const t = totals[k]; console.log(`  ${k} ${t.files} ${t.over} ${t.within} ${t.noRef} ${t.secondsOver.toFixed(1)}`); }
  const sum = Object.values(totals).reduce((s, t) => ({ files: s.files + t.files, over: s.over + t.over, within: s.within + t.within, noRef: s.noRef + t.noRef }), { files: 0, over: 0, within: 0, noRef: 0 });
  console.log(`total: files=${sum.files} over=${sum.over} within=${sum.within} noRef=${sum.noRef}`);
  if (!a.execute) { console.log('Dry run only: no file was changed. Add --execute to rewrite the files over the cap and re-admit them' + (a.admitAll ? ' (and, with --admit-all, the files already within it)' : '') + '.'); return; }
  const marks = new Map();
  let rewritten = 0;
  for (const r of records) {
    if (r.noRef) continue;
    const abs = path.join(ROOT, r.row.path);
    const meta = readMeta(abs);
    const source = isAccentSource(meta.source) ? meta.source : ACCENT_SOURCES.tempoCapped;
    if (r.over) {
      const res = capClip(abs, path.join(ROOT, r.israeliRef), { cap, normalize: normalizeClip, israeliRef: r.israeliRef });
      writeMeta(abs, { ...meta, status: ACCENT_STATUS, source, tempo: res, tempoCappedAt: new Date().toISOString(),
        note: meta.note || `Older synthetic clip made by an outside voice from the ${a.tradition} English-letter respelling, sped up at the same pitch to at most ${cap}x its Israeli counterpart. Not a human recording; no human has listened to it.` });
      marks.set(r.row.path, { source });
      rewritten += 1;
      console.log(`capped ${r.row.path}: ${res.before.toFixed(2)}s -> ${res.after.toFixed(2)}s (x${res.factor.toFixed(3)})`);
    } else if (a.admitAll) {
      writeMeta(abs, { ...meta, status: ACCENT_STATUS, source, tempo: { applied: false, factor: 1, cap, before: r.before, after: r.before, israeliSec: r.israeliSec, israeliRef: r.israeliRef }, tempoCheckedAt: new Date().toISOString(),
        note: meta.note || `Older synthetic clip made by an outside voice from the ${a.tradition} English-letter respelling; already within ${cap}x its Israeli counterpart. Not a human recording; no human has listened to it.` });
      marks.set(r.row.path, { source });
    }
  }
  const res = markAccentRows(ROOT, marks);
  console.log(`rewrote ${rewritten} file(s); manifest: ${res.marked.length} ${a.tradition} row(s) re-admitted (status ${ACCENT_STATUS}, source ${ACCENT_SOURCES.tempoCapped} unless the renderer's provenance was already there)${res.skipped.length ? `; ${res.skipped.length} skipped (recorded/reviewed)` : ''}${res.notFound.length ? `; ${res.notFound.length} path(s) not in any manifest` : ''}`);
  console.log('Next: node tools/audio/summary.mjs, then listen to a few before pushing.');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
