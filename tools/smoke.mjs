// Playwright smoke test (Playwright is preinstalled globally here; no package.json dependency).
// Usage: node tools/smoke.mjs   -> screenshots in docs/screens/, JSON result in docs/screens/results.json
// Exit code 1 on uncaught page errors, failed route mounts, or missing main content.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from './serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { try { ({ chromium } = require('/usr/lib/node_modules/playwright')); } catch (e) { console.error('playwright not found:', e.message); process.exit(2); } }

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const outDir = join(root, 'docs', 'screens'); mkdirSync(outDir, { recursive: true });
const ROUTES = ['/', '/learn', '/letters', '/letters/alef', '/sounds', '/read', '/read/bless-priestly-1', '/scan', '/calendar', '/settings', '/about', '/nope'];

const server = createAppServer(); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'allow' });
const results = []; let failed = false;
for (const r of ROUTES) {
  const page = await ctx.newPage();
  const errors = [], consoleErrors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.goto(base + '#' + r, { waitUntil: 'load' });
  try { await page.waitForSelector('body[data-ready="1"]', { timeout: 8000 }); } catch { errors.push('view never became ready'); }
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => {
    const main = document.getElementById('main');
    const heading = main.querySelector('h1')?.textContent?.trim() ?? '';
    const unavailable = !!main.querySelector('.alef-unavailable');
    return { heading, unavailable, textLength: main.innerText.length, focused: document.activeElement?.id ?? document.activeElement?.tagName, title: document.title };
  });
  const name = r === '/' ? 'home' : r.slice(1).replace(/\//g, '_');
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true });
  const status = errors.length ? 'ERROR' : (r === '/nope' ? 'notfound' : info.unavailable ? 'not-available-yet' : 'content');
  if (errors.length) failed = true;
  results.push({ route: r, status, ...info, errors, consoleErrors: consoleErrors.filter((c) => !/Failed to load resource/.test(c)) });
  await page.close();
}
// offline check: after SW install, reload with network off
let offline = 'skipped';
try {
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'load' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(800);
  await ctx.setOffline(true);
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('body[data-ready="1"]', { timeout: 8000 });
  offline = (await page.locator('h1').first().innerText()).includes('ALEF') ? 'ok: app shell loaded offline' : 'FAIL: unexpected content offline';
  await ctx.setOffline(false);
} catch (e) { offline = 'FAIL: ' + e.message; failed = true; }
await browser.close(); server.close();
writeFileSync(join(outDir, 'results.json'), JSON.stringify({ when: new Date().toISOString(), offline, results }, null, 1));
for (const x of results) console.log(x.status.padEnd(18), x.route.padEnd(24), x.heading, x.errors.length ? '!! ' + x.errors.join('; ') : '');
console.log('offline:', offline);
process.exit(failed ? 1 : 0);
