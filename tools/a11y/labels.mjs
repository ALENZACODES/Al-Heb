// Label in name (WCAG 2.5.3): for every control that has an aria-label (or aria-labelledby), the visible words must appear in the accessible name,
// so a voice-control user who says "tap Next" or "click Add to reviews" reaches the right control.
// Rule used here: take the visible text, keep Latin letters and digits only (Hebrew letters cannot be spoken to an English recognizer; they are skipped),
// lower-case it, turn punctuation into spaces; the same for the accessible name; the visible text must be a substring of the name.
// This is a stricter and simpler check than axe's `label-content-name-mismatch`. It does not test any voice-control product.
// Usage: node tools/a11y/labels.mjs [--json file] [--route #/x ...] [--quiet]
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppServer } from '../serve.mjs';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
if (!chromium) { console.error('playwright not found'); process.exit(2); }
const here = fileURLToPath(new URL('.', import.meta.url)); const root = join(here, '..', '..');
const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const extra = []; args.forEach((a, i) => { if (a === '--route') extra.push(args[i + 1]); });
const ROUTES = ['/', '/learn', '/learn?lesson=r01', '/learn?review=1', '/letters', '/letters/alef', '/letters?tab=type', '/letters/atlas', '/progress', '/firstday', '/install', '/credits', '/privacy', '/offline', '/settings', '/accessibility', '/welcome', '/search', '/about', '/vocab', '/read', '/read/priestly-blessing', '/sounds', '/calendar', '/scan', '/words/trace', '/typing', '/sprint', '/fade', '/gender', '/ladder', '/checkpoint', '/workbook', '/vowelboard', '/syllablechips', '/dottile'];
const list = extra.length ? extra : ROUTES;
const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const out = [];
for (const route of list) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify({ onboarded: true })); });
  const page = await ctx.newPage();
  try {
    await page.goto(base + '#' + route); await page.waitForSelector('body[data-ready="1"]', { timeout: 8000 }); await page.waitForTimeout(600);
    // open every closed <details> so controls inside are measured too
    await page.evaluate(() => document.querySelectorAll('main details').forEach((d) => { d.open = true; }));
    await page.waitForTimeout(150);
    const bad = await page.evaluate(() => {
      const norm = (s) => s.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, ' ').trim().toLowerCase();
      const nameOf = (e) => {
        const lb = e.getAttribute('aria-labelledby');
        if (lb) return lb.split(/\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ');
        return e.getAttribute('aria-label') || '';
      };
      const out = [];
      for (const e of document.querySelectorAll('main a[href], main button, main [role=button], main [role=tab], main summary, main input, main [role=checkbox], main [role=radio], .site-nav a, .site-nav button')) {
        if (!e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby')) continue;
        const r = e.getBoundingClientRect(); if (r.width === 0 && r.height === 0) continue;
        // <title>, <desc> and <style> inside an inline SVG are never painted, so they are not visible words (the memory-picture buttons carry them)
        const paintedText = (el) => { const c = el.cloneNode(true); c.querySelectorAll('svg title, svg desc, svg style, style, script').forEach((n) => n.remove()); return (c.innerText ?? '') || c.textContent || ''; };
        let vis = e.matches('input') ? (e.labels?.[0]?.textContent || '') : paintedText(e);
        vis = norm(vis); if (!vis) continue; // icon only or Hebrew only: nothing to speak
        const nm = norm(nameOf(e));
        if (!(' ' + nm + ' ').includes(' ' + vis + ' ')) out.push({ tag: e.tagName.toLowerCase(), visible: paintedText(e).trim().replace(/\s+/g, ' ').slice(0, 50), name: nameOf(e).slice(0, 80) });
      }
      return out;
    });
    out.push({ route, bad });
  } catch (e) { out.push({ route, error: e.message.split('\n')[0] }); }
  await ctx.close();
}
await browser.close(); server.close();
let n = 0;
for (const r of out) {
  if (r.error) { console.log(`ERR  ${r.route} ${r.error}`); continue; }
  n += r.bad.length;
  console.log(`${r.bad.length ? 'MISMATCH' : 'ok      '} ${r.route.padEnd(28)} ${r.bad.length}`);
  if (!args.includes('--quiet')) for (const b of r.bad.slice(0, 5)) console.log(`      ${b.tag} visible "${b.visible}"  name "${b.name}"`);
}
console.log(`${list.length} screens, ${n} controls whose accessible name does not contain their visible words`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ when: new Date().toISOString(), out }, null, 1));
process.exit(0);
