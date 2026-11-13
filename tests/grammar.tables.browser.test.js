// Tables And Drills on the real Grammar notes page in headless Chromium: the tables load on the press, the Numbers tab shows the
// larger numbers and dates, lesson sentences appear under a table, and a practice set can be answered to its score.
// Skipped when Playwright is not installed (browser tier: node tools/test/run.mjs browser).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../tools/serve.mjs';

const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { chromium = require(p).chromium; break; } catch { /* next */ } }
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skip = !chromium;
const POINTS = /[ְ-ׇּׁׂ]/;

async function withApp(fn) {
  const server = createAppServer({ root, prefix: '/' });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.addInitScript((s) => { localStorage.setItem('alef:settings', JSON.stringify(s)); }, { onboarded: true, veilOptOut: true });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await fn(page, base, errors);
  } finally { await browser.close(); server.close(); }
}

test('browser: tables load on the press; Numbers has teens, dates and lesson sentences; a practice set runs to its score', { skip, timeout: 120000 }, async () => {
  await withApp(async (page, base, errors) => {
    const asked = [];
    page.on('request', (r) => { if (/data\/grammar\/(tables|examples)\.json/.test(r.url())) asked.push(r.url()); });
    await page.goto(base + '#/grammar', { waitUntil: 'load' });
    const open = page.getByRole('button', { name: 'Tables And Drills' });
    await open.waitFor({ timeout: 30000 });
    assert.equal(asked.length, 0, 'no table data before the press');
    await open.evaluate((b) => b.scrollIntoView({ block: 'center' })); await open.click();
    await page.waitForSelector('.gr-lab table', { timeout: 30000 });
    assert.equal(asked.length, 2);
    assert.ok(await page.locator('.gr-lab .gr-seen li').count() >= 1, 'lesson sentences under the pronoun tables');
    const tab = page.locator('[data-tab=numbers]');
    await tab.evaluate((b) => b.scrollIntoView({ block: 'center' })); await tab.click();
    await page.waitForSelector('[data-table=numbers-9]', { timeout: 10000 });
    const captions = await page.locator('.gr-lab caption').allTextContents();
    for (const t of ['Eleven To Nineteen', 'Twenty-One To Ninety-Nine', 'Days Of The Week', 'Months', 'Dates']) assert.ok(captions.some((c) => c.includes(t)), t);
    assert.equal(await page.locator('[data-table=numbers-4] tbody tr').count(), 9);
    assert.equal(await page.locator('[data-table=numbers-8] tbody tr').count(), 12);
    const cell = (await page.locator('[data-table=numbers-9] tbody tr').first().locator('td').nth(1).textContent()) || '';
    assert.ok(POINTS.test(cell) && cell.trim().split(/\s+/).length >= 2, `a date is a number and a month: ${cell}`);
    const practice = page.getByRole('button', { name: 'Practice: Numbers' });
    await practice.evaluate((b) => b.scrollIntoView({ block: 'center' })); await practice.click();
    for (let i = 0; i < 8; i++) {
      await page.waitForFunction((n) => new RegExp(`Question ${n} of`).test(document.querySelector('.gr-tables')?.textContent || ''), i + 1, { timeout: 10000 });
      const first = page.locator('.gr-options button').first();
      await first.evaluate((b) => b.scrollIntoView({ block: 'center' })); await first.click();
      assert.equal(await page.locator('.gr-options button[data-right="1"]').count(), 1, 'the right answer is marked');
      const next = page.getByRole('button', { name: /^(Next|See Your Score)$/ });
      await next.evaluate((b) => b.scrollIntoView({ block: 'center' })); await next.click();
    }
    await page.waitForFunction(() => /You Got \d Of 8/.test(document.querySelector('.gr-tables')?.textContent || ''), null, { timeout: 10000 });
    assert.deepEqual(errors, []);
  });
});
