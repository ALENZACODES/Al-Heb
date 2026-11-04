// Accessibility round 2 for the newest views: axe-core (tools/a11y/node_modules, dev-only) plus checks axe does not make:
// focus order and visible focus, accessible names on controls, live regions, reduced motion, reflow at 320 and 195 CSS px, and
// lang/dir on Hebrew text. Chromium at 390x844, light and dark. NO screen reader was used; these are DOM/CSS measurements only.
// Usage: node tools/a11y/newviews.mjs [--out file] [--routes /a,/b] [--json]   -> prints a summary, writes the JSON, exit 1 if --strict and any finding
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
if (!chromium) { console.error('playwright not found'); process.exit(2); }
const here = fileURLToPath(new URL('.', import.meta.url)); const root = join(here, '..', '..');
const axeSource = readFileSync(join(here, 'node_modules/axe-core/axe.min.js'), 'utf8');
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
export const ROUTES = ['/firstday', '/firstday/ladder', '/placement', '/speak', '/welcome', '/reminders', '/install', '/offline', '/vocab/themes', '/progress'];
const routes = arg('--routes') ? arg('--routes').split(',') : ROUTES;
const outFile = arg('--out') || join(here, 'newviews-run.json');

/** In-page audit. Runs inside Chromium; returns plain data. */
function pageAudit() {
  const main = document.querySelector('main') || document.body;
  const visible = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[hidden],[inert]'); };
  const snip = (e) => (e.outerHTML || '').replace(/\s+/g, ' ').slice(0, 110);
  const sel = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : ''));
  const textOf = (e) => (e.textContent || '').replace(/\s+/g, ' ').trim();
  const nameOf = (e) => {
    const lb = e.getAttribute('aria-labelledby'); if (lb) { const t = lb.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ').trim(); if (t) return t; }
    const al = e.getAttribute('aria-label'); if (al && al.trim()) return al.trim();
    if (e.labels && e.labels.length) { const t = [...e.labels].map(textOf).join(' ').trim(); if (t) return t; }
    if (e.tagName === 'INPUT' && /^(button|submit|reset)$/.test(e.type) && e.value) return e.value;
    const t = textOf(e); if (t) return t;
    const img = e.querySelector('img[alt]'); if (img && img.alt.trim()) return img.alt.trim();
    return (e.getAttribute('title') || '').trim();
  };
  const out = {};
  // labels / names
  const ctrls = [...main.querySelectorAll('input:not([type=hidden]),select,textarea,button,a[href],[role=button],[role=checkbox],[role=radio],[role=switch],[role=tab],progress,meter')].filter(visible);
  out.unnamed = ctrls.filter((e) => !nameOf(e)).map((e) => ({ sel: sel(e), html: snip(e) }));
  const radios = [...main.querySelectorAll('input[type=radio]')].filter(visible);
  out.radioGroupsWithoutName = [...new Set(radios.map((r) => r.name || '(none)'))].filter((n) => { const r = radios.find((x) => (x.name || '(none)') === n); const g = r.closest('fieldset,[role=radiogroup],[role=group]'); return !g || !(g.querySelector('legend')?.textContent.trim() || g.getAttribute('aria-label') || g.getAttribute('aria-labelledby')); });
  out.placeholderOnly = [...main.querySelectorAll('input[placeholder],textarea[placeholder]')].filter((e) => visible(e) && !nameOf(e)).map((e) => ({ sel: sel(e), html: snip(e) }));
  // headings and landmarks
  out.h1 = [...document.querySelectorAll('h1')].filter(visible).map((h) => ({ id: h.id, text: textOf(h).slice(0, 60) }));
  out.headingSkips = (() => { const hs = [...main.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(visible).map((h) => +h.tagName[1]); const bad = []; for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) bad.push(`h${hs[i - 1]} -> h${hs[i]}`); return bad; })();
  out.pageTitle = document.title;
  // live regions
  const live = [...main.querySelectorAll('[role=status],[role=alert],[role=log],[aria-live]')];
  out.liveRegions = live.map((e) => ({ sel: sel(e), role: e.getAttribute('role'), live: e.getAttribute('aria-live'), hidden: !visible(e) && !!e.closest('[hidden]') }));
  out.dynamicNoLive = [...main.querySelectorAll('[class*="status"],[id*="status"],[class*="feedback"],[id*="feedback"],[id*="progress-text"]')].filter((e) => visible(e) && !e.closest('[role=status],[role=alert],[aria-live]') && !e.matches('[role=status],[role=alert],[aria-live]')).map((e) => ({ sel: sel(e), html: snip(e) }));
  // hebrew lang/dir
  const bad = [];
  const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const t = n.nodeValue; if (!/[֐-׿]/.test(t)) continue;
    const p = n.parentElement; if (!p || !visible(p) || p.closest('script,style')) continue;
    const langEl = p.closest('[lang]'); const lang = langEl?.getAttribute('lang') || '';
    const dir = getComputedStyle(p).direction;
    const hebrewOnly = !/[A-Za-z]/.test(t);
    const missingLang = !/^he\b/i.test(lang);
    const missingDir = dir !== 'rtl';
    if (missingLang || (missingDir && hebrewOnly)) bad.push({ sel: sel(p), text: t.trim().slice(0, 30), lang: lang || '(none)', dir, missingLang, missingDir: missingDir && hebrewOnly });
  }
  out.hebrewIssues = bad.slice(0, 40); out.hebrewIssueCount = bad.length;
  out.hebrewSpans = main.querySelectorAll('[lang^=he]').length;
  return out;
}

/** Focus walk: Tab through main, record stops, check names, visible focus, order. Runs from Node via the page. */
async function focusWalk(page, max = 60) {
  await page.evaluate(() => { document.getElementById('view-title')?.focus(); });
  const stops = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const s = await page.evaluate(() => {
      const a = document.activeElement; if (!a || a === document.body) return null;
      const inMain = !!a.closest('main');
      const r0 = a.getBoundingClientRect(); const cs = getComputedStyle(a);
      let r = r0; for (const l of (a.labels || [])) { const lr = l.getBoundingClientRect(); if (lr.width * lr.height > r.width * r.height) r = lr; } // a label that wraps the control is part of its target
      const ow = parseFloat(cs.outlineWidth) || 0; const hasOutline = cs.outlineStyle !== 'none' && ow >= 2 && cs.outlineColor !== 'rgba(0, 0, 0, 0)';
      const hasShadow = cs.boxShadow && cs.boxShadow !== 'none';
      const name = (a.getAttribute('aria-label') || (a.labels && [...a.labels].map((l) => l.textContent).join(' ')) || a.textContent || a.value || a.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 50);
      return { tag: a.tagName.toLowerCase(), id: a.id, type: a.type || '', inMain, top: Math.round(r.top + scrollY), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), tabindex: a.getAttribute('tabindex'), name, visibleFocus: hasOutline || !!hasShadow, outline: `${cs.outlineStyle} ${cs.outlineWidth}`, onscreen: r0.width > 0 && r0.height > 0 };
    });
    if (!s) break;
    if (stops.length && stops[0].key === (s.id || s.name) + s.tag && i > 1) break; // wrapped around
    s.key = (s.id || s.name) + s.tag; stops.push(s);
    if (!s.inMain && stops.some((x) => x.inMain)) break; // left main: done with the view
  }
  const inMain = stops.filter((s) => s.inMain);
  const posTab = inMain.filter((s) => s.tabindex && +s.tabindex > 0);
  const noFocusRing = inMain.filter((s) => !s.visibleFocus).map((s) => `${s.tag}${s.id ? '#' + s.id : ''} "${s.name}" (${s.outline})`);
  const tiny = inMain.filter((s) => s.onscreen && (s.w < 24 || s.h < 24) && s.tag !== 'a').map((s) => `${s.tag}${s.id ? '#' + s.id : ''} ${s.w}x${s.h}`);
  let backwards = 0; for (let i = 1; i < inMain.length; i++) if (inMain[i].top < inMain[i - 1].top - 40) backwards++;
  const offscreen = inMain.filter((s) => !s.onscreen).map((s) => `${s.tag}${s.id ? '#' + s.id : ''}`);
  return { count: inMain.length, order: inMain.map((s) => `${s.tag}${s.id ? '#' + s.id : ''}:${s.name.slice(0, 20)}`), positiveTabindex: posTab.length, noFocusRing, smallTargets: tiny, visualOrderJumps: backwards, zeroSizeStops: offscreen };
}

async function reducedMotion(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main') || document.body; const bad = [];
    for (const e of [main, ...main.querySelectorAll('*')]) {
      const s = getComputedStyle(e);
      const anim = s.animationName !== 'none' && parseFloat(s.animationDuration) > 0.01 && s.animationIterationCount !== '0';
      const dur = s.transitionDuration.split(',').map(parseFloat).some((d) => d > 0.01) && s.transitionProperty !== 'none';
      const smooth = s.scrollBehavior === 'smooth';
      if (anim || dur || smooth) bad.push(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/)[0] : ''} ${anim ? 'animation ' + s.animationName : ''}${dur ? 'transition ' + s.transitionProperty + ' ' + s.transitionDuration : ''}${smooth ? ' scroll-behavior:smooth' : ''}`.trim());
    }
    return [...new Set(bad)].slice(0, 20);
  });
}
async function reflow(browser, base, route, theme, setup, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 700 }, colorScheme: theme });
  await ctx.addInitScript(() => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); });
  const page = await ctx.newPage(); await page.goto(base + '#' + route); await page.waitForSelector('body[data-ready="1"]'); await page.waitForTimeout(500);
  if (setup) await setup(page);
  const r = await page.evaluate((W) => {
    const doc = document.documentElement; const main = document.querySelector('main') || document.body; const over = [];
    const clipped = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true; } return false; };
    for (const e of main.querySelectorAll('*')) { const r = e.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue; if (r.right > W + 1 && !clipped(e)) over.push(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''} right=${Math.round(r.right)}`); }
    return { pageScrollsSideways: doc.scrollWidth > doc.clientWidth + 1, scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, overflowing: [...new Set(over)].slice(0, 12) };
  }, width);
  await ctx.close(); return r;
}

// best-effort extra states per route (after first audit); failures to find the control are recorded, not fatal
const STATES = {
  '/welcome': [{ name: 'step 2 after Continue', run: async (p) => { await p.getByRole('button', { name: /^continue$/i }).click({ timeout: 1500 }); await p.waitForTimeout(500); } }],
  '/placement': [{ name: 'after the start button', run: async (p) => { await p.getByRole('button', { name: /start|begin|first/i }).first().click({ timeout: 1500 }); await p.waitForTimeout(600); } }],
  '/reminders': [{ name: 'Allow button (permission default)', run: async (p) => { await p.waitForSelector('#nt-time', { timeout: 2000 }); } }],
  '/firstday/ladder': [],
};

const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const result = { tool: 'tools/a11y/newviews.mjs', axe: JSON.parse(readFileSync(join(here, 'node_modules/axe-core/package.json'), 'utf8')).version, when: new Date().toISOString(), viewport: '390x844', note: 'Measured with Chromium + axe-core + DOM/CSS checks. No screen reader, no real device, no keyboard on a physical phone.', routes: {} };

for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: theme });
  await ctx.addInitScript(() => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); });
  for (const route of routes) {
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 120)); });
    const rec = ((result.routes[route] ||= {})[theme] = { states: {} });
    // in-app navigation (home first, then the hash changes) because the shell deliberately does not move focus on the very first load
    await page.goto(base + '#/'); await page.waitForSelector('body[data-ready="1"]'); await page.waitForTimeout(300);
    await page.evaluate((h) => { location.hash = h; }, route); await page.waitForTimeout(1200);
    rec.focusOnNav = await page.evaluate(() => ({ onHeading: document.activeElement?.id === 'view-title' || document.activeElement === document.querySelector('main h1'), active: document.activeElement ? document.activeElement.tagName.toLowerCase() + (document.activeElement.id ? '#' + document.activeElement.id : '') : null }));
    rec.hash = await page.evaluate(() => location.hash);
    rec.rendered = await page.evaluate(() => { const m = document.querySelector('main'); return { text: (m?.textContent || '').trim().length, h1: document.querySelector('h1')?.textContent?.trim().slice(0, 60) || null }; });
    const audit = async (label, p) => {
      await p.evaluate(axeSource);
      const ax = await p.evaluate(async () => { const x = await axe.run(document, { resultTypes: ['violations', 'incomplete'] }); const f = (v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 120), summary: (n.failureSummary || '').split('\n').slice(1, 3).join(' ').trim() })), count: v.nodes.length }); return { violations: x.violations.map(f), incomplete: x.incomplete.filter((v) => v.id === 'color-contrast').map(f) }; });
      const a = await p.evaluate(pageAudit);
      const walk = await focusWalk(p);
      return { axe: ax, ...a, focus: walk };
    };
    Object.assign(rec, await audit('initial', page));
    for (const st of STATES[route] || []) {
      try { await st.run(page); rec.states[st.name] = await audit(st.name, page); } catch (e) { rec.states[st.name] = { skipped: String(e.message).split('\n')[0] }; }
    }
    // reduced motion (separate context so the media query applies from load)
    const rctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: theme, reducedMotion: 'reduce' });
    await rctx.addInitScript(() => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); });
    const rp = await rctx.newPage(); await rp.goto(base + '#' + route); await rp.waitForSelector('body[data-ready="1"]'); await rp.waitForTimeout(500);
    rec.motionUnderReduce = await reducedMotion(rp); await rctx.close();
    if (theme === 'light') { rec.reflow320 = await reflow(browser, base, route, theme, null, 320); rec.reflow195 = await reflow(browser, base, route, theme, null, 195); }
    rec.pageErrors = errors.slice(0, 5);
    await page.close();
  }
  await ctx.close();
}
await browser.close(); server.close();

// ---- summary
const findings = [];
for (const [route, cfg] of Object.entries(result.routes)) for (const [theme, rec] of Object.entries(cfg)) {
  const add = (kind, detail) => findings.push({ route, theme, kind, detail });
  for (const [label, r] of [['initial', rec], ...Object.entries(rec.states)]) {
    if (r.skipped) continue;
    for (const v of r.axe.violations) add(`axe:${v.id}`, `${label}: ${v.impact} x${v.count} ${v.nodes[0]?.target}`);
    for (const u of r.unnamed) add('no-name', `${label}: ${u.html}`);
    for (const n of r.radioGroupsWithoutName) add('radio-group-no-name', `${label}: ${n}`);
    for (const u of r.placeholderOnly) add('placeholder-only', `${label}: ${u.html}`);
    if (label === 'initial' && r.h1.length !== 1) add('h1-count', `${r.h1.length} visible h1`);
    for (const s of r.headingSkips) add('heading-skip', `${label}: ${s}`);
    if (r.hebrewIssueCount) add('hebrew-lang-dir', `${label}: ${r.hebrewIssueCount} text nodes, e.g. ${JSON.stringify(r.hebrewIssues[0])}`);
    if (r.focus.positiveTabindex) add('positive-tabindex', label);
    for (const s of r.focus.noFocusRing) add('no-visible-focus', `${label}: ${s}`);
    for (const s of r.focus.smallTargets) add('small-target(<24px)', `${label}: ${s}`);
    if (r.focus.visualOrderJumps > 1) add('focus-order-jumps', `${label}: ${r.focus.visualOrderJumps} backwards jumps in ${r.focus.order.join(' > ')}`);
    for (const s of r.dynamicNoLive) add('status-text-outside-live-region', `${label}: ${s.html}`);
  }
  if (!rec.focusOnNav.onHeading) add('focus-not-on-heading-after-navigation', `activeElement was ${rec.focusOnNav.active} 1.2 s after navigating from #/`);
  if (!rec.rendered.text) add('empty-main', rec.hash);
  if (rec.motionUnderReduce.length) add('motion-under-reduce', rec.motionUnderReduce.slice(0, 3).join('; '));
  if (rec.reflow320?.pageScrollsSideways || rec.reflow320?.overflowing.length) add('reflow-320', `${rec.reflow320.scrollWidth}>${rec.reflow320.clientWidth} ${rec.reflow320.overflowing.slice(0, 3).join(', ')}`);
  if (rec.reflow195?.pageScrollsSideways || rec.reflow195?.overflowing.length) add('reflow-195(200% of 390)', `${rec.reflow195.scrollWidth}>${rec.reflow195.clientWidth} ${rec.reflow195.overflowing.slice(0, 3).join(', ')}`);
  if (rec.pageErrors.length) add('page-error', rec.pageErrors[0]);
}
result.findings = findings;
result.summary = { routes: routes.length, findings: findings.length, byKind: findings.reduce((m, f) => ((m[f.kind] = (m[f.kind] || 0) + 1), m), {}) };
writeFileSync(outFile, JSON.stringify(result, null, 1));
if (!argv.includes('--json')) { for (const f of findings) console.log(`${f.route} [${f.theme}] ${f.kind}: ${f.detail}`.slice(0, 260)); console.log(JSON.stringify(result.summary)); }
if (argv.includes('--strict') && findings.length) process.exit(1);
