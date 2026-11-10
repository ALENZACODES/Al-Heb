// Brain Lab on the real page in headless Chromium: every game starts, plays to its results card by tapping
// answers, and shows stars and the "Hebrew You Met" list, with no page error. Run with No time limits on (ten rounds, no clock),
// so each game ends after ten answers. Taps are random: this checks that nothing breaks, not how well anyone plays.
// Skipped when Playwright is not installed (browser tier: node tools/test/run.mjs browser).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../tools/serve.mjs';
import { GAMES } from '../src/lab/lab.core.js';

const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skip = !chromium;

async function withLab(settings, fn) {
  const server = createAppServer({ root, prefix: '/' });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.addInitScript((s) => { localStorage.setItem('alef:settings', JSON.stringify(s)); }, { onboarded: true, veilOptOut: true, ...settings });
    await fn(ctx, base);
  } finally { await browser.close(); server.close(); }
}

async function playToResults(page, maxMs) {
  const until = Date.now() + maxMs;
  while (Date.now() < until) {
    if (await page.$('.lab-results')) return true;
    const btns = await page.$$('.lab-board button:not([disabled])');
    if (btns.length) { try { await btns[Math.floor(Math.random() * btns.length)].click({ timeout: 400 }); } catch { /* the round moved on */ } }
    await page.waitForTimeout(250);
  }
  return !!(await page.$('.lab-results'));
}

test('browser: the Brain Lab page lists every game in its pack, with a token or cover for each and New on the added games', { skip, timeout: 60000 }, async () => {
  await withLab({}, async (ctx, base) => {
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(base + '#/lab', { waitUntil: 'load' });
    await page.waitForSelector('.lab-games .lab-game', { timeout: 30000 });
    assert.equal(await page.locator('.lab-game').count(), GAMES.length);
    assert.equal(await page.locator('.lab-game .lab-token').count(), GAMES.filter((g) => g.pack !== 'studio').length, 'a round token beside every classic and synagogue-and-Israel game');
    assert.equal(await page.locator('.lab-game.is-studio').count(), GAMES.filter((g) => g.pack === 'studio').length);
    assert.equal(await page.locator('.lab-game .lab-new').count(), GAMES.filter((g) => g.added).length);
    assert.equal(await page.locator('h3.lab-group').count(), 5, 'the classic drills are grouped by skill');
    assert.deepEqual(await page.locator('h2.lab-pack-h').evaluateAll((hs) => hs.map((h) => [...h.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim())), ['Hebrew for Synagogue and Israel', '3D Studio', 'Quick Drills']);
    assert.doesNotMatch(await page.locator('#main').innerText(), /\u0063laude|grok|\u0063hatgpt|lumosity/i, 'no tool or brand names on the page');
    assert.deepEqual(errors, []);
  });
});

test('browser: every game (all packs) plays to its results card with No time limits on: stars, score and the Hebrew you met, no page error', { skip, timeout: 900000 }, async () => {
  await withLab({ untimed: true }, async (ctx, base) => {
    for (const g of GAMES) {
      const page = await ctx.newPage(); const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
      await page.goto(base + `#/lab/${g.id}`, { waitUntil: 'load' });
      await page.waitForSelector('.lab-intro .lab-go', { timeout: 30000 });
      assert.match(await page.locator('.lab-intro').innerText(), /Ten rounds, no clock/, `${g.id}: No time limits is honoured`);
      await page.click('.lab-intro .lab-go');
      assert.ok(await playToResults(page, 90000), `${g.id} reached its results card`);
      assert.match(await page.locator('.lab-stars').getAttribute('aria-label'), /^[0-3] of 3 stars$/);
      assert.match(await page.locator('.lab-results .score').innerText(), /^\d+$/);
      assert.ok(await page.locator('.lab-met li').count() >= 1, `${g.id}: the Hebrew You Met list is filled`);
      assert.deepEqual(errors, [], g.id);
      await page.close();
    }
  });
});
