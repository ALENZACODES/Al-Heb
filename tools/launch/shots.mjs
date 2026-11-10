// Launch screenshots. Regenerates assets/screens/{narrow,wide}-<name>.png: 8 key screens at 390x844 and 1280x800.
// Usage: node tools/launch/shots.mjs [--out assets/screens] [--only home,letters]
// Headless Chromium via Playwright against a local copy of the repo, fresh profile (first-run flag set, no progress, service worker blocked).
// These are emulation screenshots of a fresh install, not a real device. Nothing is staged: empty states are shown as they are.
// PNGs are re-encoded through sharp (palette, level 9, no metadata) when sharp is installed; otherwise Playwright's own PNG is kept,
// which carries no text chunks. Either way tools/meta/scan.mjs must pass.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';

const require = createRequire(import.meta.url);
const load = (names) => { for (const p of names) { try { return require(p); } catch { /* next */ } } return null; };
const pw = load(['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']);
if (!pw) { console.error('playwright not found'); process.exit(2); }
const sharp = load(['sharp', '/opt/npm-tools/node_modules/sharp']);

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const arg = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const outDir = resolve(root, arg('--out', 'assets/screens'));
const only = arg('--only') ? arg('--only').split(',') : null;
mkdirSync(outDir, { recursive: true });

export const SCREENS = [
  { name: 'home', route: '/', label: 'Home: today' },
  { name: 'lesson', route: '/learn?lesson=r01&review=1', label: 'A lesson exercise (review cards)' },
  { name: 'letters', route: '/letters/atlas', label: 'Letters atlas' },
  { name: 'torah-line', route: '/torahread', label: 'Read a Torah line' },
  { name: 'speak', route: '/speak', label: 'Speak' },
  { name: 'traditions', route: '/compare', label: 'Traditions compared' },
  { name: 'progress', route: '/progress', label: 'Progress (fresh install)' },
  { name: 'vocab', route: '/vocab/themes', label: 'Vocabulary themes' },
];
export const SIZES = [{ prefix: 'narrow', width: 390, height: 844 }, { prefix: 'wide', width: 1280, height: 800 }];

async function main() {
  const server = createAppServer({ root }); await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await pw.chromium.launch({ executablePath: process.env.QA_CHROME || undefined });
  const report = [];
  for (const sz of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: sz.width, height: sz.height }, deviceScaleFactor: 1, serviceWorkers: 'block', colorScheme: 'light', reducedMotion: 'reduce' });
    for (const s of SCREENS) {
      if (only && !only.includes(s.name)) continue;
      const page = await ctx.newPage(); const errs = [];
      // only flag: first-run setup counted as done, so Home shows Today instead of redirecting to /welcome. No progress is seeded.
      await page.addInitScript(() => { try { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); } catch {} });
      page.on('pageerror', (e) => errs.push(String(e.message || e)));
      await page.goto(base + '#' + s.route, { waitUntil: 'load' });
      await page.waitForSelector('main', { timeout: 15000 }).catch(() => {});
      await page.waitForFunction(() => !/Loading/i.test(document.querySelector('main')?.innerText || ''), null, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1200);
      // the one-time 'About sound' notice is dismissed with its own Got it button (the slim 'no recordings' strip stays, as in real use)
      const got = page.getByRole('button', { name: 'Got it' }); if (await got.count()) { await got.first().click().catch(() => {}); await page.waitForTimeout(300); }
      const hash = await page.evaluate(() => location.hash);
      let buf = await page.screenshot({ type: 'png' });
      if (sharp) buf = await sharp(buf).png({ palette: true, quality: 90, compressionLevel: 9, effort: 10 }).toBuffer();
      const file = join(outDir, `${sz.prefix}-${s.name}.png`); writeFileSync(file, buf);
      report.push({ file: `${sz.prefix}-${s.name}.png`, hash, kb: Math.round(statSync(file).size / 1024), errs });
      await page.close();
    }
    await ctx.close();
  }
  await browser.close(); server.close();
  for (const r of report) console.log(`${r.file}\t${r.kb} KB\t${r.hash}${r.errs.length ? '\tPAGE ERRORS: ' + r.errs.join(' | ') : ''}`);
  if (report.some((r) => r.errs.length)) process.exitCode = 1;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
