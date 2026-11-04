// Accessibility fixes (docs/A11Y.md open items). Unit checks run always; the browser checks need Playwright and are skipped without it.
// They test DOM behaviour and axe rules only. No screen reader was used.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createProgress } from '../src/letters/progress.js';
import { createAppServer } from '../tools/serve.mjs';

const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const src = (p) => readFileSync(root + '/' + p, 'utf8');

test('assisted tracing is recorded apart from drawn completions', () => {
  const p = createProgress(null);
  p.recordAssisted('alef', 'print');
  assert.equal(p.isCompleted('alef', 'print'), false, 'a walk-through never counts as drawn');
  assert.equal(p.isAssisted('alef', 'print'), true);
  assert.equal(p.count('print'), 0);
  p.record('alef', 'print', { perfect: true });
  assert.equal(p.isCompleted('alef', 'print'), true);
  assert.equal(p.get('alef').print.assisted, 1);
});

test('no aria-label that hides the visible text on the fixed controls', () => {
  assert.doesNotMatch(src('src/pronunciation/sounds.view.js'), /class: 'sign', 'aria-label'/);
  assert.doesNotMatch(src('src/pronunciation/syllablechips.view.js'), /class: 'chip', 'aria-label'/);
  assert.doesNotMatch(src('src/letters/trace.view.js'), /class: 'k', 'aria-label'/);
  assert.match(src('src/vocab/vocab.view.js'), /`Add to reviews: \$\{e\.gloss\}`/);
  assert.match(src('src/curriculum/calendar.view.js'), /href: "#\/settings"/);
});

let chromium; try { ({ chromium } = createRequire(import.meta.url)('/usr/lib/node_modules/playwright')); } catch { try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { /* skipped */ } }
const axePath = root + '/tools/a11y/node_modules/axe-core/axe.min.js';
let haveAxe = true; try { readFileSync(axePath); } catch { haveAxe = false; }

test('browser: Next stroke walks the letter without marking it drawn; atlas keeps focus; axe rules clean', { skip: !(chromium && haveAxe), timeout: 120000 }, async () => {
  const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript(() => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); });
    const page = await ctx.newPage();
    // 1. Letters: keyboard alternative
    await page.goto(base + '#/letters/alef'); await page.waitForSelector('button[data-act="mode-step"]');
    assert.equal(await page.locator('button[data-act="next-stroke"]').count(), 0, 'hidden until the mode is chosen');
    await page.click('button[data-act="mode-step"]');
    const n = await page.evaluate(() => 0); void n;
    const next = page.locator('button[data-act="next-stroke"]'); await next.waitFor();
    for (let i = 0; i < 12; i++) { if (await page.locator('.chip:has-text("walked through")').count()) break; await next.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(150); if (!(await page.locator('button[data-act="next-stroke"]').count())) break; }
    const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('alef:letters.progress') || localStorage.getItem('letters.progress') || 'null'));
    const stored = prog || await page.evaluate(() => { const k = Object.keys(localStorage).find((x) => x.includes('letters.progress')); return k ? JSON.parse(localStorage.getItem(k)) : null; });
    assert.ok(stored && stored.alef && stored.alef.print, 'assisted run stored');
    assert.equal(stored.alef.print.completions, 0, 'not counted as drawn');
    assert.ok(stored.alef.print.assisted >= 1);
    // 2. Atlas: focus survives a tile press and the quiz button
    await page.goto(base + '#/letters/atlas'); await page.waitForSelector('[data-tile="bet"]');
    await page.focus('[data-tile="bet"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-tile')), 'bet');
    await page.focus('[data-act="quiz"]'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-act')), 'quiz');
    // 3. axe: the fixed rules on the fixed screens
    const axeSource = readFileSync(axePath, 'utf8'); const bad = [];
    for (const r of ['/letters/atlas', '/sounds', '/vowelboard', '/syllablechips', '/read/priestly-blessing', '/vocab', '/letters?tab=type', '/calendar']) {
      await page.goto(base + '#' + r); await page.waitForSelector('body[data-ready="1"]'); await page.waitForTimeout(400);
      await page.evaluate(axeSource);
      const v = await page.evaluate(async () => (await axe.run(document, { runOnly: ['label-content-name-mismatch', 'empty-heading', 'color-contrast'] })).violations.map((x) => x.id + ':' + x.nodes.length));
      if (v.length) bad.push(r + ' ' + v.join(','));
    }
    assert.deepEqual(bad, []);
    // 4. calendar location prompt is a link when no location is set
    await page.goto(base + '#/calendar'); await page.waitForSelector('.alef-calendar');
    const prompt = page.locator('.alef-candles a[href="#/settings"]');
    if (await page.locator('.alef-candles').count()) assert.ok(await prompt.count() === 1 || !(await page.locator('.alef-candles').first().innerText()).includes('Set your location'));
  } finally { await browser.close(); server.close(); }
});
