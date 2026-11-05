import { pathToFileURL } from 'node:url';
// End-to-end check in headless Chromium: open #/scan, upload a generated SYNTHETIC test image, wait for real in-browser OCR, report what the page shows.
// Usage: node tools/ocr-bench/e2e-scan.mjs <image> [prayer|sign] [screenshot.png] [--online]
import { createRequire } from 'node:module';
import { createAppServer } from '../serve.mjs';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/usr/lib/node_modules/playwright')); }
const [image, mode = 'prayer', shot] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const online = process.argv.includes('--online');
export async function runScan({ image, mode = 'prayer', shot, online = false, timeout = 90000 }) {
  const server = createAppServer(); await new Promise((r) => server.listen(0, r));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 1100 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = []; const reqs = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('request', (r) => reqs.push(r.url()));
  try {
    await page.goto(`http://localhost:${server.address().port}/#/scan`, { waitUntil: 'load' });
    await page.waitForSelector('.photo-scan');
    await page.selectOption('.photo-scan select', mode);
    if (online) await page.check('#photo-online');
    const t0 = Date.now();
    await page.setInputFiles('.photo-scan input[type=file]', image);
    await page.waitForSelector('.photo-out[data-done="1"]', { timeout });
    const ms = Date.now() - t0;
    const info = await page.evaluate(() => ({
      ocrLines: [...document.querySelectorAll('.photo-ocrtext')].map((n) => n.textContent),
      cards: [...document.querySelectorAll('.photo-card h3')].map((n) => n.textContent),
      syllableButtons: document.querySelectorAll('.photo-syllable').length,
      matches: [...document.querySelectorAll('.photo-match')].map((n) => n.textContent),
      english: [...document.querySelectorAll('.photo-english')].map((n) => n.textContent),
      warns: [...document.querySelectorAll('.photo-warn')].map((n) => n.textContent),
      accuracyNotice: document.querySelector('.photo-accuracy')?.textContent ?? null,
      noTranslation: document.querySelector('.photo-no-translation')?.textContent ?? null,
      translateSetup: !!document.querySelector('.photo-translate-setup'),
      translitRows: [...document.querySelectorAll('.photo-translit')].map((d) => [...d.querySelectorAll('dt,dd')].map((n) => n.textContent)),
      letterButtons: document.querySelectorAll('.photo-letter').length, hearButtons: document.querySelectorAll('.photo-hear').length,
      missingEnglish: [...document.querySelectorAll('.photo-english-missing')].map((n) => n.textContent),
      engines: document.querySelector('.photo-engines')?.textContent, text: document.querySelector('.photo-out').textContent.slice(0, 200),
    }));
    if (shot) await page.screenshot({ path: shot, fullPage: true });
    const external = [...new Set(reqs.map((u) => new URL(u).origin))].filter((o) => !o.startsWith('http://localhost'));
    return { ms, ...info, errors, externalOrigins: external, vendorRequests: reqs.filter((u) => u.includes('/assets/vendor/')).map((u) => u.split('/').pop()) };
  } finally { await browser.close(); server.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(await runScan({ image, mode, shot, online }), null, 1));
