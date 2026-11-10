#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
// Static build for GitHub Pages (or any static host): copies the runtime files into dist/, regenerates the precache
// manifest for what is actually shipped, and checks that nothing assumes the site is served from the domain root.
//
//   node tools/build-static.mjs [--out dist] [--base /alef/]
//
// Base path: every URL in the app is relative (hash router, relative fetches, relative manifest/SW scope), so the same
// build works at "/" and at "/<repo>/" with no rewriting. --base does not rewrite anything; it is recorded in
// dist/BUILD.json, and `node tools/smoke.mjs --dist --base /alef/` serves dist/ under that prefix to prove it.
// The build verifies the claim statically: it fails if any shipped html/js/css/webmanifest contains a root-absolute URL.
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync, copyFileSync } from 'node:fs';
import { join, relative, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeManifest, manifestText } from './build-precache.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

const SHIP_FILES = ['index.html', 'offline.html', 'manifest.webmanifest', 'sw.js'];
const SHIP_DIRS = ['src', 'assets', 'data', 'audio'];
const EXCLUDE = (rel) => {
  const parts = rel.split('/');
  if (parts.some((p) => p === 'tools' || p === 'node_modules' || p.startsWith('_') || p === '__pycache__')) return true;
  if (/\.(py|md|test\.js|csv)$/i.test(rel)) return true;
  if (/^assets\/fonts\/[^/]+\.(ttf|otf|txt)$/i.test(rel)) return true;            // original TTFs/licences stay in the repo; woff2 ships
  if (rel.startsWith('data/images/') || rel === 'data/corpus/source-snapshot.json') return true; // build-time inputs
  if (rel.startsWith('data/') && !rel.endsWith('.json')) return true;
  if (rel.startsWith('audio/') && !/\.(mp3|m4a|ogg)$/i.test(rel)) return true;   // meta files stay in the repo
  return false;
};

function walk(dir, out = []) {
  for (const n of readdirSync(dir).sort()) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(relative(ROOT, p).split(sep).join('/'));
  }
  return out;
}

/** Root-absolute references that would break under /<repo>/. Returns [{file, line, text}]. */
export function findRootAbsolute(file, text) {
  const out = [];
  const pats = [/(?:src|href|action|poster)\s*=\s*["']\/(?!\/)/i, /url\(\s*["']?\/(?!\/)/i, /\b(?:fetch|import|register)\(\s*["'`]\/(?!\/)/, /\bfrom\s+["']\/(?!\/)/, /"(?:start_url|scope|src|id)"\s*:\s*"\/(?!\/)/];
  text.split('\n').forEach((line, i) => { if (pats.some((p) => p.test(line))) out.push({ file, line: i + 1, text: line.trim().slice(0, 120) }); });
  return out;
}

export function build({ out = 'dist', base = '/' } = {}) {
  const dist = join(ROOT, out);
  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  for (const f of SHIP_FILES) copyFileSync(join(ROOT, f), join(dist, f));
  for (const d of SHIP_DIRS) {
    if (!existsSync(join(ROOT, d))) continue;
    for (const rel of walk(join(ROOT, d))) {
      if (EXCLUDE(rel)) continue;
      mkdirSync(join(dist, rel, '..'), { recursive: true });
      copyFileSync(join(ROOT, rel), join(dist, rel));
    }
  }
  // precache for the shipped tree (sw.js imports ./precache-manifest.js)
  const m = computeManifest(dist);
  writeFileSync(join(dist, 'precache-manifest.js'), manifestText(m, 'tools/build-static.mjs'));
  copyFileSync(join(dist, 'index.html'), join(dist, '404.html'));   // GitHub Pages serves this for unknown paths
  writeFileSync(join(dist, '.nojekyll'), '');                        // do not let Jekyll skip files such as _-prefixed ones
  // static checks
  const problems = [];
  const files = walk(dist).map((p) => p); // relative to ROOT because dist is inside ROOT
  const all = []; const walkDist = (dir) => { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) walkDist(p); else all.push(p); } }; walkDist(dist);
  let bytes = 0, precacheBytes = 0; const precacheSet = new Set(m.files);
  for (const p of all) {
    const rel = relative(dist, p).split(sep).join('/'); const size = statSync(p).size; bytes += size; if (precacheSet.has(rel)) precacheBytes += size;
    if (['.html', '.js', '.css', '.webmanifest', '.mjs'].includes(extname(p))) problems.push(...findRootAbsolute(rel, readFileSync(p, 'utf8')));
  }
  for (const rel of m.files) if (!existsSync(join(dist, rel))) problems.push({ file: rel, line: 0, text: 'listed in precache but missing from dist' });
  void files;
  writeFileSync(join(dist, 'BUILD.json'), JSON.stringify({ built: new Date().toISOString(), base, files: all.length, bytes, precacheFiles: m.files.length, precacheBytes, precacheVersion: m.version }, null, 1) + '\n');
  return { dist, files: all.length, bytes, precacheFiles: m.files.length, precacheBytes, version: m.version, problems };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
  const r = build({ out: opt('--out', 'dist'), base: opt('--base', '/') });
  console.log(`dist: ${r.files} files, ${(r.bytes / 1024).toFixed(0)} KiB; precache: ${r.precacheFiles} files, ${(r.precacheBytes / 1024).toFixed(0)} KiB (version ${r.version})`);
  if (r.problems.length) { for (const p of r.problems) console.error(`PROBLEM ${p.file}:${p.line} ${p.text}`); process.exit(1); }
  console.log('no root-absolute URLs found in shipped html/js/css/manifest');
}
