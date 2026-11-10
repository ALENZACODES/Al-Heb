// Boot with browser APIs removed: no serviceWorker, no AudioContext, no speechSynthesis; and with storage that throws.
// The app must still start and render home, learn and settings. Headless Chromium via Playwright; skipped when Playwright is missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../tools/serve.mjs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }

const NO_APIS = `
  try { delete Navigator.prototype.serviceWorker; } catch (e) {}
  try { Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true }); delete navigator.serviceWorker; } catch (e) {}
  for (const k of ['AudioContext', 'webkitAudioContext', 'SpeechSynthesisUtterance', 'speechSynthesis', 'Audio', 'MediaRecorder', 'Notification', 'requestIdleCallback']) {
    for (let o = window; o; o = Object.getPrototypeOf(o)) { try { delete o[k]; } catch (e) {} }
    if (k in window) throw new Error('could not remove ' + k);
  }
`;
const NO_STORAGE = `
  const boom = () => { throw new DOMException('denied', 'SecurityError'); };
  for (const k of ['localStorage', 'sessionStorage']) { try { Object.defineProperty(window, k, { get: boom, configurable: true }); } catch (e) {} }
`;

async function visit(browser, base, init, routes, { onboarded }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  if (onboarded) await page.addInitScript(() => { try { localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); } catch (e) {} });
  await page.addInitScript(init);
  const seen = {};
  for (const r of routes) {
    await page.goto(base + '#' + r); await page.reload();
    await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 });
    seen[r] = await page.evaluate(() => ({ route: document.body.dataset.route, h1: document.querySelector('#main h1')?.textContent || '', failed: /failed to start/.test(document.getElementById('main').textContent), unavailable: !!document.querySelector('#main .unavailable, #main [data-kind="error"]'), kids: document.getElementById('main').children.length }));
  }
  const apis = await page.evaluate(() => ({ sw: 'serviceWorker' in navigator && !!navigator.serviceWorker, ac: !!(window.AudioContext || window.webkitAudioContext), ss: !!window.speechSynthesis }));
  await ctx.close();
  return { seen, errors, apis };
}

test('boots and renders home, learn, settings with serviceWorker, AudioContext and speechSynthesis removed', { skip: !chromium, timeout: 120000 }, async () => {
  const srv = createAppServer({ root }); await new Promise((r) => srv.listen(0, r));
  const base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  try {
    const { seen, errors, apis } = await visit(browser, base, NO_APIS, ['/', '/learn', '/settings'], { onboarded: true });
    assert.deepEqual(apis, { sw: false, ac: false, ss: false }, 'the test must really remove the APIs');
    for (const [r, v] of Object.entries(seen)) { assert.ok(v.h1 && v.kids > 0 && !v.failed && !v.unavailable, `${r}: ${JSON.stringify(v)}`); }
    assert.deepEqual([seen['/'].route, seen['/learn'].route, seen['/settings'].route], ['home', 'learn', 'settings']);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); srv.close(); }
});

test('boots and renders when localStorage and sessionStorage throw (welcome, learn, settings)', { skip: !chromium, timeout: 120000 }, async () => {
  const srv = createAppServer({ root }); await new Promise((r) => srv.listen(0, r));
  const base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  try {
    const { seen, errors } = await visit(browser, base, NO_STORAGE + NO_APIS, ['/learn', '/settings', '/'], { onboarded: false });
    for (const [r, v] of Object.entries(seen)) { assert.ok(v.h1 && v.kids > 0 && !v.failed && !v.unavailable, `${r}: ${JSON.stringify(v)}`); }
    assert.equal(seen['/learn'].route, 'learn'); assert.equal(seen['/settings'].route, 'settings');
    assert.equal(seen['/'].route, 'welcome', 'with nothing storable the first-run flow shows instead of home');
    assert.deepEqual(errors, []);
  } finally { await browser.close(); srv.close(); }
});

test('late audio manifest: refresh waits while a field has focus, then re-renders on blur; an edited field is never replaced', { skip: !chromium, timeout: 120000 }, async () => {
  const srv = createAppServer({ root }); await new Promise((r) => srv.listen(0, r));
  const base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  try {
    for (const edit of [false, true]) {
      const ctx = await browser.newContext({ serviceWorkers: 'block' });
      const page = await ctx.newPage();
      await page.addInitScript(() => { try { localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); } catch (e) {} });
      let release; const gate = new Promise((r) => { release = r; });
      await page.route('**/data/audio/manifest.json', async (route) => { await gate; await route.continue(); });
      await page.goto(base + '#/search'); await page.waitForSelector('body[data-ready="1"]');
      const sel = '#main input';
      await page.waitForSelector(sel);
      await page.evaluate((s) => { const el = document.querySelector(s); el.__marker = 1; el.focus(); }, sel);
      if (edit) await page.fill(sel, 'shalom');
      // the manifest is lazy: nothing has asked about a clip on this route, so ask the way a play button does (ensureManifest), while the field has focus
      assert.equal(await page.evaluate(() => document.body.dataset.audioManifest), 'idle', 'no clip asked about yet: the list is not loading');
      await page.evaluate(() => { window.alef.audio.ensureManifest(); });
      release();
      await page.waitForFunction(() => document.body.dataset.audioManifest && document.body.dataset.audioManifest !== 'checking', null, { timeout: 15000 });
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate((s) => document.querySelector(s)?.__marker === 1, sel), true, 'focused field must not be replaced while it has focus');
      await page.evaluate((s) => document.querySelector(s).blur(), sel);
      await page.waitForTimeout(400);
      const kept = await page.evaluate((s) => document.querySelector(s)?.__marker === 1, sel);
      assert.equal(kept, edit, edit ? 'an edited field is kept after blur' : 'after blur the view is re-rendered once so audio buttons reflect the manifest');
      await ctx.close();
    }
  } finally { await browser.close(); srv.close(); }
});

test('audio manifest and word shard are lazy: home and search never request them; a clip check loads the manifest, a word check the shard', { skip: !chromium, timeout: 120000 }, async () => {
  const srv = createAppServer({ root }); await new Promise((r) => srv.listen(0, r));
  const base = `http://localhost:${srv.address().port}/`;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const page = await ctx.newPage(); const errors = []; const urls = [];
    page.on('pageerror', (e) => errors.push(e.message)); page.on('request', (r) => urls.push(r.url().replace(base, '')));
    await page.addInitScript(() => { try { localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); } catch (e) {} });
    const audioReqs = () => urls.filter((u) => /^data\/audio\//.test(u));
    for (const r of ['#/', '#/search']) { await page.goto(base + r); await page.waitForSelector('body[data-ready="1"]'); await page.waitForTimeout(2500); }
    assert.deepEqual(audioReqs(), [], 'no audio data on routes that need no clip');
    assert.equal(await page.evaluate(() => document.body.dataset.audioManifest), 'idle');
    assert.match(await page.evaluate(() => document.getElementById('sound-status').textContent), /not been loaded/, 'sound bar shows the idle text');
    await page.evaluate(() => { window.alef.audio.has('letter', 'bet'); });
    await page.waitForFunction(() => document.body.dataset.audioManifest === 'ready', null, { timeout: 20000 });
    assert.ok(audioReqs().includes('data/audio/manifest.json'), 'a letter check loads the core manifest');
    assert.ok(!audioReqs().some((u) => /manifest-words/.test(u)), 'a letter check does not load the word shard');
    await page.evaluate(() => { window.alef.audio.has('word', 'x'); });
    await page.waitForFunction(() => ['loaded', 'fallback', 'offline'].includes(document.body.dataset.audioShard), null, { timeout: 20000 });
    assert.equal(audioReqs().filter((u) => /manifest-words/.test(u)).length >= 1, true, 'a word check loads a word shard');
    assert.deepEqual(errors, []);
    await ctx.close();
  } finally { await browser.close(); srv.close(); }
});
