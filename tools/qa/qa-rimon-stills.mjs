// Browser check for Rimon's stills (src/shell/rimon-stage.js). Serves the app with a stills folder of your choice in place of
// data/images/rimon, then walks the moments: onboarding slot, Home hello, Brain Lab, an answer, a badge card, page not found,
// a quiet Torah screen, a phone card, reduced motion, and the app with no stills at all. Nothing is written into the repo.
//   python3 -I tools/qa/rimon-placeholders.py assets/img/gen/MASCOT_rimon.800.webp /tmp/rimon-stills   (or use real stills:
//   RIMON_STILLS=data/images/rimon, after the pictures exist)
//   RIMON_STILLS=/tmp/rimon-stills RIMON_SHOTS=/tmp/rimon-shots node tools/qa/qa-rimon-stills.mjs
// Set PLAYWRIGHT_MODULE and BROWSER_EXECUTABLE for an outside browser install (as tools/qa/qa-rimon.mjs does).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const pw = process.env.PLAYWRIGHT_MODULE ? createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE) : await import('playwright');
const { chromium } = pw.chromium ? pw : pw.default;
const REPO = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const STILLS = path.resolve(process.env.RIMON_STILLS || path.join(REPO, 'data/images/rimon'));
const SHOTS = path.resolve(process.env.RIMON_SHOTS || path.join(REPO, '..', 'rimon-stills-shots'));
fs.mkdirSync(SHOTS, { recursive: true });
const { createAppServer } = await import(new URL('../serve.mjs', import.meta.url).href);
const inner = createAppServer({ root: REPO });
const { createServer } = await import('node:http');
const server = createServer((req, res) => {
  const m = req.url.match(/^\/data\/images\/rimon\/(rimon-\d{3}\.webp|present\.json)(\?.*)?$/);
  if (m && process.env.NO_STILLS !== '1') { const f = path.join(STILLS, m[1]); res.writeHead(200, { 'content-type': m[1].endsWith('.json') ? 'application/json' : 'image/webp' }); return res.end(fs.readFileSync(f)); }
  inner.emit('request', req, res);
});
await new Promise((r) => server.listen(8123, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
const out = { errors: [], notFound: [], checks: {} };
const ok = (k, v) => { out.checks[k] = v; console.log((v ? 'PASS ' : 'FAIL ') + k); };
const stillNum = (s) => Number((s || '').match(/rimon-(\d{3})/)?.[1]) || null;
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => out.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') out.errors.push('console: ' + m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) out.notFound.push(r.status() + ' ' + r.url()); });
  const B = 'http://127.0.0.1:8123/';
  const go = async (hash, route) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForFunction((r) => document.body.dataset.route === r && document.body.dataset.ready === '1', route); await page.waitForTimeout(400); };
  const unveil = () => page.evaluate(() => document.getElementById('alef-prayer-veil')?.remove());

  // 1. first visit: onboarding step 1 has Rimon with the step's line, and only one Rimon on screen
  await page.goto(B, { waitUntil: 'networkidle' }); await unveil();
  await page.waitForFunction(() => document.body.dataset.route === 'welcome');
  await page.waitForSelector('.ob-rimon .rimon-hero img', { timeout: 5000 });
  ok('welcome slot shows still 003', stillNum(await page.locator('.ob-rimon img').getAttribute('src')) === 3);
  ok('welcome slot line', /Let's see what you already know/.test(await page.locator('.ob-rimon').innerText()));
  ok('corner Rimon hidden while the large one shows', !(await page.locator('.rimon-companion.rimon-corner').isVisible().catch(() => false)));
  await page.screenshot({ path: SHOTS + '/1-welcome-desktop.png' });

  // 2. Home after onboarding: hello pose on the hero companion with its line
  await page.evaluate(() => window.alef.settings.set({ onboarded: true }));
  await go('#/', 'home'); await unveil();
  await page.waitForFunction(() => { const s = document.querySelector('.rimon-companion .rimon-still'); return s && !s.hidden; }, null, { timeout: 5000 });
  ok('home hello pose is still 001', stillNum(await page.locator('.rimon-companion .rimon-still').getAttribute('src')) === 1);
  ok('bubble carries the hello line', /I'm Rimon/.test(await page.locator('.rimon-bubble').innerText().catch(() => '')));
  await page.locator('.rimon-companion').scrollIntoViewIfNeeded(); await page.screenshot({ path: SHOTS + '/2-home-hello.png' });

  // 3. Brain Lab: corner Rimon dressed for the page, per drill
  await go('#/lab', 'lab');
  await page.waitForFunction(() => /rimon-13[56]/.test(document.querySelector('.rimon-corner .rimon-still')?.getAttribute('src') || ''), null, { timeout: 5000 });
  ok('lab page still', true);
  await page.screenshot({ path: SHOTS + '/3-lab.png' });
  await go('#/lab/gematria', 'labgame');
  await page.waitForFunction(() => /rimon-142/.test(document.querySelector('.rimon-corner .rimon-still')?.getAttribute('src') || ''), null, { timeout: 5000 });
  ok('lab drill still 142', true);

  // 4. answers: a right answer poses for a moment, then the page still comes back
  await go('#/learn', 'learn');
  await page.evaluate(() => { document.dispatchEvent(new CustomEvent('alef:rimon', { detail: { action: 'correct' } })); document.dispatchEvent(new CustomEvent('alef:rimon', { detail: { action: 'bounce' } })); });
  await page.waitForTimeout(300);
  const pose = stillNum(await page.locator('.rimon-corner .rimon-still').getAttribute('src'));
  ok(`right answer pose (first.correct 012) got ${pose}`, pose === 12);
  await page.screenshot({ path: SHOTS + '/4-answer.png' });
  await page.waitForTimeout(3000);
  ok('pose ends (learn has no page still)', await page.locator('.rimon-corner .rimon-still').evaluate((e) => e.hidden));

  // 5. a badge lands: card at the bottom
  await page.evaluate(() => window.alef.store.set('awards.v1', { awards: { 'qa-badge': { at: Date.now() } } }));
  await page.waitForSelector('.rimon-toast', { timeout: 3000 });
  ok('first badge toast', (await page.locator('.rimon-toast').getAttribute('data-rimon-trigger')) === 'first.badge');
  await page.waitForTimeout(450);
  ok('one Rimon: companion steps aside while the card shows', await page.locator('.rimon-companion').evaluate((e) => getComputedStyle(e).visibility === 'hidden' || getComputedStyle(e).display === 'none'));
  ok('one Rimon on Learn: the swapped Continue-card picture replaces the corner one', (await page.evaluate(() => document.body.dataset.rimonInpage)) === '1' && !(await page.locator('.rimon-corner').isVisible()));
  ok('continue card shows still 041 (first lesson)', /rimon-041/.test(await page.locator('.alef-continue-rimon').getAttribute('src')));
  await page.screenshot({ path: SHOTS + '/5-toast-desktop.png' });
  await page.locator('.rimon-toast-x').click();

  // 6. page not found: large Rimon under the heading
  await go('#/no-such-page', 'notfound');
  await page.waitForSelector('#main .rimon-hero img', { timeout: 3000 });
  ok('not found hero', [180, 181].includes(stillNum(await page.locator('#main .rimon-hero img').getAttribute('src'))));
  await page.screenshot({ path: SHOTS + '/6-notfound.png' });

  // 7. quiet route: Torah reader has no Rimon
  await go('#/torahread', 'torahread');
  ok('Torah reader is quiet', (await page.evaluate(() => document.body.dataset.rimonQuiet)) === 'route' && !(await page.locator('.rimon-companion').isVisible()));

  // 8. phone: dressed Rimon in the corner and a toast above the bottom bar
  await page.setViewportSize({ width: 375, height: 812 });
  await go('#/books', 'books');
  await page.waitForFunction(() => /rimon-15[23]/.test(document.querySelector('.rimon-corner .rimon-still')?.getAttribute('src') || ''), null, { timeout: 5000 });
  await page.evaluate(() => window.alef.store.set('books.finished.v1', { 'qa-book': Date.now() }));
  await page.waitForSelector('.rimon-toast', { timeout: 3000 }); await page.waitForTimeout(450);
  const tb = await page.locator('.rimon-toast').boundingBox(), nav = await page.locator('.site-nav').boundingBox();
  ok(`phone toast clears the bottom bar (toast bottom ${Math.round(tb.y + tb.height)}, nav top ${Math.round(nav.y)})`, tb.y + tb.height <= nav.y + 1);
  await page.screenshot({ path: SHOTS + '/8-phone-books.png' });
  await page.locator('.rimon-toast-x').click();

  // 9. reduced motion: still is static
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await go('#/awards', 'awards');
  await page.waitForFunction(() => { const s = document.querySelector('.rimon-corner .rimon-still'); return s && !s.hidden; }, null, { timeout: 5000 });
  ok('reduced motion: no animation on the still', (await page.locator('.rimon-corner .rimon-still').evaluate((e) => getComputedStyle(e).animationName)) === 'none');
  await page.screenshot({ path: SHOTS + '/9-phone-awards.png' });
  await ctx.close();

  // 10. no stills at all: nothing requested, nothing changes
  process.env.NO_STILLS = '1';
  const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
  const p2 = await ctx2.newPage(); const req = [];
  p2.on('request', (r) => { if (/rimon-\d{3}\.webp/.test(r.url())) req.push(r.url()); });
  await p2.goto(B + '#/lab', { waitUntil: 'networkidle' }); await p2.waitForTimeout(800);
  ok('without stills no still is requested', req.length === 0);
  ok('without stills the corner Rimon is the animated one', !(await p2.locator('.rimon-companion').evaluate((e) => e.classList.contains('rimon-has-still')).catch(() => false)));
  await ctx2.close();
} catch (e) { console.log('ERROR', e.message); out.fatal = e.message; }
finally { await browser.close(); server.close(); }
const real404 = out.notFound.filter((u) => !/favicon/.test(u));
console.log(JSON.stringify({ errors: out.errors, notFound: real404, shots: SHOTS }, null, 1));
process.exit(Object.values(out.checks).every(Boolean) && !out.errors.length && !real404.length && !out.fatal ? 0 : 1);
