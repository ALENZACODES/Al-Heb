// PWA checks in headless Chromium (no Lighthouse needed): installability (Chromium's own CDP verdict), offline reload on N routes with
// the service worker, update flow (a new precache version activates and replaces the old cache), persistence API, clear-site-data behaviour.
// Usage: node tools/lighthouse/pwa-check.mjs [--quick] [--out file]   -> prints ok/FAIL lines, writes tools/lighthouse/pwa-run.json, exit 1 on FAIL
// Honest limits: headless Chromium on Linux over http://localhost (a secure context); no real device, no iOS/Android install flow.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
if (!chromium) { console.error('playwright not found'); process.exit(2); }
const here = fileURLToPath(new URL('.', import.meta.url)); const root = join(here, '..', '..');
const quick = process.argv.includes('--quick');

// Static app server plus a front that lets us change the service worker's precache version between loads (to test the update flow).
const inner = createAppServer({ root }); await new Promise((r) => inner.listen(0, r));
const innerPort = inner.address().port;
let versionOverride = null; let swFetches = 0;
// Serve one snapshot of the precache list for the whole run, so a build-precache.mjs run by someone else in the same checkout cannot change it mid-test.
const precacheSnapshot = Buffer.from(await (await fetch(`http://localhost:${innerPort}/precache-manifest.js`)).arrayBuffer());
const front = createServer(async (req, res) => {
  const r = await fetch(`http://localhost:${innerPort}${req.url}`);
  let body = Buffer.from(await r.arrayBuffer());
  if (/\/precache-manifest\.js$/.test(req.url.split('?')[0])) body = versionOverride ? Buffer.from(precacheSnapshot.toString('utf8').replace(/ALEF_VERSION = "[^"]*"/, `ALEF_VERSION = "${versionOverride}"`)) : precacheSnapshot;
  if (/\/sw\.js$/.test(req.url.split('?')[0])) swFetches++;
  res.writeHead(r.status, { 'content-type': r.headers.get('content-type') || 'application/octet-stream', 'cache-control': 'no-cache' });
  res.end(body);
});
await new Promise((r) => front.listen(0, r));
const base = `http://localhost:${front.address().port}/`;

const results = [];
const note = (name, ok, detail = '', gap = false) => { results.push({ name, ok: !!ok, gap: !!gap && !ok, detail }); console.log(ok ? 'ok  ' : gap ? 'GAP ' : 'FAIL', name, detail); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
const page = await ctx.newPage();
const pageErrors = []; page.on('pageerror', (e) => pageErrors.push(e.message));

// ---- 1. install + precache
await page.goto(base + '#/welcome'); await page.waitForSelector('body[data-ready="1"]');
await page.evaluate(() => { localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); return navigator.serviceWorker.ready; });
await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 }).catch(() => {});
const sw1 = await page.evaluate(async () => ({ controller: !!navigator.serviceWorker.controller, caches: await caches.keys(), n: (await (await caches.open((await caches.keys()).find((k) => k.startsWith('alef-shell-')))).keys()).length }));
note('service worker registered and controlling the page', sw1.controller, JSON.stringify(sw1.caches));
note('precache filled (alef-shell-* cache has entries)', sw1.n > 50, `${sw1.n} entries`);

// ---- 2. installability (Chromium's own verdict) and manifest as parsed by the browser
const cdp = await ctx.newCDPSession(page);
try {
  const m = await cdp.send('Page.getAppManifest');
  note('manifest parses with no errors', !(m.errors || []).length, (m.errors || []).map((e) => e.message).join('; '));
  const inst = await cdp.send('Page.getInstallabilityErrors');
  const errs = (inst.installabilityErrors || []).map((e) => e.errorId);
  note('Chromium reports no installability errors', errs.length === 0, errs.join(', ') || 'none');
} catch (e) { note('Chromium installability check (CDP)', false, 'CDP call failed: ' + e.message); }

// ---- 3. offline reload on several routes
const ROUTES = ['/', '/learn', '/letters/alef', '/letters/atlas', '/sounds', '/read/priestly-blessing', '/vocab', '/calendar', '/settings'];
const routes = quick ? ROUTES.slice(0, 4) : ROUTES;
// warm the runtime caches the way a learner would have: a second online visit (the first one is not yet controlled by the SW, so
// runtime-cached files such as the audio word shard are only stored from the second load on), then each route once
await page.goto(base + '#/'); await page.reload(); await page.waitForSelector('body[data-ready="1"]'); await page.waitForTimeout(3500);
for (const r of ROUTES) { await page.goto(base + '#' + r); await page.waitForSelector('body[data-ready="1"]'); await page.waitForTimeout(500); }
await ctx.setOffline(true);
for (const r of routes) {
  const failed = []; const onFail = (rq) => failed.push(rq.url().replace(base, '')); page.on('requestfailed', onFail);
  const errBefore = pageErrors.length;
  let ok = true, detail = '';
  try {
    await page.goto(base + '#' + r); await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('body[data-ready="1"]', { timeout: 10000 }); await page.waitForTimeout(800);
    const s = await page.evaluate(() => ({ h1: document.querySelector('h1')?.textContent?.trim() || '', len: document.getElementById('main').innerText.length, unavailable: !!document.querySelector('.alef-unavailable'), offlinePage: /offline/i.test(document.title) && !document.querySelector('#nav a') }));
    ok = s.len > 80 && !s.unavailable && !s.offlinePage && !/not found/i.test(s.h1);
    detail = `h1="${s.h1}" textLen=${s.len}${failed.length ? ' failedRequests=' + failed.slice(0, 3).join(',') : ''}${pageErrors.length > errBefore ? ' pageErrors=' + pageErrors.slice(errBefore).join('|') : ''}`;
    if (failed.length || pageErrors.length > errBefore) ok = false;
  } catch (e) { ok = false; detail = e.message.split('\n')[0]; }
  page.off('requestfailed', onFail);
  note(`offline reload: ${r}`, ok, detail);
}
await ctx.setOffline(false);

// ---- 4. update flow: a new version of the precache list installs, takes over, and the old cache is removed
const oldKeys = await page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith('alef-shell-')));
versionOverride = 'update-test-v2';
const upd = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  const states = []; let changed = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { changed = true; });
  await reg.update();
  const w = reg.installing || reg.waiting; if (w) w.addEventListener('statechange', () => states.push(w.state));
  for (let i = 0; i < 150 && !(reg.active && reg.active.state === 'activated' && !reg.installing && !reg.waiting && (await caches.keys()).some((k) => k.endsWith('update-test-v2'))); i++) await new Promise((r) => setTimeout(r, 200));
  return { keys: (await caches.keys()), changed, activeState: reg.active?.state, sawNew: !!w };
});
note('update: a changed precache version installs a new SW and activates it (skipWaiting)', upd.sawNew && upd.activeState === 'activated' && upd.keys.some((k) => k.endsWith('update-test-v2')), JSON.stringify(upd.keys));
note('update: the old shell cache is deleted on activate', !upd.keys.some((k) => oldKeys.includes(k)), `old=${oldKeys.join(',')}`);
note('update: the open page receives controllerchange (it can offer a reload)', upd.changed, upd.changed ? '' : 'no controllerchange seen (page has the new SW only after reload, or events missed)');
const hasPrompt = await page.evaluate(() => /update|new version|reload/i.test(document.getElementById('announcer').textContent + document.body.innerText));
note('update: the app tells the learner a new version is ready', hasPrompt, hasPrompt ? '' : 'no visible update notice: the tab keeps running old code until reloaded', true);
versionOverride = null;

// ---- 5. persistence API and clear-site-data behaviour
const per = await page.evaluate(async () => ({ api: !!(navigator.storage && navigator.storage.persist), persisted: navigator.storage?.persisted ? await navigator.storage.persisted() : null }));
note('navigator.storage.persist is available in this browser', per.api, `persisted now: ${per.persisted}`);
await page.goto(base + '#/settings'); await page.waitForSelector('#s-persist'); await page.waitForTimeout(400);
const line = await page.textContent('#s-persist');
note('Settings states whether progress is protected', /protected|may remove|does not offer/.test(line), line.slice(0, 90));
// export a backup from Settings (real download), then simulate the learner clearing site data, then restore from the file
await page.evaluate(() => { window.alef.store.set('curriculum.progress', { completed: ['r01', 'r02', 'r03'] }); window.alef.store.set('srs.cards', { 'c:test': { due: 1, reps: 3 } }); });
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Download backup")')]);
const backupPath = join((await import('node:os')).tmpdir(), 'alef-pwa-backup.json'); await dl.saveAs(backupPath);
const backup = JSON.parse((await import('node:fs')).readFileSync(backupPath, 'utf8'));
note('Settings "Download backup" gives a JSON file with the progress keys', backup.app === 'alef' && backup.data['curriculum.progress']?.completed?.length === 3 && !!backup.data['srs.cards'], `${dl.suggestedFilename()}, ${Object.keys(backup.data).length} keys`);
await page.evaluate(async () => { localStorage.clear(); for (const k of await caches.keys()) await caches.delete(k); const regs = await navigator.serviceWorker.getRegistrations(); for (const r of regs) await r.unregister(); });
const errBefore = pageErrors.length;
await page.goto(base + '#/'); await page.reload(); await page.waitForSelector('body[data-ready="1"]');
note('after clearing site data the app starts again as a first run (welcome screen), no errors', await page.evaluate(() => location.hash === '#/welcome') && pageErrors.length === errBefore, await page.evaluate(() => location.hash));
note('after clearing site data the progress is gone (this is why the backup file matters)', await page.evaluate(() => !localStorage.getItem('alef:curriculum.progress')));
await page.goto(base + '#/settings'); await page.waitForSelector('#s-import');
// a bad file is refused and changes nothing
const badPath = join((await import('node:os')).tmpdir(), 'alef-pwa-bad.json'); (await import('node:fs')).writeFileSync(badPath, '{"hello":1}');
await page.setInputFiles('#s-import', badPath); await page.waitForTimeout(300);
note('restore: a file that is not an ALEF backup is refused with a message and changes nothing', /not an ALEF backup/.test(await page.textContent('main')) && await page.evaluate(() => !localStorage.getItem('alef:curriculum.progress')));
// a good file: nothing happens until the learner confirms
await page.setInputFiles('#s-import', backupPath); await page.waitForTimeout(300);
note('restore: choosing a good file only asks for confirmation (nothing is written yet)', await page.isVisible('button:has-text("Replace my progress")') && await page.evaluate(() => !localStorage.getItem('alef:curriculum.progress')));
const focusedOnConfirm = await page.evaluate(() => /Replace my progress/.test(document.activeElement?.textContent || ''));
note('restore: focus moves to the confirm button (keyboard and screen reader users land on it)', focusedOnConfirm);
await page.keyboard.press('Enter'); await page.waitForTimeout(300);
const restored = await page.evaluate(() => ({ prog: JSON.parse(localStorage.getItem('alef:curriculum.progress') || 'null'), cards: JSON.parse(localStorage.getItem('alef:srs.cards') || 'null'), onboarded: JSON.parse(localStorage.getItem('alef:settings') || '{}').onboarded }));
note('restore: Enter on the confirm button brings the progress back', restored.prog?.completed?.length === 3 && !!restored.cards?.['c:test'], JSON.stringify(restored).slice(0, 120));
note('restore: a status message reports how much was restored', /Restored \d+ saved items/.test(await page.textContent('main')));

await browser.close(); inner.close(); front.close();
const outArg = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : null;
writeFileSync(outArg || join(here, 'pwa-run.json'), JSON.stringify({ when: new Date().toISOString(), quick, results }, null, 1));
const bad = results.filter((r) => !r.ok && !r.gap), gaps = results.filter((r) => r.gap);
console.log(`${results.filter((r) => r.ok).length} ok, ${bad.length} FAIL, ${gaps.length} known gaps`);
process.exit(bad.length ? 1 : 0);
