#!/usr/bin/env node
// Every link, picture and icon on every screen: opens each page of the app in headless Chrome at phone size and checks
//   - every in-app link (#/...) points at a page the app has,
//   - every link to a file of this site (a PDF, a picture, a sound) is really there,
//   - every picture and icon that the page asks for arrives and has a size (nothing broken, nothing answered with an error),
//     and every other size a picture offers (for a wider screen) is there too,
//   - no script error while the page is drawn.
// Pages that need an id (a lesson, a book, a Practical page, a letter...) are found by following the links of the pages
// before them; up to --per (default 4) pages of each kind are opened, and every link to such a page is still checked by address.
// Links to other websites are listed, not opened.
//
//   NODE_PATH=<folder with playwright> node tools/qa/links.mjs --out /tmp/links [--per 4] [--routes /,/learn] [--chrome /usr/bin/google-chrome]
//
// Writes <out>/links.json (everything found) and prints a summary. Exit code 1 when anything is broken.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1]; };
const OUT = arg('--out', join(ROOT, 'qa-links')); const PER = Number(arg('--per', '4'));
const only = arg('--routes', ''); const CHROME = arg('--chrome', process.env.QA_CHROME || '/usr/bin/google-chrome');

let chromium;
try { ({ chromium } = createRequire(join(ROOT, 'package.json'))('playwright')); }
catch { try { ({ chromium } = createRequire((process.env.NODE_PATH || '/opt/npm-tools/node_modules') + '/')('playwright')); } catch { console.error('playwright is not installed here: set NODE_PATH to a folder that has it'); process.exit(2); } }

const { createAppServer } = await import(pathToFileURL(join(ROOT, 'tools/serve.mjs')).href);
const { ROUTES, matchRoute } = await import(pathToFileURL(join(ROOT, 'src/shell/router.js')).href);

const server = createAppServer({ root: ROOT }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: existsSync(CHROME) ? CHROME : undefined });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block', reducedMotion: 'reduce' });
await ctx.addInitScript(() => {
  try {
    const d = new Date();
    localStorage.setItem('alef:opening-prayer:day:v1', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true }));
  } catch { /* storage off */ }
});

const staticRoutes = only ? only.split(',') : ROUTES.filter((r) => !r.pattern.includes(':')).map((r) => r.pattern);
const queue = staticRoutes.map((p) => ({ path: p, from: '(route list)' }));
const seenPath = new Set(staticRoutes); const perKind = new Map();
const pages = []; const fileLinks = new Map(); const external = new Map(); const badRoutes = [];

async function visit(item) {
  const page = await ctx.newPage();
  const failed = []; const errors = [];
  page.on('response', (r) => { const u = r.url(); if (u.startsWith(base) && r.status() >= 400) failed.push({ status: r.status(), url: u.slice(base.length), type: r.request().resourceType() }); });
  page.on('requestfailed', (r) => { const u = r.url(); if (u.startsWith(base) && !/\.(mp3|ogg|wav|m4a)(\?|$)/.test(u)) failed.push({ status: 0, url: u.slice(base.length), type: r.resourceType(), why: r.failure()?.errorText || '' }); });
  page.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 200)));
  const out = { path: item.path, from: item.from, title: '', links: 0, images: 0, brokenImages: [], failed, errors, empty: false };
  try {
    await page.goto(base + '#' + item.path, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => (document.getElementById('main')?.innerText || '').trim().length > 20, null, { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(700);
    // draw everything: lazy pictures are asked for now, and the page is walked top to bottom
    await page.evaluate(async () => {
      for (const d of document.querySelectorAll('details')) d.open = true;
      for (const img of document.querySelectorAll('img[loading="lazy"]')) img.loading = 'eager';
      const h = document.documentElement.scrollHeight;
      for (let y = 0; y <= h; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(300);
    const got = await page.evaluate(() => ({
      title: document.querySelector('#main h1, h1')?.textContent?.trim().slice(0, 80) || '',
      text: (document.getElementById('main')?.innerText || '').trim().length,
      links: [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href') || '', text: (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 60), inMain: !!a.closest('#main') })),
      images: [...document.querySelectorAll('img')].map((i) => ({ src: i.getAttribute('src') || '', ok: i.complete && i.naturalWidth > 0, shown: !!(i.offsetWidth || i.offsetHeight) })),
      // every size a picture offers (the browser only asks for the one that fits this screen; a tablet asks for another)
      sizes: [...document.querySelectorAll('img[srcset], source[srcset]')].flatMap((e) => (e.getAttribute('srcset') || '').split(',').map((c) => c.trim().split(/\s+/)[0]).filter(Boolean)),
      emptyLinks: [...document.querySelectorAll('#main a[href], #main button')].filter((e) => !(e.getAttribute('aria-label') || e.textContent || '').trim() && !e.querySelector('img[alt]:not([alt=""]), svg[aria-label], [aria-label]') && (e.offsetWidth || e.offsetHeight)).map((e) => e.outerHTML.slice(0, 120)),
    }));
    out.title = got.title; out.links = got.links.length; out.images = got.images.length; out.empty = got.text < 20;
    out.brokenImages = got.images.filter((i) => i.src && !i.ok && i.shown).map((i) => i.src.slice(0, 160));
    out.namelessControls = got.emptyLinks;
    for (const u of got.sizes) { const file = new URL(u, base).href; if (file.startsWith(base) && !fileLinks.has(file)) fileLinks.set(file, { on: item.path, text: 'a size of a picture' }); }
    for (const l of got.links) {
      const href = l.href;
      if (!href || href === '#' || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('blob:') || href.startsWith('data:')) continue;
      if (/^https?:\/\//i.test(href)) { if (!external.has(href)) external.set(href, item.path); continue; }
      if (href.startsWith('#')) {
        if (!href.startsWith('#/')) continue; // a jump inside the page
        const m = matchRoute(href);
        if (!m.route) { badRoutes.push({ on: item.path, href, text: l.text }); continue; }
        const path = href.slice(1).split('?')[0] + (href.includes('?') ? '?' + href.split('?')[1] : '');
        if (seenPath.has(path)) continue; seenPath.add(path);
        const kind = m.route.name + (href.includes('?') ? '?' + [...new URLSearchParams(href.split('?')[1]).keys()].sort().join('&') : '');
        const n = perKind.get(kind) || 0;
        if (n < PER) { perKind.set(kind, n + 1); queue.push({ path, from: item.path }); }
        continue;
      }
      const file = new URL(href, base).href;
      if (file.startsWith(base) && !fileLinks.has(file)) fileLinks.set(file, { on: item.path, text: l.text });
    }
  } catch (e) { out.errors.push('could not open: ' + String(e.message || e).slice(0, 160)); }
  await page.close();
  return out;
}

const t0 = Date.now();
for (let i = 0; i < queue.length; i++) {
  pages.push(await visit(queue[i]));
  if ((i + 1) % 25 === 0) console.error(`${i + 1}/${queue.length} pages, ${Math.round((Date.now() - t0) / 1000)}s`);
}
// files this site links to: are they there?
const missingFiles = [];
for (const [url, where] of fileLinks) {
  try { const r = await fetch(url, { method: 'HEAD' }); if (r.status >= 400) missingFiles.push({ ...where, href: url.slice(base.length), status: r.status }); }
  catch (e) { missingFiles.push({ ...where, href: url.slice(base.length), status: 0 }); }
}
await browser.close(); server.close();

const problems = {
  linksToPagesTheAppDoesNotHave: badRoutes,
  linksToMissingFiles: missingFiles,
  brokenPictures: pages.filter((p) => p.brokenImages.length).map((p) => ({ on: p.path, pictures: [...new Set(p.brokenImages)] })),
  failedRequests: pages.filter((p) => p.failed.length).map((p) => ({ on: p.path, failed: [...new Map(p.failed.map((f) => [f.url, f])).values()] })),
  scriptErrors: pages.filter((p) => p.errors.length).map((p) => ({ on: p.path, errors: [...new Set(p.errors)] })),
  emptyPages: pages.filter((p) => p.empty).map((p) => p.path),
  controlsWithNoName: pages.filter((p) => (p.namelessControls || []).length).map((p) => ({ on: p.path, controls: p.namelessControls.slice(0, 5) })),
};
const summary = { pagesOpened: pages.length, staticPages: staticRoutes.length, idPagesOpened: pages.length - staticRoutes.length, kindsOfIdPages: perKind.size,
  inAppAddressesChecked: seenPath.size, linksSeen: pages.reduce((n, p) => n + p.links, 0), picturesSeen: pages.reduce((n, p) => n + p.images, 0),
  fileLinksChecked: fileLinks.size, externalLinksListed: external.size, seconds: Math.round((Date.now() - t0) / 1000),
  problems: Object.fromEntries(Object.entries(problems).map(([k, v]) => [k, v.length])) };
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'links.json'), JSON.stringify({ summary, problems, external: [...external].map(([href, on]) => ({ href, on })), pages: pages.map((p) => ({ path: p.path, from: p.from, title: p.title, links: p.links, images: p.images })) }, null, 1));
console.log(JSON.stringify(summary, null, 1));
process.exit(Object.values(summary.problems).some((n) => n > 0) ? 1 : 0);
