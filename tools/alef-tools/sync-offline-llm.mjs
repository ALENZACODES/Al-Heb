#!/usr/bin/env node
// Copy the pinned build of alef-tools packages/offline-llm/dist into assets/vendor/_alef-tools/offline-llm@<version>/.
// A small stand-in until the shared tools/alef-tools/sync.mjs and data/alef-tools.lock.json (the loader lane) are on main:
// it writes the same folder that script writes, so switching over later changes no vendored file.
//
//   node tools/alef-tools/sync-offline-llm.mjs --from ../alef-tools   copy from a local checkout whose HEAD is the pinned commit
//   node tools/alef-tools/sync-offline-llm.mjs                        fetch the pinned commit's files from GitHub
//   node tools/alef-tools/sync-offline-llm.mjs --check                verify the vendored files (no network; the tests run this)
//
// The pin is tools/alef-tools/offline-llm.pin.json. Every copied file is checked against the package's own dist.json
// (size and SHA-256). Nothing here runs in the app, and assets/vendor/ is never in the first install.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const pin = JSON.parse(readFileSync(join(root, 'tools/alef-tools/offline-llm.pin.json'), 'utf8'));
export const vendorDir = join(root, 'assets/vendor/_alef-tools', `${pin.package}@${pin.version}`);
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

function walk(dir, base = dir, out = []) {
  for (const name of readdirSync(dir).sort()) { const p = join(dir, name); if (statSync(p).isDirectory()) walk(p, base, out); else out.push(relative(base, p).split(sep).join('/')); }
  return out;
}

/** Problems with the vendored folder (empty list = it is exactly the listed build). */
export function check() {
  if (!existsSync(join(vendorDir, 'dist.json'))) return [`${vendorDir}: nothing vendored`];
  const listing = JSON.parse(readFileSync(join(vendorDir, 'dist.json'), 'utf8'));
  const problems = [];
  if (listing.name !== pin.package || listing.version !== pin.version) problems.push(`vendored ${listing.name}@${listing.version} is not the pinned ${pin.package}@${pin.version}`);
  const listed = new Set(listing.files.map((f) => f.path));
  for (const f of listing.files) {
    const p = join(vendorDir, f.path);
    if (!existsSync(p)) { problems.push(`${f.path} is missing`); continue; }
    const buf = readFileSync(p);
    if (buf.length !== f.bytes || sha256(buf) !== f.sha256) problems.push(`${f.path} does not match dist.json`);
  }
  for (const rel of walk(vendorDir)) if (rel !== 'dist.json' && rel !== 'PINNED.json' && !listed.has(rel)) problems.push(`${rel} is not in dist.json`);
  const stamp = existsSync(join(vendorDir, 'PINNED.json')) ? JSON.parse(readFileSync(join(vendorDir, 'PINNED.json'), 'utf8')) : {};
  if (stamp.commit !== pin.commit) problems.push(`vendored from commit ${stamp.commit}; the pin is ${pin.commit}`);
  return problems;
}

async function sync(from) {
  const files = new Map();
  if (from) {
    const head = execFileSync('git', ['-C', from, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (head !== pin.commit) throw new Error(`${from} is at ${head}; the pin is ${pin.commit}`);
    if (execFileSync('git', ['-C', from, 'status', '--porcelain', '--', `packages/${pin.package}/dist`], { encoding: 'utf8' }).trim()) throw new Error('the checkout has uncommitted changes in dist/');
    const dist = join(from, 'packages', pin.package, 'dist');
    for (const rel of walk(dist)) files.set(rel, readFileSync(join(dist, rel)));
  } else {
    const prefix = `packages/${pin.package}/dist/`;
    const tree = await (await fetch(`https://api.github.com/repos/${pin.repo}/git/trees/${pin.commit}?recursive=1`, { headers: { accept: 'application/vnd.github+json' } })).json();
    if (!Array.isArray(tree.tree)) throw new Error(`could not list ${pin.repo}@${pin.commit}`);
    for (const e of tree.tree.filter((x) => x.type === 'blob' && x.path.startsWith(prefix))) {
      const r = await fetch(`https://raw.githubusercontent.com/${pin.repo}/${pin.commit}/${e.path}`);
      if (!r.ok) throw new Error(`${e.path}: HTTP ${r.status}`);
      files.set(e.path.slice(prefix.length), Buffer.from(await r.arrayBuffer()));
    }
  }
  if (!files.has('dist.json')) throw new Error('the pinned commit has no dist.json for this package');
  rmSync(vendorDir, { recursive: true, force: true });
  for (const [rel, buf] of files) { mkdirSync(dirname(join(vendorDir, rel)), { recursive: true }); writeFileSync(join(vendorDir, rel), buf); }
  writeFileSync(join(vendorDir, 'PINNED.json'), JSON.stringify({ repo: pin.repo, commit: pin.commit, package: pin.package, version: pin.version }, null, 1) + '\n');
  console.log(`${pin.package}@${pin.version}: ${files.size} files, ${[...files.values()].reduce((a, b) => a + b.length, 0)} bytes, from ${pin.repo}@${pin.commit.slice(0, 12)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  if (!args.includes('--check')) await sync(args.includes('--from') ? args[args.indexOf('--from') + 1] : null);
  const problems = check();
  for (const p of problems) console.error(p);
  process.exit(problems.length ? 1 : 0);
}
