#!/usr/bin/env node
// Records every dictionary word that has no clip yet, in Ari's and Noa's Israeli voices (Google he-IL WaveNet pair),
// then makes them playable: adds the rows to data/audio/manifest-words-israeli.json, rebuilds data/vocab/clip-lookup.json
// and data/audio/summary.json. Safe to stop and run again: words already on disk are not sent again.
//
//   set GOOGLE_TTS_API_KEY=...            (Command Prompt)   /   export GOOGLE_TTS_API_KEY=...   (bash)
//   node tools/audio/render_dictionary.mjs              dry run: how many words, characters and the approximate cost
//   node tools/audio/render_dictionary.mjs --execute    record them (about 7,200 clips)
//   node tools/audio/render_dictionary.mjs --execute --limit 20    try a few first
// Then: git add -A && git commit -m "Dictionary recordings" && git push
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as google from './tts/google.mjs';
import { renderBatch } from './render_tts.mjs';
import { clipKey } from '../../src/vocab/clips.js';
import { transliterate } from '../../src/pronunciation/transliterate.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const rel = (p) => path.join(ROOT, p);
const readJson = (p) => JSON.parse(fs.readFileSync(rel(p), 'utf8'));
const SHARD = 'data/audio/manifest-words-israeli.json';

export function dictionaryRows() {
  const words = readJson('data/vocab/vocab5000.json').entries;
  const lookup = readJson('data/vocab/clip-lookup.json').clips;
  const rows = [];
  for (const w of words.sort((a, b) => a.rank - b.rank)) {
    const text = w.pointed && /[ְ-ׇ]/.test(w.pointed) ? w.pointed : null; // only pointed words: unpointed text is read unreliably
    if (!text || lookup[clipKey(text)]) continue;
    for (const voice of ['m', 'f']) {
      const id = `dict-${w.id}`;
      rows.push({ path: `audio/${voice}/israeli/word/${id}.mp3`, voice, tradition: 'israeli', kind: 'word', id, text, status: 'tts', source: 'paid-cloud',
        group: 'dictionary-word', english: w.gloss || '', phonetic: transliterate(text).trim(), rank: w.rank });
    }
  }
  return rows;
}

async function main(argv) {
  const execute = argv.includes('--execute');
  const li = argv.indexOf('--limit'); const limit = li >= 0 ? Number(argv[li + 1]) : Infinity;
  const all = dictionaryRows();
  const todo = all.filter((r) => !fs.existsSync(rel(r.path))).slice(0, limit * 2);
  const chars = todo.reduce((n, r) => n + r.text.length, 0);
  console.log(`${all.length / 2} words without a clip; ${todo.length} clips to record, ${chars} characters, about $${(chars / 1e6 * google.PRICES.wavenet).toFixed(2)} at the WaveNet list price.`);
  if (!execute) { console.log('Dry run. Add --execute to record.'); return; }
  if (!process.env.GOOGLE_TTS_API_KEY) { console.error('GOOGLE_TTS_API_KEY is not set.'); process.exit(1); }
  if (spawnSync('ffmpeg', ['-version']).status !== 0) console.log('ffmpeg not found: clips are kept as Google sends them (no loudness pass).');
  const normalize = spawnSync('ffmpeg', ['-version']).status === 0;
  for (let i = 0; i < todo.length; i += 50) {
    await renderBatch({ provider: google, rows: todo.slice(i, i + 50), root: ROOT, normalize, log: () => {} });
    console.log(`${Math.min(i + 50, todo.length)} of ${todo.length}`);
  }
  // Add every recorded row that is not in the shard yet, then rebuild the lookup and the summary.
  const shard = readJson(SHARD);
  const have = new Set(shard.map((r) => r.path));
  const add = all.filter((r) => fs.existsSync(rel(r.path)) && !have.has(r.path)).map(({ rank, ...r }) => r);
  if (add.length) fs.writeFileSync(rel(SHARD), '[\n' + [...shard, ...add].map((r) => JSON.stringify(r)).join(',\n') + '\n]\n');
  console.log(`added ${add.length} rows to ${SHARD}`);
  for (const s of ['tools/vocab/build-clip-lookup.mjs', 'tools/audio/summary.mjs', 'tools/build-precache.mjs']) {
    const r = spawnSync(process.execPath, [rel(s)], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) console.log(`${s} did not finish; run it by hand.`);
  }
  console.log('Done. Commit and push to put them on the site.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main(process.argv.slice(2));
