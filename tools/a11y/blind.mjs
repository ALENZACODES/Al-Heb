// Screen-reader-oriented audit (blind and low-vision lane). Chromium only, 375x667 and 1280x800, plus reflow at 200% and 400% zoom equivalents.
// It reads the browser's accessibility tree (ariaSnapshot) and the DOM. NO real screen reader (VoiceOver, TalkBack, NVDA), braille display or
// blind user was involved: this finds structure problems, it cannot say how a screen reader sounds.
// Usage: node tools/a11y/blind.mjs [--routes /a,/b] [--out file] [--strict] [--quick]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
if (!chromium) { console.error('playwright not found'); process.exit(2); }
const here = fileURLToPath(new URL('.', import.meta.url)); const root = join(here, '..', '..');
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const { ROUTES: ROUTE_TABLE } = await import('../../src/shell/router.js');

// every v0 route (parameterised ones get a sample), plus the lesson, review, first-day and Torah reading screens named in the brief
const SAMPLE = { '/letters/:id': '/letters/alef' };
export const V0 = ROUTE_TABLE.filter((r) => r.tier === 'v0').map((r) => SAMPLE[r.pattern] || r.pattern);
export const EXTRA = ['/learn?lesson=r01', '/learn?review=1', '/firstday/ladder', '/torahread', '/torahreader', '/sounds', '/vocab', '/read'];
const scenariosOnly = argv.includes('--scenarios-only');
const routes = arg('--routes') ? arg('--routes').split(',') : [...new Set([...V0, ...EXTRA])];
const outFile = arg('--out') || join(here, 'blind-run.json');
const VIEWPORTS = [{ name: '375x667', width: 375, height: 667 }, { name: '1280x800', width: 1280, height: 800 }];
// seed: onboarded, lesson r01 done (so a lesson review has cards)
const SEED = { 'alef:settings': { onboarded: true }, 'alef:curriculum.progress': { completed: { r01: Date.now() - 86400000 * 3 } } };

const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();

async function newPage(vp, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, ...opts });
  await ctx.addInitScript((seed) => { for (const [k, v] of Object.entries(seed)) if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(v)); }, SEED);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  return { ctx, page, errors };
}
async function settle(page) {
  let last = -1, stable = 0;
  for (let i = 0; i < 40 && stable < 3; i++) { await page.waitForTimeout(200); const n = await page.evaluate(() => (document.querySelector('main')?.innerText || '').length); stable = n === last && n > 0 ? stable + 1 : 0; last = n; }
}
async function go(page, route) {
  await page.goto(base + (route === '/' ? '#/how' : '#/')); // Home is reached from another page: setting the hash to the one already showing is not a navigation await page.waitForSelector('body[data-ready="1"]'); await page.waitForTimeout(250);
  await page.evaluate((h) => { location.hash = h; }, route); await settle(page);
  // the shell moves focus to the heading a moment after the view draws; wait for it (up to 2.5 s) before anything reads document.activeElement
  await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'view-title', null, { timeout: 2500 }).catch(() => {});
}

/** In-page DOM audit. Returns plain data. */
function domAudit() {
  const vis = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[hidden],[inert],[aria-hidden=true]'); };
  const hiddenFromAT = (e) => !!e.closest('[hidden],[inert],[aria-hidden=true]') || getComputedStyle(e).display === 'none' || getComputedStyle(e).visibility === 'hidden';
  const main = document.querySelector('main');
  const snip = (e) => (e.outerHTML || '').replace(/\s+/g, ' ').slice(0, 120);
  const o = {};
  o.landmarks = { main: document.querySelectorAll('main,[role=main]').length, banner: document.querySelectorAll('header,[role=banner]').length, nav: document.querySelectorAll('nav,[role=navigation]').length };
  o.skipLink = (() => { const a = document.querySelector('a[href="#main"],a.skip,a[href^="#"][class*=skip]'); return a ? { text: a.textContent.trim(), href: a.getAttribute('href'), targetExists: !!document.querySelector(a.getAttribute('href')) } : null; })();
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter((h) => !hiddenFromAT(h) && (vis(h) || h.classList.contains('visually-hidden') || h.classList.contains('sr-only')));
  o.h1 = hs.filter((h) => h.tagName === 'H1').map((h) => h.textContent.trim().slice(0, 60));
  o.headingSkips = []; { let prev = 0; for (const h of hs) { const n = +h.tagName[1]; if (prev && n > prev + 1) o.headingSkips.push(`h${prev} -> h${n} "${h.textContent.trim().slice(0, 30)}"`); prev = n; } }
  o.headings = hs.map((h) => h.tagName.toLowerCase() + ':' + h.textContent.trim().slice(0, 30));
  o.liveRegions = main ? main.querySelectorAll('[role=status],[role=alert],[role=log],[aria-live]').length : 0;
  o.interactive = main ? main.querySelectorAll('input,select,textarea').length + (main.querySelectorAll('button').length >= 2 ? main.querySelectorAll('button').length : 0) : 0; // a lone button (Home: More) has no feedback to announce
  // images, svg, canvas
  o.imgNoAlt = [...document.querySelectorAll('img')].filter((i) => !hiddenFromAT(i) && !i.hasAttribute('alt')).map(snip);
  o.svgUnnamed = [...document.querySelectorAll('svg')].filter((s) => !hiddenFromAT(s) && !s.closest('button,a')).filter((s) => { const r = s.getAttribute('role'); const nm = s.getAttribute('aria-label') || s.getAttribute('aria-labelledby') || s.querySelector('title'); return r === 'img' ? !nm : !s.hasAttribute('aria-hidden'); }).map(snip);
  o.canvasUnnamed = [...document.querySelectorAll('canvas')].filter((c) => !hiddenFromAT(c) && !(c.getAttribute('aria-label') || c.getAttribute('aria-labelledby'))).map(snip);
  o.imgRoleNoName = [...document.querySelectorAll('[role=img]')].filter((e) => !hiddenFromAT(e) && !(e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.querySelector('title'))).map(snip);
  // Hebrew: lang+dir, and a readable name: the Hebrew must be inside something that also carries Latin text (letter name / transliteration / gloss) or have aria-label
  const bad = [];
  if (main) {
    const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (!/[֐-׿]/.test(n.nodeValue)) continue;
      const p = n.parentElement; if (!p || p.closest('script,style') || hiddenFromAT(p)) continue;
      if (seen.has(p)) continue; seen.add(p);
      const langEl = p.closest('[lang]'); const lang = langEl?.getAttribute('lang') || '';
      const rtl = getComputedStyle(p).direction === 'rtl';
      const hebOnly = !/[A-Za-z]/.test(n.nodeValue);
      const issues = [];
      if (!/^he\b/i.test(lang)) issues.push('no-lang-he');
      if (hebOnly && !rtl) issues.push('not-rtl');
      // text equivalent: aria-label on the element or an ancestor control, or Latin text in the nearest control/list item/block
      let named = false; for (let e = p; e && e !== main; e = e.parentElement) { if (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby')) { named = true; break; } if (/^(BUTTON|A|LI|P|TD|TH|TR|LABEL|SUMMARY|FIGURE|DT|DD|H[1-6]|DIV)$/.test(e.tagName) || e.getAttribute('role') === 'button') { if (e.tagName === 'DIV' && (e.textContent || '').length > 160) break; const lat = (e.textContent || '').replace(/[֐-׿]/g, ''); if (/[A-Za-z]{2,}/.test(lat)) { named = true; break; } if (e.tagName !== 'DIV' && e.tagName !== 'TD' && e.tagName !== 'TH') break; } }
      if (hebOnly && !named) issues.push('no-text-equivalent');
      if (issues.length) bad.push({ text: n.nodeValue.trim().slice(0, 24), issues: issues.join('+'), html: snip(p).slice(0, 90) });
    }
  }
  o.hebrew = bad.slice(0, 60); o.hebrewCount = bad.length;
  return o;
}

/** Accessibility-tree checks from the ariaSnapshot text. */
function treeChecks(snap) {
  const unnamed = []; for (const line of snap.split('\n')) { const m = /^\s*- (button|link|checkbox|radio|tab|switch|combobox|textbox|slider|menuitem|img)(?: \[[^\]]*\])*(:|$)/.exec(line); if (m && !/"/.test(line.split(':')[0])) unnamed.push(line.trim()); }
  return { unnamed: unnamed.slice(0, 20) };
}

async function tabWalk(page, max = 90) {
  await page.evaluate(() => { (document.querySelector('#view-title') || document.body).focus?.(); });
  const seq = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const s = await page.evaluate(() => { const a = document.activeElement; if (!a || a === document.body) return 'body'; return a.tagName + '#' + (a.id || '') + '.' + (a.getAttribute('data-act') || a.textContent.trim().slice(0, 12)); });
    seq.push(s);
  }
  // a trap = the last 30 stops cycle among <= 3 distinct elements AND they are all inside main/dialog (the normal wrap goes through the document chrome)
  const tail = seq.slice(-30); const distinct = new Set(tail).size;
  return { stops: new Set(seq).size, trap: distinct <= 3 && tail.every((x) => x !== 'body') };
}

async function reflow(route, width, height) {
  const { ctx, page } = await newPage({ width, height });
  await go(page, route);
  const r = await page.evaluate((W) => {
    const doc = document.documentElement; const clipped = []; const wide = [];
    for (const e of document.querySelectorAll('main *, .site-nav *, header *')) {
      const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue; const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
      if (e.closest('svg') && e.tagName !== 'svg') continue;
      if (e.closest('.visually-hidden,.sr-only,.mc-sr')) continue;
      const hasText = [...e.childNodes].some((c) => c.nodeType === 3 && c.nodeValue.trim());
      if (hasText && (cs.overflowX === 'hidden' || cs.overflowX === 'clip' || cs.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 2) clipped.push(e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') + ' ' + e.scrollWidth + '>' + e.clientWidth);
      if (hasText && (cs.overflowY === 'hidden' || cs.overflowY === 'clip') && e.scrollHeight > e.clientHeight + 2 && cs.height !== 'auto') clipped.push(e.tagName.toLowerCase() + ' height ' + e.scrollHeight + '>' + e.clientHeight);
      if (r.right > W + 1 || r.left < -1) { let p = e.parentElement, inScroll = false; for (; p && p !== document.body; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll') { inScroll = true; break; } } if (!inScroll) wide.push(e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') + ' right=' + Math.round(r.right)); }
    }
    return { sideways: doc.scrollWidth > doc.clientWidth + 1, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, clipped: [...new Set(clipped)].slice(0, 8), wide: [...new Set(wide)].slice(0, 8) };
  }, width);
  await ctx.close(); return r;
}

const result = { tool: 'tools/a11y/blind.mjs', when: new Date().toISOString(), note: 'Chromium accessibility tree and DOM only. No screen reader, braille display, magnifier software or blind user was involved.', routes: {}, scenarios: {} };
const findings = []; const add = (route, vp, kind, detail) => findings.push({ route, vp, kind, detail });

for (const vp of (scenariosOnly ? [] : VIEWPORTS)) {
  for (const route of routes) {
    const { ctx, page, errors } = await newPage(vp);
    await go(page, route);
    const rec = ((result.routes[route] ||= {})[vp.name] = {});
    rec.focusOnNav = await page.evaluate(() => { const a = document.activeElement; return a ? a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') : null; });
    Object.assign(rec, await page.evaluate(domAudit));
    const snap = await page.locator('body').ariaSnapshot(); rec.tree = treeChecks(snap);
    rec.tab = await tabWalk(page, argv.includes('--quick') ? 30 : 90);
    rec.errors = errors.slice(0, 3);
    if (!/^(h1|[a-z]+#view-title|h[1-6])/.test(rec.focusOnNav || '') && !/view-title|^main/.test(rec.focusOnNav || '')) add(route, vp.name, 'focus-after-navigation', 'activeElement was ' + rec.focusOnNav);
    if (rec.landmarks.main !== 1) add(route, vp.name, 'landmark-main', String(rec.landmarks.main));
    if (!rec.landmarks.nav) add(route, vp.name, 'landmark-nav', 'none');
    if (!rec.skipLink) add(route, vp.name, 'skip-link', 'missing'); else if (!rec.skipLink.targetExists) add(route, vp.name, 'skip-link-target', rec.skipLink.href);
    if (rec.h1.length !== 1) add(route, vp.name, 'h1-count', String(rec.h1.length));
    for (const s of rec.headingSkips) add(route, vp.name, 'heading-skip', s);
    if (!rec.liveRegions && rec.interactive) add(route, vp.name, 'no-live-region', 'main has buttons or fields but no live region');
    for (const x of rec.imgNoAlt) add(route, vp.name, 'img-no-alt', x);
    for (const x of rec.svgUnnamed) add(route, vp.name, 'svg-unnamed', x);
    for (const x of rec.canvasUnnamed) add(route, vp.name, 'canvas-unnamed', x);
    for (const x of rec.imgRoleNoName) add(route, vp.name, 'role-img-no-name', x);
    for (const x of rec.tree.unnamed) add(route, vp.name, 'control-no-name', x);
    for (const x of rec.hebrew) add(route, vp.name, 'hebrew:' + x.issues, `${x.text} ${x.html}`);
    if (rec.tab.trap) add(route, vp.name, 'focus-trap', 'tab cycles among <=3 elements');
    if (rec.errors.length) add(route, vp.name, 'page-error', rec.errors[0]);
    await ctx.close();
  }
}
// reflow: 200% and 400% of 1280x800 are 640x400 and 320x200 CSS px
for (const route of (scenariosOnly ? [] : ['/', '/letters', '/letters/alef', '/learn', '/learn?lesson=r01', '/learn?review=1'])) {
  for (const [name, w, h] of [['200%', 640, 400], ['400%', 320, 200]]) {
    const r = await reflow(route, w, h); (result.routes[route] ||= {})['zoom' + name] = r;
    if (r.sideways) add(route, 'zoom' + name, 'reflow-sideways', `${r.scrollWidth}>${r.clientWidth}`);
    for (const c of r.clipped) add(route, 'zoom' + name, 'clipped-text', c);
    for (const c of r.wide) add(route, 'zoom' + name, 'extends-past-viewport', c);
  }
}

// ---- scenarios: behaviour a static scan cannot see (each records ok/FAIL with the evidence)
const scen = (name, ok, detail = '') => { result.scenarios[name] = { ok: !!ok, detail }; if (!ok) add('(scenario)', '375x667', 'scenario-fail', name + ' ' + detail); };
{
  const { ctx, page } = await newPage(VIEWPORTS[0]);
  await go(page, '/letters/alef');
  const sw = page.locator('details.strokewords');
  scen('strokes-in-words panel exists on the letter page', await sw.count() === 1);
  await sw.locator('summary').click();
  const now = page.locator('[data-sw-now]');
  await page.locator('[data-act="sw-next"]').focus(); await page.keyboard.press('Enter');
  const t1 = await now.textContent(); scen('stepper: Enter on Next stroke in words reads stroke 1 (keyboard only)', /^Stroke 1 of 3:/.test(t1), t1.slice(0, 80));
  await page.keyboard.press('Enter'); const t2 = await now.textContent(); scen('stepper: second press reads stroke 2', /^Stroke 2 of 3:/.test(t2), t2.slice(0, 80));
  await page.locator('[data-act="sw-prev"]').focus(); await page.keyboard.press('Enter'); const t3 = await now.textContent(); scen('stepper: Previous goes back to stroke 1', /^Stroke 1 of 3:/.test(t3));
  scen('stepper: focus stays on the pressed button (no focus move)', await page.evaluate(() => document.activeElement?.getAttribute('data-act')) === 'sw-prev');
  scen('stepper text sits in a polite live region', await now.getAttribute('aria-live') === 'polite' && await now.getAttribute('role') === 'status');
  scen('the drawing area points to the text version (aria-describedby resolves to text)', await page.evaluate(() => { const s = document.querySelector('.stage svg'); const id = s?.getAttribute('aria-describedby'); return !!id && (document.getElementById(id)?.textContent || '').length > 30; }));
  scen('the honest note about tracing being visual is on the panel', /visual skill/.test(await page.locator('[data-sw-note]').textContent()));
  // memory card: description appears on press, hook and word are text
  await page.locator('.mc [data-act="mc-art"]').click();
  const sr = await page.locator('.mc .mc-sr').textContent();
  scen('memory card: pressing the picture gives a text description (why the shape fits)', sr.length > 60, sr.slice(0, 90));
  scen('memory card: the picture and glyph are hidden from a screen reader (decorative)', await page.evaluate(() => [...document.querySelectorAll('.mc .mc-svg,.mc .mc-glyph,.mc .mc-idea')].every((e) => e.getAttribute('aria-hidden') === 'true')));
  scen('memory card: hook and word are text in the list', /Sound/.test(await page.locator('.mc-steps').textContent()) && /Word/.test(await page.locator('.mc-steps').textContent()));
  // drill: option names are shape descriptions, not the letter names
  await page.getByRole('tab', { name: 'Look-alikes' }).click(); await page.waitForTimeout(300);
  const names = await page.locator('.opts button').evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label')));
  scen('look-alike drill: each glyph option has a shape description for a screen reader', names.length >= 2 && names.every((n) => /Shape:/.test(n || '')), names.join(' | ').slice(0, 120));
  await ctx.close();
}
{
  const { ctx, page } = await newPage(VIEWPORTS[0]);
  await go(page, '/learn?lesson=r01');
  scen('lesson: pointed words show a respelling as text', /Sounds like:/.test((await page.locator('.alef-respell').first().textContent().catch(() => '')) || ''));
  await page.click('#alef-quick-start'); await page.waitForTimeout(400);
  scen('quiz: the glyph in the question has a text equivalent (role img + label)', await page.evaluate(() => { const e = document.querySelector('.alef-ex-card [role=img][lang=he]'); return !!e && (e.getAttribute('aria-label') || '').length > 20; }));
  await page.locator('.alef-int-opt').first().click(); await page.waitForTimeout(200);
  const r = await page.evaluate(() => { const a = document.activeElement; const ids = (a.getAttribute('aria-describedby') || '').split(' ').filter(Boolean); return { tag: a.textContent.trim(), desc: ids.map((i) => document.getElementById(i)?.textContent || '').join(' ').trim(), live: document.querySelector('.alef-fb')?.getAttribute('aria-live') }; });
  scen('quiz: the verdict is a polite live region AND the focused Continue button carries it as its description', r.live === 'polite' && /right|answer|Not quite|Yes|Good/i.test(r.desc), `${r.tag}: ${r.desc.slice(0, 80)}`);
  await ctx.close();
}
{
  const { ctx, page } = await newPage(VIEWPORTS[0]);
  await go(page, '/learn?lesson=r01&review=1');
  scen('review: a letter card front has a text equivalent that does not name the letter', await page.evaluate(() => { const e = document.querySelector('.alef-card [role=img][lang=he]'); return !!e && /Shape:/.test(e.getAttribute('aria-label') || ''); }));
  const btn = page.getByRole('button', { name: 'Show answer' }); if (await btn.count()) { await btn.click(); await page.waitForTimeout(200); scen('review: Show answer moves focus to the answer box (new content), ratings are labelled', await page.evaluate(() => document.activeElement?.classList.contains('alef-answer')) && (await page.locator('.alef-rate').count()) === 4); }
  await ctx.close();
}

await browser.close(); server.close();
result.findings = findings;
result.summary = { routes: routes.length, findings: findings.length, byKind: findings.reduce((m, f) => ((m[f.kind] = (m[f.kind] || 0) + 1), m), {}) };
writeFileSync(outFile, JSON.stringify(result, null, 1));
for (const f of findings) console.log(`${f.route} [${f.vp}] ${f.kind}: ${f.detail}`.slice(0, 230));
console.log(JSON.stringify(result.summary));
if (argv.includes('--strict') && findings.length) process.exit(1);
