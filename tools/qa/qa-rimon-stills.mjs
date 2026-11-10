// Browser check for Rimon's stills (src/shell/rimon-stage.js). Serves the app with a stills folder of your choice in place of
// data/images/rimon, then walks the moments: onboarding slot, Home hello, Brain Lab, an answer, a badge card, page not found,
// a quiet Torah screen, a phone card, reduced motion, the app with no stills at all, and a day of mourning. Nothing is written into the repo.
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
  const m = req.url.match(/^\/data\/images\/rimon\/(rimon-a?\d{3}[a-z]?\.webp|present\.json)(\?.*)?$/);
  if (m && process.env.NO_STILLS === '1' && m[1] === 'present.json') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end('{"ids":[]}'); }
  if (m && process.env.NO_STILLS !== '1' && fs.existsSync(path.join(STILLS, m[1]))) { const f = path.join(STILLS, m[1]); res.writeHead(200, { 'content-type': m[1].endsWith('.json') ? 'application/json' : 'image/webp' }); return res.end(fs.readFileSync(f)); }
  inner.emit('request', req, res);
});
await new Promise((r) => server.listen(8123, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
const out = { errors: [], notFound: [], checks: {} };
const ok = (k, v) => { out.checks[k] = v; console.log((v ? 'PASS ' : 'FAIL ') + k); };
const src_blob_or = (src, idOf, ids) => (src || '').startsWith('blob:') || ids.includes(idOf(src));
const stillId = (s) => (s || '').match(/rimon-(a?\d{3}[a-z]?)\.webp/)?.[1] || null;
const { STILL_IDS } = await import(new URL('../../src/shell/rimon-stills.generated.js', import.meta.url).href);
const isFor = (t, src) => STILL_IDS[t].includes(stillId(src));
// the companion shows a cut-out copy (blob:) of a cream-background drawing; its source still is recorded on the page for checks
const shownStill = (page, sel) => page.locator(sel).evaluate((e) => e.dataset.rimonId || e.getAttribute('src'));
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
  // the setup screens have their own in-page Rimon (src/shell/rimon-inline.js); the stage's onboarding slot is detached there
  await page.waitForTimeout(800);
  const welcome = await page.evaluate(() => ({ inline: document.querySelectorAll('.rimon-inline').length, slotFilled: !!document.querySelector('.ob-rimon .rimon-hero') }));
  ok('welcome: Rimon is on the page (in-page Rimon or the stage slot)', welcome.inline > 0 || welcome.slotFilled);
  ok('welcome: one Rimon (the corner companion is not also showing)', !(await page.locator('.rimon-companion.rimon-corner').isVisible().catch(() => false)));
  await page.screenshot({ path: SHOTS + '/1-welcome-desktop.png' });

  // 2. Home after onboarding: hello pose on the hero companion with its line
  await page.evaluate(() => window.alef.settings.set({ onboarded: true }));
  await go('#/', 'home'); await unveil();
  await page.waitForFunction(() => { const s = document.querySelector('.rimon-companion .rimon-still'); return s && !s.hidden; }, null, { timeout: 5000 });
  ok('Home: one Rimon (no big-moment pop-up over the greeting)', !(await page.locator('.rimon-moment:not([hidden])').count()));
  ok('home hello pose is a greet.first still', STILL_IDS['greet.first'].includes(await shownStill(page, '.rimon-companion .rimon-still')));
  ok('bubble carries the hello line', /I'm Rimon/.test(await page.locator('.rimon-bubble').innerText().catch(() => '')));
  ok('the cream background is cut out (blob copy, corner transparent)', await page.locator('.rimon-companion .rimon-still').evaluate(async (e) => { if (!e.src.startsWith('blob:')) return false; const c = document.createElement('canvas'); c.width = e.naturalWidth; c.height = e.naturalHeight; const g = c.getContext('2d'); g.drawImage(e, 0, 0); return g.getImageData(3, 3, 1, 1).data[3] === 0 && g.getImageData(c.width >> 1, c.height >> 1, 1, 1).data[3] === 255; }));
  await page.locator('.rimon-companion').scrollIntoViewIfNeeded(); await page.screenshot({ path: SHOTS + '/2-home-hello.png' });

  // 3. Brain Lab: corner Rimon dressed for the page, per drill
  await go('#/lab', 'lab');
  // the stills the app may show for a trigger: its own drawn ones, else the first trigger down its fallback chain that has some
  const { TRIGGERS, presentSet } = await import(new URL('../../src/shell/rimon-triggers.js', import.meta.url).href);
  let present = new Set(); try { present = presentSet(JSON.parse(fs.readFileSync(path.join(STILLS, 'present.json'), 'utf8'))); } catch { /* no list: nothing drawn */ }
  const expect = (t) => { for (let x = t, n = 0; x && n < 10; x = TRIGGERS[x].fallback, n++) { const l = (STILL_IDS[x] || []).filter((id) => present.has(id)); if (l.length) return l; } return []; };
  const cornerIs = (ids) => page.waitForFunction((l) => l.includes(document.querySelector('.rimon-corner .rimon-still')?.dataset.rimonId), ids, { timeout: 5000 }).then(() => true, () => false);
  const labIds = expect('lab.home');
  // any other Rimon on screen: the corner companion, the big-moment pop-up or the floating one
  const cornerShown = () => page.evaluate(() => [...document.querySelectorAll('.rimon-companion.rimon-corner, .rimon-moment:not([hidden]), .alef-rimon-spot')].some((c) => getComputedStyle(c).visibility !== 'hidden' && getComputedStyle(c).display !== 'none' && c.getBoundingClientRect().width > 0));
  const labArt = await page.evaluate(() => !!document.querySelector('#main .lab-art.hero, #main .lab-art.done'));
  if (labArt) { let extra = false; for (let i = 0; i < 12 && !extra; i++) { extra = await cornerShown(); await page.waitForTimeout(150); } ok('Brain Lab: one Rimon (the page picture has Rimon in it; no corner, pop-up or floating Rimon over it)', !extra); }
  else ok(`lab page still (${labIds.length ? 'one of ' + labIds.join(' ') : 'none drawn: animated Rimon'})`, labIds.length ? await cornerIs(labIds) : true);
  await page.screenshot({ path: SHOTS + '/3-lab.png' });
  await go('#/lab/gematria', 'labgame');
  const drillIds = expect('lab.drill.gematria');
  ok(`lab drill still (${drillIds.length ? 'one of ' + drillIds.join(' ') : 'none drawn: animated Rimon'})`, drillIds.length ? await cornerIs(drillIds) : true);

  // 4. answers: a right answer poses for a moment. On a screen with no Rimon of its own (Learn's Continue card has one, so
  // nothing else shows there): the credits page.
  await go('#/credits', 'credits');
  await page.evaluate(() => { document.dispatchEvent(new CustomEvent('alef:rimon', { detail: { action: 'correct' } })); document.dispatchEvent(new CustomEvent('alef:rimon', { detail: { action: 'bounce' } })); });
  await page.waitForTimeout(300);
  // one Rimon answers: the corner pose, or (when the big-moment module runs) its pop-up with a picture chosen by the stage
  const ans = await page.evaluate(() => { const m = document.querySelector('.rimon-moment:not([hidden]) img'); return m ? { by: 'moment', src: m.getAttribute('src') } : { by: 'corner', id: document.querySelector('.rimon-corner .rimon-still')?.dataset.rimonId }; });
  const fileOf = (src) => (src || '').replace(/^.*data\/images\/rimon\//, '').replace(/\.webp$/, '');
  const STILL_FILES = JSON.parse(fs.readFileSync(path.join(STILLS, 'present.json'), 'utf8')).files || {};
  const idOf = (src) => { const f = fileOf(src); return f.startsWith('v2/') ? Object.keys(STILL_FILES).find((k) => STILL_FILES[k] === f) : f.replace(/^rimon-/, ''); };
  const answerIds = [...STILL_IDS['first.correct'], ...STILL_IDS['answer.correct']];
  ok(`right answer: one Rimon shows a stage-chosen still (${ans.by}: ${ans.id || ans.src})`, ans.by === 'corner' ? answerIds.includes(ans.id) : src_blob_or(ans.src, idOf, answerIds));
  await page.screenshot({ path: SHOTS + '/4-answer.png' });
  await page.waitForTimeout(3000);
  ok('the answer moment ends (credits has no page still)', await page.evaluate(() => { const s = document.querySelector('.rimon-corner .rimon-still'); return (!s || s.hidden) && !document.querySelector('.rimon-moment:not([hidden])'); }));

  // 5. a badge lands: card at the bottom
  await page.evaluate(() => window.alef.store.set('awards.v1', { awards: { 'qa-badge': { at: Date.now() } } }));
  await page.waitForSelector('.rimon-toast', { timeout: 3000 });
  ok('first badge toast', (await page.locator('.rimon-toast').getAttribute('data-rimon-trigger')) === 'first.badge');
  await page.waitForTimeout(450);
  ok('one Rimon: companion steps aside while the card shows', await page.locator('.rimon-companion').evaluate((e) => getComputedStyle(e).visibility === 'hidden' || getComputedStyle(e).display === 'none'));
  await go('#/learn', 'learn'); await page.waitForTimeout(900);
  const card = await page.evaluate(() => { const c = document.querySelector('#main .alef-continue-rimon'); return c ? { tag: c.tagName, shown: c.getAttribute('data-rimon-shown') } : null; });
  ok('Learn: the Continue card has its own Rimon', !!card);
  ok('one Rimon on Learn: the corner Rimon and the pop-ups stay away while the card shows Rimon', !(await page.locator('.rimon-corner').isVisible()) && !(await page.evaluate(() => [...document.querySelectorAll('.rimon-moment:not([hidden]), .alef-rimon-spot')].some((e) => getComputedStyle(e).visibility !== 'hidden'))));
  // the card is the animated Rimon (src/curriculum/learn.view.js); only its picture fallback (an img) takes a stage still
  if (card?.tag === 'IMG') ok('continue card picture is a learn.continue.first still', STILL_IDS['learn.continue.first'].includes(card.shown));
  await page.screenshot({ path: SHOTS + '/5-toast-desktop.png' });
  await page.locator('.rimon-toast-x').click();

  // 6. page not found: large Rimon under the heading
  await go('#/no-such-page', 'notfound');
  await page.waitForSelector('#main .rimon-hero img', { timeout: 3000 });
  ok('not found hero', STILL_IDS['error.notfound'].includes(await page.locator('#main .rimon-hero img').getAttribute('data-rimon-id')));
  await page.screenshot({ path: SHOTS + '/6-notfound.png' });

  // 7. quiet route: Torah reader has no Rimon
  await go('#/torahread', 'torahread');
  ok('Torah reader is quiet', (await page.evaluate(() => document.body.dataset.rimonQuiet)) === 'route' && !(await page.locator('.rimon-companion').isVisible()));
  await go('#/ask', 'ask');
  ok('Ask the Torah is quiet', (await page.evaluate(() => document.body.dataset.rimonQuiet)) === 'route' && !(await page.locator('.rimon-companion').isVisible()));

  // 8. phone: dressed Rimon in the corner and a toast above the bottom bar
  await page.setViewportSize({ width: 375, height: 812 });
  await go('#/books', 'books');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.alef.store.set('awards.v1', { awards: { 'qa-badge': { at: Date.now() }, 'qa-badge-2': { at: Date.now() } } }));
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
  p2.on('request', (r) => { if (/rimon\/v2\//.test(r.url())) req.push(r.url()); }); // catalogue stills: only the stage asks for them
  await p2.goto(B + '#/lab', { waitUntil: 'networkidle' }); await p2.waitForTimeout(800);
  ok('without stills listed, no catalogue still is requested', req.length === 0);
  ok('without stills the corner Rimon is the animated one', !(await p2.locator('.rimon-companion').evaluate((e) => e.classList.contains('rimon-has-still')).catch(() => false)));
  await ctx2.close();
  delete process.env.NO_STILLS;

  // 11. a day of mourning (Tisha B'Av 5787, 12 Aug 2027): no Rimon anywhere, the animated in-page one included
  const ctx3 = await browser.newContext({ viewport: { width: 1280, height: 860 }, serviceWorkers: 'block' });
  const p3 = await ctx3.newPage();
  p3.on('pageerror', (e) => out.errors.push(e.message));
  await p3.clock.install({ time: new Date(2027, 7, 12, 10, 0) });
  await p3.goto(B, { waitUntil: 'networkidle' }); await p3.evaluate(() => document.getElementById('alef-prayer-veil')?.remove());
  await p3.evaluate(() => window.alef.settings.set({ onboarded: true }));
  await p3.evaluate(() => { location.hash = '#/learn'; }); await p3.waitForFunction(() => document.body.dataset.route === 'learn'); await p3.waitForTimeout(800);
  await p3.evaluate(() => { const a = document.createElement('span'); a.className = 'rimon-inline qa-probe'; a.textContent = 'x'; document.querySelector('#main')?.append(a); const b = document.createElement('div'); b.className = 'alef-rimon-spot qa-probe'; b.textContent = 'x'; document.body.append(b); });
  const q = await p3.evaluate(() => ({ flag: document.body.dataset.rimonQuiet, companion: [...document.querySelectorAll('.rimon-companion')].some((e) => e.offsetParent && getComputedStyle(e).visibility !== 'hidden'), probes: [...document.querySelectorAll('.qa-probe')].map((e) => getComputedStyle(e).visibility) }));
  ok(`mourning day: quiet flag set, no corner Rimon, in-page and floating Rimon hidden (${JSON.stringify(q)})`, q.flag === 'day' && !q.companion && q.probes.length === 2 && q.probes.every((v) => v === 'hidden'));
  await ctx3.close();
} catch (e) { console.log('ERROR', e.message); out.fatal = e.message; }
finally { await browser.close(); server.close(); }
const real404 = out.notFound.filter((u) => !/favicon/.test(u));
console.log(JSON.stringify({ errors: out.errors, notFound: real404, shots: SHOTS }, null, 1));
process.exit(Object.values(out.checks).every(Boolean) && !out.errors.length && !real404.length && !out.fatal ? 0 : 1);
