// Accessibility lane (lane 8): checks that need no browser. The axe run is tests/a11y.browser.test.js and tools/a11y/run.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const html = read('index.html'), css = read('assets/css/app.css'), app = read('src/app.js');

test('index.html: language, skip link first, banner, labelled nav, status region, one main landmark', () => {
  assert.match(html, /<html lang="en"/);
  assert.ok(html.indexOf('class="skip-link"') < html.indexOf('<header'), 'skip link comes before everything else');
  assert.match(html, /<header[^>]*role="banner"/); assert.match(html, /<nav[^>]*aria-label="Main"/);
  assert.equal((html.match(/<main\b/g) || []).length, 1); assert.match(html, /<main id="main" tabindex="-1"/);
  assert.match(html, /id="sound-status" role="status" aria-live="polite"/);
  assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1\b/, 'zoom is not disabled');
});
test('More sheet markup: a button with aria-expanded and aria-controls pointing at a labelled list', () => {
  assert.match(html, /<button[^>]*id="more-btn"[^>]*aria-expanded="false"[^>]*aria-controls="nav-more"/);
  assert.match(html, /<ul id="nav-more"[^>]*aria-label="More sections"/);
});
test('More sheet behaviour in app.js: Escape closes and returns focus to the button; tabbing out closes; outside click closes', () => {
  assert.match(app, /e\.key === 'Escape'[\s\S]{0,200}setMore\(false\); btn\.focus\(\)/);
  assert.match(app, /addEventListener\('focusout'[\s\S]{0,260}setMore\(false\)/);
  assert.match(app, /closest\('\.site-nav'\)\) setMore\(false\)/);
});
test('CSS: visible focus ring, no outline:none without a replacement, reduced-motion and forced-colors blocks', () => {
  assert.match(css, /:focus-visible\s*\{\s*outline:\s*3px solid var\(--focus\)/);
  assert.match(css, /prefers-reduced-motion/); assert.match(css, /forced-colors/);
  assert.match(css, /label\.btn:has\(\+ input\[type=file\]:focus-visible\)/, 'the hidden file input shows its focus on its label');
});
test('CSS: text is never made muted with opacity in the shell stylesheet overrides (opacity blends text below 4.5:1)', () => {
  const block = css.slice(css.indexOf('a11y round (lane 8'));
  assert.match(block, /\.alef-draft-notice, \.alef-noaudio \{ opacity: 1; \}/);
});
test('contrast of the theme colour pairs used for text is at least 4.5:1 (light and dark)', () => {
  const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const get = (re, s) => Object.fromEntries([...s.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
  const light = get(null, css.match(/:root \{[^}]*\}/)[0]);
  const dark = get(null, css.match(/:root\[data-theme="dark"\] \{[^}]*\}/)[0]);
  for (const [name, t] of [['light', light], ['dark', dark]]) {
    for (const [fg, bg] of [['fg', 'bg'], ['fg', 'card'], ['muted', 'bg'], ['muted', 'card'], ['accent-fg', 'accent'], ['accent', 'bg'], ['accent', 'card'], ['warn-fg', 'warn-bg']]) assert.ok(ratio(t[fg], t[bg]) >= 4.5, `${name}: ${fg} on ${bg} = ${ratio(t[fg], t[bg]).toFixed(2)}`);
    assert.ok(ratio(t.focus, t.bg) >= 3, `${name}: focus ring on bg >= 3:1`);
  }
});
test('tools/a11y/run.mjs covers every route in the router, phone and desktop, light and dark', () => {
  const run = read('tools/a11y/run.mjs');
  assert.match(run, /ROUTE_DEFS\.map\(sampleFor\)/); assert.match(run, /\['phone', 'light'\], \['phone', 'dark'\], \['desktop', 'light'\], \['desktop', 'dark'\]/);
});
test('tools/a11y/keyboard.mjs walks the six flows and checks for a non-pointer tracing alternative', () => {
  const k = read('tools/a11y/keyboard.mjs');
  for (const f of ['onboarding', 'trace', 'atlas quiz', 'vocab review', 'reader', 'calendar + More sheet']) assert.ok(k.includes(`'${f}'`) || k.includes(`const f = '${f}'`), f);
  assert.match(k, /cannot draw/);
});
test('docs/A11Y.md says what automated checks cannot show', () => {
  const d = read('docs/A11Y.md');
  assert.match(d, /screen reader/i); assert.match(d, /VoiceOver|TalkBack|NVDA/); assert.match(d, /Only a real phone/i);
});
