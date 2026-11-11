// Route sweep (QA). Headless Chromium emulation only: no real phone, finger, stylus or screen reader was used.
// Usage: node tools/qa/sweep.mjs [--out docs/qa] [--quick] [--routes /a,/b] [--concurrency 3] [--kb-stops 30]
//   Phase 1 (layout): every route in src/shell/router.js (sample param where needed) at 320x640, 390x844 and 1280x800, light and
//     dark (the app has a theme setting: settings.theme auto|light|dark, applied as <html data-theme>). Collects console errors,
//     uncaught exceptions, failed requests (network failure or HTTP >= 400), axe violations, horizontal overflow, empty <main>,
//     missing h1, touch targets under 44 CSS px (phone widths only), clipped text.
//   Phase 2 (keyboard): Tab through the first N (default 30) stops of each route at 390 and 1280 (light), check a visible focus
//     change, focus lost, off-screen focus, focus traps.
//   --quick: 3 routes, 390 light only, 12 keyboard stops. Used by tests/sweep.test.js. Never writes into docs/qa unless --out says so.
// Writes <out>/sweep.json and <out>/SWEEP.md (unless --no-md). Exit 0 always when the sweep itself ran (it reports, it does not gate).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createAppServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
if (!chromium) { console.error('playwright not found'); process.exit(2); }
const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const quick = args.includes('--quick');
const outDir = resolve(root, arg('--out', 'docs/qa'));
const conc = Math.max(1, +arg('--concurrency', quick ? 1 : 3));
const kbStops = +arg('--kb-stops', quick ? 12 : 30);
const axeSource = readFileSync(join(root, 'tools/a11y/node_modules/axe-core/axe.min.js'), 'utf8');

const { ROUTES } = await import(pathToFileURL(join(root, 'src/shell/router.js')).href);
// One sample per path parameter name; a few routes need a real id to avoid testing only the "not found" card.
const BY_ROUTE = { letter: 'bet', dialogue: 'd-cafe', fadeline: 'bless-priestly-1', festival: 'hanukkah', 'rules-page': 'kamatz', intermediatelesson: 'I-01', torahreadsec: 'aliyah', israelsec: 'say', loanword: 'lw1', spotit: 'bet', text: 'bless-priestly-1', classtrackweek: '1', classtrackmode: 'handout' };
const SAMPLE = { id: 'x', letter: 'bet', group: 'lw1', textId: 'bless-priestly-1', sec: 'say', section: 'aliyah', week: '1', mode: 'handout', rule: 'kamatz', topic: 'article' };
const sampleFor = (r) => r.pattern.replace(/:(\w+)/g, (_, k) => BY_ROUTE[r.name] ?? SAMPLE[k] ?? 'x');
let ALL = ROUTES.map((r) => ({ path: sampleFor(r), name: r.name, module: r.module, owner: r.owner }));
if (arg('--routes')) { const want = arg('--routes').split(','); ALL = want.map((p) => ALL.find((r) => r.path === p) || { path: p, name: 'custom', module: null, owner: '?' }); }
else if (quick) { const keep = ['/', '/learn', '/typing']; ALL = keep.map((p) => ALL.find((r) => r.path === p)).filter(Boolean); }

const VIEWPORTS = quick ? [{ id: '390', w: 390, h: 844 }] : [{ id: '320', w: 320, h: 640 }, { id: '390', w: 390, h: 844 }, { id: '1280', w: 1280, h: 800 }];
const THEMES = quick ? ['light'] : ['light', 'dark'];

const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.QA_CHROME || undefined });

async function newPage(vp, theme) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, colorScheme: theme, deviceScaleFactor: 1, hasTouch: vp.w < 600 });
  await ctx.addInitScript((t) => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true, theme: t })); }, theme);
  const page = await ctx.newPage();
  const log = { console: [], exceptions: [], failed: [] };
  page.on('console', (m) => { if (m.type() === 'error' && !/^Failed to load resource/.test(m.text())) log.console.push(m.text().slice(0, 240)); });
  page.on('pageerror', (e) => log.exceptions.push(String(e.message || e).slice(0, 240)));
  page.on('requestfailed', (r) => { const f = r.failure()?.errorText || ''; if (!/ERR_ABORTED/.test(f)) log.failed.push(`${r.method()} ${r.url().replace(base, '/')} ${f}`); });
  page.on('response', (r) => { if (r.status() >= 400) log.failed.push(`${r.status()} ${r.url().replace(base, '/')}`); });
  return { ctx, page, log };
}
async function load(page, path) {
  await page.goto(base + '#' + path);
  let ready = true; try { await page.waitForSelector('body[data-ready="1"]', { timeout: 8000 }); } catch { ready = false; }
  let last = -1, stable = 0;
  for (let i = 0; i < 25 && stable < 3; i++) { await page.waitForTimeout(150); const n = await page.evaluate(() => (document.querySelector('main')?.innerText || '').length).catch(() => -1); stable = n === last ? stable + 1 : 0; last = n; }
  return ready;
}

/** In-page layout audit. Runs inside Chromium; returns plain data. */
function audit({ phone }) {
  const out = { overflow: null, emptyMain: false, h1: 0, small: [], clipped: [] };
  const vis = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[hidden],[inert]') && s.opacity !== '0'; };
  const sel = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : '');
  const label = (e) => ((e.getAttribute('aria-label') || e.textContent || e.value || e.getAttribute('title') || '').replace(/\s+/g, ' ').trim()).slice(0, 40);
  const de = document.documentElement; const iw = window.innerWidth;
  const inScroller = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true; } return false; }; // inside a scroller, or clipped by its parent (a decorative layer that bleeds past a clipping box does not make the page scroll; the scrollWidth test below still catches real overflow)
  const wide = [];
  for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); if (r.width && r.right > iw + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('svg') && !inScroller(e) && !/^(OPTION|SCRIPT|STYLE)$/.test(e.tagName)) { wide.push(sel(e) + ' right=' + Math.round(r.right)); if (wide.length >= 4) break; } }
  const sw = Math.max(de.scrollWidth, document.body.scrollWidth);
  if (sw > iw + 1 || wide.length) out.overflow = { scrollWidth: sw, innerWidth: iw, wide };
  const main = document.querySelector('main');
  out.emptyMain = !main || ((main.innerText || '').trim().length < 3 && !main.querySelector('svg,canvas,img,input,button,audio,video,select,textarea'));
  out.h1 = [...document.querySelectorAll('h1')].filter(vis).length;
  if (phone) {
    const seen = new Set();
    for (const e of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=switch],[role=checkbox],[role=radio],[role=menuitem],[tabindex]:not([tabindex="-1"])')) {
      if (!vis(e) || e.disabled || e.closest('svg')) continue;
      const lbl = e.labels && e.labels[0]; let r = e.getBoundingClientRect();
      if (lbl) { const lr = lbl.getBoundingClientRect(); if (lr.width * lr.height > r.width * r.height) r = lr; }
      // inline links inside running text are exempt from the target-size guidance
      if (e.tagName === 'A' && getComputedStyle(e).display === 'inline' && e.closest('p,li,dd,blockquote,figcaption')) continue;
      if (r.width < 44 || r.height < 44) { const k = sel(e) + Math.round(r.width) + 'x' + Math.round(r.height); if (seen.has(k)) continue; seen.add(k); out.small.push({ sel: sel(e), name: label(e), w: Math.round(r.width), h: Math.round(r.height) }); }
    }
    out.small = out.small.slice(0, 12);
  }
  const seenC = new Set();
  for (const e of document.querySelectorAll('main *, header *, nav *')) {
    if (!vis(e) || e.closest('svg') || !(e.textContent || '').trim()) continue;
    { const rr = e.getBoundingClientRect(); if (rr.width < 6 || rr.height < 6) continue; } // visually-hidden helpers
    const s = getComputedStyle(e); const ox = s.overflowX, oy = s.overflowY;
    const hiddenX = ox === 'hidden' || ox === 'clip', hiddenY = oy === 'hidden' || oy === 'clip';
    const ownText = [...e.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
    if (!ownText && !/^(BUTTON|A|LABEL|SPAN)$/.test(e.tagName)) continue;
    const xClip = hiddenX && e.scrollWidth > e.clientWidth + 2; const yClip = hiddenY && e.scrollHeight > e.clientHeight + 2 && s.display !== 'inline';
    if (xClip || yClip) { const k = sel(e) + (xClip ? 'x' : 'y'); if (seenC.has(k)) continue; seenC.add(k); out.clipped.push({ sel: sel(e), text: label(e), axis: (xClip ? 'x' : '') + (yClip ? 'y' : ''), ellipsis: s.textOverflow === 'ellipsis', scroll: [e.scrollWidth, e.clientWidth, e.scrollHeight, e.clientHeight] }); if (out.clipped.length >= 8) break; }
  }
  return out;
}

async function runAxe(page) {
  await page.evaluate(axeSource);
  return page.evaluate(async () => {
    const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, count: v.nodes.length, targets: v.nodes.slice(0, 3).map((n) => (Array.isArray(n.target) ? n.target.flat().join(' ') : String(n.target)).slice(0, 120)) }));
  });
}

const layout = []; const keyboard = []; const errors = [];
async function layoutTask(vp, theme, routes) {
  for (const r of routes) {
    const { ctx, page, log } = await newPage(vp, theme);
    try {
      let t = Date.now(); const ready = await load(page, r.path); T('load ' + r.path, t); t = Date.now();
      const a = await page.evaluate(audit, { phone: vp.w < 600 });
      T('audit', t); t = Date.now();
      const axeV = await runAxe(page).catch((e) => { errors.push(`axe failed on ${r.path}: ${e.message}`); return []; });
      T('axe', t);
      layout.push({ path: r.path, route: r.name, module: r.module, vp: vp.id, theme, ready, console: [...new Set(log.console)], exceptions: [...new Set(log.exceptions)], failed: [...new Set(log.failed)].slice(0, 8), axe: axeV, ...a });
    } catch (e) { errors.push(`${r.path} ${vp.id} ${theme}: ${e.message}`); }
    await ctx.close();
  }
}

/** Tab through the first N stops from the top of the document. */
async function keyboardTask(vp, routes) {
  for (const r of routes) {
    const { ctx, page } = await newPage(vp, 'light');
    try {
      await load(page, r.path);
      await page.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); window.scrollTo(0, 0); });
      const stops = [];
      for (let i = 0; i < kbStops; i++) {
        await page.keyboard.press('Tab'); await page.waitForTimeout(150); // let smooth scroll settle
        const s = await page.evaluate(() => {
          const a = document.activeElement; if (!a || a === document.body || a === document.documentElement) return null;
          const sig = () => { const c = getComputedStyle(a); return [c.outlineStyle, c.outlineWidth, c.outlineColor, c.boxShadow, c.borderColor, c.backgroundColor, c.color, c.textDecorationLine, c.filter].join('|'); };
          const withFocus = sig();
          // focus-visible match, plus an outline that actually paints, are the strongest cheap proof
          const c = getComputedStyle(a); const ow = parseFloat(c.outlineWidth) || 0;
          const outline = c.outlineStyle !== 'none' && ow >= 1 && c.outlineColor !== 'rgba(0, 0, 0, 0)';
          const shadow = !!c.boxShadow && c.boxShadow !== 'none';
          // compare with the unfocused look of the same element
          a.blur(); const without = sig(); a.focus();
          const changed = withFocus !== without;
          let host = a; let wrapChanged = false;
          if (!changed && !outline) { // a focus ring drawn on a wrapper (label, :focus-within) counts
            const p = a.closest('label,[class]'); if (p && p !== a) { const pc = getComputedStyle(p); wrapChanged = p.matches(':focus-within') && (pc.outlineStyle !== 'none' || (pc.boxShadow && pc.boxShadow !== 'none')); }
          }
          const r = a.getBoundingClientRect(); const st = getComputedStyle(a);
          const clipHidden = r.width < 2 || r.height < 2 || st.visibility === 'hidden' || st.opacity === '0' || !!a.closest('[hidden],[inert],[aria-hidden="true"]');
          const inView = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
          const name = (a.getAttribute('aria-label') || (a.labels && [...a.labels].map((l) => l.textContent).join(' ')) || a.textContent || a.value || a.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
          return { tag: a.tagName.toLowerCase(), id: a.id, name, outline, shadow, changed, wrapChanged, clipHidden, inView, inMain: !!a.closest('main'), ti: a.getAttribute('tabindex'), type: a.type || '', pos: Math.round(r.left) + ',' + Math.round(r.top + scrollY) };
        });
        if (!s) { stops.push({ lost: true }); break; }
        stops.push(s);
      }
      const real = stops.filter((s) => !s.lost);
      const key = (s) => `${s.tag}#${s.id}|${s.name}|${s.pos}`;
      const noRing = real.filter((s) => !(s.outline || s.shadow || s.changed || s.wrapChanged)).map((s) => `${s.tag}${s.id ? '#' + s.id : ''} "${s.name}"`);
      const hidden = real.filter((s) => s.clipHidden).map((s) => `${s.tag}${s.id ? '#' + s.id : ''} "${s.name}"`);
      const offscreen = real.filter((s) => !s.inView && !s.clipHidden).map((s) => `${s.tag}${s.id ? '#' + s.id : ''} "${s.name}"`);
      let trap = false; for (let i = 2; i < real.length; i++) if (!/^(time|date|datetime-local|month|week)$/.test(real[i].type) /* segmented fields keep focus */ && key(real[i]) === key(real[i - 1]) && key(real[i]) === key(real[i - 2])) trap = true;
      const posTabindex = real.filter((s) => s.ti && +s.ti > 0).length;
      keyboard.push({ path: r.path, route: r.name, module: r.module, vp: vp.id, stops: real.length, lostAt: stops.findIndex((s) => s.lost), mainStops: real.filter((s) => s.inMain).length, noRing, hidden, offscreen, trap, posTabindex, order: real.slice(0, 8).map((s) => `${s.tag}:${s.name.slice(0, 16)}`) });
    } catch (e) { errors.push(`kb ${r.path} ${vp.id}: ${e.message}`); }
    await ctx.close();
  }
}

// ---- run, with a small worker pool over (config, route-chunk) jobs
const t0 = Date.now(); const T = (l, t) => { if (process.env.SWEEP_TIMING) console.error(l, Date.now() - t); };
// split big jobs into route chunks so the pool stays busy
const chunked = []; const CH = 12;
for (const vp of VIEWPORTS) for (const th of THEMES) for (let i = 0; i < ALL.length; i += CH) chunked.push(() => layoutTask(vp, th, ALL.slice(i, i + CH)));
for (const vp of VIEWPORTS.filter((v) => v.id !== '320')) for (let i = 0; i < ALL.length; i += CH) chunked.push(() => keyboardTask(vp, ALL.slice(i, i + CH)));
let next = 0; await Promise.all(Array.from({ length: conc }, async () => { while (next < chunked.length) { const j = chunked[next++]; await j(); process.stderr.write('.'); } }));
await browser.close(); server.close();

// ---- findings
const ownerOf = (module) => (module ? 'src/' + resolve('/x/src/shell', module).replace('/x/src/', '') : 'src/app.js or assets/css/app.css (shared)');
const SEV = { exception: 5, console: 4, failed: 3, 'focus-hidden': 5, 'focus-trap': 5, 'no-h1': 4, 'empty-main': 5, overflow: 4, 'no-focus-ring': 4, 'axe-critical': 5, 'axe-serious': 4, 'axe-moderate': 2, 'axe-minor': 1, 'touch-target': 3, clipped: 3, 'focus-offscreen': 2, 'not-ready': 5 };
const FIX = {
  exception: 'Find the throwing line (stack in console), guard the undefined access, add a test that mounts the view with empty storage.',
  console: 'Fix the cause of the logged error or downgrade expected conditions to non-error logging.',
  failed: 'Add the missing file, correct the path, or stop requesting it; precache and the service worker should not list files that 404.',
  'no-h1': 'Render one visible h1 (the view title) per route; keep #view-title for focus management.',
  'empty-main': 'Render at least a heading and a message in main when data is missing or still loading.',
  overflow: 'Constrain the widest element (max-inline-size:100%, overflow-wrap:anywhere, flex-wrap:wrap or a scroll wrapper).',
  'no-focus-ring': 'Add a :focus-visible outline of at least 2px with 3:1 contrast, and do not set outline:none without a replacement.',
  'focus-hidden': 'Keep tabbable controls visible or remove them from the tab order (hidden, inert, tabindex=-1).',
  'focus-offscreen': 'Scroll the focused control into view or remove it from the tab order while collapsed.',
  'focus-trap': 'Make sure Tab moves on; check key handlers that call preventDefault on Tab.',
  'touch-target': 'Give the control at least 44x44 CSS px of hit area (min-block-size and min-inline-size, or padding).',
  clipped: 'Allow wrapping (overflow-wrap:anywhere, white-space:normal) or remove overflow:hidden; do not truncate learner-facing text.',
  'not-ready': 'The app never set body[data-ready]; check the router boot and the view import for errors.',
};
const items = new Map(); // key -> finding
function add(type, issueKey, path, route, module, vp, theme, evidence, extra = {}) {
  const k = type + '|' + issueKey;
  let f = items.get(k); if (!f) { f = { type, issue: issueKey, severity: SEV[type] ?? 2, routes: new Set(), configs: new Set(), evidence: [], modules: new Set(), fix: FIX[type.startsWith('axe') ? 'x' : type] || '', ...extra }; items.set(k, f); }
  f.routes.add(path); f.configs.add(`${vp}/${theme}`); if (module) f.modules.add(module);
  if (f.evidence.length < 3 && evidence && !f.evidence.some((e) => e.startsWith(path + ' '))) f.evidence.push(`${path} @${vp}/${theme}: ${evidence}`);
}
for (const l of layout) {
  const A = (t, key, ev, x) => add(t, key, l.path, l.route, l.module, l.vp, l.theme, ev, x);
  if (!l.ready) A('not-ready', 'body[data-ready] never set', 'timeout 8s');
  for (const e of l.exceptions) A('exception', e.replace(/\d+/g, 'N').slice(0, 100), e);
  for (const e of l.console) A('console', e.replace(/\d+/g, 'N').slice(0, 100), e);
  for (const e of l.failed) A('failed', e.replace(/^(\S+) (\S+?)(\?.*)?( .*)?$/, '$1 $2'), e);
  if (l.emptyMain) A('empty-main', 'main has no content', 'innerText under 3 chars');
  if (!l.h1) A('no-h1', 'no visible h1', 'document has 0 visible h1');
  if (l.overflow && l.vp !== '1280') A('overflow', `horizontal overflow at ${l.vp}px`, `scrollWidth ${l.overflow.scrollWidth} > ${l.overflow.innerWidth}; ${l.overflow.wide.join(', ')}`);
  else if (l.overflow) A('overflow', 'horizontal overflow at desktop width', `scrollWidth ${l.overflow.scrollWidth} > ${l.overflow.innerWidth}; ${l.overflow.wide.join(', ')}`);
  for (const s of l.small) A('touch-target', `${s.sel} under 44px`, `"${s.name}" ${s.w}x${s.h}`);
  for (const c of l.clipped) A('clipped', `${c.sel} clips text (${c.axis})`, `"${c.text}" scroll/client ${c.scroll.join('/')}${c.ellipsis ? ' ellipsis' : ''}`);
  for (const v of l.axe) A('axe-' + (v.impact || 'minor'), `${v.id}`, `${v.help}; ${v.count} node(s); ${v.targets[0] || ''}`, { help: v.help });
}
for (const k of keyboard) {
  const A = (t, key, ev) => add(t, key, k.path, k.route, k.module, k.vp, 'light', ev);
  if (k.noRing.length) A('no-focus-ring', `no visible focus change: ${k.noRing[0].replace(/ ".*"/, '')}`, k.noRing.slice(0, 3).join('; '));
  if (k.hidden.length) A('focus-hidden', 'focus lands on an invisible element', k.hidden.slice(0, 3).join('; '));
  if (k.offscreen.length) A('focus-offscreen', 'focused control is outside the viewport', k.offscreen.slice(0, 3).join('; '));
  if (k.trap) A('focus-trap', 'same element holds focus for 3 Tabs', 'repeat stop');
  if (k.mainStops === 0) A('focus-hidden', 'no tab stop inside main in the first stops', `${k.stops} stops, none in main`);
}
const total = Math.max(1, ALL.length);
const findings = [...items.values()].map((f) => {
  const routes = [...f.routes]; const shared = routes.length >= 6 || routes.length / total >= 0.4;
  const owner = shared ? 'shared: src/app.js, assets/css/app.css or src/shell/ui.js' : [...f.modules].map((m) => ownerOf(m)).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'unknown';
  return { severity: f.severity, type: f.type, issue: f.issue, routeCount: routes.length, routes: routes.slice(0, 12), configs: [...f.configs].sort(), evidence: f.evidence, fix: f.fix || (f.help ? 'axe: ' + f.help : ''), owner, score: f.severity * 10 + Math.min(routes.length, 30) + Math.min(f.configs.size, 6) / 2 };
}).sort((a, b) => b.score - a.score);
const counts = {}; for (const f of findings) counts[f.type] = (counts[f.type] || 0) + 1;
const summary = { generated: new Date().toISOString().slice(0, 10), emulation: 'headless Chromium via Playwright; no real device, finger, stylus or screen reader', quick, routes: ALL.map((r) => r.path), viewports: VIEWPORTS.map((v) => v.id), themes: THEMES, layoutPages: layout.length, keyboardPages: keyboard.length, keyboardStops: kbStops, seconds: Math.round((Date.now() - t0) / 1000), toolErrors: errors, findingCount: findings.length, byType: counts };
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'sweep.json'), JSON.stringify({ summary, findings, layout, keyboard }, null, 1));

if (!args.includes('--no-md')) {
  const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const L = [];
  L.push('# Route sweep findings', '');
  L.push(`Generated ${summary.generated} by \`node tools/qa/sweep.mjs${quick ? ' --quick' : ''}\`. Raw data: \`sweep.json\` in this folder.`, '');
  L.push('**This is emulation.** Headless Chromium through Playwright with fixed viewports and axe-core. No real phone, finger, stylus or screen reader was used, and nothing here says how the app sounds in VoiceOver, TalkBack or NVDA. Treat findings as leads to confirm on a device.', '');
  L.push('## What was swept', '');
  L.push(`- ${ALL.length} routes from \`src/shell/router.js\` (sample value for each path parameter), ${layout.length} page loads at ${VIEWPORTS.map((v) => v.id).join(', ')} px, themes ${THEMES.join(' and ')} (settings.theme).`);
  L.push(`- Per page: console errors, uncaught exceptions, failed requests (network failure or HTTP 400+), axe (WCAG 2 A/AA, 2.1, 2.2 AA tags), horizontal overflow, empty main, missing h1, touch targets under 44 px (phone widths), clipped text.`);
  L.push(`- Keyboard: first ${kbStops} Tab stops per route at 390 and 1280 px, light; checks for a visible focus change, focus on invisible or off-screen controls, and focus traps. "Visible focus" is a computed-style comparison with and without focus, not a look at pixels.`);
  L.push(`- Clean run on ${layout.length} pages took ${summary.seconds} s.${errors.length ? ` Tool errors: ${errors.length} (see sweep.json summary).` : ''}`, '');
  L.push('Limits: the sample ids may land on a "not found" card for a few routes; a fresh onboarded profile with no progress was used, so states that need progress are not covered; hover, drag and audio paths are not exercised; contrast is axe on the rendered page only.', '');
  L.push('## Counts by type', '', Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t, n]) => `- ${t}: ${n}`).join('\n') || '- none', '');
  L.push('## Ranked findings', '', 'Rank = severity first, then how many routes and configurations are affected. "shared" owner means it appears on at least 6 routes (or 40 percent), so the fix probably belongs in common code or CSS.', '');
  L.push('| # | Sev | Route(s) | Issue | Evidence | Suggested fix | Owner |', '|---|---|---|---|---|---|---|');
  findings.slice(0, 80).forEach((f, i) => L.push(`| ${i + 1} | ${f.severity} | ${esc(f.routes.slice(0, 4).join(' ') + (f.routeCount > 4 ? ` (+${f.routeCount - 4})` : ''))} | ${esc(f.type + ': ' + f.issue)} | ${esc(f.evidence[0] || '')} | ${esc(f.fix)} | ${esc(f.owner)} |`));
  if (findings.length > 80) L.push('', `${findings.length - 80} lower-ranked findings are in sweep.json only.`);
  L.push('', '## How to rerun', '', '```', 'node tools/qa/sweep.mjs            # full sweep, writes docs/qa/sweep.json and SWEEP.md', 'node tools/qa/sweep.mjs --quick     # 3 routes, 390 px light, 12 Tab stops', 'node tools/qa/sweep.mjs --routes /,/typing --out /tmp/x --no-md', '```', '');
  writeFileSync(join(outDir, 'SWEEP.md'), L.join('\n'));
}
console.log(`\nsweep: ${ALL.length} routes, ${layout.length} layout pages, ${keyboard.length} keyboard pages, ${findings.length} findings, ${summary.seconds}s${errors.length ? `, ${errors.length} tool errors` : ''}`);
for (const f of findings.slice(0, 8)) console.log(` [${f.severity}] ${f.type}: ${f.issue} (${f.routeCount} routes)`);
