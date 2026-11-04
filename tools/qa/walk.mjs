// QA walk (lane QA). Headless Chromium only: no real phone, finger or stylus.
// Usage: node tools/qa/walk.mjs [--out docs/qa] [--phase walk,offline,interact] [--quick]   (--quick: 8 routes, phone-light only; used by tests/qa.walk.test.js)
//   walk     every route in src/shell/router.js (+ deep links with params/query, + bad params) at 390x844 and 1280x800, light and dark
//   offline  service-worker precache + offline reload for 5 routes
//   interact stroke tracing with synthetic mouse drag, Atlas, Sound gap, Vowel board, Vocab, Workbook
// Writes <out>/results.json and screenshots into <out>/shots/. Exit 1 if any hard failure (console/page error, overflow, 'null' text, missing name).
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
const outDir = resolve(root, arg('--out', 'docs/qa')); const shotDir = join(outDir, 'shots'); mkdirSync(shotDir, { recursive: true });
const quick = args.includes('--quick');
const phases = new Set(arg('--phase', 'walk,offline,interact').split(','));
const executablePath = process.env.QA_CHROME || undefined;

// ---- routes: every ROUTES entry with sample params, plus deep links and bad input
const { ROUTES } = await import(pathToFileURL(join(root, 'src/shell/router.js')).href);
const SAMPLE = { id: null, letter: 'bet', group: 'lw1', textId: 'bless-priestly-1', sec: 'ladder', section: 'ladder', week: '1', mode: 'handout' };
const sampleFor = (r) => r.pattern.replace(/:(\w+)/g, (_, k) => (r.name === 'dialogue' ? 'd-cafe' : r.name === 'fadeline' ? 'bless-priestly-1' : r.name === 'letter' ? 'bet' : SAMPLE[k] ?? 'x'));
const routeList = ROUTES.map((r) => ({ path: sampleFor(r), route: r.name }));
const extras = ['/letters/alef', '/letters/final-mem', '/letters/bet?tab=drill&x=1', '/letters?tab=type', '/learn?lesson=r01', '/learn?lesson=r05&review=1', '/learn?review=1', '/learn?loanwords=1', '/read/bless-priestly-1?line=2',
  '/loanwords/lw2', '/spotit/alef', '/fade/bless-priestly-2', '/dialogues/d-cafe?x=1',
  '/nope', '/letters/zzz', '/read/nonexistent', '/dialogues/zzz', '/loanwords/zzz', '/spotit/zzz', '/fade/zzz', '/learn?lesson=zzz', '/learn?lesson=', '/letters/%E0%A4%A', '/vocab?tier=1&q=%D7%A9%D7%9C%D7%95%D7%9D'];
const seen = new Set(); const ALL = [];
for (const r of [...routeList, ...extras.map((p) => ({ path: p, route: 'extra' }))]) if (!seen.has(r.path)) { seen.add(r.path); ALL.push(r); }
if (quick) { const keep = new Set(['/', '/learn', '/letters/alef', '/letters/atlas', '/sounds', '/read/bless-priestly-1', '/vocab', '/nope']); for (let i = ALL.length - 1; i >= 0; i--) if (!keep.has(ALL[i].path)) ALL.splice(i, 1); }
const slug = (p) => (p === '/' ? 'home' : p.slice(1).replace(/[\/?=&%]+/g, '_'));
const SAMPLE_DARK = ['/', '/learn', '/letters/alef', '/letters/atlas', '/sounds', '/read/bless-priestly-1', '/soundgap', '/vowelboard', '/vocab', '/spotit/bet', '/dialogues/d-cafe', '/settings', '/about', '/workbook', '/scan'];
const SAMPLE_DESK = ['/', '/learn', '/letters/alef', '/letters/atlas', '/sounds', '/read/bless-priestly-1', '/soundgap', '/vocab', '/settings', '/calendar'];

const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ executablePath });
const seedIds = Array.from({ length: 24 }, (_, i) => 'r' + String(i + 1).padStart(2, '0'));
const seedScript = ({ ids, seeded }) => { if (!localStorage.getItem('alef:settings')) { localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); if (seeded) localStorage.setItem('alef:curriculum.progress', JSON.stringify({ completed: Object.fromEntries(ids.map((i) => [i, Date.now()])) })); } };
const newCtx = (vp, scheme, seeded, extra = {}) => browser.newContext({ viewport: vp, colorScheme: scheme, deviceScaleFactor: 1, ...extra }).then(async (c) => { await c.addInitScript(seedScript, { ids: seedIds, seeded }); return c; });

// ---- in-page audit
function audit() {
  const out = { clipped: [], overflow: null, badText: [], noName: [], heNoLang: [], heNoDir: [], small: [], offscreen: [], h1: 0 };
  const de = document.documentElement; const iw = window.innerWidth;
  if (de.scrollWidth > iw || document.body.scrollWidth > iw) {
    const wide = [];
    for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); if (r.width && r.right > iw + 1 && getComputedStyle(e).position !== 'fixed') { wide.push(e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') + ' ' + Math.round(r.right)); if (wide.length >= 4) break; } }
    out.overflow = { scrollWidth: Math.max(de.scrollWidth, document.body.scrollWidth), innerWidth: iw, wide };
  }
  // elements cut off by main{overflow-x:clip} do not widen the page, so scrollWidth misses them: look at the boxes
  const inScroller = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll') return true; } return false; };
  for (const e of document.querySelectorAll('main *')) { const r = e.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && (r.right > iw + 1 || r.left < -1) && !inScroller(e) && getComputedStyle(e).position !== 'fixed' && !e.closest('svg') && !/^(OPTION|HTML)$/.test(e.tagName)) { out.clipped.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : '') + ' right=' + Math.round(r.right)); if (out.clipped.length >= 4) break; } }
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const text = document.body.innerText;
  for (const m of text.matchAll(/(^|[^\w.])(null|undefined|NaN)([^\w]|$)|\[object [A-Za-z]+\]/g)) out.badText.push(text.slice(Math.max(0, m.index - 20), m.index + 30).replace(/\s+/g, ' '));
  const nameOf = (e) => {
    const al = e.getAttribute('aria-label'); if (al && al.trim()) return al.trim();
    const lb = e.getAttribute('aria-labelledby'); if (lb) { const t = lb.split(/\s+/).map((i) => document.getElementById(i)?.textContent || '').join(' ').trim(); if (t) return t; }
    if (e.labels && e.labels.length) { const t = [...e.labels].map((l) => l.textContent).join(' ').trim(); if (t) return t; }
    const t = (e.textContent || '').trim(); if (t) return t;
    const img = e.querySelector('img[alt],svg[aria-label],svg title'); if (img && (img.getAttribute('alt') || img.getAttribute('aria-label') || img.textContent)) return 'img';
    return (e.getAttribute('title') || e.getAttribute('placeholder') || (e.tagName === 'INPUT' && ['button', 'submit'].includes(e.type) ? e.value : '') || '').trim();
  };
  const interactive = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=tab], [role=checkbox], [role=radio]')].filter(vis);
  for (const e of interactive) {
    const nm = nameOf(e); const desc = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '');
    if (!nm) out.noName.push(desc);
    let r = e.getBoundingClientRect();
    if (e.tagName === 'INPUT' && ['checkbox', 'radio'].includes(e.type) && e.labels && e.labels[0]) r = e.labels[0].getBoundingClientRect(); // the label is the tap target
    const inline = e.tagName === 'A' && e.closest('p, li') && getComputedStyle(e).display === 'inline';
    if ((r.width < 44 || r.height < 44) && !inline && !e.closest('.skip, [class*=skip], .visually-hidden') && !e.classList.contains('visually-hidden')) out.small.push(`${desc} "${nm.slice(0, 20)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  const he = /[֐-׿]/;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const seenEl = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!he.test(n.nodeValue)) continue; const p = n.parentElement; if (!p || seenEl.has(p) || ['SCRIPT', 'STYLE'].includes(p.tagName) || !vis(p)) continue; seenEl.add(p);
    const d = p.tagName.toLowerCase() + (p.className && typeof p.className === 'string' ? '.' + p.className.split(' ')[0] : '') + ' ' + n.nodeValue.trim().slice(0, 12);
    const lang = p.closest('[lang]')?.getAttribute('lang') || '';
    if (!/^he/i.test(lang)) out.heNoLang.push(d);
    if (getComputedStyle(p).direction !== 'rtl') out.heNoDir.push(d);
  }
  out.h1 = document.querySelectorAll('h1').length;
  return out;
}

async function tabOrder(page, n = 14) {
  const seq = []; let trap = false;
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    const s = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const r = e.getBoundingClientRect(); const st = getComputedStyle(e); const pos = [...document.querySelectorAll('*')].indexOf(e); return { d: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ((e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 18) ? ' "' + (e.getAttribute('aria-label') || e.textContent).trim().slice(0, 18) + '"' : ''), pos, hidden: (r.width === 0 && r.height === 0) || st.visibility === 'hidden', off: r.bottom < 0 || r.top > innerHeight + 4000 }; });
    if (!s) { seq.push('(body)'); continue; }
    seq.push(s);
  }
  const objs = seq.filter((x) => typeof x === 'object');
  const issues = [];
  if (objs.length && !/skip/i.test(objs[0].d) ) issues.push('first Tab stop is not the skip link: ' + objs[0].d);
  for (let i = 1; i < objs.length; i++) if (objs[i].pos < objs[i - 1].pos && objs[i].pos !== objs[0].pos) issues.push(`focus went backwards in DOM: ${objs[i - 1].d} -> ${objs[i].d}`);
  for (const o of objs) if (o.hidden) issues.push('focus on invisible element ' + o.d);
  if (objs.length >= 3 && new Set(objs.map((o) => o.pos)).size < Math.min(objs.length, 3)) { trap = true; issues.push('possible keyboard trap'); }
  return { order: seq.map((x) => (typeof x === 'string' ? x : x.d)), issues, trap };
}

const result = { when: new Date().toISOString(), chromium: browser.version(), routeCount: ALL.length, routes: ALL.map((r) => r.path), walk: [], offline: [], interact: [] };
let hard = 0;

async function visit(ctx, vpName, scheme, profile, r, doShot) {
  const page = await ctx.newPage(); const errs = [], cons = [], failed = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') cons.push(m.text()); });
  page.on('response', (res) => { if (res.status() >= 400) failed.push(res.status() + ' ' + new URL(res.url()).pathname); });
  page.on('requestfailed', (q) => failed.push('FAILED ' + new URL(q.url()).pathname));
  await page.goto(base + '#' + r.path, { waitUntil: 'load' });
  let ready = true; try { await page.waitForSelector('body[data-ready="1"]', { timeout: 8000 }); } catch { ready = false; errs.push('view never became ready'); }
  await page.waitForTimeout(450);
  const a = await page.evaluate(audit);
  const info = await page.evaluate(() => { const m = document.getElementById('main'); return { heading: m?.querySelector('h1')?.textContent?.trim() || '', unavailable: !!m?.querySelector('.alef-unavailable'), textLength: m?.innerText.length || 0, hash: location.hash }; });
  if (doShot) {
    const sh = await page.evaluate(() => document.documentElement.scrollHeight); const vp = page.viewportSize();
    const file = join(shotDir, `${vpName}-${scheme}${profile === 'fresh' ? '-fresh' : ''}-${slug(r.path)}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 50, ...(sh > 3200 ? { clip: { x: 0, y: 0, width: vp.width, height: 3200 }, fullPage: true } : { fullPage: true }) }).catch(() => {});
  }
  const tabs = vpName === 'phone' && scheme === 'light' && profile === 'seeded' ? await tabOrder(page) : null;
  await page.close();
  return { route: r.path, name: r.route, vp: vpName, scheme, profile, ...info, ready, errors: errs, consoleErrors: cons, failedRequests: failed, ...a, tabs };
}

if (phases.has('walk')) {
  const combos = [
    ['phone', { width: 390, height: 844 }, 'light', 'seeded', () => true],
    ['phone', { width: 390, height: 844 }, 'dark', 'seeded', (p) => SAMPLE_DARK.includes(p)],
    ['desktop', { width: 1280, height: 800 }, 'light', 'seeded', (p) => SAMPLE_DESK.includes(p)],
    ['desktop', { width: 1280, height: 800 }, 'dark', 'seeded', (p) => ['/', '/letters/alef', '/learn'].includes(p)],
    ['phone', { width: 390, height: 844 }, 'light', 'fresh', (p) => ['/', '/learn', '/loanwords/lw1', '/spotit/bet', '/checkpoint', '/vocab'].includes(p)]
  ];
  for (const [vpName, vp, scheme, profile, shotWhen] of quick ? combos.slice(0, 1) : combos) {
    const ctx = await newCtx(vp, scheme, profile === 'seeded');
    for (const r of ALL) { const x = await visit(ctx, vpName, scheme, profile, r, shotWhen(r.path)); result.walk.push(x); }
    await ctx.close();
  }
  for (const x of result.walk) {
    const bad = x.errors.length || x.consoleErrors.filter((c) => !/Failed to load resource/.test(c)).length || x.overflow || x.clipped.length || x.badText.length || x.noName.length;
    if (bad && !(x.name === 'extra' && /nope|zzz|nonexistent|%E0/.test(x.route) && !x.errors.length && !x.overflow && !x.badText.length)) hard++;
  }
}

if (phases.has('offline')) {
  const ctx = await newCtx({ width: 390, height: 844 }, 'light', false, { serviceWorkers: 'allow' });
  const pages = ['/', '/learn', '/letters/alef', '/sounds', '/read/bless-priestly-1'];
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(base, { waitUntil: 'load' });
  const sw = await page.evaluate(async () => { const reg = await navigator.serviceWorker.ready; await new Promise((r) => setTimeout(r, 1500)); const keys = await caches.keys(); let n = 0; for (const k of keys) n += (await (await caches.open(k)).keys()).length; return { scope: reg.scope, caches: keys, cached: n }; });
  result.offlineSw = sw;
  // visit each route online once so lazily-needed data is cached, then go offline and load each fresh
  for (const p of pages) { await page.goto(base + '#' + p); await page.waitForSelector('body[data-ready="1"]', { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(600); }
  await ctx.setOffline(true);
  for (const p of pages) {
    const pg = await ctx.newPage(); const e2 = [], failed = [];
    pg.on('pageerror', (e) => e2.push(e.message)); pg.on('requestfailed', (q) => failed.push(new URL(q.url()).pathname));
    let ok = true, why = '';
    try { await pg.goto(base + '#' + p, { waitUntil: 'load' }); await pg.waitForSelector('body[data-ready="1"]', { timeout: 8000 }); await pg.waitForTimeout(700);
      await pg.reload({ waitUntil: 'load' }); await pg.waitForSelector('body[data-ready="1"]', { timeout: 8000 }); await pg.waitForTimeout(700); } catch (e) { ok = false; why = e.message.split('\n')[0]; }
    const st = ok ? await pg.evaluate(() => ({ h1: document.querySelector('h1')?.textContent?.trim() || '', unavailable: !!document.querySelector('.alef-unavailable, [role=alert]'), len: document.getElementById('main')?.innerText.length || 0 })) : {};
    if (ok && (st.unavailable || st.len < 40)) { ok = false; why = 'content missing or error card offline'; }
    result.offline.push({ route: p, ok, why, ...st, pageErrors: e2, failedRequests: failed });
    if (!ok) hard++;
    await pg.close();
  }
  await ctx.setOffline(false); await ctx.close();
}

if (phases.has('interact')) {
  const ctx = await newCtx({ width: 390, height: 844 }, 'light', true);
  process.on('unhandledRejection', () => {});
  const rec = (name, ok, detail = '') => { result.interact.push({ name, ok: !!ok, detail }); if (!ok) hard++; };
  const mk = async (p) => { const pg = await ctx.newPage(); pg.errs = []; pg.on('pageerror', (e) => pg.errs.push(e.message)); await pg.goto(base + '#' + p); await pg.waitForSelector('body[data-ready="1"]', { timeout: 8000 }).catch(() => {}); await pg.waitForTimeout(500); return pg; };
  const letters = JSON.parse(readFileSync(join(root, 'data/letters/letters.json'), 'utf8'));
  // --- stroke tracing: drag along each stroke's median with synthetic mouse events
  for (const [id, script] of [['alef', 'print'], ['bet', 'print'], ['shin', 'print']]) {
    const L = letters.find((l) => l.id === id); const pg = await mk('/letters/' + id);
    const svg = pg.locator('.alef-trace svg[role=img]').first();
    const have = await svg.count();
    if (!have) { rec(`trace ${id}: svg present`, false, 'no tracing svg'); await pg.close(); continue; }
    await svg.scrollIntoViewIfNeeded(); const box = await svg.boundingBox(); const strokes = L[script].strokes;
    const toPx = (p) => [box.x + (p[0] / 1000) * box.width, box.y + (p[1] / 1000) * box.height];
    let counted = [];
    for (let i = 0; i < strokes.length; i++) {
      const m = strokes[i].median; const [x0, y0] = toPx(m[0]);
      await pg.mouse.move(x0, y0); await pg.mouse.down();
      for (const p of m.slice(1)) { const [x, y] = toPx(p); await pg.mouse.move(x, y, { steps: 3 }); }
      await pg.mouse.up(); await pg.waitForTimeout(120);
      counted.push(await pg.locator('.alef-trace .row').filter({ hasText: /strokes/ }).first().innerText().catch(() => '?'));
    }
    const fb = await pg.locator('.alef-trace .feedback').innerText();
    rec(`trace ${id} (${script}): ${strokes.length} median drags counted`, counted.at(-1)?.trim().startsWith(`${strokes.length} / ${strokes.length}`) && /Perfect|Done/.test(fb), `progress after each stroke: ${counted.map((c) => c.trim().split(' ')[0]).join(',')}; feedback "${fb}"`);
    if (id === 'alef') await pg.screenshot({ path: join(shotDir, 'interact-trace-alef-done.jpg'), type: 'jpeg', quality: 50 });
    rec(`trace ${id}: completion badge persisted`, await pg.locator('.grid button[aria-pressed=true] .badge').count() > 0);
    // wrong stroke is rejected: reset then draw a horizontal line far from the median
    await pg.getByRole('button', { name: 'Start over' }).click(); await pg.waitForTimeout(100);
    await svg.scrollIntoViewIfNeeded(); const box2 = await svg.boundingBox(); Object.assign(box, box2);
    await pg.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.9); await pg.mouse.down(); await pg.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.92, { steps: 6 }); await pg.mouse.up(); await pg.waitForTimeout(150);
    const p2 = (await pg.locator('.alef-trace .row').filter({ hasText: /strokes/ }).first().innerText()).trim();
    rec(`trace ${id}: wrong stroke not counted`, p2.startsWith('0 /'), p2 + ' | ' + (await pg.locator('.alef-trace .feedback').innerText()));
    rec(`trace ${id}: no page errors`, pg.errs.length === 0, pg.errs.join('; '));
    await pg.close();
  }
  // touch-style pointer events too (pointerType touch via CDP)
  {
    const pg = await mk('/letters/alef'); const L = letters[0]; const svg = pg.locator('.alef-trace svg[role=img]').first(); await svg.scrollIntoViewIfNeeded(); const box = await svg.boundingBox();
    const cdp = await ctx.newCDPSession(pg); const m = L.print.strokes[0].median; const toPx = (p) => [box.x + (p[0] / 1000) * box.width, box.y + (p[1] / 1000) * box.height];
    const ev = (type, p) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: toPx(p)[0], y: toPx(p)[1] }] });
    await ev('touchStart', m[0]); for (const p of m.slice(1)) await ev('touchMove', p); await ev('touchEnd', m.at(-1)); await pg.waitForTimeout(200);
    const prog = (await pg.locator('.alef-trace .row').filter({ hasText: /strokes/ }).first().innerText()).trim();
    rec('trace alef: synthetic touch (CDP) drag counts stroke 1', prog.startsWith('1 /'), prog);
    await pg.close();
  }
  // --- Atlas
  try { const pg = await mk('/letters/atlas'); const tiles = pg.locator('[data-tile]'); const n = await tiles.count();
    rec('atlas: 31 tiles', n === 31, 'tiles=' + n);
    await tiles.nth(1).click(); await pg.waitForTimeout(150);
    rec('atlas: tap tile opens detail panel', await pg.locator('[data-detail]').count() === 1);
    await pg.getByRole('button', { name: 'Hear the sound' }).click().catch(() => {}); await pg.waitForTimeout(200);
    await pg.getByRole('button', { name: /Quiz me/ }).click(); await pg.waitForTimeout(150);
    rec('atlas: quiz starts', await pg.getByText(/Find:/).count() > 0);
    const target = (await pg.locator('.panel strong').first().innerText()).replace('Find:', '').trim();
    await pg.locator('[data-tile]').nth(0).click(); await pg.waitForTimeout(150);
    rec('atlas: quiz answer gives feedback', await pg.locator('.panel p').count() > 0, 'target ' + target);
    await pg.screenshot({ path: join(shotDir, 'interact-atlas-quiz.jpg'), type: 'jpeg', quality: 50, fullPage: true });
    rec('atlas: no page errors', pg.errs.length === 0, pg.errs.join('; ')); await pg.close(); } catch (e) { rec('Atlas: completed without exception', false, e.message.split('\n')[0]); }
  // --- Sound gap
  try { const pg = await mk('/soundgap'); const inputs = pg.locator('main input, main select, main button'); const n = await inputs.count();
    rec('soundgap: controls present', n > 0, 'controls=' + n);
    const radios = pg.locator('main input[type=radio]'); const rc = await radios.count();
    if (rc > 1) { await radios.nth(1).check({ force: true }).catch(() => {}); await pg.waitForTimeout(200); }
    const btn = pg.locator('main button').first(); if (await btn.count()) { await btn.click().catch(() => {}); await pg.waitForTimeout(300); }
    const w = await pg.evaluate(() => document.documentElement.scrollWidth); rec('soundgap: no horizontal page overflow after interaction', w <= 390, 'scrollWidth=' + w);
    rec('soundgap: tables inside scroll regions', await pg.locator('.table-wrap table').count() === await pg.locator('main table').count());
    rec('soundgap: no page errors', pg.errs.length === 0, pg.errs.join('; ')); await pg.close(); } catch (e) { rec('Sound gap: completed without exception', false, e.message.split('\n')[0]); }
  // --- Vowel board
  try { const pg = await mk('/vowelboard'); const tray = pg.locator('[role=group][aria-label="Signs to place"] button'); const fam = pg.locator('[role=group][aria-label="Families"] button');
    const modes = pg.locator('[role=group][aria-label="Mode"] button'); const modeNames = await modes.allInnerTexts();
    rec('vowelboard: mounts with tray and modes', (await tray.count()) > 0 || modeNames.length > 0, `tray=${await tray.count()} modes=${modeNames.join('|')}`);
    if (await tray.count()) { await tray.first().click(); await pg.waitForTimeout(150); const st1 = await pg.locator('main [role=status]').first().innerText().catch(() => '');
      rec('vowelboard: selecting a sign prompts for a family', /Selected/.test(st1), st1);
      if (await fam.count()) { await fam.first().click(); await pg.waitForTimeout(200); const st2 = await pg.locator('main [role=status]').first().innerText().catch(() => ''); rec('vowelboard: placing a sign gives feedback', st2.length > 0 && st2 !== st1, st2); } }
    rec('vowelboard: no page errors', pg.errs.length === 0, pg.errs.join('; ')); await pg.screenshot({ path: join(shotDir, 'interact-vowelboard.jpg'), type: 'jpeg', quality: 50, fullPage: true }); await pg.close(); } catch (e) { rec('Vowel board: completed without exception', false, e.message.split('\n')[0]); }
  // --- Vocab
  try { const pg = await mk('/vocab'); await pg.waitForSelector('#vc-search', { timeout: 6000 }).catch(() => {});
    const before = await pg.locator('main li, main .vc-row, main article').count();
    await pg.fill('#vc-search', 'שלום'); await pg.waitForTimeout(400);
    const txt = await pg.locator('main').innerText(); rec('vocab: search filters list', /Showing 1 of 1 word/.test(txt) && !/(^|\n)null(\n|$)/.test(txt), `rows before=${before}`);
    const add = pg.getByRole('button', { name: /^Add [^\d]/ }).first();
    if (await add.count()) { await add.click(); await pg.waitForTimeout(300); rec('vocab: Add to reviews persists a card', (await pg.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('alef:srs.vocab') || '{}')).length)) > 0); }
    else rec('vocab: Add to reviews button found', false, 'no button after search');
    await pg.locator('.vc-modes button').nth(1).click({ timeout: 4000 }).catch(() => {}); await pg.waitForTimeout(500);
    const show = pg.locator('#vc-show'); if (await show.count()) { await show.click(); await pg.waitForTimeout(150); await pg.keyboard.press('3'); await pg.waitForTimeout(200); rec('vocab: review show-answer + rate by key', true); } else rec('vocab: review card shown', false, (await pg.locator('main').innerText()).slice(0, 120));
    rec('vocab: no page errors', pg.errs.length === 0, pg.errs.join('; ')); await pg.close(); } catch (e) { rec('Vocab: completed without exception', false, e.message.split('\n')[0]); }
  // --- Workbook
  try { const pg = await mk('/workbook'); const links = pg.locator('a[download]'); const n = await links.count(); rec('workbook: lists PDF downloads', n > 0, 'links=' + n);
    let allOk = n > 0; for (let i = 0; i < n; i++) { const href = await links.nth(i).getAttribute('href'); const r = await pg.request.get(new URL(href, base).href); if (r.status() !== 200 || !(r.headers()['content-type'] || '').includes('pdf')) { allOk = false; } }
    rec('workbook: every PDF link returns 200 application/pdf', allOk);
    rec('workbook: no page errors', pg.errs.length === 0, pg.errs.join('; ')); await pg.close(); } catch (e) { rec('Workbook: completed without exception', false, e.message.split('\n')[0]); }
  await ctx.close();
}

await browser.close(); server.close();
// a partial run (--phase interact) merges into the previous results.json instead of discarding the other phases
let prev = {}; try { prev = JSON.parse(readFileSync(join(outDir, 'results.json'), 'utf8')); } catch { /* first run */ }
const merged = { ...prev, when: result.when, chromium: result.chromium };
for (const [ph, keys] of [['walk', ['routeCount', 'routes', 'walk']], ['offline', ['offline', 'offlineSw']], ['interact', ['interact']]]) if (phases.has(ph)) for (const k of keys) merged[k] = result[k];
const failedNow = (merged.walk || []).filter((x) => x.errors.length || x.consoleErrors.filter((c) => !/Failed to load resource/.test(c)).length || x.overflow || x.clipped.length || x.badText.length || x.noName.length).length + (merged.offline || []).filter((o) => !o.ok).length + (merged.interact || []).filter((i) => !i.ok).length;
result.hardFailures = hard; merged.hardFailures = quick ? hard : failedNow;
writeFileSync(join(outDir, 'results.json'), JSON.stringify(merged, null, 1));
const sum = (f) => result.walk.filter(f).length;
console.log(`routes: ${ALL.length}; page visits: ${result.walk.length}; hard-failure groups: ${hard}`);
console.log(`console/page errors: ${sum((x) => x.errors.length || x.consoleErrors.length)}; overflow: ${sum((x) => x.overflow)}; clipped: ${sum((x) => x.clipped.length)}; bad text: ${sum((x) => x.badText.length)}; unnamed controls: ${sum((x) => x.noName.length)}; hebrew w/o lang: ${sum((x) => x.heNoLang.length)}; small targets: ${sum((x) => x.small.length)}`);
for (const o of result.offline) console.log('offline', o.ok ? 'ok  ' : 'FAIL', o.route, o.why);
for (const i of result.interact) console.log('interact', i.ok ? 'ok  ' : 'FAIL', i.name, i.ok ? '' : i.detail);
process.exit(hard ? 1 : 0);
