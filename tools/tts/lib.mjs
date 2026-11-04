// Shared helpers for the local TTS factory (tools/tts/*). No network. Nothing here touches src/.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TTS_DIR = path.join(REPO_ROOT, 'tools', 'tts');
/** Work dir lives OUTSIDE the repo: raw WAV and staged MP3 are large and must not be committed. */
export const defaultWork = () => process.env.ALEF_TTS_WORK || path.join(os.homedir(), 'alef-tts-work');
/** The only status this factory ever writes. It is the app's existing synthetic-voice value (see docs/tts/README.md). */
export const TTS_STATUS = 'tts';
export const HUMAN_STATUS = 'recorded';

/** Remove niqqud, cantillation, maqaf, sof pasuq and punctuation; keep consonants and spaces. */
export const stripNiqqud = (s) => String(s ?? '').replace(/[֑-ׇ]/g, '').replace(/[־׃]/g, ' ').replace(/[^א-ת\s]/g, ' ').replace(/\s+/g, ' ').trim();
export const hasNiqqud = (s) => /[ְ-ׇּׁׂ]/.test(String(s ?? ''));

/** manifest path convention: audio/<voice>/<tradition>/<kind>/<id>.mp3 (tools/audio/hebrew_data.mjs audioPath). */
export const clipPath = (voice, tradition, kind, id) => `audio/${voice}/${tradition}/${kind}/${id}.mp3`;
export const clipKey = (c) => `${c.voice}/${c.tradition}/${c.kind}/${c.id}`;

export function parseArgs(argv, flags = []) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k.startsWith('--')) {
      const name = k.slice(2);
      if (flags.includes(name)) a[name] = true; else a[name] = argv[++i];
    } else a._.push(k);
  }
  return a;
}

export const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
export function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const [h, ...body] = rows;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ''])));
}
