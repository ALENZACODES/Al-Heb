// The memory card when its files fail to load: data/letters/memory-chain.json or assets/letters/morph/<id>.svg (404 or network failure).
// Expected: no uncaught page error, no app-level console error, the letter view still renders, and with no picture file the card keeps the
// letter and shows the picture idea as words once pressed. (The browser itself logs "Failed to load resource" for a failed request; that line is ignored.)
// Headless Chromium via Playwright; skipped when Playwright is missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../tools/serve.mjs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }

async function open(browser, base, block, route) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { try { localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); } catch (e) { /* ignore */ } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  for (const [re, how] of block) await page.route(re, (r) => (how === 'abort' ? r.abort() : r.fulfill({ status: 404, body: 'not found' })));
  await page.goto(base); await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 });
  await page.evaluate((h) => { location.hash = h; }, route);
  await page.waitForSelector('#main h1, #main h2', { timeout: 15000 });
  await page.waitForTimeout(1200);
  return { ctx, page, errors };
}

test('memory card fallbacks (browser)', { skip: !chromium && 'playwright not installed', timeout: 120000 }, async (t) => {
  const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  try {
    for (const how of ['404', 'abort']) {
      await t.test(`picture file ${how}: letter stays, pressing shows the idea as words, no errors`, async () => {
        const { ctx, page, errors } = await open(browser, base, [[/\/letters\/morph\/[^/]+\.svg/, how]], '/letters/bet');
        const art = page.locator('.mc [data-act="mc-art"]');
        assert.equal(await art.count(), 1, 'card is present');
        assert.match(await art.innerText(), /ב/, 'the letter itself stays visible');
        assert.equal(await art.locator('svg').count(), 0, 'no picture svg');
        await art.click();
        const txt = await page.locator('.mc').innerText();
        assert.match(txt, /Picture: \S/, 'the picture idea is shown as words: ' + txt);
        assert.deepEqual(errors, []);
        await ctx.close();
      });
      await t.test(`memory-chain.json ${how}: no card, the letter view and first-day view still render, no errors`, async () => {
        for (const route of ['/letters/bet', '/firstday']) {
          const { ctx, page, errors } = await open(browser, base, [[/memory-chain\.json/, how]], route);
          assert.equal(await page.locator('.mc').count(), 0, route + ': no card without data');
          assert.equal(await page.locator('[data-memory-fallback]').innerText(), 'The picture and word hint did not load. Check your connection, then open the letter again.', route + ': one-line fallback');
          assert.ok((await page.locator('#main').innerText()).length > 80, route + ': page content is there');
          assert.doesNotMatch(await page.locator('#main').innerText(), /failed to start|could not be loaded/i, route);
          assert.deepEqual(errors, [], route);
          await ctx.close();
        }
      });
    }
  } finally { await browser.close(); server.close(); }
});
