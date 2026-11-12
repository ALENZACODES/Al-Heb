#!/usr/bin/env node
// Sephardi and Ashkenazi clips of their own for the rows that play the Israeli clip (status "plays-israeli"), made exactly as the
// repo's accent pipeline makes them (tools/audio/render_tts.mjs --tradition sephardi|ashkenazi, docs/audio/ACCENT-VOICES-2026-11-08.md):
// the Israeli he-IL WaveNet voice of the same slot (Ari he-IL-Wavenet-B, Noa he-IL-Wavenet-A) reads the tradition's English-letter
// respelling of the row's pointed Hebrew (tools/audio/accent.mjs respellFor), the clip is loudness-normalised and tempo-capped to at
// most 1.26x its Israeli counterpart, and the sidecar records the accent provenance. renderBatch from render_tts.mjs does all of it;
// this file only chooses the rows (render_tts selects status "missing" rows, and these rows say "plays-israeli") and shards them.
// Nothing is admitted here: the rows are reviewed by tools/audio/accent_review.py and only a clip that passes 2 of 3 reviewers flips
// its row (tools/audio/accent_merge.mjs).
//   node tools/audio/accent_fill.mjs --plan --kinds letter,vowel,syllable,prayer,line [--traditions sephardi,ashkenazi]
//        write tools/audio/accent-list.json (paths, respellings, estimate); no network
//   node tools/audio/accent_fill.mjs --list tools/audio/accent-list.json --shard 0 --of 20     render one shard (needs GOOGLE_TTS_API_KEY)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifestFull } from './manifest_io.mjs';
import { respellFor, israeliRef, TEMPO_CAP } from './accent.mjs';
import { renderBatch, estimate, warnedRows } from './render_tts.mjs';
import * as google from './tts/google.mjs';
import { PLAYS_ISRAELI } from '../../src/audio/player.js';
import { heldReason } from './fill_list.mjs';
import { ashkenaziScript } from './ashkenazi_script.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const STT_PER_REQUEST = 0.006; // Google Speech-to-Text v1, one 15-second step per clip (longer clips cost more)

function arg(name, def) { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : def; }

// script 'hebrew' (12 Nov, second method): Ashkenazi rows send the Ashkenazi reading written in pointed Hebrew letters instead of the
// English-letter respelling (tools/audio/ashkenazi_script.mjs), and carry it as scriptText for the review to judge against. Sephardi rows
// are left out in this mode: the app's own Sephardi reading is letter for letter the Israeli one (src/pronunciation/forTradition.js),
// so the Israeli voice reading the Sephardi reading in Hebrew letters would only make the Israeli clip again.
export function plan({ kinds, traditions, root = ROOT, out = 'tools/audio/accent-list.json', script = 'latin' }) {
  if (script === 'hebrew') traditions = traditions.filter((t) => t === 'ashkenazi');
  const all = loadManifestFull(root);
  const rows = all.filter((e) => traditions.includes(e.tradition) && kinds.includes(e.kind) && e.status === PLAYS_ISRAELI && !e.aliasOf
    && !heldReason(e) && fs.existsSync(path.join(root, israeliRef(e.path))))   // clergy-list ids and uncovered divine-name forms stay held
    .map((e) => ({ path: e.path, voice: e.voice, tradition: e.tradition, kind: e.kind, id: e.id, text: e.text, israeliRef: israeliRef(e.path),
      ...(script === 'hebrew' ? { spokenText: ashkenaziScript(e.text), scriptText: ashkenaziScript(e.text), madeFrom: 'hebrew-script' } : { spokenText: respellFor(e.text, e.tradition) }) }));
  const warned = new Set(warnedRows(rows, google).map((w) => w.row.path));
  const ok = rows.filter((r) => !warned.has(r.path));
  const est = estimate(ok, google);
  const stt = ok.reduce((n, r) => n + Math.max(1, Math.ceil([...r.text].length / 12 / 15)), 0) * STT_PER_REQUEST;
  const summary = { rows: ok.length, skippedWithWarnings: warned.size, chars: est.chars, ttsUsd: +est.usd.toFixed(2), sttUsd: +stt.toFixed(2), totalUsd: +(est.usd + stt).toFixed(2) };
  fs.writeFileSync(path.join(root, out), JSON.stringify({ schema: 'alef-accent-list/1', kinds, traditions, script, estimate: summary, rows: ok, warned: [...warned] }, null, 1) + '\n');
  console.log(out, JSON.stringify(summary));
  return summary;
}

export async function shard({ list, n, of }) {
  const { rows } = JSON.parse(fs.readFileSync(path.join(ROOT, list), 'utf8'));
  const mine = rows.filter((_, i) => i % of === n);
  const written = await renderBatch({ provider: google, rows: mine, normalize: true, cap: TEMPO_CAP });
  console.log(`shard ${n}/${of}: ${written.length} of ${mine.length} rendered`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--plan')) plan({ kinds: arg('--kinds', 'letter,vowel,syllable,prayer,line').split(','), traditions: arg('--traditions', 'sephardi,ashkenazi').split(','), script: arg('--script', 'latin'), out: arg('--out', 'tools/audio/accent-list.json') });
  else await shard({ list: arg('--list', 'tools/audio/accent-list.json'), n: +arg('--shard', '0'), of: +arg('--of', '1') });
}
