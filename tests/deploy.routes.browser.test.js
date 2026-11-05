// The built site (dist/, served with its real _headers): /listen, /grammar and /placement load their data (no 404) and show no load-failure message.
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
test('dist routes prerequisites are present (only enforced when ALEF_REQUIRE_BROWSER=1)', () => { if (must) assert.equal(missing, false, String(missing)); });

test('dist: /listen, /grammar and /placement fetch no missing file and show no load failure', { skip, timeout: 120000 }, async () => {
  const srv = await startServer(dist, parseHeaders(readFileSync(join(dist, '_headers'), 'utf8')));
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch();
  try {
    for (const route of ['/listen', '/grammar', '/placement']) {
      const ctx = await browser.newContext({ serviceWorkers: 'block' });
      await ctx.addInitScript(() => { try { localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); } catch { /* ignore */ } });
      const page = await ctx.newPage();
      const bad = []; page.on('response', (r) => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url().replace(base, '')}`); });
      await page.goto(`${base}#${route}`, { waitUntil: 'load' });
      await page.waitForFunction(() => !/Loading/.test(document.querySelector('#main')?.innerText || 'Loading'), null, { timeout: 20000 });
      assert.deepEqual(bad, [], route);
      assert.equal(await page.locator('#main [role="alert"]').count(), 0, `${route} shows an error`);
      assert.doesNotMatch(await page.locator('#main').innerText(), /could not be loaded|Could not load/i, route);
      await ctx.close();
    }
  } finally { await browser.close(); srv.close(); }
});
