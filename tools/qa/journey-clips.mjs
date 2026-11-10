// Real-browser journey with the first synthetic word clips present (headless Chrome, emulated phone). It walks the learner path,
// records the text and the Hear-button state at each step and saves 360x640 screenshots. Headless Chrome has no audio output, so this
// never checks that anything was HEARD: it records which file the page asked for and whether the media element reported 'ended' or an error.
// Usage: node tools/qa/journey-clips.mjs [--out DIR] [--shots DIR]   (QA_CHROME=/path/to/chrome to use a specific browser)
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
if (!chromium) { console.error('playwright not found'); process.exit(2); }
const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const outFile = resolve(root, arg('--out', 'docs/qa/journey-clips/journey-clips.json'));
const shotDir = resolve(arg('--shots', join(root, 'docs/qa/journey-clips')));
mkdirSync(shotDir, { recursive: true });

const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.QA_CHROME || undefined });

// Page-side instrumentation: log media element play() calls and their outcome; stub speechSynthesis per scenario.
const INIT = (speechMode) => `
(() => {
  window.__media = []; window.__spoken = [];
  const P = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const rec = { src: this.currentSrc || this.src, ended: false, error: null }; window.__media.push(rec);
    this.addEventListener('ended', () => { rec.ended = true; }); this.addEventListener('error', () => { rec.error = (this.error && this.error.code) || 'error'; });
    return P.apply(this, arguments);
  };
  const mode = ${JSON.stringify(speechMode)};
  if (mode === 'none') { try { Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true }); } catch (e) {} }
  if (mode === 'device' || mode === 'nohebrew') {
    if (typeof window.SpeechSynthesisUtterance === 'undefined') window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    const voices = mode === 'device' ? [{ lang: 'he-IL', name: 'Test Hebrew voice' }] : [{ lang: 'en-US', name: 'Test English voice' }];
    const fake = { getVoices: () => voices, speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 30); }, cancel() {}, addEventListener() {}, removeEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
  }
})();`;

const report = { generatedBy: 'tools/qa/journey-clips.mjs', note: 'Headless Chrome emulating a phone. No audio output: nothing here was heard.', runs: [] };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function profile(vp, { speech = 'device', settings = null, label }) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: true, isMobile: true, serviceWorkers: 'block', locale: 'en-CA' });
  await ctx.addInitScript(INIT(speech));
  if (settings) await ctx.addInitScript((s) => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify(s)); }, settings);
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 160)));
  page.on('response', (r) => { if (r.status() >= 400) errs.push(`http ${r.status()} ${r.url().replace(base, '/')}`); });
  const run = { label, viewport: `${vp.width}x${vp.height}`, speech, steps: [], errors: errs };
  report.runs.push(run);
  const api = {
    page, ctx, run,
    async go(route, opt = {}) { await page.goto(base + '#' + route); await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 }).catch(() => {}); await wait(opt.wait ?? 900); },
    async text(sel = '#main') { return (await page.locator(sel).first().innerText().catch(() => '')).replace(/\s+\n/g, '\n').trim(); },
    async hear() {
      return page.evaluate(() => [...document.querySelectorAll('[data-audio-state], .alef-play, .audio-none, .audio-chip')].filter((e) => e.offsetParent !== null).map((e) => ({
        tag: e.tagName.toLowerCase(), state: e.getAttribute('data-audio-state') || null, audio: e.getAttribute('data-audio') || null,
        aria: e.getAttribute('aria-label') || null, text: (e.textContent || '').trim().slice(0, 140),
        box: (() => { const r = e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; })() })));
    },
    async sound() { return (await page.locator('#sound-status').first().innerText().catch(() => '')).trim(); },
    async media() { return page.evaluate(() => ({ media: window.__media, spoken: window.__spoken })); },
    async layout() { return page.evaluate(() => ({ sideways: document.documentElement.scrollWidth > innerWidth + 1, scrollW: document.documentElement.scrollWidth, dataset: { ...document.body.dataset } })); },
    async step(name, fn, shotName) {
      const t0 = Date.now(); const s = { step: name };
      try { Object.assign(s, (await fn()) || {}); } catch (e) { s.failed = String(e).slice(0, 200); }
      if (/word ?trace/i.test(name)) await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
      if (shotName && vp.width === 360 && !s.noShot) { const f = `${shotName}.png`; await page.screenshot({ path: join(shotDir, f) }); s.shot = f; }
      else if (shotName) { await page.screenshot({ path: join(tmpdir(), `${label}-${vp.width}-${shotName}.png`) }); }
      s.layout = await api.layout().catch(() => null); s.ms = Date.now() - t0; run.steps.push(s); return s;
    },
  };
  return api;
}

const CLIP_WORDS = ['אַבָּא', 'בָּחַר', 'גֶּשֶׁם', 'מָחָר', 'נָתַן', 'חֵן', 'תֵּה', 'חַיִּים'];
async function openTrace(X, level) {
  await X.go('/words/trace?any=1&level=' + level); // ?any=1 is the same as ticking "Include letters I have not traced yet" (that box sits below four button rows on a 360x640 phone)
  await X.page.waitForSelector('button[data-word]', { timeout: 15000 }).catch(() => {});
  await wait(300);
  return X.page.$$eval('button[data-word]', (b) => b.map((x) => x.getAttribute('data-word')));
}
async function pressHear(X, sel = '[data-audio^="word/"]') {
  const btn = X.page.locator(sel).first(); if (!(await btn.count())) return null;
  await btn.click(); await wait(900); return X.text('.audio-wrap');
}
async function completeLesson(X, id) {
  const { page } = X; await X.go('/learn?lesson=' + id, { wait: 500 });
  const btn = page.locator('.alef-actions button.btn').first();
  if (!(await btn.count()) || (await btn.isDisabled().catch(() => true))) return { id, done: false, why: 'complete button missing or disabled', locked: await X.text('.alef-locked') };
  await btn.click(); await wait(300);
  for (let g = 0; g < 120; g++) {
    if (/Lesson complete/.test(await X.text('.alef-quiz-host'))) break;
    const cont = page.locator('.alef-quiz-host button[data-act="next"]:visible').first();
    if (await cont.count()) { await cont.click().catch(() => {}); await wait(60); continue; }
    const opt = page.locator('.alef-quiz-host button[data-n="1"]').first();
    if (await opt.count()) { await opt.click().catch(() => {}); await wait(60); } else await wait(100);
  }
  return { id, done: /Lesson complete/.test(await X.text('.alef-quiz-host')) };
}

for (const vp of [{ width: 360, height: 640 }, { width: 390, height: 844 }]) {
  // ---- Run 1: a learner on default settings (Sephardi, Woman). Fresh profile, onboarding through the real screen, browser has a Hebrew device voice.
  {
    const A = await profile(vp, { label: 'default-device-voice', speech: 'device' });
    const { page } = A;
    await A.step('first run: open the app (fresh profile)', async () => { await A.go('', {}); return { url: page.url().replace(base, '/'), text: (await A.text('body')).slice(0, 700) }; }, `01-first-run-welcome`);
    await A.step('first run: choose starting from zero and continue', async () => {
      await page.locator('#ob-letters-none').check().catch(() => {});
      await page.getByRole('button', { name: /^Continue/ }).first().click().catch(() => {}); await wait(900);
      const t1 = (await A.text()).slice(0, 1200);
      return { url: page.url().replace(base, '/'), text: t1 };
    }, `02-after-welcome`);
    await A.step('first run: Continue through the pronunciation step with the default (Sephardi)', async () => {
      await page.getByRole('button', { name: /^Continue/ }).first().click().catch(() => {}); await wait(900);
      const o = { url: page.url().replace(base, '/'), text: (await A.text()).slice(0, 900) };
      return o;
    }, `02b-after-pronunciation`);
    await A.step('Home', async () => { await A.go('/'); return { text: (await A.text()).slice(0, 900), sound: await A.sound() }; }, `03-home`);
    await A.step('Settings: congregation and voice a default learner has', async () => {
      await A.go('/settings');
      const d = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('alef:settings') || '{}'); return { congregation: s.congregation, voice: s.voice, browserVoiceAnyway: s.browserVoiceAnyway, onboarded: s.onboarded }; });
      return { ...d, text: (await A.text()).slice(0, 1500) };
    }, `04-settings`);
    await A.step('First 10 minutes (/firstday): Hear it pressed', async () => {
      await A.go('/firstday'); const b = page.getByRole('button', { name: /Hear it/ }).first(); let after = null;
      if (await b.count()) { await b.click(); await wait(800); after = (await A.text()).split('\n').filter((l) => /recording|voice|sound|clip|audio/i.test(l)).slice(0, 4); }
      return { text: (await A.text()).slice(0, 700), afterHearIt: after, ...(await A.media()), sound: await A.sound() };
    }, `05-firstday`);
    for (const id of ['shin', 'bet']) {
      await A.step(`letter ${id}: page and Hear buttons`, async () => { await A.go('/letters/' + id); const t = await A.text(); return { hearButtons: await page.locator('button:has-text("Hear"), button:has-text("Listen"), .alef-play').count(), text: t.slice(t.indexOf(id === 'shin' ? 'Shin' : 'Bet', 100) - 5, 900) }; }, `06-letter-${id}`);
    }
    await A.step('lesson r01 (letters, a vowel): Listen buttons, then press one (Kamatz)', async () => {
      await A.go('/learn?lesson=r01'); const hear = await A.hear();
      const k = page.locator('button[aria-label^="Listen to Kamatz"]').first(); let note = null;
      if (await k.count()) { await k.click(); await wait(800); note = await A.text('.alef-audio-note'); }
      return { listenButtons: hear.length, sample: hear.slice(0, 3), noteAfterKamatz: note, ...(await A.media()), sound: await A.sound() };
    }, `07-lesson-r01-vowel`);
    const done = [];
    for (const id of ['r01', 'r02', 'r03', 'r04', 'r05', 'r06']) done.push(await completeLesson(A, id));
    await A.step('complete lessons r01 to r06 through the quick checks (first option each time)', async () => ({ done }), null);
    await A.step('lesson r05 (Priestly Blessing), unlocked or completed', async () => {
      await A.go('/learn?lesson=r05'); const hear = await A.hear();
      const lines = page.locator('button[aria-label^="Listen to Priestly Blessing, line 1"]').first(); let note = null;
      if (await lines.count()) { await lines.click(); await wait(800); note = await A.text('.alef-audio-note'); }
      return { text: (await A.text()).slice(0, 1800), listenButtons: hear.length, noteAfterLine1: note, ...(await A.media()), sound: await A.sound() };
    }, `11-lesson-r05`);
    await A.step('lesson r07 (Alef and He), default Sephardi/Woman: Listen for "dad" (a word that HAS an Israeli/Man clip)', async () => {
      await A.go('/learn?lesson=r07'); const k = page.locator('button[aria-label="Listen to dad"]').first(); let note = null;
      if (await k.count()) { await k.click(); await wait(800); note = await A.text('.alef-audio-note'); }
      return { text: (await A.text()).slice(0, 500), noteAfterDad: note, ...(await A.media()), sound: await A.sound() };
    }, `10-lesson-r07-default`);
    await A.step('word trace pick screen after r01 to r06 (letters known)', async () => {
      await A.go('/words/trace'); const words = await page.$$eval('button[data-word]', (b) => b.map((x) => x.getAttribute('data-word')));
      return { text: (await A.text()).slice(0, 900), words };
    }, `08-wordtrace-pick`);
    const offered = {};
    for (const lv of ['two', 'three', 'prayer']) offered[lv] = await openTrace(A, lv);
    await A.step('word trace: words offered per level, letters not required (first 12 only are listed)', async () => ({ offered, clipWordsListed: Object.fromEntries(Object.entries(offered).map(([k, v]) => [k, v.filter((w) => CLIP_WORDS.includes(w))])) }));
    await A.step('word trace: a word with NO clip, default settings, device voice present', async () => {
      const words = await openTrace(A, 'two'); await page.locator('button[data-word]').first().click(); await wait(600);
      const target = await page.locator('[data-role="target"]').innerText().catch(() => '');
      const hear = await A.hear(); const after = await pressHear(A);
      return { target, hear, afterClick: after, ...(await A.media()), sound: await A.sound() };
    }, `09-wordtrace-noclip-device`);
    await A.step('word trace: how often "Start the next word" lands on a word with a clip (30 presses, default settings)', async () => {
      await openTrace(A, 'three'); let hits = 0; const seen = []; let withButton = 0;
      for (let i = 0; i < 30; i++) {
        await page.locator('button[data-act="next-word"]').first().click(); await wait(120);
        const w = await page.locator('[data-role="target"]').innerText().catch(() => ''); seen.push(w);
        if (CLIP_WORDS.includes(w)) hits++;
        const st = await page.locator('[data-audio^="word/"]').first().getAttribute('data-audio-state').catch(() => null); if (st === 'file') withButton++;
        await page.locator('button[data-act="back"]').first().click(); await wait(100);
      }
      return { presses: 30, landedOnClipWord: hits, fileStateButtons: withButton, distinctWords: new Set(seen).size };
    });
    await A.step('review session (cards from r01 to r06)', async () => {
      await A.go('/learn?review=1'); await wait(500);
      const first = await A.text('.alef-review'); let rated = 0; const seenBodies = [];
      for (let i = 0; i < 4; i++) {
        const show = page.locator('.alef-review button:has-text("Show answer")').first();
        if (await show.count()) { await show.click(); await wait(200); }
        seenBodies.push((await A.text('.alef-review')).slice(0, 220));
        const rate = page.locator('.alef-review [data-rating]').first();
        if (await rate.count()) { await rate.click(); rated++; await wait(300); } else break;
      }
      return { first: first.slice(0, 500), bodies: seenBodies, rated, after: (await A.text('.alef-review')).slice(0, 400), hear: await A.hear() };
    }, `12-review`);
    await A.step('About: readiness text', async () => { await A.go('/about'); return { text: (await A.text()).slice(0, 2600) }; }, `13-about`);
    await A.step('Offline page', async () => { await A.go('/offline'); return { text: (await A.text()).slice(0, 1500) }; }, `14-offline`);
    await A.step('How this works: sound paragraph', async () => { await A.go('/how'); return { text: (await A.text('#how-sound')).slice(0, 800) }; });
    await A.step('sound bar at the end', async () => ({ sound: await A.sound() }));
    await A.ctx.close();
  }
  // ---- Run 2: Sephardi (default) with the three speech environments, word trace Hear button (no clip is possible for this setting)
  for (const speech of ['none', 'nohebrew']) {
    const D = await profile(vp, { label: `default-${speech}`, speech, settings: { onboarded: true } });
    await D.step(`default settings, speech=${speech}: word trace Hear button state`, async () => {
      await openTrace(D, 'two'); await D.page.locator('button[data-word]').first().click(); await wait(600);
      const hear = await D.hear(); return { target: await D.page.locator('[data-role="target"]').innerText().catch(() => ''), hear, text: (await D.text()).split('\n').filter((l) => /audio|voice|record/i.test(l)).slice(0, 4) };
    }, `15-default-${speech}-wordtrace`);
    await D.ctx.close();
  }
  // ---- Run 3: Israeli + Man (the only combination with clips), with a device voice, no voice, and a voice that is not Hebrew.
  for (const speech of ['device', 'none', 'nohebrew']) {
    const B = await profile(vp, { label: `israeli-man-${speech}`, speech, settings: { onboarded: true, congregation: 'israeli', voice: 'm' } });
    const { page } = B;
    await B.step(`word trace: clip word, Start-next until one comes (speech=${speech})`, async () => {
      await openTrace(B, 'three'); let tries = 0, got = null;
      for (; tries < 60 && !got; tries++) {
        await page.locator('button[data-act="next-word"]').first().click(); await wait(120);
        const w = await page.locator('[data-role="target"]').innerText().catch(() => '');
        if (CLIP_WORDS.includes(w)) got = w; else { await page.locator('button[data-act="back"]').first().click(); await wait(100); }
      }
      if (!got) return { note: 'no clip word reached in 60 presses' };
      const hear = await B.hear(); const after = await pressHear(B);
      return { word: got, tries, hear, afterClick: after, sound: await B.sound(), ...(await B.media()) };
    }, `20-wordtrace-clip-${speech}`);
    await B.step(`word trace: word with no clip (speech=${speech}, Israeli/Man)`, async () => {
      await openTrace(B, 'two'); await page.locator('button[data-word]').first().click(); await wait(600);
      const hear = await B.hear(); const after = await pressHear(B);
      return { target: await page.locator('[data-role="target"]').innerText().catch(() => ''), hear, afterClick: after, ...(await B.media()) };
    }, `21-wordtrace-noclip-${speech}`);
    await B.step(`lesson r07: press Listen for "dad" (speech=${speech}, Israeli/Man)`, async () => {
      await B.go('/learn?lesson=r07'); const k = page.locator('button[aria-label="Listen to dad"]').first(); let note = null; const present = await k.count();
      if (present) { await k.click(); await wait(900); note = await B.text('.alef-audio-note'); }
      return { buttonPresent: present, noteAfterDad: note, noAudioText: await page.locator('.audio-none').count(), ...(await B.media()), sound: await B.sound() };
    }, `22-lesson-r07-${speech}`);
    if (speech === 'device') {
      await B.step('Settings and About text with clips present', async () => { await B.go('/settings'); await page.locator('details:has(summary:has-text("What is ready"))').first().evaluate((d) => { d.open = true; }).catch(() => {}); const s = (await B.text()).slice(0, 1500); await B.go('/about'); const a = (await B.text()).split('\n').filter((l) => /audio|record|voice|clip/i.test(l)); return { settings: s, aboutLines: a }; }, `24-about-with-clips`);
    }
    await B.ctx.close();
  }
}
async function A_text(page) { return (await page.locator('#main').first().innerText().catch(() => '')).trim(); }

mkdirSync(join(outFile, '..'), { recursive: true });
writeFileSync(outFile, JSON.stringify(report, null, 1));
console.log('wrote', outFile, report.runs.map((r) => `${r.label}@${r.viewport}: ${r.steps.length} steps, ${r.errors.length} errors, ${r.steps.filter((s) => s.failed).length} failed`).join('\n'));
await browser.close(); server.close();
