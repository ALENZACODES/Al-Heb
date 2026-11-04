// Journey QA (scripted emulation of three learner personas, headless Chromium, desktop-less phone viewport).
// THIS IS SCRIPTED EMULATION, NOT REAL LEARNERS: a script that clicks what the Today card says, derives right answers from the app's
// own data files, misses some on purpose, and moves the page clock forward with an overridden Date. It finds dead ends, confusing empty
// states, console errors and places where the app claims progress that the script did not make. It says nothing about whether a person
// would enjoy, understand or finish these screens.
// Usage: node tools/qa/journey.mjs [--quick] [--out DIR] [--persona A,B,C,D,E] [--days N]
//   D = returns after 10 days away (days 3 to 12 skipped, comes back on day 13); E = only /read and the siddur track, never follows the Today card
//   --quick   persona A, day 1 only (onboarding, first 10 minutes, first lesson, review, speak/typing/listen/progress, 5 minutes of dwell)
//   --out     where journey.json and screenshots go (default docs/qa/journey)
// The clock: an init script replaces Date. The offset lives in sessionStorage key __qa_off (not an app key) and in window.__qaOff.
// "Dwell" advances that offset in 55 s jumps with a pointer event before each jump, because the streak needs 300 engaged seconds
// (src/morning/engage.js) and a headless run cannot wait five real minutes per day.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
if (!chromium) { console.error('playwright not found'); process.exit(2); }

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const quick = args.includes('--quick');
const outDir = resolve(root, arg('--out', 'docs/qa/journey'));
const wantShots = !args.includes('--no-shots');
const DAYS = quick ? 1 : Number(arg('--days', '7'));
const daysFor = (cfg) => (quick ? 1 : cfg.days && !args.includes('--days') ? cfg.days : DAYS);
const WHO = (quick ? 'A' : arg('--persona', 'A,B,C,D,E')).split(',');
mkdirSync(outDir, { recursive: true });
for (const f of ['journey.json']) { try { rmSync(join(outDir, f)); } catch { /* none */ } }

const T0 = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const START = Date.UTC(2026, 10, 9, 14, 0, 0); // Monday 2026-11-09 09:00 in Toronto (EST)
const DAY = 86400000;
const executablePath = process.env.QA_CHROME || undefined;

const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ executablePath });

const PERSONAS = {
  A: { key: 'A', name: 'A: total beginner, Ashkenazi synagogue, 10 min a day', letters: 'none', denom: 'orthodox', pron: 'ashkenazi', minutes: 10, goal: 'read', skipDay: null, lightDay: 4, tasks: 1, reviewAfter: true },
  B: { key: 'B', name: 'B: Sephardi congregation, already reads letters (placement)', letters: 'vowels', denom: 'conservative', pron: 'sephardi', minutes: 15, goal: 'read', skipDay: 6, lightDay: null, goalProbe: 2, tasks: 2, reviewAfter: false },
  D: { key: 'D', name: 'D: returns after 10 days away (studied days 1 and 2, back on day 13)', letters: 'none', denom: 'reform', pron: 'sephardi', minutes: 10, goal: 'read', skipDay: null, skipDays: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], lightDay: null, tasks: 1, reviewAfter: true, days: 13 },
  E: { key: 'E', name: 'E: only /read and the siddur track, never follows the Today card', letters: 'vowels', denom: 'conservative', pron: 'sephardi', minutes: 10, goal: 'read', skipDay: null, lightDay: null, tasks: 0, reviewAfter: false, readOnly: true },
  C: { key: 'C', name: 'C: Israel-track learner', letters: 'none', denom: null, pron: 'israeli', minutes: 10, goal: 'israel', skipDay: null, lightDay: null, tasks: 1, reviewAfter: true },
};

const report = { generatedBy: 'tools/qa/journey.mjs', note: 'Scripted emulation, not real learners. Headless Chromium, 390x844, overridden Date.', quick, start: new Date(START).toISOString(), personas: {} };
const hebrew = /[֐-׿]/;

async function runPersona(cfg) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, locale: 'en-CA', timezoneId: 'America/Toronto', serviceWorkers: 'block', permissions: [] });
  await ctx.addInitScript(({ start }) => {
    const R = Date; let off = Number(sessionStorage.getItem('__qa_off'));
    if (!Number.isFinite(off) || sessionStorage.getItem('__qa_off') === null) { off = start - R.now(); sessionStorage.setItem('__qa_off', String(off)); }
    window.__qaOff = off;
    class D extends R { constructor(...a) { if (a.length === 0) super(R.now() + window.__qaOff); else super(...a); } static now() { return R.now() + window.__qaOff; } }
    window.Date = D;
  }, { start: START });
  const page = await ctx.newPage(); page.setDefaultTimeout(2500);
  const P = { cfg, page, steps: [], findings: [], errors: [], days: {}, day: 0, shots: 0, streakShown: [], didSomething: {}, dwelled: {}, plan: null, notes: [] };
  const route = () => page.evaluate(() => location.hash).catch(() => '?');
  page.on('console', async (m) => { if (m.type() === 'error') P.errors.push({ day: P.day, route: await route(), text: m.text().slice(0, 200) }); });
  page.on('pageerror', async (e) => { P.errors.push({ day: P.day, route: await route(), text: 'pageerror: ' + String(e.message).slice(0, 200) }); });
  page.on('response', async (r) => { if (r.status() >= 400 && !/favicon/.test(r.url())) P.errors.push({ day: P.day, route: await route(), text: `HTTP ${r.status()} ${r.url().replace(base, '/')}` }); });

  const log = (what, extra = {}) => { P.steps.push({ day: P.day, what, ...extra }); if (process.env.JOURNEY_TRACE) console.error(((Date.now() - T0) / 1000).toFixed(1) + 's ' + cfg.key + ' d' + P.day + ' ' + what); };
  const shot = async (slug) => {
    if (!wantShots) return null;
    const f = `${cfg.key}-d${P.day}-${slug}.jpg`;
    try { await page.screenshot({ path: join(outDir, f), type: 'jpeg', quality: 38 }); P.shots++; return 'docs/qa/journey/' + f; } catch { return null; }
  };
  const F = (sev, id, title, repro, evidence, extra = {}) => { if (P.findings.some((x) => x.id === id && x.persona === cfg.key)) return; P.findings.push({ persona: cfg.key, day: P.day, sev, id, title, repro, evidence, ...extra }); };
  const safe = async (label, fn) => { try { return await fn(); } catch (e) { log('SCRIPT PROBLEM (not an app finding): ' + label, { error: String(e.message).split('\n')[0].slice(0, 160) }); return null; } };
  const text = (sel) => page.locator(sel).first().innerText({ timeout: 1500 }).catch(() => '');
  const vis = (sel) => page.locator(sel).first().isVisible().catch(() => false);
  const mainText = () => page.locator('#main').innerText({ timeout: 2000 }).then((t) => t.replace(/\s+/g, ' ').trim()).catch(() => '');
  const hash = () => route();
  const setOff = (off) => page.evaluate((o) => { window.__qaOff = o; sessionStorage.setItem('__qa_off', String(o)); }, off);
  const getOff = () => page.evaluate(() => window.__qaOff);
  const reopen = async (day, frag = '#/') => { // a fresh page load at 09:00 on simulated day `day`: "the learner opens the app"
    if (!page.url().startsWith(base)) await page.goto(base, { waitUntil: 'domcontentloaded' });
    await setOff(START + (day - 1) * DAY - Date.now());
    await page.evaluate((f) => { location.hash = f; }, frag);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 15000 }).catch(() => {});
  };
  const go = async (frag) => { await page.evaluate((f) => { location.hash = f; }, frag); await sleep(450); await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 8000 }).catch(() => {}); };
  const dwell = async (steps) => { // simulate time spent: pointer event, then clock +55 s, then let the 1 s tick run
    for (let i = 0; i < steps; i++) {
      await page.evaluate(() => document.dispatchEvent(new Event('pointerdown', { bubbles: true })));
      await setOff((await getOff()) + 55000); await sleep(1150);
    }
  };
  const storeGet = (k) => page.evaluate((key) => { try { return window.alef.store.get(key); } catch { return null; } }, k);

  // ---------- Today card ----------
  async function snapToday(label) {
    await page.waitForSelector('#home-today[data-state]', { timeout: 9000 }).catch(() => {});
    const has = await vis('#home-today[data-state]');
    if (!has) { log('Today card did not render', { label }); return { rendered: false }; }
    const s = await page.evaluate(() => {
      const q = (x) => document.querySelector(x); const t = (x) => (q(x)?.innerText || '').replace(/\s+/g, ' ').trim();
      const p = q('#today-continue');
      return { rendered: true, state: q('#home-today').dataset.state, text: t('#home-today'), primaryLabel: p ? p.innerText.trim() : null, primaryHref: p ? p.getAttribute('href') : null,
        streak: t('#today-streak'), due: t('#today-due'), dueHref: q('#today-due a')?.getAttribute('href') || null, goalOn: q('#today-goal [aria-pressed=true]')?.dataset.goal || null,
        next: [...document.querySelectorAll('#home-today .next-lesson a')].map((a) => ({ t: a.innerText, h: a.getAttribute('href') })), more: [...document.querySelectorAll('#today-more a')].map((a) => a.innerText) };
    });
    log('Today card' + (label ? ' (' + label + ')' : ''), { state: s.state, primary: s.primaryLabel, href: s.primaryHref, streak: s.streak, due: s.due, goalOn: s.goalOn });
    return s;
  }

  // ---------- onboarding ----------
  async function onboard() {
    P.day = 1;
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 15000 }).catch(() => {});
    const h = await hash();
    log('first open lands on', { hash: h });
    if (!/welcome/.test(h)) F('high', 'first-open-not-welcome', 'First open did not land on the welcome screen', ['Open the app with empty storage'], { hash: h });
    await page.waitForSelector('#ob-form-letters', { timeout: 8000 }).catch(() => {});
    // press Continue with nothing chosen
    await page.click('#ob-letters-continue').catch(() => {});
    const msg = await text('#ob-status');
    log('Continue with no answer', { status: msg });
    await page.check(`#ob-letters-${cfg.letters}`).catch(() => {});
    await page.click('#ob-letters-continue');
    await page.waitForSelector('#ob-form-congregation', { timeout: 5000 }).catch(() => {});
    if (cfg.denom) await page.check(`#ob-denomination-${cfg.denom}`).catch(() => {});
    const suggested = await page.evaluate(() => document.querySelector('input[name=pron]:checked')?.value || null);
    log('pronunciation preselected after denomination', { denom: cfg.denom, suggested, wanted: cfg.pron });
    await page.check(`#ob-pron-${cfg.pron}`).catch(() => {});
    await page.click('#ob-congregation-continue');
    await page.waitForSelector('#ob-form-minutes', { timeout: 5000 }).catch(() => {});
    await sleep(600); // the minutes screen re-renders once its plan data has loaded
    await page.click(`label[for=ob-goal-${cfg.goal}]`).catch(() => {}); // the goal question (read | israel | both) is on the minutes screen
    await page.check(`#ob-minutes-${cfg.minutes}`).catch(() => {});
    await page.click('#ob-minutes-continue');
    await page.waitForSelector('.ob-plan', { timeout: 8000 }).catch(() => {});
    P.plan = await page.evaluate(() => ({
      text: (document.querySelector('.ob-plan')?.innerText || '').replace(/\s+/g, ' ').trim(),
      days: [...document.querySelectorAll('.ob-days > li')].map((li) => ({ label: li.querySelector('strong')?.innerText, items: [...li.querySelectorAll('ul a')].map((a) => ({ t: a.innerText, h: a.getAttribute('href') })) })),
      start: { label: document.querySelector('#ob-start')?.innerText, href: document.querySelector('#ob-start')?.getAttribute('href') },
      goalMentioned: /\bisrael\b/i.test(document.querySelector('.ob-plan')?.innerText || ''),
    }));
    P.plan.trackShare = await page.evaluate(async (goal) => { const m = await import(new URL('src/curriculum/lessons.js', location.origin + '/').href); const ids = [...document.querySelectorAll('.ob-days a')].map((a) => (a.getAttribute('href').match(/lesson=([\w-]+)/) || [])[1]).filter(Boolean); const want = goal === 'israel' ? 'israel' : 'read'; return { lessons: ids.length, inGoalTrack: ids.filter((i) => m.lessons.find((l) => l.id === i)?.track === want).length }; }, cfg.goal);
    log('plan card', { days: P.plan.days.length, start: P.plan.start });
    P.planShot = await shot('plan');
    if (!P.plan.days.length) F('high', 'plan-empty', 'The "Your week" card has no days', ['Finish the four onboarding questions'], { plan: P.plan.text, shot: P.planShot });
    if (cfg.goal === 'israel' && P.plan.trackShare && P.plan.trackShare.inGoalTrack < P.plan.trackShare.lessons) F('medium', 'plan-ignores-goal', 'Onboarding asked for the Israel goal but the week plan lists read-track lessons', ['Choose Speaking in Israel on the goal question', 'Read Your week'], { trackShare: P.plan.trackShare, shot: P.planShot });
    const store = await storeGet('onboarding.v1');
    P.onboardingRecord = store;
  }

  // ---------- screens ----------
  async function doFirstday() {
    const steps = [];
    for (let i = 0; i < 14; i++) {
      const h2 = await text('.fd-body h2'); const body = await text('.fd-body');
      steps.push(h2);
      if (/Step\s+\d+ of/.test(body) === false) break;
      const hear = page.locator('.fd-body button:has-text("Hear it")').first();
      if (await hear.count()) { await hear.click(); await sleep(500); const st = await text('.alef-firstday [role=status]'); log('first 10: Hear it', { step: h2, status: st }); if (/not available/i.test(st)) P.notes.push('first10-hear: ' + st); }
      const chk = page.locator('.fd-body button:has-text("Check my reading")').first();
      if (await chk.count()) { await chk.click(); await sleep(250); log('first 10: Check my reading', { status: await text('.alef-firstday [role=status]') }); }
      const opts = page.locator('.fd-body button[lang=he]');
      if (await opts.count()) { // the check question: miss first, then answer right (the right word is "shalom" in data/firstday/first10.json)
        const right = await page.evaluate(async () => { const d = await (await fetch('data/firstday/first10.json')).json(); return d.words.find((w) => w.id === 'shalom').he; });
        const all = await opts.allInnerTexts();
        const wrong = all.find((t) => t.trim() !== right);
        await page.locator('.fd-body button[lang=he]', { hasText: wrong }).first().click(); await sleep(200);
        log('first 10: check answered wrong on purpose', { status: await text('.alef-firstday [role=status]') });
        await page.locator('.fd-body button[lang=he]', { hasText: right }).first().click(); await sleep(200);
        log('first 10: check answered right', { status: await text('.alef-firstday [role=status]') });
      }
      const next = page.locator('.fd-body button:has-text("Next")').first();
      if (!(await next.count())) break;
      await next.click(); await sleep(150);
    }
    const finalText = await mainText();
    const acts = await page.evaluate(() => [...document.querySelectorAll('#main a, #main button')].filter((e) => e.offsetParent).map((e) => ({ tag: e.tagName, t: (e.innerText || '').trim().slice(0, 40), h: e.getAttribute('href') })));
    P.firstdayDone = { steps, finalText: finalText.slice(0, 400), actions: acts };
    log('first 10 minutes finished', { steps: steps.length, actionsOnLastScreen: acts.length, last: finalText.slice(-200) });
    const s = await shot('firstday-done');
    if (!acts.length) F('high', 'firstday-dead-end', 'Last "first 10 minutes" screen has no next action in the page', ['Finish onboarding', 'Tap the Today card button', 'Press Next through all eight steps'], { text: finalText.slice(-300), shot: s });
    else if (!acts.some((a) => a.h && /#\/(learn|$)/.test(a.h))) F('medium', 'firstday-done-no-link-forward', 'The finished "first 10 minutes" screen has no button to the next lesson (only the app navigation is left)', ['Finish onboarding as a beginner', 'Tap the Today card button', 'Press Next through all eight steps', 'Read the last screen'], { text: finalText.slice(-300), actions: acts.map((a) => a.t + (a.h ? ' -> ' + a.h : '')).slice(0, 12), shot: s });
  }

  async function doLesson() {
    const h = await hash(); const id = (h.match(/lesson=([\w-]+)/) || [])[1];
    await page.waitForSelector('.alef-actions', { timeout: 8000 }).catch(() => {});
    const title = await text('#view-title');
    const locked = await text('.alef-locked');
    const t0 = await mainText();
    const play = page.locator('.alef-play, button[aria-label^="Listen"]').first();
    if (await play.count()) { await play.click().catch(() => {}); await sleep(700); const note = await text('.alef-audio-note'); log('lesson: Listen', { lesson: id, note }); if (/speech-error/.test(note)) P.notes.push('lesson Listen note: ' + note); P.audioNotes = (P.audioNotes || []).concat(note); }
    P.soundStatus = P.soundStatus || await text('#sound-status');
    const vow = await page.evaluate(() => [...document.querySelectorAll('#l-vowels li')].map((li) => li.innerText.replace(/\s+/g, ' ').trim()).slice(0, 3));
    if (vow.length) log('lesson: vowel text shown', { lesson: id, pron: cfg.pron, vowels: vow });
    const btn = page.locator('.alef-actions button.btn').first();
    const disabled = await btn.isDisabled().catch(() => true);
    if (disabled) {
      const s = await shot('lesson-locked-' + id);
      log('lesson: complete button disabled', { lesson: id, locked });
      F('high', 'lesson-locked-dead-end', `Recommended lesson ${id} is locked and its Complete button is disabled`, ['Finish the placement check', 'Tap "Go to this lesson" / the Today card button', 'Scroll to the bottom of the lesson'], { lesson: id, locked, shot: s, links: await page.evaluate(() => [...document.querySelectorAll('.alef-locked a, .alef-lesson-page a')].map((a) => a.innerText.trim() + ' -> ' + a.getAttribute('href')).slice(0, 8)) });
      // a person would look around: what does the lesson list offer?
      await go('#/learn');
      const list = await page.evaluate(() => ({ text: (document.querySelector('#main')?.innerText || '').replace(/\s+/g, ' ').slice(0, 500), startButtons: [...document.querySelectorAll('#main a, #main button')].filter((e) => /^Start$/.test(e.innerText.trim())).length }));
      log('learn list after a locked lesson', list); P.learnListAfterLock = list;
      return { done: false, locked: true, id };
    }
    // the learner has only read the page: there is no exercise on it. Record how long the page is and complete.
    const lenInfo = await page.evaluate(() => ({ cards: document.querySelectorAll('#main section.card').length, exercises: document.querySelectorAll('#main input, #main [role=radio], #main select').length }));
    // the lesson now ends in a quick check (first option every time: a learner who guesses; misses come back once)
    await btn.click(); await sleep(300);
    let qn = 0;
    for (let g = 0; g < 90; g++) {
      if (/Lesson complete/.test(await text('.alef-quiz-host'))) break;
      const cont = page.locator('.alef-quiz-host button[data-act="next"]:visible').first();
      if (await cont.count()) { await cont.click().catch(() => {}); await sleep(80); continue; }
      const opt = page.locator('.alef-quiz-host button[data-n="1"]').first();
      if (await opt.count()) { await opt.click().catch(() => {}); qn++; await sleep(80); } else await sleep(120);
    }
    const done = await text('.alef-quiz-host');
    log('lesson: quick check finished', { lesson: id, questionsAnswered: qn, done: done.replace(/\s+/g, ' ').slice(0, 140), ...lenInfo });
    const s = await shot('lesson-complete-' + id);
    return { done: /complete/i.test(done), id, title, doneText: done, shot: s };
  }

  async function doReview(missEvery = 3) {
    await page.waitForSelector('.alef-review', { timeout: 8000 }).catch(() => {});
    const first = await mainText();
    let n = 0, again = 0, hints = 0;
    for (let i = 0; i < 40; i++) {
      const show = page.locator('.alef-review button:has-text("Show answer")').first();
      if (await show.isVisible().catch(() => false)) {
        await show.click(); await sleep(120);
        const rate = missEvery && n % missEvery === 0 ? 1 : (n % 5 === 1 ? 2 : 3);
        if (rate === 1) again++;
        await page.locator(`.alef-review [data-rating="${rate}"]`).first().click(); n++;
        await sleep(260);
        continue;
      }
      const bodyTxt = await text('.alef-review-body');
      if (/Session done|Nothing due/.test(bodyTxt)) break;
      const b = page.locator('.alef-review-body button').first();
      if (await b.count()) { hints++; await b.click().catch(() => {}); await sleep(250); } else break;
    }
    const sum = await text('.alef-review-body');
    log('review session', { rated: n, again, hintPanels: hints, summary: sum.replace(/\s+/g, ' ').slice(0, 220), startedWith: first.slice(0, 120) });
    const s = await shot('review-summary');
    if (!n && /Nothing due/.test(sum)) F('low', 'review-nothing-due-shown-after-link', 'The "review due cards" link opened an empty session', ['Open the app', 'Tap the due-cards link'], { summary: sum.slice(0, 200), shot: s });
    return { rated: n, again, summary: sum, shot: s };
  }

  async function doPlacement() {
    await page.waitForSelector('#placement-start', { timeout: 8000 }).catch(() => {});
    const items = await page.evaluate(async () => {
      const { loadPlacementData } = await import(new URL('src/placement/loader.js', location.origin + '/').href);
      const { buildItems, seeded } = await import(new URL('src/placement/model.js', location.origin + '/').href);
      const P = await loadPlacementData();
      return buildItems(P.data, P.config, seeded(P.config.seed)).map((i) => ({ id: i.id, cat: i.cat, lesson: i.lesson, prompt: i.prompt, options: i.options }));
    });
    log('placement: items derived from app data', { total: items.length, cats: [...new Set(items.map((i) => i.cat))] });
    await page.click('#placement-start');
    let asked = 0, right = 0; const seq = []; const vowelN = { n: 0 };
    for (let i = 0; i < items.length + 2; i++) {
      const q = await text('.alef-placement p.muted');
      if (!/Question \d+/.test(q)) break;
      const it = items[asked];
      // this learner reads letters and vowels well (answered "Yes, I read with vowels"): right on letters, vowels and syllables (one vowel slip), then wrong or "Not sure" on words and phrases
      let want = 'wrong';
      if (it.cat === 'letters' || it.cat === 'syllables') want = 'right'; else if (it.cat === 'vowels') want = (vowelN.n++ % 3 === 2) ? 'wrong' : 'right'; else want = asked % 2 ? 'notsure' : 'wrong';
      const correct = it.options.find((o) => o.correct); const wrong = it.options.find((o) => !o.correct);
      if (want === 'notsure') await page.locator('.ps-opts button:has-text("Not sure")').click();
      else await page.locator('.ps-opts button', { hasText: new RegExp('^\\s*' + (want === 'right' ? correct : wrong).label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$') }).first().click();
      if (want === 'right') right++;
      seq.push(it.cat[0] + (want === 'right' ? '+' : want === 'wrong' ? '-' : '?'));
      asked++;
      await page.locator('#placement-next').click({ timeout: 3000 }).catch(() => {});
      await sleep(80);
    }
    await page.waitForSelector('#placement-go', { timeout: 5000 }).catch(() => {});
    const res = await mainText();
    const s = await shot('placement-result');
    const rec = await storeGet('placement.v1');
    log('placement: result', { asked, right, seq: seq.join(''), result: rec?.result, text: res.slice(0, 260) });
    P.placement = { asked, right, seq: seq.join(''), result: rec?.result };
    return { lesson: rec?.result?.lesson, shot: s };
  }

  async function visitTool(name, frag) {
    const h0 = await hash();
    await go(frag);
    const t = await mainText();
    const s = await shot('tool-' + name);
    log('tool opened: ' + name, { text: t.slice(0, 200) });
    return { t, s };
  }
  async function toolListen() {
    const { t, s } = await visitTool('listen', '#/listen');
    if (/Audio not recorded|not recorded yet|no recording/i.test(t)) P.notes.push('listen: no recorded audio, falls back to read-and-match: "' + t.slice(0, 160) + '"');
    const start = page.locator('main button:has-text("Start")').first();
    if (!(await start.count())) { F('medium', 'listen-no-start', 'Listen screen has no start button', ['Open #/listen'], { text: t.slice(0, 200), shot: s }); return; }
    const mode = /read-and-match/i.test(await start.innerText()) ? 'read' : 'audio';
    await start.click(); await sleep(350);
    const words = await page.evaluate(async () => { const j = await (await fetch('data/vocab/words.json')).json(); const m = {}; for (const w of j.words) (m[w.en] ||= []).push(w.he); return m; });
    let done = 0, wrongN = 0;
    for (let i = 0; i < 12; i++) {
      const q = await text('.ls-body p');
      if (/Done:/.test(await text('.ls-body'))) break;
      const m = q.match(/means: (.*)\?$/);
      const choices = await page.locator('.ls-opts button').allInnerTexts();
      if (!choices.length) break;
      let pick = choices[0];
      if (m && words[m[1]]) { const rightHe = words[m[1]]; const r = choices.find((c) => rightHe.includes(c.trim())); if (r) pick = r; }
      if (i === 1) pick = choices.find((c) => c !== pick) || pick; // one deliberate miss
      if (i === 1) wrongN++;
      await page.locator('.ls-opts button', { hasText: pick }).first().click(); await sleep(150);
      const nx = page.locator('.ls-body button:has-text("Next word"), .ls-body button:has-text("Finish")').first();
      if (!(await nx.count())) break;
      await nx.click(); await sleep(120); done++;
    }
    log('listen: round', { mode, answered: done, deliberateMisses: wrongN, end: (await text('.ls-body')).replace(/\s+/g, ' ').slice(0, 120) });
  }
  async function toolTyping() {
    const { t, s } = await visitTool('typing', '#/typing');
    await page.click('#ty-drill-letters').catch(() => {});
    await sleep(250);
    let n = 0;
    for (let i = 0; i < 12; i++) {
      if (!(await vis('#ty-input'))) break;
      const prompt = (await text('#ty-prompt')).trim();
      const missIt = i === 2;
      await page.locator('#ty-input').fill(missIt ? 'ק' : prompt); await sleep(120);
      if (await vis('#ty-next')) await page.click('#ty-next'); else if (await vis('#ty-check')) { await page.keyboard.press('Enter'); }
      n++; await sleep(150);
    }
    await page.click('#ty-stop').catch(() => {}); await sleep(250);
    const sum = await text('#ty-summary'); const s2 = await shot('typing-summary');
    log('typing: letters round', { answered: n, summary: sum.replace(/\s+/g, ' ').slice(0, 160), deliberateMisses: 1 });
    await page.click('#ty-menu').catch(() => {}); await sleep(200);
    log('typing: totals line after the round', { totals: (await text('#ty-totals')).replace(/\s+/g, ' ').slice(0, 220) });
  }
  async function toolSpeak() {
    const { t, s } = await visitTool('speak', '#/speak');
    const caps = await text('#speak-caps');
    log('speak: capabilities line', { caps });
    P.notes.push('speak: the browser-listening (microphone) path was NOT exercised: headless Chromium has no microphone or permission prompt, so only the self-judged mode was run.');
    await page.check('#speak-mode-self').catch(() => {});
    await page.click('#speak-start').catch(() => {}); await sleep(400);
    let n = 0;
    for (let i = 0; i < 3; i++) {
      if (!(await vis('#speak-said'))) break;
      await page.click(i === 1 ? '#speak-notyet' : '#speak-said'); await sleep(250);
      const nx = page.locator('#speak-next'); if (!(await nx.count())) break;
      await nx.click(); await sleep(250); n++;
    }
    await page.click('#speak-finish').catch(() => {}); await sleep(350);
    const end = await mainText();
    log('speak: self-judged round', { answered: n, end: end.slice(0, 220) });
    const s4 = await shot('speak-end');
    return { end, s4 };
  }
  async function toolProgress(label) {
    const { t, s } = await visitTool('progress', '#/progress');
    const prog = await page.evaluate(() => {
      const q = (x) => (document.querySelector(x)?.innerText || '').replace(/\s+/g, ' ').trim();
      return { today: q('section[aria-labelledby=pg-h-today]'), now: [...document.querySelectorAll('.pg-now li')].map((li) => li.innerText.replace(/\s+/g, ' ').trim().slice(0, 110)), week: [...document.querySelectorAll('.pg-week li')].map((li) => li.innerText.replace(/\s+/g, ' ').trim()), numbers: q('#pg-h-num ~ dl') };
    });
    log('progress screen' + (label ? ' (' + label + ')' : ''), prog);
    return { prog, s };
  }


  // ---------- persona E: only /read and the siddur track ----------
  async function runReadDay(d, day) {
    const t = await snapToday('open (E never presses it)'); day.today = t; day.todayShot = await shot('today');
    P.streakShown[d] = t.streak;
    // from Home, the way a siddur reader would: the Opening card link
    const link = page.locator('.opening a.btn').first();
    if (await link.count()) { await link.click(); await sleep(500); } else { await go('#/read'); F('medium', 'read-no-link-from-home', 'Home has no visible link to the reader', ['Open Home'], { text: t.text.slice(0, 160) }); }
    await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 8000 }).catch(() => {});
    await page.waitForSelector('#crp-pick', { timeout: 6000 }).catch(() => {});
    const opts = await page.locator('#crp-pick option').allInnerTexts().catch(() => []);
    const pickIdx = opts.length ? (d - 1) % opts.length : 0;
    if (opts.length) { await page.selectOption('#crp-pick', { index: pickIdx }).catch(() => {}); await sleep(300); }
    const title = await text('#crp-h');
    const hasHeb = hebrew.test(await mainText());
    const tl = page.locator('.crp-bar input[type=checkbox]').first(); if (await tl.count()) { await tl.check().catch(() => {}); await sleep(150); }
    const play = page.locator('.crp-play').first(); if (await play.count()) { await play.click().catch(() => {}); await sleep(600); }
    const lt = page.locator('.crp-ltr').first(); if (await lt.count()) { await lt.click().catch(() => {}); await sleep(150); }
    const rText = await mainText(); const rShot = await shot('read-text');
    const nextLinks = await page.evaluate(() => [...document.querySelectorAll('#main a, #main button')].filter((e) => e.offsetParent).map((e) => (e.innerText || '').trim().slice(0, 40)).slice(0, 25));
    log('read: text opened', { opts: opts.length, picked: opts[pickIdx], title, hasHebrew: hasHeb, status: (await text('.crp-status')).slice(0, 120), mainActions: nextLinks.length });
    if (!hasHeb) F('high', 'read-no-hebrew', 'The reader shows no Hebrew text', ['Home > Open the reader'], { text: rText.slice(0, 200), shot: rShot });
    P.notes.push(`day ${d}: read "${opts[pickIdx] || '?'}"; links on page: ${nextLinks.slice(0, 8).join(' | ')}`);
    if (d === 1 || d === 4) { await go('#/learn'); const tab = page.locator('#alef-tab-read'); if (await tab.count()) { await tab.click(); await sleep(200); } log('learn: siddur track', { text: (await mainText()).slice(0, 220) }); }
    await go('#/read'); const before = await storeGet('streak');
    await dwell(6);
    await go('#/'); const after = await storeGet('streak'); const t3 = await snapToday('after ~6 min on /read');
    day.afterDwell = { streak: t3.streak, record: after, before };
    P.didSomething[d] = true; P.dwelled[d] = true;
    if (d === 1 && (after?.todaySeconds || 0) < 300) F('medium', 'read-time-not-counted', 'Six minutes in the reader does not count toward the streak', ['Open Home > Open the reader', 'Read for about six minutes (moving pointer)', 'Open Home'], { record: after, line: t3.streak, shot: rShot });
    if (d >= 3 && t3.state === 'first-run') F('medium', 'home-still-first-run', `After ${d} days of reading in the reader, Home still says first-run (nothing recorded about this learner)`, ['Use only /read for several days', 'Open Home'], { text: t3.text.slice(0, 200), primary: t3.primaryLabel, shot: await shot('today-first-run') });
  }

  // ---------- one day ----------
  async function runDay(d) {
    P.day = d;
    const day = { d, tasks: [] }; P.days[d] = day;
    if (cfg.skipDay === d || (cfg.skipDays || []).includes(d)) { log('learner skipped this day (did not open the app)'); P.didSomething[d] = false; P.dwelled[d] = false; return; }
    if (d > 1) await reopen(d);
    else { await go('#/'); day.planStart = P.plan?.start; }
    if (cfg.readOnly) return runReadDay(d, day);
    const light = cfg.lightDay === d;
    let t = await snapToday('open'); day.today = t; day.todayShot = await shot('today');
    const stNow = await storeGet('streak');
    day.streakRecord = stNow;
    if (cfg.key === 'D' && d === 13) {
      const due = Number((t.due.match(/^(\d+)/) || [])[1] || 0);
      log('D returns after 10 days', { primary: t.primaryLabel, due: t.due, streak: t.streak, record: stNow });
      day.returnCheck = { primary: t.primaryLabel, due, streak: t.streak, text: t.text.slice(0, 300) };
      if (/No streak yet/.test(t.streak || '') && (stNow?.best || 0) > 0) F('medium', 'return-says-no-streak', 'A returning learner with a best streak is told No streak yet', ['Study 2 days, skip 10, open Home'], { line: t.streak });
      if (!t.primaryHref) F('high', 'return-no-primary', 'No main action for a returning learner', ['Open Home after 10 days'], { text: t.text });
      if (due >= 20 && !/review/i.test(t.primaryLabel || '')) F('medium', 'return-backlog-not-first', 'Returning learner has ' + due + ' cards due and the main action is not review: ' + t.primaryLabel, ['Study, skip 10 days, open Home'], { text: t.text.slice(0, 200) });
      if (!/welcome back/i.test(t.text)) F('low', 'return-no-welcome-back', 'Home does not greet a learner returning after 10 days', ['Study 2 days, skip 10, open Home'], { text: t.text.slice(0, 200) });
    }
    P.streakShown[d] = t.streak;
    // compare the streak line with what a learner who did something every day would expect
    const learnerExpected = (() => { let c = 0; for (let k = d - 1; k >= 1; k--) { if (P.didSomething[k]) c++; else break; } return c; })();
    const ruleExpected = (() => { let c = 0; for (let k = d - 1; k >= 1; k--) { if (P.dwelled[k]) c++; else break; } return c; })();
    const shownN = Number((t.streak?.match(/^Streak:\s*(\d+) day/) || [])[1] || 0);
    if (d > 1 && shownN === 0 && /No streak yet/.test(t.streak || '') && (stNow?.best || 0) > 0) F('medium', 'streak-lost-wording', `Home says "No streak yet" to a learner whose best streak is ${stNow.best} days`, [`Persona ${cfg.key}: build a streak, then ${cfg.skipDay ? 'skip day ' + cfg.skipDay : 'do only a short review on day ' + cfg.lightDay}`, 'Open Home the next day'], { line: t.streak, best: stNow.best, progressOffers: 'Progress has "Count yesterday as a rest day" (not shown on Home)', shot: day.todayShot });
    day.streakCheck = { shown: shownN, learnerExpected, ruleExpected, line: t.streak };
    if (d > 1 && shownN !== ruleExpected && shownN !== learnerExpected) F('medium', 'streak-vs-rule', `Home streak shows ${shownN} but the 5-minute rule predicts ${ruleExpected}`, [`Persona ${cfg.key}`, `Open Home on day ${d}`], { line: t.streak, shot: day.todayShot });
    if (d > 1 && shownN !== learnerExpected && !/5 minutes/.test(t.streak || '')) F(shownN < learnerExpected ? 'high' : 'medium', 'streak-vs-actions', `Home streak shows ${shownN} but the learner did something on ${learnerExpected} consecutive days`, [`Persona ${cfg.key}: on days ${Object.keys(P.didSomething).filter((k) => P.didSomething[k] && !P.dwelled[k]).join(',') || '(none)'} only a short activity (under 5 min) was done`, `Open Home on day ${d}`], { line: t.streak, learnerExpected, ruleExpected, shot: day.todayShot });
    if (d > 1 && shownN !== ruleExpected) P.notes.push(`day ${d}: streak shown ${shownN}, rule (>=300 s engaged on each past day) predicts ${ruleExpected}`);
    // plan vs Today
    if (P.plan?.days?.[d - 1]) { const planned = P.plan.days[d - 1].items.map((i) => i.h); const first = t.primaryHref; day.planCompare = { plan: P.plan.days[d - 1], today: t.primaryLabel, todayHref: first, match: planned.some((h) => h && first && h.replace(/^#?/, '#') === first) }; }
    if (day.planCompare && !day.planCompare.match) P.notes.push(`day ${d}: plan card says [${day.planCompare.plan.items.map((i) => i.t).join(' | ')}] but Today says "${t.primaryLabel}"`);
    if (cfg.goalProbe === d) { // the learner picks a longer daily goal on the Today card, then studies about six minutes
      await page.click('#today-goal-box summary').catch(() => {}); await page.click('#today-goal [data-goal="20"]').catch(() => {}); await sleep(250);
      day.goalProbe = { picked: 20, pressedNow: (await snapToday('after tapping 20 min')).goalOn, stored: await storeGet('onboarding.v1.dailyGoal'), onboardingMinutes: (await storeGet('onboarding.v1'))?.minutesPerDay };
    }
    // follow the Today card
    const budget = light ? 1 : (d === 1 ? 2 : cfg.tasks); const seen = new Set();
    for (let k = 0; k < budget; k++) {
      if (k > 0) { await go('#/'); t = await snapToday('after task ' + k); }
      if (!t.rendered || !t.primaryHref) { F('high', 'today-no-primary', 'Today card has no button to press', ['Open Home'], { text: t.text, shot: await shot('today-no-primary') }); break; }
      if (seen.has(t.primaryHref)) { log('Today card repeats the same recommendation', { href: t.primaryHref }); P.notes.push(`day ${d}: Today repeated "${t.primaryLabel}" after doing it`); F('medium', 'today-repeats', 'Today card keeps recommending something already done', ['Do what the Today card says', 'Go back Home', 'Read the card again'], { label: t.primaryLabel, href: t.primaryHref, shot: await shot('today-repeat') }); break; }
      seen.add(t.primaryHref);
      if (light && t.due && !/No reviews/.test(t.due) && t.dueHref) { // a busy day: only the due cards
        await page.click('#today-due a'); await sleep(500);
      } else { await page.click('#today-continue'); await sleep(600); }
      await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 8000 }).catch(() => {});
      const h = await hash(); let r = null;
      if (/#\/firstday$/.test(h)) r = await safe('firstday', doFirstday);
      else if (/#\/placement/.test(h)) { r = await safe('placement', doPlacement); if (r?.lesson) { await page.click('#placement-go'); await sleep(500); r.lesson2 = await safe('lesson after placement', doLesson);
        await go('#/'); const tp = await snapToday('after the placement lesson'); day.afterPlacement = { placed: r.lesson, today: tp.primaryHref, label: tp.primaryLabel };
        if (tp.primaryHref && !tp.primaryHref.endsWith('lesson=' + r.lesson) && !r.lesson2?.done) F('high', 'today-contradicts-placement', `Placement said start at ${r.lesson}; Today card then says ${tp.primaryHref.replace('#/learn?lesson=', '')}`, ['Finish onboarding choosing "Yes, I read with vowels"', 'Run the placement check', 'Open the suggested lesson', 'Go Home and read the Today card'], { placed: r.lesson, todayLabel: tp.primaryLabel, todayHref: tp.primaryHref, shot: await shot('today-after-placement') }); } }
      else if (/review=1/.test(h) && !/lesson=/.test(h)) r = await safe('review', () => doReview(3));
      else if (/lesson=/.test(h)) { r = await safe('lesson', doLesson); if (r?.done && cfg.reviewAfter) { const rn = page.locator('a:has-text("Review now")').first(); if (await rn.count()) { await rn.click(); await sleep(500); r.review = await safe('review after lesson', () => doReview(3)); } } }
      else { log('Today button led to', { hash: h, text: (await mainText()).slice(0, 160) }); }
      day.tasks.push({ href: t.primaryHref, label: t.primaryLabel, hash: h, result: r });
      P.didSomething[d] = true;
      // streak straight after the action (no dwell yet): does Home claim progress?
      if (k === 0) { await go('#/'); const t2 = await snapToday('right after first task'); day.afterFirstTask = { streak: t2.streak, due: t2.due, primary: t2.primaryLabel }; }
    }
    // tools on a schedule
    const sched = { 1: ['speak', 'typing', 'listen', 'progress'], 2: ['speak'], 3: ['typing'], 4: ['listen'], 5: ['progress'], 6: ['speak', 'typing'], 7: ['progress', 'listen'] }[d] || [];
    if (!quick || d === 1) for (const tl of sched) {
      if (light && tl !== 'listen') continue;
      if (tl === 'speak') await safe('speak', toolSpeak); if (tl === 'typing') await safe('typing', toolTyping); if (tl === 'listen') await safe('listen', toolListen);
      if (tl === 'progress') { const r = await safe('progress', () => toolProgress('day ' + d)); day.progress = r?.prog; }
    }
    // time spent: a learner at their stated minutes; a light day gets only ~1 minute (no dwell step)
    await go('#/'); { const tb = await snapToday('before the 5-minute mark'); day.beforeDwell = { streak: tb.streak, record: await storeGet('streak') };
      const didWork = (day.tasks || []).some((x) => x.result && (x.result.done || x.result.rated || x.result.lesson2?.done));
      if (didWork && /(lesson or (a )?review card|Learn something today)/i.test(tb.streak || '')) F('high', 'streak-copy-vs-rule', 'Home says a lesson or a review card starts the streak, but finishing lessons and reviewing cards did not', [`Persona ${cfg.key}: finish ${day.tasks.length} Today-card task(s) on day ${d} (lessons completed and cards rated), spend under 5 minutes`, 'Open Home and read the Streak line'], { line: tb.streak, record: day.beforeDwell.record, shot: await shot('streak-before-5min') }); }
    if (!light) {
      await go('#/learn'); const before = await storeGet('streak');
      await dwell(6);
      await go('#/'); const after = await storeGet('streak');
      const t3 = await snapToday('after 5+ min'); day.afterDwell = { streak: t3.streak, record: after };
      P.dwelled[d] = true;
      if (day.goalProbe) { day.goalProbe.afterDwellStreak = t3.streak; day.goalProbe.record = after; if (/Done for today/.test(t3.streak || '')) F('medium', 'daily-goal-ignored', 'Daily goal buttons (5-20 min) and the onboarding minutes do not change when the day counts', ['Finish onboarding choosing 15 minutes', 'Open Home: the card highlights 5 min', 'Tap 20 min', 'Study about six minutes'], { onboardingMinutes: day.goalProbe.onboardingMinutes, highlightedAtOpen: day.today?.goalOn, tapped: 20, streakAfter: t3.streak, secondsCounted: after?.todaySeconds }); }
      if (d === 1 && day.today?.goalOn && P.onboardingRecord?.minutesPerDay && String(P.onboardingRecord.minutesPerDay) !== String(day.today.goalOn)) F('medium', 'onboarding-minutes-not-carried', `Onboarding saved ${P.onboardingRecord.minutesPerDay} min a day but the Today card highlights ${day.today.goalOn} min`, ['Finish onboarding choosing ' + P.onboardingRecord.minutesPerDay + ' minutes', 'Open Home and read the Daily goal buttons'], { saved: P.onboardingRecord.minutesPerDay, highlighted: day.today.goalOn, shot: day.todayShot });
      if (d === 1) { await go('#/progress'); const pr = await page.evaluate(() => (document.querySelector('section[aria-labelledby=pg-h-today]')?.innerText || '').replace(/\s+/g, ' ')); day.progressTodayAfter = pr; await go('#/'); }
    } else { P.dwelled[d] = false; await go('#/'); day.afterLight = (await snapToday('end of light day')).streak; }
  }

  // ---------- go ----------
  await safe('onboarding', onboard);
  if (cfg.goal === 'israel') { // the goal was chosen in onboarding: does the first-run Today card follow it?
    await go('#/');
    const t0 = await snapToday('israel learner, first-run card');
    P.israelBefore = t0;
    const isIsraelLesson = await page.evaluate(async (h) => { const m = await import(new URL('src/curriculum/lessons.js', location.origin + '/').href); const id = ((h || '').match(/lesson=([\w-]+)/) || [])[1]; return m.lessons.find((l) => l.id === id)?.track === 'israel'; }, t0.primaryHref);
    log('israel learner: first-run card points at an Israel-track lesson?', { yes: isIsraelLesson, primary: t0.primaryLabel, goal: await page.evaluate(() => window.alef.settings.get('goal')) });
    if (!isIsraelLesson) F('medium', 'first-run-card-ignores-goal', 'With the Israel goal chosen in onboarding, the first-run Today card does not start an Israel-track lesson', ['Finish onboarding choosing Speaking in Israel', 'Open Home'], { text: t0.text.slice(0, 200), primary: t0.primaryLabel });
  }
  for (let d = 1; d <= daysFor(cfg); d++) { await safe('day ' + d, () => runDay(d)); }
  { // findings that need the whole week
    const fs0 = await page.evaluate(() => ({ streak: window.alef.store.get('streak'), completed: Object.keys((window.alef.store.get('curriculum.progress') || {}).completed || {}) })).catch(() => null);
    if (fs0 && !cfg.readOnly && fs0.completed.length === 0 && (fs0.streak?.count || 0) >= 2) F('high', 'streak-without-progress', `The streak reads ${fs0.streak.count} days but no lesson was ever completed`, ['Persona B: placement check answering well on letters and vowels', 'Press the Today button every day (a locked lesson), stay on the app about six minutes'], { streak: fs0.streak, completed: fs0.completed, todayEveryDay: Object.values(P.days).map((x) => `day ${x.d}: ${x.today?.primaryLabel}`).slice(0, 7), learnList: P.learnListAfterLock });
    const mism = Object.values(P.days).filter((x) => x.planCompare && !x.planCompare.match);
    if (mism.length >= 2) F('medium', 'plan-vs-today', `The "Your week" plan and the Today card disagree on ${mism.length} of ${Object.values(P.days).filter((x) => x.planCompare).length} days`, ['Finish onboarding and read the week plan', 'Each day open Home, press the Today card button and finish it', 'Compare with the plan day'], { examples: mism.slice(0, 3).map((x) => `day ${x.d}: plan [${x.planCompare.plan.items.map((i) => i.t).join(' | ')}] vs Today "${x.planCompare.today}"`), shot: P.planShot });
    if (false) F('medium', 'onboarding-never-asks-goal', 'Onboarding never asks about the goal; an Israel-track learner gets a read-track week plan', ['Finish onboarding (4 screens)', 'Read "Your week"', 'Open Settings, choose the Israel goal', 'Compare the plan days with the Today card'], { planDays: (P.plan.days || []).slice(0, 3).map((x) => x.label + ': ' + x.items.map((i) => i.t).join(' | ')), todayAfter: P.days[2]?.today?.primaryLabel, shot: P.planShot });
    if (false) F('low', 'first-run-card-ignores-goal', 'With the Israel goal set in Settings, the first-run Today card still talks only about reading Hebrew letters', ['Finish onboarding', 'Settings > Goal > Israel', 'Open Home'], { text: P.israelBefore.text.slice(0, 200) });
    const backlog = Object.values(P.days).filter((x) => x.today?.due && /^(\d+) cards? due/.test(x.today.due) && Number(x.today.due.match(/^(\d+)/)[1]) >= 20 && /lesson=/.test(x.today.primaryHref || ''));
    if (backlog.length) F('medium', 'today-never-prefers-review', `Today card kept recommending a new lesson with ${backlog[backlog.length - 1].today.due}`, [`Persona ${cfg.key} does not tap the due-cards link`, 'Each day press only the big Today button'], { days: backlog.map((x) => `day ${x.d}: ${x.today.due}; primary: ${x.today.primaryLabel}`), shot: backlog[backlog.length - 1].todayShot });
    if (/speech-error/.test(P.soundStatus || '') || P.notes.some((n) => /speech-error/.test(n))) F('low', 'raw-speech-error', 'Sound bar and lesson Listen button show a raw code ("speech-error")', ['Open any lesson', 'Tap Listen (headless Chromium has no speech voices; not checked in a real browser)'], { statusBar: P.soundStatus });
  }
  // dedupe errors
  const seen = new Set(); const errs = []; for (const e of P.errors) { const k = e.text; if (!seen.has(k)) { seen.add(k); errs.push(e); } }
  if (errs.length) F('medium', 'console-errors', `${errs.length} console/page/network error(s) during the journey`, ['Replay the persona'], { errors: errs.slice(0, 10) });
  const finalStore = await page.evaluate(() => ({ streak: window.alef.store.get('streak'), completed: Object.keys((window.alef.store.get('curriculum.progress') || {}).completed || {}), cards: (() => { const c = window.alef.store.get('srs.cards'); return Array.isArray(c) ? c.length : Object.keys(c || {}).length; })() })).catch(() => null);
  report.personas[cfg.key] = { name: cfg.name, plan: P.plan, placement: P.placement || null, steps: P.steps, findings: P.findings, errors: errs, days: P.days, notes: P.notes, finalStore, onboardingRecord: P.onboardingRecord, israelBefore: P.israelBefore || null };
  await ctx.close();
}

const t0 = Date.now();
await Promise.all(WHO.map((k) => PERSONAS[k] && runPersona(PERSONAS[k])));
report.personas = Object.fromEntries(Object.keys(PERSONAS).filter((k) => report.personas[k]).map((k) => [k, report.personas[k]]));
report.elapsedSeconds = Math.round((Date.now() - t0) / 1000);
report.counts = Object.fromEntries(Object.entries(report.personas).map(([k, p]) => [k, { steps: p.steps.length, findings: p.findings.length, errors: p.errors.length }]));
const keepAll = args.includes('--keep-all-shots') || !wantShots;
const cited = new Set([...JSON.stringify(Object.values(report.personas).map((p) => p.findings)).matchAll(/docs\/qa\/journey\/([\w.-]+\.jpg)/g)].map((m) => m[1]));
const isShot = (v) => typeof v === 'string' && /^docs\/qa\/journey\/[\w.-]+\.jpg$/.test(v);
// keep only the screenshots that findings cite (the doc stays small); other references in the JSON become null
const outJson = JSON.stringify(report, (k, v) => (!keepAll && isShot(v) && !cited.has(v.split('/').pop()) ? null : v), 1);
writeFileSync(join(outDir, 'journey.json'), outJson);
if (!keepAll) { const { readdirSync, unlinkSync } = await import('node:fs'); for (const f of readdirSync(outDir)) if (f.endsWith('.jpg') && !cited.has(f)) unlinkSync(join(outDir, f)); }
await browser.close(); server.close();
console.log(`journey: ${WHO.join(',')} ${quick ? '(quick) ' : ''}${DAYS} day(s), ${report.elapsedSeconds}s, ${JSON.stringify(report.counts)} -> ${relative(root, join(outDir, 'journey.json'))}`);
process.exit(0);
