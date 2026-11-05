// Touch and movement checks in headless Chromium at phone size (375x667). Checks sizes, the settings, undo and keyboard reach in an emulated
// browser. It does NOT test a switch device, an eye tracker, voice control, a real finger or a person with a motor disability.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createAppServer } from '../tools/serve.mjs';

const root = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
let chromium;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = createRequire(import.meta.url)(p)); break; } catch { /* next */ } }

async function withApp(fn) {
  const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch();
  try { await fn({ browser, base }); } finally { await browser.close(); server.close(); }
}
async function open(browser, base, route, settings = {}, vp = { width: 375, height: 667 }) {
  const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: true });
  await ctx.addInitScript((s) => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true, ...s })); }, settings);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + '#' + route); await page.waitForSelector('body[data-ready="1"]'); await page.waitForTimeout(500);
  return { ctx, page, errors };
}
const small = (page, min) => page.evaluate((MIN) => {
  const vis = (e) => { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return false; const r = e.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0 || e.closest('[hidden],[inert],.visually-hidden,.skip-link')) return false; for (let d = e.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) { if (!d.open && !(e.tagName === 'SUMMARY' && e.parentElement === d)) return false; } return true; };
  const out = [];
  for (const e of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=switch]')) {
    if (!vis(e)) continue;
    const lab = e.closest('label'); const t = lab && /checkbox|radio/.test(e.type || '') && vis(lab) ? lab : e;
    if (e.tagName === 'A' && !e.classList.contains('btn') && getComputedStyle(e).display === 'inline') continue; // a link inside a sentence
    const r = t.getBoundingClientRect(); if (r.width < MIN - 0.5 || r.height < MIN - 0.5) out.push(`${e.tagName} "${(e.getAttribute('aria-label') || e.textContent || e.id || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return out;
}, min);

const skip = !chromium;
const SCREENS = ['/', '/learn', '/learn?lesson=r01', '/learn?review=1', '/letters', '/letters/alef', '/letters?tab=type', '/letters/atlas', '/progress', '/firstday', '/install', '/credits', '/privacy', '/offline', '/settings', '/accessibility', '/welcome', '/search', '/about', '/vocab', '/read', '/sounds', '/calendar', '/sprint'];

test('browser: no tap target on the key screens is smaller than 44x44 CSS px at 375x667', { skip, timeout: 180000 }, async () => {
  await withApp(async ({ browser, base }) => {
    const bad = [];
    for (const r of SCREENS) { const { ctx, page } = await open(browser, base, r); const s = await small(page, 44); if (s.length) bad.push(r + ': ' + s.slice(0, 4).join('; ')); await ctx.close(); }
    assert.deepEqual(bad, []);
  });
});

test('browser: "Large" button size makes buttons, setting rows and the letter strip at least 60px', { skip, timeout: 120000 }, async () => {
  await withApp(async ({ browser, base }) => {
    for (const r of ['/learn', '/letters/alef', '/accessibility']) {
      const { ctx, page } = await open(browser, base, r, { targetSize: 'large' });
      assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-target-size')), 'large');
      const min = await page.evaluate(() => Math.min(...[...document.querySelectorAll('main .btn, main button')].filter((e) => e.getBoundingClientRect().width > 0 && !e.closest('[hidden]')).map((e) => e.getBoundingClientRect().height)));
      assert.ok(min >= 59.5, `${r}: smallest button is ${min}px tall`);
      await ctx.close();
    }
  });
});

test('browser: Ask me to confirm each answer marks first, can be changed, and grades only on Check answer', { skip, timeout: 60000 }, async () => {
  await withApp(async ({ browser, base }) => {
    const { ctx, page } = await open(browser, base, '/learn?lesson=r01', { confirmAnswers: true });
    await page.getByRole('button', { name: /start quick check/i }).click(); await page.waitForSelector('.alef-int-opt');
    await page.locator('.alef-int-opt').nth(0).tap();
    assert.equal(await page.locator('[data-result]').count(), 0, 'a tap alone grades nothing');
    assert.equal(await page.locator('.alef-int-opt[aria-pressed="true"]').count(), 1);
    await page.locator('.alef-int-opt').nth(1).tap();
    assert.equal(await page.locator('.alef-int-opt[aria-pressed="true"]').count(), 1, 'one marked choice at a time');
    assert.equal(await page.locator('[data-result]').count(), 0);
    await page.getByRole('button', { name: 'Check answer' }).tap();
    assert.equal(await page.locator('[data-result]').count(), 1, 'graded after Check answer');
    assert.equal(await page.getByRole('button', { name: 'Check answer' }).count(), 0, 'Check answer goes away once graded');
    await page.getByRole('button', { name: 'Undo' }).tap();
    await page.waitForSelector('.alef-int-opt:not([disabled])');
    assert.equal(await page.locator('[data-result]').count(), 0, 'Undo returns to the unanswered question');
    await ctx.close();
    // default (off): one tap answers, and Undo is offered
    const d = await open(browser, base, '/learn?lesson=r01');
    await d.page.getByRole('button', { name: /start quick check/i }).click(); await d.page.waitForSelector('.alef-int-opt');
    await d.page.locator('.alef-int-opt').nth(0).tap();
    assert.equal(await d.page.locator('[data-result]').count(), 1);
    assert.equal(await d.page.getByRole('button', { name: 'Undo' }).isVisible(), true);
    await d.ctx.close();
  });
});

test('browser: Single-key shortcuts off stops the digit keys from answering; on (default) keeps them', { skip, timeout: 60000 }, async () => {
  await withApp(async ({ browser, base }) => {
    for (const [settings, expected] of [[{ keyShortcuts: false }, 0], [{}, 1]]) {
      const { ctx, page } = await open(browser, base, '/learn?lesson=r01', settings);
      await page.getByRole('button', { name: /start quick check/i }).click(); await page.waitForSelector('.alef-int-opt');
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      await page.keyboard.press('1'); await page.waitForTimeout(200);
      assert.equal(await page.locator('[data-result]').count(), expected, JSON.stringify(settings));
      await ctx.close();
    }
  });
});

test('browser: Undo last rating restores the card, and the Word Sprint has no clock with No time limits', { skip, timeout: 120000 }, async () => {
  await withApp(async ({ browser, base }) => {
    const { ctx, page } = await open(browser, base, '/learn');
    await page.evaluate(async () => { const A = await import('/src/curriculum/actions.js'); const L = await import('/src/curriculum/lessons.js'); await A.completeLesson({ store: window.alef.store, settings: window.alef.settings }, L.lessons[0], Date.now() - 3 * 864e5); });
    await page.goto(base + '#/learn?review=1'); await page.getByRole('button', { name: 'Show answer' }).waitFor();
    assert.equal(await page.locator('#alef-undo-rate').isVisible(), false, 'no Undo before any rating');
    const before = await page.evaluate(() => localStorage.getItem('alef:srs.cards'));
    await page.getByRole('button', { name: 'Show answer' }).tap(); await page.locator('[data-rating="1"]').tap();
    await page.locator('#alef-undo-rate').waitFor({ state: 'visible' });
    assert.notEqual(await page.evaluate(() => localStorage.getItem('alef:srs.cards')), before);
    await page.locator('#alef-undo-rate').tap(); await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => localStorage.getItem('alef:srs.cards')), before, 'the stored cards are exactly as they were');
    assert.match(await page.locator('main').innerText(), /Card 1 of/);
    await ctx.close();
    for (const [s, timer] of [[{}, 1], [{ untimed: true }, 0]]) {
      const x = await open(browser, base, '/sprint', s);
      await x.page.click('#sprint-start'); await x.page.waitForSelector('#sprint-finish');
      assert.equal(await x.page.locator('.sp-timer').count(), timer, JSON.stringify(s));
      await x.ctx.close();
    }
  });
});

test('browser: letter strip is one Tab stop with arrow keys; Enter works on the Typing tab buttons; the on-screen keys fit the phone', { skip, timeout: 90000 }, async () => {
  await withApp(async ({ browser, base }) => {
    const { ctx, page } = await open(browser, base, '/letters/alef');
    let n = 0; for (; n < 60; n++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => /^animate/i.test(document.activeElement.textContent || ''))) break; }
    assert.ok(n < 15, `Animate reached after ${n + 1} Tab presses (was 40 before the letter strip became one stop)`);
    await page.focus('.grid button[aria-pressed="true"]'); await page.keyboard.press('ArrowLeft'); // the strip reads right to left, so Left is the next letter
    assert.notEqual(await page.evaluate(() => document.activeElement.getAttribute('aria-pressed')), 'true', 'an arrow key moves focus to another letter');
    assert.equal(await page.locator('.grid button[tabindex="0"]').count(), 1, 'exactly one tab stop in the strip');
    await ctx.close();
    const t = await open(browser, base, '/letters?tab=type');
    await t.page.focus('button:has-text("Vowel marks")'); await t.page.keyboard.press('Enter'); await t.page.waitForTimeout(200);
    assert.equal(await t.page.locator('button[aria-pressed="true"]:has-text("Vowel marks")').count(), 1, 'Enter pressed the button instead of being swallowed by the typing trainer');
    const off = await t.page.evaluate(() => { const row = document.querySelector('.kb .r'); const c = row.getBoundingClientRect(); return [...document.querySelectorAll('.kb .k')].filter((k) => { const r = k.getBoundingClientRect(); return r.left < c.left - 1 || r.right > c.right + 1; }).length; });
    assert.equal(off, 0, 'no on-screen key is cut off at the sides');
    await t.ctx.close();
  });
});

test('browser: Reset settings asks first', { skip, timeout: 60000 }, async () => {
  await withApp(async ({ browser, base }) => {
    const { ctx, page } = await open(browser, base, '/settings', { theme: 'dark' });
    await page.getByRole('button', { name: /reset settings to defaults/i }).tap();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('alef:settings')).theme), 'dark', 'one tap changes nothing');
    await page.getByRole('button', { name: 'Keep my settings' }).tap();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('alef:settings')).theme), 'dark');
    await page.getByRole('button', { name: /reset settings to defaults/i }).tap(); await page.getByRole('button', { name: 'Yes, reset settings' }).tap(); await page.waitForTimeout(300);
    assert.notEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('alef:settings')).theme), 'dark');
    await ctx.close();
  });
});
