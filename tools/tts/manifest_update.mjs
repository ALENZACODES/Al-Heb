#!/usr/bin/env node
// Mark accepted TTS clips in the audio manifest the app reads, and copy their MP3s into <root>/audio/.
//   node tools/tts/manifest_update.mjs [--report tools/tts/verify-report.csv] [--work ~/alef-tts-work] [--root <repo>] [--no-copy] [--dry-run] [--allow-mock]
// Status written: "tts" (the app's existing synthetic-voice value, shown with the label in src/shell/audio-labels.js). It NEVER writes
// "recorded", and it never touches an entry whose status is already "recorded" (a human clip). It also never marks a clip that is
// not in the report as accepted. After it runs, `node tools/audio/build_manifest.mjs --check` must still pass (the sidecar .meta.json
// written next to each MP3 makes a rebuild give the same status and source).
// Why not "recorded-tts": src/shell/audio.js and src/audio/player.js only know recorded|tts|missing. An unknown status would be counted as
// missing in the summary and given the human-recording label by describeResult, and build_manifest.mjs would fall back to "recorded". See docs/tts/README.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, TTS_DIR, defaultWork, parseArgs, parseCsv, TTS_STATUS, HUMAN_STATUS } from './lib.mjs';
import { checkMp3 } from './post.mjs';

export const SHARDS = ['israeli', 'sephardi', 'ashkenazi'];
export function manifestFiles(root) {
  return ['data/audio/manifest.json', ...SHARDS.map((t) => `data/audio/manifest-words-${t}.json`)].filter((r) => fs.existsSync(path.join(root, r)));
}

export function update({ root = REPO_ROOT, work = defaultWork(), reportPath, copy = true, dry = false, allowMock = false, now = () => new Date().toISOString() } = {}) {
  const rows = parseCsv(fs.readFileSync(reportPath, 'utf8'));
  const accepted = rows.filter((r) => r.verdict === 'accept');
  const files = manifestFiles(root).map((rel) => ({ rel, list: JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')), changed: false }));
  const byPath = new Map();
  for (const f of files) for (const e of f.list) byPath.set(e.path, { e, f });
  const res = { marked: 0, skippedHuman: [], notInManifest: [], noMp3: [], badMp3: [], mockRefused: 0, rejected: rows.length - accepted.length, notIsraeli: [] };
  for (const r of accepted) {
    const hit = byPath.get(r.path);
    if (!hit) { res.notInManifest.push(r.path); continue; }
    const { e, f } = hit;
    if (e.tradition !== 'israeli') { res.notIsraeli.push(r.path); continue; }
    if (e.status === HUMAN_STATUS) { res.skippedHuman.push(r.path); continue; }
    if (/^mock$/.test(r.engine) && !allowMock) { res.mockRefused++; continue; }
    const src = path.join(work, 'mp3', r.path);
    if (!fs.existsSync(src)) { res.noMp3.push(r.path); continue; }
    const chk = checkMp3(src);
    if (!chk.ok) { res.badMp3.push(`${r.path}: ${chk.problems.join('; ')}`); continue; }
    const source = r.engine === 'mock' ? 'tts:mock' : 'tts:chatterbox';
    if (!dry) {
      if (copy) {
        const dst = path.join(root, r.path);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
        fs.writeFileSync(`${dst}.meta.json`, JSON.stringify({
          status: TTS_STATUS, source, renderedAt: now(), engine: r.engine, cer: Number(r.cer), redistributionCleared: false,
          note: 'Synthetic voice. Not a human recording. Chatterbox output carries an inaudible PerTh watermark. Redistribution/sale clearance per docs/tts/README.md.',
        }, null, 1) + '\n');
      }
      e.status = TTS_STATUS; e.source = source; f.changed = true;
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
