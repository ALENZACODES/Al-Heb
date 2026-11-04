// Playwright check for word tracing (NOT picked up by `node --test`; run: node tests/wordtrace.e2e.mjs [--out docs/wordtrace/shots]).
// Headless Chromium at 390x844 with a SYNTHETIC mouse drag along each stroke's median. No real finger or stylus was used.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../tools/serve.mjs';

const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
if (!chromium) { console.error('playwright not found'); process.exit(2); }
const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const args = process.argv.slice(2);
const outDir = resolve(root, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'docs/wordtrace/shots');
mkdirSync(outDir, { recursive: true });
const letters = JSON.parse(readFileSync(join(root, 'data/letters/letters.json'), 'utf8'));
const byId = Object.fromEntries(letters.map(l => [l.id, l]));
const WORD = 'בָּא'; // bet+kamatz+dagesh, alef (2 letters)
const ids = ['bet', 'alef'];
const results = []; const fail = [];
const ok = (name, cond, extra = '') => { results.push({ name, ok: !!cond, extra }); if (!cond) fail.push(name); console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };

const server = createAppServer({ root }); await new Promise(r => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.QA_CHROME || undefined });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: false });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

async function dragStroke(cellIndex, median) {
  const box = await page.locator(`.cell[data-index="${cellIndex}"] svg`).first().boundingBox();
  const pt = ([x, y]) => [box.x + (x / 1000) * box.width, box.y + (y / 1000) * box.height];
  const pts = median.map(pt);
  await page.mouse.move(...pts[0]); await page.mouse.down();
  for (let i = 1; i < pts.length; i++) await page.mouse.move(pts[i][0], pts[i][1], { steps: 3 });
  await page.mouse.up();
}
async function traceLetter(cellIndex, id, script = 'print') {
  for (const s of byId[id][script].strokes) { await dragStroke(cellIndex, s.median); await page.waitForTimeout(60); }
}
const shot = (n) => page.screenshot({ path: join(outDir, n + '.png') });

try {
  await page.goto(`${base}/tests/wordtrace.harness.html?seed=alef,bet&level=two&word=${encodeURIComponent(WORD)}`);
  await page.waitForSelector('.strip .cell');
  ok('two cells, word on screen', (await page.locator('.strip .cell').count()) === 2);
  const order = await page.locator('.strip .cell .cap').allTextContents();
  ok('first letter (bet) is in the right-hand cell (RTL)', order[0].includes('Bet'), order.join(' | '));
  const bx = await page.locator('.cell[data-index="0"]').boundingBox(), ax = await page.locator('.cell[data-index="1"]').boundingBox();
  ok('cell 0 is to the right of cell 1', bx.x > ax.x, `x0=${Math.round(bx.x)} x1=${Math.round(ax.x)}`);
  ok('no horizontal overflow at 390px', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await shot('01-round1-solid-start');

  // cell 1 (alef) must ignore pointer input while cell 0 is active
  await traceLetter(1, 'alef');
  ok('inactive cell ignores drags', (await page.locator('.cell[data-index="1"]').getAttribute('data-done')) === 'false');

  await traceLetter(0, 'bet');
  ok('cell 0 done after drag', (await page.locator('.cell[data-index="0"]').getAttribute('data-done')) === 'true');
  ok('cell 1 becomes active', (await page.locator('.cell[data-index="1"]').getAttribute('data-active')) === 'true');
  await shot('02-round1-first-letter-done');
  await traceLetter(1, 'alef');
  await page.waitForSelector('[data-role=round-done]');
  ok('round 1 done -> next round offered', (await page.locator('[data-act=next-round]').count()) === 1);
  await shot('03-round1-complete');

  await page.click('[data-act=next-round]');
  await page.waitForSelector('.strip .cell');
  ok('round 2 uses dotted guide', (await page.locator('.cell svg').first().getAttribute('data-guide')) === 'dotted');
  await shot('04-round2-dotted');
  await traceLetter(0, 'bet'); await traceLetter(1, 'alef');
  await page.waitForSelector('[data-act=next-round]');
  await page.click('[data-act=next-round]');
  ok('round 3 uses blank guide', (await page.locator('.cell svg').first().getAttribute('data-guide')) === 'blank');
  await shot('05-round3-blank');
  await traceLetter(0, 'bet'); await traceLetter(1, 'alef');
  await page.waitForSelector('[data-act=to-vowels]');
  await shot('06-tracing-finished');
  await page.click('[data-act=to-vowels]');
  await page.waitForSelector('.nq-strip');
  // vowel step: kamatz + dagesh on bet (cell 0)
  await page.click('[data-mark=kamatz]'); await page.click('.nq-cell[data-index="0"]');
  await page.click('[data-mark=dagesh]'); await page.click('.nq-cell[data-index="0"]');
  await shot('07-vowels-placed');
  await page.click('[data-act=check]');
  const fb = await page.locator('.feedback').textContent();
  ok('vowel step scored all right', /All the vowel marks are right/.test(fb), fb);
  await shot('08-vowels-checked');
  await page.click('[data-act=finish]');
  await page.waitForSelector('[data-role=result]');
  ok('result is a clean 3', (await page.locator('[data-role=result]').getAttribute('data-rating')) === '3');
  await shot('09-result');
  ok('no horizontal overflow (result)', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));

  // ---- scenario 2: 4-letter prayer word, cursive, step-through ("show me") mode, final mem
  const bank = JSON.parse(readFileSync(join(root, 'data/wordtrace/words.json'), 'utf8'));
  const SHALOM = bank.words.find(w => w.plain === '\u05e9\u05dc\u05d5\u05dd' && w.level === 'prayer').he;
  await page.goto(`${base}/tests/wordtrace.harness.html?seed=shin,lamed,vav,mem&level=prayer&script=cursive&mode=step&word=${encodeURIComponent(SHALOM)}`);
  await page.waitForSelector('.strip .cell');
  ok('shalom has 4 cells', (await page.locator('.strip .cell').count()) === 4);
  ok('cursive joins note is shown and says NOT modelled', /NOT modelled/.test(await page.locator('[data-note=joins]').textContent()));
  ok('final-form note present', (await page.locator('[data-role=sofit]').count()) === 1);
  ok('no horizontal overflow (4 letters)', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await shot('10-shalom-cursive-step-start');
  for (let i = 0; i < 20 && (await page.locator('[data-role=round-done]').count()) === 0; i++) { await page.click('[data-act=step]'); await page.waitForTimeout(40); }
  ok('step mode finished the round with buttons only', (await page.locator('[data-role=round-done]').count()) === 1 && (await page.locator('.cell[data-done=true]').count()) === 4);
  ok('assisted round does not advance the guide', /same guide/i.test(await page.locator('[data-act=next-round]').textContent()));
  await shot('11-shalom-step-done');

  // ---- scenario 3: nothing traced yet -> honest empty state
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${base}/tests/wordtrace.harness.html?level=two`);
  await page.waitForSelector('[data-role=summary]');
  ok('empty state when no letters are known', (await page.locator('[data-role=empty]').count()) === 1);
  await shot('12-empty-state');
  ok('no console or page errors (all scenarios)', errors.length === 0, errors.join(' ; '));
} catch (e) { ok('script ran to the end', false, String(e && e.stack || e)); }
await browser.close(); server.close();
console.log(`\n${results.filter(r => r.ok).length}/${results.length} passed; screenshots in ${outDir}`);
process.exit(fail.length ? 1 : 0);
