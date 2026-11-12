#!/usr/bin/env node
// Give an alias row a file of its own: a row with "aliasOf" (a one-line prayer that is the same clip as its line, a Dot Tile
// syllable that is a letter sound, a lesson word that is a vocabulary word) and no file of its own takes a copy of its target's
// file, in the same voice and tradition, when the target has a synthetic clip of its own that is not held and the two rows carry
// the same pointed text. The row then says the target's status and source and records "copyOf" (as tools/audio/fill_same_text.py
// does). Nothing is recorded; no network. A held target (data/lab/clip-holds.json) is never copied.
//   node tools/audio/alias_copies.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILES } from './mark_present.mjs';
import { layoutOf, write } from './plays_israeli.mjs';
import { isSyntheticStatus } from '../../src/shell/audio-labels.js';
import { noOwnFile } from '../../src/audio/player.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const bare = (s) => String(s || '').normalize('NFC').replace(/[֑-ֽ֯׀׃]/g, '').replace(/[־\s]+/g, ' ').trim();

export function aliasCopies({ root = ROOT, dry = false } = {}) {
  const texts = FILES.map((rel) => fs.readFileSync(path.join(root, rel), 'utf8'));
  const lists = texts.map((t) => JSON.parse(t));
  const held = new Set(JSON.parse(fs.readFileSync(path.join(root, 'data/lab/clip-holds.json'), 'utf8')).paths || []);
  const by = new Map(lists.flat().map((e) => [`${e.voice}|${e.tradition}|${e.kind}|${e.id}`, e]));
  const res = { copied: [], skipped: {} };
  const skip = (why) => { res.skipped[why] = (res.skipped[why] || 0) + 1; };
  for (const e of lists.flat()) {
    if (!e.aliasOf || !noOwnFile(e)) continue;
    const [k, ...rest] = String(e.aliasOf).split('/');
    const t = by.get(`${e.voice}|${e.tradition}|${k}|${rest.join('/')}`);
    if (!t || !isSyntheticStatus(t.status) || !fs.existsSync(path.join(root, t.path))) { skip('target has no clip of its own'); continue; }
    if (held.has(t.path)) { skip('target held'); continue; }
    if (bare(t.text) !== bare(e.text)) { skip('different text'); continue; }
    if (!dry) {
      fs.mkdirSync(path.dirname(path.join(root, e.path)), { recursive: true });
      fs.copyFileSync(path.join(root, t.path), path.join(root, e.path));
      e.status = t.status; e.source = t.source; e.copyOf = e.aliasOf;
      delete e.plays; delete e.equivalentTo;
    }
    res.copied.push(e.path);
  }
  if (!dry) FILES.forEach((rel, i) => { const out = write(lists[i], layoutOf(texts[i])); if (out !== texts[i]) fs.writeFileSync(path.join(root, rel), out); });
  return res;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = aliasCopies({ dry: process.argv.includes('--dry') });
  console.log(`alias rows given a copy of their target: ${r.copied.length}; skipped: ${JSON.stringify(r.skipped)}`);
}
