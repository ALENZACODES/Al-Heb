// QA lane (P074): keeps the device-profile walker honest. The browser part is skipped when Playwright/Chromium are missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'tools/qa/devices.mjs'), 'utf8');

test('qa devices: covers the five named profiles, both schemes and the ten agreed routes', () => {
  for (const p of ['iPhone SE', 'iPhone 14 Pro', 'Pixel 7', 'Galaxy S9+', 'iPad Mini']) assert.ok(src.includes(`'${p}'`), `profile ${p} missing`);
  for (const r of ['/', '/learn', '/letters/alef', '/firstday', '/placement', '/sprint', '/service', '/read/bless-priestly-1', '/calendar', '/settings']) assert.ok(src.includes(`'${r}'`), `route ${r} missing`);
  assert.match(src, /colorScheme: scheme/);
  assert.match(src, /scrollWidth/); assert.match(src, /< 44/); assert.match(src, /fs < 12/); assert.match(src, /type: 'jpeg', quality: 40/);
});
test('qa devices: DEVICES.md exists and says plainly that emulation is not a real device', () => {
  const f = join(root, 'docs/qa/DEVICES.md');
  assert.ok(existsSync(f), 'docs/qa/DEVICES.md missing (run node tools/qa/devices.mjs)');
  const md = readFileSync(f, 'utf8');
  assert.match(md, /not a real device/i);
  assert.match(md, /WebKit is not installed|not Safari/i);
  assert.match(md, /\| Route \| Profile \|/);
});
let haveBrowser = true;
try { const r = spawnSync('node', ['-e', "const {createRequire}=require('module');const r=createRequire(process.cwd()+'/x.js');let ok=false;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/usr/lib/node_modules/playwright']){try{r(p);ok=true;break}catch{}}process.exit(ok?0:1)"], { cwd: root }); haveBrowser = r.status === 0; } catch { haveBrowser = false; }
test('qa devices --quick: 2 profiles x 4 routes, every view ready, no page/console errors, no sideways scroll, one screenshot per visit', { skip: !haveBrowser, timeout: 230000 }, () => {
  const out = mkdtempSync(join(tmpdir(), 'alef-qa-dev-'));
  const r = spawnSync('node', ['tools/qa/devices.mjs', '--quick', '--out', out], { cwd: root, encoding: 'utf8', timeout: 220000 });
  const res = JSON.parse(readFileSync(join(out, 'shots-devices', 'results.json'), 'utf8'));
  assert.equal(res.hardFailures, 0, r.stdout + r.stderr);
  assert.equal(res.visits.length, 8);
  assert.ok(res.visits.every((v) => v.ready), 'a view never became ready');
  assert.ok(res.visits.every((v) => v.errors.length === 0), 'page errors');
  assert.ok(res.visits.every((v) => !v.overflow?.pageScrolls), 'page scrolls sideways: ' + res.visits.filter((v) => v.overflow?.pageScrolls).map((v) => v.profile + ' ' + v.route).join(', '));
  assert.ok(res.visits.every((v) => !v.fixedCover), 'fixed nav covers content: ' + res.visits.filter((v) => v.fixedCover).map((v) => v.profile + ' ' + v.route).join(', '));
  const shots = readdirSync(join(out, 'shots-devices')).filter((f) => f.endsWith('.jpg'));
  assert.equal(shots.length, 8, shots.join(','));
  assert.ok(shots.includes('iphone-se-light-home.jpg') && shots.includes('pixel-7-dark-read-bless-priestly-1.jpg'));
  assert.match(readFileSync(join(out, 'DEVICES.md'), 'utf8'), /not a real device/i);
  assert.ok(res.seconds < 180, 'quick run took ' + res.seconds + 's');
});
