// Phone QA regressions in headless Chromium: every v0 route at 360x640, 390x844 and 768x1024. Checks sizes and layout only
// (48px targets, no sideways scroll, the sound bar readable at the largest text size, Progress rows not broken one word per line,
// Welcome answers one per row on a tablet). It does not test a real phone, a finger or a screen reader.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createAppServer } from '../tools/serve.mjs';

const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
let chromium;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = createRequire(import.meta.url)(p)); break; } catch { /* next */ } }
const skip = !chromium;
const V0 = ['/', '/learn', '/letters', '/letters/atlas', '/letters/bet', '/progress', '/firstday', '/install', '/credits', '/privacy', '/offline', '/settings', '/welcome', '/search', '/about'];

async function withApp(fn) {
  const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  try { await fn({ browser, base }); } finally { await browser.close(); server.close(); }
}
async function open(browser, base, route, vp, settings = {}) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: vp.width < 720, serviceWorkers: 'block' });
  await ctx.addInitScript((s) => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true, ...s })); }, settings);
  const page = await ctx.newPage();
  await page.goto(base + '#' + route); await page.waitForSelector('body[data-ready="1"]'); await page.waitForTimeout(400);
  return { ctx, page };
}
const small = (page, min) => page.evaluate((MIN) => {
  const vis = (e) => { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('[hidden],[inert],.visually-hidden,.skip-link'); };
  const out = [];
  for (const e of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=switch]')) {
    if (!vis(e)) continue;
    const lab = e.closest('label'); const t = lab && /checkbox|radio/.test(e.type || '') && vis(lab) ? lab : e;
    if (e.tagName === 'A' && !e.classList.contains('btn') && getComputedStyle(e).display === 'inline') continue;
    if (e.closest('.kb')) continue; // the on-screen keyboard keys are 44px wide on purpose (13 keys in one row)
    const r = t.getBoundingClientRect(); if (r.height < MIN - 0.5 || (r.width < MIN - 0.5 && !e.matches('input[type=file]'))) out.push(`${e.tagName} "${(e.getAttribute('aria-label') || e.textContent || e.id || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return out;
}, min);

test('browser: on the 15 v0 routes no tap target is smaller than 48px tall at 360x640 and 390x844', { skip, timeout: 300000 }, async () => {
  await withApp(async ({ browser, base }) => {
    const bad = [];
    for (const vp of [{ width: 360, height: 640 }, { width: 390, height: 844 }]) for (const r of V0) { const { ctx, page } = await open(browser, base, r, vp); const s = await small(page, 48); if (s.length) bad.push(`${r} @${vp.width}: ` + s.slice(0, 4).join('; ')); await ctx.close(); }
    assert.deepEqual(bad, []);
  });
});

test('browser: no sideways scroll on the 15 v0 routes at 360x640, 390x844 and 768x1024', { skip, timeout: 300000 }, async () => {
  await withApp(async ({ browser, base }) => {
    const bad = [];
    for (const vp of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 768, height: 1024 }]) for (const r of V0) {
      const { ctx, page } = await open(browser, base, r, vp);
      const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      if (w[0] > w[1] + 1) bad.push(`${r} @${vp.width}: ${w[0]} > ${w[1]}`);
      await ctx.close();
    }
    assert.deepEqual(bad, []);
  });
});

test('browser: the sound bar message stays readable (not squeezed to a few letters) at the largest text size', { skip, timeout: 120000 }, async () => {
  await withApp(async ({ browser, base }) => {
    for (const vp of [{ width: 360, height: 640 }, { width: 390, height: 844 }]) {
      const { ctx, page } = await open(browser, base, '/learn', vp, { textSize: 'largest' });
      // The bar stays hidden until something asks for the recording list (pending), so a measurement here is 0px.
      // Ask the way a play button does (ensureManifest), then measure the status the learner actually sees.
      await page.evaluate(() => window.alef.audio.ensureManifest());
      await page.waitForFunction(() => { const bar = document.querySelector('.sound-bar'); return bar && !bar.hidden; });
      const w = await page.evaluate(() => document.querySelector('#sound-status').getBoundingClientRect().width);
      assert.ok(w >= 100, `sound message is ${w}px wide at ${vp.width} (it was 29px before the fix)`);
      await ctx.close();
    }
  });
});

test('browser: Progress "What have I practised?" rows keep the label on whole words at 360px', { skip, timeout: 60000 }, async () => {
  await withApp(async ({ browser, base }) => {
    const { ctx, page } = await open(browser, base, '/progress', { width: 360, height: 640 });
    const r = await page.evaluate(() => { const s = document.querySelector('[data-now="letters"] > span'); const lh = parseFloat(getComputedStyle(s).lineHeight) || 24; return { w: s.getBoundingClientRect().width, h: s.getBoundingClientRect().height, lh }; });
    assert.ok(r.w >= 200, `label is ${r.w}px wide`);
    assert.ok(r.h <= r.lh * 1.6, `label wraps to ${Math.round(r.h / r.lh)} lines`);
    await ctx.close();
  });
});

test('browser: Welcome answers each sit on their own row at 768px', { skip, timeout: 60000 }, async () => {
  await withApp(async ({ browser, base }) => {
    const { ctx, page } = await open(browser, base, '/welcome', { width: 768, height: 1024 });
    const tops = await page.evaluate(() => [...document.querySelectorAll('fieldset')].map((f) => [...f.querySelectorAll('label.opt-block')].map((l) => Math.round(l.getBoundingClientRect().top))).filter((a) => a.length > 1));
    assert.ok(tops.length >= 1);
    for (const t of tops) assert.equal(new Set(t).size, t.length, `answers share a row: ${t}`);
    await ctx.close();
  });
});
