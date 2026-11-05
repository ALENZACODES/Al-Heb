// Focus must survive the quiet re-render that follows a lazy audio manifest / word-shard load (src/app.js show(..., { quiet: true })).
// Deterministic: the manifest and shard responses are held by the test and released after the heading has focus. Skipped without Playwright.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../tools/serve.mjs';
const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Open /learn?lesson=r01 with the core manifest and/or the word shard held until released. Returns helpers. */
async function open(hold) {
  const server = createAppServer({ root, prefix: '/' }); await new Promise((r) => server.listen(0, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx.addInitScript(() => localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })));
  const held = { manifest: [], shard: [] };
  const gates = {};
  const gate = (kind) => ((route) => { held[kind].push(route); });
  if (hold.manifest) await ctx.route(/\/data\/audio\/manifest\.json(\?|$)/, gate('manifest'));
  if (hold.shard) await ctx.route(/\/data\/audio\/manifest-words-[a-z]+\.json(\?|$)/, gate('shard'));
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(`http://localhost:${server.address().port}/#/learn?lesson=r01`);
  await page.waitForSelector('body[data-ready="1"]');
  const release = async (kind) => { const rs = held[kind].splice(0); await Promise.all(rs.map((r) => r.continue())); return rs.length; };
  const waitHeld = async (kind) => { for (let i = 0; i < 200 && !held[kind].length; i++) await page.waitForTimeout(25); assert.ok(held[kind].length, `${kind} request was made and is being held`); };
  const close = async () => { await browser.close(); await new Promise((r) => server.close(r)); };
  return { page, errs, release, waitHeld, close, gates };
}
/** Focus the heading, tag it, and count how many times the tagged element is removed from the page (= quiet re-renders that replaced it). */
const arm = (page) => page.evaluate(() => {
  const h = document.getElementById('view-title'); h.dataset.old = '1'; h.focus({ preventScroll: true });
  window.__replaced = 0;
  new MutationObserver(() => { if (window.__replaced === 0 && !document.querySelector('#view-title[data-old]')) window.__replaced = 1; }).observe(document.getElementById('main'), { childList: true, subtree: true });
  return document.activeElement.id;
});
const settled = (page) => page.waitForFunction(() => window.__replaced === 1 && document.body.dataset.audioManifest === 'ready' && document.getElementById('main').getAttribute('aria-busy') !== 'true', null, { timeout: 15000 });

test('a quiet refresh after the delayed audio manifest keeps focus on #view-title', { skip: !chromium, timeout: 60000 }, async () => {
  const t = await open({ manifest: true });
  try {
    await t.waitHeld('manifest');
    assert.equal(await arm(t.page), 'view-title', 'heading has focus before the refresh');
    await t.release('manifest');
    await settled(t.page);
    assert.equal(await t.page.evaluate(() => document.activeElement?.id), 'view-title', 'focus still on the heading after the quiet re-render');
    assert.equal(await t.page.evaluate(() => !!document.getElementById('view-title').dataset.old), false, 'the heading was in fact re-rendered');
    assert.deepEqual(t.errs, []);
  } finally { await t.close(); }
});

test('a quiet refresh after the delayed word shard keeps focus on #view-title', { skip: !chromium, timeout: 60000 }, async () => {
  const t = await open({ shard: true });
  try {
    await t.waitHeld('shard');
    await t.page.waitForFunction(() => document.body.dataset.audioManifest === 'ready'); // the core manifest is not held here
    await t.page.waitForTimeout(300);
    assert.equal(await arm(t.page), 'view-title');
    await t.release('shard');
    await t.page.waitForFunction(() => ['loaded', 'fallback'].includes(document.body.dataset.audioShard), null, { timeout: 15000 });
    await t.page.waitForFunction(() => window.__replaced === 1, null, { timeout: 15000 });
    assert.equal(await t.page.evaluate(() => document.activeElement?.id), 'view-title');
    assert.deepEqual(t.errs, []);
  } finally { await t.close(); }
});

test('two overlapping quiet refreshes (manifest and shard released together) still leave focus on #view-title', { skip: !chromium, timeout: 60000 }, async () => {
  const t = await open({ manifest: true, shard: true });
  try {
    await t.waitHeld('manifest');
    await t.waitHeld('shard'); // the lesson asked about word clips as well, so both loads are in flight
    assert.equal(await t.page.evaluate(() => { const h = document.getElementById('view-title'); h.focus({ preventScroll: true }); return document.activeElement.id; }), 'view-title');
    // count re-renders of the view from now on (each quiet show() empties and refills #main)
    await t.page.evaluate(() => { window.__renders = 0; new MutationObserver((ms) => { for (const m of ms) if (m.removedNodes.length) window.__renders++; }).observe(document.getElementById('main'), { childList: true }); });
    await Promise.all([t.release('manifest'), t.release('shard')]); // both land within the same moment: the second refresh starts while the first is still mounting
    await t.page.waitForFunction(() => document.body.dataset.audioManifest === 'ready' && ['loaded', 'fallback'].includes(document.body.dataset.audioShard) && document.getElementById('main').getAttribute('aria-busy') !== 'true', null, { timeout: 15000 });
    await t.page.waitForTimeout(500);
    assert.ok(await t.page.evaluate(() => window.__renders) >= 1, 'the view was re-rendered at least once');
    assert.equal(await t.page.evaluate(() => document.activeElement?.id), 'view-title', 'focus kept through both refreshes');
    assert.equal(await t.page.evaluate(() => document.body.dataset.ready), '1');
    assert.deepEqual(t.errs, []);
  } finally { await t.close(); }
});
