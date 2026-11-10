// End-to-end check of #/camera in headless Chromium, under the site's real Content-Security-Policy (read from _headers).
// The Camera Translator has no server: everything asserted here happens in the page.
// Usage: node tools/camera-translate/e2e-camera.mjs <image> [screenshot.png]
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createAppServer } from '../serve.mjs';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/usr/lib/node_modules/playwright')); }
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');

export function siteCsp() {
  const m = /Content-Security-Policy:\s*(.+)/.exec(readFileSync(join(root, '_headers'), 'utf8'));
  if (!m) throw new Error('no CSP in _headers');
  return m[1].trim();
}

/** Open the app with the production CSP on the page. Returns {server, browser, page, base, errors, reqs, posts}. */
export async function openApp({ viewport = { width: 390, height: 1100 }, launchArgs = [] } = {}) {
  const server = createAppServer(); await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  const browser = await chromium.launch(launchArgs.length ? { args: launchArgs } : {});
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = []; const reqs = []; const posts = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('request', (r) => { reqs.push(r.url()); if (r.method() !== 'GET') posts.push({ url: r.url(), method: r.method() }); });
  const csp = siteCsp();
  await page.route(`${base}/`, async (route) => {      // the dev server sends no CSP: add the production one to the page itself
    const res = await route.fetch();
    await route.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy': csp } });
  });
  return { server, browser, page, base, errors, reqs, posts };
}

export async function runCamera({ image, shot, timeout = 120000 }) {
  const { server, browser, page, base, errors, reqs, posts } = await openApp();
  try {
    await page.goto(`${base}/#/camera`, { waitUntil: 'load' });
    await page.waitForSelector('.camera-tr[data-mode]');
    const modeNote = await page.textContent('.camera-mode');
    const t0 = Date.now();
    await page.setInputFiles('.camera-tr input[type=file]:not([capture])', image);
    await page.waitForSelector('.camera-out[data-done="1"]', { timeout });
    if (!(await page.$('.camera-out .stage'))) throw new Error(`no result picture: ${await page.textContent('.camera-status')} | ${errors.join(' | ')}`);
    const ms = Date.now() - t0;
    const read = () => page.evaluate(() => ({
      hits: [...document.querySelectorAll('.camera-out .hit')].map((b) => ({ label: b.getAttribute('aria-label'), left: b.style.left, top: b.style.top, width: b.style.width })),
      lines: [...document.querySelectorAll('.camera-region-btn')].map((b) => b.textContent),
      alt: document.querySelector('.camera-out .stage img')?.alt, src: document.querySelector('.camera-out .stage img')?.src.slice(0, 5),
      toggle: document.querySelector('#camera-toggle')?.textContent ?? null, caption: document.querySelector('.camera-figure figcaption')?.textContent,
      save: document.querySelector('a[download]')?.getAttribute('download') ?? null, status: document.querySelector('.camera-status')?.textContent,
      notices: [...document.querySelectorAll('.camera-out > .note')].map((n) => n.textContent),
      h1: document.querySelector('h1')?.textContent, detail: document.querySelector('.camera-detail')?.textContent ?? null,
    }));
    const first = await read();
    if (shot) await page.screenshot({ path: shot, fullPage: true });
    // the translated photo exactly as the learner would save it (the page itself may not fetch blob: addresses under the site policy)
    let saved = null;
    if (first.save) { const [dl] = await Promise.all([page.waitForEvent('download'), page.click('a[download]')]); saved = readFileSync(await dl.path()); }
    let afterToggle = null; let detail = null; let words = null;
    if (first.toggle) { await page.click('#camera-toggle'); afterToggle = await read(); await page.click('#camera-toggle'); }
    if (first.hits.length) {
      await page.click('.camera-region-btn'); await page.waitForFunction(() => /English:|Sacred|No English/.test(document.querySelector('.camera-detail')?.textContent || '')); detail = (await read()).detail;
      if (await page.$('.camera-words-btn')) { await page.click('.camera-words-btn'); await page.waitForSelector('.camera-words .words, .camera-words h3 + p');
        words = await page.evaluate(() => [...document.querySelectorAll('.camera-words .words li')].map((li) => li.textContent)); }
    }
    const origins = [...new Set(reqs.map((u) => new URL(u).origin))];
    return { ms, modeNote, ...first, afterToggle, detail, words, saved, errors, origins, posts,
      dictionaryFetched: reqs.some((u) => u.endsWith('/data/vocab/index.json')),
      externalOrigins: origins.filter((o) => o !== base && !o.startsWith('blob:') && o !== 'null') };
  } finally { await browser.close(); server.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [image, shot] = process.argv.slice(2);
  const r = await runCamera({ image, shot });
  console.log(JSON.stringify({ ...r, saved: r.saved ? { bytes: r.saved.length } : null }, null, 1));
}
