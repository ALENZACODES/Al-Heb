// Letters QA at 375x667 (headless Chromium, synthetic pointer input: no real phone/finger). Usage: node tools/qa/letters.mjs [--shots /tmp/lqa]
// Writes <shots>/letters-results.json and screenshots. Checks: grid, each letter page, tracing via mouse (pointer events), tabs, keyboard, touch targets, offline.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch {} }
const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const args = process.argv.slice(2); const shots = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : '/tmp/lqa'; mkdirSync(shots, { recursive: true });
const letters = JSON.parse(readFileSync(join(root, 'data/letters/letters.json'), 'utf8'));
const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r)); const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.QA_CHROME || undefined });
const R = { when: new Date().toISOString(), chromium: browser.version(), grid: {}, letters: [], tabs: {}, keyboard: {}, offline: {}, atlas: {}, review: {} };
const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, serviceWorkers: 'allow' });
await ctx.addInitScript(() => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); });
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
const go = async (p) => { await page.goto(base + '#' + p); await page.waitForSelector('.alef-trace .grid button, .alef-atlas .tiles button, [role=alert]', { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(250); };
const small = () => page.evaluate(() => [...document.querySelectorAll('main button, main a, main [role=tab], main input, main select')].filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width && r.height && s.visibility !== 'hidden' && (r.width < 44 || r.height < 44) && !e.closest('[hidden]'); }).map((e) => (e.tagName + ' ' + (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 20) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))));
const overflow = () => page.evaluate(() => ({ sw: document.documentElement.scrollWidth, bw: document.body.scrollWidth, iw: innerWidth }));

// grid
await go('/letters'); await page.screenshot({ path: join(shots, 'grid.png') });
R.grid = await page.evaluate(() => { const b = [...document.querySelectorAll('.alef-trace .grid button')]; return { count: b.length, labels: b.map((x) => x.getAttribute('aria-label')), min: Math.min(...b.map((x) => { const r = x.getBoundingClientRect(); return Math.min(r.width, r.height); })) }; });
R.grid.overflow = await overflow(); R.grid.small = await small();

for (const l of letters) {
  const o = { id: l.id, issues: [] };
  await go('/letters/' + l.id);
  const info = await page.evaluate(() => { const m = document.querySelector('.alef-trace'); const txt = m ? m.innerText : ''; return { txt, big: m?.querySelector('.big')?.textContent, pressed: m?.querySelector('.grid button[aria-pressed=true]')?.getAttribute('aria-label'), svg: !!m?.querySelector('.stage svg'), notice: [...m.querySelectorAll('.notice')].map((n) => n.textContent.slice(0, 60)), review: [...m.querySelectorAll('[data-review]')].map((n) => n.dataset.review) }; });
  if (!info.txt.includes(l.name)) o.issues.push('name missing'); if (info.big !== l.he) o.issues.push('big glyph ' + info.big); if (!info.txt.includes('/' + l.sound.ipa + '/')) o.issues.push('ipa missing'); if (!info.svg) o.issues.push('no svg stage');
  if (!/Israeli|American|Sephardi|Ashkenazi|silent|like|sound|as in|between|\w{3}/.test(info.txt)) o.issues.push('no sound text');
  o.review = info.review; o.notice = info.notice.length;
  for (const script of ['print', 'cursive']) {
    await page.click(`.alef-trace [aria-label="Script"] button:text-is("${script === 'print' ? 'Print' : 'Cursive'}")`);
    await page.waitForTimeout(150);
    const rv = await page.evaluate(() => [...document.querySelectorAll('[data-review]')].map((n) => n.dataset.review + ':' + n.textContent.slice(0, 40)));
    const geo = await page.evaluate(() => { const s = document.querySelector('.stage svg'); const r = s.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, paths: s.querySelectorAll('path').length, ta: getComputedStyle(s).touchAction, sw: document.documentElement.scrollWidth }; });
    const block = l[script]; const strokes = block.strokes;
    o[script] = { strokesData: strokes.length, review: rv, geo };
    if (geo.w < 200) o.issues.push(script + ' stage narrow ' + geo.w); if (geo.ta !== 'none') o.issues.push(script + ' stage touch-action=' + geo.ta + ' (page may scroll while drawing)'); if (geo.sw > 375) o.issues.push(script + ' h-overflow ' + geo.sw);
    await page.evaluate(() => document.querySelector('.stage').scrollIntoView({ block: 'center', behavior: 'instant' })); await page.waitForTimeout(450);
    const g = await page.evaluate(() => { const r = document.querySelector('.stage svg').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    // draw each stroke with real mouse events (pointer events)
    for (const s of strokes) {
      const pts = s.median.map(([x, y]) => [g.x + x / 1000 * g.w, g.y + y / 1000 * g.h]);
      await page.mouse.move(...pts[0]); await page.mouse.down(); for (const p of pts.slice(1)) await page.mouse.move(...p, { steps: 2 }); await page.mouse.up();
    }
    await page.waitForTimeout(150);
    const fb = await page.evaluate(() => ({ fb: document.querySelector('.feedback')?.textContent, prog: [...document.querySelectorAll('.alef-trace .row[role=status]')].map((x) => x.textContent).join('|'), chip: document.querySelector('.chip')?.textContent || null }));
    o[script].traced = fb;
    if (!/done|Perfect/i.test(fb.fb || '')) o.issues.push(script + ' tracing did not complete: ' + fb.fb + ' / ' + fb.prog);
    if (script === 'print' && l.id === 'alef') await page.screenshot({ path: join(shots, 'alef-print-traced.png') });
    if (script === 'cursive' && l.id === 'bet') await page.screenshot({ path: join(shots, 'bet-cursive-traced.png') });
  }
  o.small = await small(); 
  if (l.id === 'kaf-final' || l.id === 'pe-final') await page.screenshot({ path: join(shots, l.id + '.png'), fullPage: true });
  if (l.id === 'bet') await page.screenshot({ path: join(shots, 'bet-full.png'), fullPage: true });
  R.letters.push(o);
}
// tabs
await go('/letters/mem'); 
R.tabs.drill = {}; await page.click('[role=tab]:text-is("Look-alikes")'); await page.waitForTimeout(200); await page.screenshot({ path: join(shots, 'drill.png'), fullPage: true });
R.tabs.drill.info = await page.evaluate(() => ({ sets: [...document.querySelectorAll('[aria-label="Look-alike sets"] button')].length, opts: [...document.querySelectorAll('.opts button')].map((b) => b.getAttribute('aria-label')), find: document.querySelector('.alef-trace p:nth-of-type(2)')?.textContent }));
R.tabs.drill.small = await small(); R.tabs.drill.overflow = await overflow();
// wrong tap then right tap
const find = await page.evaluate(() => [...document.querySelectorAll('.alef-trace p')].find((p) => p.textContent.startsWith('Find:'))?.textContent);
R.tabs.drill.find = find;
const btns = await page.$$('.opts button'); const names = []; for (const b of btns) names.push(await b.getAttribute('aria-label'));
const target = names.find((n) => find && find.includes(n + ' ')) ; 
for (const b of btns) { if ((await b.getAttribute('aria-label')) !== target) { await b.click(); break; } }
R.tabs.drill.afterWrong = await page.evaluate(() => document.querySelector('.feedback')?.textContent);
await page.click(`.opts button[aria-label="${target}"]`); R.tabs.drill.afterRight = await page.evaluate(() => document.querySelector('.feedback')?.textContent);
await go('/letters?tab=type'); await page.screenshot({ path: join(shots, 'typing.png'), fullPage: true });
R.tabs.typing = { small: await small(), overflow: await overflow(), keys: await page.evaluate(() => document.querySelectorAll('.kb .k').length) };
// keyboard: tab order & enter on grid, typing key
await go('/letters/bet'); await page.focus('.alef-trace .grid button'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
R.keyboard.gridTabEnter = await page.evaluate(() => ({ pressed: document.querySelector('.grid button[aria-pressed=true]')?.getAttribute('aria-label'), focus: document.activeElement?.tagName + ' ' + (document.activeElement?.getAttribute('aria-label') || '') }));
R.keyboard.focusIndicator = await page.evaluate(() => { document.querySelector('.grid button').focus(); const s = getComputedStyle(document.querySelector('.grid button')); return s.outlineStyle + ' ' + s.outlineWidth; });
R.keyboard.stepMode = {}; 
await page.click('[data-act=mode-step]'); await page.waitForTimeout(150); R.keyboard.stepMode.focusKept = await page.evaluate(() => document.activeElement?.getAttribute('data-act'));
await page.focus('[data-act=next-stroke]'); let n = 0; for (let i = 0; i < 6; i++) { await page.keyboard.press('Enter'); n++; await page.waitForTimeout(80); }
R.keyboard.stepMode.afterEnter = await page.evaluate(() => document.querySelector('.feedback')?.textContent + ' | ' + document.querySelector('.chip')?.textContent);
await go('/letters?tab=type'); await page.keyboard.press('KeyA'); await page.waitForTimeout(100);
R.keyboard.typingKey = await page.evaluate(() => document.querySelector('.feedback')?.textContent);
// atlas
await go('/letters/atlas'); await page.screenshot({ path: join(shots, 'atlas.png'), fullPage: true });
R.atlas = await page.evaluate(() => ({ tiles: document.querySelectorAll('.tiles button').length, sw: document.documentElement.scrollWidth, ids: [...document.querySelectorAll('.tiles button')].map((b) => b.dataset.tile) }));
R.atlas.small = await small();
await page.click('.tiles button[data-tile="mem-final"]'); await page.waitForTimeout(200); await page.screenshot({ path: join(shots, 'atlas-final-mem.png'), fullPage: true });
R.atlas.detail = await page.evaluate(() => document.querySelector('[data-detail]')?.innerText.slice(0, 300));
// settings: tradition ashkenazi sound
await page.evaluate(() => localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true, congregation: 'ashkenazi' })));
await page.reload(); await go('/letters/tav'); R.tabs.tavAshkenazi = await page.evaluate(() => document.querySelector('.alef-trace .row span:last-child, .alef-trace')?.innerText.match(/\/[^/]+\/ [^\n]*/)?.[0]);
await page.screenshot({ path: join(shots, 'tav-ashkenazi.png') });
await page.evaluate(() => localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true, congregation: 'israeli' })));
await page.reload(); await go('/letters/tav'); R.tabs.tavIsraeli = await page.evaluate(() => document.querySelector('.alef-trace')?.innerText.match(/\/[^/]+\/ [^\n]*/)?.[0]);
// review sheet
const rp = await ctx.newPage(); await rp.setViewportSize({ width: 375, height: 667 }); await rp.goto(base + 'docs/letters/REVIEW-SHEET.html'); await rp.waitForTimeout(300);
R.review = await rp.evaluate(() => ({ title: document.title, h1: document.querySelector('h1')?.textContent, draftCount: (document.body.innerText.match(/draft/gi) || []).length, sw: document.documentElement.scrollWidth, imgs: document.images.length, broken: [...document.images].filter((i) => !i.complete || !i.naturalWidth).length, firstP: document.querySelector('p')?.textContent.slice(0, 200) }));
await rp.screenshot({ path: join(shots, 'review-sheet.png') });
// offline
await go('/letters/alef'); await page.evaluate(async () => { await navigator.serviceWorker.ready; await new Promise((r) => setTimeout(r, 2500)); });
for (const p of ['/letters', '/letters/atlas', '/letters/mem-final', '/letters/zayin']) { await go(p); }
R.offline.swControlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
await ctx.setOffline(true);
R.offline.pages = [];
for (const p of ['/letters', '/letters/atlas', '/letters/mem-final', '/letters/zayin']) {
  const pg = await ctx.newPage(); const f = []; pg.on('requestfailed', (q) => f.push(new URL(q.url()).pathname));
  let ok = true, why = '';
  try { await pg.goto(base + '#' + p, { waitUntil: 'load' }); await pg.waitForSelector('.alef-trace .stage svg, .alef-trace .grid button, .alef-atlas .tiles button', { timeout: 8000 }); } catch (e) { ok = false; why = e.message.split('\n')[0]; }
  const st = ok ? await pg.evaluate(() => ({ alert: !!document.querySelector('[role=alert]'), txt: document.querySelector('main')?.innerText.length })) : {};
  R.offline.pages.push({ p, ok, why, ...st, failed: f }); if (p === '/letters/mem-final') await pg.screenshot({ path: join(shots, 'offline-mem-final.png') });
  await pg.close();
}
await ctx.setOffline(false);
R.pageErrors = errs;
writeFileSync(join(shots, 'letters-results.json'), JSON.stringify(R, null, 1));
const bad = R.letters.filter((l) => l.issues.length);
console.log('grid', R.grid.count, 'min', R.grid.min, 'small', R.grid.small.length, 'atlas', R.atlas.tiles, 'letters w/ issues', bad.length, 'errs', errs.length);
for (const b of bad) console.log(b.id, b.issues.join('; '));
await browser.close(); server.close();
