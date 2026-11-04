// Accessibility pass: axe-core (tools/a11y/node_modules, dev-only) injected into every route in Chromium at 390x844,
// plus keyboard-navigation checks. Usage: node tools/a11y/run.mjs   -> prints violations, writes tools/a11y/last-run.json
// Needs Playwright installed globally (as in tools/smoke.mjs) and `npm install` in tools/a11y.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createAppServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/usr/lib/node_modules/playwright')); }
const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, '..', '..');
const axeSource = readFileSync(join(here, 'node_modules/axe-core/axe.min.js'), 'utf8');
const { ROUTES: ROUTE_DEFS } = await import(pathToFileURL(join(root, 'src/shell/router.js')).href);
const argv = process.argv.slice(2);
const quick = argv.includes('--quick');
const sampleFor = (r) => r.pattern.replace(/:(\w+)/g, (_, k) => (r.name === 'dialogue' ? 'd-cafe' : r.name === 'fadeline' ? 'bless-priestly-1' : r.name === 'letter' ? 'bet' : r.name === 'text' ? 'priestly-blessing' : k === 'group' ? 'lw1' : k === 'letter' ? 'bet' : 'x'));
// every route in src/shell/router.js with a sample parameter, plus lesson/review states that need progress
const ROUTES = [...new Set([...ROUTE_DEFS.map(sampleFor), '/learn?lesson=r01', '/learn?lesson=r05', '/learn?review=1', '/letters/alef', '/letters?tab=type', '/vocab?review=1', '/nope'])];
const QUICK = new Set(['/', '/learn', '/letters/alef', '/letters/atlas', '/sounds', '/read/priestly-blessing', '/calendar', '/settings', '/vocab']);
const routes = quick ? ROUTES.filter((r) => QUICK.has(r)) : ROUTES;
const CONFIGS = [['phone', 'light'], ['phone', 'dark'], ['desktop', 'light'], ['desktop', 'dark']];
const VIEWPORT = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 800 } };

const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const out = { axe: '4.14.0', when: new Date().toISOString(), routes: {}, keyboard: [] };

async function newPage(theme, device = 'phone') {
  const ctx = await browser.newContext({ viewport: VIEWPORT[device], deviceScaleFactor: device === 'phone' ? 2 : 1, colorScheme: theme });
  await ctx.addInitScript(() => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); });
  return { ctx, page: await ctx.newPage() };
}
for (const [device, theme] of CONFIGS) {
  const { ctx, page } = await newPage(theme, device);
  // a progressed profile so review/lesson screens have content
  await page.goto(base + '#/learn?lesson=r01'); await page.waitForSelector('text=Words');
  await page.getByRole('button', { name: 'Mark lesson complete' }).click(); await page.waitForSelector('text=new review cards');
  for (const r of routes) {
    await page.goto(base + '#' + r); await page.waitForSelector('body[data-ready="1"]'); await page.waitForTimeout(400);
    if (r.includes('review')) { await page.getByRole('button', { name: 'Show answer' }).click({ timeout: 1000 }).catch(() => {}); }
    await page.evaluate(axeSource);
    const res = await page.evaluate(async () => { const x = await axe.run(document, { resultTypes: ['violations'] }); return x.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 140), summary: n.failureSummary?.split('\n').slice(1, 3).join(' ').trim() })) })); });
    (out.routes[r] ||= {})[`${device}-${theme}`] = res;
  }
  if (device === 'phone') { // the More sheet open (it is closed on every route load, so the loop above never sees it)
    await page.goto(base + '#/'); await page.waitForSelector('body[data-ready="1"]'); await page.click('#more-btn'); await page.waitForTimeout(200);
    await page.evaluate(axeSource);
    const res = await page.evaluate(async () => { const x = await axe.run(document, { resultTypes: ['violations'] }); return x.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 140), summary: n.failureSummary?.split('\n').slice(1, 3).join(' ').trim() })) })); });
    (out.routes['/ (More sheet open)'] ||= {})[`${device}-${theme}`] = res;
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
  note('Tab order on a phone: skip link, brand, the five tab-bar links, More (the sheet items are not tabbable while closed)', ['Skip', 'ALEF', 'Home', 'Learn', 'Letters', 'Sounds', 'Read', 'More'].every((x, i) => stops[i]?.startsWith(x)), stops.join(' | '));
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
let n = 0, nodes = 0; const byImpact = {}, byRule = {};
for (const [r, cfgs] of Object.entries(out.routes)) for (const [cfg, vs] of Object.entries(cfgs)) for (const v of vs) {
  n++; nodes += v.nodes.length; byImpact[v.impact] = (byImpact[v.impact] || 0) + v.nodes.length; byRule[v.id] = (byRule[v.id] || 0) + v.nodes.length;
  console.log(`${r} [${cfg}] ${v.impact} ${v.id}: ${v.help} (${v.nodes.length} nodes) e.g. ${v.nodes[0].target}`);
}
out.summary = { routes: routes.length, configs: CONFIGS.length, groups: n, nodes, byImpact, byRule };
const outArg = argv.includes('--out') ? argv[argv.indexOf('--out') + 1] : null;
writeFileSync(outArg || join(here, quick ? 'last-run-quick.json' : 'last-run.json'), JSON.stringify(out, null, 1));
console.log(`${routes.length} routes x ${CONFIGS.length} configs: ${n} violation groups, ${nodes} nodes`, JSON.stringify(byImpact), JSON.stringify(byRule));
for (const k of out.keyboard) console.log(k.ok ? 'ok  ' : 'FAIL', k.name, k.detail);
process.exit(out.keyboard.some((k) => !k.ok) ? 1 : 0);
