// Accessibility gate (browser tier; see tools/test/tiers.mjs). Two parts:
//  1. every setting in settings.js has a hub control and is covered by the privacy "settings" row, validates, and round-trips;
//  2. tools/a11y/gate.mjs (keyboard walk, newviews audit, contrast) reports no regression against tools/a11y/gate-baseline.json.
// Part 2 is skipped when Playwright or axe-core is missing (the tool itself exits 2 then, which is never a pass). Slow: several minutes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULTS, validate, createSettings } from '../src/shell/settings.js';
import { uncovered } from '../src/shell/a11y.model.js';
import { STORE_KEYS } from '../src/shell/privacy.view.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mem = () => { const m = {}; return { get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); }, m }; };

test('every settings key has a hub control (or is listed as not an accessibility setting), validates its own default, and persists', () => {
  assert.deepEqual(uncovered(), [], 'a setting was added without a control in src/shell/a11y.model.js');
  const st = mem(); const s = createSettings(st);
  for (const [k, v] of Object.entries(DEFAULTS)) {
    assert.equal(validate(k, v).ok, true, `${k}: its own default is rejected, so it could never be saved`);
    assert.equal(validate(k, { bad: 1 }).ok, false, `${k} accepts garbage`);
  }
  // set() only writes when a value changes, so a patch of pure defaults stores nothing: change one value (voice) to force the write
  assert.deepEqual(s.set({ ...Object.fromEntries(Object.entries(DEFAULTS).filter(([k]) => k !== 'onboarded')), voice: 'm' }), []);
  assert.equal(st.m.settings.voice, 'm', 'the changed value is stored');
  assert.deepEqual(Object.keys(st.m.settings).sort(), Object.keys(DEFAULTS).sort(), 'every key is stored');
});

test('the privacy table has a row for the settings store key and says the accessibility options live there', () => {
  const row = STORE_KEYS.find((r) => r[0] === 'settings');
  assert.ok(row && /accessibility/i.test(row[1]));
});

const have = (() => { try { return spawnSync('node', ['-e', "const {createRequire}=require('module');const r=createRequire(process.cwd()+'/x.js');let ok=false;for(const p of ['playwright','/opt/npm-tools/node_modules/playwright','/usr/lib/node_modules/playwright']){try{r(p);ok=true;break}catch{}}process.exit(ok?0:1)"], { cwd: root }).status === 0; } catch { return false; } })();
const haveAxe = existsSync(join(root, 'tools/a11y/node_modules/axe-core/axe.min.js'));

test('tools/a11y/gate.mjs: no regression against the baseline', { skip: !(have && haveAxe), timeout: 1500000 }, () => {
  const r = spawnSync('node', ['tools/a11y/gate.mjs'], { cwd: root, encoding: 'utf8', timeout: 1450000, maxBuffer: 64 * 1024 * 1024 });
  assert.equal(r.status, 0, (r.stdout + r.stderr).slice(-1500));
});
