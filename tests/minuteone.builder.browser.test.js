// The word builder on the real page in headless Chromium: #/firstwin → pre-screens → build שלום by clicking tiles → the pointed word,
// transliteration and English show, the Israeli clip for the chosen voice is requested, the tally is saved, no console errors.
// Headless Chromium has no audio output: nothing is heard here; the request and the status line are what is checked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { createAppServer } from '../tools/serve.mjs';
import { pointedKey } from '../tools/firstday/build-wordlist.mjs';

const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chrome = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || '/opt/google/chrome/chrome';
const skip = !chromium;

async function withBuilder(settings, stored, fn) {
  const server = createAppServer({ root, prefix: '/' });
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ executablePath: chrome, headless: true });
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' });
    await ctx.addInitScript(({ s, st }) => {
      localStorage.setItem('alef:settings', JSON.stringify(s));
      for (const [k, v] of Object.entries(st || {})) localStorage.setItem(k, JSON.stringify(v));
      window.__played = []; const P = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () { window.__played.push(this.currentSrc || this.src); return P.apply(this, arguments); };
    }, { s: { onboarded: true, veilOptOut: true, ...settings }, st: stored }); // veilOptOut: the opening-prayer veil would sit over the tiles
    const page = await ctx.newPage();
    const errors = [], requests = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('request', (r) => { const p = new URL(r.url()).pathname; if (p.startsWith('/audio/')) requests.push(p); });
    await page.goto(base + '#/firstwin', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#firstwin', { timeout: 30000 });
    await fn(page, { errors, requests, base });
  } finally { await browser.close(); server.close(); }
}

const tile = (page, he) => page.locator(`#firstwin .fw-tile[data-he="${he}"]`).first();
/** Manifest rows for Israeli word clips, by "voice|id": the player may pick any clip of the same pointed text in the same voice. */
const ROWS = new Map(['data/audio/manifest-words-israeli.json', 'data/audio/manifest-kind-word.json']
  .flatMap((m) => JSON.parse(fs.readFileSync(join(root, m), 'utf8'))).filter((e) => e.tradition === 'israeli' && e.kind === 'word').map((e) => [`${e.voice}|${e.id}`, e]));
const wordClipsRequested = (requests, voice, he) => requests.filter((p) => {
  const m = p.match(new RegExp(`^/audio/${voice}/israeli/word/(.+)\\.mp3$`)); if (!m) return false;
  const row = ROWS.get(`${voice}|${m[1]}`); return !!row && pointedKey(row.text) === pointedKey(he);
});

test('browser: first visit — splash, three choices, then שלום built by clicking six open tiles; the woman Israeli clip is requested, the word is said on screen, the tally is saved', { skip, timeout: 180000 }, async () => {
  await withBuilder({ congregation: 'israeli', voice: 'f' }, {}, async (page, { errors, requests }) => {
    await page.locator('#firstwin button:has-text("Begin")').click();
    await page.locator('#firstwin button:has-text("Family & heritage")').click();
    await page.locator('#firstwin button:has-text("start me at zero")').click();
    await page.locator('#firstwin button:has-text("5 minutes")').click();
    await page.waitForSelector('#firstwin .fw-tray .fw-tile', { timeout: 30000 });
    await page.waitForFunction(() => /words can be built here/.test(document.querySelector('#firstwin')?.innerText || ''), null, { timeout: 30000 });
    const open = await page.locator('#firstwin .fw-tray-row .fw-tile').evaluateAll((els) => els.map((e) => e.getAttribute('data-he')));
    assert.deepEqual(open, ['א', 'ב', 'ו', 'ל', 'מ', 'ש'], 'only the letters of the three suggested words are open at first');
    assert.equal(await page.locator('#firstwin .fw-tray-finals').count(), 0, 'no final-form tiles before the alef-bet is open');
    const chips = await page.locator('#firstwin .fw-chip .fw-chip-he').allInnerTexts();
    assert.deepEqual(chips, ['אַבָּא', 'אִמָּא', 'שָׁלוֹם']);
    const t0 = Date.now();
    for (const he of ['ש', 'ל', 'ו', 'מ']) await tile(page, he).click();
    await page.waitForSelector('#fw-success', { timeout: 15000 });
    const secs = (Date.now() - t0) / 1000;
    const success = await page.locator('#fw-success').innerText();
    assert.match(success, /שָׁלוֹם/); assert.match(success, /shalom/); assert.match(success, /hello \/ peace/);
    assert.match(await page.locator('#fw-word-live').innerText(), /שָׁלוֹם, shalom/);
    const status = await page.locator('#fw-status').innerText();
    assert.match(status, /You built שָׁלוֹם — shalom/);
    assert.match(status, /At the end of a word, מ is written ם/, 'the final-letter note');
    await page.waitForFunction(() => /Playing|No audio|Not played/.test(document.querySelector('#fw-status')?.innerText || ''), null, { timeout: 15000 });
    const after = await page.locator('#fw-status').innerText();
    assert.match(after, /Playing shalom: /, after);
    const shalomClips = wordClipsRequested(requests, 'f', 'שָׁלוֹם');
    assert.ok(shalomClips.length >= 1, `a woman Israeli clip whose text is שָׁלוֹם was requested: ${requests.join(', ')}`);
    assert.ok(!requests.some((r) => r.startsWith('/audio/m/')), 'the man voice is never requested when the woman is chosen');
    const played = await page.evaluate(() => window.__played);
    assert.ok(played.some((u) => shalomClips.some((c) => u.endsWith(c))), `play() was called with the clip: ${played.join(', ')}`);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('alef:firstday.builder.v1') || localStorage.getItem('firstday.builder.v1') || 'null'));
    assert.ok(saved && saved.count === 1 && saved.words[0] === 'hf8c8316a', JSON.stringify(saved));
    assert.match(await page.locator('#fw-tally').innerText(), /1 word built/);
    // hear it slowly asks for the same file again
    const before = requests.length;
    await page.locator('#fw-success button:has-text("Hear it slowly")').click();
    await page.waitForFunction(() => /slowly/.test(document.querySelector('#fw-status')?.innerText || ''), null, { timeout: 15000 }); // the line follows the clip's end
    assert.ok(requests.length >= before, 'slow playback still goes through the player');
    assert.match(await page.locator('#fw-status').innerText(), /Playing shalom slowly: /);
    // build another: more letters are open now
    await page.locator('#fw-another').click();
    const open2 = await page.locator('#firstwin .fw-tray-row .fw-tile').evaluateAll((els) => els.map((e) => e.getAttribute('data-he')));
    assert.ok(open2.length > open.length, `more letters open after a word: ${open2.join('')}`);
    // a dead end gets a hint, not a failure
    for (const he of ['ש', 'ל', 'ב']) await tile(page, he).click();
    assert.match(await page.locator('#fw-status').innerText(), /No word starts like that yet\. Nearest: /);
    assert.equal(await page.locator('#fw-success').count(), 0);
    assert.deepEqual(errors, [], errors.join('\n'));
    assert.ok(secs < 60, `clicks to first success took ${secs}s`);
  });
});

test('browser: a learner who finished the first run lands in the builder; Hebrew letter keys and Backspace work; "All letters" opens 22 tiles and the finals row; Man voice requests the man file', { skip, timeout: 180000 }, async () => {
  const stored = { 'alef:firstwin.v1': { v: 2, done: true, builtAt: '2026-11-06T00:00:00.000Z', seconds: 40, accuracy: 100, wordId: 'abba' } };
  await withBuilder({ congregation: 'israeli', voice: 'm' }, stored, async (page, { errors, requests }) => {
    await page.waitForSelector('#firstwin .fw-tray .fw-tile', { timeout: 30000 });
    assert.match(await page.locator('#view-title').innerText(), /Build Hebrew Words/);
    await page.locator('#firstwin button:has-text("All letters")').click();
    assert.equal(await page.locator('#firstwin .fw-tray-row:not(.fw-tray-finals) .fw-tile').count(), 22);
    assert.equal(await page.locator('#firstwin .fw-tray-finals .fw-tile').count(), 5);
    // Playwright's keyboard.type falls back to insertText for letters outside the US layout (no keydown), so the keydown events a
    // Hebrew keyboard sends are dispatched directly; Backspace is a real key press.
    const word = page.locator('#firstwin .fw-word');
    await word.focus();
    for (const key of ['א', 'ב', 'ט']) await word.dispatchEvent('keydown', { key, bubbles: true, cancelable: true });
    assert.match(await page.locator('#firstwin .fw-word').innerText(), /אבט/);
    await page.keyboard.press('Backspace');
    assert.match(await page.locator('#firstwin .fw-word').innerText(), /^אב$/);
    await page.locator('#firstwin .fw-word').dispatchEvent('keydown', { key: 'א', bubbles: true, cancelable: true });
    await page.waitForSelector('#fw-success', { timeout: 15000 });
    assert.match(await page.locator('#fw-success').innerText(), /אַבָּא[\s\S]*aba — dad/);
    await page.waitForFunction(() => /Playing|No audio|Not played/.test(document.querySelector('#fw-status')?.innerText || ''), null, { timeout: 15000 });
    // The word shard may still be loading this early; the player then takes another man Israeli clip of the same pointed text (here r07-w1).
    assert.ok(wordClipsRequested(requests, 'm', 'אַבָּא').length >= 1, `a man Israeli clip whose text is אַבָּא was requested: ${requests.join(', ')}`);
    assert.ok(!requests.some((r) => r.startsWith('/audio/f/')), 'the woman voice is never requested when the man is chosen');
    assert.deepEqual(errors, [], errors.join('\n'));
  });
});
