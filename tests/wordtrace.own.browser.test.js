// "Trace Your Own Word" on the real Word Trace page in headless Chromium. The vowel mark pack is not on the test device, so this
// checks the real no-pack path (the vendored loader looks at this device's storage and finds nothing), a word typed with its own
// marks, a list word, and the Name. It does not run the pack itself.
// Skipped when Playwright is not installed (browser tier: node tools/test/run.mjs browser).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../tools/serve.mjs';

const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { chromium = require(p).chromium; break; } catch { /* next */ } }
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skip = !chromium;
const POINTS = /[ְ-ׇּׁׂ]/;

async function withApp(fn) {
  const server = createAppServer({ root, prefix: '/' });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await ctx.addInitScript((s) => { localStorage.setItem('alef:settings', JSON.stringify(s)); }, { onboarded: true, veilOptOut: true });
    const page = await ctx.newPage(); const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await fn(page, base, errors);
  } finally { await browser.close(); server.close(); }
}

const NAME = 'יהוה';
const UNLISTED = 'מקרר', UNLISTED_MARKED = 'מְקָרֵר';
// The button is put mid-screen first: a button resting in the strip kept clear for the bottom bar scrolls when it takes focus.
async function typeWord(page, text) { await page.locator('[data-act=own-input]').fill(text); await page.locator('[data-act=own-go]').evaluate((b) => b.scrollIntoView({ block: 'center' })); await page.locator('[data-act=own-go]').click(); }

test('browser: own word without the pack points to Settings and fetches no pack; the Name is refused', { skip, timeout: 90000 }, async () => {
  await withApp(async (page, base, errors) => {
    const packs = [];
    page.on('request', (r) => { if (/_packs\/|alef-packs|\.onnx|pack\.json/.test(r.url())) packs.push(r.url()); });
    await page.goto(base + '#/words/trace?any=1', { waitUntil: 'load' });
    await page.waitForSelector('[data-act=own-input]', { timeout: 30000 });
    await typeWord(page, NAME);
    await page.waitForFunction(() => /does not offer the Name/.test(document.querySelector('[data-role=own-note]')?.textContent || ''), null, { timeout: 10000 });
    await typeWord(page, UNLISTED);
    await page.waitForFunction(() => /pack is not on this device/.test(document.querySelector('[data-role=own-note]')?.textContent || ''), null, { timeout: 30000 });
    assert.equal(await page.locator('[data-role=own-more] a').getAttribute('href'), '#/settings');
    assert.equal(await page.locator('[data-role=target]').count(), 0, 'nothing starts');
    assert.deepEqual(packs, [], 'no pack file or pack list was requested');
    assert.deepEqual(errors, []);
  });
});

test('browser: a word typed with its own marks is traced as typed, with the note that Aleph has not checked it', { skip, timeout: 90000 }, async () => {
  await withApp(async (page, base, errors) => {
    await page.goto(base + '#/words/trace?any=1', { waitUntil: 'load' });
    await page.waitForSelector('[data-act=own-input]', { timeout: 30000 });
    await typeWord(page, UNLISTED_MARKED);
    await page.waitForSelector('[data-role=target]', { timeout: 30000 });
    assert.equal((await page.locator('[data-role=target]').textContent()).normalize('NFC'), UNLISTED_MARKED.normalize('NFC'));
    assert.match(await page.locator('[data-role=own-source]').textContent(), /marks you typed/);
    assert.ok(await page.locator('[data-role=strip] svg').count() >= 4, 'a tracing cell for each letter');
    await page.locator('[data-act=back]').click();
    await page.locator('[data-act=own-input]').fill(UNLISTED_MARKED); await page.locator('[data-act=own-input]').press('Enter');
    await page.waitForSelector('[data-role=target]', { timeout: 30000 });
    assert.deepEqual(errors, []);
  });
});
