// Performance budget tool (prong P074 follow-on). Cold load on emulated slow 4G with a 4x CPU slowdown, via Playwright + CDP, headless Chromium.
// This is emulation on one Linux machine: relative numbers (bytes, request counts, ordering of events) are solid, absolute milliseconds are only
// indicative, and nothing here is a real phone. A budget is derived from a measured baseline, never invented.
// Usage: node tools/qa/perf.mjs [--quick] [--runs 3] [--net slow4g|fast4g|none] [--cpu 4] [--routes /,/vocab] [--out docs/perf]
//                                [--block-manifest] (abort data/audio/manifest.json and the word shards in every load, to see the page without them) [--set-budget]   write docs/perf/budget.json from this run (baseline x 1.15, rounded up to 10 KB)
//   default   cold load of / (median of --runs) + the lazy audio-manifest comparison + the 5 heaviest routes (memory, DOM nodes)
//   --quick   cold load of / once, no manifest comparison, no heavy routes (used by tests/perf.test.js)
// Writes <out>/results.json. Exit 1 when JS bytes on first load of / exceed docs/perf/budget.json.
// Measured per load (all from the page's own Performance APIs plus CDP): first contentful paint, JS bytes transferred (script resources, headers included),
// total bytes, request count, time until body[data-ready=1], long tasks (>50 ms main-thread tasks: count, sum, max, total blocking time after FCP),
// whether data/audio/manifest.json was requested before or after FCP. Heavy routes add JS heap after a forced GC and DOM node count.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
if (!chromium) { console.error('playwright not found'); process.exit(2); }

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const quick = args.includes('--quick');
const runs = Number(arg('--runs', quick ? 1 : 3));
const netName = arg('--net', 'slow4g');
const cpu = Number(arg('--cpu', 4));
const outDir = resolve(root, arg('--out', 'docs/perf')); mkdirSync(outDir, { recursive: true });
// Lighthouse's "slow 4G" preset: 1.6 Mbit/s down, 750 kbit/s up, 150 ms RTT. "fast4g": 9 Mbit/s, 60 ms.
const NETS = { slow4g: { latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 }, fast4g: { latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (3 * 1024 * 1024) / 8 }, none: null };
if (!(netName in NETS)) { console.error('unknown --net ' + netName); process.exit(2); }
const HEAVY = ['/read/bless-priestly-1', '/vocab', '/vocab/themes', '/placement', '/progress', '/speak'];
const routes = arg('--routes') ? arg('--routes').split(',') : quick ? ['/'] : ['/', ...HEAVY];
const MANIFEST = 'data/audio/manifest.json';

const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.QA_CHROME || undefined });
const seed = () => { localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); };
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };

// One cold load: new context (empty HTTP cache, service worker blocked, so nothing is precached or reused).
async function load(route, { blockManifest = false, heavy = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await ctx.addInitScript(seed);
  await ctx.addInitScript(() => {
    window.__lt = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lt.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch { /* unsupported */ }
    try { performance.setResourceTimingBufferSize(3000); } catch { /* ignore */ }
  });
  if (blockManifest || args.includes('--block-manifest')) await ctx.route(/data\/audio\/manifest(-words-[a-z]+|-kind-word)?\.json/, (r) => r.abort());
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.split('\n')[0]));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  if (NETS[netName]) await cdp.send('Network.emulateNetworkConditions', { offline: false, ...NETS[netName] });
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await cdp.send('Performance.enable');
  const t0 = Date.now();
  await page.goto(base + '#' + route, { waitUntil: 'domcontentloaded', timeout: 120000 });
  let ready = true; try { await page.waitForSelector('body[data-ready="1"]', { timeout: 90000 }); } catch { ready = false; }
  const readyMs = Date.now() - t0;
  // settle: the audio manifest (1.3 MB) starts after first paint and takes several seconds on slow 4G, so wait for the app's own window.alefManifest promise (max 60 s), then 1 s more
  const manifestSettledMs = await page.evaluate(() => Promise.race([Promise.resolve(window.alefManifest).then(() => 1, () => 1), new Promise((r) => setTimeout(r, 60000))]).then(() => Math.round(performance.now())));
  await page.waitForTimeout(1000);
  // body[data-ready] is set before the lazy route module has mounted; record when <main> actually has content (more than the empty shell)
  let viewMs = null; try { await page.waitForFunction(() => (document.querySelector('main')?.getElementsByTagName('*').length || 0) > 4, null, { timeout: 40000 }); viewMs = Math.round(await page.evaluate(() => performance.now())); } catch { /* reported as viewMs null */ }
  await page.waitForTimeout(500);
  const m = await page.evaluate((MANIFEST) => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByType('paint').find((p) => p.name === 'first-contentful-paint')?.startTime ?? null;
    const res = performance.getEntriesByType('resource').map((r) => ({ url: r.name.replace(location.origin + '/', ''), type: r.initiatorType, start: r.startTime, end: r.responseEnd, size: r.transferSize || r.encodedBodySize || 0 }));
    const isJs = (r) => /\.m?js(\?|$)/.test(r.url);
    const doc = { size: nav?.transferSize || 0 };
    const sum = (l) => l.reduce((s, r) => s + r.size, 0);
    const js = res.filter(isJs); const css = res.filter((r) => /\.css(\?|$)/.test(r.url));
    const fonts = res.filter((r) => /\.(woff2?|ttf|otf)(\?|$)/.test(r.url)); const data = res.filter((r) => /^data\//.test(r.url)); const img = res.filter((r) => /\.(png|jpe?g|svg|webp|gif)(\?|$)/.test(r.url));
    const man = res.find((r) => r.url.split('?')[0] === MANIFEST);
    const lt = window.__lt || []; const after = lt.filter(([s]) => fcp == null || s >= fcp);
    const big = [...js].sort((a, b) => b.size - a.size).slice(0, 8).map((r) => [r.url, r.size]);
    const bigData = [...data].sort((a, b) => b.size - a.size).slice(0, 6).map((r) => [r.url, r.size]);
    return {
      fcp, domContentLoaded: nav?.domContentLoadedEventEnd ?? null, load: nav?.loadEventEnd ?? null,
      requests: res.length + 1, totalBytes: sum(res) + doc.size, docBytes: doc.size, jsBytes: sum(js), jsRequests: js.length, jsBytesBeforeFcp: fcp == null ? null : sum(js.filter((r) => r.end <= fcp)), jsRequestsBeforeFcp: fcp == null ? null : js.filter((r) => r.end <= fcp).length,
      cssBytes: sum(css), fontBytes: sum(fonts), dataBytes: sum(data), imageBytes: sum(img), biggestJs: big, biggestData: bigData,
      manifest: man ? { requestedAtMs: Math.round(man.start), finishedAtMs: Math.round(man.end), bytes: man.size, afterFcp: fcp != null && man.start >= fcp } : null,
      longTasks: { count: lt.length, totalMs: Math.round(lt.reduce((s, [, d]) => s + d, 0)), maxMs: Math.round(Math.max(0, ...lt.map(([, d]) => d))), tbtMs: Math.round(after.reduce((s, [, d]) => s + Math.max(0, d - 50), 0)) },
      domNodes: document.getElementsByTagName('*').length,
    };
  }, MANIFEST);
  const out = { route, ready, readyMs, manifestSettledMs, viewMs, mainNodes: await page.evaluate(() => document.querySelector('main')?.getElementsByTagName('*').length ?? 0), errors, ...m };
  if (heavy) {
    try {
      await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.collectGarbage');
      const hu = await cdp.send('Runtime.getHeapUsage'); const pm = await cdp.send('Performance.getMetrics'); const g = Object.fromEntries(pm.metrics.map((x) => [x.name, x.value]));
      out.jsHeapUsedMB = Math.round((hu.usedSize / 1048576) * 10) / 10; out.cdpNodes = g.Nodes; out.cdpListeners = g.JSEventListeners; out.layoutCount = g.LayoutCount; out.layoutSeconds = Math.round(g.LayoutDuration * 1000) / 1000;
    } catch (e) { out.heapError = e.message.split('\n')[0]; }
  }
  await ctx.close();
  return out;
}
const agg = (list, k) => median(list.map((x) => x[k]).filter((v) => v != null));
const summarize = (list) => {
  const o = { runs: list.length, ready: list.every((x) => x.ready), errors: [...new Set(list.flatMap((x) => x.errors))] };
  for (const k of ['fcp', 'readyMs', 'manifestSettledMs', 'viewMs', 'mainNodes', 'load', 'requests', 'totalBytes', 'jsBytes', 'jsRequests', 'jsBytesBeforeFcp', 'jsRequestsBeforeFcp', 'cssBytes', 'fontBytes', 'dataBytes', 'imageBytes', 'domNodes', 'jsHeapUsedMB', 'cdpNodes', 'cdpListeners', 'layoutCount']) { const v = agg(list, k); if (v != null) o[k] = Math.round(v * 10) / 10; }
  o.longTasks = { count: agg(list.map((x) => x.longTasks), 'count'), totalMs: agg(list.map((x) => x.longTasks), 'totalMs'), maxMs: agg(list.map((x) => x.longTasks), 'maxMs'), tbtMs: agg(list.map((x) => x.longTasks), 'tbtMs') };
  o.manifest = list[0].manifest; o.biggestJs = list[0].biggestJs; o.biggestData = list[0].biggestData; o.fcpAll = list.map((x) => Math.round(x.fcp ?? 0));
  return o;
};

const result = { when: new Date().toISOString(), chromium: browser.version(), network: netName, netDetail: NETS[netName], cpuSlowdown: cpu, runs, note: 'Emulated throttling in headless Chromium on a shared Linux machine, not a real phone; compare bytes and ordering, treat milliseconds as indicative.', routes: {} };
for (const route of routes) {
  const list = []; for (let i = 0; i < runs; i++) list.push(await load(route, { heavy: !quick }));
  result.routes[route] = summarize(list);
  const r = result.routes[route];
  console.log(`${route}: FCP ${r.fcp}ms; JS ${(r.jsBytes / 1024).toFixed(0)} KB in ${r.jsRequests} requests (${r.jsBytesBeforeFcp != null ? (r.jsBytesBeforeFcp / 1024).toFixed(0) + ' KB before FCP' : '?'}); total ${(r.totalBytes / 1024).toFixed(0)} KB; ready ${r.readyMs}ms, view mounted at ${r.viewMs}ms (manifest settled ${r.manifestSettledMs}ms); long tasks ${r.longTasks.count} (TBT ${r.longTasks.tbtMs}ms, max ${r.longTasks.maxMs}ms); DOM ${r.domNodes} (main ${r.mainNodes})${r.jsHeapUsedMB != null ? '; heap ' + r.jsHeapUsedMB + ' MB' : ''}${r.ready ? '' : ' NOT READY'}${r.errors.length ? ' ERRORS ' + r.errors.join('; ') : ''}`);
}
if (!quick && routes.includes('/')) {
  // lazy audio manifest effect: same cold load with data/audio/manifest.json aborted. If FCP and JS-before-FCP are unchanged the manifest is not on the critical path.
  const list = []; for (let i = 0; i < runs; i++) list.push(await load('/', { blockManifest: true }));
  const s = summarize(list); const w = result.routes['/'];
  result.manifestEffect = { withManifest: { fcp: w.fcp, readyMs: w.readyMs, viewMs: w.viewMs, settledMs: w.manifestSettledMs, totalBytes: w.totalBytes, longTasks: w.longTasks, manifest: w.manifest }, withoutManifest: { fcp: s.fcp, readyMs: s.readyMs, viewMs: s.viewMs, settledMs: s.manifestSettledMs, totalBytes: s.totalBytes, longTasks: s.longTasks, ready: s.ready }, deltaFcpMs: Math.round((w.fcp - s.fcp) * 10) / 10, deltaReadyMs: Math.round(w.readyMs - s.readyMs), manifestBytes: w.manifest?.bytes ?? null };
  console.log(`manifest effect: FCP ${w.fcp} vs ${s.fcp} ms without it (delta ${result.manifestEffect.deltaFcpMs}); ready ${w.readyMs} vs ${s.readyMs} ms; manifest ${w.manifest ? (w.manifest.bytes / 1024).toFixed(0) + ' KB requested at ' + w.manifest.requestedAtMs + 'ms, ' + (w.manifest.afterFcp ? 'after' : 'BEFORE') + ' FCP' : 'not requested'}`);
}
await browser.close(); server.close();

// ---- budget (JS bytes transferred on the first cold load of /)
const budgetFile = join(outDir, 'budget.json');
const first = result.routes['/'];
if (args.includes('--set-budget') && first) {
  const baseline = first.jsBytes; const budget = Math.ceil((baseline * 1.15) / 10240) * 10240;
  writeFileSync(budgetFile, JSON.stringify({ metric: 'JS bytes transferred (script resources incl. headers) until the audio manifest has settled (window.alefManifest) + 1 s, cold load of /, no service worker', baselineBytes: baseline, headroom: 1.15, budgetBytes: budget, measured: result.when, network: netName, jsRequests: first.jsRequests, rule: 'baseline x 1.15 rounded up to the next 10 KB; raise only with a written reason in docs/perf/PERF.md' }, null, 1) + '\n');
  console.log(`budget written: baseline ${baseline} B -> budget ${budget} B`);
}
let over = false;
if (first && existsSync(budgetFile)) { const b = JSON.parse(readFileSync(budgetFile, 'utf8')); result.budget = { budgetBytes: b.budgetBytes, measuredBytes: first.jsBytes, ok: first.jsBytes <= b.budgetBytes }; over = !result.budget.ok; console.log(`JS budget: ${first.jsBytes} B measured vs ${b.budgetBytes} B budget: ${over ? 'OVER' : 'ok'}`); }
writeFileSync(join(outDir, quick ? 'results-quick.json' : 'results.json'), JSON.stringify(result, null, 1));
process.exit(over || Object.values(result.routes).some((r) => !r.ready) ? 1 : 0);
