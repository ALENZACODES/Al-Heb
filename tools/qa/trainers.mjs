// Trainers QA at 375x667 (headless Chromium via Playwright, synthetic touch/mouse input: no real phone). Usage: node tools/qa/trainers.mjs [--out /tmp/tqa-out.json] [--shots /tmp/tqa]
// Covers the Preview-group screens: Pronunciation rules (+ each rule page), Grammar notes (+ each topic and its practice), Trope trainer (Ashkenazi and Sephardi),
// Which tradition is this?, Read it my way, Compare traditions. Per screen: preview banner, h1, overflow, touch targets, axe-core (tools/a11y/node_modules), console errors.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
const here = fileURLToPath(new URL('.', import.meta.url)); const root = join(here, '..', '..');
const argv = process.argv.slice(2); const arg = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const outFile = arg('--out', '/tmp/tqa-out.json'); const shots = arg('--shots', '/tmp/tqa'); mkdirSync(shots, { recursive: true });
const axeSource = readFileSync(join(root, 'tools/a11y/node_modules/axe-core/axe.min.js'), 'utf8');
const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r)); const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.QA_CHROME || undefined });
const R = { when: new Date().toISOString(), chromium: browser.version(), screens: {}, flows: {}, errors: [] };

async function newPage(settings = {}) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true });
  await ctx.addInitScript((s) => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true, ...s })); }, settings);
  const page = await ctx.newPage(); page.on('pageerror', (e) => R.errors.push(page.url() + ' pageerror ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) R.errors.push(page.url() + ' console ' + m.text()); });
  page.on('requestfailed', (r) => R.errors.push('requestfailed ' + r.url()));
  return { ctx, page };
}
const settle = (page, ms = 1500) => page.waitForTimeout(ms);
const audit = (page) => page.evaluate(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[hidden]'); };
  const main = document.querySelector('main'); const banner = main?.querySelector('.preview-banner');
  const small = [...document.querySelectorAll('main button, main a, main select, main input, main summary, main [role=button], #nav a, #nav button, #more-btn, header a, header button')].filter(vis).map((e) => ({ e, r: (/^(checkbox|radio)$/.test(e.type) && e.labels?.[0] ? e.labels[0] : e).getBoundingClientRect() }))
    .filter(({ r }) => r.width < 44 || r.height < 44).map(({ e, r }) => ({ el: e.tagName.toLowerCase() + ' "' + (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30) + '"', w: Math.round(r.width), h: Math.round(r.height), inline: !!e.closest('p,li,td,th,footer') && e.tagName === 'A' }));
  const nav = document.querySelector('#nav'); const navVis = !!nav && vis(nav) && nav.getBoundingClientRect().bottom <= innerHeight + 1;
  return { hash: location.hash, h1: [...document.querySelectorAll('h1')].filter(vis).map((h) => h.textContent.trim()), banner: banner ? { text: banner.textContent.trim().slice(0, 60), firstChild: main.firstElementChild === banner } : null, title: document.title,
    scrollW: document.documentElement.scrollWidth, small, navVisible: navVis, navLinks: nav ? [...nav.querySelectorAll('a')].length : 0, mainLinks: [...main.querySelectorAll('a[href]')].filter(vis).length, mainText: main.innerText.length };
});
async function axeRun(page) {
  await page.addScriptTag({ content: axeSource });
  const r = await page.evaluate(async () => { const x = await axe.run(document, { resultTypes: ['violations'] }); return x.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes[0].target.join(' ').slice(0, 90) })); });
  return r;
}
async function screen(page, key, route, { wait = 1500, shot = true } = {}) {
  await page.goto(base + '#' + route); await settle(page, wait);
  const a = await audit(page); a.axe = await axeRun(page); a.route = route;
  if (shot) await page.screenshot({ path: join(shots, key.replace(/[^a-z0-9-]/gi, '_') + '.png') });
  R.screens[key] = a; return a;
}

// 1. Reach every screen from the More sheet Preview group by tapping
const TARGET = { rules: '#/rules', grammar: '#/grammar', trope: '#/trope', compare: '#/compare', 'tradition-quiz': '#/tradition-quiz', 'read-my-way': '#/read-my-way' };
{
  const { ctx, page } = await newPage(); R.flows.more = {};
  await page.goto(base + '#/'); await settle(page, 800);
  for (const [k, href] of Object.entries(TARGET)) {
    await page.goto(base + '#/'); await settle(page, 500);
    await page.click('#more-btn'); await page.waitForTimeout(200);
    const open = await page.$eval('.nav-group-preview details', (d) => d.open); if (!open) await page.click('.nav-group-preview summary');
    await page.waitForTimeout(150);
    const sel = `.nav-group-preview a[href="${href}"]`; const link = await page.$(sel);
    if (!link) { R.flows.more[k] = { listed: false }; continue; }
    await link.scrollIntoViewIfNeeded(); const box = await link.boundingBox();
    await link.click(); await settle(page, 1200);
    const a = await audit(page);
    R.flows.more[k] = { listed: true, linkH: Math.round(box.height), landed: a.hash, banner: !!a.banner, bannerFirst: a.banner?.firstChild, h1: a.h1, sheetClosed: await page.evaluate(() => { const m = document.querySelector('#nav-more'); return !m || getComputedStyle(m).display === 'none' || m.hidden || !m.getBoundingClientRect().width || m.closest('[hidden]') != null; }) };
  }
  // preview group section: current page marks More?
  R.flows.more.sheetReopenedOnPreviewPage = await (async () => { await page.click('#more-btn'); await page.waitForTimeout(250); return page.$eval('.nav-group-preview details', (d) => d.open).catch(() => null); })();
  await ctx.close();
}

// 2. Screens (sephardi default)
const { ctx: c1, page: p1 } = await newPage();
const rulesIdx = await screen(p1, 'rules', '/rules');
const ruleIds = await p1.$$eval('main a[href^="#/rules/"]', (as) => as.map((a) => a.getAttribute('href').slice(1)));
R.flows.rules = { pages: ruleIds, deadEnds: [] };
for (const r of ruleIds) {
  const a = await screen(p1, 'rules-page ' + r, r, { wait: 1200 });
  const links = await p1.$$eval('main nav[aria-label="Rule pages"] a', (as) => as.map((x) => x.getAttribute('href')));
  const tables = await p1.$$eval('main table', (ts) => ts.map((t) => ({ w: Math.round(t.getBoundingClientRect().width), scroller: !!t.closest('[role=region][tabindex="0"]') })));
  a.pageNav = links; a.tables = tables; if (!links.includes('#/rules')) R.flows.rules.deadEnds.push(r);
}
const gram = await screen(p1, 'grammar', '/grammar');
const topicIds = await p1.$$eval('main a[href^="#/grammar/"]', (as) => as.map((a) => a.getAttribute('href').slice(1)));
R.flows.grammar = { topics: topicIds, practice: {} };
for (const tp of topicIds) {
  await screen(p1, 'grammar-topic ' + tp, tp, { wait: 1500 });
  const examples = await p1.$$eval('.gr-ex li', (l) => l.length); const text = await p1.$eval('main', (m) => m.innerText);
  const dist = { examples, hasHeading: await p1.$eval('h1', (h) => h.textContent) };
  // practice: answer every question by tapping the FIRST option, record feedback, check right answer is reported and unique
  await p1.click('#gr-start'); await p1.waitForTimeout(250);
  const qlog = []; let guard = 0;
  while (guard++ < 8 && await p1.$('#gr-prompt')) {
    const prompt = await p1.$eval('#gr-prompt', (e) => e.textContent); const opts = await p1.$$eval('.gr-opt', (b) => b.map((x) => x.textContent.trim()));
    const small = await p1.$$eval('.gr-opt, #gr-next', (b) => b.map((x) => { const r = x.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); }));
    await p1.click('.gr-opt'); await p1.waitForTimeout(120);
    const fb = await p1.$eval('.gr-fb', (e) => e.textContent); const nextVisible = await p1.$eval('#gr-next', (e) => !e.hidden && getComputedStyle(e).display !== 'none');
    const m = /answer is (.+?)\. /.exec(fb); const named = m ? m[1] : null;
    qlog.push({ prompt: prompt.slice(0, 60), opts, dupOpts: new Set(opts).size !== opts.length, right: /^Right\./.test(fb), namedAnswerInOpts: named ? opts.includes(named) : null, nextVisible, sizes: small });
    await p1.click('#gr-next'); await p1.waitForTimeout(150);
  }
  const fin = await p1.evaluate(() => ({ h2: document.querySelector('main h2')?.textContent, again: !!document.querySelector('#gr-again'), all: !![...document.querySelectorAll('main a')].find((a) => a.getAttribute('href') === '#/grammar') }));
  R.flows.grammar.practice[tp] = { ...dist, questions: qlog.length, dupOptionQuestions: qlog.filter((q) => q.dupOpts).length, namedNotInOpts: qlog.filter((q) => q.namedAnswerInOpts === false).length, nextNotVisible: qlog.filter((q) => !q.nextVisible).length, fin, firstQ: qlog[0] };
  if (tp === topicIds[0]) { await p1.click('#gr-again').catch(() => {}); }
}
R.flows.grammar.missing = await (async () => { await p1.goto(base + '#/grammar/nonesuch'); await settle(p1, 1200); return p1.evaluate(() => ({ text: document.querySelector('main').innerText.slice(0, 200), back: !!document.querySelector('main a[href="#/grammar"]'), banner: !!document.querySelector('.preview-banner') })); })();
R.flows.rules.missing = await (async () => { await p1.goto(base + '#/rules/nonesuch'); await settle(p1, 1200); return p1.evaluate(() => ({ text: document.querySelector('main').innerText.slice(0, 300), links: document.querySelectorAll('main a[href^="#/rules/"]').length })); })();
await c1.close();

// 3. Trope trainer, per tradition
R.flows.trope = {};
for (const trad of ['ashkenazi', 'sephardi', 'israeli']) {
  const { ctx, page } = await newPage({ congregation: trad });
  await screen(page, 'trope ' + trad, '/trope', { wait: 1500 });
  const log = { trad, questions: 0, dupLabels: 0, notFour: 0, labelsSeen: new Set(), feedback: [], small: [], levelOpts: await page.$$eval('#trope-level option', (o) => o.map((x) => x.textContent)), namesLine: await page.$eval('main .muted', (e) => e.textContent) };
  for (let lvl = 1; lvl <= 3; lvl++) {
    await page.selectOption('#trope-level', String(lvl)); await page.waitForTimeout(200);
    for (let i = 0; i < 12; i++) {
      const opts = await page.$$eval('.tr-opts button', (b) => b.map((x) => x.textContent.trim()));
      log.questions++; if (opts.length !== 4) log.notFour++; if (new Set(opts).size !== opts.length) log.dupLabels++; opts.forEach((o) => log.labelsSeen.add(o));
      const idx = i % 4; await page.click(`.tr-opts button:nth-child(${idx + 1})`); await page.waitForTimeout(80);
      const st = await page.$eval('.tr-status', (e) => e.textContent); if (i < 3) log.feedback.push(opts[idx] + ' -> ' + st);
      const dis = await page.$$eval('.tr-opts button', (b) => b.every((x) => x.disabled));
      if (!dis) log.feedback.push('options not disabled after answer');
      await page.click('#trope-next'); await page.waitForTimeout(80);
    }
  }
  log.labelsSeen = [...log.labelsSeen].sort();
  log.score = await page.$eval('#trope-score', (e) => e.textContent);
  await page.reload(); await settle(page, 1200); log.scoreAfterReload = await page.$eval('#trope-score', (e) => e.textContent).catch(() => null);
  R.flows.trope[trad] = log; await ctx.close();
}
// Trope feedback check against the corpus table: the name shown as the right answer must be the table's name for the word's mark
{
  const table = JSON.parse(readFileSync(join(root, 'data/corpus/trope/table.json'), 'utf8')).prose;
  const asked = { ashkenazi: new Set(table.map((r) => r.ashkenazi)), sephardi: new Set(table.map((r) => r.sephardi)) };
  for (const trad of ['ashkenazi', 'sephardi']) { const l = R.flows.trope[trad].labelsSeen; R.flows.trope[trad].labelsNotInTable = l.filter((x) => !asked[trad].has(x)); R.flows.trope[trad].labelsInOtherSystemOnly = l.filter((x) => !asked[trad === 'ashkenazi' ? 'sephardi' : 'ashkenazi'].has(x)); }
}

// 4. Tradition quiz: 3 full rounds, check options and that exactly one tradition matches what is shown
R.flows.quiz = { rounds: 0, questions: 0, modes: { ipa: 0, respelling: 0 }, badOptionCount: 0, dupOptions: 0, matchNotOne: [], feedbackWrongNamed: 0, small: [], states: [] };
{
  const { ctx, page } = await newPage({ congregation: 'ashkenazi' });
  await screen(page, 'tradition-quiz', '/tradition-quiz', { wait: 1500 });
  const q = R.flows.quiz;
  for (let round = 0; round < 3; round++) {
    if (round === 0) await page.click('[data-act=start]'); await page.waitForTimeout(200);
    for (let i = 0; i < 10; i++) {
      const info = await page.evaluate(() => ({ shown: document.querySelector('.tq-shown')?.textContent, ask: document.querySelector('.tq-opts')?.previousElementSibling?.textContent, opts: [...document.querySelectorAll('.tq-opts button')].map((b) => b.textContent.trim()), sizes: [...document.querySelectorAll('.tq-opts button')].map((b) => Math.round(b.getBoundingClientRect().height)) }));
      q.questions++; const mode = /sounds/.test(info.ask) ? 'ipa' : 'respelling'; q.modes[mode]++;
      if (info.opts.length !== (mode === 'ipa' ? 3 : 2)) q.badOptionCount++; if (new Set(info.opts).size !== info.opts.length) q.dupOptions++;
      if (round === 0 && i === 0) await page.screenshot({ path: join(shots, 'tradition-quiz-question.png') });
      // answer deliberately wrong-or-right by position: pick option (i % n)
      await page.click(`.tq-opts button:nth-child(${(i % info.opts.length) + 1})`); await page.waitForTimeout(80);
      const fb = await page.evaluate(() => ({ lines: [...document.querySelectorAll('main li[data-mine], main ul li')].map((l) => l.textContent), head: document.querySelector('main [role=status]')?.textContent, nextH: Math.round(document.querySelector('[data-act=next]')?.getBoundingClientRect().height || 0) }));
      // lines look like "Israeli: IPA / respell"; find which traditions' reading equals shown
      const matches = fb.lines.filter((l) => l.includes(info.shown.trim()) ).length;
      if (mode === 'ipa' && matches !== 1) q.matchNotOne.push({ shown: info.shown, lines: fb.lines });
      if (fb.nextH && fb.nextH < 44) q.small.push('next ' + fb.nextH);
      await page.click('[data-act=next]'); await page.waitForTimeout(60);
    }
    // after the last Next click we are at "See my score" flow: the loop clicked [data-act=next] which on the last question is the score button
    await page.waitForTimeout(200);
    q.states.push(await page.evaluate(() => document.querySelector('main h2')?.textContent + ' | ' + [...document.querySelectorAll('main button')].map((b) => b.textContent).join(',')));
    q.rounds++;
    if (round < 2) await page.click('[data-act=again]');
  }
  q.small = [...new Set(q.small)];
  await page.screenshot({ path: join(shots, 'tradition-quiz-score.png') });
  await ctx.close();
}

// 5. Read it my way
R.flows.rmw = {};
{
  const { ctx, page } = await newPage({ congregation: 'sephardi' });
  await screen(page, 'read-my-way', '/read-my-way', { wait: 1500 });
  const pool = JSON.parse(readFileSync(join(root, 'data/pronunciation/runtime/quiz-pool.json'), 'utf8')).pool;
  const line = pool.slice(0, 3).map((w) => w.h).join(' ');
  R.flows.rmw.input = line;
  R.flows.rmw.emptyConvert = await (async () => { await page.click('button[type=submit]'); await page.waitForTimeout(300); return page.evaluate(() => document.querySelector('main').innerText.split('\n').slice(-4).join(' | ')); })();
  for (const trad of ['israeli', 'sephardi', 'ashkenazi']) {
    await page.fill('#rmw-text', line); await page.selectOption('#rmw-trad', trad); await page.click('button[type=submit]'); await page.waitForTimeout(500);
    R.flows.rmw[trad] = await page.evaluate(() => ({ rows: document.querySelectorAll('.rmw-sheet tbody tr').length, sheetText: (document.querySelector('.rmw-sheet')?.innerText || '').replace(/\s+/g, ' ').slice(0, 220), scrollW: document.documentElement.scrollWidth, printEnabled: !document.querySelector('[data-act=print]').disabled }));
  }
  R.flows.rmw.all3 = await (async () => { await page.click('label[for=rmw-all]'); R.flows.rmw.checkedViaLabel = await page.$eval('#rmw-all', (c) => c.checked); await page.click('button[type=submit]'); await page.waitForTimeout(500); return page.evaluate(() => ({ rows: document.querySelectorAll('.rmw-sheet tbody tr').length, headers: [...document.querySelectorAll('.rmw-sheet th')].map((t) => t.textContent.trim()).slice(0, 8), scrollW: document.documentElement.scrollWidth })); })();
  await page.screenshot({ path: join(shots, 'read-my-way-result.png') });
  // unknown word handling (plain letters with no points are not in table)
  await page.fill('#rmw-text', 'שלום'); await page.click('button[type=submit]'); await page.waitForTimeout(400);
  R.flows.rmw.unpointed = await page.evaluate(() => document.querySelector('main').innerText.split('\n').filter(Boolean).slice(-6).join(' | '));
  R.flows.rmw.small = (await audit(page)).small; R.flows.rmw.axeAfterConvert = await axeRun(page);
  R.flows.rmw.persist = await (async () => { await page.fill('#rmw-text', line); await page.click('button[type=submit]'); await page.waitForTimeout(300); await page.reload(); await settle(page, 1200); return page.$eval('#rmw-text', (t) => t.value).catch(() => null); })();
  await ctx.close();
}

// 6. Compare
R.flows.compare = {};
{
  const { ctx, page } = await newPage({ congregation: 'sephardi' });
  await screen(page, 'compare', '/compare', { wait: 1500 });
  const f = R.flows.compare;
  f.pickOptions = await page.$$eval('#cmp-pick option', (o) => o.length);
  f.pickTruncatedGlosses = await page.$$eval('#cmp-pick option', (o) => o.map((x) => x.textContent).filter((t) => / - (a|an|the|to)$/i.test(t.trim())));
  await page.selectOption('#cmp-pick', { index: 1 }); await page.waitForTimeout(300);
  f.afterPick = await page.evaluate(() => ({ input: document.querySelector('#cmp-text').value, text: document.querySelector('main').innerText.split('\n').filter(Boolean).slice(-14).join(' | ').slice(0, 600), scrollW: document.documentElement.scrollWidth }));
  await page.click('main button:not([disabled])').catch(() => {}); await page.waitForTimeout(500);
  f.afterCompare = await page.evaluate(() => ({ tables: [...document.querySelectorAll('main table')].map((t) => ({ w: Math.round(t.getBoundingClientRect().width), scroller: !!t.closest('[role=region][tabindex="0"]') })), scrollW: document.documentElement.scrollWidth, text: document.querySelector('main').innerText.replace(/\s+/g, ' ').slice(-500) }));
  await page.screenshot({ path: join(shots, 'compare-result.png') });
  f.small = (await audit(page)).small; f.axeAfterCompare = await axeRun(page);
  await page.fill('#cmp-text', 'שלום'); await page.click('main button[type=submit], main button:not([disabled])').catch(() => {}); await page.waitForTimeout(400);
  f.unpointed = await page.evaluate(() => document.querySelector('main').innerText.replace(/\s+/g, ' ').slice(-250));
  await ctx.close();
}
R.errorsUnique = [...new Set(R.errors)];
writeFileSync(outFile, JSON.stringify(R, null, 1));
console.log('wrote', outFile, 'screens', Object.keys(R.screens).length, 'errors', R.errorsUnique.length);
await browser.close(); server.close();
