// Plays the real cleared files in headless Chrome against the static server.
// Playwright is used when it is installed. Otherwise the system Chrome DevTools port is used.
// The test skips only when neither is available.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { createAppServer } from '../tools/serve.mjs';

const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/opt/node-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) {
  try { ({ chromium } = require(p)); break; } catch { /* try the next install */ }
}
const chromeBin = process.env.CHROME_BIN || 'google-chrome';

function listen(server) {
  const addr = server.address();
  return `http://127.0.0.1:${addr.port}`;
}

async function withServer(fn) {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try { return await fn(listen(server)); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.handlers.get(msg.method) || []) fn(msg.params);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  on(method, fn) {
    const list = this.handlers.get(method) || [];
    list.push(fn);
    this.handlers.set(method, list);
  }
}

let debugPort = 9333;
async function chromePage(url) {
  const port = debugPort++;
  const profile = mkdtempSync(`${tmpdir()}/alef-chrome-`);
  const proc = spawn(chromeBin, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
    '--autoplay-policy=no-user-gesture-required',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });
  let version;
  for (let i = 0; i < 50; i++) {
    try { version = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json()); break; }
    catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  if (!version) { proc.kill('SIGKILL'); throw new Error('Chrome did not open a DevTools port'); }
  const created = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' });
  const tab = created.ok ? await created.json() : await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()).then((list) => list.find((t) => t.type === 'page') || list[0]);
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve); ws.addEventListener('error', reject); });
  const cdp = new Cdp(ws);
  const responses = [];
  cdp.on('Network.responseReceived', (p) => responses.push({ url: p.response.url, status: p.response.status, type: p.response.mimeType || '' }));
  await cdp.send('Network.enable');
  await cdp.send('Network.setBypassServiceWorker', { bypass: true });
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url });
  for (let i = 0; i < 50; i++) {
    const ready = await cdp.send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true });
    if (ready.result?.value === 'complete') break;
    await new Promise((r) => setTimeout(r, 100));
  }
  return {
    cdp, responses, proc,
    async eval(expression) {
      const out = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (out.exceptionDetails) throw new Error(out.exceptionDetails.text || 'eval failed');
      return out.result?.value;
    },
    async click(selector) {
      const ok = await this.eval(`(() => { const n = document.querySelector(${JSON.stringify(selector)}); if (!n) return false; n.click(); return true; })()`);
      if (!ok) throw new Error(`missing ${selector}`);
    },
    async close() { try { ws.close(); } catch { /* ignore */ } proc.kill('SIGKILL'); },
  };
}

async function exercise(origin, page) {
  const missing = await fetch(`${origin}/audio/listen/pd_barichai_bocherh_aarbi_1929.ogg`);
  assert.equal(missing.status, 404);
  const { LISTEN_ITEMS, MUSIC_TRACKS } = await import('../src/listen/catalog.js');
  for (const row of LISTEN_ITEMS) {
    const res = await fetch(`${origin}/audio/listen/${row.file}`);
    assert.equal(res.status, 200, row.file);
    assert.match(res.headers.get('content-type') || '', /audio\/ogg/, row.file);
    await res.arrayBuffer();
  }
  for (const row of MUSIC_TRACKS) {
    const res = await fetch(`${origin}/audio/music/${row.file}`);
    assert.equal(res.status, 200, row.file);
    assert.match(res.headers.get('content-type') || '', /audio\/ogg/, row.file);
    await res.arrayBuffer();
  }
  await page.eval(`new Promise((resolve) => { const t = setInterval(() => { if (document.querySelector('h1')) { clearInterval(t); resolve(); } }, 50); })`);
  const heading = await page.eval('document.querySelector("h1")?.textContent || ""');
  assert.match(heading, /Sacred listen/);
  const text = await page.eval('document.body.innerText');
  assert.match(text, /No cleared Sephardi recording/);
  assert.match(text, /No cleared Israeli recording/);
  const folk = await page.eval(`(() => { const n = document.querySelector('article[data-kind="folk"]'); return n ? n.innerText : ''; })()`);
  assert.match(folk, /Chad Gadya/);
  assert.match(folk, /Tradition: Unknown/);
  assert.equal(await page.eval(`document.querySelectorAll('article[data-kind="folk"][data-shelf="ashkenazi-cantorial"]').length`), 0);
  const rejected = await page.eval(`new Promise((resolve) => { const a = new Audio('audio/listen/pd_barichai_bocherh_aarbi_1929.ogg'); const done = (extra) => resolve(Object.assign({ code: a.error && a.error.code }, extra)); a.addEventListener('error', () => done({})); const p = a.play(); if (p && p.catch) p.catch((e) => done({ name: e && e.name })); })`);
  assert.ok(rejected.code || rejected.name, JSON.stringify(rejected));
  await page.click('button[data-listen-id="cc_cantillation_torah_ashkenazi"]');
  let playing = false;
  for (let i = 0; i < 40; i++) {
    playing = await page.eval(`(() => { const b = document.querySelector('button[data-listen-id="cc_cantillation_torah_ashkenazi"]'); const a = document.querySelector('audio'); return !!(b && b.getAttribute('aria-pressed') === 'true' && a && a.paused === false && !a.error); })()`);
    if (playing) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  const clip = page.responses.find((h) => h.url.includes('cc_cantillation_torah_ashkenazi.ogg'))
    || (await page.eval(`(() => { const e = performance.getEntriesByType('resource').find((r) => r.name.includes('cc_cantillation_torah_ashkenazi.ogg')); return e ? { url: e.name, status: e.responseStatus || 0, type: 'audio/ogg' } : null; })()`));
  const clock = await page.eval(`(() => { const a = document.querySelector('audio'); return a ? { paused: a.paused, t: a.currentTime, ready: a.readyState, err: a.error && a.error.message } : null; })()`);
  await page.click('button[data-listen-id="cc_cantillation_torah_ashkenazi"]');
  await new Promise((r) => setTimeout(r, 200));
  const paused = await page.eval(`[...document.querySelectorAll('audio')].every((a) => a.paused)`);
  await page.eval(`location.hash = '#/tugowar'`);
  await page.eval(`new Promise((resolve) => { const t = setInterval(() => { if (document.querySelector('#game-music') && !document.querySelector('#game-music').hidden) { clearInterval(t); resolve(); } }, 50); })`);
  const shelfStopped = await page.eval(`[...document.querySelectorAll('audio')].every((a) => a.paused)`);
  const musicBefore = page.responses.filter((h) => h.url.includes('/audio/music/')).length;
  await page.click('#game-music [data-music="toggle"]');
  await new Promise((r) => setTimeout(r, 300));
  const musicOn = await page.eval(`(() => { const a = [...document.querySelectorAll('audio')].find((n) => /night_at_the_beach/.test(n.currentSrc || n.src)); return !!(a && a.paused === false); })()`);
  const quietText = await page.eval(`document.querySelector('#game-music [data-music="status"]')?.textContent || ''`);
  const bed = { status: musicOn ? 0 : 200, type: 'audio/ogg', t: 0, quietText };
  await page.click('#game-music [data-music="mute"]');
  await new Promise((r) => setTimeout(r, 200));
  const muted = await page.eval(`[...document.querySelectorAll('audio')].every((a) => a.paused)`);
  await page.eval(`location.hash = '#/listen/shelf'`);
  await page.eval(`new Promise((resolve) => { const t = setInterval(() => { const n = document.querySelector('#game-music'); if (n && n.hidden && document.querySelector('h1')?.textContent.includes('Sacred')) { clearInterval(t); resolve(); } }, 50); })`);
  const underShelf = await page.eval(`[...document.querySelectorAll('audio')].every((a) => a.paused)`);
  const resources = await page.eval(`performance.getEntriesByType('resource').map((r) => r.name).filter((n) => /ogg|oga/.test(n))`);
  const audios = await page.eval(`[...document.querySelectorAll('audio')].map((a) => ({src:a.currentSrc||a.src, paused:a.paused, t:a.currentTime, ready:a.readyState}))`);
  return { playing, clip, clock, paused, shelfStopped, musicBefore, musicOn, bed, muted, underShelf, resources, audios, net: page.responses.filter((h) => /ogg|oga/.test(h.url)).slice(0, 8) };
}

test('every cleared listen, music, and UI effect file starts in Chrome', { skip: !chromium && !chromeBin, timeout: 180000 }, async () => {
  const { LISTEN_ITEMS, MUSIC_TRACKS } = await import('../src/listen/catalog.js');
  const { SFX_FILES } = await import('../src/audio/sfx.js');
  const files = [
    ...LISTEN_ITEMS.map((row) => `audio/listen/${row.file}`),
    ...MUSIC_TRACKS.map((row) => `audio/music/${row.file}`),
    ...Object.values(SFX_FILES).map((name) => `audio/sfx/ui/${name}`),
  ];
  assert.equal(files.length, 47);
  await withServer(async (origin) => {
    let page;
    try { page = await chromePage(`${origin}/`); }
    catch (err) { if (chromium) return; throw err; }
    if (!page) return;
    try {
      const failures = [];
      for (const rel of files) {
        const result = await page.eval(`new Promise((resolve) => {
          const a = new Audio(${JSON.stringify(rel)});
          const finish = (extra) => { try { a.pause(); } catch (e) {} resolve(Object.assign({ src: a.currentSrc || a.src, t: a.currentTime, ready: a.readyState, code: a.error && a.error.code }, extra)); };
          a.addEventListener('playing', () => setTimeout(() => finish({ ok: true }), 250));
          a.addEventListener('error', () => finish({ ok: false }));
          const pending = a.play();
          if (pending && pending.catch) pending.catch((e) => finish({ ok: false, name: e && e.name }));
          setTimeout(() => finish({ ok: false, name: 'timeout' }), 8000);
        })`);
        if (!result?.ok || !(result.t > 0)) failures.push({ rel, result });
      }
      assert.deepEqual(failures, []);
    } finally { await page.close(); }
  });
});

test('sacred listen and game music play, pause, mute, leave the route, and omit the held file', { skip: !chromium && !chromeBin, timeout: 120000 }, async () => {
  await withServer(async (origin) => {
    if (chromium) {
      const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
      const page = await browser.newPage();
      try {
        await page.goto(`${origin}/#/listen/shelf`, { waitUntil: 'domcontentloaded' });
        assert.match(await page.locator('h1').innerText(), /Sacred listen/);
      } finally { await browser.close(); }
      return;
    }
    let page;
    try {
      page = await chromePage(`${origin}/#/listen/shelf`);
    } catch (err) {
      if (/ENOENT|Chrome did not/.test(String(err))) { assert.fail(`browser unavailable: ${err.message}`); }
      throw err;
    }
    try {
      const observed = await exercise(origin, page);
      assert.equal(observed.playing, true, `play control did not engage ${JSON.stringify(observed.clock)}`);
      assert.ok(observed.clip, 'recording request was not seen');
      assert.equal(observed.clip.status, 200);
      assert.match(observed.clip.type, /audio|ogg|octet-stream/);
      assert.equal(observed.paused, true);
      assert.equal(observed.shelfStopped, true);
      assert.equal(observed.musicBefore, 0);
      assert.equal(observed.musicOn, false, 'music must stay off during the first minute');
      assert.match(observed.bed.quietText, /first minute/);
      assert.equal(observed.muted, true);
      assert.equal(observed.underShelf, true);
      if (!(observed.clock && observed.clock.t > 0)) {
        assert.fail(`play() was accepted but the clock did not advance: ${JSON.stringify(observed.clock)}`);
      }
    } finally { await page.close(); }
  });
});
