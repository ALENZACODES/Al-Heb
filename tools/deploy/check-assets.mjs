#!/usr/bin/env node
// Deploy-time asset check (M-04, R-08, 12 Nov site check). Reads every audio list the app catalogues and fails (exit 1) on any gap:
//   - all eight lists: data/audio/manifest.json, manifest-kind-word.json, the three word shards manifest-words-<tradition>.json
//     (tools/audio/manifest_io.mjs), manifest-torah.json (English Torah chapters), manifest-torah-he.json (the Hebrew Torah verse
//     index, expanded by src/shell/torah-he-index.js) and manifest-book63.json;
//   - a row that should play (any status but "missing" and "plays-israeli") must have its file at its path;
//   - a "plays-israeli" row must name a `plays` target, and that file must exist;
//   - "missing" rows are declared gaps (the device voice reads them, or an alias or linked id plays): counted, never a failure;
//   - every held clip (data/lab/clip-holds.json) must be catalogued, have a clip of its own, and its file must still exist;
//   - the three hold sets must not contradict one another (tools/audio/hold_sets.mjs);
//   - data/audio/summary.json must agree with the lists it summarises (total and plays-israeli rows).
// On a pass it writes audit/asset-check.json, a small served evidence file: the build stamp (src/lib/counts.generated.js), the
// counts, zero gaps and the time of the check. A failed check writes nothing, so the served file always records a pass.
//   node tools/deploy/check-assets.mjs                  check the repo (Render serves the repo root, so its files are the served files)
//   node tools/deploy/check-assets.mjs --root dist      check a built folder instead (the clips must be in it)
//   node tools/deploy/check-assets.mjs --no-files       check the lists only (a checkout without the audio/ folder); writes no evidence
//   node tools/deploy/check-assets.mjs --no-write       check without writing the evidence file
// Clips in a media-host folder (media-hosts.js) are also served from the media repositories, but Render carries every clip itself,
// so they are checked here like any other clip; the evidence file reports how many there are.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { reconcileHoldSets, PLAYS_ISRAELI } from '../audio/hold_sets.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const EVIDENCE_FILE = 'audit/asset-check.json';
/** The eight audio lists, in the order they are reported. The first five are the ones data/audio/summary.json counts. */
export const AUDIO_LISTS = Object.freeze([
  'data/audio/manifest.json', 'data/audio/manifest-kind-word.json',
  'data/audio/manifest-words-israeli.json', 'data/audio/manifest-words-sephardi.json', 'data/audio/manifest-words-ashkenazi.json',
  'data/audio/manifest-torah.json', 'data/audio/manifest-torah-he.json', 'data/audio/manifest-book63.json',
]);
const SUMMARISED = AUDIO_LISTS.slice(0, 5);
const HOLDS_FILE = 'data/lab/clip-holds.json';

const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const rowsOf = (j) => (Array.isArray(j) ? j : Array.isArray(j?.entries) ? j.entries : []);

/** Rows of one list (the Torah verse index expanded to one row per verse clip). `data` is the list's root object, `root` the repo. */
async function listRows(root, rel, data) {
  if (rel.endsWith('manifest-torah-he.json')) {
    const { expandTorahHebrew } = await import(pathToFileURL(path.join(root, 'src/shell/torah-he-index.js')).href).catch(() => import('../../src/shell/torah-he-index.js'));
    return expandTorahHebrew(data);
  }
  return rowsOf(data);
}

function mediaPrefixes(root) {
  try { const self = {}; vm.runInNewContext(fs.readFileSync(path.join(root, 'media-hosts.js'), 'utf8'), { self }); return (self.ALEF_MEDIA_HOSTS || []).map((x) => x[0]); } catch { return []; }
}
function buildStamp(root) {
  try { const t = fs.readFileSync(path.join(root, 'src/lib/counts.generated.js'), 'utf8'); const m = /export const BUILD = (\{.*\});/.exec(t); return m ? JSON.parse(m[1]) : null; } catch { return null; }
}

/**
 * Run the check. `root` holds the lists (and, unless files is false, the clips). Returns {ok, gaps, report}.
 * @param {{root?: string, files?: boolean, now?: Date, exists?: (rel: string) => boolean}} [o]
 */
export async function checkAssets({ root = ROOT, files = true, now = new Date(), exists } = {}) {
  const has = exists || ((rel) => fs.existsSync(path.join(root, rel)));
  const gaps = [];
  const lists = {};
  const all = [];
  for (const rel of AUDIO_LISTS) {
    if (!fs.existsSync(path.join(root, rel))) { gaps.push({ list: rel, why: 'audio list is missing' }); continue; }
    let rows;
    try { rows = await listRows(root, rel, readJson(root, rel)); } catch (e) { gaps.push({ list: rel, why: `audio list does not parse: ${e.message}` }); continue; }
    const c = { rows: rows.length, shouldPlay: 0, playsIsraeli: 0, declaredMissing: 0 };
    for (const e of rows) {
      all.push(e);
      if (!e || typeof e.path !== 'string' || !e.path) { gaps.push({ list: rel, why: 'row without a path', id: e?.id }); continue; }
      if (e.status === 'missing') { c.declaredMissing++; continue; }
      if (e.status === PLAYS_ISRAELI) {
        c.playsIsraeli++;
        if (!e.plays) gaps.push({ list: rel, path: e.path, why: 'plays-israeli row names no plays target' });
        else if (files && !has(e.plays)) gaps.push({ list: rel, path: e.path, why: `plays target has no file: ${e.plays}` });
        continue;
      }
      c.shouldPlay++;
      if (files && !has(e.path)) gaps.push({ list: rel, path: e.path, why: 'no file at its path' });
    }
    lists[path.basename(rel)] = c;
  }
  // held clips: accounted for (catalogued, a clip of their own, the file still in the app) and consistent with the other two sets
  let holds = [];
  try { holds = readJson(root, HOLDS_FILE).paths || []; } catch { gaps.push({ list: HOLDS_FILE, why: 'clip-holds list is missing or does not parse' }); }
  const hs = reconcileHoldSets(all, holds);
  for (const p of hs.problems) gaps.push({ list: 'hold sets', why: p });
  if (files) for (const p of holds) if (!has(p)) gaps.push({ list: HOLDS_FILE, path: p, why: 'held clip has no file (a held clip stays in the app until a person has listened)' });
  // the summary the app's sound wording reads must agree with the lists
  try {
    const sm = readJson(root, 'data/audio/summary.json');
    const total = SUMMARISED.reduce((s, rel) => s + (lists[path.basename(rel)]?.rows || 0), 0);
    const pi = SUMMARISED.reduce((s, rel) => s + (lists[path.basename(rel)]?.playsIsraeli || 0), 0);
    if (sm.total !== total) gaps.push({ list: 'data/audio/summary.json', why: `summary total ${sm.total} but the lists hold ${total} rows (run node tools/audio/summary.mjs)` });
    if (sm.playsIsraeli !== pi) gaps.push({ list: 'data/audio/summary.json', why: `summary playsIsraeli ${sm.playsIsraeli} but the lists hold ${pi} (run node tools/audio/summary.mjs)` });
  } catch { gaps.push({ list: 'data/audio/summary.json', why: 'summary is missing or does not parse' }); }

  const sum = (k) => Object.values(lists).reduce((s, c) => s + c[k], 0);
  const prefixes = mediaPrefixes(root);
  const report = {
    schema: 'alef-asset-check/1',
    build: buildStamp(root),
    checkedAt: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    filesChecked: !!files,
    lists,
    counts: {
      rows: sum('rows'), shouldPlay: sum('shouldPlay'), playsIsraeli: sum('playsIsraeli'), declaredMissing: sum('declaredMissing'),
      held: hs.counts.clipHolds, playsIsraeliTargetHeld: hs.counts.playsIsraeliTargetHeld, chirpHeld: hs.counts.chirpHeld,
      alsoOnMediaHost: all.filter((e) => e && e.status !== 'missing' && prefixes.some((p) => String(e.status === PLAYS_ISRAELI ? e.plays : e.path).startsWith(p))).length,
    },
    gaps: gaps.length,
  };
  return { ok: gaps.length === 0, gaps, report };
}

export function writeEvidence(report, root = ROOT) {
  const file = path.join(root, EVIDENCE_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(report, null, 1) + '\n');
  return file;
}

export async function main(argv = process.argv.slice(2)) {
  const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  const root = opt('--root') ? path.resolve(opt('--root')) : ROOT;
  const files = !argv.includes('--no-files');
  const { ok, gaps, report } = await checkAssets({ root, files });
  const c = report.counts;
  console.log(`asset check (${files ? 'lists and files' : 'lists only, no file check'}): ${c.rows} rows in ${Object.keys(report.lists).length} lists; ${c.shouldPlay} should play, ${c.playsIsraeli} play the Israeli clip, ${c.declaredMissing} declared missing; ${c.held} held, ${c.chirpHeld} chirpHeld`);
  if (!ok) {
    console.error(`ASSET CHECK FAILED: ${gaps.length} gap(s)`);
    for (const g of gaps.slice(0, 25)) console.error(`  ${g.list}${g.path ? ` ${g.path}` : ''}: ${g.why}`);
    if (gaps.length > 25) console.error(`  ... and ${gaps.length - 25} more`);
    return 1;
  }
  if (files && !argv.includes('--no-write')) console.log(`wrote ${path.relative(process.cwd(), writeEvidence(report, root)) || EVIDENCE_FILE}`);
  console.log('asset check passed: 0 gaps');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main();
