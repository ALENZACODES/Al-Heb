#!/usr/bin/env node
// Batch TTS renderer. DRY-RUN BY DEFAULT: lists what would be sent, characters, and approximate cost. Live calls need --execute.
//   node tools/audio/render_tts.mjs --provider azure --voice m [--tradition israeli] [--kinds word,line,syllable] [--limit N] [--execute]
// Refuses --tradition ashkenazi/sephardi: no TTS offers those; Ashkenazi audio must be human-recorded.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as azure from './tts/azure.mjs';
import * as google from './tts/google.mjs';
import * as elevenlabs from './tts/elevenlabs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const PROVIDERS = { azure, google, elevenlabs };
export const PRICE_LABEL = 'list price verified on fetched pages 2026-11-03, see data/audio/tts-prices.json (azure row inferred for he-IL voices)';
export const DEFAULT_KINDS = ['syllable', 'word', 'line', 'prayer'];

export function selectEntries(manifest, { voice, tradition = 'israeli', kinds = DEFAULT_KINDS, limit, onlyMissing = true }) {
  if (tradition !== 'israeli') throw new Error(`refusing tradition "${tradition}": no TTS provider offers it (Web/cloud voices are Modern Israeli Hebrew). Record a human.`);
  let rows = manifest.filter((e) => e.voice === voice && e.tradition === tradition && kinds.includes(e.kind) && !e.aliasOf && (!onlyMissing || e.status === 'missing'));
  if (limit) rows = rows.slice(0, limit);
  return rows;
}

export function estimate(rows, provider) {
  const chars = rows.reduce((n, r) => n + [...r.text].length, 0); // code points; niqqud marks counted (billing treatment unverified)
  return { clips: rows.length, chars, usd: (chars / 1e6) * provider.pricePerMillionChars };
}

export async function renderBatch({ provider, rows, root = ROOT, fetchImpl = fetch, env = process.env, now = () => new Date().toISOString(), log = console.log }) {
  const written = [];
  for (const r of rows) {
    const buf = await provider.synthesize({ text: r.text, voice: r.voice, env }, fetchImpl);
    const out = path.join(root, r.path);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    fs.writeFileSync(`${out}.meta.json`, JSON.stringify({ status: 'tts', source: `tts:${provider.id}`, renderedAt: now(), redistributionCleared: false, note: 'TTS output redistribution rights not confirmed by counsel' }, null, 1) + '\n');
    written.push(r.path); log(`wrote ${r.path}`);
  }
  return written;
}

function parseArgs(argv) {
  const a = { execute: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--execute') a.execute = true;
    else if (k === '--dry-run') a.execute = false;
    else if (k.startsWith('--')) a[k.slice(2)] = argv[++i];
  }
  return a;
}

export async function main(argv = process.argv.slice(2)) {
  const a = parseArgs(argv);
  const provider = PROVIDERS[a.provider];
  if (!provider) { console.error(`--provider required: ${Object.keys(PROVIDERS).join('|')}`); process.exit(2); }
  if (!['m', 'f'].includes(a.voice)) { console.error('--voice m|f required'); process.exit(2); }
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/audio/manifest.json'), 'utf8'));
  const rows = selectEntries(manifest, { voice: a.voice, tradition: a.tradition, kinds: a.kinds ? a.kinds.split(',') : DEFAULT_KINDS, limit: a.limit ? +a.limit : undefined });
  const est = estimate(rows, provider);
  console.log(`${a.execute ? 'EXECUTE' : 'DRY RUN'}: provider=${provider.id} voice=${a.voice} (${provider.voices[a.voice]})`);
  for (const r of rows.slice(0, 25)) console.log(`  ${r.path}  ${r.text}`);
  if (rows.length > 25) console.log(`  ... ${rows.length - 25} more`);
  console.log(`clips=${est.clips} characters=${est.chars} est. cost=US$${est.usd.toFixed(4)} (${PRICE_LABEL}; ignores free tiers; billing of niqqud marks unverified)`);
  if (!a.execute) { console.log('Dry run only. No network calls made. Add --execute to render (needs credentials: ' + provider.env.join(', ') + ').'); return; }
  console.log('Reminder: TTS redistribution rights for Azure/Google output are unconfirmed; files are tagged redistributionCleared:false.');
  await renderBatch({ provider, rows });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message); process.exit(1); });
