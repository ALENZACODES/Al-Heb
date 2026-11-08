// Stale on-demand data after a version bump, in headless Chromium on a temp copy of the site (the repo is never modified).
// v1 is installed and warmed; then a data file (vocab tier shard with 6 added records and shifted ranks), the audio manifest, the word shard,
// a cache-first image and an app file change, the precache version is rebuilt (v2), the learner presses "Reload now", and every changed
// file must come back with its v2 bytes on the FIRST fetch, online and offline. Learner progress in localStorage must be untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { cpSync, rmSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../tools/serve.mjs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }

const TEST = ['data/vocab/packs/vocab5k-tier-500.json', 'data/audio/manifest.json', 'data/audio/manifest-words-sephardi.json', 'data/audio/summary.json', 'assets/screens/narrow-home.png', 'src/app.js'];

test('after a version bump, changed on-demand data, audio manifest, word shard, cache-first image and app file are served fresh; progress is kept', { skip: !chromium, timeout: 180000 }, async () => {
  const site = mkdtempSync(join(tmpdir(), 'alef-swupd-'));
  const browser = await chromium.launch();
  let srv;
  try {
    mkdirSync(join(site, 'tools')); mkdirSync(join(site, 'assets'));
    for (const f of ['index.html', 'offline.html', 'manifest.webmanifest', 'sw.js', 'src', 'data']) cpSync(join(root, f), join(site, f), { recursive: true });
    cpSync(join(root, 'assets/screens'), join(site, 'assets/screens'), { recursive: true });
    try { cpSync(join(root, 'assets/fonts'), join(site, 'assets/fonts'), { recursive: true }); } catch { /* optional */ }
    cpSync(join(root, 'tools/build-precache.mjs'), join(site, 'tools/build-precache.mjs'));
    const build = () => execFileSync(process.execPath, [join(site, 'tools/build-precache.mjs')], { cwd: site });
    const sha = (p) => createHash('sha256').update(readFileSync(join(site, p))).digest('hex').slice(0, 12);
    build();
    const v1 = Object.fromEntries(TEST.map((p) => [p, sha(p)]));
    srv = createAppServer({ root: site }); await new Promise((r) => srv.listen(0, r));
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true, veilOptOut: true })); });
    const base = `http://localhost:${srv.address().port}/`;
    await page.goto(base); await page.waitForSelector('body[data-ready="1"]', { timeout: 20000 });
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload(); await page.waitForSelector('body[data-ready="1"]');
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await page.evaluate(() => localStorage.setItem('alef:progress-qa', JSON.stringify({ marker: 'keep-me', n: 42 })));
    const probe = () => page.evaluate(async (urls) => {
      const out = {};
      for (const u of urls) { const r = await fetch(u); const h = await crypto.subtle.digest('SHA-256', await r.arrayBuffer()); out[u] = r.status + ':' + [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 12); }
      return out;
    }, TEST);
    await probe(); await page.waitForTimeout(1200); await probe(); await page.waitForTimeout(800);
    const before = await page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)])));
    assert.deepEqual(await probe(), Object.fromEntries(TEST.map((p) => [p, '200:' + v1[p]])), 'v1 baseline');

    await page.waitForTimeout(1500); // the baseline probe starts a background revalidation in the worker (stale-while-revalidate); let it finish before the files change, or it can store v2 early
    // ---- v2: a data file with 6 added records and shifted ranks, manifests, an image, an app file
    const j = (p, f) => { const o = JSON.parse(readFileSync(join(site, p), 'utf8')); f(o); writeFileSync(join(site, p), JSON.stringify(o)); };
    j('data/vocab/packs/vocab5k-tier-500.json', (o) => { const six = Array.from({ length: 6 }, (_, i) => ({ id: 'vqa' + i, rank: i + 1, lemma: 'qa' + i, pos: 'noun', gloss: 'added ' + i })); o.entries.forEach((e) => { e.rank += 6; }); o.entries.unshift(...six); o.count = o.entries.length; });
    j('data/audio/manifest.json', (o) => { o._qa = 'v2'; });
    j('data/audio/manifest-words-sephardi.json', (o) => { o._qa = 'v2'; });
    j('data/audio/summary.json', (o) => { o.recorded = 7; });
    appendFileSync(join(site, 'assets/screens/narrow-home.png'), Buffer.from('QAv2'));
    appendFileSync(join(site, 'src/app.js'), '\n// v2\n');
    build();
    const v2 = Object.fromEntries(TEST.map((p) => [p, sha(p)]));
    for (const p of TEST) assert.notEqual(v1[p], v2[p], p + ' must differ in v2');

    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await page.waitForFunction(() => { const b = document.getElementById('alef-update-banner'); return b && !b.hidden; }, null, { timeout: 15000 });
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update()); await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => document.querySelectorAll('#alef-update-banner:not([hidden])').length), 1, 'one update banner');
    // precached files are stale-while-revalidate inside the old worker, so only the on-demand files are asserted while the new worker waits
    const waiting = await probe();
    for (const p of TEST.filter((x) => x.startsWith('data/vocab/') || x.startsWith('data/audio/manifest') || x.startsWith('assets/'))) assert.equal(waiting[p], '200:' + v1[p], p + ' stays v1 until the learner reloads');

    const nav = page.waitForNavigation({ timeout: 20000 });
    await page.evaluate(() => [...document.querySelectorAll('#alef-update-banner button')].find((x) => /reload now/i.test(x.textContent)).click());
    await nav; await page.waitForSelector('body[data-ready="1"]'); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    assert.equal(await page.evaluate(() => document.querySelectorAll('#alef-update-banner:not([hidden])').length), 0, 'banner gone after reload');
    const want = Object.fromEntries(TEST.map((p) => [p, '200:' + v2[p]]));
    assert.deepEqual(await probe(), want, 'first fetch after the upgrade is v2');
    const keys = await page.evaluate(() => caches.keys());
    assert.equal(keys.filter((k) => k.startsWith('alef-shell-')).length, 1, JSON.stringify(keys));
    assert.equal(keys.filter((k) => k.startsWith('alef-data-')).length, 1, JSON.stringify(keys));
    await page.waitForTimeout(1500);
    await ctx.setOffline(true);
    assert.deepEqual(await probe(), want, 'offline after the upgrade still serves v2, not v1');
    await ctx.setOffline(false);
    assert.equal(await page.evaluate(() => JSON.stringify(Object.keys(localStorage).sort().map((k) => [k, localStorage.getItem(k)]))), before, 'localStorage untouched');
    await ctx.close();
  } finally { await browser.close(); srv?.close(); rmSync(site, { recursive: true, force: true }); }
});
