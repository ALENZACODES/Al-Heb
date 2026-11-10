// Item 02 (subpath): the built site must also work when it is served from a sub-folder (a GitHub Pages project site lives at
// /<repository>/). Serves dist/ with its _headers under /alef-sub/ and checks: the app starts, the service worker registers with a
// scope inside the sub-folder, it controls the page after a reload, and an offline reload still renders.
// Copy to tests/ when applied; add 'deploy.subpath' to the BROWSER list in tools/test/tiers.mjs (or rename to *.browser.test.js).
// Skipped locally without Playwright or dist/; with ALEF_REQUIRE_BROWSER=1 a missing prerequisite FAILS.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHeaders, startServer } from '../tools/deploy/check-deploy.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/opt/node-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
const must = process.env.ALEF_REQUIRE_BROWSER === '1';
const missing = !chromium ? 'Playwright not installed' : !existsSync(join(dist, 'index.html')) ? 'dist/ not built (node tools/deploy/build_site.mjs)' : false;
const PREFIX = '/alef-sub/';

// Forwards /alef-sub/<path> to the plain dist server as /<path>; anything outside the prefix is a 404, so a hard-coded absolute URL fails loudly.
function prefixed(inner) {
  const innerPort = inner.address().port;
  return http.createServer((req, res) => {
    if (!req.url.startsWith(PREFIX)) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('outside the sub-folder: ' + req.url); return; }
    const up = http.request({ host: '127.0.0.1', port: innerPort, path: '/' + req.url.slice(PREFIX.length), method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    up.on('error', () => { res.writeHead(502); res.end(); });
    req.pipe(up);
  });
}

test('dist subpath prerequisites are present (only enforced when ALEF_REQUIRE_BROWSER=1)', () => { if (must) assert.equal(missing, false, String(missing)); });

test('dist served from a sub-folder: app starts, service worker scope is inside it, reload is controlled, offline reload renders', { skip: must ? false : missing, timeout: 120000 }, async () => {
  const inner = await startServer(dist, parseHeaders(readFileSync(join(dist, '_headers'), 'utf8')));
  const outer = prefixed(inner); await new Promise((r) => outer.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${outer.address().port}${PREFIX}`;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ serviceWorkers: 'allow' });
    await ctx.addInitScript(() => { try { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); } catch { /* ignore */ } });
    const page = await ctx.newPage();
    const errors = []; page.on('pageerror', (e) => errors.push(e.message));
    const notFound = []; page.on('response', (r) => { if (r.status() === 404) notFound.push(r.url()); });
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 });
    const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
    assert.ok(scope.endsWith(PREFIX), `service worker scope ${scope} is inside ${PREFIX}`);
    for (const r of ['/learn', '/letters/alef', '/settings']) { await page.goto(`${base}#${r}`); await page.waitForTimeout(400); }
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
    await ctx.setOffline(true);
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 });
    assert.ok((await page.locator('#main').innerText()).length > 20, 'main has content offline');
    assert.deepEqual(errors, []);
    assert.deepEqual(notFound, [], 'no request fell outside the sub-folder or missed a file');
  } finally { await browser.close(); outer.close(); inner.close(); }
});
