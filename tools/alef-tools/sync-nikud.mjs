#!/usr/bin/env node
// The vowel-marks lane's view of the pinned alef-tools build. Since the lanes were brought together there is ONE pin for the
// whole app, data/alef-tools.lock.json, written by tools/alef-tools/sync.mjs; this file only reads it for the loader and nikud
// packages, so the lane's own tests keep asking the same questions.
//   node tools/alef-tools/sync-nikud.mjs --check     verify the vendored files against the shared lock (no network)
// To move the pin: node tools/alef-tools/sync.mjs --ref <commit>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, ROOT, LOCK } from './sync.mjs';

export const PACKAGES = ['loader', 'nikud'];

/** Compares the vendored folders with the lock. @returns {{lock:any, problems:string[]}} */
export function verify() {
  const shared = JSON.parse(readFileSync(join(ROOT, LOCK), 'utf8'));
  const lock = { commit: shared.ref, packages: Object.fromEntries(PACKAGES.map((p) => [p, shared.packages[p]])) };
  return { lock, problems: check().filter((line) => PACKAGES.some((p) => line.includes(`/${p}@`)) || !/_alef-tools\/[a-z-]+@/.test(line)) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { lock, problems } = verify();
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log(`vendored alef-tools files match the lock (commit ${lock.commit.slice(0, 12)}: ${Object.entries(lock.packages).map(([n, p]) => `${n}@${p.version}`).join(', ')})`);
}
