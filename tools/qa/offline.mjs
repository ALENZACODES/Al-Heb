// Offline / update / storage QA. Runs a scripted Chromium against a COPY of the shipped files (precache list only) in a temp dir,
// so the "new version" can be simulated by changing the copy's precache-manifest.js version without touching the repo.
// Records only what the script observed. Usage: node tools/qa/offline.mjs [--out /tmp/offlineqa] [--json /tmp/offlineqa/results.json]
// Options: --engine chromium|firefox|webkit (default chromium), --viewport WxH (default 375x667), --offline setoffline|stop-server (default setoffline; stop-server stops the static server instead of calling context.setOffline, which WebKit cannot combine with a service worker). Firefox runs without isMobile (unsupported there).
// Browser: QA_CHROME, system Chrome/Chromium, or Playwright default (same lookup as v0-walk.mjs).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const out = resolve(arg('--out', '/tmp/offlineqa'));
const jsonOut = resolve(arg('--json', join(out, 'results.json')));
const engine = arg('--engine', 'chromium');
if (!['chromium', 'firefox', 'webkit'].includes(engine)) { console.error('--engine must be chromium|firefox|webkit'); process.exit(2); }
const vm = /^(\d+)x(\d+)$/.exec(arg('--viewport', '375x667'));
if (!vm) { console.error('--viewport must be WxH'); process.exit(2); }
const VP = { width: +vm[1], height: +vm[2] };
const offlineMode = arg('--offline', 'setoffline');
if (!['setoffline', 'stop-server'].includes(offlineMode)) { console.error('--offline must be setoffline|stop-server'); process.exit(2); }
const MOBILE = engine !== 'firefox'; // isMobile is not supported by Playwright Firefox
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });

let pw;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright']) { try { pw = require(p); break; } catch { /* next */ } }
const chromium = pw && pw[engine];
if (!chromium) { console.error('playwright not found'); process.exit(2); }

// ---- build the site copy from the precache list (+ sw.js, manifest, headers) ----
const site = join(out, 'site');
// QA_MANIFEST: optional path to a freshly generated precache-manifest.js (kept outside the repo) when the committed one is stale.
const manifestSrc = readFileSync(process.env.QA_MANIFEST || join(root, 'precache-manifest.js'), 'utf8');
const files = JSON.parse(/ALEF_PRECACHE = (\[[\s\S]*?\]);/.exec(manifestSrc)[1]);
// ALEF_ON_DEMAND files are not installed but the real host serves them (fetched later / by Download everything), so ship them in the copy too.
const onDemand = JSON.parse((/ALEF_ON_DEMAND = (\[[\s\S]*?\]);/.exec(manifestSrc) || [0, '[]'])[1]);
const missing = [];
// Lazy per-tradition word shards are NOT in the precache list (sw.js caches them at runtime on first use); ship them in the copy like the real host would.
import { readdirSync } from 'node:fs';
const shards = existsSync(join(root, 'data/audio')) ? readdirSync(join(root, 'data/audio')).filter((n) => /^manifest-words-[a-z]+\.json$/.test(n)).map((n) => 'data/audio/' + n) : [];
files.push(...[]);
for (const f of [...files, ...onDemand, ...shards, 'sw.js', 'precache-manifest.js']) {
  const s = f === 'precache-manifest.js' && process.env.QA_MANIFEST ? process.env.QA_MANIFEST : join(root, f); if (!existsSync(s)) { missing.push(f); continue; }
  mkdirSync(dirname(join(site, f)), { recursive: true }); copyFileSync(s, join(site, f));
}
const origVersion = /ALEF_VERSION = "([^"]+)"/.exec(manifestSrc)[1];

let server = createAppServer({ root: site });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/`;
const goOffline = async (ctx) => { if (offlineMode === 'setoffline') return ctx.setOffline(true); await new Promise((r) => { server.close(r); server.closeAllConnections?.(); }); };
const goOnline = async () => { if (offlineMode === 'stop-server') { server = createAppServer({ root: site }); await new Promise((r) => server.listen(port, '127.0.0.1', r)); } };

const R = { base, precacheFiles: files.length, lazyShardsServed: shards, missingFromPrecacheList: missing, origVersion, checks: [] };
const rec = (area, name, ok, detail = '') => { R.checks.push({ area, name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} [${area}] ${name}${detail ? ' :: ' + detail : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, ms = 10000, step = 150) => { const t = Date.now(); for (;;) { try { const v = await fn(); if (v) return v; } catch { /* retry */ } if (Date.now() - t > ms) return false; await sleep(step); } };

const tries = []; if (engine === 'chromium') { if (process.env.QA_CHROME) tries.push({ executablePath: process.env.QA_CHROME });
for (const p of ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']) if (existsSync(p)) tries.push({ executablePath: p }); }
tries.push({});
let browser, how;
for (const t of tries) { try { browser = await chromium.launch(t); how = t.executablePath || 'playwright default'; break; } catch { /* next */ } }
if (!browser) { console.error('no browser'); process.exit(2); }
R.offlineMode = offlineMode; R.browser = `${engine} ${how} ${browser.version()}`; R.engine = engine; R.viewport = VP;

const watch = (page, bag) => {
  page.on('pageerror', (e) => bag.pageerrors.push(String(e.message).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') bag.console.push(m.text().slice(0, 200)); if (m.type() === 'info' && /storage persistence/.test(m.text())) bag.persistInfo.push(m.text()); });
  page.on('requestfailed', (r) => bag.failed.push(r.url().replace(base, '/') + ' ' + (r.failure()?.errorText || '')));
};
const bag = () => ({ pageerrors: [], console: [], persistInfo: [], failed: [] });
const cacheKeys = (page) => page.evaluate(() => caches.keys());
const waitControlled = (page) => waitFor(() => page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && r.active && navigator.serviceWorker.controller); }), 20000);

// ================= 1. install + update flow =================
{
  const ctx = await browser.newContext({ viewport: VP });
  const page = await ctx.newPage(); const b = bag(); watch(page, b);
  await page.goto(base); await page.waitForSelector('#view-title, h1', { timeout: 15000 });
  // first load: worker installs; it controls this page only after claim
  const reg1 = await waitFor(() => page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return r?.active ? 'active' : false; }), 30000);
  rec('install', 'service worker reaches active on first visit', !!reg1);
  await page.reload(); await page.waitForSelector('h1');
  rec('install', 'page controlled by the worker after one reload', await waitControlled(page));
  const keys1 = await cacheKeys(page);
  rec('install', 'shell cache named for the version exists', keys1.includes(`alef-shell-${origVersion}`), JSON.stringify(keys1));
  const cnt = await page.evaluate(async (v) => (await (await caches.open(`alef-shell-${v}`)).keys()).length, origVersion);
  rec('install', 'shell cache holds every precache entry', cnt === files.length, `${cnt} cached of ${files.length} listed`);

  // bump the version in the served copy only
  writeFileSync(join(site, 'precache-manifest.js'), manifestSrc.replace(`"${origVersion}"`, '"qa-v2"'));
  const checked = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); return true; });
  const waiting = await waitFor(() => page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return r.waiting ? r.waiting.state : false; }), 20000);
  rec('update', 'new worker installs and WAITS (registration.waiting set)', waiting === 'installed', `state=${waiting}`);
  const active1 = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { active: r.active?.state, controlled: !!navigator.serviceWorker.controller }; });
  rec('update', 'old worker still active and controlling while the new one waits', active1.active === 'activated' && active1.controlled, JSON.stringify(active1));
  const keysW = await cacheKeys(page);
  rec('update', 'both shell caches exist while waiting (old kept, new filled)', keysW.includes(`alef-shell-${origVersion}`) && keysW.includes('alef-shell-qa-v2'), JSON.stringify(keysW));
  const banner = await waitFor(() => page.locator('#alef-update-banner').isVisible(), 8000);
  const txt = banner ? await page.locator('#alef-update-banner').innerText() : '';
  rec('update', 'update banner appears', !!banner, txt.replace(/\n/g, ' | '));
  await page.screenshot({ path: join(out, 'update-banner.png') });
  // Later hides it
  await page.locator('#alef-update-later').click();
  rec('update', '"Later" hides the banner without reloading', !(await page.locator('#alef-update-banner').isVisible()));
  // trigger another banner: run check again (same waiting worker => state unchanged, banner stays hidden by design). Re-show by a fresh page load.
  await page.reload(); await page.waitForSelector('h1');
  const banner2 = await waitFor(() => page.locator('#alef-update-banner').isVisible(), 6000);
  rec('update', 'banner shows again after a reload while the update is still waiting', !!banner2);
  // Reload now -> SKIP_WAITING -> controllerchange -> reload
  const msgs = []; await page.exposeFunction('__navCount', () => 0).catch(() => {});
  const navP = page.waitForEvent('framenavigated', { timeout: 15000 }).catch(() => null);
  await page.locator('#alef-update-reload').click();
  await navP; await sleep(1500); await page.waitForSelector('h1');
  const after = await waitFor(() => page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { waiting: !!r.waiting, active: r.active?.state, caches: await caches.keys() }; }), 10000);
  rec('update', 'Reload now applies the update: no waiting worker, old shell cache removed, new one kept', after && !after.waiting && after.caches.includes('alef-shell-qa-v2') && !after.caches.includes(`alef-shell-${origVersion}`), JSON.stringify(after));
  rec('update', 'banner gone after the update applied', !(await page.locator('#alef-update-banner').isVisible()));
  rec('update', 'page controlled after reload', await waitControlled(page));
  R.updateErrors = b;
  await ctx.close();
}

// restore the original manifest for the remaining sections
writeFileSync(join(site, 'precache-manifest.js'), manifestSrc);

// ================= 2. offline first load for v0 routes =================
// Scenario A: install, wait until the worker controls the page, go offline at once (no second online page load).
// Scenario B: same, plus one more online page load under the worker's control (this is when the lazy word shard gets cached), then offline.
const V0 = ['/', '/learn', '/letters', '/letters/atlas', '/letters/alef', '/progress', '/firstday', '/install', '/credits', '/privacy', '/offline', '/settings', '/welcome', '/search', '/about'];
for (const scen of ['A', 'B']) {
  const ctx = await browser.newContext({ viewport: VP });
  const page = await ctx.newPage(); const b = bag(); watch(page, b);
  await page.goto(base); await page.waitForSelector('h1', { timeout: 15000 });
  const ctl = await waitControlled(page);
  if (scen === 'B') { await page.reload(); await page.waitForSelector('h1'); await sleep(1500); }
  else await waitFor(() => page.evaluate(() => !!document.body.dataset.audioShardWarm), 15000); // app warms the shard through the worker after a fresh install
  const rtKeys = await page.evaluate(async () => { const k = await caches.keys(); const o = {}; for (const n of k) o[n] = (await (await caches.open(n)).keys()).filter((r) => /manifest-words/.test(r.url)).length; return o; });
  await goOffline(ctx);
  const rows = [];
  for (const r of V0) {
    const p2 = await ctx.newPage(); const b2 = bag(); watch(p2, b2);
    let navOk = true;
    try { await p2.goto(base + '#' + r, { waitUntil: 'load', timeout: 15000 }); } catch (e) { navOk = false; }
    let title = '', body = '', soundLine = '';
    if (navOk) {
      await waitFor(() => p2.locator('#view-title, h1').first().isVisible(), 6000);
      await sleep(500);
      title = (await p2.locator('#view-title, h1').first().innerText().catch(() => '')).slice(0, 60);
      body = await p2.evaluate(() => document.body.innerText.slice(0, 4000));
      soundLine = await p2.locator('#sound-status').innerText().catch(() => '');
    }
    const errText = /could not load|failed to load|Something went wrong|not available offline|Not available yet/i.test(body + ' ' + title);
    rows.push({ route: r, loaded: navOk, title, snippet: errText ? body.replace(/\s+/g, ' ').slice(0, 500) : '', errText, pageerrors: b2.pageerrors.length, failed: b2.failed.length, failedUrls: b2.failed.slice(0, 5), consoleErrors: b2.console.slice(0, 3), soundLine });
    await p2.close();
  }
  R['offlineRoutes' + scen] = rows; R['shardCacheBeforeOffline' + scen] = rtKeys;
  rec('offline', `scenario ${scen}: worker controls the page before going offline`, !!ctl, `word-shard entries per cache before offline: ${JSON.stringify(rtKeys)}`);
  for (const x of rows) rec('offline', `scenario ${scen}: first load offline ${x.route}`, x.loaded && !!x.title && !x.errText && x.pageerrors === 0, `title="${x.title}" failedRequests=${x.failed}${x.failed ? ' ' + x.failedUrls.join(' ') : ''}${x.snippet ? ' PAGE_TEXT=' + x.snippet : ''}`);
  if (scen === 'A') rec('offline', 'scenario A: active tradition word shard is in a cache before going offline (fresh-install warm-up)', Object.values(rtKeys).some((n) => n >= 1), JSON.stringify(rtKeys));
  const uniq = [...new Set(rows.map((x) => x.soundLine))];
  rec('offline', `info: scenario ${scen} sound-status line offline`, true, uniq.join(' || ').slice(0, 300));
  if (scen === 'B') {
    const p3 = await ctx.newPage();
    const r3 = await p3.goto(base + 'letters/alef', { timeout: 10000 }).then((r) => r?.status()).catch((e) => 'ERR ' + e.message.split('\n')[0]);
    await sleep(1200);
    // INFORMATIONAL: the app is hash-routed and loads src/app.js by a relative URL, so a deep path never boots (online or offline); recorded, not judged.
    rec('offline', 'info: offline navigation to /letters/alef (deep path, not an app URL) returns the cached shell document', r3 === 200, `status=${r3} h1 count=${await p3.locator('h1').count()} (0 online too, see report)`);
  }
  await ctx.close();
  await goOnline();
}

// ================= 2b. letter memory card offline right after install =================
// The chain data and code are installed; only the first-day letters' pictures are (tools/build-precache.mjs FIRST_DAY_LETTERS). Install, go offline at once
// (no second online load, so nothing came from the runtime cache), open the card for installed letters (picture must show) and for a later letter (picture is
// on demand: the card must still render and nothing may throw).
{
  const ctx = await browser.newContext({ viewport: VP });
  const page = await ctx.newPage(); const b = bag(); watch(page, b);
  await page.goto(base); await page.waitForSelector('h1', { timeout: 15000 });
  const ctl = await waitControlled(page);
  await goOffline(ctx);
  rec('memory-card', 'worker controls the page before going offline', !!ctl);
  for (const [route, label, wantPicture] of [['/firstday', 'first-day step (shin)', true], ['/letters/shin', 'letter page shin', true], ['/letters/tav', 'letter page tav (lesson r02)', true], ['/letters/kaf', 'letter page kaf (picture on demand)', false]]) {
    const p2 = await ctx.newPage(); const b2 = bag(); watch(p2, b2);
    let navOk = true;
    try { await p2.goto(base + '#' + route, { waitUntil: 'load', timeout: 15000 }); } catch (e) { navOk = false; }
    const gotCard = navOk && await waitFor(() => p2.locator('.mc').first().isVisible(), 8000);
    await sleep(900);
    const info = navOk ? await p2.evaluate(() => ({ card: !!document.querySelector('.mc'), picture: !!document.querySelector('.mc .mc-svg svg'), art: !!document.querySelector('.mc .mc-art') })) : { card: false, picture: false, art: false };
    // Firefox with context.setOffline: the worker's own network requests still go out (seen: kaf.svg arrived), so "picture NOT shown" cannot be judged there; use --offline stop-server.
    const cannotJudgeAbsence = !wantPicture && engine === 'firefox' && offlineMode === 'setoffline';
    rec('memory-card', `offline right after install: ${label}: card renders${wantPicture ? ' with its picture' : ' (picture not installed: letter and idea text only)'}${cannotJudgeAbsence ? ' [Firefox setoffline: absence not judged]' : ''}`, navOk && !!gotCard && info.card && (cannotJudgeAbsence || info.picture === wantPicture) && b2.pageerrors.length === 0, `card=${info.card} picture=${info.picture} pageerrors=${b2.pageerrors.length} failedRequests=${b2.failed.length}${b2.failed.length ? ' ' + b2.failed.slice(0, 3).join(' ') : ''}`);
    await p2.close();
  }
  await ctx.close();
  await goOnline();
}

// ================= 3. persistence request =================
{
  const ctx = await browser.newContext({ viewport: VP });
  await ctx.addInitScript(() => {
    window.__persistCalls = 0;
    try { // wrap on the prototype (Firefox rejects/aborts the instance-level rebind); never throw from the init script
      const proto = Object.getPrototypeOf(navigator.storage); const orig = proto.persist;
      proto.persist = async function () { window.__persistCalls++; const v = await orig.call(this); window.__persistResult = v; return v; };
    } catch (e) { window.__persistWrapError = String(e); }
  });
  const page = await ctx.newPage(); const b = bag(); watch(page, b);
  await page.goto(base); await page.waitForSelector('h1');
  await sleep(800);
  const c0 = await page.evaluate(() => window.__persistCalls);
  // Boot writes an empty streak record; that must not count as progress. The first real save asks, once.
  rec('persist', 'navigator.storage.persist() is NOT requested during boot (no real progress yet)', c0 === 0 && b.persistInfo.length === 0, `calls after load=${c0}`);
  await page.evaluate(() => window.alef.store.set('qa-progress', { n: 1 })); await sleep(600);
  // Firefox shows a permission prompt and the persist() promise stays pending until someone answers it (confirmed: still pending after 5 s,
  // headless), so there is no result and no log line there. The request itself (one call) is what the app controls; the log line needs a result.
  const pCalls = await page.evaluate(() => window.__persistCalls), pRes = await page.evaluate(() => window.__persistResult);
  const pendingPrompt = engine === 'firefox' && pRes === undefined && b.persistInfo.length === 0;
  rec('persist', 'first real (non-settings, non-boot) save requests persistence once', pCalls === 1 && (b.persistInfo.length === 1 || pendingPrompt), `calls=${pCalls} result=${pRes}${pendingPrompt ? ' (Firefox: prompt unanswered, promise pending)' : ''} log="${b.persistInfo.join(' | ')}"`);
  await page.evaluate(() => window.alef.store.set('qa-progress', { n: 2 })); await sleep(400);
  rec('persist', 'later saves do not ask again (once per page load)', (await page.evaluate(() => window.__persistCalls)) === 1);
  R.persistGranted = await page.evaluate(() => navigator.storage.persisted());
  await ctx.close();
}

// ================= 4. backup -> delete all -> restore =================
{
  const ctx = await browser.newContext({ viewport: VP, acceptDownloads: true });
  const page = await ctx.newPage(); const b = bag(); watch(page, b);
  await page.goto(base); await page.waitForSelector('h1'); await page.reload(); await waitControlled(page);
  const seed = { progress: { done: ['alef', 'bet'], n: 7 }, srs: { cards: { alef: { due: 12345, ease: 2.5 } } }, streak: { days: 3, last: '2026-11-03' } };
  await page.evaluate((s) => { for (const [k, v] of Object.entries(s)) window.alef.store.set(k, v); window.alef.settings.set({ congregation: 'sephardi', theme: 'dark' }); }, seed);
  await page.goto(base + '#/settings'); await page.waitForSelector('#s-import-label');
  const before = await page.evaluate(() => window.alef.store.exportData().data);
  const dl = page.waitForEvent('download', { timeout: 6000 });
  await page.getByRole('button', { name: /download backup/i }).click();
  const d = await dl; const file = join(out, 'backup.json'); await d.saveAs(file);
  const bj = JSON.parse(readFileSync(file, 'utf8'));
  rec('backup', 'backup file downloads, valid envelope', bj.app && bj.checksum && bj.data && Object.keys(bj.data).length >= 4, `${d.suggestedFilename()} keys=${Object.keys(bj.data).join(',')}`);
  // delete all (also confirm caches removed)
  const cachesBeforeNames = await cacheKeys(page); const cachesBefore = cachesBeforeNames.length;
  const goBtn = page.locator('#s-wipe-go');
  rec('backup', 'Delete button disabled until DELETE typed', await goBtn.isDisabled());
  await page.locator('#s-wipe-word').fill('DELETE'); await goBtn.click();
  const wiped = await waitFor(() => page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('alef')).length === 0), 6000);
  const cachesAfterNames = await cacheKeys(page); const cachesAfter = cachesAfterNames.length;
  rec('backup', 'delete all empties alef localStorage keys', !!wiped, `remaining=${await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('alef')).join(','))}`);
  rec('backup', 'delete all keeps the app shell cache (offline copy has no learner data) and removes no learner-specific cache (alef-data-* holds word shards, images, fonts: no learner data)', cachesBefore > 0 && cachesAfterNames.some((n) => n.startsWith('alef-shell-')) && cachesAfterNames.every((n) => /^alef-(shell|runtime|data)-/.test(n)), `before=${JSON.stringify(cachesBeforeNames)} after=${JSON.stringify(cachesAfterNames)}`);
  rec('backup', 'delete-all status text shown', /Deleted all saved progress/.test(await page.locator('[role=status], #s-status').allInnerTexts().then((a) => a.join(' '))), '');
  // restore
  await page.locator('#s-import').setInputFiles(file);
  const preview = await waitFor(() => page.getByRole('button', { name: 'Replace my progress with this backup' }).isVisible(), 6000);
  rec('backup', 'restore shows a preview before changing anything', !!preview, preview ? (await page.locator('[aria-label="Restore confirmation"]').innerText()).replace(/\n+/g, ' | ').slice(0, 200) : '');
  await page.getByRole('button', { name: 'Replace my progress with this backup' }).click(); await sleep(600);
  const afterData = await page.evaluate(() => window.alef.store.exportData().data);
  const same = JSON.stringify(Object.fromEntries(Object.entries(before).sort())) === JSON.stringify(Object.fromEntries(Object.entries(afterData).sort()));
  rec('backup', 'restored store equals the pre-delete store (all keys incl. settings)', same, `before=${Object.keys(before).length} keys, after=${Object.keys(afterData).length} keys`);
  await page.reload(); await page.waitForSelector('h1');
  const persisted = await page.evaluate(() => window.alef.store.get('progress'));
  rec('backup', 'restored data survives a reload', JSON.stringify(persisted) === JSON.stringify(seed.progress), JSON.stringify(persisted));
  // bad file
  writeFileSync(join(out, 'bad.json'), '{"not":"a backup"');
  await page.goto(base + '#/settings'); await page.waitForSelector('#s-import-label');
  await page.locator('#s-import').setInputFiles(join(out, 'bad.json')); await sleep(500);
  const st = (await page.locator('[role=status]').allInnerTexts()).join(' ');
  const stShort = (st.match(/Could not restore[^.]*\./) || [st.slice(0, 120)])[0];
  rec('backup', 'malformed backup file is rejected, data unchanged', /Could not restore/.test(st) && JSON.stringify(await page.evaluate(() => window.alef.store.get('progress'))) === JSON.stringify(seed.progress), stShort);
  // tampered checksum
  const tam = JSON.parse(readFileSync(file, 'utf8')); tam.data.progress.n = 99; writeFileSync(join(out, 'tamper.json'), JSON.stringify(tam));
  await page.locator('#s-import').setInputFiles(join(out, 'tamper.json')); await sleep(500);
  const st2 = (await page.locator('[role=status]').allInnerTexts()).join(' ');
  const st2Short = (st2.match(/Could not restore[^.]*\./) || [st2.slice(0, 120)])[0];
  rec('backup', 'backup with altered data (checksum mismatch) is rejected', /Could not restore/.test(st2) && (await page.evaluate(() => window.alef.store.get('progress'))).n === 7, st2Short);
  R.backupErrors = b;
  await ctx.close();
}

// ================= 5. localStorage corruption =================
{
  const cases = [
    ['alef:progress = malformed JSON', { 'alef:progress': '{"done":[' }],
    ['alef:settings = malformed JSON', { 'alef:settings': 'not json' }],
    ['alef:settings = wrong type (array)', { 'alef:settings': '[1,2,3]' }],
    ['alef:srs = null literal and alef:__meta garbage', { 'alef:srs': 'null', 'alef:__meta': '}}}' }],
    ['alef.storage-notice.v1 = malformed', { 'alef.storage-notice.v1': '{oops' }],
    ['alef:settings = huge-theme garbage values', { 'alef:settings': JSON.stringify({ theme: { x: 1 }, congregation: 42, lat: 'abc', voice: [] }) }],
  ];
  for (const [name, kv] of cases) {
    const ctx = await browser.newContext({ viewport: VP });
    const page = await ctx.newPage(); const b = bag(); watch(page, b);
    await page.goto(base); await page.waitForSelector('h1'); await sleep(500);
    await page.evaluate((o) => { for (const [k, v] of Object.entries(o)) localStorage.setItem(k, v); }, kv);
    const res = {};
    for (const r of ['/', '/progress', '/settings', '/learn']) {
      await page.goto(base + '#' + r); await page.reload(); await sleep(700);
      res[r] = (await page.locator('#view-title, h1').first().innerText({ timeout: 4000 }).catch(() => '')).slice(0, 40);
    }
    const ok = Object.values(res).every(Boolean) && b.pageerrors.length === 0;
    rec('corrupt', name, ok, `titles=${JSON.stringify(res)} pageerrors=${b.pageerrors.length}${b.pageerrors.length ? ' ' + b.pageerrors[0] : ''}`);
    // can the app write again / does export still work
    const exp = await page.evaluate(() => { try { const e = window.alef.store.exportData(); window.alef.store.set('qa-after', { ok: 1 }); return { keys: Object.keys(e.data), after: window.alef.store.get('qa-after') }; } catch (e) { return { err: String(e) }; } });
    rec('corrupt', `${name}: export + new write still work`, !exp.err && exp.after?.ok === 1, JSON.stringify(exp).slice(0, 160));
    await ctx.close();
  }
}

// ================= 6. install notice on an iOS-like UA =================
{
  const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
  const mk = (extra = {}) => browser.newContext({ viewport: VP, userAgent: IOS_UA, hasTouch: true, ...(MOBILE ? { isMobile: true } : {}), ...extra });
  const notice = (p) => p.locator('aside[aria-label="Keep your progress"]');
  // a. first visit: not shown
  let ctx = await mk(); let page = await ctx.newPage(); let b = bag(); watch(page, b);
  await page.goto(base); await page.waitForSelector('h1'); await sleep(600);
  rec('ios-notice', 'not shown on the first visit', (await notice(page).count()) === 0);
  const rec1 = await page.evaluate(() => localStorage.getItem('alef.storage-notice.v1'));
  // b. second day: seed first = 2 days ago
  await page.evaluate(() => localStorage.setItem('alef.storage-notice.v1', JSON.stringify({ first: Date.now() - 2 * 86400000, dismissed: false })));
  await page.reload(); await page.waitForSelector('h1'); await sleep(800);
  const shown = (await notice(page).count()) === 1 && (await notice(page).isVisible());
  const text = shown ? (await notice(page).innerText()).replace(/\n+/g, ' | ') : '';
  rec('ios-notice', 'shown on a return visit >= 1 day later (iPhone UA, not standalone)', shown, text);
  if (shown) { await page.screenshot({ path: join(out, 'ios-notice.png') }); const href = await notice(page).locator('a').getAttribute('href'); rec('ios-notice', '"How to add it" links to #/install', href === '#/install', href);
    await notice(page).getByRole('button', { name: 'Not now' }).click(); rec('ios-notice', '"Not now" removes it', (await notice(page).count()) === 0);
    await page.reload(); await page.waitForSelector('h1'); await sleep(500); rec('ios-notice', 'stays dismissed after reload', (await notice(page).count()) === 0); }
  rec('ios-notice', 'first-visit record written', !!rec1, rec1 || '');
  // install route on iOS UA
  await page.goto(base + '#/install'); await page.locator('h1', { hasText: 'Install ALEF' }).waitFor({ timeout: 8000 }).catch(() => {});
  const inst = (await page.locator('#main').innerText()).replace(/\n+/g, ' | ').slice(0, 400);
  rec('ios-notice', '#/install on iPhone UA mentions Share / Home Screen steps', /Share/i.test(inst) && /Home Screen/i.test(inst), inst.slice(0, 220));
  await ctx.close();
  // c. standalone (navigator.standalone true): not shown
  ctx = await mk(); await ctx.addInitScript(() => { Object.defineProperty(navigator, 'standalone', { value: true }); localStorage.getItem('alef.storage-notice.v1') || localStorage.setItem('alef.storage-notice.v1', JSON.stringify({ first: Date.now() - 5 * 86400000 })); });
  page = await ctx.newPage(); await page.goto(base); await page.waitForSelector('h1'); await sleep(600);
  rec('ios-notice', 'not shown when navigator.standalone is true', (await notice(page).count()) === 0);
  await ctx.close();
  // d. desktop UA after 5 days: not shown
  ctx = await browser.newContext({ viewport: { width: 1000, height: 700 } }); await ctx.addInitScript(() => { localStorage.getItem('alef.storage-notice.v1') || localStorage.setItem('alef.storage-notice.v1', JSON.stringify({ first: Date.now() - 5 * 86400000 })); });
  page = await ctx.newPage(); await page.goto(base); await page.waitForSelector('h1'); await sleep(600);
  rec('ios-notice', 'not shown on a desktop Chromium UA after 5 days', (await notice(page).count()) === 0);
  await ctx.close();
}

await browser.close(); server.close();
const fails = R.checks.filter((c) => !c.ok);
R.summary = { total: R.checks.length, passed: R.checks.length - fails.length, failed: fails.length };
writeFileSync(jsonOut, JSON.stringify(R, null, 1));
console.log(`\n${R.summary.passed}/${R.summary.total} passed; results -> ${jsonOut}`);
