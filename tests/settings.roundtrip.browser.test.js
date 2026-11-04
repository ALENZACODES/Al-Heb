// Real-browser round trip through the Settings screen: seed progress -> Back up (download) -> Delete all my data (typed) -> Restore (preview, confirm).
// Skipped when Playwright or its Chromium is missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createAppServer } from '../tools/serve.mjs';

const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright', `${process.env.HOME || ''}/.npm-global/lib/node_modules/playwright`]) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
let browser = null;
if (chromium) { try { browser = await chromium.launch(); } catch { browser = null; } }

test('Settings: back up -> delete all (typed confirmation) -> restore brings every key back', { skip: !browser && 'Playwright/Chromium not available', timeout: 120000 }, async () => {
  const server = createAppServer(); await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const ctx = await browser.newContext({ acceptDownloads: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  try {
    await page.goto(base + '#/settings'); await page.waitForSelector('#s-wipe-go', { timeout: 30000 });
    const seeded = { 'srs.cards': { 'c:alef': { due: 5, reps: 2 } }, 'curriculum.progress': { completed: { r01: 1 } }, 'streak': { v: 2, days: ['2026-11-01'] }, 'unlisted.future.key': { ok: true } };
    await page.evaluate((d) => { for (const [k, v] of Object.entries(d)) window.alef.store.set(k, v); }, seeded);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /back up|download/i }).first().click()]);
    const path = await dl.path(); const text = readFileSync(path, 'utf8'); const file = JSON.parse(text);
    for (const k of Object.keys(seeded)) assert.ok(k in file.data, 'backup has ' + k);
    // delete all: button disabled until the word is typed
    assert.equal(await page.locator('#s-wipe-go').isDisabled(), true);
    await page.fill('#s-wipe-word', 'DELET'); assert.equal(await page.locator('#s-wipe-go').isDisabled(), true);
    await page.fill('#s-wipe-word', 'DELETE'); await page.locator('#s-wipe-go').click();
    await page.waitForFunction(() => window.alef.store.keys().length === 0);
    assert.equal(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('alef:') && k !== 'alef:__meta').length), 0);
    // restore: choose file -> preview -> confirm
    await page.setInputFiles('#s-import', { name: 'b.json', mimeType: 'application/json', buffer: Buffer.from(text) });
    await page.getByText(/Nothing has changed yet/).waitFor();
    assert.match(await page.locator('[aria-label="Restore confirmation"]').innerText(), /will be added/);
    await page.getByRole('button', { name: /Replace my progress/ }).click();
    const back = await page.evaluate((ks) => Object.fromEntries(ks.map((k) => [k, window.alef.store.get(k)])), Object.keys(seeded));
    assert.deepEqual(back, seeded);
    // a corrupt file is refused with a message and changes nothing
    await page.setInputFiles('#s-import', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(text.slice(0, 80)) });
    await page.getByText(/Could not restore/).waitFor();
    assert.deepEqual(await page.evaluate((ks) => Object.fromEntries(ks.map((k) => [k, window.alef.store.get(k)])), Object.keys(seeded)), seeded);
  } finally { await ctx.close(); await browser.close(); server.close(); }
});
