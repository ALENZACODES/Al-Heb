#!/usr/bin/env node
// Builds tools/audio/fill-list.json, the job list for tools/audio/fill_clips.py (.github/workflows/fill-clips.yml).
//   node tools/audio/fill_list.mjs --new        Israeli rows with no clip that no other clip stands in for (the player decides:
//                                               src/audio/player.js status()), words in the WaveNet pair, prayer lines in Chirp 3 HD
//   node tools/audio/fill_list.mjs --service    (writes tools/audio/fill-list-service.json) every Israeli line and prayer clip the Siddur service screens play
//                                               (data/service/orders.json), to be re-recorded in Chirp 3 HD where no reviewer hears it as worse
// Prints the row count, characters and a cost estimate (list prices, data/audio/tts-prices.json; Speech-to-Text at US$0.006 per
// request, Google's 15-second billing step). Writes nothing else.
// Never listed (they stay as they are and are named in "held"):
//   - alias rows (they play their target once it exists) and words on docs/audio/NEXT-CLIPS-EXCLUDED.csv (pronunciation flags)
//   - any row whose divine-name reading is not covered by the Torah clip convention (fix_shard.py spoken(): only the four-letter
//     name is rewritten, to Adonai or Elohim): the two-yod or abbreviated forms (יְיָ, ה׳)
//   - the prefixed-name targets waiting on clergy (docs/sensitivity/OPEN.md) and the Psalm 117 Hallel line held for the owner
//     (docs/review/JOHN-DECISIONS.md)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifestFull } from './manifest_io.mjs';
import { createAudio } from '../../src/audio/player.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT = 'tools/audio/fill-list.json';
export const SERVICE_OUT = 'tools/audio/fill-list-service.json';
/** Ids (and their -l<n> / -w<n> parts) the repo holds for a divine-name or wording decision. */
export const HELD_IDS = ['gadlu', 'kiddush-zachor', 'ashrei-144-15', 'havdalah-opening', 'kedushah-baruch', 'hallel-117'];
const UNCOVERED_NAME = /(^|[^א-ת])יְיָ|(^|[^א-ת])ה[׳']/;
export const heldReason = (e) => {
  if (HELD_IDS.some((h) => e.id === h || e.id.startsWith(`${h}-`))) return 'held for a divine-name or wording decision (docs/sensitivity/OPEN.md, docs/review/JOHN-DECISIONS.md)';
  if (UNCOVERED_NAME.test(e.text || '')) return 'divine-name form not covered by the Torah clip convention';
  return '';
};
const PRICE = { wavenet: 16, chirp: 30 }; // US$ per million characters (data/audio/tts-prices.json)
const STT = 0.006;

function excluded() {
  const f = path.join(ROOT, 'docs/audio/NEXT-CLIPS-EXCLUDED.csv');
  if (!fs.existsSync(f)) return new Set();
  return new Set(fs.readFileSync(f, 'utf8').split(/\r?\n/).slice(1).map((l) => (l.match(/^"?([^",]+)"?/) || [])[1]).filter(Boolean));
}

export function newRows(all, root = ROOT) {
  const ex = excluded();
  const players = {};
  const P = (v) => (players[v] ||= createAudio({ settings: { voice: v, congregation: 'israeli' }, manifest: all, AudioCtor: class {}, speech: null }));
  const rows = [], held = [];
  for (const e of all) {
    if (e.tradition !== 'israeli' || e.status !== 'missing' || e.aliasOf) continue;
    const s = P(e.voice).status(e.kind, e.id);
    if (s.source === 'file' && s.path && fs.existsSync(path.join(root, s.path))) continue; // another clip already plays here
    if (!['word', 'line'].includes(e.kind)) continue;
    const why = ex.has(e.id) ? 'pronunciation flag (docs/audio/NEXT-CLIPS-EXCLUDED.csv)' : heldReason(e);
    if (why) { held.push({ path: e.path, why }); continue; }
    rows.push({ path: e.path, text: e.text, voice: e.voice, family: e.kind === 'line' ? 'chirp' : 'wavenet', mode: 'new' });
  }
  return { rows, held };
}

export function serviceRows(all, root = ROOT) {
  const orders = JSON.parse(fs.readFileSync(path.join(root, 'data/service/orders.json'), 'utf8')).orders;
  const ids = new Set(Object.values(orders).flatMap((o) => o.items.map((i) => i.id)));
  const own = (id) => ids.has(id) || [...ids].some((i) => new RegExp(`^${i.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-l\\d+$`).test(id));
  const rows = [], held = [];
  for (const e of all) {
    if (e.tradition !== 'israeli' || !['line', 'prayer'].includes(e.kind) || e.aliasOf || !own(e.id)) continue;
    if (e.status === 'missing' || !fs.existsSync(path.join(root, e.path))) continue;
    const why = heldReason(e);
    if (why) { held.push({ path: e.path, why }); continue; }
    rows.push({ path: e.path, text: e.text, voice: e.voice, family: 'chirp', mode: 'replace' });
  }
  return { rows, held };
}

export function estimate(rows) {
  let chars = 0, usd = 0, stt = 0;
  for (const r of rows) {
    const n = [...r.text].length;
    const takes = r.mode === 'replace' ? 1 : 3; // worst case: every take made
    chars += n * takes; usd += (n * takes / 1e6) * (r.mode === 'replace' ? PRICE.chirp : Math.max(PRICE.wavenet, PRICE.chirp));
    stt += (r.mode === 'replace' ? 2 : takes) * Math.max(1, Math.ceil((n / 12) / 15)) * STT; // ~12 characters a second of speech
  }
  return { rows: rows.length, chars, ttsUsd: +usd.toFixed(2), sttUsd: +stt.toFixed(2), worstCaseUsd: +(usd + stt).toFixed(2) };
}

export function main(argv = process.argv.slice(2)) {
  const all = loadManifestFull(ROOT);
  const mode = argv.includes('--service') ? 'service' : 'new';
  const { rows, held } = mode === 'service' ? serviceRows(all) : newRows(all);
  const est = estimate(rows);
  const out = mode === 'service' ? SERVICE_OUT : OUT;
  fs.writeFileSync(path.join(ROOT, out), JSON.stringify({ schema: 'alef-fill-list/1', mode, estimate: est, rows, held }, null, 1) + '\n');
  console.log(`${out}: ${mode}: ${rows.length} rows, ${held.length} held; ${JSON.stringify(est)}`);
  const by = {}; for (const r of rows) by[`${r.path.split('/')[3]}/${r.family}`] = (by[`${r.path.split('/')[3]}/${r.family}`] || 0) + 1;
  console.log(by);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
