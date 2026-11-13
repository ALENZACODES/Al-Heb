#!/usr/bin/env node
// Hand-run check: the real vowel mark packs through the real app pages in headless Chromium.
//   1. put the built packs at assets/vendor/_packs/{nikud,phonemes}/ (gitignored; a link to alef-tools out/packs works)
//   2. node tools/alef-tools/pack-browser-check.mjs [out.json]
// It downloads each pack the way Settings does, adds marks to a few lines, traces a bare word in Word Trace, and removes the pack.
// Not part of the test tiers: the packs are about 600 MiB and are not in this repo. Needs Playwright with Chromium already present.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { createAppServer } from '../serve.mjs';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);
let chromium = null;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { chromium = require(p).chromium; break; } catch { /* next */ } }
if (!chromium) { console.error('Playwright is not here; this check needs it.'); process.exit(2); }
const server = createAppServer({ root: ROOT, prefix: '/' }); await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
await ctx.addInitScript((s) => { localStorage.setItem('alef:settings', JSON.stringify(s)); }, { onboarded: true, veilOptOut: true });
const page = await ctx.newPage(); const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const out = { note: 'Headless Chromium on a 2-core cloud machine, the real app page and the real pack served from the app folder. Not a phone.', chromium: browser.version() };
await page.goto(base + '#/words/trace?any=1'); await page.waitForSelector('[data-act=own-input]', { timeout: 30000 });
out.before = await page.evaluate(async () => { const s = await import('/src/nikud/service.js'); return { canRun: s.canRunPacks(), has: await s.hasPack('nikud'), total: await s.packInfo('nikud').then((i) => i.total).catch(() => null) }; });
console.log('before', JSON.stringify(out.before));
let t = Date.now();
out.download = await page.evaluate(async () => { const s = await import('/src/nikud/service.js'); let last = null, n = 0; try { const r = await s.getPack('nikud', { onProgress: (p) => { last = p; n++; } }); return { ok: true, progressCalls: n, bytes: last, ready: !!(r && r.ready), has: await s.hasPack('nikud') }; } catch (e) { return { ok: false, code: s.errorCode(e), message: String(e && e.message || e) }; } });
out.download.ms = Date.now() - t; console.log('download', JSON.stringify(out.download).slice(0, 600));
const LINES = ['שלום, מה שלומך היום?', 'אני רוצה להזמין קפה ועוגה, בבקשה.', 'איפה התחנה המרכזית? אני צריך להגיע לירושלים לפני השקיעה.', 'ברוך אתה יהוה אלהינו מלך העולם'];
t = Date.now();
out.lines = await page.evaluate(async (lines) => { const s = await import('/src/nikud/service.js'); const res = []; for (const l of lines) { const t0 = performance.now(); try { const r = await s.addMarks(l); res.push({ in: l, text: r.text, name: r.name, marked: r.marked, ms: Math.round(performance.now() - t0) }); } catch (e) { res.push({ in: l, error: String(e && e.message || e) }); } } return res; }, LINES);
out.linesMs = Date.now() - t; console.log('lines', JSON.stringify(out.lines));
// the screen path: a bare word outside the list, typed into Trace Your Own Word
await page.locator('[data-act=own-input]').fill('מקרר'); await page.locator('[data-act=own-go]').evaluate((b) => b.scrollIntoView({ block: 'center' })); await page.locator('[data-act=own-go]').click();
try { await page.waitForSelector('[data-role=target]', { timeout: 120000 }); out.trace = { target: await page.locator('[data-role=target]').textContent(), note: await page.locator('[data-role=own-source]').textContent(), cells: await page.locator('[data-role=strip] svg').count() }; }
catch (e) { out.trace = { error: String(e).slice(0, 200), note: await page.locator('[data-role=own-note]').textContent().catch(() => '') }; }
console.log('trace', JSON.stringify(out.trace));
out.removed = await page.evaluate(async () => { const s = await import('/src/nikud/service.js'); await s.dropPack('nikud'); return { has: await s.hasPack('nikud') }; });
console.log('removed', JSON.stringify(out.removed));
// the sound pack on its own, on a line that already has its marks
t = Date.now();
out.sounds = await page.evaluate(async () => { const s = await import('/src/nikud/service.js'); try { await s.getPack('phonemes'); const t0 = performance.now(); const r = await s.addMarks('שָׁלוֹם, מָה שְׁלוֹמְךָ הַיּוֹם?'); const ms = Math.round(performance.now() - t0); await s.dropPack('phonemes'); return { ok: true, phonemes: r.phonemes, soundsLike: r.soundsLike, ms, has: await s.hasPack('phonemes') }; } catch (e) { return { ok: false, code: s.errorCode(e), message: String(e && e.message || e) }; } });
out.sounds.totalMs = Date.now() - t; console.log('sounds', JSON.stringify(out.sounds));
out.pageErrors = errors; console.log('errors', JSON.stringify(errors));
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(out, null, 1) + '\n');
await browser.close(); server.close();
