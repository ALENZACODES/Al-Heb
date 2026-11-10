// Regenerates the install-dialog screenshots listed in manifest.webmanifest (assets/screenshots/*.jpg) from the running app.
// Usage: node tools/lighthouse/screenshots.mjs     (headless Chromium; JPEG q70, 1x scale to keep the files small)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';
const require = createRequire(import.meta.url);
let chromium; for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..'); const out = join(root, 'assets/screenshots'); mkdirSync(out, { recursive: true });
const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r)); const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const SHOTS = [['narrow-home', '/', { width: 390, height: 844 }], ['narrow-letters', '/letters/alef', { width: 390, height: 844 }], ['narrow-learn', '/learn', { width: 390, height: 844 }], ['wide-home', '/', { width: 1280, height: 800 }]];
for (const [name, route, viewport] of SHOTS) {
  const ctx = await browser.newContext({ viewport, colorScheme: 'light' });
  await ctx.addInitScript(() => localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })));
  const page = await ctx.newPage(); await page.goto(base + '#' + route); await page.waitForSelector('body[data-ready="1"]'); await page.waitForTimeout(1200);
  await page.screenshot({ path: join(out, name + '.jpg'), type: 'jpeg', quality: 70 }); await ctx.close();
}
await browser.close(); server.close(); console.log('wrote', SHOTS.map((s) => s[0] + '.jpg').join(', '));
