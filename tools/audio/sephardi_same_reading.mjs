#!/usr/bin/env node
// Owner decision A (John Khan, 12 Nov 2026, "do A and B"): a Sephardi row that plays the Israeli clip, whose Sephardi reading is letter
// for letter the Israeli reading in this app (src/pronunciation/forTradition.js respell: the engine gives Israeli and Sephardi the same
// letters), gets a copy of that Israeli clip as its own file. The row is admitted with source 'israeli-clip-same-reading' and the learner
// caption says "Sephardi voice, the same reading as Israeli". Not copied: rows held for a divine-name or wording decision
// (fill_list.mjs heldReason), rows whose Israeli clip is in data/lab/clip-holds.json or missing, and any row whose two readings differ.
// What this does not claim: a Sephardi reader; the guttural ayin and chet of a traditional Sephardi reading are not in the clip.
//   node tools/audio/sephardi_same_reading.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifestFull } from './manifest_io.mjs';
import { markAccentRows, ACCENT_SOURCES } from './accent.mjs';
import { respell } from '../../src/pronunciation/forTradition.js';
import { heldReason } from './fill_list.mjs';
import { PLAYS_ISRAELI } from '../../src/audio/player.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export function sameReading({ root = ROOT, dry = false, now = new Date().toISOString() } = {}) {
  const holds = new Set(JSON.parse(fs.readFileSync(path.join(root, 'data/lab/clip-holds.json'), 'utf8')).paths);
  const skipped = { held: 0, israeliHeld: 0, noIsraeliClip: 0, readingsDiffer: 0 };
  const marks = new Map();
  for (const e of loadManifestFull(root)) {
    if (e.tradition !== 'sephardi' || e.status !== PLAYS_ISRAELI) continue;
    const src = e.plays || e.path.replace('/sephardi/', '/israeli/');
    if (heldReason(e)) { skipped.held++; continue; }
    if (holds.has(src)) { skipped.israeliHeld++; continue; }
    if (!fs.existsSync(path.join(root, src))) { skipped.noIsraeliClip++; continue; }
    if (respell(e.text, 'sephardi') !== respell(e.text, 'israeli')) { skipped.readingsDiffer++; continue; }
    if (!dry) {
      fs.mkdirSync(path.dirname(path.join(root, e.path)), { recursive: true });
      fs.copyFileSync(path.join(root, src), path.join(root, e.path));
      const srcMeta = path.join(root, `${src}.meta.json`);
      const base = fs.existsSync(srcMeta) ? JSON.parse(fs.readFileSync(srcMeta, 'utf8')) : {};
      fs.writeFileSync(path.join(root, `${e.path}.meta.json`), JSON.stringify({
        ...base, status: 'synthetic-unreviewed', source: ACCENT_SOURCES.sameReading, tradition: 'sephardi', copyOf: src, madeFrom: 'israeli-clip',
        sephardiReading: respell(e.text, 'sephardi'), copiedAt: now,
        note: 'A copy of the Israeli clip of the same voice: in this app the Sephardi reading is letter for letter the Israeli one (owner decision, 12 Nov 2026). Synthetic voice, not a Sephardi reader; no human has listened to it.',
      }, null, 1) + '\n');
    }
    marks.set(e.path, { source: ACCENT_SOURCES.sameReading });
  }
  const res = markAccentRows(root, marks, { dry });
  return { copied: marks.size, marked: res.marked.length, skipped, notFound: res.notFound.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(sameReading({ dry: process.argv.includes('--dry') })));
