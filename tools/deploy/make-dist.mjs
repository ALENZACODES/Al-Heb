#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
// Build the Cloudflare Pages output folder: copies ONLY runtime files into dist/ and prints a size report.
//   node tools/deploy/make-dist.mjs [--out dist] [--with-img]
// What ships: the precache list (tools/build-precache.mjs computeManifest) + the extras below. Never shipped: docs, tests, book,
// research, tools, assets/images (incoming photos, ~219 MB), src/**/*.test.js, anything under node_modules.
// sw.js imports ./precache-manifest.js, so a fresh one is written into dist/ for exactly the files that ship.
// Does not touch the repo root's precache-manifest.js. Note: tools/build-static.mjs (GitHub Pages build) also writes dist/; run one or the other.
import { mkdirSync, rmSync, copyFileSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeManifest, manifestText } from '../build-precache.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const LIMITS = { maxFileBytes: 25 * 1024 * 1024 }; // developers.cloudflare.com/pages/platform/limits, read 2026-11-03
// No maxFiles: the host is Render, which has no file cap (fix #5). The old Cloudflare Pages Free cap (20,000)
// cannot hold a build that must ship ~19,800 audio clips, so the count is reported, never failed on.

/** Runtime files that are not in the precache list but that the app or the host needs. Each is [path-or-dir, why]. */
export const EXTRAS = [
  ['sw.js', 'service worker'],
  ['404.html', 'self-contained not-found page for static hosts (not in the first-install precache)'],
  ['404.js', '404 page helper: maps an unknown path to a #/ route (not in the first-install precache)'],
  ['_headers', 'Cloudflare Pages headers'],
  ['robots.txt', 'search crawler rules'],
  ['sitemap.xml', 'search sitemap for the app shell'],
  ['_redirects', 'Cloudflare Pages redirects (only if the file exists)'],
  ['assets/vendor', 'vendored Tesseract OCR (lazy, runtime-cached; includes licence texts)'],
  ['assets/workbook', 'printable workbook PDFs + manifest (linked from the app, downloaded on demand)'],
  ['data/vocab/packs', 'vocab packs (fetched when a pack is opened)'],
  ['data/vocab/clip-lookup.json', 'dictionary clip lookup (2.2 MB, over the 2 MiB precache cap): fetched when the dictionary opens, runtime-cached'],
  ['data/vocab/audio-dictionary.json', 'dictionary recordings list: fetched the first time a dictionary-only word is played'],
  ['data/vocab/words.json', 'full word list (7 MB): fetched on demand by /listen, /grammar and /placement; over the 2 MiB precache cap, so never installed up front'],
  ['data/photo/_benchmark/images/menu-1__clean.png', 'scan sample page, named literally in src/photo/scan.view.js (U-21); fetched when a learner tries the sample, not precached'],
  ['data/audio/manifest-words-ashkenazi.json', 'lazy audio word shard'],
  ['data/audio/manifest-words-israeli.json', 'lazy audio word shard'],
  ['data/audio/manifest-words-sephardi.json', 'lazy audio word shard'],
  ['data/audio/manifest-torah.json', 'lazy full-Torah recording list; ship even when both languages exceed the precache size limit'],
  ['data/audio/manifest-torah-he.json', 'lazy index of the Hebrew Torah verse recordings (src/shell/torah-he-index.js)'],
  ['assets/img', 'illustrations: only shipped with --with-img (16 MiB of placeholders); the two hero files named literally in src/ ship always via their own entries below'],
  ['assets/img/social-preview.png', 'Open Graph and Twitter link-preview image'],
  ['assets/img/gen/HERO_tree_of_life_realistic.webp', 'home astral-tree hero, named literally in src/shell/astral-tree.js (fix #11); runtime-cached on first view, not precached'],
  ['assets/img/gen/HERO_home_tree.webp', 'Welcome hero, named literally in src/shell/home-hero.js (fix #11); runtime-cached on first view, not precached'],
  ['assets/img/rimon', 'Rimon animation sheets, loaded by the mascot on every route'],
  ['data/images/rimon', 'Rimon stills (rimon-NNN.webp) and present.json, the list of the ones that exist (src/shell/rimon-stage.js); fetched on demand, runtime-cached'],
  ...['PORTAL_words_clay.webp', 'PORTAL_games_shofar.webp', 'MASCOT_rimon.800.webp'].map((name) => [`assets/img/gen/${name}`, 'Runtime portal and mascot art']),
  ...['ari', 'noa'].flatMap((voice) => ['neutral', 'speak', 'listen', 'celebrate', 'synagogue', 'telaviv'].map((pose) => [`assets/img/gen/CHAR_${voice}_${pose}.800.webp`, 'Route-specific companion portrait'])),
  ['assets/img/gen/HERO_olive_harvest_astral.1600.webp', 'olive-harvest home hero (large), named literally in src/shell/astral-tree.js; runtime-cached on first view, not precached'],
  ['assets/img/gen/HERO_olive_harvest_astral.900.webp', 'olive-harvest home hero (small), named literally in src/shell/astral-tree.js; runtime-cached on first view, not precached'],
  ['assets/img/gen/HERO_home_heaven.1536x1024.webp', 'heaven-sent home hero (wide), named literally in src/shell/astral-tree.js; runtime-cached on first view, not precached'],
  ['assets/img/gen/HERO_home_heaven.1024x1536.webp', 'heaven-sent home hero (tall), named literally in src/shell/astral-tree.js; runtime-cached on first view, not precached'],
  ['synagogues/index.html', 'standalone, script-free page listing the Reform synagogues in Canada (generated by tools/synagogues/build-page.mjs)'],
  ['preview/loops', 'preview-tier daily goal, rhythm, quests and progress page: loaded on demand, not in the first-install list'],
  ['audio', 'recorded clips, when they exist (audio/<voice>/<tradition>/<kind>/<id>.mp3)'],
];
const OFL_TEXTS = /^assets\/fonts\/[^/]+-OFL\.txt$/; // font licences must travel with the woff2 files
const NEVER = (rel) => rel.split('/').some((p) => p === 'node_modules' || p === '__pycache__' || p === '.git' || p === '.DS_Store')
  || /\.(py|md|csv)$/i.test(rel) && !rel.startsWith('assets/vendor/') || /\.test\.js$/.test(rel) || rel.startsWith('assets/images/')
  || /(^|\/)\.?(ingest-report|INGEST-REPORT)[^/]*$/i.test(rel) // ingest reports never ship
  || rel.startsWith('data/images/rimon/legacy/') // archived Rimon stills: kept in the repo, never shown
  || rel.startsWith('audio/') && !/\.(mp3|m4a|ogg)$/i.test(rel); // clip sidecars (*.meta.json: batch label, input hash, dates) stay in the repo

function walk(dir, root = ROOT, out = []) {
  for (const n of readdirSync(dir).sort()) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, root, out); else out.push(relative(root, p).split(sep).join('/'));
  }
  return out;
}

export function listShipFiles({ img = false } = {}) {
  const cm = computeManifest(ROOT);
  const set = new Set([...cm.files, ...cm.onDemand]); // on-demand files must ship too: they are fetched later, not installed
  for (const [p] of EXTRAS) {
    if (p === 'assets/img' && !img) continue;
    const abs = join(ROOT, p);
    if (!existsSync(abs)) continue;
    if (statSync(abs).isDirectory()) walk(abs).forEach((r) => set.add(r)); else set.add(p);
  }
  walk(join(ROOT, 'assets/fonts')).filter((r) => OFL_TEXTS.test(r)).forEach((r) => set.add(r));
  return [...set].filter((r) => !NEVER(r)).sort();
}

/** With the packs left out, these are not copied: the pack parts and lists, and the runtime's WebAssembly. The runtime's code stays. */
export const isPackData = (rel) => rel.startsWith('assets/vendor/_nmt/') || (rel.startsWith('assets/vendor/_ort/') && /\.(wasm|bin)$/.test(rel));

export function makeDist({ out = 'dist', img = false, packs = process.env.ALEF_PACKS === 'remote' ? 'remote' : 'local' } = {}) {
  const dist = join(ROOT, out);
  if (!dist.startsWith(ROOT + sep) || dist === ROOT) throw new Error('--out must be a folder inside the repo');
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  // packs: 'remote' builds a copy of the site without the Talk language packs (about 185 MiB lighter); the app then fetches them
  // from the pack host named in data/talk/pack-host.json. Set by --packs-remote or ALEF_PACKS=remote.
  const files = listShipFiles({ img }).filter((r) => r !== 'precache-manifest.js').filter((r) => packs !== 'remote' || !isPackData(r));
  for (const rel of files) { mkdirSync(dirname(join(dist, rel)), { recursive: true }); copyFileSync(join(ROOT, rel), join(dist, rel)); }
  const m = computeManifest(dist); // same rules, applied to what actually ships
  writeFileSync(join(dist, 'precache-manifest.js'), manifestText(m, 'tools/deploy/make-dist.mjs'));
  const all = walk(dist, dist);
  const sizes = all.map((r) => ({ rel: r, bytes: statSync(join(dist, r)).size }));
  const top = (rel) => (rel.includes('/') ? rel.split('/').slice(0, rel.startsWith('assets/') || rel.startsWith('data/') ? 2 : 1).join('/') : '(root)');
  const groups = new Map();
  for (const s of sizes) { const g = groups.get(top(s.rel)) ?? { files: 0, bytes: 0 }; g.files++; g.bytes += s.bytes; groups.set(top(s.rel), g); }
  const total = sizes.reduce((a, s) => a + s.bytes, 0);
  const precacheSet = new Set(m.files);
  const precacheBytes = sizes.filter((s) => precacheSet.has(s.rel)).reduce((a, s) => a + s.bytes, 0);
  const largest = [...sizes].sort((a, b) => b.bytes - a.bytes).slice(0, 5);
  return { dist, files: all.length, bytes: total, groups: [...groups].sort((a, b) => b[1].bytes - a[1].bytes), largest, precacheFiles: m.files.length, precacheBytes, version: m.version };
}

const mib = (b) => (b / 1048576).toFixed(2) + ' MiB';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
  const r = makeDist({ out: opt('--out', 'dist'), img: args.includes('--with-img') });
  console.log(`dist ready: ${r.dist}`);
  console.log(`files ${r.files} (no host file-count cap; Render); total ${mib(r.bytes)}; precache ${r.precacheFiles} files, ${mib(r.precacheBytes)} (version ${r.version})`);
  console.log('by folder:'); for (const [g, v] of r.groups) console.log(`  ${g.padEnd(28)} ${String(v.files).padStart(5)} files  ${mib(v.bytes).padStart(11)}`);
  console.log('largest files (limit ' + mib(LIMITS.maxFileBytes) + ' each):'); for (const l of r.largest) console.log(`  ${l.rel}  ${mib(l.bytes)}`);
  if (r.largest[0].bytes > LIMITS.maxFileBytes) { console.error('OVER THE 25 MiB PER-FILE LIMIT'); process.exit(1); }
  console.log('Next: node tools/deploy/check-deploy.mjs');
}
