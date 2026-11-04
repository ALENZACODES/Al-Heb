// node tools/test/run.mjs unit|browser|all [--concurrency N] [extra node --test args]
// unit: fast tier, files run N at a time (default = CPU count). browser: one at a time (shared ports, heavy).
import { spawnSync } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { unitFiles, browserFiles, allFiles } from './tiers.mjs';
const [tier = 'unit', ...rest] = process.argv.slice(2);
const ci = rest.indexOf('--concurrency');
let conc = availableParallelism();
if (ci >= 0) { conc = +rest[ci + 1]; rest.splice(ci, 2); }
const sets = { unit: [[unitFiles(), conc]], browser: [[browserFiles(), 1]], all: [[unitFiles(), conc], [browserFiles(), 1]] };
if (!sets[tier]) { console.error('usage: run.mjs unit|browser|all'); process.exit(2); }
let code = 0;
for (const [files, c] of sets[tier]) {
  const r = spawnSync(process.execPath, ['--test', `--test-concurrency=${c}`, ...rest, ...files], { stdio: 'inherit' });
  code = code || r.status || 0;
}
process.exit(code);
