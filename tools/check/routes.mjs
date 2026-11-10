// Route check: loads EVERY route in src/shell/router.js in headless Chromium (Playwright) against tools/serve.mjs and prints
// a table: uncaught exceptions, console errors, failed network requests (4xx/5xx/aborted), whether the view rendered
// (#view-title or an <h1> inside #main, plus child count) and the document title.
// Usage: node tools/check/routes.mjs [--json out.json] [--only name,name] [--timeout ms]
// Exit code 1 when any route has an uncaught exception, a failed request or no rendered view.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { createAppServer } from '../serve.mjs';
import { ROUTES } from '../../src/shell/router.js';

const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
if (!chromium) { console.error('Playwright is not installed; nothing checked.'); process.exit(2); }

const root = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const only = opt('--only', '') ? new Set(opt('--only', '').split(',')) : null;
const timeout = Number(opt('--timeout', 15000));
const jsonOut = opt('--json', '');

/** Sample values for path parameters; every id below exists in data/ at the time of writing (see docs/test/LINK-CHECK-2026-11-07.md). */
export const SAMPLE_PARAMS = {
  '/letters/:id': { id: 'alef' },
  '/loanwords/:group': { group: 'lw1' },
  '/spotit/:letter': { letter: 'alef' },
  '/dialogues/:id': { id: 'd-cafe' },
  '/phrases/:id': { id: 'pb-greetings-01' },
  '/fade/:id': { id: 'bless-priestly-1' },
  '/israel/:sec': { sec: 'etiquette' },
  '/classtrack/:week': { week: '1' },
  '/classtrack/:week/:mode': { week: '1', mode: 'handout' },
  '/book/:id': { id: 'book1' },
  '/festivals/:id': { id: 'rosh-hashanah' },
  '/intermediate/:id': { id: 'I-01' },
  '/grammar/:topic': { topic: 'article' },
  '/rules/:rule': { rule: 'kamatz' },
  '/read/:textId': { textId: 'bless-priestly-1' },
  '/torahread/:section': { section: 'aliyah' },
};

/** 404s that the app treats as optional (the <img> removes itself on error, see src/games/arcade.js art()); reported, not failed. */
export const OPTIONAL_404 = [/^404 \/assets\/games\/arcade\/[a-z0-9-]+\/(env|[a-z0-9-]+)\.png$/, /^404 \/assets\/games\/arcade\/letters\/[a-z-]+\.png$/];
const isOptional404 = (f) => OPTIONAL_404.some((re) => re.test(f));

export function samplePath(route) {
  const params = SAMPLE_PARAMS[route.pattern] || {};
  return route.pattern.replace(/:([A-Za-z]+)/g, (_, k) => { if (!(k in params)) throw new Error(`no sample for :${k} in ${route.pattern}`); return encodeURIComponent(params[k]); });
}

const srv = createAppServer({ root }); await new Promise((r) => srv.listen(0, r));
const base = `http://localhost:${srv.address().port}/`;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errors = [], consoleErrors = [], failed = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url().replace(base, '/')}`); });
page.on('requestfailed', (r) => failed.push(`${r.failure()?.errorText || 'failed'} ${r.url().replace(base, '/')}`));
await page.addInitScript(() => { try { localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true, veilOptOut: true })); } catch (e) { /* storage blocked */ } });

const rows = [];
for (const route of ROUTES) {
  if (only && !only.has(route.name)) continue;
  const path = samplePath(route);
  errors.length = 0; consoleErrors.length = 0; failed.length = 0;
  const row = { name: route.name, path, tier: route.tier, optional: !!route.optional, ok: false, rendered: false, title: '', h1: '', kids: 0, bodyRoute: '', errors: [], consoleErrors: [], failed: [], note: '' };
  try {
    await page.goto(base + '#' + path, { waitUntil: 'load' });
    await page.reload({ waitUntil: 'load' }); // a fresh boot per route: no leftovers from the previous view
    await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout });
    await page.waitForTimeout(400); // let lazy data (fetch) and first paints settle
    const r = await page.evaluate(() => {
      const main = document.getElementById('main');
      const h1 = main?.querySelector('#view-title, h1');
      const text = main?.textContent || '';
      return { h1: h1?.textContent?.trim() || '', kids: main ? main.children.length : 0, title: document.title, bodyRoute: document.body.dataset.route || '',
        unavailable: !!main?.querySelector('.unavailable, [data-kind="error"]') || /not available yet|failed to start|did not load/i.test(text) };
    });
    Object.assign(row, { h1: r.h1, kids: r.kids, title: r.title, bodyRoute: r.bodyRoute });
    row.rendered = !!r.h1 && r.kids > 0;
    if (r.unavailable) row.note = 'view says unavailable / error';
    if (r.bodyRoute && r.bodyRoute !== route.name) row.note += (row.note ? '; ' : '') + `matched route "${r.bodyRoute}"`;
  } catch (e) { row.note = 'load: ' + String(e.message || e).split('\n')[0]; }
  row.errors = [...errors]; row.consoleErrors = [...consoleErrors];
  const uniq = [...new Set(failed)]; row.failed = uniq.filter((f) => !isOptional404(f)); row.optional404 = uniq.filter(isOptional404);
  row.ok = row.rendered && !row.errors.length && !row.failed.length && !/unavailable|error/.test(row.note);
  rows.push(row);
  const flag = row.ok ? 'ok  ' : 'FAIL';
  console.log(`${flag} ${route.name.padEnd(18)} ${path.padEnd(28)} h1="${row.h1.slice(0, 40)}" kids=${row.kids}${row.errors.length ? ' exc=' + row.errors.length : ''}${row.consoleErrors.length ? ' cons=' + row.consoleErrors.length : ''}${row.failed.length ? ' net=' + row.failed.join(' | ') : ''}${row.optional404.length ? ' optional-art-404=' + row.optional404.length : ''}${row.note ? ' note=' + row.note : ''}`);
}
await browser.close(); srv.close();

const bad = rows.filter((r) => !r.ok);
console.log(`\n${rows.length} routes checked, ${bad.length} with problems.`);
for (const r of bad) { console.log(`- ${r.name} ${r.path}: ${[r.note, ...r.errors.map((e) => 'exception: ' + e), ...r.failed.map((f) => 'request: ' + f)].filter(Boolean).join('; ')}`); }
const withOpt = rows.filter((r) => r.optional404.length);
if (withOpt.length) console.log(`\noptional art missing (404, the app removes the <img>; not counted as failures): ${withOpt.length} routes, e.g. ${withOpt[0].optional404[0]}`);
const withConsole = rows.filter((r) => r.consoleErrors.length && r.consoleErrors.some((c) => !/404/.test(c)));
if (withConsole.length) { console.log(`\nconsole errors other than 404 (not counted as failures):`); for (const r of withConsole) console.log(`- ${r.name}: ${r.consoleErrors.map((c) => c.slice(0, 160)).join(' | ')}`); }
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(rows, null, 1));
process.exit(bad.length ? 1 : 0);
