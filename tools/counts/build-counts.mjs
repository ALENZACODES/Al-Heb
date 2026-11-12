#!/usr/bin/env node
// src/lib/counts.generated.js: every course-wide total the app shows (books, dictionary words, first words, lessons by scope,
// root verbs, audio catalogue), computed from the data files the app serves, plus the build stamp (package version + build time).
//   node tools/counts/build-counts.mjs            rewrite src/lib/counts.generated.js (keeps builtAt when nothing else changed)
//   node tools/counts/build-counts.mjs --check    exit 1 when the totals are stale, or index.html's alef-build meta names another stamp
//   node tools/counts/build-counts.mjs --stamp    rewrite and move the build time (a release build: npm run release)
// It also writes the build stamp into index.html (<meta name="alef-build">), so the served HTML names its build.
// tools/build-precache.mjs runs this first, so the deploy step that refreshes the precache list refreshes these numbers too.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT_FILE = 'src/lib/counts.generated.js';
export const AUDIO_MANIFESTS = Object.freeze(['data/audio/manifest.json', 'data/audio/manifest-kind-word.json',
  'data/audio/manifest-words-israeli.json', 'data/audio/manifest-words-sephardi.json', 'data/audio/manifest-words-ashkenazi.json']);
export const VOCAB_TIERS = Object.freeze([500, 1000, 2000, 5000]);

const rd = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const list = (j, ...keys) => { if (Array.isArray(j)) return j; for (const k of keys) if (Array.isArray(j?.[k])) return j[k]; return []; };
const hasTag = (e, t) => Array.isArray(e?.tags) && e.tags.includes(t);
// The same synthetic test the app uses (src/shell/audio-labels.js isSyntheticStatus), read here without importing app code.
const SYNTHETIC = new Set(['tts', 'synthetic-unreviewed', 'synthetic-reviewed']);

/** Course totals from the served data. Pure apart from reading files under `root`. */
export async function computeTotals(root = ROOT) {
  const { isSyntheticStatus } = await import(pathToFileURL(path.join(root, 'src/shell/audio-labels.js')).href).catch(() => ({ isSyntheticStatus: (s) => SYNTHETIC.has(s) }));
  const lessons = list(rd(root, 'data/curriculum/lessons.json'), 'lessons');
  const track = (t) => lessons.filter((l) => l.track === t).length;
  const classTrack = rd(root, 'data/curriculum/class-track.json');
  const core = new Set((classTrack.weeks || []).flatMap((w) => w.lessons || [])).size;
  const allVocab = VOCAB_TIERS.flatMap((t) => list(rd(root, `data/vocab/packs/vocab5k-tier-${t}.json`), 'entries', 'words'));
  // Hidden records (gloss withheld pending review; src/vocab/loader.js isHiddenRecord) are not shown on the Dictionary, so they are
  // not counted as its words either (M-07, 12 Nov site check: the page showed 4,992 against a title of 4,996).
  const isHidden = (r) => { const f = r && r.flags; return Array.isArray(f) ? f.includes('hidden') : !!(f && typeof f === 'object' && f.hidden === true); };
  const vocab = allVocab.filter((r) => !isHidden(r)), hiddenCount = allVocab.length - vocab.length;
  const words = vocab.filter((e) => !e.isForm);
  const fam = rd(root, 'data/roots/families.json').coverage || {};
  const verbs = rd(root, 'data/roots/verbs.json');
  const audio = { total: 0, synthetic: 0, recorded: 0, files: {} };
  for (const rel of AUDIO_MANIFESTS) {
    if (!fs.existsSync(path.join(root, rel))) continue;
    const rows = list(rd(root, rel), 'entries');
    const syn = rows.filter((e) => isSyntheticStatus(e.status)).length, rec = rows.filter((e) => e.status === 'recorded').length;
    audio.files[rel.replace('data/audio/', '')] = { entries: rows.length, synthetic: syn };
    audio.total += rows.length; audio.synthetic += syn; audio.recorded += rec;
  }
  // The audio statement's figures (C-02, 12 Nov site check): copied from data/audio/summary.json at build time, so the app reads
  // one source (this generated file) instead of fetching the summary at run time. tests/audio.truth.test.js keeps the summary
  // reconciled with the manifests, so these and the manifest totals above agree.
  if (fs.existsSync(path.join(root, 'data/audio/summary.json'))) {
    const sm = rd(root, 'data/audio/summary.json');
    audio.summary = Object.fromEntries(['total', 'recorded', 'tts', 'spoken', 'kinds', 'extra', 'playsIsraeli', 'viaOther', 'missing'].filter((k) => sm[k] !== undefined).map((k) => [k, sm[k]]));
  }
  return {
    books: list(rd(root, 'data/books/index.json'), 'books').length,
    bookPictured: list(rd(root, 'data/books/index.json'), 'books').reduce((a, b) => a + (Number(b.picturedPages) || 0), 0),
    dictionary: { entries: vocab.length, words: words.length, forms: vocab.length - words.length, addable: words.filter((e) => !hasTag(e, 'rare-sense')).length, hidden: hiddenCount },
    firstWords: list(rd(root, 'data/games/firstwords.json'), 'words').length,
    buildWords: list(rd(root, 'data/builder_words.json'), 'words').length,
    lessons: { core, reading: track('read'), israel: track('israel'), all: lessons.length },
    roots: { verbs: fam.verbs || 0, withRoot: fam.verbsWithRoot || 0, withPattern: fam.verbsWithBinyan || 0, explorer: list(verbs, 'verbs').length,
      explorerWithRoot: list(verbs, 'verbs').filter((v) => v && v.root).length, familiesOf2Plus: fam.familiesOf2Plus || 0, familiesOf3Plus: fam.familiesOf3Plus || 0,
      familiesRuleChecked: fam.familiesRuleChecked || 0, familiesVerified: fam.familiesVerified || 0,
      // lane 3 (12 Nov, points plan #5 and #15): verbs per pattern (word list, and the explorer's share of them) and the Dictionary's links
      byBinyan: Object.fromEntries(Object.keys(fam.binyanCount || {}).sort().map((b) => [b, { verbs: fam.binyanCount[b], explorer: list(verbs, 'verbs').filter((v) => v && v.binyan === b).length }])),
      dictLinks: fs.existsSync(path.join(root, 'data/roots/dict-links.json')) ? rd(root, 'data/roots/dict-links.json').counts : null },
    audio,
    // lane games-books (D1): every game on the games page, counted once across its sections (src/games/library.catalog.js)
    games: await import(pathToFileURL(path.join(root, 'src/games/library.catalog.js')).href).then((m) => m.gameTotals()).catch(() => null),
  };
}

const pkgVersion = (root) => { try { return rd(root, 'package.json').version || '0.0.0'; } catch { return '0.0.0'; } };

/** Read the totals and stamp already in the generated file (null when missing or unreadable). */
export function readGenerated(root = ROOT) {
  try {
    const text = fs.readFileSync(path.join(root, OUT_FILE), 'utf8');
    const t = /export const TOTALS = (\{.*\});/.exec(text), b = /export const BUILD = (\{.*\});/.exec(text);
    return { totals: t ? JSON.parse(t[1]) : null, build: b ? JSON.parse(b[1]) : null };
  } catch { return null; }
}

export function generatedText(totals, build) {
  return '// GENERATED by tools/counts/build-counts.mjs - do not edit. Course totals read from the served data, and the build stamp.\n'
    + '// src/lib/counts.js is the only module that reads this file; screens ask counts.js.\n'
    + `export const TOTALS = ${JSON.stringify(totals)};\n`
    + `export const BUILD = ${JSON.stringify(build)};\n`;
}

/** The meta tag index.html carries. */
export const buildMeta = (build) => `<meta name="alef-build" content="${build.version} ${build.builtAt}">`;
export function stampHtml(html, build) {
  const tag = buildMeta(build);
  if (/<meta name="alef-build"[^>]*>/.test(html)) return html.replace(/<meta name="alef-build"[^>]*>/, tag);
  return html.replace(/(<meta charset="[^"]*">)/i, `$1\n  ${tag}`);
}

/** Write the generated file (and the stamp in index.html). builtAt only moves when a total or the version changed, or when forced. */
export async function writeCounts({ root = ROOT, now = new Date(), force = false } = {}) {
  const totals = await computeTotals(root);
  const prev = readGenerated(root);
  const version = pkgVersion(root);
  const same = prev?.totals && JSON.stringify(prev.totals) === JSON.stringify(totals) && prev.build?.version === version;
  const build = same && !force && prev.build?.builtAt ? prev.build : { version, builtAt: now.toISOString().replace(/\.\d{3}Z$/, 'Z') };
  fs.mkdirSync(path.join(root, 'src/lib'), { recursive: true });
  fs.writeFileSync(path.join(root, OUT_FILE), generatedText(totals, build));
  const idx = path.join(root, 'index.html');
  if (fs.existsSync(idx)) { const html = fs.readFileSync(idx, 'utf8'), next = stampHtml(html, build); if (next !== html) fs.writeFileSync(idx, next); }
  return { totals, build };
}

/** True when index.html carries the same build stamp as the generated file (R-12: the About line and the meta tag name one build). */
export function stampAgrees(root = ROOT) {
  const prev = readGenerated(root), idx = path.join(root, 'index.html');
  if (!prev?.build || !fs.existsSync(idx)) return !fs.existsSync(idx);
  return fs.readFileSync(idx, 'utf8').includes(buildMeta(prev.build));
}

export async function check(root = ROOT) {
  const totals = await computeTotals(root), prev = readGenerated(root);
  return !!prev?.totals && JSON.stringify(prev.totals) === JSON.stringify(totals) && prev.build?.version === pkgVersion(root) && stampAgrees(root);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes('--check')) {
    if (!(await check())) { console.error(`${OUT_FILE} is stale, or index.html names another build; run: node tools/counts/build-counts.mjs`); process.exit(1); }
    console.log(`${OUT_FILE} is current`);
  } else {
    const { totals, build } = await writeCounts({ force: argv.includes('--stamp') });
    console.log(`${OUT_FILE}: ${JSON.stringify(totals)} build ${build.version} ${build.builtAt}`);
  }
}
