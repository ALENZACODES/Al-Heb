// Journey regression in headless Chromium: both Israeli synthetic voices and an explicit unavailable-audio fixture.
// It checks what the page says and which file the page asked for. Headless Chromium has no audio output: nothing is heard here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createAppServer } from '../tools/serve.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
let chromium;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = createRequire(import.meta.url)(p)); break; } catch { /* next */ } }
const skip = !chromium;

async function withLesson(settings, fn) {
  const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    await ctx.addInitScript((s) => {
      localStorage.setItem('alef:settings', JSON.stringify(s));
      window.__played = []; const P = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () { window.__played.push(this.currentSrc || this.src); return P.apply(this, arguments); };
    }, { onboarded: true, veilOptOut: true, ...settings });
    const page = await ctx.newPage();
    await page.goto(base + '#/learn?lesson=r07'); await page.waitForSelector('body[data-ready="1"]'); await page.waitForTimeout(700);
    await fn(page);
  } finally { await browser.close(); server.close(); }
}
const press = async (page) => {
  const b = page.locator('button[aria-label="Listen to dad"]').first(); await b.click(); await page.waitForFunction(() => document.querySelector('#sound-status')?.textContent.includes('Synthetic voice'));
  return { played: await page.evaluate(() => window.__played.filter(Boolean)), bar: await page.locator('#sound-status').innerText() };
};

test('browser: Israeli + Man, lesson r07 "dad": the file is requested and the visible sound status identifies a synthetic voice', { skip, timeout: 120000 }, async () => {
  await withLesson({ congregation: 'israeli', voice: 'm' }, async (page) => {
    const r = await press(page);
    assert.deepEqual(r.played, [new URL('audio/m/israeli/word/r07-w1.mp3', page.url()).href]);
    assert.match(r.bar, /Synthetic voice/);
  });
});

test('browser: Noa Israeli lesson clip requests the female file with synthetic disclosure', { skip, timeout: 120000 }, async () => {
  await withLesson({ congregation: 'israeli', voice: 'f' }, async (page) => {
    const r = await press(page);
    assert.deepEqual(r.played, [new URL('audio/f/israeli/word/r07-w1.mp3', page.url()).href]);
    assert.match(r.bar, /Synthetic voice/);
  });
});

test('browser: lesson r05 (Priestly Blessing) prayer lines keep their Listen and Read buttons on screen at 360, 390 and 412 px', { skip, timeout: 120000 }, async () => {
  const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  try {
    const bad = [];
    for (const width of [360, 390, 412]) {
      const ctx = await browser.newContext({ viewport: { width, height: 640 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
      await ctx.addInitScript(() => localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })));
      const page = await ctx.newPage();
      await page.goto(base + '#/learn?lesson=r05'); await page.waitForSelector('body[data-ready="1"]'); await page.waitForTimeout(700);
      const r = await page.evaluate(() => [...document.querySelectorAll('.alef-line')].map((li) => {
        const card = li.closest('section').getBoundingClientRect();
        const outside = [...li.querySelectorAll('button, a')].filter((e) => { const b = e.getBoundingClientRect(); return b.right > card.right + 1 || b.left < card.left - 1; }).length;
        return { overflow: li.scrollWidth - li.clientWidth, outside, n: li.querySelectorAll('button, a').length };
      }));
      if (r.length < 3) bad.push(`${width}: only ${r.length} prayer lines`);
      for (const x of r) if (x.overflow > 1 || x.outside || x.n < 2) bad.push(`${width}: ${JSON.stringify(x)}`);
      await ctx.close();
    }
    assert.deepEqual(bad, []);
  } finally { await browser.close(); server.close(); }
});

test('browser: word trace Hear button leaves "Checking audio..." by itself (clip word and no-voice default)', { skip, timeout: 120000 }, async () => {
  const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  try {
    const out = {};
    for (const [label, settings, speech] of [['clip', { congregation: 'israeli', voice: 'm' }, 'real'], ['none', { congregation: 'ashkenazi', voice: 'f' }, 'none']]) {
      const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
      await ctx.addInitScript(({ s, sp }) => {
        localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true, veilOptOut: true, ...s }));
        if (sp === 'none') Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
      }, { s: settings, sp: speech });
      if (speech === 'none') await ctx.route('**/data/audio/manifest*.json', route => route.fulfill({ contentType: 'application/json', body: '[]' }));
      const page = await ctx.newPage();
      await page.goto(base + '#/words/trace?any=1&level=three'); await page.waitForSelector('body[data-ready="1"]'); await page.waitForTimeout(600);
      await page.locator('button[data-word="אַבָּא"]').click(); await page.waitForTimeout(2500); // never pressed Hear
      out[label] = await page.evaluate(() => ({ text: document.querySelector('#main').innerText, state: document.querySelector('[data-audio^="word/"]')?.getAttribute('data-audio-state') ?? 'no-button' }));
      await ctx.close();
    }
    assert.doesNotMatch(out.clip.text, /Checking audio/); assert.equal(out.clip.state, 'file'); assert.match(out.clip.text, /Synthetic voice/);
    assert.doesNotMatch(out.none.text, /Checking audio/); assert.match(out.none.text, /No audio yet/);
  } finally { await browser.close(); server.close(); }
});

test('browser: first run, pronunciation step: "Start without sound" and its description are on separate lines at 360 px', { skip, timeout: 120000 }, async () => {
  const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.goto(base); await page.waitForSelector('body[data-ready="1"]'); await page.waitForTimeout(600);
    await page.locator('#ob-letters-none').check();
    await page.getByRole('button', { name: /^Continue/ }).first().click(); await page.waitForSelector('#ob-silent', { state: 'attached' });
    const r = await page.evaluate(() => { const l = document.querySelector('#ob-silent').closest('label'); const d = l.querySelector('.block'); const a = l.querySelector('strong').getBoundingClientRect(), b = d.getBoundingClientRect(); return { display: getComputedStyle(d).display, below: b.top >= a.bottom - 1 }; });
    assert.deepEqual(r, { display: 'block', below: true });
  } finally { await browser.close(); server.close(); }
});
