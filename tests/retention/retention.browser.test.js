// Retention screens in a real browser (headless Chromium via Playwright; skipped when Playwright is missing, like the other browser tests).
// Lesson events are sent the way the app sends them (alef:rimon, alef:celebrate, alef:review-rated, alef:lesson-part); a full lesson click-through is not done here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { createAppServer } from '../../tools/serve.mjs';
const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
const launch = async () => { try { return await chromium.launch(); } catch { return chromium.launch({ executablePath: ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync), args: ['--no-sandbox'] }); } };

const day = (off = 0) => { const d = new Date(Date.now() + off * 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ret = (o = {}) => ({ v: 1, installId: 'browser-test', createdAt: day(-9), lessonsFinished: 6, goal: 20, gems: { balance: 450, ledger: [], paidMilestones: [], goalPaidDay: null },
  hearts: { enabled: null, n: 3, lastRefillAt: Date.now(), lost: [] }, league: { tier: 2, weekXp: 40, joined: true }, ...o });
const streak = { v: 2, count: 4, best: 6, last: day(-1), frozenDates: [], doneDates: [day(-1)], freeze: false, mode: 'reform' };
const stored = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

async function open(browser, base, seed, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: opts.width || 360, height: 780 }, serviceWorkers: 'block', reducedMotion: opts.reducedMotion });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) if (localStorage.getItem(k) == null) localStorage.setItem(k, JSON.stringify(v)); }, { 'alef:settings': { onboarded: true }, ...seed });
  const go = async (hash, sel) => { await page.goto(base + hash); await page.waitForSelector(sel, { timeout: 20000, state: 'attached' }); };
  return { page, errors, go, close: () => ctx.close() };
}
async function withApp(fn) {
  const srv = createAppServer(); await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const browser = await launch();
  try { await fn(browser, `http://127.0.0.1:${srv.address().port}/`); } finally { await browser.close(); srv.close(); }
}

test('top bar, daily-goal ring, shop purchase and league table at 320, 360 and 390 px', { skip: !chromium, timeout: 180000 }, async () => {
  await withApp(async (browser, base) => {
    for (const width of [320, 360, 390]) {
      const a = await open(browser, base, { 'alef:retention.v1': ret(), 'alef:streak': streak }, { width });
      await a.go('#/', '.ret-goal');
      await a.page.waitForSelector('.ret-bar .ret-chip', { state: 'attached' });
      const chips = await a.page.$$eval('.ret-bar .ret-chip', (n) => n.map((x) => x.getAttribute('aria-label')));
      assert.deepEqual(chips.slice(0, 3), ['4-day streak. Open the shop.', '450 gems. Open the shop.', '3 of 5 hearts. Open the shop.']);
      assert.equal(await a.page.$eval('.ret-goal-text', (n) => n.textContent), '0 of 20 XP today.');
      assert.equal(await a.page.$$eval('.ret-strip .ret-dot', (n) => n.length), 7);
      assert.equal(await a.page.$$eval('.ret-quests .ret-quest-list li', (n) => n.length), new Date().getDay() === 6 ? 0 : 3, 'three quests (none on Saturday)');
      assert.ok(await noSideScroll(a.page), `home ${width}`);
      if (width === 360) {
        await a.page.waitForFunction(() => /quick=1/.test(document.querySelector('.ret-quick')?.getAttribute('href') || ''), null, { timeout: 15000 });
        await a.go('#/shop', '[data-buy="freeze"]');
        await a.page.click('[data-buy="freeze"]');
        assert.equal((await stored(a.page, 'alef:retention.v1')).freezes?.held ?? 0, 0, 'nothing is bought before the question is answered');
        await a.page.click('[data-act="confirm"]');
        await a.page.waitForFunction(() => /Freeze ready/.test(document.querySelector('.ret-shop-status')?.textContent || ''));
        const r = await stored(a.page, 'alef:retention.v1');
        assert.deepEqual([r.gems.balance, r.freezes.held], [250, 1]);
      }
      await a.go('#/shop', '.ret-shop'); assert.ok(await noSideScroll(a.page), `shop ${width}`);
      await a.go('#/league', '.ret-table tbody tr');
      assert.equal(await a.page.$$eval('.ret-table tbody tr', (n) => n.length), 30);
      assert.ok(await a.page.evaluate(() => { const line = document.querySelector('.ret-honest'), table = document.querySelector('.ret-table'); return /pretend/.test(line.textContent) && !!(line.compareDocumentPosition(table) & 4); }), 'the honesty line comes before the table');
      assert.match(await a.page.$eval('.ret-table .is-you', (n) => n.textContent), /You/);
      assert.ok(await noSideScroll(a.page), `league ${width}`);
      assert.deepEqual(a.errors, []);
      await a.close();
    }
  });
});

test('lesson events: hearts, combo, one reward panel, streak day; the 3-minute stop; review wins a heart back', { skip: !chromium, timeout: 180000 }, async () => {
  await withApp(async (browser, base) => {
    const a = await open(browser, base, { 'alef:retention.v1': ret(), 'alef:streak': streak });
    await a.go('#/learn?lesson=r01', 'body[data-ready="1"]');
    await a.page.waitForSelector('.ret-bar .ret-chip', { state: 'attached' });
    await a.page.evaluate(() => {
      const send = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));
      for (let i = 0; i < 5; i++) send('alef:rimon', { action: 'correct', source: 'lesson', questionId: 'q' + i });
      send('alef:rimon', { action: 'wrong', source: 'lesson', questionId: 'qx' });
      send('alef:rimon', { action: 'wrong', source: 'lesson', questionId: 'qx', retry: true });
      const card = document.createElement('div'); card.className = 'alef-summary';
      const cheer = document.createElement('p'); cheer.className = 'alef-celebrate-cheer'; card.append(cheer); document.getElementById('main').append(card);
      send('alef:celebrate', { kind: 'lesson', accuracy: 0.95, ms: 61234 });
      send('alef:celebrate', { kind: 'lesson', accuracy: 0.95, ms: 61234 });
    });
    await a.page.waitForSelector('.ret-reward');
    assert.equal(await a.page.$$eval('.ret-reward', (n) => n.length), 1, 'a second end-card event pays nothing');
    assert.match(await a.page.$eval('.ret-xp-chip', (n) => n.textContent), /^\+17 XP$/);
    const r = await stored(a.page, 'alef:retention.v1'), s = await stored(a.page, 'alef:streak');
    assert.deepEqual([r.xp.total, r.hearts.n, r.lessonsFinished, s.count], [17, 2, 7, 5]);
    // one round of a longer lesson pays XP but is not a finished lesson
    await a.page.evaluate(() => { location.hash = '#/learn?lesson=zz-round'; });
    await a.page.waitForTimeout(700);
    await a.page.evaluate(() => document.dispatchEvent(new CustomEvent('alef:celebrate', { detail: { kind: 'lesson', accuracy: 0.5, ms: 999, title: 'Round finished' } })));
    const round = await stored(a.page, 'alef:retention.v1');
    assert.deepEqual([round.xp.total, round.lessonsFinished], [27, 7]);
    // 3-minute lesson: the fourth part of one sitting is the stopping point
    await a.go('#/learn?lesson=r02&quick=1', 'body[data-ready="1"]');
    await a.page.waitForTimeout(800);
    await a.page.evaluate(() => { for (let i = 1; i <= 4; i++) document.dispatchEvent(new CustomEvent('alef:lesson-part', { detail: { lessonId: 'r02', part: i, of: 9 } })); });
    await a.page.waitForSelector('.ret-quick-done');
    assert.equal((await stored(a.page, 'alef:retention.v1')).xp.total, 37);
    // review: five rated cards win a heart back
    await a.go('#/learn?review=1', 'body[data-ready="1"]');
    await a.page.evaluate(() => { for (let i = 0; i < 5; i++) document.dispatchEvent(new CustomEvent('alef:review-rated', { detail: { rating: 3 } })); });
    assert.equal((await stored(a.page, 'alef:retention.v1')).hearts.n, 3);
    assert.deepEqual(a.errors, []);
    await a.close();
  });
});

test('a first visit is left alone: no top bar and no Home cards until something has been earned', { skip: !chromium, timeout: 120000 }, async () => {
  await withApp(async (browser, base) => {
    const a = await open(browser, base, {});
    await a.go('#/', 'body[data-ready="1"]'); await a.page.waitForSelector('.ret-bar', { state: 'attached' });
    assert.deepEqual(await a.page.evaluate(() => [document.querySelector('.ret-bar').hidden, !!document.querySelector('.ret-goal'), !!document.querySelector('.ret-quests')]), [true, false, false]);
    assert.deepEqual(a.errors, []); await a.close();
  });
});

test('zero hearts gates a new lesson but not review; reduced motion runs no animation; calm mode hides it all', { skip: !chromium, timeout: 180000 }, async () => {
  await withApp(async (browser, base) => {
    const empty = { 'alef:retention.v1': ret({ hearts: { enabled: null, n: 0, lastRefillAt: Date.now(), lost: [] } }) };
    const a = await open(browser, base, empty, { reducedMotion: 'reduce' });
    await a.go('#/learn?lesson=r02', '.ret-hearts-out');
    assert.match(await a.page.$eval('.ret-hearts-out', (n) => n.textContent), /Practise to earn a heart/);
    await a.go('#/learn?review=1', 'body[data-ready="1"]'); await a.page.waitForTimeout(800);
    assert.equal(!!(await a.page.$('.ret-hearts-out')), false, 'review is always open');
    await a.go('#/', '.ret-goal');
    assert.equal(await a.page.evaluate(() => [...document.querySelectorAll('.alef-retention, .alef-retention *')].reduce((n, el) => n + el.getAnimations().length, 0)), 0);
    assert.deepEqual(a.errors, []); await a.close();
    const c = await open(browser, base, { 'alef:settings': { onboarded: true, calmMode: true }, 'alef:retention.v1': ret() });
    await c.go('#/', 'body[data-ready="1"]'); await c.page.waitForSelector('.ret-bar', { state: 'attached' });
    assert.deepEqual(await c.page.evaluate(() => [document.querySelector('.ret-bar').hidden, !!document.querySelector('.ret-goal')]), [true, false]);
    await c.close();
  });
});

test('a real 3-minute lesson: clicking through the short parts reaches the stopping card, which survives the lesson redraw', { skip: !chromium, timeout: 180000 }, async () => {
  await withApp(async (browser, base) => {
    const a = await open(browser, base, {});
    await a.go('#/shop', '.ret-shop');
    const id = await a.page.evaluate(async () => { const m = await import('/src/curriculum/lessons.js'); const size = (l) => (l.letters?.length || 0) + (l.vowels?.length || 0) + (l.words?.length || 0); return m.lessons.filter((l) => !l.prerequisites.length).sort((x, y) => size(y) - size(x))[0]?.id; });
    await a.go(`#/learn?lesson=${id}&quick=1`, '.alef-chunked #alef-part-title');
    for (let i = 0; i < 80; i++) {
      if (await a.page.$('.ret-quick-done') || await a.page.$('.alef-summary')) break;
      await a.page.evaluate(() => {
        const vis = (b) => b && !b.hidden && !b.disabled && b.offsetParent !== null;
        const opt = [...document.querySelectorAll('.alef-chunked .alef-int-opt')].find(vis); if (opt) return opt.click();
        const main = [...document.querySelectorAll('.alef-chunked button.btn:not(.secondary)')].filter((b) => vis(b) && !/Listen|Hear/.test(b.textContent)); main[main.length - 1]?.click();
      });
      await a.page.waitForTimeout(150);
    }
    const parts = await a.page.evaluate(() => Number((document.querySelector('#alef-part-title')?.textContent || '').split(' of ')[1]) || 0);
    if (parts >= 6) { // long enough for a stopping point (shorter lessons simply end with their own end card)
      assert.match(await a.page.$eval('.ret-quick-done', (n) => n.textContent), /Three Minutes Done.*\+10 XP.*Your place is saved/s);
      const r = await stored(a.page, 'alef:retention.v1'), s = await stored(a.page, 'alef:streak');
      assert.deepEqual([r.xp.total, r.lessonsFinished, s.count], [10, 0, 1]);
      await a.page.click('.ret-quick-done button');
      assert.equal(!!(await a.page.$('.ret-quick-done')), false); assert.ok(!!(await a.page.$('.alef-chunked #alef-part-title')), 'the lesson carries on');
    } else assert.ok(!!(await a.page.$('.alef-summary')), 'a short lesson ends with its own end card');
    assert.deepEqual(a.errors, []);
    await a.close();
  });
});

const fullChrome = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync); // the bundled headless shell cannot show notifications
test('the real service worker shows a planned reminder on a weekday, records it, and stays silent on Saturday and in a quiet range', { skip: !chromium || !fullChrome ? 'needs Playwright and a full Chrome' : false, timeout: 180000 }, async (t) => {
  await withApp(async (_shell, base) => {
    const browser = await chromium.launch({ executablePath: fullChrome, args: ['--no-sandbox'] }); t.after(() => browser.close());
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
    await ctx.grantPermissions(['notifications'], { origin: base.replace(/\/$/, '') });
    await ctx.addInitScript(() => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); });
    const page = await ctx.newPage();
    await page.goto(base + '#/shop'); await page.waitForSelector('.ret-shop');
    assert.ok(await page.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise((r) => setTimeout(() => r(false), 60000))])), 'service worker ready');
    const sw = ctx.serviceWorkers()[0] || await ctx.waitForEvent('serviceworker', { timeout: 30000 });
    if (await sw.evaluate(() => self.Notification && self.Notification.permission) !== 'granted') return t.skip('this browser build does not grant notifications to a service worker');
    const run = (entry, at, quiet = []) => sw.evaluate(async ([entry, at, quiet]) => {
      for (const n of await self.registration.getNotifications()) n.close();
      const cache = await caches.open('alef-retention'), url = new URL('__alef/rimon-plan.json', self.registration.scope).href;
      await cache.put(url, new Response(JSON.stringify({ v: 1, entries: [entry], quiet, shown: [], lastSessionAt: at - 3 * 86400000 })));
      const real = Date.now; Date.now = () => at; try { await rimonCheck(); } finally { Date.now = real; }
      const after = await (await cache.match(url)).json();
      return { shown: (await self.registration.getNotifications()).map((n) => ({ title: n.title, body: n.body, icon: n.icon.split('/').pop(), route: n.data && n.data.route })), left: after.entries.length, recorded: after.shown.length };
    }, [entry, at, quiet]);
    const tue = new Date(2026, 10, 17, 12, 0).getTime(), sat = new Date(2026, 10, 14, 12, 0).getTime();
    const e = (at) => ({ fireAt: at - 60000, id: 'E01', title: 'Rimon', body: 'Three minutes. One lesson.', route: '#/learn' });
    assert.deepEqual(await run(e(tue), tue), { shown: [{ title: 'Rimon', body: 'Three minutes. One lesson.', icon: 'icon-192.png', route: '#/learn' }], left: 0, recorded: 1 });
    assert.deepEqual(await run(e(sat), sat), { shown: [], left: 1, recorded: 0 });
    assert.deepEqual(await run(e(tue), tue, [[tue - 3600000, tue + 3600000]]), { shown: [], left: 1, recorded: 0 });
    await ctx.close();
  });
});

test('Home after a week away shows the welcome card; on Monday it shows last week', { skip: !chromium, timeout: 120000 }, async () => {
  await withApp(async (browser, base) => {
    const days = {}; for (let i = 7; i <= 13; i++) days[day(-i - new Date().getDay())] = 10; // seven days somewhere in the week before this one
    const a = await open(browser, base, { 'alef:retention.v1': ret({ xp: { total: 70, days }, sessions: [{ s: Date.now() - 9 * 86400000, e: Date.now() - 9 * 86400000 + 60000 }], hearts: { enabled: null, n: 1, lastRefillAt: Date.now() - 1000, lost: [] } }) });
    await a.go('#/', '.ret-goal');
    const dow = new Date().getDay(), min = new Date().getHours() * 60 + new Date().getMinutes(), shabbat = (dow === 5 && min >= 1080) || (dow === 6 && min < 1260);
    assert.match(await a.page.$eval('.ret-comeback', (n) => n.textContent), /Welcome Back.*Warm up with old words/s);
    assert.equal((await stored(a.page, 'alef:retention.v1')).hearts.n, 5, 'hearts are filled on return');
    if (!shabbat) { assert.match(await a.page.$eval('.ret-recap', (n) => n.textContent), /Your Last Week/); assert.equal(await a.page.$$eval('.ret-bars li', (n) => n.length), 7);
      await a.page.evaluate(() => document.querySelector('.ret-recap button').click()); assert.equal(!!(await a.page.$('.ret-recap')), false); }
    assert.ok(await noSideScroll(a.page)); assert.deepEqual(a.errors, []);
    await a.close();
  });
});
