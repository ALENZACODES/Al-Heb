// QA lane: the journey script is SCRIPTED EMULATION of three learner personas, not real learners. This test keeps the script honest
// (it says so, it covers all three personas and the tools) and runs persona A for day 1 only (--quick) in headless Chromium when
// Playwright is available. Needs no network. No assertions about the app's content beyond "the script got through onboarding".
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'tools/qa/journey.mjs'), 'utf8');

test('journey script: says plainly it is scripted emulation and defines the three personas and the tools', () => {
  assert.match(src, /SCRIPTED EMULATION, NOT REAL LEARNERS/);
  for (const k of ["A: total beginner", "B: Sephardi", "C: Israel-track"]) assert.ok(src.includes(k), k);
  for (const r of ['#/speak', '#/typing', '#/listen', '#/progress']) assert.ok(src.includes(r), r);
  assert.match(src, /--quick/);
});
test('journey doc exists, names the limits, and every screenshot it cites exists', () => {
  const doc = readFileSync(join(root, 'docs/qa/JOURNEY.md'), 'utf8');
  assert.match(doc, /scripted emulation/i);
  assert.match(doc, /not real learners/i);
  const shots = [...doc.matchAll(/docs\/qa\/journey\/[\w.-]+\.jpg/g)].map((m) => m[0]);
  for (const s of new Set(shots)) assert.ok(existsSync(join(root, s)), 'missing ' + s);
  assert.ok(existsSync(join(root, 'docs/qa/journey/journey.json')));
});
let haveBrowser = true;
try { const r = spawnSync('node', ['-e', "const {createRequire}=require('module');const r=createRequire(process.cwd()+'/x.js');let ok=false;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/usr/lib/node_modules/playwright']){try{r(p);ok=true;break}catch{}}process.exit(ok?0:1)"], { cwd: root }); haveBrowser = r.status === 0; } catch { haveBrowser = false; }
test('journey --quick: persona A, day 1, finishes under 90 s and records onboarding, the Today card and the tools', { skip: !haveBrowser, timeout: 150000 }, () => {
  const out = mkdtempSync(join(tmpdir(), 'alef-journey-'));
  const r = spawnSync('node', ['tools/qa/journey.mjs', '--quick', '--no-shots', '--out', out], { cwd: root, encoding: 'utf8', timeout: 140000 });
  const res = JSON.parse(readFileSync(join(out, 'journey.json'), 'utf8'));
  assert.ok(res.elapsedSeconds < 90, `took ${res.elapsedSeconds}s\n${r.stdout}${r.stderr}`);
  assert.deepEqual(Object.keys(res.personas), ['A']);
  const A = res.personas.A; const what = A.steps.map((s) => s.what).join('\n');
  assert.equal(A.steps.find((s) => s.what === 'Initial letters choice')?.choice, null, 'starting level requires an explicit answer');
  assert.equal(A.onboardingRecord.letters, 'none');
  assert.equal(A.onboardingRecord.denomination, 'orthodox');
  assert.match(what, /plan card/); assert.match(what, /Today card \(open\)/); assert.match(what, /first 10 minutes finished/);
  for (const t of ['speak', 'typing', 'listen', 'progress']) assert.match(what, new RegExp('tool opened: ' + t));
  assert.equal(A.steps.filter((s) => /SCRIPT PROBLEM/.test(s.what)).length, 0, 'script problems: ' + JSON.stringify(A.steps.filter((s) => /SCRIPT PROBLEM/.test(s.what))));
});
