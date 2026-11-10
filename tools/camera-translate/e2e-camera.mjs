// End-to-end check of #/camera in headless Chromium, under the site's real Content-Security-Policy (read from _headers).
// Usage: node tools/camera-translate/e2e-camera.mjs <image> [--service] [screenshot.png]
//   default     no service configured: on-device reading + built-in word list
//   --service   starts the Python service on a loopback port (Tesseract + word list, no cloud) and points the page at it
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
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

async function startService(port) {
  const proc = spawn('python3', ['-m', 'uvicorn', 'camera_translate.app:app', '--host', '127.0.0.1', '--port', String(port), '--log-level', 'warning'],
    { cwd: here, env: { ...process.env, CAMERA_OCR: 'tesseract', CAMERA_TRANSLATE: 'word-list', GOOGLE_APPLICATION_CREDENTIALS: '' }, stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; proc.stderr.on('data', (d) => { err += d; });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/health`); if (r.ok) return { proc, health: await r.json() }; } catch { /* not up yet */ }
    if (proc.exitCode !== null) throw new Error(`service exited: ${err.slice(-400)}`);
    await new Promise((r) => setTimeout(r, 250));
  }
  proc.kill(); throw new Error('service did not start');
}

export async function runCamera({ image, service = false, shot, timeout = 120000 }) {
  const server = createAppServer(); await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  let svc = null; const port = 8790 + Math.floor(Math.random() * 500);
  if (service) svc = await startService(port);
  // Chrome asks the user before a page may call a loopback address (Local Network Access). A headless run cannot answer the
  // prompt, so the check is switched off for this test only; a real visitor is asked once when the service runs on their own computer.
  const browser = await chromium.launch({ args: service ? ['--disable-features=LocalNetworkAccessChecks'] : [] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 1100 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = []; const reqs = []; const posts = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('request', (r) => { reqs.push(r.url()); if (r.method() === 'POST') posts.push({ url: r.url(), type: r.headers()['content-type'], body: r.postDataBuffer() }); });
  const csp = siteCsp();
  await page.route(`${base}/`, async (route) => {      // the dev server sends no CSP: add the production one to the page itself
    const res = await route.fetch();
    await route.fulfill({ response: res, headers: { ...res.headers(), 'content-security-policy': csp } });
  });
  if (service) await page.route('**/data/camera/config.json', (route) => route.fulfill({ json: { schema: 1, backendUrl: `http://127.0.0.1:${port}` } }));
  try {
    await page.goto(`${base}/#/camera`, { waitUntil: 'load' });
    await page.waitForSelector('.camera-tr[data-mode]');
    const modeNote = await page.textContent('.camera-mode');
    const t0 = Date.now();
    await page.setInputFiles('.camera-tr input[type=file]:not([capture])', image);
    let sendNotice = null;
    if (service) { await page.waitForSelector('#camera-send'); sendNotice = await page.textContent('.camera-actions .note'); await page.click('#camera-send'); }
    await page.waitForSelector('.camera-out[data-done="1"]', { timeout });
    if (!(await page.$('.camera-out .stage'))) throw new Error(`no translated picture: ${await page.textContent('.camera-status')} | ${errors.join(' | ')}`);
    const ms = Date.now() - t0;
    const read = () => page.evaluate(() => ({
      hits: [...document.querySelectorAll('.camera-out .hit')].map((b) => ({ label: b.getAttribute('aria-label'), left: b.style.left, width: b.style.width })),
      lines: [...document.querySelectorAll('.camera-region-btn')].map((b) => b.textContent),
      alt: document.querySelector('.camera-out .stage img')?.alt, src: document.querySelector('.camera-out .stage img')?.src.slice(0, 5),
      toggle: document.querySelector('#camera-toggle')?.textContent ?? null, caption: document.querySelector('.camera-figure figcaption')?.textContent,
      save: document.querySelector('a[download]')?.getAttribute('download') ?? null, status: document.querySelector('.camera-status')?.textContent,
      h1: document.querySelector('h1')?.textContent, detail: document.querySelector('.camera-detail')?.textContent ?? null,
    }));
    const first = await read();
    if (shot) await page.screenshot({ path: shot, fullPage: true });
    let afterToggle = null; let detail = null; let words = null;
    if (first.toggle) { await page.click('#camera-toggle'); afterToggle = await read(); await page.click('#camera-toggle'); }
    if (first.hits.length) { await page.click('.camera-region-btn'); await page.waitForFunction(() => /English:|Sacred|No English/.test(document.querySelector('.camera-detail')?.textContent || '')); detail = (await read()).detail;
      await page.click('.camera-words-btn'); await page.waitForSelector('.camera-words .words, .camera-words h3 + p');
      words = await page.evaluate(() => [...document.querySelectorAll('.camera-words .words li')].map((li) => li.textContent)); }
    const imgNatural = await page.evaluate(() => { const i = document.querySelector('.camera-out .stage img'); return [i.naturalWidth, i.naturalHeight]; });
    const origins = [...new Set(reqs.map((u) => new URL(u).origin))];
    return { ms, modeNote, sendNotice, ...first, afterToggle, detail, words, dictionaryFetched: reqs.some((u) => u.endsWith('/data/vocab/index.json')), imgNatural, errors, origins, posts, health: svc?.health ?? null,
      externalOrigins: origins.filter((o) => !/^http:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(o) && !o.startsWith('blob:') && o !== 'null') };
  } finally { await browser.close(); server.close(); svc?.proc.kill(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2); const flags = args.filter((a) => a.startsWith('--')); const [image, shot] = args.filter((a) => !a.startsWith('--'));
  const r = await runCamera({ image, service: flags.includes('--service'), shot });
  console.log(JSON.stringify({ ...r, posts: r.posts.map((p) => ({ url: p.url, type: p.type, bytes: p.body?.length })) }, null, 1));
}
