#!/usr/bin/env node
// data/audio/summary.json: the tiny precached count the app's sound wording reads (src/shell/audio-truth.js, src/shell/audio.js).
//   node tools/audio/summary.mjs            rewrite data/audio/summary.json from the committed manifests + the clip folders on disk
//   node tools/audio/summary.mjs --check    exit 1 when the file is stale
// Fields:
//   total, recorded, tts   as before: manifest entries, entries whose status is "recorded", entries with a synthetic status
//   kinds                  synthetic manifest clips per kind (letter, vowel, syllable, word, line, prayer, letter-lecture)
//   extra                  synthetic speech clips that live in NO manifest (their screens load them by path): book pages
//                          (audio/<voice>/israeli/book), arcade lines (audio/<voice>/israeli/games), opening-prayer veil clips (audio/homepage)
//   spoken                 tts + every extra: all synthetic speech clips on disk. This is the N the sound line shows.
//   sfx                    non-speech interface sounds (audio/sfx); never counted as speech
//   other                  audio on disk outside the spoken count (OTHER_FOLDERS + Hebrew Torah lines from the Torah manifest)
// Reads the committed manifests through manifest_io.mjs; it does not rebuild them (see docs/audio/ISRAELI-VOICE-2026-11-07.md, "Still open").
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isSyntheticStatus } from '../../src/shell/audio-labels.js';
import { loadManifestFull } from './manifest_io.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SUMMARY_FILE = 'data/audio/summary.json';
/** Folders of speech clips that no manifest lists, keyed by the name the summary reports. Both voices for the first two. */
export const EXTRA_FOLDERS = Object.freeze({
  book: ['audio/m/israeli/book', 'audio/f/israeli/book'],
  games: ['audio/m/israeli/games', 'audio/f/israeli/games'],
  homepage: ['audio/homepage'],
});
export const SFX_FOLDERS = Object.freeze(['audio/sfx']);
// Audio on disk that is neither a Hebrew lesson clip nor an interface sound, so it is NOT part of the spoken count the app shows:
// word-builder clips, English Torah chapter recordings, archival third-party recordings for Listen, and background music.
export const OTHER_FOLDERS = Object.freeze({
  builder: ['audio/builder'],
  englishTorah: ['audio/m/english', 'audio/f/english'],
  listen: ['audio/listen'],
  music: ['audio/music'],
});
export const TORAH_MANIFEST = 'data/audio/manifest-torah.json';
import { expandTorahHebrew } from '../../src/shell/torah-he-index.js';
const CLIP = /\.(mp3|m4a|ogg)$/i;

function countClips(root, rel, re = CLIP) {
  const dir = path.join(root, rel);
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) walk(path.join(d, e.name)); else if (re.test(e.name)) n++; } };
  walk(dir);
  return n;
}

/** Clips outside the manifests, by folder name. */
export function countExtras(root = ROOT) {
  const extra = {};
  for (const [name, dirs] of Object.entries(EXTRA_FOLDERS)) extra[name] = dirs.reduce((s, d) => s + countClips(root, d), 0);
  return extra;
}
/** Torah-manifest clips on disk outside the English Torah folders (the Hebrew Torah lines). */
export function torahLinePaths(root = ROOT) {
  const f = path.join(root, TORAH_MANIFEST);
  if (!fs.existsSync(f)) return [];
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const list = Array.isArray(j) ? j : (j.entries || []);
  const he = path.join(root, 'data/audio/manifest-torah-he.json');
  if (fs.existsSync(he)) list.push(...expandTorahHebrew(JSON.parse(fs.readFileSync(he, 'utf8'))));
  return list.map((e) => e.path).filter((p) => p && !OTHER_FOLDERS.englishTorah.some((d) => p.startsWith(d + '/')) && fs.existsSync(path.join(root, p)));
}
export function countOther(root = ROOT) {
  const other = {};
  for (const [name, dirs] of Object.entries(OTHER_FOLDERS)) other[name] = dirs.reduce((s, d) => s + countClips(root, d, /\.mp3$/i), 0); // mp3 only: these folders also hold source formats
  other.torahLines = torahLinePaths(root).length;
  return other;
}
export function countSfx(root = ROOT) { return SFX_FOLDERS.reduce((s, d) => s + countClips(root, d), 0); }

/** The whole summary for a manifest entry list plus the folders under `root`. */
export function summaryOf(entries, root = ROOT) {
  const extra = countExtras(root);
  const kinds = {};
  for (const e of entries) if (isSyntheticStatus(e.status)) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
  const tts = Object.values(kinds).reduce((s, n) => s + n, 0);
  return {
    total: entries.length,
    recorded: entries.filter((e) => e.status === 'recorded').length,
    tts,
    kinds: Object.fromEntries(Object.entries(kinds).sort()),
    extra,
    spoken: tts + Object.values(extra).reduce((s, n) => s + n, 0),
    sfx: countSfx(root),
    other: countOther(root),
  };
}
export const summaryText = (s) => JSON.stringify(s) + '\n';

export function main(argv = process.argv.slice(2)) {
  const text = summaryText(summaryOf(loadManifestFull(ROOT), ROOT));
  const target = path.join(ROOT, SUMMARY_FILE);
  if (argv.includes('--check')) {
    const cur = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
    if (cur !== text) { console.error(`${SUMMARY_FILE} is stale; run: node tools/audio/summary.mjs`); process.exit(1); }
    console.log(`${SUMMARY_FILE} is current`); return;
  }
  fs.writeFileSync(target, text);
  console.log(`${SUMMARY_FILE}: ${text.trim()}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
