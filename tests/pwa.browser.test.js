// PWA lane: service worker, installability, offline reload, update flow, clear-site-data, in headless Chromium (tools/lighthouse/pwa-check.mjs).
// Skipped when Playwright is missing. Full run (9 routes) is `node tools/lighthouse/pwa-check.mjs`; the test uses --quick (4 routes).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const have = (() => { try { const r = spawnSync('node', ['-e', "const {createRequire}=require('module');const r=createRequire(process.cwd()+'/x.js');let ok=false;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/usr/lib/node_modules/playwright']){try{r(p);ok=true;break}catch{}}process.exit(ok?0:1)"], { cwd: root }); return r.status === 0; } catch { return false; } })();

test('pwa-check --quick: SW controls the page, Chromium reports no installability errors, offline reload works, update waits then activates on SKIP_WAITING, clear-site-data restarts cleanly', { skip: !have, timeout: 200000 }, () => {
  const r = spawnSync('node', ['tools/lighthouse/pwa-check.mjs', '--quick', '--out', join(tmpdir(), 'alef-pwa.json')], { cwd: root, encoding: 'utf8', timeout: 190000 });
  const run = JSON.parse(readFileSync(join(tmpdir(), 'alef-pwa.json'), 'utf8'));
  assert.deepEqual(run.results.filter((x) => !x.ok && !x.gap), [], r.stdout.slice(-1500));
  for (const needle of [/installability/, /offline reload: \/learn/, /new SW and it waits/, /after SKIP_WAITING the new SW activates/, /old shell cache is deleted/, /controllerchange after SKIP_WAITING/, /not an Aleph backup is refused/, /after clearing site data/]) assert.ok(run.results.some((x) => needle.test(x.name) && x.ok), String(needle));
  assert.equal(r.status, 0);
});
