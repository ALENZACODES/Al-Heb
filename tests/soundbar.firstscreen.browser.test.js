// The sound bar is not visible on the first screen of a fresh profile in the built site.
// Skipped without Playwright or dist/; with ALEF_REQUIRE_BROWSER=1 a missing browser or dist/ fails.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHeaders, startServer } from '../tools/deploy/check-deploy.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/opt/node-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
const must = process.env.ALEF_REQUIRE_BROWSER === '1';
const missing = !chromium ? 'Playwright not installed' : !existsSync(join(dist, 'index.html')) ? 'dist/ not built (node tools/deploy/build_site.mjs)' : false;
const skip = must ? false : missing;
test('soundbar prerequisites are present (only enforced when ALEF_REQUIRE_BROWSER=1)', () => { if (must) assert.equal(missing, false, String(missing)); });

test('dist: the sound bar is not visible on the first screen of a fresh profile', { skip, timeout: 60000 }, async () => {
  const srv = await startServer(dist, parseHeaders(readFileSync(join(dist, '_headers'), 'utf8')));
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 });
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('.sound-bar').isVisible(), false, 'no sound bar before anything asked for sound');
    assert.doesNotMatch(await page.locator('body').innerText(), /has not been loaded yet/);
  } finally { await browser.close(); srv.close(); }
});
