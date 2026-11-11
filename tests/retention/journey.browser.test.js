// Never pass a Playwright element handle to assert (a failing assert tries to print it and runs out of memory): compare booleans.
// Review round 4: one learner over ten calendar days in a real browser with the clock set for each visit.
// The whole chain runs as shipped (boot, rollover, storage, screens). Lessons are finished with the app's own end-card
// events; a real click-through of a lesson is in retention.browser.test.js. Skipped when Playwright is missing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { createAppServer } from '../../tools/serve.mjs';
const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
const launch = async () => { try { return await chromium.launch(); } catch { return chromium.launch({ executablePath: ['/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync), args: ['--no-sandbox'] }); } };

test('ten days: first lesson, a freeze saves a missed day, a milestone, Shabbat rest, a recap, a break and a repair', { skip: !chromium, timeout: 240000 }, async () => {
  const srv = createAppServer(); await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}/`, browser = await launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, serviceWorkers: 'block', timezoneId: 'America/Toronto' });
    await ctx.addInitScript(() => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); });
    const errors = []; let n = 0;
    /** A visit at a local date and time: a fresh page with the clock fixed there. */
    const visit = async (when, hash, sel) => {
      const page = await ctx.newPage(); page.on('pageerror', (e) => errors.push(`${when}: ${e.message}`));
      await page.clock.setFixedTime(new Date(when));
      await page.goto(base + hash); await page.waitForSelector(sel, { state: 'attached', timeout: 20000 }); await page.waitForSelector('.ret-bar', { state: 'attached', timeout: 20000 });
      return page;
    };
    const ret = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('alef:retention.v1')));
    const streak = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('alef:streak') || '{}'));
    const patch = (page, fn) => page.evaluate((src) => { const r = JSON.parse(localStorage.getItem('alef:retention.v1')); (0, eval)('(' + src + ')')(r); localStorage.setItem('alef:retention.v1', JSON.stringify(r)); }, fn.toString());
    const lesson = async (when, id, accuracy = 0.6) => {
      const page = await visit(when, `#/learn?lesson=${id}`, 'body[data-ready="1"]');
      await page.evaluate(([accuracy, ms]) => { const card = document.createElement('div'); card.className = 'alef-summary'; const c = document.createElement('p'); c.className = 'alef-celebrate-cheer'; card.append(c); document.getElementById('main').append(card);
        document.dispatchEvent(new CustomEvent('alef:celebrate', { detail: { kind: 'lesson', accuracy, ms, title: 'Lesson complete' } })); }, [accuracy, 1000 + (++n)]);
      await page.waitForSelector('.ret-reward');
      return page;
    };
    const stray = (page) => page.evaluate(() => { const bad = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); for (let n = w.nextNode(); n; n = w.nextNode()) if (n.parentElement?.closest('.alef-retention, .ret-bar') && /^(null|undefined|NaN|false|true|\[object Object\])$/.test(n.textContent.trim())) bad.push(n.parentElement.className + ': ' + n.textContent); return bad; });
    const state = (page) => page.$eval('.ret-goal', (el) => el.getAttribute('data-state'));
    const flame = (page) => page.$eval('#stat-streak .stat-n', (el) => el.textContent);

    // Monday: the first lesson ever.
    let p = await lesson('2026-11-09T10:00', 'r01');
    let r = await ret(p);
    assert.deepEqual([r.xp.total, r.lessonsFinished, r.gems.balance, (await streak(p)).count], [10, 1, 50, 1]);
    assert.ok(await p.$('.ret-optin'), 'the reminder question comes after the first win'); assert.equal(!!(await p.$('.ret-new')), false);
    await p.close();

    // Tuesday: second lesson opens the quests, and a freeze is bought.
    p = await lesson('2026-11-10T10:00', 'r02');
    assert.match(await p.$eval('.ret-new', (el) => el.textContent), /Daily quests are open/);
    await patch(p, (rec) => { rec.gems.balance = 250; });
    await p.close();
    p = await visit('2026-11-10T10:05', '#/shop', '[data-buy="freeze"]');
    await p.click('[data-buy="freeze"]'); await p.click('[data-act="confirm"]');
    await p.waitForFunction(() => JSON.parse(localStorage.getItem('alef:retention.v1')).freezes.held === 1);
    await p.close();

    // Thursday: Wednesday was missed. The freeze covers it without a tap.
    p = await visit('2026-11-12T10:00', '#/', '.ret-goal');
    r = await ret(p);
    assert.deepEqual([r.freezes.held, r.freezes.used, await state(p), await flame(p)], [0, ['2026-11-11'], 'freeze-used', '2']);
    assert.equal(await p.$$eval('.ret-strip .is-freeze', (els) => els.length), 1, 'a snowflake day in the strip');
    await p.close();
    p = await lesson('2026-11-12T10:10', 'r03');
    r = await ret(p);
    assert.equal((await streak(p)).count, 3); assert.ok(r.gems.ledger.some((e) => e.why === 'streak3'), 'the 3-day milestone paid');
    assert.ok(await p.$('.ret-share button'), 'a milestone can be shared'); assert.match(await p.$eval('.ret-new', (el) => el.textContent), /Hearts are on/);
    assert.equal(r.freezes.unseen, false, 'the freeze note was seen on Home and is retired at the next visit');
    await p.close();

    // Friday night and Saturday: a rest, never "at risk".
    p = await visit('2026-11-13T19:00', '#/', '.ret-goal');
    assert.equal(await state(p), 'rest'); assert.match(await p.$eval('.ret-goal', (el) => el.textContent), /Shabbat Shalom/);
    await p.close();
    p = await visit('2026-11-14T15:00', '#/', '.ret-goal');
    assert.equal(await state(p), 'rest'); assert.match(await p.$eval('.ret-quests', (el) => el.textContent), /No quests today/);
    assert.deepEqual(await stray(p), [], 'no empty slot printed as a word on a rest day');
    await p.close();

    // Sunday: Friday and Saturday cost nothing. Last week is summed up.
    p = await visit('2026-11-15T10:00', '#/', '.ret-goal');
    r = await ret(p);
    assert.deepEqual([await state(p), await flame(p), r.freezes.held], ['open', '3', 0]);
    assert.match(await p.$eval('.ret-recap', (el) => el.textContent), /30 XP on 3 days/);
    assert.equal(await p.$$eval('.ret-quests .ret-quest-list li', (els) => els.length), 3);
    await p.close();

    // Wednesday: Sunday, Monday and Tuesday were missed with no freeze. The streak breaks; a repair is offered for 48 hours.
    p = await visit('2026-11-18T10:00', '#/', '.ret-goal');
    r = await ret(p);
    assert.deepEqual([await state(p), await flame(p), r.repair.days, r.repair.prev], ['broken', '0', ['2026-11-15', '2026-11-16', '2026-11-17'], 3]);
    await patch(p, (rec) => { rec.gems.balance = 500; });
    await p.close();
    p = await visit('2026-11-18T10:05', '#/shop', '[data-buy="repair"]');
    await p.click('[data-buy="repair"]'); await p.click('[data-act="confirm"]');
    await p.waitForFunction(() => JSON.parse(localStorage.getItem('alef:retention.v1')).repair === null);
    r = await ret(p);
    assert.deepEqual([r.gems.balance, await flame(p)], [50, '3'], 'three days at 150 gems each bring the 3-day streak back');
    await p.close();

    // Later the same day the offer is gone. The repaired streak still needs today's lesson: skip it and Thursday opens a new, smaller offer.
    p = await visit('2026-11-18T12:00', '#/shop', '.ret-shop');
    assert.equal(!!(await p.$('[data-buy="repair"]')), false);
    await p.close();
    p = await visit('2026-11-19T10:00', '#/', '.ret-goal');
    r = await ret(p);
    assert.deepEqual([await state(p), r.repair.days, r.repair.prev], ['broken', ['2026-11-18'], 3]);
    await p.close();
    assert.deepEqual(errors, []);
  } finally { await browser.close(); srv.close(); }
});
