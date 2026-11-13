#!/usr/bin/env node
// The offline-pipeline lane's view of the pinned alef-tools build. Since the lanes were brought together there is ONE pin for
// the whole app, data/alef-tools.lock.json, written by tools/alef-tools/sync.mjs; this file only reads it for the offline-llm
// package, so the lane's own tests keep asking the same questions.
//   node tools/alef-tools/sync-offline-llm.mjs --check     verify the vendored files against the shared lock (no network)
// To move the pin: node tools/alef-tools/sync.mjs --ref <commit>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check as checkAll, ROOT, LOCK } from './sync.mjs';

const shared = JSON.parse(readFileSync(join(ROOT, LOCK), 'utf8'));
export const pin = { repo: shared.repo, commit: shared.ref, package: 'offline-llm', version: shared.packages['offline-llm'].version };
export const vendorDir = join(ROOT, shared.packages['offline-llm'].path);

/** Problems with the vendored folder (empty list = it is exactly the pinned build). */
export function check() { return checkAll().filter((line) => line.includes('/offline-llm@') || !/_alef-tools\/[a-z-]+@/.test(line)); }

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = check();
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  console.log(`offline-llm@${pin.version} matches the lock (commit ${pin.commit.slice(0, 12)})`);
}
