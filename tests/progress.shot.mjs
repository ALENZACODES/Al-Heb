// Screenshot helper for the Progress screen (not a unit test; the name has no .test.). Needs Playwright (preinstalled here).
// Usage: node tests/progress.shot.mjs <siteRoot> <outDir>
//   siteRoot must serve the app WITH the #/progress route (copy the repo and add the route line from docs/progress/README.md hooks).
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createAppServer } from '../tools/serve.mjs';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/usr/lib/node_modules/playwright')); }
const root = resolve(process.argv[2] ?? '.'), out = resolve(process.argv[3] ?? '/tmp/progress-shots'); mkdirSync(out, { recursive: true });
const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const DAY = 86400000, now = Date.now();
const profile = (n, goal) => ({ n, goal });
async function shot(name, { n, goal }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(({ n, goal, now, DAY }) => {
    if (localStorage.getItem('alef:settings')) return;
    const set = (k, v) => localStorage.setItem('alef:' + k, JSON.stringify(v));
    set('settings', { onboarded: true, goal });
    if (n > 0) {
      const ids = Array.from({ length: n }, (_, i) => 'r' + String(i + 1).padStart(2, '0'));
      set('curriculum.progress', { completed: Object.fromEntries(ids.map((i, k) => [i, now - (n - k) * 3600e3])) });
      set('streak', { count: 3, best: 5, last: new Date(now - DAY).toISOString().slice(0, 10) });
      const cards = {}; const mk = (id, o) => (cards[id] = { id, kind: 'letter', state: 'review', stability: 3, difficulty: 5, reps: 3, lapses: 0, lastReview: now - 2 * DAY, due: now, ...o });
      mk('letter:bet', { lapses: 3 }); mk('letter:dalet', { lapses: 1 }); mk('letter:shin', { stability: 40 }); mk('vowel:cholam', { lapses: 2 }); mk('word:r03:1', { lapses: 2 });
      cards['letter:alef'] = { id: 'letter:alef', kind: 'letter', state: 'new', stability: 0, difficulty: 0, reps: 0, lapses: 0, lastReview: null, due: now };
      set('srs.cards', cards);
      set('curriculum.pairs', { 'bet|kaf': { errors: 4, trials: 9 }, 'dalet|resh': { errors: 1, trials: 6 } });
      set('curriculum.checkpoints', { 1: { right: 9, total: 10, at: now } });
      set('pron.misses', [{ screen: 'dottile', tag: 'bet-vet', ts: now }, { screen: 'dottile', tag: 'bet-vet', ts: now }, { screen: 'vowelboard', tag: 'kamatz', ts: now }]);
      set('letters.progress', { alef: { print: { completions: 1, perfect: 1, bestMistakes: 0, last: new Date(now).toISOString() } } });
    }
  }, { n, goal, now, DAY });
  const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(base + '#/progress'); await p.waitForSelector('#pg-h-read, .alef-unavailable', { timeout: 15000 });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  await p.screenshot({ path: join(out, name + '.png'), fullPage: true });
  console.log(name, 'errors:', errs.length ? errs : 'none', 'overflow:', overflow);
  await ctx.close();
}
await shot('progress-fresh', profile(0, 'read'));
await shot('progress-20-read', profile(20, 'read'));
await shot('progress-24-both', profile(24, 'both'));
await browser.close(); server.close();
