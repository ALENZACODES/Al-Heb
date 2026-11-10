// End-to-end check of the Talk language pack in headless Chromium, under the site's real Content-Security-Policy.
// Opens #/talk, checks that nothing of the pack is fetched before the learner asks, downloads one pack with progress,
// translates lines the stored lines do not hold, reloads and checks the pack is still on the device, then goes offline.
// Usage: node tools/talk/nmt/e2e-talk.mjs [he-en|en-he]
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { openApp } from '../../camera-translate/e2e-camera.mjs';

/** A bare static server for a pack-host folder (tools/talk/nmt/export-host.mjs), allowing cross-origin reads as GitHub Pages does. */
export function servePackHost(dir) {
  return createServer((req, res) => {
    const rel = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\]|\.\.)+/, '');
    const file = join(dir, rel);
    if (!file.startsWith(dir) || !existsSync(file)) { res.writeHead(404, { 'access-control-allow-origin': '*' }); res.end(); return; }
    const buf = readFileSync(file);
    res.writeHead(200, { 'access-control-allow-origin': '*', 'content-type': file.endsWith('.json') ? 'application/json' : 'application/octet-stream', 'content-length': buf.length }); res.end(buf);
  });
}

/** Chromium flags that give a software WebGPU adapter where there is no graphics card (correctness only: it is far slower than a real one). */
export const SOFTWARE_GPU = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader', '--ignore-gpu-blocklist'];

export async function runTalk({ direction = 'he-en', lines = null, timeout = 240000, launchArgs = null, speedCheck = false, acceptSlowGpu = false, packHost = null } = {}) {
  // the stand-in pack host is on this machine; Chromium asks permission before a page may read from the local network, so the test turns that check off
  const args = [...(launchArgs || []), ...(packHost ? ['--disable-features=LocalNetworkAccessChecks'] : [])];
  const { server, browser, page, base, errors, reqs, posts } = await openApp(args.length ? { launchArgs: args } : {});
  if (launchArgs) await page.addInitScript((slow) => { globalThis.__alefSoftwareGraphics = true; if (slow) globalThis.__alefGpuSlowMs = 1e9; }, acceptSlowGpu);
  // packHost: this copy of the site carries no packs (as a deploy built with --packs-remote); they come from another address
  let host = null; let hostBase = '';
  if (packHost) {
    host = servePackHost(packHost); await new Promise((r) => host.listen(0, '127.0.0.1', r));
    hostBase = `http://127.0.0.1:${host.address().port}/_nmt/`;
    await page.route(/\/assets\/vendor\/(_nmt\/|_ort\/[^?]*\.(wasm|bin)(\?|$))/, (route) => (new URL(route.request().url()).origin === base ? route.fulfill({ status: 404, body: '' }) : route.continue()));
    await page.route('**/data/talk/pack-host.json', (route) => route.fulfill({ json: { hosts: [hostBase] } }));
  }
  const say = lines || (direction === 'he-en' ? ['הכלב שלנו ברח אתמול.', 'איפה המעלית?'] : ['Our dog ran away yesterday.', 'Where is the elevator?']);
  const ask = async (text) => {
    await page.waitForFunction(() => !document.querySelector('.talk-pane-me')?.hasAttribute('aria-busy'));
    await page.evaluate(() => { document.querySelector('.talk-source').textContent = ''; });
    await page.fill('.talk-input textarea', text); await page.click('.talk-input .btn');
    await page.waitForFunction((t) => document.querySelector('.talk-source')?.textContent === t && !document.querySelector('.talk-pane-me')?.hasAttribute('aria-busy'), text, { timeout: 60000 });
    return page.evaluate(() => ({ translation: document.querySelector('.talk-translation')?.textContent || '', badge: document.querySelector('.talk-badge')?.hidden ? '' : document.querySelector('.talk-badge')?.textContent, note: document.querySelector('.talk-pane-me p.muted')?.hidden ? '' : document.querySelector('.talk-pane-me p.muted')?.textContent }));
  };
  try {
    await page.goto(`${base}/#/talk`, { waitUntil: 'load' });
    await page.waitForSelector(`.talk-pack [data-pack="${direction}"]`);
    await page.waitForFunction(() => /MB to download/.test(document.querySelector('.talk-pack')?.textContent || ''));
    const packText = await page.textContent('.talk-pack');
    const before = await ask(say[0]);
    const packRequestsBefore = reqs.filter((u) => /\/assets\/vendor\/_(nmt|ort)\//.test(u) && !u.endsWith('manifest.json')).length;
    const progress = [];
    await page.exposeFunction('__seen', (t) => { progress.push(t); });
    await page.evaluate(() => { const row = document.querySelector('.talk-pack'); new MutationObserver(() => { const p = row.querySelector('progress:not([hidden])'); if (p) window.__seen(p.value); }).observe(row, { subtree: true, childList: true, characterData: true, attributes: true }); });
    const t0 = Date.now();
    await page.click(`.talk-pack [data-pack="${direction}"]`);
    await page.waitForFunction(() => /is ready\. It works offline|could not start|download stopped/.test(document.querySelector('.talk-pack')?.textContent || ''), null, { timeout });
    const packNote = await page.textContent('.talk-pack [role=status]');
    if (process.env.ALEF_E2E_DEBUG) console.error('note:', packNote, errors.slice(-3), 'kept after download:', await page.evaluate(async () => (await (await caches.open('alef-talk-pack-v1')).keys()).map((k) => k.url.split('/').slice(-2).join('/'))));
    const downloadMs = Date.now() - t0;
    const results = [];
    for (const l of say) { const t = Date.now(); results.push({ line: l, ...(await ask(l)), ms: Date.now() - t }); }
    // with a slow software adapter accepted, wait for the background check to hand over to the graphics card, then ask again on it
    let onGpu = null;
    if (acceptSlowGpu) {
      const row = () => page.evaluate((d) => document.querySelector(`.talk-pack [data-pack="${d}"]`)?.closest('.talk-pack-row')?.dataset.engine || '', direction);
      for (let i = 0; i < 60; i++) { const t = Date.now(); const r = await ask(say[0]); onGpu = { ...r, ms: Date.now() - t, engine: await row() }; if (onGpu.engine === 'webgpu') break; await page.waitForTimeout(5000); }
    }
    const engine = await page.evaluate((d) => { const row = document.querySelector(`.talk-pack [data-pack="${d}"]`)?.closest('.talk-pack-row'); return { engine: row?.dataset.engine || '', gpu: row?.dataset.gpu || '' }; }, direction);
    let speed = null;
    if (speedCheck) { await page.click('.talk-pack button:has-text("Check Translation Speed")'); await page.waitForFunction(() => /In use:|did not finish/.test(document.querySelector('.talk-pack [role=status]')?.textContent || ''), null, { timeout }); speed = await page.textContent('.talk-pack [role=status]'); }
    const gpuFetched = { runtime: reqs.some((u) => /ort\.webgpu\.min\.mjs/.test(u)), plainRuntime: reqs.some((u) => /ort\.wasm\.min\.mjs/.test(u)), graphs: reqs.filter((u) => /\.gpu\.onnx/.test(u)).length };
    const cache = await page.evaluate(async () => { const c = await caches.open('alef-talk-pack-v1'); const keys = await c.keys(); let bytes = 0; for (const k of keys) bytes += Number((await c.match(k)).headers.get('content-length') || 0); return { files: keys.length, bytes, names: await caches.keys() }; });
    // a new visit: the pack is already on the device and loads without a download
    const partsFetched = reqs.filter((u) => /\.p\d+\.bin/.test(u)).length;
    await page.reload({ waitUntil: 'load' });
    try { await page.waitForFunction(() => /on this device and ready/.test(document.querySelector('.talk-pack')?.textContent || ''), null, { timeout: 120000 }); }
    catch (e) { const keys = await page.evaluate(async () => (await (await caches.open('alef-talk-pack-v1')).keys()).map((k) => k.url)); throw new Error(`after a reload the pack did not come up: ${await page.textContent('.talk-pack')} | kept: ${keys.join(' , ')}`); }
    const refetched = reqs.filter((u) => /\.p\d+\.bin/.test(u)).length - partsFetched;
    const again = await ask(say[0]);
    const origins = [...new Set(reqs.map((u) => new URL(u).origin))];
    return { hostBase, fromHost: reqs.filter((u) => hostBase && u.startsWith(hostBase.replace('/_nmt/', '/'))).length, packText, before, packRequestsBefore, progress, packNote, downloadMs, results, onGpu, engine, speed, gpuFetched, cache, refetched, again, errors, posts, externalOrigins: origins.filter((o) => o !== base && !o.startsWith('blob:') && o !== 'null') };
  } finally { await browser.close(); server.close(); host?.close(); }
}

/** The Camera Translator with the Hebrew to English pack on the device: a sign outside the sign list is translated as a whole line. */
export async function runCameraWithPack({ images, timeout = 240000 }) {
  const { server, browser, page, base, errors, reqs, posts } = await openApp();
  try {
    await page.goto(`${base}/#/talk`, { waitUntil: 'load' });
    await page.waitForFunction(() => /MB to download/.test(document.querySelector('.talk-pack')?.textContent || ''));
    await page.click('.talk-pack [data-pack="he-en"]');
    await page.waitForFunction(() => /is ready\. It works offline/.test(document.querySelector('.talk-pack')?.textContent || ''), null, { timeout });
    await page.evaluate(() => { location.hash = '#/camera'; });
    await page.waitForSelector('.camera-tr[data-pack="ready"]', { timeout: 60000 });
    const packNote = await page.textContent('.camera-pack');
    const out = [];
    for (const image of images) {
      await page.evaluate(() => { const o = document.querySelector('.camera-out'); if (o) o.dataset.done = ''; });
      await page.setInputFiles('.camera-tr input[type=file]:not([capture])', image);
      await page.waitForSelector('.camera-out[data-done="1"]', { timeout: 120000 });
      const lines = await page.evaluate(() => [...document.querySelectorAll('.camera-region-btn')].map((b) => b.textContent));
      let detail = null;
      if (lines.length) { await page.click('.camera-region-btn'); await page.waitForFunction(() => /English:|Sacred|No English/.test(document.querySelector('.camera-detail')?.textContent || '')); detail = await page.textContent('.camera-detail'); }
      out.push({ image: image.split('/').pop(), lines, detail });
    }
    const origins = [...new Set(reqs.map((u) => new URL(u).origin))];
    return { packNote, out, errors: errors.filter((e) => !/Estimating resolution/.test(e)), posts, externalOrigins: origins.filter((o) => o !== base && !o.startsWith('blob:') && o !== 'null') };
  } finally { await browser.close(); server.close(); }
}

if (process.argv[1] && process.argv[1].endsWith('e2e-talk.mjs')) {
  if (process.argv[2] === 'camera') console.log(JSON.stringify(await runCameraWithPack({ images: process.argv.slice(3) }), null, 1));
  else {
    const gpu = process.argv.includes('--software-gpu');
    const r = await runTalk({ direction: process.argv[2] || 'he-en', launchArgs: gpu ? SOFTWARE_GPU : null, speedCheck: process.argv.includes('--speed'), acceptSlowGpu: process.argv.includes('--accept-slow'), packHost: process.argv.includes('--host') ? process.argv[process.argv.indexOf('--host') + 1] : null });
    console.log(JSON.stringify({ ...r, progress: `${r.progress.length} updates, last ${r.progress[r.progress.length - 1]}` }, null, 1));
  }
}
