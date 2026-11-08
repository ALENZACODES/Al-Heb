// Headless-Chromium reproduction for "drawings get stuck when you make a mistake" in letter tracing (#/letters/:id).
// Drives the real page with pointer/touch input and reports, after each scenario, whether the surface is still drawable:
// a correct stroke 1 must advance data-progress. Usage: node tools/check/trace-repro.mjs [letterId=alef]
import { createRequire } from 'node:module';
import { createAppServer } from '../serve.mjs';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const letterId = process.argv[2] || 'alef';
const letters = JSON.parse(readFileSync(root + '/data/letters/letters.json', 'utf8'));
const letter = letters.find((l) => l.id === letterId);
const medians = letter.print.strokes.map((s) => s.median);

const srv = createAppServer({ root }); await new Promise((r) => srv.listen(0, r));
const base = `http://localhost:${srv.address().port}/`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 600, height: 1000 }, serviceWorkers: 'block', hasTouch: true });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => { try { localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true, veilOptOut: true })); } catch (e) {} });
await page.goto(base + '#/letters/' + letterId); await page.waitForFunction(() => document.body.dataset.ready === '1' && !!document.querySelector('.alef-trace .stage svg'), null, { timeout: 30000 });
const svg = await page.$('.alef-trace .stage svg');
const box = async () => svg.boundingBox();
// keep the whole surface inside the viewport and clear of the sticky header before every stroke (otherwise the header, not the
// svg, receives the pointerdown and the harness itself would report a stuck surface)
const center = async () => { await page.evaluate(() => document.querySelector('.alef-trace .stage svg').scrollIntoView({ block: 'center' })); };
const toScreen = async (p) => { await center(); const b = await box(); return { x: b.x + (p[0] / 1000) * b.width, y: b.y + (p[1] / 1000) * b.height }; };
const hitsSvg = async (pt) => page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return !!(e && e.closest && e.closest('.alef-trace .stage svg')); }, [pt.x, pt.y]);
const state = () => page.evaluate(() => { const s = document.querySelector('.alef-trace .stage svg'); return { progress: s.getAttribute('data-progress'), userPaths: s.children[3].children.length, hintKids: s.children[2].children.length, fb: document.querySelector('.alef-trace .feedback')?.textContent }; });
async function mouseStroke(pts, { release = true, leaveTo = null } = {}) {
  const s = await toScreen(pts[0]); if (!(await hitsSvg(s))) throw new Error('harness: stroke start is not over the svg'); await page.mouse.move(s.x, s.y); await page.mouse.down();
  for (const p of pts.slice(1)) { const q = await toScreen(p); await page.mouse.move(q.x, q.y, { steps: 3 }); }
  if (leaveTo) await page.mouse.move(leaveTo.x, leaveTo.y, { steps: 4 });
  if (release) await page.mouse.up();
  await page.waitForTimeout(60);
}
const reset = async () => { await page.click('.alef-trace button:has-text("Start over")'); await page.waitForTimeout(50); };
async function canDraw(label) {
  const before = await state();
  await mouseStroke(medians[Number(before.progress) || 0]); // the stroke the surface is waiting for
  const after = await state();
  const ok = Number(after.progress) === Number(before.progress) + 1 && after.userPaths === 0;
  console.log(`${ok ? 'OK  ' : 'STUCK'} ${label}: progress ${before.progress} -> ${after.progress}, user paths left ${after.userPaths}, feedback "${after.fb}"`);
  return ok;
}
const results = [];
// 1. off-path mistake, release, draw again
await reset(); await mouseStroke([[100, 900], [300, 950], [500, 980]]); results.push(await canDraw('after an off-path stroke'));
// 2. pointer leaves the canvas mid-stroke and is released outside
await reset(); await mouseStroke(medians[0].slice(0, 3), { leaveTo: { x: 5, y: 5 } }); results.push(await canDraw('after leaving the canvas mid-stroke and releasing outside'));
// 3. pointercancel in the middle of a stroke
await reset(); await mouseStroke(medians[0].slice(0, 3), { release: false });
await page.evaluate(() => document.querySelector('.alef-trace .stage svg').dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true })));
await page.mouse.up(); results.push(await canDraw('after pointercancel mid-stroke'));
// 3b. pointercancel with NO following pointerup (the browser took the gesture)
await reset(); await mouseStroke(medians[0].slice(0, 3), { release: false });
await page.evaluate(() => document.querySelector('.alef-trace .stage svg').dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true })));
results.push(await canDraw('after pointercancel with no pointerup'));
// 4. second finger while drawing (two touch points), both lifted
await reset(); {
  const cdp = await ctx.newCDPSession(page);
  const a = await toScreen(medians[0][0]), b = await toScreen([900, 900]), a2 = await toScreen(medians[0][Math.floor(medians[0].length / 2)]);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a2.x, y: a2.y, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a2.x, y: a2.y, id: 1 }, { x: b.x, y: b.y, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: b.x, y: b.y, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(80);
  const s = await state(); console.log(`     after two fingers: progress ${s.progress}, user paths ${s.userPaths}, feedback "${s.fb}"`);
  results.push(await canDraw('after a second finger during a stroke'));
}
// 5. wrong stroke order (stroke 2 first), then stroke 1
if (medians.length > 1) { await reset(); await mouseStroke(medians[1]); const s = await state(); console.log(`     wrong order feedback: "${s.fb}"`); results.push(await canDraw('after a wrong-order stroke')); }
// 6. drawing while the Animate playback is running (its promise must still settle)
await reset(); await page.click('.alef-trace button:has-text("Animate")'); await page.waitForTimeout(150);
await mouseStroke([[100, 900], [300, 950], [500, 980]]); await page.waitForTimeout(1500);
{ const s = await state(); const settled = !/Watch the order/.test(s.fb || ''); console.log(`${settled ? 'OK  ' : 'STUCK'} Animate interrupted by a stroke: feedback "${s.fb}"`); results.push(settled); results.push(await canDraw('after interrupting Animate')); }
// 7. a tap (single point) and a two-point stroke
await reset(); { const s0 = await toScreen([500, 500]); await page.mouse.move(s0.x, s0.y); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80); const s = await state(); console.log(`     after a tap: user paths ${s.userPaths}, feedback "${s.fb}"`); results.push(await canDraw('after a tap')); }
// 8. mistakes until the hint animation shows, then draw during the hint
await reset(); for (let i = 0; i < 3; i++) await mouseStroke([[100, 900], [300, 950], [500, 980]]); await page.waitForTimeout(100); results.push(await canDraw('after three mistakes (hint animating)'));
// 9. finish the letter, then try to draw: must be refused but "Start over" must recover
await reset(); for (const m of medians) await mouseStroke(m); { const s = await state(); console.log(`     completed: progress ${s.progress}, feedback "${s.fb}"`); await mouseStroke(medians[0]); const s2 = await state(); console.log(`     stroke after completion: user paths ${s2.userPaths} (expected 0), feedback "${s2.fb}"`); results.push(s2.userPaths === 0 && /Start over/.test(s2.fb || '')); await reset(); results.push(await canDraw('after Start over')); }
console.log('page errors:', errors);
console.log(results.every(Boolean) ? 'ALL OK' : 'FAILURES: ' + results.filter((r) => !r).length);
await browser.close(); srv.close();
