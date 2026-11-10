// QA lane: keeps the walk script honest. The browser part is skipped when Playwright/Chromium are missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'tools/qa/walk.mjs'), 'utf8');
const { ROUTES } = await import('../src/shell/router.js');

test('qa walk: derives its route list from ROUTES and has a sample for every path parameter', () => {
  assert.match(src, /import\(pathToFileURL\(join\(root, 'src\/shell\/router\.js'\)\)/);
  const params = new Set(ROUTES.flatMap((r) => [...r.pattern.matchAll(/:(\w+)/g)].map((m) => m[1])));
  for (const p of params) assert.ok(new RegExp(`\\b${p}\\b`).test(src), `walk.mjs has no sample for :${p}`);
});
test('qa docs exist and name the honest limits', () => {
  const dir = join(root, 'docs/qa'); const files = readdirSync(dir);
  assert.ok(files.includes('REPORT.md') && files.includes('DEFECTS.md'));
  assert.match(readFileSync(join(dir, 'REPORT.md'), 'utf8'), /no real phone/i);
});
let haveBrowser = true;
try { const r = spawnSync('node', ['-e', "const {createRequire}=require('module');const r=createRequire(process.cwd()+'/x.js');let ok=false;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/usr/lib/node_modules/playwright']){try{r(p);ok=true;break}catch{}}process.exit(ok?0:1)"], { cwd: root }); haveBrowser = r.status === 0; } catch { haveBrowser = false; }
test('qa walk --quick: 8 routes on a phone, tracing accepts a synthetic drag, no hard failures', { skip: !haveBrowser, timeout: 170000 }, () => {
  const out = mkdtempSync(join(tmpdir(), 'alef-qa-'));
  const r = spawnSync('node', ['tools/qa/walk.mjs', '--quick', '--phase', 'walk,interact', '--out', out], { cwd: root, encoding: 'utf8', timeout: 160000 });
  const res = JSON.parse(readFileSync(join(out, 'results.json'), 'utf8'));
  assert.equal(res.hardFailures, 0, r.stdout + r.stderr);
  assert.ok(res.interact.some((i) => /trace alef.*median drags counted/.test(i.name) && i.ok));
});
