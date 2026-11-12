// Lane 4 (12 Nov; points plan #18): offline smoke test in headless Chromium. The app is installed (service worker +
// precache), the learner saves the Core lessons and Core prayers packs from Use Aleph offline, the network is switched
// off, and then a core lesson and a prayer page are opened for the first time: both must render from the cache.
// Limits: headless Chromium on Linux over http://localhost; not a phone, not airplane mode on a device.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAppServer } from '../tools/serve.mjs';

const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }

test('offline: after saving the Core lessons and Core prayers packs, a core lesson and a prayer page render with the network off', { skip: !chromium && 'Playwright is not installed', timeout: 180000 }, async () => {
  const server = createAppServer(); await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const profile = mkdtempSync(join(tmpdir(), 'alef-offline-smoke-'));
  const ctx = await chromium.launchPersistentContext(profile, { viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
  try {
    await ctx.addInitScript(() => { if (sessionStorage.getItem('qa-offline') === '1') Object.defineProperty(navigator, 'onLine', { configurable: true, value: false }); });
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '#/welcome'); await page.waitForSelector('body[data-ready="1"]');
    await page.evaluate(() => { localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true, veilOptOut: true })); return navigator.serviceWorker.ready; });
    await page.reload(); await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 30000 });

    // save the two packs from the Offline page, the way a learner would
    await page.goto(base + '#/offline'); await page.waitForSelector('[data-pack="core-lessons"]', { timeout: 30000 });
    const sizeText = await page.locator('[data-pack="core-prayers"] [data-size]').textContent();
    assert.match(sizeText, /\d+ files, [\d.]+ (KB|MB) in all\./);
    assert.equal(await page.locator('[data-pack-go="core-prayers"]').count(), 1, 'Follow the Service is not installed up front, so the prayers pack has files to save');
    for (const id of ['core-lessons', 'core-prayers']) {
      const btn = page.locator(`[data-pack-go="${id}"]`);
      if (await btn.count()) { await btn.click(); await page.waitForSelector(`[data-pack="${id}"] >> text=Ready offline.`, { timeout: 60000 }); }
    }

    await page.evaluate(() => sessionStorage.setItem('qa-offline', '1'));
    await ctx.setOffline(true);
    // audio lists and clips are not in the packs (the card says so; the app shows "audio info unavailable offline")
    const failed = []; page.on('requestfailed', (rq) => { const u = rq.url().replace(base, ''); if (/\.(js|json|css|html)(\?|$)/.test(u) && !u.startsWith('data/audio/')) failed.push(u); });
    const check = async (hash, expect, needHebrew = true) => {
      await page.goto(base + hash); await page.reload({ waitUntil: 'load' });
      await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 }); await page.waitForTimeout(1500);
      const s = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent?.trim() || '', text: document.getElementById('main')?.innerText || '', unavailable: !!document.querySelector('.alef-unavailable'), he: document.querySelectorAll('#main [lang="he"]').length }));
      assert.ok(!s.unavailable, `${hash}: shows the not-available card: ${s.text.slice(0, 300)} failed=${failed.join(',')}`);
      assert.ok(s.text.length > 200, `${hash}: page text ${s.text.length} chars`);
      if (needHebrew) assert.ok(s.he > 0, `${hash}: Hebrew text is shown`);
      assert.match(s.h1 + '\n' + s.text, expect, `${hash}: h1 "${s.h1}"`);
      return s;
    };
    await check('#/learn?lesson=r01', /Shin and Bet/);
    await check('#/read/shema-1', /Shema/);
    await check('#/service', /Service/i, false); // Follow the Service (on-demand code, saved by the Core prayers pack): its order of service is English until a prayer is opened
    assert.deepEqual(failed, [], 'no code or data request failed while offline');
    assert.deepEqual(errors, [], 'no page errors');
  } finally {
    await ctx.close(); server.close(); rmSync(profile, { recursive: true, force: true });
  }
});
