// Touch-target measurement: every visible interactive element on key screens at 375x667 (a phone), in headless Chromium.
// Counts targets smaller than 44x44 CSS px (WCAG 2.5.5 level AAA / platform guidance; WCAG 2.5.8 level AA asks for 24) and,
// for the ones that are big enough, whether two targets sit closer than 8px to each other.
// Usage: node tools/a11y/targets.mjs [--large] [--json file] [--route #/x ...]   (--large turns on targetSize:large)
// Inline text links inside a sentence are exempt from the size rule by WCAG 2.5.8; they are listed separately, not counted.
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
const large = args.includes('--large'); const verbose = args.includes('--verbose'); const MIN = args.includes('--min') ? Number(args[args.indexOf('--min') + 1]) : 44;
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const extra = []; args.forEach((a, i) => { if (a === '--route') extra.push(args[i + 1]); });
export const ROUTES = ['/', '/learn', '/learn?lesson=r01', '/learn?review=1', '/letters', '/letters/alef', '/letters?tab=type', '/letters/atlas', '/progress', '/firstday', '/install', '/credits', '/privacy', '/offline', '/settings', '/welcome', '/search', '/about', '/vocab', '/read', '/read/priestly-blessing', '/sounds', '/calendar', '/scan', '/words/trace', '/typing', '/sprint', '/fade', '/gender', '/ladder', '/checkpoint', '/workbook'];
const list = extra.length ? extra : ROUTES;

const server = createAppServer({ root }); await new Promise((r) => server.listen(0, r));
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const out = [];
for (const route of list) {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await ctx.addInitScript((lg) => { if (!localStorage.getItem('alef:settings')) localStorage.setItem('alef:settings', JSON.stringify(lg ? { onboarded: true, targetSize: 'large' } : { onboarded: true })); }, large);
  const page = await ctx.newPage();
  try {
    await page.goto(base + '#' + route); await page.waitForSelector('body[data-ready="1"]', { timeout: 8000 }); await page.waitForTimeout(700);
    const res = await page.evaluate((MIN) => {
      const sel = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=radio],[role=checkbox],[role=switch],[tabindex]:not([tabindex="-1"]),[onclick]';
      const vis = (e) => { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return false; const r = e.getBoundingClientRect(); if (r.width <= 0 || r.height <= 0 || e.closest('[hidden],[inert]')) return false;
        // content inside a closed <details> (other than its own summary) cannot be tapped
        for (let d = e.closest('details'); d; d = d.parentElement && d.parentElement.closest('details')) { if (!d.open && !(e.tagName === 'SUMMARY' && e.parentElement === d)) return false; }
        return true; };
      const nm = (e) => (e.getAttribute('aria-label') || e.textContent || e.value || e.id || e.type || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      const els = [...document.querySelectorAll(sel)].filter(vis);
      const boxes = els.map((e) => {
        // a native input hidden inside a label is operated through the label: measure the label
        let t = e; const lab = e.closest('label');
        const r0 = e.getBoundingClientRect();
        if (lab && (e.type === 'checkbox' || e.type === 'radio' || e.type === 'file') && vis(lab)) t = lab;
        if (e.closest('.visually-hidden, .skip-link') || e.classList.contains('skip-link') || e.matches('input[type=file].visually-hidden')) return null; // operated through its visible button
        const r = t.getBoundingClientRect();
        const inline = e.matches('a') && !e.classList.contains('btn') && !!e.closest('p,li,dd,td,span.muted') && getComputedStyle(e).display === 'inline';
        return { chrome: !!e.closest('.site-nav,.sound-bar'), e: t, el: e, tag: e.tagName.toLowerCase(), name: nm(e), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, x: r.left, y: r.top, inline, off: r0.right < 0 || r0.left > innerWidth };
      }).filter(Boolean);
      const seen = new Set(); const uniq = boxes.filter((b) => { if (seen.has(b.e)) return false; seen.add(b.e); return true; });
      const small = uniq.filter((b) => !b.inline && (b.w < MIN - 0.5 || b.h < MIN - 0.5)).map((b) => ({ tag: b.tag, name: b.name, w: b.w, h: b.h, cls: (b.el.className && b.el.className.baseVal === undefined ? String(b.el.className) : '').slice(0, 40) }));
      const inl = uniq.filter((b) => b.inline && (b.h < MIN - 0.5)).length;
      // spacing: pairs of non-nested targets whose boxes are within 8px (but not overlapping because one holds the other)
      let tight = 0; const ex = [];
      for (let i = 0; i < uniq.length; i++) for (let j = i + 1; j < uniq.length; j++) {
        const a = uniq[i], b = uniq[j]; if (a.chrome || b.chrome || a.inline || b.inline || a.e.contains(b.e) || b.e.contains(a.e)) continue;
        const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w)), dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
        const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0, overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0;
        const gap = overlapX && overlapY ? -1 : overlapX ? dy : overlapY ? dx : Math.hypot(dx, dy);
        if (gap < 4) { tight++; if (ex.length < 3) ex.push(`${a.name} | ${b.name} (${Math.round(gap)}px)`); }
      }
      return { total: uniq.length, small, inlineShort: inl, tight, ex, hOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
    }, MIN);
    out.push({ route, ...res });
  } catch (e) { out.push({ route, error: e.message.split('\n')[0] }); }
  await ctx.close();
}
await browser.close(); server.close();
let totalSmall = 0, total = 0;
for (const r of out) {
  if (r.error) { console.log(`ERR   ${r.route}  ${r.error}`); continue; }
  totalSmall += r.small.length; total += r.total;
  console.log(`${r.small.length ? 'SMALL' : 'ok   '} ${r.route.padEnd(26)} targets ${String(r.total).padStart(3)}  under ${MIN}px: ${String(r.small.length).padStart(2)}  inline links short: ${r.inlineShort}  tight(<4px gap): ${r.tight}${r.hOverflow ? '  H-SCROLL' : ''}`);
  for (const s of r.small.slice(0, 6)) console.log(`        ${s.tag} "${s.name}" ${s.w}x${s.h} ${s.cls}`);
  if (verbose && r.ex.length) for (const x of r.ex) console.log(`        close: ${x}`);
  if (r.small.length > 6) console.log(`        ... ${r.small.length - 6} more`);
}
console.log(`${large ? '[targetSize=large] ' : ''}${list.length} screens, ${total} targets, ${totalSmall} under ${MIN}px`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ when: new Date().toISOString(), large, out }, null, 1));
process.exit(0);
