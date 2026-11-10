// On-ramp audit shots: persona A (total beginner) on day 1, headless Chromium at phone size. SCRIPTED, not a real learner.
// It onboards, opens Home, walks #/firstday one screen at a time (pressing the first answer when a check is shown, then Next),
// then opens the first lesson page. For every screen it records the page height, the visible text length and the number of
// taps the script needed, and saves a JPEG without any metadata (Playwright writes plain JPEG/PNG, no EXIF; checked by
// tests/onramp.test.js). Usage: node docs/onramp/shots.mjs --out docs/onramp/after [--label after]
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../../tools/serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
if (!chromium) { console.error('playwright not found'); process.exit(2); }
const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const outDir = resolve(root, arg('--out', 'docs/onramp/after'));
mkdirSync(outDir, { recursive: true });

const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.QA_CHROME || undefined });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: 'en-CA', timezoneId: 'America/Toronto', serviceWorkers: 'block' });
const page = await ctx.newPage(); page.setDefaultTimeout(4000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ready = () => page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 15000 }).catch(() => {});
const go = async (frag) => { await page.evaluate((f) => { location.hash = f; }, frag); await sleep(400); await ready(); };
const screens = [];
const t0 = Date.now();
async function snap(slug, taps) {
  const m = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, chars: (document.querySelector('#main')?.innerText || '').replace(/\s+/g, ' ').trim().length,
    h1: document.querySelector('#view-title')?.innerText?.trim() || '', h2: document.querySelector('#main h2')?.innerText?.trim() || '', hash: location.hash }));
  const file = `${slug}.jpg`;
  await page.screenshot({ path: join(outDir, file), type: 'jpeg', quality: 45, fullPage: true, timeout: 15000 });
  screens.push({ slug, file, taps, seconds: Math.round((Date.now() - t0) / 100) / 10, ...m });
  console.error(`${slug}: ${m.hash} height ${m.height}px, ${m.chars} chars, taps ${taps}`);
}

// onboarding as persona A
await page.goto(base, { waitUntil: 'domcontentloaded' }); await ready();
await page.waitForSelector('#ob-form-letters');
await page.check('#ob-letters-none'); await page.click('#ob-letters-continue');
await page.waitForSelector('#ob-form-congregation'); await page.check('#ob-denomination-orthodox').catch(() => {}); await page.check('#ob-pron-ashkenazi').catch(() => {}); await page.click('#ob-congregation-continue');
await page.waitForSelector('#ob-form-minutes'); await sleep(600); await page.check('#ob-minutes-10').catch(() => {}); await page.click('#ob-minutes-continue');
await page.waitForSelector('.ob-plan');
await go('#/'); await page.waitForSelector('#home-today[data-state]');
await snap('01-home-today', 0);
const primary = await page.evaluate(() => ({ label: document.querySelector('#today-continue')?.innerText.trim(), href: document.querySelector('#today-continue')?.getAttribute('href') }));

// the first-day screens, one at a time
await go(primary.href || '#/firstday'); await page.waitForSelector('.fd-body');
let taps = 0;
for (let i = 1; i <= 20; i++) {
  await sleep(250);
  await snap(`${String(i + 1).padStart(2, '0')}-firstday-step${i}`, taps);
  const hear = page.locator('.fd-body button:has-text("Hear it")').first();
  if (await hear.count()) { await hear.click(); taps++; await sleep(200); }
  const read = page.locator('.fd-body button:has-text("Check my reading")').first();
  if (await read.count()) { await read.click(); taps++; await sleep(150); }
  // a check: press the first answer; the app shows the right one and offers Next either way
  for (let g = 0; g < 3; g++) { // up to 2 questions per step; the first answer is pressed each time
    const opt = page.locator('.fd-body .fd-check button:not([disabled])').first();
    if (!(await opt.count())) break;
    await opt.click(); taps++;
    await page.waitForFunction(() => document.querySelector('#fd-next') || document.querySelector('.fd-check button:not([disabled])'), null, { timeout: 4000 }).catch(() => {});
    await sleep(150);
    if (g === 0) await snap(`${String(i + 1).padStart(2, '0')}-firstday-step${i}-answered`, taps);
  }
  const he = page.locator('.fd-body button[lang=he]').first();
  if (await he.count()) { await he.click(); taps++; await sleep(200); }
  const next = page.locator('.fd-body button:has-text("Next"), .fd-body button:has-text("Finish")').first();
  if (!(await next.count())) break;
  await next.click(); taps++;
}
await go('#/'); await page.waitForSelector('#home-today[data-state]'); await snap('90-home-after-firstday', taps);
const after = await page.evaluate(() => ({ label: document.querySelector('#today-continue')?.innerText.trim(), href: document.querySelector('#today-continue')?.getAttribute('href'), streak: document.querySelector('#today-streak')?.innerText.trim() }));
await go('#/learn?lesson=r01'); await page.waitForSelector('.alef-actions'); await snap('91-lesson-r01', taps);
const quick = await page.evaluate(() => document.querySelector('.alef-lesson-page .muted:has(+ .alef-actions), .alef-lesson-page p.muted')?.innerText || '');
const r01 = await page.evaluate(() => [...document.querySelectorAll('.alef-lesson-page p.muted')].map((p) => p.innerText).find((t) => /Quick check/.test(t)) || '');
writeFileSync(join(outDir, 'shots.json'), JSON.stringify({ generatedBy: 'docs/onramp/shots.mjs', note: 'Scripted emulation at 390x844, not a real learner. seconds = script wall clock since the first screenshot, not learner time.', todayBefore: primary, todayAfter: after, r01QuickCheckLine: r01 || quick, screens }, null, 1));
console.error(JSON.stringify({ todayBefore: primary, todayAfter: after }));
await browser.close(); server.close();
