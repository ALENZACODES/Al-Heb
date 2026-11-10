// Smoke test of the built site: serves dist/ WITH its _headers (so the real CSP applies), loads /, checks the service worker
// registers, no CSP violation is reported on a few routes, and an offline reload works. Skipped locally without Playwright or dist/;
// with ALEF_REQUIRE_BROWSER=1 (set in the CI browser job) a missing browser or dist/ FAILS.
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
test('dist smoke prerequisites are present (only enforced when ALEF_REQUIRE_BROWSER=1)', () => { if (must) assert.equal(missing, false, String(missing)); });

test('dist smoke: CSP clean, service worker registers, offline reload works', { skip, timeout: 120000 }, async () => {
  const srv = await startServer(dist, parseHeaders(readFileSync(join(dist, '_headers'), 'utf8')));
  const base = `http://127.0.0.1:${srv.address().port}/`;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ serviceWorkers: 'allow' });
    await ctx.addInitScript(() => { try { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); } catch { /* ignore */ } window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`)); });
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) errors.push(m.text()); });
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 });
    await page.evaluate(() => navigator.serviceWorker.ready);
    for (const r of ['/learn', '/letters/alef', '/sounds', '/scan', '/settings', '/']) { await page.goto(`${base}#${r}`); await page.waitForTimeout(500); }
    assert.deepEqual(await page.evaluate(() => window.__csp), [], 'CSP violations');
    assert.deepEqual(errors, []);
    // SW controls the page after a reload, caches are filled, then go offline
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    assert.ok(await page.evaluate(async () => (await caches.keys()).some((k) => k.startsWith('alef-shell-'))), 'shell cache exists');
    await ctx.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 });
    assert.ok((await page.locator('#main').innerText()).length > 20, 'main has content offline');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); srv.close(); }
});
