#!/usr/bin/env node
// Mark accepted TTS clips in the audio manifest the app reads, and copy their MP3s into <root>/audio/.
//   node tools/tts/manifest_update.mjs [--report tools/tts/verify-report.csv] [--work ~/alef-tts-work] [--root <repo>] [--no-copy] [--dry-run] [--allow-mock]
// Status written: "synthetic-unreviewed" (a computer-made clip that no human has listened to). It NEVER writes "recorded", it never touches an
// entry whose status is already "recorded" (a human clip) or "synthetic-reviewed", and it never marks a clip that is not in the report as accepted.
// How each clip was made is written into the manifest entry and the sidecar <clip>.mp3.meta.json:
//   source  "tts-hebrew" (Israeli: pointed Hebrew spoken) or "tts-respelled" (Sephardi/Ashkenazi: a Latin-letter sound word spoken); mock runs add ":mock"
//   synth   { soundWord, languageToken, model, modelVersion, package, confidence, flags, gate, refDigest }  copied from <work>/render-log.jsonl, which the
//           renderer fills. A clip with no render-log record is NOT marked (its provenance cannot be stated).
// After it runs, `node tools/audio/build_manifest.mjs --check` must still pass (the sidecar makes a rebuild give the same status, source and synth).
// The app reads the status through src/shell/audio-labels.js (see docs/tts/README.md): it never presents these clips as recorded.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, TTS_DIR, defaultWork, parseArgs, parseCsv, TTS_STATUS, REVIEWED_STATUS, HUMAN_STATUS, SOURCES, readRenderLog, clipKey } from './lib.mjs';
import { checkMp3 } from './post.mjs';
import { buildSidecar, LICENCE_NOT_CLEARED } from '../audio/sidecar.mjs';

export const SHARDS = ['israeli', 'sephardi', 'ashkenazi'];
export function manifestFiles(root) {
  return ['data/audio/manifest.json', 'data/audio/manifest-kind-word.json', ...SHARDS.map((t) => `data/audio/manifest-words-${t}.json`)].filter((r) => fs.existsSync(path.join(root, r)));
}

export function update({ root = REPO_ROOT, work = defaultWork(), reportPath, copy = true, dry = false, allowMock = false, now = () => new Date().toISOString() } = {}) {
  const rows = parseCsv(fs.readFileSync(reportPath, 'utf8'));
  const accepted = rows.filter((r) => r.verdict === 'accept');
  const files = manifestFiles(root).map((rel) => ({ rel, list: JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')), changed: false }));
  const byPath = new Map();
  for (const f of files) for (const e of f.list) byPath.set(e.path, { e, f });
  const log = readRenderLog(work);
  const res = { marked: 0, skippedHuman: [], skippedReviewed: [], notInManifest: [], noMp3: [], badMp3: [], noProvenance: [], mockRefused: 0, rejected: rows.length - accepted.length, wrongTradition: [] };
  for (const r of accepted) {
    const hit = byPath.get(r.path);
    if (!hit) { res.notInManifest.push(r.path); continue; }
    const { e, f } = hit;
    if (e.status === HUMAN_STATUS) { res.skippedHuman.push(r.path); continue; }
    if (e.status === REVIEWED_STATUS) { res.skippedReviewed.push(r.path); continue; }
    const mock = /^mock$/.test(r.engine);
    if (mock && !allowMock) { res.mockRefused++; continue; }
    const rec = log.get(clipKey(e));
    const base = rec && String(rec.source || '').replace(/:mock$/, '');
    if (!rec || !SOURCES.includes(base) || (rec.source.endsWith(':mock') !== mock)) { res.noProvenance.push(r.path); continue; }
    // A tradition may only carry its own kind of source: Israeli = pointed Hebrew, the others = respelling.
    if ((e.tradition === 'israeli') !== (base === 'tts-hebrew') || (base === 'tts-respelled' && !rec.sound_word)) { res.wrongTradition.push(r.path); continue; }
    const src = path.join(work, 'mp3', r.path);
    if (!fs.existsSync(src)) { res.noMp3.push(r.path); continue; }
    const chk = checkMp3(src);
    if (!chk.ok) { res.badMp3.push(`${r.path}: ${chk.problems.join('; ')}`); continue; }
    const synth = {
      ...(base === 'tts-respelled' ? { soundWord: rec.sound_word, soundModel: rec.sound_model || null } : {}),
      languageToken: rec.language, model: rec.model_name, modelVersion: rec.model_version, package: rec.package || null,
      confidence: rec.confidence || null, flags: rec.flags || [], gate: r.gate || (mock ? 'mock-tone' : 'asr-cer'), refDigest: rec.ref_digest || null,
    };
    const source = rec.source;
    if (!dry) {
      if (copy) {
        const dst = path.join(root, r.path);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
        // Full sidecar (fix #21): the synth object below is unchanged (the manifest
        // entry carries the identical object, and tests assert the two match). The
        // top-level audit fields add the slot (tradition), the voice id from the
        // render log, the exact input text and its hash, and the licence. For a
        // respelled clip the input text is the sound word that was actually spoken;
        // for an Israeli clip it is the pointed Hebrew.
        const at = now();
        const inputText = base === 'tts-respelled' ? rec.sound_word : e.text;
        fs.writeFileSync(`${dst}.meta.json`, JSON.stringify(buildSidecar({
          status: TTS_STATUS,
          source,
          engine: r.engine,
          voiceId: rec.voice_id || null,
          tradition: e.tradition,
          inputText,
          ingestedAt: at,
          licence: LICENCE_NOT_CLEARED,
          note: mock ? 'MOCK RUN: the audio is a test tone, not speech. Plumbing test only.' : base === 'tts-respelled'
            ? 'Synthetic voice made from a respelling (sound word) of the Hebrew. Not a human recording. No human has listened to it; how it sounds is unknown. Chatterbox output carries an inaudible PerTh watermark. Redistribution/sale clearance per docs/tts/README.md.'
            : 'Synthetic voice made from pointed Hebrew. Not a human recording. No human has listened to it. Chatterbox output carries an inaudible PerTh watermark. Redistribution/sale clearance per docs/tts/README.md.',
          inputTextKind: base === 'tts-respelled' ? 'respelling' : 'hebrew',
          renderedAt: at,
          cer: r.cer === '' || r.cer == null ? null : Number(r.cer),
          synth,
          reviewed: false,
          redistributionCleared: false,
        }), null, 1) + '\n');
      }
      e.status = TTS_STATUS; e.source = source; e.synth = synth; f.changed = true;
    }
    res.marked++;
  }
  if (!dry) for (const f of files) if (f.changed) fs.writeFileSync(path.join(root, f.rel), JSON.stringify(f.list, null, 1) + '\n');
  return res;
}

export function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv, ['no-copy', 'dry-run', 'allow-mock']);
  const root = a.root ? path.resolve(a.root) : REPO_ROOT;
  const res = update({ root, work: path.resolve(a.work || defaultWork()), reportPath: path.resolve(a.report || path.join(TTS_DIR, 'verify-report.csv')), copy: !a['no-copy'], dry: !!a['dry-run'], allowMock: !!a['allow-mock'] });
  console.log(`${a['dry-run'] ? 'DRY RUN: would mark' : 'marked'} ${res.marked} clips as status "${TTS_STATUS}"; ${res.rejected} rejected by the gate (untouched)`);
  for (const [k, v] of Object.entries(res)) if (Array.isArray(v) && v.length) console.warn(`warning: ${k}: ${v.length} (first: ${v[0]})`);
  if (res.mockRefused) console.warn(`warning: ${res.mockRefused} mock-engine rows refused (use --allow-mock only on a scratch copy)`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
