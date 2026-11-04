// v0 walk: a scripted pass over the first-release path at 375x667 with a fresh profile, once per congregation setting.
// Path: onboarding -> first letter -> second letter -> first vowel -> first syllable -> first word -> (what follows the word)
//       -> review cards -> settings -> backup download -> restore.
// SCRIPTED EMULATION, NOT REAL LEARNERS. It records what a script could see and do: the route, whether the expected next action is
// visible within one screen (375x667), taps the script needed, console errors, a screenshot. It says nothing about comprehension,
// taste or audio quality, and it does not check any Hebrew content.
// Usage: node tools/qa/v0-walk.mjs [--cong israeli,sephardi,ashkenazi] [--out /tmp/v0walk] [--report docs/qa/V0-WALK.md]
// Browser: Playwright (same lookup as journey.mjs). Chromium from QA_CHROME, the Playwright cache, or a system Chrome/Chromium.
// If no browser can be launched the script writes a SKIPPED report and exits 0 (exit 2 when Playwright itself is missing).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const outDir = resolve(arg('--out', '/tmp/v0walk'));
const reportPath = resolve(root, arg('--report', 'docs/qa/V0-WALK.md'));
const CONGS = arg('--cong', 'israeli,sephardi,ashkenazi').split(',');
const W = 375, H = 667;
mkdirSync(outDir, { recursive: true });

let chromium;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
if (!chromium) { console.error('playwright not found: nothing was walked'); process.exit(2); }

async function launch() {
  const tries = [{}];
  if (process.env.QA_CHROME) tries.unshift({ executablePath: process.env.QA_CHROME });
  for (const p of ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']) if (existsSync(p)) tries.push({ executablePath: p });
  const errs = [];
  for (const t of tries) { try { return { browser: await chromium.launch(t), how: t.executablePath || 'playwright default' }; } catch (e) { errs.push(String(e.message).split('\n')[0].slice(0, 160)); } }
  return { browser: null, errs };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { browser, how, errs } = await launch();
if (!browser) {
  const md = `# v0 walk\n\nSKIPPED: no browser could be launched, so nothing was walked.\n\n${(errs || []).map((e) => `- ${e}`).join('\n')}\n`;
  mkdirSync(resolve(reportPath, '..'), { recursive: true }); writeFileSync(reportPath, md);
  console.log('SKIPPED: no browser available'); process.exit(0);
}

const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;

/** All results: { cong, steps: [...], extra: {...} } */
const results = [];

async function walk(cong) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, locale: 'en-CA', timezoneId: 'America/Toronto', serviceWorkers: 'block', acceptDownloads: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(3000);
  const run = { cong, steps: [], texts: {}, extra: {} };
  let cur = null; // the step being recorded
  let errBucket = [];
  page.on('console', (m) => { if (m.type() === 'error') errBucket.push(`console: ${m.text().slice(0, 160)}`); });
  page.on('pageerror', (e) => errBucket.push(`pageerror: ${String(e.message).slice(0, 160)}`));
  page.on('response', (r) => { if (r.status() >= 400) errBucket.push(`http ${r.status()}: ${r.url().replace(base, '/')}`); });
  const route = () => page.evaluate(() => location.hash || '#/').catch(() => '?');
  const settle = async () => { await page.waitForLoadState('domcontentloaded').catch(() => {}); await sleep(450); };

  /** Position/size of a locator relative to the document at scroll top. */
  const geom = async (loc) => {
    const el = loc.first();
    if (!(await el.count())) return null;
    return el.evaluate((n) => { const r = n.getBoundingClientRect(); const st = getComputedStyle(n); return { docY: Math.round(r.top + scrollY), h: Math.round(r.height), w: Math.round(r.width), visible: !!(n.offsetParent || st.position === 'fixed') && st.visibility !== 'hidden' && r.width > 0, disabled: !!n.disabled, text: (n.innerText || n.value || n.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60) }; }).catch(() => null);
  };
  const tap = async (loc, label) => { const el = loc.first(); await el.scrollIntoViewIfNeeded().catch(() => {}); await el.click(); if (cur) { cur.taps++; cur.tapLog.push(label); } await sleep(250); };

  /** Snapshot of the screen: heading, visible interactive controls in the main area, overflow. */
  const observe = async () => page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const vis = (n) => { const r = n.getBoundingClientRect(); const st = getComputedStyle(n); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && !n.closest('[hidden]'); };
    const controls = [...main.querySelectorAll('button,a[href],input:not([type=hidden]),select,textarea,summary')].filter(vis).map((n) => { const r = n.getBoundingClientRect(); return { tag: n.tagName.toLowerCase(), label: (n.innerText || n.value || n.getAttribute('aria-label') || n.id || '').trim().replace(/\s+/g, ' ').slice(0, 50), docY: Math.round(r.top + scrollY), disabled: !!n.disabled, href: n.getAttribute('href') || undefined }; });
    return { h1: (main.querySelector('h1,h2')?.innerText || '').trim().slice(0, 80), text: main.innerText.trim().replace(/\n{2,}/g, '\n').slice(0, 1500), controls, overflowX: document.documentElement.scrollWidth > innerWidth + 1, docH: document.documentElement.scrollHeight };
  }).catch(() => ({ h1: '', text: '', controls: [], overflowX: false, docH: 0 }));

  /**
   * Run one step. `fn({tap, expectNext})`: it must call expectNext(locator, label) when the next action should be on screen, and may tap.
   * result: pass | warn | fail; fail = expected next action missing or the step threw; warn = reachable only after scrolling > 1 screen, small target, overflow, or console errors.
   */
  async function step(name, fn) {
    cur = { name, cong, route: '', routeEnd: '', expect: null, nextFound: false, nextWhere: '', taps: 0, tapLog: [], errors: [], shot: '', result: 'pass', notes: [] };
    errBucket = [];
    cur.route = await route();
    let obs;
    try {
      await fn({
        expectNext: async (loc, label) => {
          const g = await geom(loc);
          cur.expect = label;
          if (!g || !g.visible) { cur.nextFound = false; cur.nextWhere = 'not found'; cur.result = 'fail'; cur.notes.push(`expected next action not on screen: ${label}`); return false; }
          cur.nextFound = true;
          const bottom = g.docY + g.h;
          cur.nextWhere = bottom <= H ? 'first screen' : g.docY < 2 * H ? `after scrolling (y=${g.docY})` : `far down (y=${g.docY})`;
          if (g.docY >= 2 * H) { if (cur.result === 'pass') cur.result = 'warn'; cur.notes.push(`next action "${g.text}" starts ${g.docY}px down (more than one screen)`); }
          if (g.disabled) { cur.result = 'fail'; cur.notes.push(`next action "${g.text}" is disabled`); }
          if (Math.min(g.h, g.w) < 40) { if (cur.result === 'pass') cur.result = 'warn'; cur.notes.push(`next action "${g.text}" is ${g.w}x${g.h}px (under 40px)`); }
          return true;
        },
        tap, observe, note: (s) => cur.notes.push(s), warn: (s) => { if (cur.result === 'pass') cur.result = 'warn'; cur.notes.push(s); }, fail: (s) => { cur.result = 'fail'; cur.notes.push(s); },
      });
    } catch (e) { cur.result = 'fail'; cur.notes.push(`script could not continue: ${String(e.message).split('\n')[0].slice(0, 200)}`); }
    await settle();
    obs = await observe();
    cur.routeEnd = await route();
    if (obs.overflowX) { if (cur.result === 'pass') cur.result = 'warn'; cur.notes.push('page is wider than 375px (horizontal overflow)'); }
    cur.title = obs.h1; cur.text = obs.text; cur.controlsEnd = obs.controls.slice(0, 14).map((c) => c.label + (c.disabled ? ' [disabled]' : ''));
    cur.errors = [...new Set(errBucket)];
    if (cur.errors.length) { if (cur.result === 'pass') cur.result = 'warn'; cur.notes.push(`${cur.errors.length} console/network error(s)`); }
    const file = `${cong}-${String(run.steps.length + 1).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    await page.screenshot({ path: join(outDir, file) }).catch(() => {});
    cur.shot = file; run.steps.push(cur); cur = null;
    return run.steps.at(-1);
  }

  await page.goto(base); await settle(); await sleep(800);

  // 1. onboarding: answer what each screen asks, taking the shortest path, until the plan card with a start link.
  await step('onboarding', async ({ expectNext, note, warn, fail }) => {
    const got = page.getByRole('button', { name: 'Got it' });
    if (await got.first().isVisible().catch(() => false)) { const g = await geom(got); note(`first screen shows a "How this works" notice with a "Got it" button (y=${g?.docY}); tapped to dismiss`); await tap(got, 'Got it'); }
    const seen = [];
    for (let i = 0; i < 8; i++) {
      const t = (await page.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ');
      if (/Change my starting point/.test(t)) break;
      const radio = (v) => page.locator(`main input[value="${v}"]`);
      const label = (v) => page.locator(`main label:has(input[value="${v}"])`);
      const primary = page.locator('main button:not([disabled])').filter({ hasText: /^(Continue|Show my week|Start)/ });
      if (await radio('none').count()) { seen.push('letters question'); await tap(label('none'), 'radio: No, start from the beginning'); await tap(primary, 'Continue'); }
      else if (await radio(cong).count()) { seen.push('synagogue/pronunciation'); await tap(label(cong), `radio: ${cong}`); await tap(primary, 'Continue'); }
      else if (await primary.count()) { seen.push('goal/minutes'); await tap(primary, (await primary.first().innerText()).trim()); }
      else { fail(`onboarding stuck: no radio or primary button recognised (screens seen: ${seen.join(' > ')})`); return; }
      await settle();
    }
    note(`screens: ${seen.join(' > ')}`);
    if (seen.length > 3) warn(`${seen.length} questions before the plan card`);
    await expectNext(page.locator('main a[href="#/firstday"]').filter({ hasText: /^Start/ }), 'plan card: "Start: Your first 10 minutes"');
  });
  if (run.steps[0].result !== 'fail') {
    await step('onboarding to first letter', async ({ expectNext, fail }) => {
      const link = page.locator('main a[href="#/firstday"]').filter({ hasText: /^Start/ });
      if (!(await link.count())) { fail('no start link'); return; }
      await tap(link, 'Start: Your first 10 minutes'); await settle();
      if (!/firstday/.test(await route())) fail(`landed on ${await route()}, not #/firstday`);
      await expectNext(page.locator('main .fd-opt'), 'first quick-check choice');
    });
  } else await page.goto(base + '#/firstday');

  // 2-6. the five baby steps
  const names = ['first letter', 'second letter', 'first vowel', 'first syllable', 'first word'];
  for (let k = 0; k < 5; k++) {
    await step(names[k], async ({ expectNext, tap: _t, note, warn, fail }) => {
      if (!/firstday/.test(await route())) { await page.goto(base + '#/firstday'); await settle(); warn('had to open #/firstday directly'); }
      const heading = (await page.locator('main h2').first().innerText().catch(() => '')).trim();
      const stepLine = (await page.locator('main').innerText().catch(() => '')).match(/Step \d of \d[^\n]*/)?.[0] || '';
      note(`shows "${stepLine}" / "${heading}"`);
      run.texts[`step${k + 1}`] = (await page.locator('main .fd-body').innerText().catch(() => '')).replace(/\s+\n/g, '\n');
      // check phase: answer until Next/Finish shows (first choice each time; right or wrong opens Next)
      const nextBtn = page.locator('#fd-next');
      const hasCheck = await page.locator('main .fd-opt').count();
      await expectNext(hasCheck ? page.locator('main .fd-opt:not([disabled])') : nextBtn, hasCheck ? 'a quick-check choice' : 'Next');
      for (let i = 0; i < 4 && !(await nextBtn.isVisible().catch(() => false)); i++) {
        const opt = page.locator('main .fd-opt:not([disabled])');
        if (!(await opt.count())) { await sleep(700); continue; }
        await tap(opt, 'quick-check choice'); await sleep(i === 0 ? 300 : 1700);
      }
      const nb = await geom(nextBtn);
      if (!nb || !nb.visible) { fail('Next never appeared after answering the quick check'); return; }
      const before = cur.expect, nf = cur.nextFound, nw = cur.nextWhere;
      await expectNext(nextBtn, nb.text || 'Next');
      if (cur.result === 'pass' && nf) { cur.nextWhere = `check: ${nw}; Next: ${cur.nextWhere}`; } cur.expect = `${before} then ${cur.expect}`;
      await tap(nextBtn, nb.text || 'Next'); await settle();
    });
  }

  // 7. what comes after the word
  await step('after first word (done screen)', async ({ expectNext, note, warn }) => {
    const t = (await page.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ');
    note(`done screen text starts: "${t.slice(0, 160)}"`);
    await expectNext(page.locator('#fd-next-lesson'), '"Continue: <lesson>" link');
    const href = await page.locator('#fd-next-lesson').getAttribute('href').catch(() => null);
    note(`continue link goes to ${href}`);
    run.extra.nextLessonHref = href;
  });
  await step('open the lesson it points to', async ({ expectNext, note, warn, fail }) => {
    const link = page.locator('#fd-next-lesson');
    if (!(await link.count())) { fail('no continue link on the done screen'); return; }
    await tap(link, 'Continue: lesson'); await settle(); await sleep(500);
    const o = await observe();
    note(`lesson screen title "${o.h1}", ${o.controls.length} controls, document height ${o.docH}px`);
    const primary = page.locator('main button:not([disabled]), main a.btn').filter({ hasNotText: /^(Hear|Play|Trace)/ });
    await expectNext(primary, 'any button or button-link on the lesson screen');
  });

  // 8. review cards: through the Learn tab, as a learner would
  await step('review cards', async ({ expectNext, note, warn, fail }) => {
    await tap(page.locator('#nav a[href="#/learn"]'), 'bottom bar: Learn'); await settle(); await sleep(500);
    const t = (await page.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ');
    const due = t.match(/(\d+) reviews? due|No reviews due/)?.[0] || '(no due-count text found)';
    note(`Learn screen says: "${due}"`);
    run.extra.dueText = due;
    const rv = page.locator('main a[href="#/learn?review=1"]');
    if (await rv.count()) {
      await tap(rv, 'Review now'); await settle(); await sleep(500);
      const o = await observe(); note(`review screen "${o.h1}": ${o.controls.slice(0, 6).map((c) => c.label).join(' | ')}`);
      run.texts.review = o.text;
      await expectNext(page.locator('main button:not([disabled])').filter({ hasNotText: /^(Hear|Play)/ }), 'a review answer/continue button');
    } else {
      warn('no "Review now" link: nothing is due, so a learner cannot reach review from Learn; opened #/learn?review=1 directly to see what it shows');
      await page.goto(base + '#/learn?review=1'); await settle(); await sleep(500);
      const o = await observe(); run.texts.review = o.text; note(`direct review screen "${o.h1}": ${o.text.replace(/\s+/g, ' ').slice(0, 180)}`);
      await expectNext(page.locator('main a[href], main button:not([disabled])').filter({ hasNotText: /^(Hear|Play)/ }), 'any link or button on the empty review screen');
    }
  });

  // 9. settings via More
  await step('settings', async ({ expectNext, note, warn, fail }) => {
    await tap(page.locator('#more-btn'), 'bottom bar: More'); await sleep(400);
    const link = page.locator('#nav-more a[href="#/settings"]');
    if (!(await link.first().isVisible().catch(() => false))) {
      const grp = page.locator('#nav-more summary').filter({ hasText: /^More/ });
      if (await grp.count()) { warn('Settings is inside a collapsed "More" group in the More sheet: one extra tap to expand it before Settings shows'); await tap(grp, 'More sheet: expand "More" group'); await sleep(300); }
    }
    const pos = await page.evaluate(() => { const m = document.getElementById('nav-more'), a = m.querySelector('a[href="#/settings"]'); if (!a) return null; const r = a.getBoundingClientRect(), mr = m.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), sheetTop: Math.round(mr.top), sheetBottom: Math.round(mr.bottom), open: m.classList.contains('open') }; }).catch(() => null);
    if (!pos || !pos.open) { fail(`More sheet did not open or has no Settings link (${JSON.stringify(pos)}); opened #/settings directly`); await page.goto(base + '#/settings'); await settle(); }
    else {
      if (pos.bottom > pos.sheetBottom) warn(`Settings link is at y=${pos.top}-${pos.bottom}, below the visible part of the More sheet (sheet ends at y=${pos.sheetBottom}, under the bottom bar): the learner has to scroll inside the sheet to find it`);
      await link.first().evaluate((n) => n.scrollIntoView({ block: 'center' })); await sleep(200);
      await tap(link, 'More sheet: Settings (after scrolling the sheet)'); await settle();
    }
    const checked = await page.evaluate(() => [...document.querySelectorAll('main input[type=radio]:checked')].map((i) => `${i.name}=${i.value}`)).catch(() => []);
    note(`checked radios: ${checked.join(', ')}`);
    run.extra.settingsRadios = checked;
    if (!checked.some((c) => c.endsWith(`=${cong}`))) fail(`Settings does not show ${cong} as the chosen pronunciation`);
    await expectNext(page.getByRole('button', { name: 'Download backup' }), '"Download backup" button');
  });

  // 10. backup
  let backupFile = null;
  await step('backup download', async ({ expectNext, note, fail }) => {
    const btn = page.getByRole('button', { name: 'Download backup' });
    await expectNext(btn, '"Download backup"');
    const dl = page.waitForEvent('download', { timeout: 4000 }).catch(() => null);
    await tap(btn, 'Download backup');
    const d = await dl;
    if (!d) { fail('no download started'); return; }
    backupFile = join(outDir, `${cong}-backup.json`); await d.saveAs(backupFile);
    const j = JSON.parse(readFileSync(backupFile, 'utf8'));
    const n = Object.keys(j.data || j.items || j).length;
    note(`downloaded ${d.suggestedFilename()} (${readFileSync(backupFile).length} bytes, ${n} top-level keys)`);
    const live = (await page.locator('main article > p[role=status]').allInnerTexts().catch(() => [])).join(' ').trim();
    if (!live) note('no visible confirmation text after the download (status area empty)');
  });

  // 11. restore (two-step: choose file -> preview -> confirm)
  await step('restore', async ({ expectNext, note, fail, warn }) => {
    if (!backupFile) { fail('no backup file from the previous step'); return; }
    await expectNext(page.locator('#s-import-label'), '"Restore from backup file" button');
    await page.locator('#s-import').setInputFiles(backupFile); if (cur) { cur.taps++; cur.tapLog.push('choose file'); }
    await sleep(700);
    const box = page.locator('[aria-label="Restore confirmation"]');
    if (!(await box.isVisible().catch(() => false))) { fail('no restore preview appeared after choosing the file'); return; }
    note(`preview text: "${(await box.innerText()).replace(/\s+/g, ' ').slice(0, 220)}"`);
    const go = page.getByRole('button', { name: 'Replace my progress with this backup' });
    const g = await geom(go); if (g && g.docY + g.h > H * 1.5) { /* informational */ }
    await tap(go, 'Replace my progress with this backup'); await sleep(900);
    const status = (await page.locator('main article > p[role=status]').allInnerTexts().catch(() => [])).join(' ').replace(/\s+/g, ' ').trim();
    note(`after confirm: "${status.slice(0, 200)}"`);
    run.extra.restoreStatus = status;
    if (!/Restored/i.test(status)) fail('no "Restored" confirmation seen');
    // a bad file should be refused without changing anything
    const bad = join(outDir, 'bad.json'); writeFileSync(bad, '{"not":"a backup"');
    await page.locator('#s-import').setInputFiles(bad); await sleep(600);
    const st2 = (await page.locator('main article > p[role=status]').allInnerTexts().catch(() => [])).join(' ').replace(/\s+/g, ' ').trim();
    note(`bad file: "${st2.slice(0, 160)}"`);
    if (!/Could not restore/i.test(st2)) warn('invalid file did not produce a "Could not restore" message');
  });

  await ctx.close();
  return run;
}

for (const c of CONGS) { try { results.push(await walk(c)); } catch (e) { results.push({ cong: c, steps: [], texts: {}, extra: {}, crashed: String(e.message).slice(0, 300) }); } }
await browser.close(); server.close();

// ---------- report ----------
const icon = { pass: 'PASS', warn: 'WARN', fail: 'FAIL' };
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
let md = `# v0 walk: first-release path at ${W}x${H}\n\n`;
md += `Generated by \`node tools/qa/v0-walk.mjs\` on ${new Date().toISOString().slice(0, 10)} against the working tree (static server from tools/serve.mjs), browser: ${how}. Fresh profile per congregation setting. Screenshots: \`${outDir}\`.\n\n`;
md += `**Scripted emulation, not real learners.** It records what a script could see and tap: route, whether the expected next action is on screen within one screen (${H}px; "after scrolling" means it starts below the first screen but within two), taps the script made (radio selections and file choices count as taps), console/network errors during the step. It does not judge Hebrew content, audio, wording quality or comprehension.\n\n`;
md += `Result: PASS = next action within two screens and no errors; WARN = reachable but with a note (far down, small target, overflow, console error, workaround needed); FAIL = expected next action absent or the script could not continue.\n\n`;
for (const r of results) {
  md += `## ${r.cong}\n\n`;
  if (r.crashed) { md += `Walk crashed: ${r.crashed}\n\n`; continue; }
  md += `| # | Step | Route at start | Route at end | Next action | Where | Taps | Errors | Result | Screenshot |\n|---|---|---|---|---|---|---|---|---|---|\n`;
  r.steps.forEach((s, i) => { md += `| ${i + 1} | ${esc(s.name)} | \`${esc(s.route)}\` | \`${esc(s.routeEnd)}\` | ${esc(s.expect || '-')} | ${esc(s.nextWhere || '-')} | ${s.taps} | ${s.errors.length} | ${icon[s.result]} | ${s.shot} |\n`; });
  const total = r.steps.reduce((a, s) => a + s.taps, 0);
  md += `\nTotal taps for the walk: ${total}. Results: ${['pass', 'warn', 'fail'].map((k) => `${r.steps.filter((s) => s.result === k).length} ${k}`).join(', ')}.\n\n`;
  const notes = r.steps.filter((s) => s.notes.length || s.errors.length);
  if (notes.length) { md += `Notes and errors:\n\n`; for (const s of notes) { md += `- **${s.name}** (${icon[s.result]}): ${s.notes.map(esc).join('; ')}${s.errors.length ? `; errors: ${s.errors.map(esc).join(' / ')}` : ''}\n`; } md += '\n'; }
}
// where the flow differs between congregations: compare step text
const ok = results.filter((r) => !r.crashed);
if (ok.length > 1) {
  md += `## Where the three settings differ\n\nLines of the step screens (first-day steps 1 to 5) that are not identical across settings:\n\n`;
  for (let k = 1; k <= 5; k++) {
    const sets = ok.map((r) => new Set((r.texts[`step${k}`] || '').split('\n').map((l) => l.trim()).filter(Boolean)));
    const all = new Set(sets.flatMap((s) => [...s]));
    const diff = [...all].filter((l) => !sets.every((s) => s.has(l)));
    md += `- Step ${k}: ${diff.length ? '' : 'no difference'}\n`;
    for (const l of diff) md += `  - [${ok.filter((_, i) => sets[i].has(l)).map((r) => r.cong).join(', ')}] ${esc(l.slice(0, 200))}\n`;
  }
  const sameShape = ok.every((r) => r.steps.map((s) => s.name + s.result).join() === ok[0].steps.map((s) => s.name + s.result).join());
  md += `\nStep sequence and pass/warn/fail pattern identical across settings: ${sameShape ? 'yes' : 'no (see the tables)'}.\n\n`;
}
// dead ends and confusing screens, derived from the run
md += `## Dead ends and confusing screens (observed in this run)\n\n`;
let any = false;
for (const r of ok) for (const s of r.steps) if (s.result !== 'pass') { any = true; md += `- [${r.cong}] step ${r.steps.indexOf(s) + 1} "${s.name}" at \`${s.routeEnd}\` (${icon[s.result]}): ${s.notes.map(esc).join('; ')}${s.errors.length ? `; errors: ${s.errors.map(esc).join(' / ')}` : ''}\n`; }
if (!any) md += `None flagged by the script.\n`;
md += `\n## Per-step screen text (first congregation, truncated)\n\n`;
for (const s of (ok[0]?.steps || [])) md += `- ${s.name}: title "${esc(s.title)}"; controls at end: ${esc((s.controlsEnd || []).join(' | '))}\n`;
md += `\n## Not covered\n\nReal audio playback, tracing by drawing (the script only checks that the Trace link exists), reading Hebrew correctness, other viewports, offline/service-worker behaviour (service workers were blocked), second-day return, and the Delete-all-data action.\n`;
mkdirSync(resolve(reportPath, '..'), { recursive: true });
writeFileSync(reportPath, md);
console.log(`report: ${reportPath}`);
for (const r of results) console.log(r.cong, r.crashed || r.steps.map((s) => `${s.name}:${s.result}`).join(' '));
