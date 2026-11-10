// Range-request / offline-clip probe. Real headless Chrome + a static server that DOES honour Range (like a real host; tools/serve.mjs does not),
// against the shipped files. It records what Chrome actually sent for a word clip, whether sw.js cached it, and whether it plays offline.
// Headless Chrome has no audio output: "plays" means the media element reached 'ended' (or 'playing'), not that anything was heard.
// Usage: node tools/qa/sw-range.mjs [--json out.json] [--word תֵּה] [--clip audio/m/israeli/word/il07-w6.mp3]   (QA_CHROME=/path/to/chrome)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MIME } from '../serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
if (!chromium) { console.error('playwright not found'); process.exit(2); }
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const WORD = arg('--word', 'תֵּה');
const CLIP = arg('--clip', 'audio/m/israeli/word/il07-w6.mp3');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const log = []; // every request the server saw for the clip: {method, range, status}
let online = true;
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://x'); const rel = decodeURIComponent(url.pathname);
    let file = normalize(join(root, rel)); if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    let st = await stat(file).catch(() => null); if (st?.isDirectory()) { file = join(file, 'index.html'); st = await stat(file).catch(() => null); }
    if (!st) { if (extname(rel)) { res.writeHead(404); return res.end(); } file = join(root, 'index.html'); }
    const body = await readFile(file); const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream';
    const h = { 'content-type': type, 'cache-control': 'no-cache', 'accept-ranges': 'bytes' };
    const range = req.headers.range; let status = 200;
    if (range && /\.(mp3|m4a|ogg|wav)$/i.test(rel)) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (m) { const a = m[1] === '' ? body.length - +m[2] : +m[1]; const b = m[1] === '' || m[2] === '' ? body.length - 1 : Math.min(+m[2], body.length - 1);
        if (a > b || a >= body.length) { res.writeHead(416, { 'content-range': `bytes */${body.length}` }); return res.end(); }
        status = 206; h['content-range'] = `bytes ${a}-${b}/${body.length}`; h['content-length'] = b - a + 1;
        if (rel.endsWith(CLIP)) log.push({ method: req.method, range, status });
        res.writeHead(206, h); return res.end(body.subarray(a, b + 1)); }
    }
    if (rel.endsWith(CLIP)) log.push({ method: req.method, range: range || null, status });
    h['content-length'] = body.length; res.writeHead(200, h); res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.QA_CHROME || undefined });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'en-CA' });
await ctx.addInitScript(() => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true, congregation: 'israeli', voice: 'm' }));
  window.__media = [];
  const P = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const rec = { src: this.currentSrc || this.src, ended: false, error: null }; window.__media.push(rec);
    this.addEventListener('ended', () => { rec.ended = true; }); this.addEventListener('error', () => { rec.error = (this.error && this.error.code) || 'error'; });
    return P.apply(this, arguments);
  };
});
const page = await ctx.newPage(); const bagFailed = []; page.on('requestfailed', (r) => bagFailed.push(r.url().replace(base, '/')));
ctx.on('serviceworker', (w) => { w.on('console', (m) => console.log('SW console:', m.text())); });
page.on('pageerror', (e) => console.log('pageerror', String(e).slice(0, 200)));
const R = { generatedBy: 'tools/qa/sw-range.mjs', browser: `chromium ${browser.version()}`, clip: CLIP, steps: [] };
const rec = (name, v) => { R.steps.push({ name, ...v }); console.log(name, JSON.stringify(v)); };
const clipCached = () => page.evaluate(async (c) => { const out = []; for (const k of await caches.keys()) { const cc = await caches.open(k); for (const r of await cc.keys()) if (r.url.endsWith(c)) { const res = await cc.match(r); out.push({ cache: k, status: res.status, bytes: (await res.arrayBuffer()).byteLength, contentRange: res.headers.get('content-range') }); } } return out; }, CLIP);
const media = () => page.evaluate(() => window.__media);
const waitReady = () => page.waitForSelector('body[data-ready="1"]', { timeout: 15000 }).catch(() => {});

await page.goto(base); await waitReady();
await page.waitForFunction(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && r.active && navigator.serviceWorker.controller); }, null, { timeout: 20000 });
rec('sw controlling', { ok: true });
// Data fetched before the worker took control (first load) is not in any cache; one more online load lets sw.js see and cache the lazy data files, like a learner's second visit.
await page.reload(); await waitReady(); await sleep(1500);
await page.goto(base + '#/words/trace?any=1&word=' + encodeURIComponent(WORD)); await waitReady(); await sleep(800);
const btn = page.locator('[data-audio="word/il07-w6"], [data-audio^="word/"]').first();
rec('hear button present', { count: await page.locator('[data-audio^="word/"]').count() });
await btn.click(); await sleep(2000);
rec('first play (online)', { media: await media(), serverSaw: [...log] });
await sleep(1500);
rec('cache after first play', { entries: await clipCached() });
// offline: drop the network for the page; the server stays up but is marked unreachable
rec('data caches', await page.evaluate(async () => { const o = {}; for (const k of await caches.keys()) o[k] = (await (await caches.open(k)).keys()).filter((r) => /wordtrace|letters\.json|manifest/.test(r.url)).map((r) => new URL(r.url).pathname); return o; }));
const before = log.length; await ctx.setOffline(true);
await page.reload(); await waitReady(); await sleep(800);
await page.evaluate(() => { window.__media.length = 0; });
await page.locator('[data-audio^="word/"]').first().click().catch(() => {}); await sleep(2000);
rec('offline page state', { buttons: await page.locator('[data-audio^="word/"]').count(), url: page.url().replace(base, '/'), main: (await page.locator('#main').first().innerText().catch(() => '')).slice(0, 200), failed: bagFailed.slice(0, 6) });
rec('offline replay', { media: await media(), newServerRequests: log.length - before });
await browser.close(); server.close();
const jsonOut = arg('--json', null); if (jsonOut) await writeFile(jsonOut, JSON.stringify(R, null, 1));
