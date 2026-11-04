// Accessibility pass: axe-core (tools/a11y/node_modules, dev-only) injected into every route in Chromium at 390x844,
// plus keyboard-navigation checks. Usage: node tools/a11y/run.mjs   -> prints violations, writes tools/a11y/last-run.json
// Needs Playwright installed globally (as in tools/smoke.mjs) and `npm install` in tools/a11y.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/usr/lib/node_modules/playwright')); }
const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, '..', '..');
const axeSource = readFileSync(join(here, 'node_modules/axe-core/axe.min.js'), 'utf8');
const ROUTES = ['/welcome', '/', '/learn', '/learn?lesson=r01', '/learn?lesson=r05', '/learn?review=1', '/letters', '/letters/alef', '/sounds', '/read', '/read/bless-priestly-1', '/scan', '/calendar', '/settings', '/how', '/about', '/nope'];

const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const out = { axe: '4.14.0', when: new Date().toISOString(), routes: {}, keyboard: [] };

async function newPage(theme) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: theme });
  await ctx.addInitScript(() => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); });
  return { ctx, page: await ctx.newPage() };
}
for (const theme of ['light', 'dark']) {
  const { ctx, page } = await newPage(theme);
  // a progressed profile so review/lesson screens have content
  await page.goto(base + '#/learn?lesson=r01'); await page.waitForSelector('text=Words');
  await page.getByRole('button', { name: 'Mark lesson complete' }).click(); await page.waitForSelector('text=new review cards');
  for (const r of ROUTES) {
    await page.goto(base + '#' + r); await page.waitForSelector('body[data-ready="1"]'); await page.waitForTimeout(500);
    if (r.includes('review')) { await page.getByRole('button', { name: 'Show answer' }).click().catch(() => {}); }
    await page.evaluate(axeSource);
    const res = await page.evaluate(async () => { const x = await axe.run(document, { resultTypes: ['violations'] }); return x.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 140), summary: n.failureSummary?.split('\n').slice(1, 3).join(' ').trim() })) })); });
    (out.routes[r] ||= {})[theme] = res;
  }
  await ctx.close();
}

// keyboard navigation: Tab through the nav, activate with Enter; then drive a lesson and a review without a mouse
{
  const { ctx, page } = await newPage('light');
  const note = (name, ok, detail = '') => out.keyboard.push({ name, ok: !!ok, detail });
  await page.goto(base); await page.waitForSelector('body[data-ready="1"]');
  await page.keyboard.press('Tab');
  note('first Tab stop is the skip link', await page.evaluate(() => document.activeElement?.className === 'skip-link'));
  await page.keyboard.press('Enter'); // skip link jumps to main
  note('skip link moves focus into #main', await page.evaluate(() => document.activeElement?.id === 'main'));
  const p2 = await ctx.newPage(); await p2.goto(base + '#/'); await p2.waitForSelector('body[data-ready="1"]');
  const stops = []; for (let i = 0; i < 14; i++) { await p2.keyboard.press('Tab'); stops.push(await p2.evaluate(() => { const a = document.activeElement; return (a?.textContent || a?.tagName || '').trim().replace(/\s+/g, ' ').slice(0, 24); })); }
  note('Tab order: skip link, brand, every nav link in order', ['Skip', 'ALEF', 'Home', 'Learn', 'Letters', 'Sounds', 'Read', 'Scan', 'Calendar', 'Settings', 'About'].every((x, i) => stops[i]?.startsWith(x)), stops.join(' | '));
  // focus visible on a nav link
  const outline = await page.evaluate(() => { const a = document.querySelector('#nav a'); a.focus(); const c = getComputedStyle(a); return c.outlineStyle + ' ' + c.outlineWidth; });
  note('focused nav link has a visible outline', /solid 3px/.test(outline), outline);
  // activate Learn with the keyboard
  await page.focus('#nav a[href="#/learn"]'); await page.keyboard.press('Enter'); await page.waitForSelector('text=Lessons'); await page.waitForFunction(() => document.activeElement?.id === 'view-title', null, { timeout: 3000 }).catch(() => {});
  note('Enter on nav link navigates and focus moves to the page heading', await page.evaluate(() => document.activeElement?.id === 'view-title' && location.hash === '#/learn'));
  // open a lesson with the keyboard (Start button on the first lesson)
  await page.focus('li[data-lesson="r01"] button'); await page.keyboard.press('Enter'); await page.waitForSelector('text=Words'); await page.waitForFunction(() => document.activeElement?.id === 'view-title', null, { timeout: 3000 }).catch(() => {});
  note('Start button opens the lesson by keyboard', await page.evaluate(() => location.hash === '#/learn?lesson=r01' && document.activeElement?.id === 'view-title'));
  await page.focus('button[aria-label="Listen to Shin"]'); await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  note('Listen is a real button operable with Enter (indicator updated)', !/checking/.test(await page.locator('#sound-status').innerText()));
  await page.focus('button:has-text("Mark lesson complete")'); await page.keyboard.press('Space'); await page.waitForSelector('text=new review cards');
  await page.focus('a:has-text("Review now")'); await page.keyboard.press('Enter'); await page.waitForSelector('text=Card 1 of');
  await page.focus('button:has-text("Show answer")'); await page.keyboard.press('Enter');
  note('Show answer moves focus to the answer region', await page.evaluate(() => document.activeElement?.className?.includes('alef-answer')));
  await page.keyboard.press('3'); await page.waitForSelector('text=Card 2 of');
  note('rating key 3 advances to the next card', true);
  await ctx.close();
}
await browser.close(); server.close();
writeFileSync(join(here, 'last-run.json'), JSON.stringify(out, null, 1));
let n = 0;
for (const [r, themes] of Object.entries(out.routes)) for (const [theme, vs] of Object.entries(themes)) for (const v of vs) { n++; console.log(`${r} [${theme}] ${v.impact} ${v.id}: ${v.help} (${v.nodes.length} nodes) e.g. ${v.nodes[0].target}`); }
console.log(n ? `${n} violation groups` : 'no axe violations');
for (const k of out.keyboard) console.log(k.ok ? 'ok  ' : 'FAIL', k.name, k.detail);
process.exit(out.keyboard.some((k) => !k.ok) ? 1 : 0);
