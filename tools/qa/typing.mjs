// Typing trainer QA at 375x667 (headless Chromium, synthetic pointer/keyboard input: no real phone). Usage: node tools/qa/typing.mjs [--shots /tmp/tyqa]
// Prints a JSON result. Checks: every drill reachable, on-screen key sizes, key labels, final forms, no sideways scroll, physical keyboard, Israeli key positions.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch {} }
const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const args = process.argv.slice(2); const shots = args.includes('--shots') ? args[args.indexOf('--shots') + 1] : '/tmp/tyqa'; mkdirSync(shots, { recursive: true });
const drills = JSON.parse(readFileSync(join(root, 'data/typing/drills.json'), 'utf8'));
const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r)); const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch({ executablePath: process.env.QA_CHROME || undefined });
const R = { when: new Date().toISOString(), chromium: browser.version(), viewport: '375x667', drills: {}, errors: [] };
const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true });
await ctx.addInitScript(() => { try { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); } catch {} });
const page = await ctx.newPage();
page.on('pageerror', (e) => R.errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) R.errors.push('console: ' + m.text()); });
const go = async () => { await page.goto('about:blank'); await page.goto(base + '#/typing'); await page.waitForSelector('#ty-drill-letters, [role=alert]', { timeout: 20000 }); await page.waitForTimeout(200); };
const overflow = () => page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth, innerWidth }));
const keyInfo = () => page.evaluate(() => [...document.querySelectorAll('#ty-kb button')].map((b) => { const r = b.getBoundingClientRect(); return { key: b.dataset.key, text: b.textContent.trim().slice(0, 30), w: +r.width.toFixed(1), h: +r.height.toFixed(1), x: Math.round(r.x), y: Math.round(r.y) }; }));
const smallTargets = () => page.evaluate(() => [...document.querySelectorAll('main button, main a, main input, main summary')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.height && !e.closest('[hidden]') && !e.closest('details:not([open])') && (r.width < 44 || r.height < 44); }).map((e) => `${e.tagName} ${(e.id || e.textContent || '').trim().slice(0, 18)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));

await go(); await page.screenshot({ path: join(shots, 'choose.png'), fullPage: true });
R.choose = { overflow: await overflow(), small: await smallTargets(), mapRow: await page.evaluate(() => { const r = document.querySelector('.ty-check').getBoundingClientRect(); const c = document.querySelector('#ty-map').getBoundingClientRect(); return { rowW: Math.round(r.width), rowH: Math.round(r.height), boxW: Math.round(c.width), boxH: Math.round(c.height) }; }) };
for (const d of ['letters', 'finals', 'words', 'lines']) {
  await go(); await page.click(`#ty-drill-${d}`); await page.waitForSelector('#ty-input');
  const o = { reachable: true, prompt: await page.textContent('#ty-prompt'), progress: await page.textContent('#ty-progress') };
  o.overflow = await overflow(); o.keys = await keyInfo(); o.small = await smallTargets();
  o.kbRect = await page.evaluate(() => { const r = document.querySelector('#ty-kb').getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width), scrollW: document.querySelector('#ty-kb').scrollWidth, clientW: document.querySelector('#ty-kb').clientWidth }; });
  o.rows = await page.evaluate(() => [...new Set([...document.querySelectorAll('#ty-kb button[data-r]')].filter((b) => b.dataset.c != null).map((b) => Math.round(b.getBoundingClientRect().y)))].length);
  o.inputDir = await page.evaluate(() => { const i = document.querySelector('#ty-input'); return { dir: i.dir, lang: i.lang, computed: getComputedStyle(i).direction }; });
  await page.screenshot({ path: join(shots, `drill-${d}.png`), fullPage: true });
  R.drills[d] = o;
}
// on-screen keyboard: tap every key in the letters drill (type into the box via the keys; letters drill auto-checks, so use words drill)
await go(); await page.click('#ty-drill-words'); await page.waitForSelector('#ty-input');
const tapped = [];
for (const b of await page.$$('#ty-kb button[data-key]')) { const k = await b.getAttribute('data-key'); if (k === 'BS' || k === ' ') continue; await b.click(); tapped.push(k); }
R.tapAll = { typed: await page.inputValue('#ty-input'), tapped: tapped.join(''), count: tapped.length };
R.finalsOnKeyboard = await page.evaluate(() => ['ך', 'ם', 'ן', 'ף', 'ץ'].map((c) => ({ c, present: !!document.querySelector(`#ty-kb [data-key="${c}"]`), name: document.querySelector(`#ty-kb [data-key="${c}"]`)?.textContent.trim() })));
R.keyAccessible = await page.evaluate(() => [...document.querySelectorAll('#ty-kb button')].map((b) => ({ key: b.dataset.key, label: b.getAttribute('aria-label'), })).filter((x) => !x.label).length);
R.tapAll.overflowAfter = await overflow();
// delete and space
await page.click('#ty-kb [data-key="BS"]'); R.deleteWorks = (await page.inputValue('#ty-input')).length === R.tapAll.typed.length - 1;
// physical keyboard: type Hebrew straight into the field (as the OS Hebrew layout would)
await go(); await page.click('#ty-drill-words'); await page.waitForSelector('#ty-input'); await page.focus('#ty-input'); await page.keyboard.insertText('שלום'); R.physicalHebrew = await page.inputValue('#ty-input');
// Enter checks
await page.keyboard.press('Enter'); await page.waitForTimeout(100); R.afterEnter = await page.textContent('#ty-status');
// Israeli key positions with an English keyboard
await go(); await page.evaluate(() => 0); await page.check('#ty-map'); await page.waitForTimeout(100);
await page.click('#ty-drill-words'); await page.waitForSelector('#ty-input'); await page.focus('#ty-input');
await page.keyboard.type('akuo'); R.israeliPositions = { pressed: 'akuo', typed: await page.inputValue('#ty-input') };
// one full letters round with real answers via the on-screen keys
await go(); await page.click('#ty-drill-letters'); await page.waitForSelector('#ty-input'); let right = 0, n = 0;
for (let i = 0; i < 10; i++) { const want = await page.textContent('#ty-prompt'); const key = await page.$(`#ty-kb [data-key="${want.trim()}"]`); if (!key) break; await key.click(); n++; await page.waitForTimeout(60); const st = await page.textContent('#ty-status'); if (/^Right/.test(st)) right++; }
R.lettersRound = { answered: n, rightStatus: right, summary: await page.textContent('#ty-summary').catch(() => null) };
// finals round
await go(); await page.click('#ty-drill-finals'); await page.waitForSelector('#ty-input'); let fr = 0, fn = 0; const FIN = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };
for (let i = 0; i < 5; i++) { const want = (await page.textContent('#ty-prompt')).trim(); const key = await page.$(`#ty-kb [data-key="${FIN[want]}"]`); if (!key) break; await key.click(); fn++; await page.waitForTimeout(60); if (/^Right/.test(await page.textContent('#ty-status'))) fr++; }
R.finalsRound = { answered: fn, rightStatus: fr, summary: await page.textContent('#ty-summary').catch(() => null) };
// a wrong final (regular letter where a final is wanted) gives the final-form hint in a words drill
// lines round: type the first target through insertText
await go(); await page.click('#ty-drill-lines'); await page.waitForSelector('#ty-input'); R.linesFirstProgress = await page.textContent('#ty-progress');
// arrow keys on the on-screen keyboard
await go(); await page.click('#ty-drill-words'); await page.waitForSelector('#ty-input'); await page.focus('#ty-kb [tabindex="0"]');
const arrows = [];
for (const k of ['ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) { await page.keyboard.press(k); arrows.push(await page.evaluate(() => document.activeElement?.dataset?.key)); }
R.arrowNav = arrows;
// Tab stops inside the keyboard
R.tabStops = await page.evaluate(() => [...document.querySelectorAll('#ty-kb button')].filter((b) => b.tabIndex === 0).length);
// accessibility tree of the keyboard group, and the labels of the finals
R.ariaSnapshot = (await page.locator('#ty-kb').ariaSnapshot()).split('\n').slice(0, 12);
R.finalLabels = await page.evaluate(() => ['ך', 'ם', 'ן', 'ף', 'ץ'].map((c) => document.querySelector(`#ty-kb [data-key="${c}"]`).getAttribute('aria-label')));
R.sampleLabels = await page.evaluate(() => ['א', 'ש', ' ', 'BS'].map((c) => document.querySelector(`#ty-kb [data-key="${c}"]`).getAttribute('aria-label')));
// RTL: tap two keys in order; first typed letter must sit to the right of the second in the box
await page.fill('#ty-input', ''); await page.click('#ty-kb [data-key="ש"]'); await page.click('#ty-kb [data-key="ל"]');
R.rtl = await page.evaluate(() => { const i = document.querySelector('#ty-input'); const cs = getComputedStyle(i); return { value: i.value, dir: i.dir, direction: cs.direction, textAlign: cs.textAlign, kbDirection: getComputedStyle(document.querySelector('#ty-kb')).direction }; });
// geometry arrow nav: down from the first key on a 7-per-line grid lands on the key directly under it
await page.focus('#ty-kb [data-key="ק"]'); const geo = []; for (const k of ['ArrowDown', 'ArrowDown', 'ArrowUp']) { await page.keyboard.press(k); geo.push(await page.evaluate(() => { const a = document.activeElement.getBoundingClientRect(); return { key: document.activeElement.dataset.key, x: Math.round(a.x), pageY: Math.round(a.y + scrollY) }; })); } R.arrowGeometry = geo;
R.keyboardBottom = await page.evaluate(() => { const r = document.querySelector('#ty-kb').getBoundingClientRect(); return { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY), docH: document.documentElement.scrollHeight }; });
// other widths (key sizes only)
R.otherWidths = {};
for (const w of [320, 414, 600]) { const c2 = await browser.newContext({ viewport: { width: w, height: 700 }, hasTouch: true }); await c2.addInitScript(() => { try { localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); } catch {} }); const p2 = await c2.newPage(); await p2.goto(base + '#/typing'); await p2.waitForSelector('#ty-drill-words'); await p2.click('#ty-drill-words'); await p2.waitForSelector('#ty-kb');
  R.otherWidths[w] = await p2.evaluate(() => { const b = [...document.querySelectorAll('#ty-kb button')].map((x) => x.getBoundingClientRect()); const letters = [...document.querySelectorAll('#ty-kb button[data-key]')].filter((x) => x.dataset.key.length === 1 && x.dataset.key !== ' ').map((x) => x.getBoundingClientRect()); return { minW: +Math.min(...b.map((r) => r.width)).toFixed(1), minH: +Math.min(...b.map((r) => r.height)).toFixed(1), letterMinW: +Math.min(...letters.map((r) => r.width)).toFixed(1), lines: new Set(letters.map((r) => Math.round(r.y))).size, scrollWidth: document.documentElement.scrollWidth, innerWidth }; }); await c2.close(); }
R.drillsData = { words: drills.words.length, lines: drills.lines.length };
console.log(JSON.stringify(R, null, 1));
await browser.close(); server.close();
