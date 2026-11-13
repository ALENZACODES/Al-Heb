#!/usr/bin/env node
// Brings one pinned build of the alef-tools nikud package, and the shared loader it needs, into the app.
//   node tools/alef-tools/sync-nikud.mjs --from <alef-tools checkout>     copy and write the lock
//   node tools/alef-tools/sync-nikud.mjs --check                          no writing: fail when the vendored files differ from the lock
// Copies packages/<pkg>/dist to assets/vendor/_alef-tools/<pkg>@<version>/ (the layout of alef-tools docs/CONTRACT.md, section 8),
// checks every file against the package's own dist.json, writes assets/vendor/_alef-tools/nikud.lock.json (the alef-tools commit,
// each package's version, every file's size and SHA-256) and rewrites src/nikud/vendor.js, the one file that names the versioned
// folders. Nothing is fetched from the network.
// This is a stand-in until the loader lane's tools/alef-tools/sync.mjs and data/alef-tools.lock.json are in the app; it writes
// the same folders that tool will, under its own lock name, so the two do not collide.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync, statSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const vendor = join(root, 'assets', 'vendor', '_alef-tools');
const lockPath = join(vendor, 'nikud.lock.json');
export const PACKAGES = ['loader', 'nikud'];
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const walk = (dir, base = dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p, base) : [relative(base, p).split('\\').join('/')]; }).sort();

/** Compares the vendored folders with the lock. @returns {{lock:any, problems:string[]}} */
export function verify() {
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  const problems = [];
  for (const [name, pkg] of Object.entries(lock.packages)) {
    const dir = join(vendor, `${name}@${pkg.version}`);
    const have = existsSync(dir) ? walk(dir) : [];
    for (const [f, meta] of Object.entries(pkg.files)) {
      if (!have.includes(f)) { problems.push(`${name}: missing ${f}`); continue; }
      if (statSync(join(dir, f)).size !== meta.bytes || sha(join(dir, f)) !== meta.sha256) problems.push(`${name}: changed ${f}`);
    }
    for (const f of have) if (!pkg.files[f]) problems.push(`${name}: not in the lock: ${f}`);
  }
  return { lock, problems };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.includes('--check')) {
    const { lock, problems } = verify();
    if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
    console.log(`vendored alef-tools files match the lock (commit ${lock.commit.slice(0, 12)}: ${Object.entries(lock.packages).map(([n, p]) => `${n}@${p.version}`).join(', ')})`);
  } else {
    const from = args[args.indexOf('--from') + 1];
    if (!args.includes('--from') || !from || !existsSync(join(from, 'packages', 'nikud', 'dist', 'dist.json'))) { console.error('usage: sync-nikud.mjs --from <alef-tools checkout> | --check'); process.exit(2); }
    const git = (...a) => execFileSync('git', ['-C', from, ...a], { encoding: 'utf8' }).trim();
    if (git('status', '--porcelain', '--', ...PACKAGES.map((p) => `packages/${p}`))) { console.error('alef-tools has uncommitted changes under packages/: commit them first, the lock records a commit'); process.exit(1); }
    const commit = git('rev-parse', 'HEAD');
    const packages = {};
    for (const name of PACKAGES) {
      const dist = join(from, 'packages', name, 'dist');
      const listing = JSON.parse(readFileSync(join(dist, 'dist.json'), 'utf8'));
      for (const f of listing.files) if (sha(join(dist, f.path)) !== f.sha256) { console.error(`${name}: ${f.path} does not match its dist.json; run the alef-tools dist build`); process.exit(1); }
      for (const n of existsSync(vendor) ? readdirSync(vendor) : []) if (n.startsWith(`${name}@`)) rmSync(join(vendor, n), { recursive: true });
      const out = join(vendor, `${name}@${listing.version}`);
      const files = {};
      for (const f of walk(dist)) {
        mkdirSync(dirname(join(out, f)), { recursive: true });
        copyFileSync(join(dist, f), join(out, f));
        files[f] = { bytes: statSync(join(out, f)).size, sha256: sha(join(out, f)) };
      }
      packages[name] = { version: listing.version, files };
    }
    writeFileSync(lockPath, JSON.stringify({ schema: 'alef.vendor.lock.v1', source: 'https://github.com/ALENZACODES/alef-tools', commit, packages }, null, 1) + '\n');
    const at = (name) => `../../assets/vendor/_alef-tools/${name}@${packages[name].version}/`;
    mkdirSync(join(root, 'src', 'nikud'), { recursive: true });
    writeFileSync(join(root, 'src', 'nikud', 'vendor.js'),
      `// Written by tools/alef-tools/sync-nikud.mjs. Do not edit: this is the one file that names the vendored folders.\n` +
      `// alef-tools commit ${commit}: loader ${packages.loader.version}, nikud ${packages.nikud.version}.\n` +
      `import * as loader from '${at('loader')}index.js';\n` +
      `import * as nikud from '${at('nikud')}index.js';\n` +
      `export { loader, nikud };\n` +
      `export const NIKUD_FOLDER = new URL('${at('nikud')}', import.meta.url).href;\n`);
    console.log(`vendored from alef-tools ${commit.slice(0, 12)}: ${PACKAGES.map((n) => `${n}@${packages[n].version} (${Object.keys(packages[n].files).length} files)`).join(', ')}`);
  }
}
