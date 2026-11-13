#!/usr/bin/env node
// Copies built alef-tools packages into assets/vendor/_alef-tools/<pkg>@<version>/ and records them in data/alef-tools.lock.json.
// A small stand-in for the shared sync tool described in the alef-tools contract (docs/CONTRACT.md, section 8): same folders,
// same lock file, so the shared tool can take over without moving anything.
//
//   node tools/alef-tools/sync.mjs --from ../alef-tools [--commit <40-hex>] [--only handwriting,ocr-fix]
//   node tools/alef-tools/sync.mjs --check        verify the vendored files against the lock (no network, no checkout needed)
//
// --from is a local checkout. Each package's dist/dist.json lists its files with SHA-256; every copied file is checked against it.
// Packages already in the lock that are not synced in this run are left as they are.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const VENDOR = 'assets/vendor/_alef-tools';
const LOCK = 'data/alef-tools.lock.json';
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const readLock = () => (existsSync(join(root, LOCK)) ? JSON.parse(readFileSync(join(root, LOCK), 'utf8')) : { schema: 'alef.tools-lock.v1', repo: 'https://github.com/ALENZACODES/alef-tools', commit: null, packages: {} });

export function check(lock = readLock()) {
  const problems = [];
  for (const [name, p] of Object.entries(lock.packages)) for (const f of p.files) {
    const at = join(root, VENDOR, `${name}@${p.version}`, f.path);
    if (!existsSync(at)) { problems.push(`${name}: ${f.path} is missing`); continue; }
    const b = readFileSync(at);
    if (b.length !== f.bytes || sha(b) !== f.sha256) problems.push(`${name}: ${f.path} does not match the lock`);
  }
  return problems;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (args.includes('--check')) {
    const lock = readLock(); const problems = check(lock);
    if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
    console.log(`alef-tools: ${Object.keys(lock.packages).length} vendored package(s) match the lock (commit ${lock.commit})`);
  } else {
    const from = opt('from'); if (!from) { console.error('usage: sync.mjs --from <alef-tools checkout> [--commit SHA] [--only a,b] | --check'); process.exit(2); }
    const commit = opt('commit') || execFileSync('git', ['-C', from, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (!/^[0-9a-f]{40}$/.test(commit)) { console.error('commit must be a full 40-character SHA'); process.exit(2); }
    const only = opt('only') ? opt('only').split(',') : readdirSync(join(from, 'packages')).filter((p) => existsSync(join(from, 'packages', p, 'dist/dist.json')));
    const lock = readLock(); lock.commit = commit;
    for (const name of only) {
      const dist = join(from, 'packages', name, 'dist');
      const info = JSON.parse(readFileSync(join(dist, 'dist.json'), 'utf8'));
      if (info.schema !== 'alef.dist.v1') throw new Error(`${name}: unknown dist.json schema`);
      const old = lock.packages[name];
      if (old && old.version !== info.version) rmSync(join(root, VENDOR, `${name}@${old.version}`), { recursive: true, force: true });
      const out = join(root, VENDOR, `${name}@${info.version}`);
      rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
      for (const f of info.files) {
        const b = readFileSync(join(dist, f.path));
        if (b.length !== f.bytes || sha(b) !== f.sha256) throw new Error(`${name}: ${f.path} does not match dist.json`);
        mkdirSync(dirname(join(out, f.path)), { recursive: true }); writeFileSync(join(out, f.path), b);
      }
      lock.packages[name] = { version: info.version, folder: `${VENDOR}/${name}@${info.version}/`, files: info.files };
      console.log(`${name}@${info.version}: ${info.files.length} files, ${info.files.reduce((a, f) => a + f.bytes, 0)} bytes`);
    }
    writeFileSync(join(root, LOCK), JSON.stringify(lock, null, 1) + '\n');
    console.log(`wrote ${LOCK} (commit ${commit})`);
  }
}
