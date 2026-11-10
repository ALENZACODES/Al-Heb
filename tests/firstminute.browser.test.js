// Real-browser check of the first minute (headless Chromium, phone size): setup one question per screen, keyboard only, no page jump
// when an answer is picked, the header chips after setup, the path stops, and an axe scan of each setup screen and of Learn.
// It does not test a screen reader, a real phone or a person. Skipped when Playwright is missing (ALEF_REQUIRE_BROWSER=1 fails instead).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { createAppServer } from '../tools/serve.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
let chromium;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = createRequire(import.meta.url)(p)); break; } catch { /* next */ } }
const must = process.env.ALEF_REQUIRE_BROWSER === '1';
const skip = !chromium && !must ? 'needs Playwright' : false;
const axePath = `${root}/tools/a11y/node_modules/axe-core/axe.min.js`;

async function withPage(fn, { reduced = 'no-preference' } = {}) {
  const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: reduced, serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + 'offline.html');
    await page.evaluate(() => { localStorage.clear(); });
    await page.goto(base + '#/welcome'); await page.waitForSelector('#ob-form-letters');
    const veil = page.locator('#alef-prayer-skip'); if (await veil.isVisible().catch(() => false)) await veil.click();
    await fn({ page, base, errors });
  } finally { await browser.close(); server.close(); }
}
async function axe(page, label) {
  if (!existsSync(axePath)) return [];
  await page.addScriptTag({ content: readFileSync(axePath, 'utf8') });
  const r = await page.evaluate(async () => (await globalThis.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })).violations.map((v) => `${v.id}: ${v.nodes.length}`));
  return r.map((x) => `${label} ${x}`);
}

test('first minute in a browser: one question per screen by keyboard, no jump on pick, chips and path after setup, no axe A/AA findings', { skip, timeout: 180000 }, async () => {
  await withPage(async ({ page, base, errors }) => {
    const found = [];
    assert.equal(await page.evaluate(() => document.body.classList.contains('ob-player')), true, 'tabs and header hidden during setup');
    found.push(...await axe(page, 'level'));
    await page.focus('#ob-letters-none'); await page.keyboard.press('Space');
    assert.equal(await page.evaluate(() => scrollY), 0, 'picking an answer does not move the page');
    await page.keyboard.press('Enter');
    assert.equal(await page.getAttribute('#ob-form-letters', 'data-page'), 'goal');
    found.push(...await axe(page, 'goal'));
    await page.keyboard.press('Enter');
    assert.equal(await page.getAttribute('#ob-form-letters', 'data-page'), 'daily');
    found.push(...await axe(page, 'daily'));
    await page.keyboard.press('Enter');
    await page.waitForSelector('#ob-form-congregation');
    found.push(...await axe(page, 'pronunciation'));
    await page.click('#ob-congregation-continue');
    await page.waitForSelector('#ob-start');
    found.push(...await axe(page, 'plan'));
    await page.goto(base + '#/learn'); await page.waitForSelector('.alef-lesson-list');
    await page.waitForSelector('.statbar:not([hidden])');
    assert.equal(await page.evaluate(() => document.body.classList.contains('ob-player')), false, 'chrome back after setup');
    assert.match(await page.textContent('#stat-goal'), /0\/10/, 'header goal is the daily goal chosen in setup');
    assert.ok(await page.$('.alef-lesson-available'), 'the next stop is marked');
    found.push(...await axe(page, 'learn'));
    assert.deepEqual(found, [], 'axe A/AA findings');
    assert.deepEqual(errors, [], 'no page errors');
  });
});
