#!/usr/bin/env node
// Owner rule (7 November 2026, docs/audio/SEPHARDI-PLAYBACK-2026-11-07.md): the Sephardi and Ashkenazi settings play the native
// Israeli clips, and the tradition is shown only as English letters. So a Sephardi or Ashkenazi manifest row with no clip of its
// own that plays the Israeli clip of the same voice is not a missing clip. This tool writes that into the catalogue:
//   status "plays-israeli" and "plays": "<the Israeli file>", decided by the player itself (src/audio/player.js status()).
// A row whose own clip appears later goes back to "missing" here, so tools/audio/mark_present.mjs then admits the file.
// A row whose Israeli clip disappears goes back to "missing" too. Rows with a clip of their own are never touched.
//   node tools/audio/plays_israeli.mjs           rewrite the manifests (each keeps its layout), then the summary
//   node tools/audio/plays_israeli.mjs --check   exit 1 when a row is out of date
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAudio, PLAYS_ISRAELI } from '../../src/audio/player.js';
import { FILES } from './mark_present.mjs';
import { summaryOf, summaryText, SUMMARY_FILE } from './summary.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Same layout as the file had: one row per line, or JSON indented by 1 or 2. */
export function layoutOf(text) {
  const second = text.split('\n')[1] || '';
  if (second.startsWith('{')) return 'row';
  return second.startsWith('  ') ? 2 : 1;
}
export const write = (rows, layout) => (layout === 'row' ? `[\n${rows.map((r) => JSON.stringify(r)).join(',\n')}\n]\n` : `${JSON.stringify(rows, null, layout)}\n`);

/** Decide every row (mutates the lists). Returns {marked, cleared}. */
export function decide(lists, root = ROOT) {
  const all = lists.flat();
  // the decision must not depend on the status this tool wrote last time: plan with those rows as "missing"
  const plain = all.map((e) => (e.status === PLAYS_ISRAELI ? { ...e, status: 'missing' } : e));
  const players = {};
  const P = (v, t) => (players[v + t] ||= createAudio({ settings: { voice: v, congregation: t }, manifest: plain, AudioCtor: class {}, speech: null }));
  const res = { marked: 0, cleared: 0, rows: 0 };
  for (const e of all) {
    if (e.tradition === 'israeli' || (e.status !== 'missing' && e.status !== PLAYS_ISRAELI)) continue;
    const own = e.path && fs.existsSync(path.join(root, e.path));
    const s = own ? null : P(e.voice, e.tradition).status(e.kind, e.id);
    const plays = s && s.source === 'file' && s.fileTradition === 'israeli' && s.path && fs.existsSync(path.join(root, s.path)) ? s.path : null;
    if (plays) {
      if (e.status !== PLAYS_ISRAELI || e.plays !== plays) res.marked++;
      e.status = PLAYS_ISRAELI; e.source = 'israeli-clip'; e.plays = plays; res.rows++;
    } else if (e.status === PLAYS_ISRAELI) {
      e.status = 'missing'; e.source = 'none'; delete e.plays; res.cleared++;
    }
  }
  return res;
}

export function main(argv = process.argv.slice(2)) {
  const texts = FILES.map((rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const lists = texts.map((t) => JSON.parse(t));
  const res = decide(lists);
  const out = lists.map((l, i) => write(l, layoutOf(texts[i])));
  if (argv.includes('--check')) {
    const stale = FILES.filter((rel, i) => out[i] !== texts[i]);
    if (stale.length) { console.error(`out of date: ${stale.join(', ')}; run node tools/audio/plays_israeli.mjs`); process.exit(1); }
    console.log(`plays-israeli rows current: ${res.rows}`); return;
  }
  FILES.forEach((rel, i) => { if (out[i] !== texts[i]) fs.writeFileSync(path.join(ROOT, rel), out[i]); });
  fs.writeFileSync(path.join(ROOT, SUMMARY_FILE), summaryText(summaryOf(lists.flat(), ROOT)));
  console.log(`plays-israeli: ${res.rows} rows (${res.marked} newly marked, ${res.cleared} back to missing)`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
