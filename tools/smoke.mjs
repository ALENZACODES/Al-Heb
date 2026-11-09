// Playwright smoke test (Playwright is preinstalled globally here; no package.json dependency).
// Usage: node tools/smoke.mjs [--dist [--base /alef/]]   -> screenshots in docs/screens/, JSON result in docs/screens/results.json
// Exit code 1 on uncaught page errors, failed route mounts, or missing main content.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from './serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { try { ({ chromium } = require('/usr/lib/node_modules/playwright')); } catch (e) { console.error('playwright not found:', e.message); process.exit(2); } }

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const outDir = join(root, 'docs', 'screens'); mkdirSync(outDir, { recursive: true });
// Routes in SEEDED_ROUTES are also shot again with 14 read-track lessons marked complete (so Spot It, loanwords and the checkpoint have content).
const SEEDED_ROUTES = ['/loanwords/lw1', '/spotit/bet', '/checkpoint', '/dialogues'];
const ROUTES = ['/', '/welcome', '/learn', '/learn?lesson=r01', '/learn?review=1', '/letters', '/letters/alef', '/sounds', '/read', '/read/bless-priestly-1', '/scan', '/calendar', '/workbook', '/letters/atlas', '/soundgap', '/vocab', '/loanwords', '/loanwords/lw1', '/spotit/bet', '/checkpoint', '/dialogues', '/dialogues/d-cafe', '/settings', '/how', '/about', '/nope'];
const args = process.argv.slice(2);
const useDist = args.includes('--dist');
const prefix = useDist && args.includes('--base') ? args[args.indexOf('--base') + 1] : '/';

const server = createAppServer({ root: useDist ? join(root, 'dist') : root, prefix }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}${prefix}`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, serviceWorkers: 'allow' });
// skip first-run setup for the route sweep (the first-run redirect is checked separately below)
await ctx.addInitScript(() => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); });
const results = []; let failed = false;
for (const r of ROUTES) {
  const page = await ctx.newPage();
  const errors = [], consoleErrors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.goto(base + '#' + r, { waitUntil: 'load' });
  try { await page.waitForSelector('body[data-ready="1"]', { timeout: 20000 }); } catch { errors.push('view never became ready'); } // 20 s: /vocab loads a 6.7 MB word list, slow on CI runners
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => {
    const main = document.getElementById('main');
    const heading = main.querySelector('h1')?.textContent?.trim() ?? '';
    const unavailable = !!main.querySelector('.alef-unavailable');
    return { heading, unavailable, textLength: main.innerText.length, focused: document.activeElement?.id ?? document.activeElement?.tagName, title: document.title };
  });
  const name = r === '/' ? 'home' : r.slice(1).replace(/[\/?=&]+/g, '_');
  await page.screenshot({ path: join(outDir, `${name}.png`), fullPage: true });
  const status = errors.length ? 'ERROR' : (r === '/nope' ? 'notfound' : info.unavailable ? 'not-available-yet' : 'content');
  if (errors.length) failed = true;
  results.push({ route: r, status, ...info, errors, consoleErrors: consoleErrors.filter((c) => !/Failed to load resource/.test(c)) });
  await page.close();
}
// seeded sweep: completed lessons unlock the loanword groups and the look-alike checkpoint; also taps through Spot It
{
  const seeded = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const ids = Array.from({ length: 24 }, (_, i) => 'r' + String(i + 1).padStart(2, '0'));
  await seeded.addInitScript((ids) => { if (!localStorage.getItem('alef:settings')) { localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); localStorage.setItem('alef:curriculum.progress', JSON.stringify({ completed: Object.fromEntries(ids.map((i) => [i, Date.now()])) })); } }, ids);
  for (const r of SEEDED_ROUTES) {
    const page = await seeded.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base + '#' + r, { waitUntil: 'load' });
    try { await page.waitForSelector('body[data-ready="1"]', { timeout: 20000 }); } catch { errors.push('view never became ready'); } // 20 s: /vocab loads a 6.7 MB word list, slow on CI runners
    await page.waitForTimeout(500);
    const name = 'seeded_' + r.slice(1).replace(/[\/?=&]+/g, '_');
    if (r.startsWith('/spotit')) {
      // tap the first two cells, then Check
      const cells = page.locator('.alef-spot-cell'); const n = await cells.count();
      for (let i = 0; i < Math.min(n, 3); i++) await cells.nth(i).click();
      await page.screenshot({ path: join(outDir, name + '_tapped.png'), fullPage: true });
      await page.getByRole('button', { name: /check/i }).first().click().catch(() => {});
      await page.waitForTimeout(400);
    }
    await page.screenshot({ path: join(outDir, name + '.png'), fullPage: true });
    const len = await page.evaluate(() => document.getElementById('main').innerText.length);
    if (errors.length) failed = true;
    results.push({ route: r + ' (seeded)', status: errors.length ? 'ERROR' : 'content', heading: await page.locator('h1').first().innerText().catch(() => ''), unavailable: false, textLength: len, errors, consoleErrors: [] });
    await page.close();
  }
  await seeded.close();
}
// first run (fresh profile, no init script): home redirects to the welcome screen; finishing it persists settings
const checks = [];
const check = (name, ok, detail = '') => { checks.push({ name, ok: !!ok, detail }); if (!ok) failed = true; };
{
  const fresh = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await fresh.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction(() => location.hash === '#/welcome', null, { timeout: 8000 }).catch(() => {});
  check('first run redirects home -> #/welcome', (await page.evaluate(() => location.hash)) === '#/welcome');
  await page.locator('#ob-letters-none').check();
  await page.locator('#ob-letters-continue').click(); // by id: its label changes with the copy ("Continue to my learning plan")
  await page.waitForSelector('#ob-form-congregation');
  await page.evaluate(() => { const d = document.querySelector('details.ob-more'); if (d) d.open = true; }); // the branch-of-Judaism question is optional and collapsed
  await page.locator('#ob-denomination-reform').check(); await page.locator('#ob-pron-ashkenazi').check();
  await page.locator('#ob-congregation-continue').click();
  // minutes a day is no longer its own step: the plan card appears after the pronunciation step with the default minutes
  await page.waitForSelector('section.ob-plan');
  const saved = await page.evaluate(() => ({ s: JSON.parse(localStorage.getItem('alef:settings')), o: JSON.parse(localStorage.getItem('alef:onboarding.v1')) }));
  check('onboarding persists letters answer, denomination, the congregation setting and the default (unset) minutes', saved.o?.letters === 'none' && saved.o?.start === '/firstday' && saved.o?.denomination === 'reform' && saved.o?.minutesPerDay === null && saved.s?.congregation === 'ashkenazi' && saved.s?.onboarded === true, JSON.stringify(saved));
  check('week plan card has 7 days', (await page.locator('section.ob-plan ol.ob-days > li').count()) === 7);
  await page.locator('#ob-start').click();
  await page.waitForFunction(() => location.hash === '#/firstday', null, { timeout: 8000 }).catch(() => {});
  check('plan start button opens the first 10 minutes', (await page.evaluate(() => location.hash)) === '#/firstday');
  // learning loop: lesson -> listen -> complete -> review -> home due count
  await page.goto(base + '#/learn?lesson=r01'); await page.locator('main').getByRole('heading', { name: 'Words', exact: true }).waitFor();
  const listen = page.getByRole('button', { name: 'Listen to Shin', exact: true });
  // wait until the sound state is drawn (slow runners load the audio manifest late): either the Listen button or the no-audio label
  await page.waitForFunction(() => !!document.querySelector('button[aria-label="Listen to Shin"], main .audio-none'), null, { timeout: 30000 }).catch(() => {});
  if (!(await page.evaluate(() => !!document.querySelector('button[aria-label="Listen to Shin"], main .audio-none')))) { // the lesson was mid-redraw (quiet refresh after the sound data landed): wait for it to be drawn again
    await page.locator('main').getByRole('heading', { name: 'Words', exact: true }).waitFor({ timeout: 30000 }).catch(() => {});
    await page.waitForFunction(() => !!document.querySelector('button[aria-label="Listen to Shin"], main .audio-none'), null, { timeout: 30000 }).catch(() => {});
  }
  if (await listen.count()) {
    await listen.click();
    await page.waitForTimeout(300);
    const sound = await page.locator('#sound-status').innerText();
    check('sound indicator states the real source after Listen', /browser|device voice|No sound|recorded|(Israeli|Sephardi|Ashkenazi|English) voice/i.test(sound) && !/checking/i.test(sound), sound);
  } else {
    const none = page.locator('main .audio-none').first();
    const noneOk = (await none.count()) > 0 && await none.isVisible() && /No audio yet/.test(await none.innerText());
    check('unavailable congregation recording is labelled honestly', noneOk, noneOk ? '' : 'neither a Listen to Shin button nor a No audio yet label; Words section: ' + (await page.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 300));
  }
  // the quick check opens once the end of the lesson has been seen (U-13): scroll there first, then wait for it to enable
  // A quiet re-render (audio manifest landing) can redraw the lesson and re-lock the check, so keep scrolling until it opens.
  for (let i = 0; i < 120 && await page.evaluate(() => !!document.getElementById('alef-quick-start')?.disabled); i++) { // up to 30 s on slow runners
    await page.evaluate(() => { // the button sits in a sticky bar, so scrolling to it moves nothing: bring the lesson's last part into view, then the page bottom
      const parts = [...document.querySelectorAll('.alef-lesson-page > section, .alef-lesson-page > p')]; parts.at(-1)?.scrollIntoView({ block: 'center' });
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(250);
  }
  await page.locator('#alef-quick-start').click();
  const answers = new Map();
  for (let i = 0; i < 30 && await page.locator('.alef-ex-card').count(); i++) {
    const card = page.locator('.alef-ex-card');
    const id = await card.getAttribute('data-ex');
    const options = card.locator('.alef-int-opt');
    if (answers.has(id)) await options.filter({ hasText: answers.get(id) }).first().click();
    else await options.first().click();
    answers.set(id, await card.locator('[data-state="right"]').innerText());
    await card.locator('[data-act="next"]').click();
  }
  await page.getByRole('heading', { name: /^lesson complete$/i }) /* headings are Title Cased on the page */.waitFor();
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('alef:srs.cards')));
  check('quick check earns completion and creates review cards', Object.keys(before).length === 14 /* 6 lesson cards + 8 memory-chain cards (4 each for Shin and Bet) */ && await page.evaluate(() => !!JSON.parse(localStorage.getItem('alef:curriculum.progress')).completed.r01));
  await page.goto(base + '#/'); await page.locator('#today-continue').waitFor();
  { const txt = await page.locator('main').innerText();
    check('home Today card shows no streak line on day 1, the morning link and one Continue button', (await page.locator('#today-streak').count()) === 0 /* hidden until a streak of 2 days (src/home/today.js) */ && /Today's morning verse/.test(txt) && (await page.locator('#today-continue').count()) === 1, txt.replace(/\s+/g, ' ').slice(0, 400)); }
  await page.goto(base + '#/learn?review=1');
  await page.getByRole('button', { name: 'Show answer' }).waitFor();
  for (let i = 0; i < 12 && await page.getByRole('button', { name: 'Show answer' }).count(); i++) {
    await page.getByRole('button', { name: 'Show answer' }).click();
    await page.keyboard.press('3'); await page.waitForTimeout(100);
    const cont = page.getByRole('button', { name: 'Continue', exact: true });
    if (await cont.count()) await cont.first().click();
  }
  await page.waitForSelector('text=Session done');
  const cards = await page.evaluate(() => JSON.parse(localStorage.getItem('alef:srs.cards')));
  check('review persisted new ratings to srs.cards', Object.values(cards).some((c) => c.reps > before[c.id].reps));
  await page.screenshot({ path: join(outDir, 'flow_review_done.png'), fullPage: true });
  await page.goto(base + '#/learn?lesson=r01&review=1'); await page.waitForSelector('main');
  check('lesson review deep link renders', /Nothing due|Card 1 of/i.test(await page.locator('main').innerText()));
  check('flow had no page errors', errs.length === 0, errs.join('; '));
  await fresh.close();
}
// offline check: after SW install, reload with network off
let offline = 'skipped';
try {
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'load' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(800);
  await ctx.setOffline(true);
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('body[data-ready="1"]', { timeout: 8000 });
  offline = (await page.locator('h1').first().innerText()).includes('Aleph') ? 'ok: app shell loaded offline' : 'FAIL: unexpected content offline';
  await ctx.setOffline(false);
} catch (e) { offline = 'FAIL: ' + e.message; failed = true; }
await browser.close(); server.close();
writeFileSync(join(outDir, 'results.json'), JSON.stringify({ when: new Date().toISOString(), mode: useDist ? `dist under ${prefix}` : 'repo root', offline, checks, results }, null, 1));
for (const c of checks) console.log(c.ok ? 'ok  ' : 'FAIL', c.name, c.ok ? '' : c.detail);
for (const x of results) console.log(x.status.padEnd(18), x.route.padEnd(24), x.heading, x.errors.length ? '!! ' + x.errors.join('; ') : '');
console.log('offline:', offline);
process.exit(failed ? 1 : 0);
