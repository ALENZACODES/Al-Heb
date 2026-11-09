#!/usr/bin/env node
// Build the hand-off folder for a real listener, like the earlier Aleph-THREE-JUDGE-PASSED batch:
//   <out>/audio/<voice>/<tradition>/<kind>/<id>.mp3      ONLY clips that all three judges passed ("unanimous-machine-pass"); the layout tools/audio/ingest.mjs reads as is
//   <out>/manifest.csv, manifest.json                     the 14 columns of the earlier batch (id,he,source_file,source_text_sha256,source_structural,recognition,consistency,
//                                                         overall,human_approved,status,wav_file,wav_sha256,mp3_file,mp3_sha256) + tradition, voice_slot, respelled_text
//   <out>/failures.csv, failures.json                     everything that did not pass, with the reasons (or "not judged")
//   <out>/listing.csv                                     ingest listing (file,id,voice,tradition,kind,text)
//   <out>/listen/<tradition>-<slot>.html + .csv           offline listening pages and sheets (the repo's audio packet page), one per tradition x voice slot
//   <out>/README.md                                       the honest caveats
//   node tools/tts/voice_handoff.mjs [--work DIR] [--out DIR] [--root REPO] [--include-wav] [--allow-mock]
// A verdict only counts if it was made on the exact file that is delivered (hash check). Mock runs are refused unless --allow-mock, and are then labelled MOCK everywhere.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, csvCell } from './lib.mjs';
import { STATUS, LICENCE, REPO_ROOT, workPaths, defaultWork, sha256, writeAtomic, readJsonl, keyOf } from './voice_lib.mjs';
import { renderedTake1, loadVerdicts, J1, J2, J3 } from './voice_judge.mjs';
import { glossIndex, TRADITION_LABEL } from '../review/audio_packet_lib.mjs';
import { buildPage, buildSheetCsv } from '../review/build_audio_packet.mjs';

export const COLS14 = ['id', 'he', 'source_file', 'source_text_sha256', 'source_structural', 'recognition', 'consistency', 'overall', 'human_approved', 'status', 'wav_file', 'wav_sha256', 'mp3_file', 'mp3_sha256'];
export const COLS = [...COLS14, 'tradition', 'voice_slot', 'respelled_text'];
export const PASS = 'unanimous-machine-pass';
const toCsv = (cols, rows) => cols.join(',') + '\n' + rows.map((r) => cols.map((c) => csvCell(r[c])).join(',')).join('\n') + (rows.length ? '\n' : '');

export function buildReadme({ counts, mock, prov }) {
  return `${mock ? '# MOCK RUN: NOT SPEECH, DO NOT INGEST OR SEND TO A LISTENER\n\nEvery clip in this folder is a synthetic tone made by --mock mode to test the plumbing. It is here only so the tools can be tested.\n\n' : ''}# Hand-off: respelled Sephardi and Ashkenazi words (machine-checked, NOT human-reviewed)

Read this before listening or ingesting.

## What this is

- ${counts.passed} clips passed all three machine judges (${counts.total} were rendered; ${counts.failed} did not pass and are in \`failures.csv\` with reasons).
- Each clip is synthetic. It was made by sending the stored Latin-letter **respelling** (\`respelled_text\`) of a Hebrew word to an outside text-to-speech service, in a man voice slot (m) or a woman voice slot (f). The pointed Hebrew was never sent.
- Status of every clip: \`${STATUS}\`. \`human_approved\` is \`False\` for every row. No person has listened to any of these clips. Licence: **${LICENCE}**${prov.ownerLicenceNote ? ` (your note: ${prov.ownerLicenceNote})` : ''}.
- Provenance recorded in \`manifest.json\`: model, output format, voice settings, seeds, voice ids per slot, request ids where the service gave them.

## What the three judges did, and what they cannot prove

1. Structural/acoustic (local): duration plausible for the word length, silence ratio, longest inner gap, clipping on the raw render, loudness, sample rate, channels, metadata, energy at the tail (cut-off check).
2. Recognition: a speech recogniser transcribed each clip in Hebrew; the transcript was compared with the expected Hebrew (niqqud, punctuation and spaces removed, final letters folded) with an edit-distance similarity of at least ${J2.minSimilarity}.
3. Consistency: a second take with a different seed was compared with the first (length ratio ${J3.durRatio.join(' to ')}, transcript similarity, long-term spectral similarity at least ${J3.spectralMin}), and each clip was checked against the same word in the other voice slot.

"${PASS}" means all three passed. It means the file is technically sound and a recogniser trained mostly on Israeli Hebrew could understand the respelling. It does **not** mean:

- that the accent is Ashkenazi or Sephardi (the model has no such mode; the respelling is a workaround; the judges cannot hear an accent),
- that the vowels or the stress are right,
- that the word sounds right to a learner or that the voice is pleasant, natural or suitable,
- that the voice or the output may be sold in an app (see the licence line above).

Only a native listener can judge those. The thresholds are starting points that were not calibrated on real speech. If a recogniser reads a Latin-letter respelling back as Hebrew, that is evidence of intelligibility only.

## How to listen

Open \`listen/<tradition>-<slot>.html\` in a browser (offline; it plays \`audio/\` next to it) and fill the matching \`.csv\` sheet. Listen to a sample of every tradition and voice slot first, including some that the judges passed with low scores. Nothing is approved by listening, sending or returning the files; approval is a separate step in the repo.

## Ingest

From a clean branch of the repo: \`node tools/audio/ingest.mjs <this folder>/audio --listing <this folder>/listing.csv --origin respelled --batch "<neutral label>"\` as a dry run first; add \`--apply\` only after reading the report. See \`docs/tts/VOICE-SERVICE-RUNBOOK.md\`. The in-app label for these clips says they were made from a respelling and that the accent is not verified.
`;
}

export function buildHandoff({ work, out, root = REPO_ROOT, includeWav = false, allowMock = false }) {
  const P = workPaths(work); const recs = renderedTake1(work);
  if (!recs.length) throw new Error(`nothing rendered in ${work}`);
  const mock = recs.some((r) => r.mock);
  if (mock && !allowMock) throw new Error('this work folder holds mock (tone) output; pass --allow-mock to build a clearly labelled MOCK folder for testing');
  const V = { j1: loadVerdicts(work, 'j1'), j2: loadVerdicts(work, 'j2'), j3: loadVerdicts(work, 'j3') };
  const dest = mock ? `${out}-MOCK-DO-NOT-INGEST` : out;
  fs.rmSync(dest, { recursive: true, force: true }); fs.mkdirSync(dest, { recursive: true });
  const rows = [], fails = [];
  for (const r of recs) {
    const clip = P.clip(1, r); const have = fs.existsSync(clip); const mp3 = have ? sha256(fs.readFileSync(clip)) : '';
    const res = {}; const why = [];
    for (const j of ['j1', 'j2', 'j3']) {
      const v = V[j].get(keyOf(r));
      if (!v) { res[j] = 'not-judged'; why.push(`${j}: not judged`); }
      else if (v.mp3_sha256 !== mp3) { res[j] = 'stale'; why.push(`${j}: verdict was made on a different file`); }
      else { res[j] = v.verdict; if (v.verdict !== 'pass') why.push(`${j}: ${(v.reasons || []).join('; ')}`); }
    }
    const ok = have && res.j1 === 'pass' && res.j2 === 'pass' && res.j3 === 'pass';
    const rawF = P.raw(1, r, r.file_ext || 'wav'); const wavRel = `wav/${r.voice}/${r.tradition}/${r.kind}/${r.id}.${r.file_ext || 'wav'}`; const mp3Rel = `audio/${r.voice}/${r.tradition}/${r.kind}/${r.id}.mp3`;
    const row = { id: r.id, he: r.he, source_file: r.source_file || `data/tts/soundwords.${r.tradition}.json`, source_text_sha256: r.text_sha256, source_structural: res.j1, recognition: res.j2, consistency: res.j3,
      overall: ok ? PASS : 'not-passed', human_approved: 'False', status: STATUS, wav_file: '', wav_sha256: '', mp3_file: mp3Rel, mp3_sha256: mp3, tradition: r.tradition, voice_slot: r.voice, respelled_text: r.text_sent };
    if (ok) {
      writeAtomic(path.join(dest, mp3Rel), fs.readFileSync(clip));
      if (includeWav && fs.existsSync(rawF)) { writeAtomic(path.join(dest, wavRel), fs.readFileSync(rawF)); row.wav_file = wavRel; row.wav_sha256 = r.audio_sha256; }
      rows.push({ ...row, _rec: r });
    } else fails.push({ id: r.id, tradition: r.tradition, voice_slot: r.voice, respelled_text: r.text_sent, he: r.he, source_structural: res.j1, recognition: res.j2, consistency: res.j3, reasons: why.join(' | ') || (have ? '' : 'clip file missing') });
  }
  const counts = { total: recs.length, passed: rows.length, failed: fails.length, byTraditionVoice: {} };
  for (const r of rows) { const k = `${r.tradition}/${r.voice_slot}`; counts.byTraditionVoice[k] = (counts.byTraditionVoice[k] || 0) + 1; }
  const first = recs[0];
  const voiceIds = {}; for (const r of recs) voiceIds[r.voice] = r.voice_id;
  const prov = { model_id: first.model_id, output_format: first.output_format, seed_take1: first.seed, voice_settings: first.voice_settings, language_code: first.language_code, voice_ids: voiceIds, licence: LICENCE, ownerLicenceNote: first.owner_licence_note || '', source: first.source, mock };
  fs.writeFileSync(path.join(dest, 'manifest.csv'), toCsv(COLS, rows));
  fs.writeFileSync(path.join(dest, 'manifest.json'), JSON.stringify({ schema: 'alef-voice-handoff/1', mock, counts, provenance: prov, columns: COLS,
    rows: rows.map(({ _rec, ...r }) => ({ ...r, request_id: _rec.request_id || null, model_id: _rec.model_id, voice_id: _rec.voice_id, seed: _rec.seed, licence: LICENCE })) }, null, 1) + '\n');
  fs.writeFileSync(path.join(dest, 'failures.csv'), toCsv(['id', 'tradition', 'voice_slot', 'respelled_text', 'he', 'source_structural', 'recognition', 'consistency', 'reasons'], fails));
  fs.writeFileSync(path.join(dest, 'failures.json'), JSON.stringify(fails, null, 1) + '\n');
  fs.writeFileSync(path.join(dest, 'listing.csv'), toCsv(['file', 'id', 'voice', 'tradition', 'kind', 'text'], rows.map((r) => ({ file: r.mp3_file, id: r.id, voice: r.voice_slot, tradition: r.tradition, kind: r._rec.kind, text: r.he }))));
  fs.writeFileSync(path.join(dest, 'README.md'), buildReadme({ counts, mock, prov }));
  // listening pages: the repo's packet page keys on id, so one page per tradition x voice slot
  const gl = fs.existsSync(path.join(root, 'data')) ? glossIndex(root) : new Map(); const pages = [];
  for (const t of ['sephardi', 'ashkenazi']) for (const s of ['m', 'f']) {
    const clips = rows.filter((r) => r.tradition === t && r.voice_slot === s).map((r) => ({ id: r.id, hebrew: r.he, gloss: gl.get(r.id) || '', tradition: TRADITION_LABEL[t], traditionKey: t, voice: s, kind: r._rec.kind, group: r._rec.group || '',
      file: r.mp3_file, rel: `${s}/${t}/${r._rec.kind}/${r.id}.mp3`, sha256: r.mp3_sha256, bytes: fs.statSync(path.join(dest, r.mp3_file)).size })).sort((a, b) => (a.id < b.id ? -1 : 1));
    if (!clips.length) continue;
    fs.mkdirSync(path.join(dest, 'listen'), { recursive: true });
    fs.writeFileSync(path.join(dest, 'listen', `${t}-${s}.html`), buildPage(clips, '../audio')); fs.writeFileSync(path.join(dest, 'listen', `${t}-${s}.csv`), buildSheetCsv(clips)); pages.push(`${t}-${s}`);
  }
  return { dest, counts, mock, pages };
}

export async function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv, ['include-wav', 'allow-mock', 'help']);
  if (a.help) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n')); return; }
  const work = path.resolve(a.work || defaultWork());
  const r = buildHandoff({ work, out: path.resolve(a.out || path.join(work, 'handoff', 'Aleph-RESPELLED-THREE-JUDGE-PASSED')), root: a.root ? path.resolve(a.root) : REPO_ROOT, includeWav: !!a['include-wav'], allowMock: !!a['allow-mock'] });
  console.log(`hand-off ${r.mock ? '(MOCK) ' : ''}-> ${r.dest}\n  ${r.counts.passed} unanimous-machine-pass of ${r.counts.total} rendered; ${r.counts.failed} in failures.csv; listening pages: ${r.pages.join(', ') || 'none'}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
