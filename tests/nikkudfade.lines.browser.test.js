// Whole Lines on the vowel-mark fade page, on the real page in headless Chromium: the unit file is fetched from the vendored
// folder only on the button, the line fades to the stage, the reveal gives back the stored line, and nothing throws.
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

test('browser: Whole Lines loads on the button, fades to stage 3, reveals the stored marks and shows the lesson English', { skip, timeout: 90000 }, async () => {
  await withApp(async (page, base, errors) => {
    const asked = [];
    page.on('request', (r) => { if (/\/nikud\/lessons\.json|lines-en\.json/.test(r.url())) asked.push(r.url()); });
    await page.goto(base + '#/nikkud-fade', { waitUntil: 'load' });
    await page.waitForSelector('.nf-lines button', { timeout: 30000 });
    assert.equal(asked.length, 0, 'nothing is fetched for lines before the button');
    await page.getByRole('button', { name: /^Stage 3/ }).click();
    await page.getByRole('button', { name: 'Read whole lines at your stage' }).evaluate((b) => b.scrollIntoView({ block: 'center' }));
    await page.getByRole('button', { name: 'Read whole lines at your stage' }).click();
    await page.waitForSelector('.nf-line', { timeout: 30000 });
    assert.ok(asked.some((u) => u.includes('/assets/vendor/_alef-tools/') && u.endsWith('/nikud/lessons.json')), 'the unit file came from the vendored folder');
    const bare = (await page.locator('.nf-line').first().textContent()) || '';
    assert.ok(bare.trim().split(/\s+/).length >= 3, bare);
    assert.equal(POINTS.test(bare), false, 'stage 3 line has no vowel marks');
    await page.getByRole('button', { name: /^Show the vowel marks for line 1/ }).click();
    const full = (await page.locator('.nf-line').first().textContent()) || '';
    assert.ok(POINTS.test(full), 'the reveal shows marks');
    assert.equal(full.replace(/[ְ-ׇ]/g, ''), bare.replace(/[ְ-ׇ]/g, ''), 'same letters before and after');
    await page.getByRole('button', { name: /^I read it, line 1/ }).click();
    await page.getByRole('button', { name: 'Next Line' }).waitFor({ timeout: 10000 });
    const lines = (await (await page.request.get(base + 'data/nikkudfade/lines-en.json')).json()).lines;
    if (lines[full]) assert.equal(await page.locator('.nf-meaning').first().textContent(), `Meaning: ${lines[full]}`);
    await page.getByRole('button', { name: 'Next Line' }).click();
    await page.waitForFunction(() => /Line 2 of 5/.test(document.querySelector('.nf-lines')?.textContent || ''), null, { timeout: 10000 });
    assert.deepEqual(errors, []);
  });
});
