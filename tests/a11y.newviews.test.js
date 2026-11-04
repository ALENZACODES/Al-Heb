// Accessibility round 2: runs tools/a11y/newviews.mjs (Chromium + axe-core + DOM/CSS checks) over the newest routes, light and dark at 390x844.
// Skipped when Playwright or axe-core (tools/a11y: npm install) are missing. About 2.5 minutes. No screen reader is involved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const have = (() => { try { return spawnSync('node', ['-e', "const {createRequire}=require('module');const r=createRequire(process.cwd()+'/x.js');let ok=false;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/usr/lib/node_modules/playwright']){try{r(p);ok=true;break}catch{}}process.exit(ok?0:1)"], { cwd: root }).status === 0; } catch { return false; } })();
const haveAxe = existsSync(join(root, 'tools/a11y/node_modules/axe-core/axe.min.js'));

// Known, documented findings owned by other lanes (docs/a11y/NEWVIEWS.md). Anything else fails.
const KNOWN = [
];

test('new views: axe, focus, names, live regions, reduced motion, reflow, Hebrew lang/dir (only documented findings remain)', { skip: !(have && haveAxe), timeout: 330000 }, () => {
  const out = join(tmpdir(), 'alef-newviews.json');
  const r = spawnSync('node', ['tools/a11y/newviews.mjs', '--out', out, '--json'], { cwd: root, encoding: 'utf8', timeout: 320000 });
  assert.equal(r.status, 0, (r.stdout + r.stderr).slice(-600));
  const run = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(run.summary.routes, 10);
  for (const [route, cfg] of Object.entries(run.routes)) {
    assert.deepEqual(Object.keys(cfg).sort(), ['dark', 'light'], route);
    for (const rec of Object.values(cfg)) assert.ok(rec.rendered.text > 100, `${route} rendered something`);
  }
  const unexpected = run.findings.filter((f) => !KNOWN.some((k) => k.route === f.route && k.kind === f.kind));
  assert.deepEqual(unexpected.map((f) => `${f.route} [${f.theme}] ${f.kind}: ${f.detail}`.slice(0, 200)), []);
  // the known entries must still be real, so a fix elsewhere removes them from KNOWN instead of leaving a stale excuse
  for (const k of KNOWN) assert.ok(run.findings.some((f) => f.route === k.route && f.kind === k.kind), `known finding is gone, remove it from KNOWN: ${k.route} ${k.kind}`);
});

test('ladder buttons keep their visible text at the start of the accessible name (label in name)', () => {
  const src = readFileSync(join(root, 'src/firstday/ladder.view.js'), 'utf8');
  assert.match(src, /'Hear it'.*'aria-label': `Hear it, step/s);
  assert.match(src, /'I read it'.*'aria-label': `I read it, step/s);
  assert.match(src, /'Not yet'.*'aria-label': `Not yet, step/s);
});
