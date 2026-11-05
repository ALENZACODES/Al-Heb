// PWA audit: hand checks of the web app manifest, icons, theme colour, start_url/scope, service worker scope, offline fallback and
// installability, plus Chromium's own installability verdict over CDP (Page.getInstallabilityErrors) and an offline navigation test.
// Lighthouse 13 (tools/lighthouse) no longer has a PWA category, so these are hand checks, not a Lighthouse score.
// Usage: node tools/qa/pwa_audit.mjs [--out docs/perf/pwa-audit.json] [--no-browser]   -> prints ok/FAIL/NOTE lines, exit 1 on FAIL
// Limits: headless Chromium on Linux over http://localhost (a secure context). No real device, no iOS/Android install prompt, no Safari.
import { createRequire } from 'node:module';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const results = [];
const note = (name, ok, detail = '', kind) => { results.push({ name, ok: !!ok, kind: kind || (ok ? 'ok' : 'FAIL'), detail }); console.log((kind || (ok ? 'ok' : 'FAIL')).padEnd(4), name, detail); };

// ---- static checks
const mf = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
const html = readFileSync(join(root, 'index.html'), 'utf8');
for (const k of ['name', 'short_name', 'start_url', 'scope', 'display', 'background_color', 'theme_color', 'icons', 'id', 'description', 'lang']) note(`manifest.${k} present`, mf[k] != null && mf[k] !== '', typeof mf[k] === 'string' ? mf[k] : '');
note('manifest.name length reasonable', mf.name.length <= 45, `name ${mf.name.length}`);
note('manifest.short_name <= 12 characters (home-screen label)', mf.short_name.length <= 12, `${mf.short_name.length}`);
note('manifest.display is standalone-like', ['standalone', 'fullscreen', 'minimal-ui'].includes(mf.display), mf.display);
const startUrl = new URL(mf.start_url, 'http://h/'); const scope = new URL(mf.scope, 'http://h/');
note('start_url is inside scope', startUrl.pathname.startsWith(scope.pathname), `${mf.start_url} in ${mf.scope}`);
note('start_url and scope are relative (works under a /repo/ project-site prefix)', !/^\//.test(mf.start_url) && !/^\//.test(mf.scope) && !/^https?:/.test(mf.start_url));
const metaTheme = html.match(/<meta name="theme-color" content="([^"]+)"/)?.[1];
note('<meta name=theme-color> present and equals manifest theme_color', metaTheme && metaTheme.toLowerCase() === mf.theme_color.toLowerCase(), `${metaTheme} / ${mf.theme_color}`);
note('<link rel=manifest> in index.html', /<link rel="manifest" href="manifest\.webmanifest"/.test(html));
note('apple-touch-icon link (iOS home screen)', /rel="apple-touch-icon"/.test(html));
note('viewport meta present', /name="viewport"/.test(html));

// PNG size from the IHDR chunk
const pngSize = (f) => { const b = readFileSync(f); return b.toString('latin1', 1, 4) === 'PNG' ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : null; };
const have = { any192: false, any512: false, maskable512: false };
for (const ic of mf.icons) {
  const f = join(root, ic.src); const ex = existsSync(f);
  note(`icon file exists: ${ic.src}`, ex);
  if (!ex || ic.type !== 'image/png') continue;
  const s = pngSize(f); const [dw, dh] = ic.sizes.split('x').map(Number);
  note(`icon ${ic.src} real size equals declared ${ic.sizes}`, s && s.w === dw && s.h === dh, s ? `${s.w}x${s.h}` : 'not a PNG');
  const purposes = (ic.purpose || 'any').split(/\s+/);
  if (purposes.includes('any') && dw === 192) have.any192 = true;
  if (purposes.includes('any') && dw === 512) have.any512 = true;
  if (purposes.includes('maskable') && dw >= 512) have.maskable512 = true;
}
note('icon 192x192 purpose any', have.any192); note('icon 512x512 purpose any', have.any512); note('icon 512x512 purpose maskable', have.maskable512);
note('apple-touch-icon.png is 180x180', pngSize(join(root, 'assets/icons/apple-touch-icon.png'))?.w === 180);
note('no icon mixes "any maskable" in one entry (Lighthouse advises separate icons)', !mf.icons.some((i) => /any\s+maskable|maskable\s+any/.test(i.purpose || '')));
for (const s of mf.screenshots || []) { const f = join(root, s.src); note(`screenshot exists: ${s.src}`, existsSync(f)); }
note('screenshots cover narrow and wide form factors (richer install UI)', ['narrow', 'wide'].every((ff) => (mf.screenshots || []).some((s) => s.form_factor === ff)));
for (const s of mf.shortcuts || []) note(`shortcut inside scope: ${s.name}`, new URL(s.url, 'http://h/').pathname.startsWith(scope.pathname));

// service worker
const sw = readFileSync(join(root, 'sw.js'), 'utf8'); const pre = readFileSync(join(root, 'precache-manifest.js'), 'utf8');
note('sw.js has a fetch handler (required for installability)', /addEventListener\('fetch'/.test(sw));
note('sw.js lives at the site root, so its scope covers manifest scope', existsSync(join(root, 'sw.js')));
note('sw.js registered with a relative URL', /serviceWorker\.register\('sw\.js'\)/.test(readFileSync(join(root, 'src/app.js'), 'utf8')));
note('offline.html exists', existsSync(join(root, 'offline.html')));
note('offline.html is in the precache list', /"offline\.html"/.test(pre));
note('index.html and manifest are in the precache list', /"index\.html"/.test(pre) && /"manifest\.webmanifest"/.test(pre));
note('sw.js navigation fallback chain ends in offline.html', /caches\.match\('offline\.html'\)/.test(sw));
const precache = pre.match(/self\.ALEF_PRECACHE = \[([\s\S]*?)\];/)?.[1] || "";
const listed = [...precache.matchAll(/^ "([^"]+)",?$/gm)].map((m) => m[1]);
const missing = listed.filter((f) => !existsSync(join(root, f)));
note('every precache entry exists on disk', missing.length === 0, missing.length ? missing.slice(0, 5).join(', ') : `${listed.length} entries`);
note('offline.html is self-contained (no external requests)', !/(src|href)="https?:/.test(readFileSync(join(root, 'offline.html'), 'utf8')));
const headers = existsSync(join(root, '_headers')) ? readFileSync(join(root, '_headers'), 'utf8') : '';
note('_headers: sw.js and precache-manifest.js are no-cache', /\/sw\.js\n\s+Cache-Control: no-cache/.test(headers) && /\/precache-manifest\.js\n\s+Cache-Control: no-cache/.test(headers));
note('_headers: manifest served as application/manifest+json', /manifest\+json/.test(headers));

// ---- browser checks
if (!args.includes('--no-browser')) {
  const require = createRequire(import.meta.url); let chromium;
  for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
  if (!chromium) note('browser checks', true, 'playwright not found, skipped', 'NOTE');
  else {
    const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r)); const base = `http://localhost:${server.address().port}/`;
    const browser = await chromium.launch({ executablePath: process.env.QA_CHROME || undefined });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
    await ctx.addInitScript(() => localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })));
    const page = await ctx.newPage(); await page.goto(base, { waitUntil: 'load' });
    try { await page.waitForSelector('body[data-ready="1"]', { timeout: 30000 }); } catch { /* reported below */ }
    const reg = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return { scope: r.scope, active: !!r.active }; });
    note('service worker active', reg.active); note('SW scope equals the site root', reg.scope === base, reg.scope);
    const keys = await page.evaluate(async () => { const out = {}; for (const k of await caches.keys()) out[k] = (await (await caches.open(k)).keys()).length; return out; });
    const shell = Object.entries(keys).find(([k]) => k.startsWith('alef-shell-'));
    note('shell cache filled with the precache list', shell && shell[1] >= listed.length - 1, shell ? `${shell[0]}: ${shell[1]} of ${listed.length}` : 'none');
    const cdp = await ctx.newCDPSession(page); await cdp.send('Page.enable');
    let inst = null; try { inst = await cdp.send('Page.getInstallabilityErrors'); } catch (e) { inst = { error: e.message.split('\n')[0] }; }
    note("Chromium's installability errors (CDP) are empty", inst.installabilityErrors && inst.installabilityErrors.length === 0, JSON.stringify(inst.installabilityErrors ?? inst.error));
    let mfp = null; try { mfp = await cdp.send('Page.getAppManifest'); } catch { /* ignore */ }
    if (mfp) { note('Chromium parsed the manifest without errors', !(mfp.errors || []).length, (mfp.errors || []).map((e) => e.message).join('; ')); }
    // offline: with the SW controlling, reload a route and a never-visited deep link; both must show the app, an unknown asset must fail cleanly
    await ctx.setOffline(true);
    for (const r of ['', '#/learn', '#/read/bless-priestly-1']) {
      const ok = await page.goto(base + r, { waitUntil: 'load' }).then(() => page.waitForSelector('body[data-ready="1"]', { timeout: 15000 }).then(() => true, () => false), () => false);
      note(`offline reload shows the app: /${r}`, ok);
    }
    const off = await page.evaluate(() => fetch('offline.html').then((r) => r.status + ' ' + r.headers.get('content-type'), () => 'failed'));
    note('offline.html is served from cache while offline', /^200 text\/html/.test(off), off);
    await ctx.setOffline(false);
    note('limits', true, 'headless Chromium on localhost; no real install prompt, no iOS/Safari "Add to Home Screen", no maskable-safe-zone rendering check', 'NOTE');
    await browser.close(); server.close();
  }
}
const fails = results.filter((r) => !r.ok);
const out = resolve(root, arg('--out', 'docs/perf/pwa-audit.json')); mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ when: new Date().toISOString(), passed: results.filter((r) => r.ok).length, failed: fails.length, results }, null, 1) + '\n');
console.log(`${results.length - fails.length} ok, ${fails.length} FAIL`);
process.exit(fails.length ? 1 : 0);
