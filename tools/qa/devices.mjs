// Device-profile walk (prong P074). Playwright device emulation in headless Chromium: viewport, device pixel ratio, touch and user agent only.
// This is NOT a real device. No real screen, finger, Safari or Android Chrome is involved; here even the iPhone/iPad profiles run in
// Chromium because WebKit is not installed, so Safari-only rendering bugs cannot show up. Treat every row as "what Chromium does at that size".
// Usage: node tools/qa/devices.mjs [--out docs/qa] [--quick] [--profiles "iPhone SE,Pixel 7"] [--routes /,/learn] [--schemes light,dark] [--diff <previous results.json>]
//   --quick  2 profile/scheme combos (iPhone SE light, Pixel 7 dark) x 4 routes; used by tests/qa.devices.test.js
// Writes <out>/DEVICES.md (results table), <out>/shots-devices/<profile>-<scheme>-<route>.jpg (jpeg q40, CSS-pixel scale) and <out>/shots-devices/results.json.
// Exit 1 when a page/console error occurred or a view never became ready; layout findings (overflow, tap targets, tiny text, RTL, fixed bar) are reported, not fatal.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
let pw;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { pw = require(p); break; } catch { /* next */ } }
if (!pw) { console.error('playwright not found'); process.exit(2); }
const { chromium, devices } = pw;

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const quick = args.includes('--quick');
const outDir = resolve(root, arg('--out', 'docs/qa')); const shotDir = join(outDir, 'shots-devices'); mkdirSync(shotDir, { recursive: true });
const executablePath = process.env.QA_CHROME || undefined;

const PROFILES = ['iPhone SE', 'iPhone 14 Pro', 'Pixel 7', 'Galaxy S9+', 'iPad Mini'];
const ROUTES = ['/', '/learn', '/letters/alef', '/firstday', '/placement', '/sprint', '/service', '/read/bless-priestly-1', '/calendar', '/settings',
  // newly wired routes (stage 5)
  '/speak', '/offline', '/reminders', '/install', '/vocab/themes', '/welcome', '/firstday/ladder', '/progress'];
const QUICK_ROUTES = ['/', '/learn', '/letters/alef', '/read/bless-priestly-1'];
const QUICK_COMBOS = [['iPhone SE', 'light'], ['Pixel 7', 'dark']];

const profiles = (arg('--profiles') ? arg('--profiles').split(',').map((s) => s.trim()) : PROFILES).filter((n) => { if (!devices[n]) { console.error('unknown device profile: ' + n); return false; } return true; });
const routes = arg('--routes') ? arg('--routes').split(',') : quick ? QUICK_ROUTES : ROUTES;
const schemes = arg('--schemes', 'light,dark').split(',');
const combos = quick ? QUICK_COMBOS : profiles.flatMap((p) => schemes.map((s) => [p, s]));
const slug = (s) => s.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'home';

// ---- map a CSS selector back to the file that declares it (assets/css/*.css or a <style> string inside src/**/*.js)
const cssSources = [];
(function collect(dir, re) { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) collect(p, re); else if (re.test(f)) cssSources.push({ file: relative(root, p), text: readFileSync(p, 'utf8') }); } })(join(root, 'assets/css'), /\.css$/);
(function collect(dir, re) { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) collect(p, re); else if (re.test(f)) cssSources.push({ file: relative(root, p), text: readFileSync(p, 'utf8') }); } })(join(root, 'src'), /\.js$/);
const fileCache = new Map();
function fileFor(selectorText) {
  if (!selectorText) return [];
  if (fileCache.has(selectorText)) return fileCache.get(selectorText);
  const find = (needle) => cssSources.filter((s) => s.text.includes(needle + ' {') || s.text.includes(needle + '{')).map((s) => s.file);
  let hits = find(selectorText.trim());
  if (!hits.length) hits = find(selectorText.split(',')[0].trim());
  if (!hits.length) { const first = selectorText.split(/[\s>+~:,]/)[0]; if (first.length > 2) hits = find(first); }
  const r = hits.slice(0, 2); fileCache.set(selectorText, r); return r;
}

// ---- in-page audit: runs inside the emulated page
function audit() {
  const de = document.documentElement; const cw = de.clientWidth;
  const out = { overflow: null, small: [], tinyText: [], rtl: [], fixedCover: null, innerWidth: window.innerWidth, clientWidth: cw, scrollWidth: Math.max(de.scrollWidth, document.body.scrollWidth) };
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const mainEl = document.getElementById('main'); const isShell = (e) => !(mainEl && mainEl.contains(e));
  const selOf = (e) => { const parts = []; let n = e; for (let i = 0; n && n !== document.body && i < 4; n = n.parentElement, i++) { let s = n.tagName.toLowerCase(); if (n.id) { parts.unshift(s + '#' + n.id); break; } const cls = typeof n.className === 'string' ? n.className.trim().split(/\s+/).filter((c) => c && !/^(is-|has-)/.test(c)).slice(0, 2) : []; if (cls.length) s += '.' + cls.join('.'); else { const sib = [...(n.parentElement?.children || [])].filter((c) => c.tagName === n.tagName); if (sib.length > 1) s += `:nth-of-type(${sib.indexOf(n) + 1})`; } parts.unshift(s); } return parts.join(' > '); };
  const sheetName = (sh) => { if (sh.href) return sh.href.replace(location.origin + '/', ''); const o = sh.ownerNode; if (!o) return '?'; if (o.id) return '<style#' + o.id + '>'; const host = o.closest('main') ? 'main' : o.parentElement?.tagName.toLowerCase() || '?'; return '<style in ' + host + '>'; };
  // which stylesheet rule(s) set `props` on this element: the last matching rules in cascade order, up to 3
  const rulesFor = (e, props) => { const hits = []; for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; } const walk = (list) => { for (const r of list) { if (r.cssRules && r.media) { if (matchMedia(r.media.mediaText).matches) walk(r.cssRules); continue; } if (r.cssRules && !r.selectorText) { walk(r.cssRules); continue; } if (!r.selectorText || !r.style) continue; let m = false; try { m = e.matches(r.selectorText); } catch { /* unsupported selector */ } if (!m) continue; const set = props.filter((p) => r.style.getPropertyValue(p)); if (set.length) hits.push(`${r.selectorText} {${set.map((p) => p + ':' + r.style.getPropertyValue(p)).join(';')}} @ ${sheetName(sh)}`); } }; walk(rules); } return hits.slice(-3); };
  const inScroller = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll') return true; } return false; };
  // 1. horizontal overflow of the page itself (scrollWidth > clientWidth) plus the boxes that poke out, even when main{overflow-x:clip} hides them
  const wide = [];
  for (const e of document.querySelectorAll('body *')) { if (e.closest('svg') && e.tagName !== 'svg') continue; const r = e.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && (r.right > cw + 1 || r.left < -1) && !inScroller(e) && getComputedStyle(e).position !== 'fixed' && !e.closest('.visually-hidden, .skip-link') && !e.classList.contains('visually-hidden')) { wide.push({ sel: selOf(e), shell: isShell(e), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), rules: rulesFor(e, ['width', 'min-width', 'inline-size', 'min-inline-size', 'grid-template-columns', 'white-space', 'padding', 'margin']) }); if (wide.length >= 6) break; } }
  if (out.scrollWidth > cw || wide.length) out.overflow = { scrollWidth: out.scrollWidth, clientWidth: cw, pageScrolls: out.scrollWidth > cw, wide };
  // 2. tap targets under 44 CSS px (inline links inside running text are exempt, as in walk.mjs; a checkbox/radio counts its label box)
  const nameOf = (e) => (e.getAttribute('aria-label') || (e.labels && e.labels[0]?.textContent) || e.textContent || e.getAttribute('title') || e.getAttribute('placeholder') || e.value || '').trim().replace(/\s+/g, ' ').slice(0, 24);
  const interactive = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=tab], [role=checkbox], [role=radio], [role=switch]')].filter(vis);
  for (const e of interactive) {
    let r = e.getBoundingClientRect();
    if (e.tagName === 'INPUT' && ['checkbox', 'radio'].includes(e.type) && e.labels && e.labels[0]) r = e.labels[0].getBoundingClientRect();
    const inline = e.tagName === 'A' && e.closest('p, li, dd, td, figcaption') && getComputedStyle(e).display === 'inline';
    if ((r.width < 44 || r.height < 44) && !inline && !e.closest('.skip-link, .visually-hidden')) out.small.push({ sel: selOf(e), shell: isShell(e), name: nameOf(e), w: Math.round(r.width), h: Math.round(r.height), rules: rulesFor(e, ['min-block-size', 'min-height', 'block-size', 'height', 'min-inline-size', 'min-width', 'inline-size', 'width', 'padding', 'padding-block', 'padding-inline', 'font-size']) });
  }
  // 3. text under 12 CSS px: every element that owns a visible text node
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const seenEl = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue; const p = n.parentElement; if (!p || seenEl.has(p) || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE'].includes(p.tagName) || p.closest('.visually-hidden') || !vis(p)) continue; seenEl.add(p);
    const fs = parseFloat(getComputedStyle(p).fontSize);
    if (fs < 12) {
      // the own rule plus the ancestors whose font-size it inherits or scales from (em/rem chains), nearest first
      const chain = rulesFor(p, ['font-size', 'font']);
      if (/^(SMALL|SUB|SUP)$/.test(p.tagName) && !chain.length) chain.push(`${p.tagName.toLowerCase()} {font-size:smaller} @ browser default`);
      for (let a = p.parentElement, i = 0; a && a !== document.body && i < 4; a = a.parentElement, i++) { const r = rulesFor(a, ['font-size', 'font']); if (r.length) { chain.push(...r.map((x) => 'from ' + selOf(a).split(' > ').pop() + ': ' + x)); if (chain.length >= 4) break; } }
      out.tinyText.push({ sel: selOf(p), shell: isShell(p), px: Math.round(fs * 10) / 10, text: n.nodeValue.trim().slice(0, 30), rules: chain.slice(0, 4) });
    }
  }
  // 3b. words broken in the middle (overflow-wrap: anywhere / word-break in narrow cells): a single word laid out on two lines
  out.wordSplit = [];
  { const tw = document.createTreeWalker(mainEl || document.body, NodeFilter.SHOW_TEXT); const seenW = new Set();
    for (let n = tw.nextNode(); n; n = tw.nextNode()) { const p = n.parentElement; if (!p || seenW.has(p) || !vis(p) || p.closest('svg, .visually-hidden') || p.getBoundingClientRect().width > 240) continue;
      const re = /[A-Za-z\u0590-\u05FF][A-Za-z\u0590-\u05FF'’]{3,}/g; let m; while ((m = re.exec(n.nodeValue))) { const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length); const rs = [...rg.getClientRects()].filter((r) => r.width > 0); if (rs.length > 1 && Math.abs(rs[0].top - rs[rs.length - 1].top) > 2) { seenW.add(p); out.wordSplit.push({ sel: selOf(p), shell: isShell(p), word: m[0], boxWidth: Math.round(p.getBoundingClientRect().width), rules: rulesFor(p, ['overflow-wrap', 'word-break', 'hyphens', 'font-size', 'inline-size', 'width']) }); break; } } } }
  // 4. RTL checks (stage 3): mixed Hebrew/Latin runs that wrap mid-word and niqqud that gets clipped by its own line box
  const he = /[֐-׿]/; const niqqud = /[֑-ׇ]/;
  const seenRtl = new Set();
  for (const p of document.querySelectorAll('main *')) {
    if (seenRtl.has(p) || !vis(p) || p.closest('svg') || p.children.length > 6) continue;
    const own = [...p.childNodes].filter((c) => c.nodeType === 3 && c.nodeValue.trim()).map((c) => c.nodeValue).join(' ');
    if (!he.test(own)) continue;
    seenRtl.add(p);
    const cs = getComputedStyle(p); const pr = p.getBoundingClientRect(); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
    // 4a. mixed-script line wrap: a text node with Hebrew and Latin letters laid out on more than one line in a block whose direction is not isolated
    const latin = /[A-Za-z]{2,}/.test(own);
    if (latin && pr.width > 0) {
      const range = document.createRange(); range.selectNodeContents(p); const rects = [...range.getClientRects()].filter((r) => r.width > 0);
      const lines = new Set(rects.map((r) => Math.round(r.top / Math.max(4, lh / 2))));
      const isolated = cs.unicodeBidi.includes('isolate') || cs.unicodeBidi === 'plaintext' || p.closest('bdi, [dir]') !== null;
      const mixedWordBreak = rects.some((r) => r.width < lh * 0.9 && r.height > 0); // a fragment narrower than one glyph line = a word split at a script boundary
      if (lines.size > 1 && (!isolated || mixedWordBreak)) out.rtl.push({ kind: 'mixed-wrap', sel: selOf(p), lines: lines.size, isolated, dir: cs.direction, text: own.trim().replace(/\s+/g, ' ').slice(0, 40) });
    }
    // 4b. niqqud clipping: pointed Hebrew with overflow hidden/clip on the element or a tight parent, or line-height so small the marks fall outside the line box
    if (niqqud.test(own)) {
      const fs = parseFloat(cs.fontSize);
      let clipper = null; for (let a = p; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a); if ((o.overflow === 'hidden' || o.overflowY === 'hidden' || o.overflow === 'clip' || o.overflowY === 'clip') && a.getBoundingClientRect().height < pr.height + 2) { clipper = a; break; } }
      const tight = lh / fs < 1.15;
      if (clipper || tight) out.rtl.push({ kind: 'niqqud-clip', sel: selOf(p), px: Math.round(fs * 10) / 10, lineHeight: Math.round(lh * 10) / 10, clipper: clipper ? selOf(clipper) : null, text: own.trim().slice(0, 24), rules: rulesFor(p, ['line-height', 'font-size', 'overflow']) });
    }
  }
  // 5. a position:fixed bar (the phone bottom nav) must not cover the end of the content once the page is scrolled to the bottom
  const main = mainEl;
  { const fixed = [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).position === 'fixed' && vis(e));
    if (fixed.length && main) { const y0 = scrollY; scrollTo(0, de.scrollHeight); const mb = main.getBoundingClientRect().bottom; for (const f of fixed) { const fr = f.getBoundingClientRect(); if (fr.top < mb - 1 && fr.bottom > mb && fr.width > cw / 2) { out.fixedCover = { sel: selOf(f), coversPx: Math.round(mb - fr.top), barHeight: Math.round(fr.height), bodyPadBottom: getComputedStyle(document.body).paddingBottom, rules: rulesFor(document.body, ['padding-block-end', 'padding-bottom', 'padding']) }; break; } } scrollTo(0, y0); } }
  out.heading = main?.querySelector('h1')?.textContent?.trim() || ''; out.textLength = main?.innerText.length || 0; out.unavailable = !!main?.querySelector('.alef-unavailable');
  return out;
}

const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ executablePath });
const seedIds = Array.from({ length: 24 }, (_, i) => 'r' + String(i + 1).padStart(2, '0'));
const seedScript = ({ ids }) => { if (!localStorage.getItem('alef:settings')) { localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true, veilOptOut: true })); localStorage.setItem('alef:curriculum.progress', JSON.stringify({ completed: Object.fromEntries(ids.map((i) => [i, Date.now()])) })); } };

const result = { when: new Date().toISOString(), chromium: browser.version(), engineNote: 'all profiles emulated in Chromium (WebKit not installed); iPhone/iPad rows are not Safari', quick, profiles: {}, routes, visits: [] };
for (const [name] of combos) { const d = devices[name]; result.profiles[name] = { viewport: d.viewport, dpr: d.deviceScaleFactor, touch: !!d.hasTouch, isMobile: !!d.isMobile, nativeEngine: d.defaultBrowserType, ua: d.userAgent }; }
let hard = 0;
const t0 = Date.now();
for (const [name, scheme] of combos) {
  const d = devices[name];
  const ctx = await browser.newContext({ ...d, colorScheme: scheme, reducedMotion: 'reduce' });
  await ctx.addInitScript(seedScript, { ids: seedIds });
  for (const route of routes) {
    const page = await ctx.newPage(); const errors = [], consoleErrors = [], failed = [];
    page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().split('\n')[0]); });
    page.on('requestfailed', (q) => failed.push('FAILED ' + new URL(q.url()).pathname));
    page.on('response', (res) => { if (res.status() >= 400) failed.push(res.status() + ' ' + new URL(res.url()).pathname); });
    let ready = true;
    await page.goto(base + '#' + route, { waitUntil: 'load' });
    try { await page.waitForSelector('body[data-ready="1"]', { timeout: 8000 }); } catch { ready = false; }
    await page.waitForTimeout(400);
    const a = await page.evaluate(audit);
    const shot = `${slug(name)}-${scheme}-${slug(route)}.jpg`;
    const sh = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({ path: join(shotDir, shot), type: 'jpeg', quality: 40, scale: 'css', ...(sh > 3000 ? { clip: { x: 0, y: 0, width: d.viewport.width, height: 3000 }, fullPage: true } : { fullPage: true }) }).catch((e) => errors.push('screenshot: ' + e.message.split('\n')[0]));
    await page.close();
    for (const list of [a.overflow?.wide || [], a.small, a.tinyText, a.wordSplit, a.rtl, a.fixedCover ? [a.fixedCover] : []]) for (const it of list) if (it.rules) it.files = [...new Set(it.rules.filter((r) => !/@ browser default$/.test(r)).flatMap((r) => fileFor(r.replace(/^from [^:]+: /, '').split(' {')[0])))].join(', ');
    const realErrors = consoleErrors.filter((c) => !/Failed to load resource/.test(c));
    if (!ready || errors.length || realErrors.length) hard++;
    result.visits.push({ profile: name, scheme, route, ready, errors, consoleErrors, failedRequests: failed, shot, ...a });
    process.stdout.write(`${name} ${scheme} ${route}: ${ready ? 'ready' : 'NOT READY'}${a.overflow ? ` overflow(${a.overflow.scrollWidth}>${a.overflow.clientWidth}${a.overflow.pageScrolls ? '' : ', clipped only'})` : ''} small=${a.small.length} tiny=${a.tinyText.length} rtl=${a.rtl.length} wordsplit=${a.wordSplit.length}${a.fixedCover ? ' NAV-COVERS-' + a.fixedCover.coversPx + 'px' : ''}${errors.length || realErrors.length ? ' ERRORS' : ''}\n`);
  }
  await ctx.close();
}
await browser.close(); server.close();
result.seconds = Math.round((Date.now() - t0) / 1000); result.hardFailures = hard;

// ---- diff against a previous run (stage 4)
const keyOf = (v, kind, it) => `${v.profile}|${v.scheme}|${v.route}|${kind}|${it.sel}`;
const issueKeys = (res) => { const m = new Map(); for (const v of res.visits) { for (const it of v.overflow?.wide || []) m.set(keyOf(v, 'overflow', it), it); if (v.overflow?.pageScrolls) m.set(`${v.profile}|${v.scheme}|${v.route}|page-scrolls|html`, v.overflow); if (v.fixedCover) m.set(keyOf(v, 'fixed-cover', v.fixedCover), v.fixedCover); for (const it of v.small) m.set(keyOf(v, 'tap', it), it); for (const it of v.tinyText) m.set(keyOf(v, 'tiny', it), it); for (const it of v.wordSplit || []) m.set(keyOf(v, 'word-split', it), it); for (const it of v.rtl || []) m.set(keyOf(v, it.kind, it), it); } return m; };
let diff = null;
if (arg('--diff')) {
  try { const prev = JSON.parse(readFileSync(resolve(root, arg('--diff')), 'utf8')); const a = issueKeys(prev), b = issueKeys(result);
    diff = { prevWhen: prev.when, fixed: [...a.keys()].filter((k) => !b.has(k)), added: [...b.keys()].filter((k) => !a.has(k)), prevCount: a.size, nowCount: b.size }; } catch (e) { console.error('diff failed: ' + e.message); }
}

// ---- DEVICES.md
const n = (x) => (x ? String(x) : '-');
const byRP = new Map(); for (const v of result.visits) { const k = v.route + '|' + v.profile; if (!byRP.has(k)) byRP.set(k, {}); byRP.get(k)[v.scheme] = v; }
const cell = (v, f) => (v ? f(v) : '·');
const md = [];
md.push('# Device-profile walk (P074)', '', `Run: ${result.when} · Chromium ${result.chromium} · ${result.visits.length} page visits in ${result.seconds}s${quick ? ' · QUICK run (subset)' : ''}`, '');
md.push('## What this is, and is not', '',
  'This is Playwright **device emulation** in headless Chromium: each profile sets the viewport, device pixel ratio, touch events and user-agent string of the named phone or tablet. It is **not a real device**. Nobody held a phone; no finger tapped anything; there is no real GPU, no real font fallback, no OS keyboard, no notch, no browser chrome eating the viewport, no network throttling. In this environment WebKit is not installed, so the iPhone SE, iPhone 14 Pro and iPad Mini rows ran in Chromium too and say nothing about Safari (iOS Safari bugs with `100vh`, `env(safe-area-inset-*)`, `position: fixed`, font synthesis or niqqud placement cannot appear here). What the table can tell you is what Chromium does at those exact CSS widths and pixel densities. A real-device pass (BrowserStack, a borrowed phone, or Safari Technology Preview\'s responsive mode) is still owed before any claim that the app "works on iPhone".', '',
  'Checks per route and profile: (1) **overflow**: `document.scrollWidth > clientWidth`, plus any box whose right edge passes the viewport even when `main { overflow-x: clip }` hides it ("clipped only"); (2) **tap**: interactive controls with a box under 44 x 44 CSS px (inline links inside running text are exempt, a checkbox or radio is measured by its label); (3) **tiny**: elements with visible text whose computed `font-size` is under 12 CSS px; (3b) **word split**: a single word (4+ letters, Latin or Hebrew) inside a box narrower than 240 px that is laid out across two lines, i.e. broken mid-word by `overflow-wrap`/`word-break`; (4) **RTL**: Hebrew text nodes that also contain Latin and wrap across lines without bidi isolation or with a fragment narrower than one glyph (a word split at the script boundary), and pointed Hebrew (niqqud) whose line box is tighter than 1.15 x font-size or sits inside an `overflow: hidden/clip` ancestor no taller than itself; (5) **nav covers**: with the page scrolled to its end, how many px of `main` sit under a `position: fixed` bar (the phone bottom nav); (6) **errors**: page errors and console errors (resource-load failures are listed but not counted). Every visit also records whether the view reached `body[data-ready="1"]`. localStorage is seeded as onboarded with 24 lessons complete, so routes show their normal state rather than the welcome screen. Screenshots are full-page (capped at 3000 CSS px), JPEG quality 40, at CSS-pixel scale (1x), so they show layout, not the device\'s pixel density. In a full-page capture the fixed bottom nav is painted once at the height of the first viewport, so it appears to float mid-page; that is a screenshot artifact, not a layout bug.', '');
md.push('## Profiles', '', '| Profile | CSS viewport | DPR | Touch | Native engine (not used here) |', '|---|---|---|---|---|');
for (const [name, p] of Object.entries(result.profiles)) md.push(`| ${name} | ${p.viewport.width} x ${p.viewport.height} | ${p.dpr} | ${p.touch ? 'yes' : 'no'} | ${p.nativeEngine} |`);
md.push('', '## Results', '', 'Each cell is light / dark. Counts are distinct flagged elements on that page. "ovf" is the page scrollWidth minus clientWidth in px (0 = none); "(clip)" means boxes poke out but `main` clips them so the page itself does not scroll sideways. Screenshots: `shots-devices/<profile>-<scheme>-<route>.jpg`.', '', '| Route | Profile | ready | ovf | tap <44 | text <12px | word split | RTL | nav covers | errors |', '|---|---|---|---|---|---|---|---|---|---|');
for (const route of routes) for (const name of [...new Set(combos.map((c) => c[0]))]) {
  const r = byRP.get(route + '|' + name); if (!r) continue; const L = r.light, D = r.dark;
  const pair = (f) => `${cell(L, f)} / ${cell(D, f)}`;
  md.push(`| \`${route}\` | ${name} | ${pair((v) => (v.ready ? 'yes' : '**NO**'))} | ${pair((v) => (v.overflow ? (v.overflow.pageScrolls ? String(v.overflow.scrollWidth - v.overflow.clientWidth) : '0 (clip)') : '0'))} | ${pair((v) => n(v.small.length))} | ${pair((v) => n(v.tinyText.length))} | ${pair((v) => n((v.wordSplit || []).length))} | ${pair((v) => n((v.rtl || []).length))} | ${pair((v) => (v.fixedCover ? v.fixedCover.coversPx + 'px' : '-'))} | ${pair((v) => n(v.errors.length + v.consoleErrors.filter((c) => !/Failed to load resource/.test(c)).length))} |`);
}
// findings grouped by selector pattern across profiles; shell elements (outside #main) are grouped across routes too
const pattern = (sel) => sel.replace(/:nth-of-type\(\d+\)/g, '').replace(/\.(today|shabbat|out|now|open|active|selected)\b/g, '');
const group = (kind, pick) => { const m = new Map(); for (const v of result.visits) { const perVisit = new Map(); for (const it of pick(v)) { const k = `${it.shell ? 'shell' : v.route} ${pattern(it.sel)}`; perVisit.set(k, (perVisit.get(k) || 0) + 1); if (!m.has(k)) m.set(k, { route: it.shell ? 'all (shell)' : v.route, it, where: [], n: 0 }); } for (const [k, c] of perVisit) { const g = m.get(k); const w = `${v.profile}/${v.scheme}`; if (!g.where.includes(w)) g.where.push(w); g.n = Math.max(g.n, c); } } return [...m.values()].sort((a, b) => b.where.length * 100 + b.n - a.where.length * 100 - a.n); };
const inst = (g) => (g.n > 1 ? ` (x${g.n} per page)` : '');
const fmtWhere = (w) => { const ps = [...new Set(w.map((x) => x.split('/')[0]))]; return ps.length === new Set(combos.map((c) => c[0])).size && w.length === combos.length ? 'every profile' : ps.join(', ') + (w.length < ps.length * schemes.length ? ` (${w.join(', ')})` : ''); };
const rules = (it) => (it.rules || []).map((r) => '`' + r + '`').join('<br>') + (it.files ? '<br>' + it.files : '') || '-';
md.push('', '## Findings by element', '', 'Grouped across profiles by selector pattern (`:nth-of-type` and state classes stripped; "xN per page" counts the matching elements; "all (shell)" = header, nav or sound bar, present on every route). The "rule / file" column lists the matching stylesheet rules that set the measured property (own rule first, then the ancestors it inherits or scales from) and the file each lives in (a `<style>` string inside a view module, or assets/css).');
const ov = group('overflow', (v) => v.overflow?.wide || []);
md.push('', `### Overflow (${ov.length})`, ''); if (!ov.length) md.push('None.'); else { md.push('| Route | Element | right edge | where | rule / file |', '|---|---|---|---|---|'); for (const g of ov) md.push(`| \`${g.route}\` | \`${pattern(g.it.sel)}\`${inst(g)} | ${g.it.right}px (w ${g.it.width}) | ${fmtWhere(g.where)} | ${rules(g.it)} |`); }
const sm = group('tap', (v) => v.small);
md.push('', `### Tap targets under 44 px (${sm.length})`, ''); if (!sm.length) md.push('None.'); else { md.push('| Route | Element | name | size | where | rule / file |', '|---|---|---|---|---|---|'); for (const g of sm) md.push(`| \`${g.route}\` | \`${pattern(g.it.sel)}\`${inst(g)} | ${g.it.name || '(unnamed)'} | ${g.it.w}x${g.it.h} | ${fmtWhere(g.where)} | ${rules(g.it)} |`); }
const tt = group('tiny', (v) => v.tinyText);
md.push('', `### Text under 12 px (${tt.length})`, ''); if (!tt.length) md.push('None.'); else { md.push('| Route | Element | px | sample | where | rule / file |', '|---|---|---|---|---|---|'); for (const g of tt) md.push(`| \`${g.route}\` | \`${pattern(g.it.sel)}\`${inst(g)} | ${g.it.px} | ${g.it.text.replace(/\|/g, '\\|')} | ${fmtWhere(g.where)} | ${rules(g.it)} |`); }
const ws = group('word', (v) => v.wordSplit || []);
md.push('', `### Words broken mid-word (${ws.length})`, ''); if (!ws.length) md.push('None.'); else { md.push('| Route | Element | word | box width | where | rule / file |', '|---|---|---|---|---|---|'); for (const g of ws) md.push(`| \`${g.route}\` | \`${pattern(g.it.sel)}\`${inst(g)} | ${g.it.word} | ${g.it.boxWidth}px | ${fmtWhere(g.where)} | ${rules(g.it)} |`); }
const rt = group('rtl', (v) => v.rtl || []);
md.push('', `### RTL: mixed-script wrapping and niqqud clipping (${rt.length})`, ''); if (!rt.length) md.push('None flagged. (The check is a heuristic on line boxes and overflow; it cannot see glyph rendering.)'); else { md.push('| Route | Kind | Element | detail | where | rule / file |', '|---|---|---|---|---|---|'); for (const g of rt) md.push(`| \`${g.route}\` | ${g.it.kind} | \`${pattern(g.it.sel)}\`${inst(g)} | ${g.it.kind === 'mixed-wrap' ? `${g.it.lines} lines, dir=${g.it.dir}, isolated=${g.it.isolated}: "${g.it.text.replace(/\|/g, '\\|')}"` : `font ${g.it.px}px, line-height ${g.it.lineHeight}px${g.it.clipper ? ', clipped by `' + g.it.clipper + '`' : ''}: "${g.it.text}"`} | ${fmtWhere(g.where)} | ${rules(g.it)} |`); }
const fc = group('fixed', (v) => (v.fixedCover ? [v.fixedCover] : []));
md.push('', `### Fixed bar covering the end of the content (${fc.length})`, ''); if (!fc.length) md.push('None: with the page scrolled to the bottom, no fixed bar overlaps the end of `main`.'); else { md.push('| Route | Fixed element | covers | bar height | body padding-bottom | where | rule / file |', '|---|---|---|---|---|---|---|'); for (const g of fc) md.push(`| \`${g.route}\` | \`${g.it.sel}\` | ${g.it.coversPx}px | ${g.it.barHeight}px | ${g.it.bodyPadBottom} | ${fmtWhere(g.where)} | ${rules(g.it)} |`); }
const errs = result.visits.filter((v) => !v.ready || v.errors.length || v.consoleErrors.length || v.failedRequests.length);
md.push('', `### Errors and failed requests (${errs.length} visits)`, ''); if (!errs.length) md.push('None.'); else for (const v of errs) md.push(`- \`${v.route}\` ${v.profile}/${v.scheme}${v.ready ? '' : ' **never ready**'}: ${[...v.errors, ...v.consoleErrors, ...v.failedRequests].join('; ')}`);
if (diff) { md.push('', `## Diff vs previous run (${diff.prevWhen})`, '', `Issues before: ${diff.prevCount}; now: ${diff.nowCount}; fixed: ${diff.fixed.length}; new: ${diff.added.length}.`, ''); if (diff.fixed.length) { md.push('Fixed:', ''); for (const k of diff.fixed) md.push('- ' + k); } if (diff.added.length) { md.push('', 'New:', ''); for (const k of diff.added) md.push('- ' + k); } }
writeFileSync(join(outDir, 'DEVICES.md'), md.join('\n') + '\n');
writeFileSync(join(shotDir, 'results.json'), JSON.stringify(result, null, 1));
const tot = (f) => result.visits.reduce((s, v) => s + f(v), 0);
console.log(`visits: ${result.visits.length}; not ready: ${result.visits.filter((v) => !v.ready).length}; page-scrolls overflow: ${result.visits.filter((v) => v.overflow?.pageScrolls).length}; clipped boxes: ${tot((v) => (v.overflow?.wide || []).length)}; tap<44: ${tot((v) => v.small.length)}; text<12px: ${tot((v) => v.tinyText.length)}; word-split: ${tot((v) => (v.wordSplit || []).length)}; rtl: ${tot((v) => (v.rtl || []).length)}; nav covers content: ${result.visits.filter((v) => v.fixedCover).length}; error visits: ${hard}; ${result.seconds}s`);
if (diff) console.log(`diff: ${diff.prevCount} -> ${diff.nowCount} issues; fixed ${diff.fixed.length}; new ${diff.added.length}`);
process.exit(hard ? 1 : 0);
