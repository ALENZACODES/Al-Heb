// Browser check of the section tabs, the More menu and /search at 320 and 390 px. Skipped when Playwright is not installed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../tools/serve.mjs';
const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('nav at 320 and 390 px: <=5 controls (v0 only), current marked, More menu by section + collapsed Preview, no preview banner, no overflow, keyboard, /search', { skip: !chromium, timeout: 180000 }, async () => {
  const server = createAppServer({ root, prefix: '/' }); await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  try {
    for (const width of [320, 390]) {
      const ctx = await browser.newContext({ viewport: { width, height: 700 }, serviceWorkers: 'block' });
      await ctx.addInitScript(() => localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })));
      const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
      await page.goto(base + '#/letters'); await page.waitForSelector('body[data-ready="1"]');
      const controls = await page.locator('.site-nav > ul#nav a, #more-btn:visible').count();
      assert.ok(controls <= 5 && controls >= 3, `controls ${controls} at ${width}`);
      assert.deepEqual(await page.locator('#nav a').evaluateAll((as) => as.map((a) => a.getAttribute('href'))), ['#/learn', '#/progress'], 'bottom bar shows only v0 destinations');
      assert.equal(await page.locator('#nav a[aria-current]').getAttribute('data-section'), 'learn');
      assert.equal(await page.locator('#nav a[aria-current]').getAttribute('aria-current'), 'true', 'a page inside the section marks the tab as the current section');
      assert.equal(await page.locator('#nav a[aria-current]').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `horizontal overflow at ${width}`);
      const navBox = await page.locator('.site-nav').boundingBox(); assert.ok(navBox.x >= 0 && navBox.x + navBox.width <= width + 0.5);
      await page.locator('#more-btn').click();
      assert.equal(await page.locator('#more-btn').getAttribute('aria-expanded'), 'true');
      const groups = await page.locator('#nav-more > li.nav-group').count(); assert.equal(groups, 4, 'Learn, Progress, More and the Preview group');
      assert.equal(await page.locator('#nav-more > li.nav-group:last-child').getAttribute('data-section'), 'preview');
      assert.equal(await page.locator('#nav-more li[data-section="preview"] > details[open]').count(), 0, 'Preview group starts collapsed');
      assert.equal(await page.locator('#nav-more li[data-section="preview"] a[href="#/read"]').isVisible(), false, 'collapsed preview links are hidden');
      assert.equal(await page.locator('#nav-more li[data-section="preview"] a[href="#/calendar"]').count(), 0, 'v0 pages are not in the Preview group');
      assert.equal(await page.locator('#nav-more > li:not([data-section="preview"]) a[href="#/calendar"]').count(), 1, 'calendar sits in an open group');
      await page.locator('#nav-more li[data-section="preview"] summary').click();
      assert.ok(await page.locator('#nav-more li[data-section="preview"] a[href="#/read"]').isVisible(), 'expanded Preview group lists read');
      await page.locator('#nav-more li[data-section="preview"] summary').click();
      await page.locator('#nav-more li[data-section="more"] summary').click();
      assert.ok(await page.locator('#nav-more a[href="#/search"]').isVisible());
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#more-btn').getAttribute('aria-expanded'), 'false');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'more-btn');
      await page.goto(base + '#/search?q=bet'); await page.waitForSelector('#search-q');
      await page.waitForSelector('#search-results a[href="#/letters/bet"]');
      await page.fill('#search-q', 'שלום'); await page.waitForFunction(() => document.querySelector('#search-status')?.textContent.includes('results'));
      await page.fill('#search-q', 'privacy'); await page.waitForSelector('#search-results a[href="#/privacy"]');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `search overflow at ${width}`);
      await page.goto(base + '#/settings'); await page.waitForSelector('body[data-route="settings"]');
      assert.equal(await page.locator('#more-btn[data-current]').count(), 1);
      assert.equal(await page.locator('main .preview-banner').count(), 0, 'no banner on a v0 route');
      await page.goto(base + '#/read'); await page.waitForSelector('body[data-route="read"]');
      assert.equal(await page.locator('main .preview-banner').count(), 0, 'no preview banner: every page is shown as a finished part of Aleph (2026-11-08)');
      assert.equal(await page.locator('#more-btn[data-current]').count(), 1, 'a preview page marks More as current');
      assert.equal(await page.locator('#nav a[aria-current]').count(), 0);
      await page.goto(base + '#/learn'); await page.waitForSelector('body[data-route="learn"]');
      assert.equal(await page.locator('main .preview-banner').count(), 0, 'banner is cleared when moving to a v0 route');
      assert.equal(await page.locator('#nav a[aria-current="page"]').getAttribute('href'), '#/learn');
      assert.deepEqual(errs, []);
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
});
