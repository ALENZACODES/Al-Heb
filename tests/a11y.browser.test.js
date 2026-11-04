// Accessibility lane: axe-core (quick route subset, phone+desktop, light+dark) and the keyboard-only walk. Skipped when Playwright or
// axe-core (tools/a11y: npm install) are missing. The full 40-route run is `node tools/a11y/run.mjs` (about 2 minutes).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const have = (() => { try { const r = spawnSync('node', ['-e', "const {createRequire}=require('module');const r=createRequire(process.cwd()+'/x.js');let ok=false;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/usr/lib/node_modules/playwright']){try{r(p);ok=true;break}catch{}}process.exit(ok?0:1)"], { cwd: root }); return r.status === 0; } catch { return false; } })();
const haveAxe = existsSync(join(root, 'tools/a11y/node_modules/axe-core/axe.min.js'));

test('axe (quick subset, 4 configs): no critical issue and no colour-contrast failure on the shell and the core views', { skip: !(have && haveAxe), timeout: 280000 }, () => {
  const r = spawnSync('node', ['tools/a11y/run.mjs', '--quick', '--out', join(tmpdir(), 'alef-axe-quick.json')], { cwd: root, encoding: 'utf8', timeout: 270000 });
  const out = JSON.parse(readFileSync(join(tmpdir(), 'alef-axe-quick.json'), 'utf8'));
  assert.ok(out.summary.routes >= 8 && out.summary.configs === 4, r.stdout.slice(-400));
  assert.equal(out.summary.byImpact.critical ?? 0, 0, 'critical axe violations');
  // the calendar view is being rebuilt by another lane; its own contrast findings are tracked in docs/A11Y.md, so it is excluded here
  const contrast = [];
  for (const [route, cfgs] of Object.entries(out.routes)) if (route !== '/calendar') for (const [cfg, vs] of Object.entries(cfgs)) for (const v of vs) if (v.id === 'color-contrast') contrast.push(`${route} ${cfg} ${v.nodes[0].target}`);
  assert.deepEqual(contrast, []);
  assert.deepEqual(out.routes['/ (More sheet open)'] && Object.values(out.routes['/ (More sheet open)']).flat(), [], 'the open More sheet has no violations');
  assert.deepEqual(out.keyboard.filter((k) => !k.ok), [], 'keyboard checks in run.mjs');
});

test('keyboard-only walk: onboarding, trace, atlas quiz, vocab review, reader, calendar + More sheet (known gaps are allowed, failures are not)', { skip: !have, timeout: 200000 }, () => {
  const r = spawnSync('node', ['tools/a11y/keyboard.mjs', '--out', join(tmpdir(), 'alef-kbd.json')], { cwd: root, encoding: 'utf8', timeout: 190000 });
  assert.equal(r.status, 0, r.stdout.slice(-1500) + r.stderr.slice(-500));
  const run = JSON.parse(readFileSync(join(tmpdir(), 'alef-kbd.json'), 'utf8'));
  assert.ok(run.results.length >= 25);
  assert.deepEqual(run.results.filter((x) => !x.ok && !x.gap), []);
});
