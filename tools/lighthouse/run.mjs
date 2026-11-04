// Lighthouse run against the local static server (phone emulation, the default mobile profile) on a few routes.
// Setup (dev-only, MPL/Apache tools, not part of the app):  cd tools/lighthouse && npm install
// Usage: node tools/lighthouse/run.mjs [--url-hash /learn ...]   Needs a Chromium: set CHROME_PATH, or Playwright's browser is used.
// Writes tools/lighthouse/reports/<route>.json (full LHR) and prints scores + the audits that failed.
// Note: Lighthouse 12+ no longer has a PWA category, so installability is covered by tools/lighthouse/pwa-check.mjs (Chromium's own CDP verdict).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';

const here = fileURLToPath(new URL('.', import.meta.url)); const root = join(here, '..', '..');
let lighthouse, chromeLauncher;
try { const mod = await import(join(here, 'node_modules/lighthouse/core/index.js')); lighthouse = mod.default ?? mod.lighthouse; } catch (e) { console.error('Lighthouse is not installed. Run: cd tools/lighthouse && npm install\n' + e.message); process.exit(2); }
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
const chromePath = process.env.CHROME_PATH || (chromium ? chromium.executablePath() : undefined);
if (!chromePath || !existsSync(chromePath)) { console.error('No Chromium found: set CHROME_PATH'); process.exit(2); }

const argv = process.argv.slice(2);
const routes = argv.includes('--url-hash') ? argv.slice(argv.indexOf('--url-hash') + 1) : ['/', '/learn', '/letters/alef', '/sounds'];
const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r)); const base = `http://localhost:${server.address().port}/`;
// Lighthouse drives a full Chrome over CDP; launch the one we found with the flags headless Linux needs.
const { spawn } = await import('node:child_process');
const port = 9333 + Math.floor(Math.random() * 500);
const profile = join(process.env.TMPDIR || '/tmp', 'alef-lh-' + process.pid);
const chrome = spawn(chromePath, [`--remote-debugging-port=${port}`, '--headless=new', '--no-sandbox', '--disable-gpu', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 2500));
mkdirSync(join(here, 'reports'), { recursive: true });
const summary = [];
try {
  for (const r of routes) {
    const url = base + '#' + r;
    const res = await lighthouse(url, { port, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] });
    const lhr = res.lhr; const slug = r === '/' ? 'home' : r.slice(1).replace(/[\/?=&]+/g, '_');
    writeFileSync(join(here, 'reports', slug + '.json'), JSON.stringify(lhr, null, 1));
    const scores = Object.fromEntries(Object.entries(lhr.categories).map(([k, v]) => [k, Math.round((v.score ?? 0) * 100)]));
    const failed = Object.values(lhr.audits).filter((a) => a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'manual' && a.scoreDisplayMode !== 'notApplicable').map((a) => `${a.id} (${a.score})`);
    summary.push({ route: r, scores, failed });
    console.log(r, JSON.stringify(scores), 'LCP', lhr.audits['largest-contentful-paint']?.displayValue, 'TBT', lhr.audits['total-blocking-time']?.displayValue, '\n   audits below 0.9:', failed.join(', ') || 'none');
  }
} finally { chrome.kill(); server.close(); }
writeFileSync(join(here, 'last-run.json'), JSON.stringify({ when: new Date().toISOString(), lighthouse: JSON.parse((await import('node:fs')).readFileSync(join(here, 'node_modules/lighthouse/package.json'), 'utf8')).version, summary }, null, 1));
void readdirSync;
