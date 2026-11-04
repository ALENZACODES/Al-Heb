// Performance lane: JS bytes on first load stay under a budget derived from a measured baseline (docs/perf/budget.json), and the PWA audit is clean.
// The browser parts are skipped when Playwright/Chromium are missing. Emulation only, see docs/perf/PERF.md for limits.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const budget = JSON.parse(readFileSync(join(root, 'docs/perf/budget.json'), 'utf8'));

test('perf budget is derived from a recorded baseline, not invented', () => {
  assert.ok(budget.baselineBytes > 0 && budget.headroom >= 1 && budget.headroom <= 1.5);
  assert.ok(budget.budgetBytes >= budget.baselineBytes, 'budget below baseline');
  assert.ok(budget.budgetBytes <= Math.ceil((budget.baselineBytes * budget.headroom) / 10240) * 10240, 'budget exceeds baseline x headroom: write the reason in docs/perf/PERF.md and re-measure with --set-budget');
  const doc = readFileSync(join(root, 'docs/perf/PERF.md'), 'utf8');
  assert.match(doc, /emulat/i); assert.match(doc, /not a real phone/i);
  assert.ok(doc.includes(String(budget.baselineBytes)), 'PERF.md must quote the baseline bytes from budget.json');
});
test('perf tool covers the required routes and throttling', () => {
  const src = readFileSync(join(root, 'tools/qa/perf.mjs'), 'utf8');
  for (const r of ['/read/bless-priestly-1', '/vocab', '/vocab/themes', '/placement', '/progress', '/speak']) assert.ok(src.includes(`'${r}'`), r);
  assert.match(src, /Emulation\.setCPUThrottlingRate/); assert.match(src, /Network\.emulateNetworkConditions/);
});
let haveBrowser = true;
try { const r = spawnSync('node', ['-e', "const {createRequire}=require('module');const r=createRequire(process.cwd()+'/x.js');let ok=false;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/usr/lib/node_modules/playwright']){try{r(p);ok=true;break}catch{}}process.exit(ok?0:1)"], { cwd: root }); haveBrowser = r.status === 0; } catch { haveBrowser = false; }
test('perf --quick: first-load JS bytes of / are under the budget', { skip: !haveBrowser, timeout: 170000 }, () => {
  const out = mkdtempSync(join(tmpdir(), 'alef-perf-'));
  const r = spawnSync('node', ['tools/qa/perf.mjs', '--quick', '--out', out], { cwd: root, encoding: 'utf8', timeout: 150000 });
  const res = JSON.parse(readFileSync(join(out, 'results-quick.json'), 'utf8'));
  const home = res.routes['/'];
  assert.ok(home.ready, 'home never became ready\n' + r.stdout + r.stderr);
  assert.deepEqual(home.errors, []);
  assert.ok(home.jsBytes <= budget.budgetBytes, `first-load JS ${home.jsBytes} B exceeds budget ${budget.budgetBytes} B`);
});
test('pwa audit: manifest, icons, SW, offline fallback, installability', { skip: !haveBrowser, timeout: 120000 }, () => {
  const out = join(mkdtempSync(join(tmpdir(), 'alef-pwa-')), 'pwa.json');
  const r = spawnSync('node', ['tools/qa/pwa_audit.mjs', '--out', out], { cwd: root, encoding: 'utf8', timeout: 110000 });
  assert.equal(r.status, 0, r.stdout.split('\n').filter((l) => l.startsWith('FAIL')).join('\n') + r.stderr);
});
