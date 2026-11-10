// Screenshot + overflow check for the Service screen at 390px (not a unit test). Needs Playwright.
// Usage: node tests/service.shot.mjs <siteRoot> <outDir>   (siteRoot must have the #/service route, see docs/service/README.md)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createAppServer } from '../tools/serve.mjs';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/usr/lib/node_modules/playwright')); }
const root = resolve(process.argv[2] ?? '.'), out = resolve(process.argv[3] ?? '/tmp/service-shots'); mkdirSync(out, { recursive: true });
const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true, goal: 'read' })); });
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
const check = async (name) => {
  const o = await p.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, w: document.documentElement.scrollWidth }));
  await p.screenshot({ path: join(out, name + '.png'), fullPage: true });
  console.log(name, 'overflow:', o.over, o.w, 'errors:', errs.length ? errs : 'none');
};
await p.goto(base + '#/service'); await p.waitForSelector('.sv section.card, .alef-unavailable', { timeout: 15000 });
await check('service-coverage');
await p.click('[data-follow="shabbat-morning"]'); await p.waitForSelector('#sv-card');
await check('service-follow-1');
for (let i = 0; i < 6; i++) await p.keyboard.press('Tab');
await p.focus('#sv-card'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight');
console.log('card after arrows:', await p.textContent('#sv-card-h'));
await check('service-follow-amidah');
await p.click('#sv-tradition').catch(() => {}); await p.selectOption('#sv-tradition', 'ashkenazi'); await p.click('#sv-toggle-tr');
await check('service-follow-ashk-notr');
await browser.close(); server.close();
process.exit(errs.length ? 1 : 0);
