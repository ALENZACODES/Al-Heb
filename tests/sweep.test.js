// QA sweep tool: checks that it derives routes from the router and that --quick runs on 3 routes and writes valid output.
// Emulation only (headless Chromium); the browser part is skipped when Playwright is missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'tools/qa/sweep.mjs'), 'utf8');
const { ROUTES } = await import('../src/shell/router.js');

test('sweep: derives routes from ROUTES and names every path parameter', () => {
  assert.match(src, /import\(pathToFileURL\(join\(root, 'src\/shell\/router\.js'\)\)/);
  const params = new Set(ROUTES.flatMap((r) => [...r.pattern.matchAll(/:(\w+)/g)].map((m) => m[1])));
  for (const p of params) assert.ok(new RegExp(`\\b${p}\\b`).test(src), `sweep.mjs has no sample for :${p}`);
});
test('sweep docs state that this is emulation', () => {
  const p = join(root, 'docs/qa/SWEEP.md');
  if (!existsSync(p)) return;
  assert.match(readFileSync(p, 'utf8'), /emulation/i);
  assert.match(readFileSync(p, 'utf8'), /no real phone/i);
});
let haveBrowser = true;
try { const r = spawnSync('node', ['-e', "const {createRequire}=require('module');const r=createRequire(process.cwd()+'/x.js');let ok=false;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/usr/lib/node_modules/playwright']){try{r(p);ok=true;break}catch{}}process.exit(ok?0:1)"], { cwd: root }); haveBrowser = r.status === 0; } catch { haveBrowser = false; }
test('sweep prerequisites are present (only enforced when ALEF_REQUIRE_BROWSER=1)', () => {
  if (process.env.ALEF_REQUIRE_BROWSER !== '1') return;
  assert.ok(haveBrowser, 'Playwright is not installed');
  assert.ok(existsSync(join(root, 'tools/a11y/node_modules/axe-core/axe.min.js')), 'tools/a11y axe-core is missing (npm ci --prefix tools/a11y)');
});
test('sweep --quick: 3 routes, writes sweep.json and SWEEP.md, runs the keyboard pass', { skip: !(haveBrowser && existsSync(join(root, 'tools/a11y/node_modules/axe-core/axe.min.js'))) && process.env.ALEF_REQUIRE_BROWSER !== '1' && 'needs Playwright and tools/a11y axe-core', timeout: 120000 }, () => {
  const out = mkdtempSync(join(tmpdir(), 'alef-sweep-'));
  const t0 = Date.now();
  const r = spawnSync('node', ['tools/qa/sweep.mjs', '--quick', '--out', out], { cwd: root, encoding: 'utf8', timeout: 110000 });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const j = JSON.parse(readFileSync(join(out, 'sweep.json'), 'utf8'));
  assert.equal(j.summary.routes.length, 3);
  assert.equal(j.layout.length, 3);
  assert.equal(j.keyboard.length, 3);
  assert.deepEqual(j.summary.toolErrors, []);
  assert.ok(j.keyboard.every((k) => k.stops > 0), 'keyboard pass found tab stops');
  assert.ok(Array.isArray(j.findings));
  assert.match(readFileSync(join(out, 'SWEEP.md'), 'utf8'), /emulation/i);
  assert.ok(Date.now() - t0 < 100000, 'quick sweep is quick');
});
