// Vocabulary search on the real page. Skipped when Playwright is not installed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../tools/serve.mjs';

const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/usr/lib/node_modules/playwright']) {
  try { ({ chromium } = require(p)); break; } catch { /* next */ }
}
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chrome = process.env.CHROME_PATH || '/opt/google/chrome/chrome';

test('browser: #/vocab search for Hi ranks the transliteration before letter matches', { skip: !chromium, timeout: 120000 }, async () => {
  const server = createAppServer({ root, prefix: '/' });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(() => localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true, voice: 'f', congregation: 'sephardi' })));
    await page.goto(base + '#/vocab', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#vc-search', { timeout: 30000 });
    await page.waitForFunction(() => /Showing \d+ of \d+ words/.test(document.body.innerText), null, { timeout: 30000 });
    const before = await page.locator('#vc-status').innerText();
    assert.match(before, /Showing 40 of \d+ words/);
    await page.fill('#vc-search', 'Hi');
    await page.waitForFunction(() => /No exact English gloss for “Hi”/.test(document.getElementById('vc-status')?.textContent || ''));
    const status = await page.locator('#vc-status').innerText();
    assert.match(status, /No exact English gloss for “Hi”/);
    assert.match(status, /1 exact transliteration match/);
    assert.match(status, /related/);
    const first = await page.locator('#vc-list li').first();
    assert.equal(await first.getAttribute('data-band'), '4');
    assert.match(await first.innerText(), /she, it/);
    const second = page.locator('#vc-list li').nth(1);
    assert.equal(await second.getAttribute('data-band'), '6');
    assert.match(await second.innerText(), /this, this one/);
    await page.screenshot({ path: '/opt/cursor/artifacts/vocab-hi-after.png', fullPage: false });
    const ref = await page.evaluate(async () => {
      const t = await (await fetch('precache-manifest.js')).text();
      return (t.match(/ALEF_VERSION = "([^"]+)"/) || [])[1] || '';
    });
    assert.match(ref, /^[0-9a-f]{12}$/);
    await page.evaluate((version) => { document.title = 'served ' + version; }, ref);
  } finally {
    await browser.close();
    server.close();
  }
});
