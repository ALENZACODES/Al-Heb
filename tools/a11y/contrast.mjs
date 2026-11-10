#!/usr/bin/env node
// Contrast checker. Reads the colour custom properties in assets/css/app.css for the light, dark and high-contrast themes,
// then reports WCAG 2.x contrast ratios for text pairs (needs 4.5:1) and UI-component pairs (needs 3:1).
// Also checks a fixed list of hard-coded state colours that views and the memory-chain pictures use (listed in EXTRA below).
// Usage: node tools/a11y/contrast.mjs [--json] [--strict]   (exit 1 with --strict when any pair fails)
// This measures colour numbers only. It does not say how a page looks to a person, and it cannot see text drawn over images or gradients.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const css = readFileSync(join(root, 'assets/css/app.css'), 'utf8');

export const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const vars = (block) => Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2].toLowerCase()]));
const blockAfter = (sel) => { const i = css.indexOf(sel); if (i < 0) throw new Error('selector not found: ' + sel); return css.slice(i, css.indexOf('}', i) + 1); };

export function themes() {
  const light = vars(css.match(/:root \{[^}]*\}/)[0]);
  const dark = vars(blockAfter(':root[data-theme="dark"] {'));
  // right/wrong line tokens live in their own rules (section 1 of the colour round in app.css)
  const tok = (sel) => { const i = css.indexOf(sel + ' { --ok-line'); return i < 0 ? {} : vars(css.slice(i, css.indexOf('}', i) + 1)); };
  Object.assign(light, tok(':root')); Object.assign(dark, tok(':root[data-theme="dark"]'));
  const out = { light, dark };
  for (const [name, sel] of [['contrast', ':root[data-theme="contrast"] {'], ['contrast-dark', ':root[data-theme="contrast-dark"] {']]) {
    if (css.includes(sel)) out[name] = vars(blockAfter(sel));
  }
  return out;
}
// [foreground token, background token, kind, what it is]
export const TOKEN_PAIRS = [
  ['fg', 'bg', 'text', 'body text on page'], ['fg', 'card', 'text', 'body text on card'],
  ['muted', 'bg', 'text', 'muted text on page'], ['muted', 'card', 'text', 'muted text on card'],
  ['accent-fg', 'accent', 'text', 'button text on accent'], ['accent', 'bg', 'text', 'link and outline-button text on page'], ['accent', 'card', 'text', 'link and outline-button text on card'],
  ['warn-fg', 'warn-bg', 'text', 'notice text'],
  ['focus', 'bg', 'ui', 'focus ring on page'], ['focus', 'card', 'ui', 'focus ring on card'],
  ['accent', 'bg', 'ui', 'accent border on page'], ['border', 'bg', 'ui-soft', 'card border on page (decorative; the card text carries meaning)'],
  ['focus', 'warn-bg', 'ui', 'focus ring on notice'],
  ['ok-line', 'bg', 'ui', 'right-answer outline on page'], ['bad-line', 'bg', 'ui', 'wrong-answer outline on page'],
  ['ok-line', 'card', 'ui', 'right-answer outline on card'], ['bad-line', 'card', 'ui', 'wrong-answer outline on card'],
];
// Hard-coded state colours from views and pictures: [name, fg, bg, kind, light/dark/both, source]
export const EXTRA = [
  ['rating "again" button', '#ffffff', '#8a1c1c', 'text', 'light', 'learn.css .alef-rate-1'],
  ['rating "hard" button', '#ffffff', '#7a4a00', 'text', 'light', 'learn.css .alef-rate-2'],
  ['rating "again" button', '#2b0b0b', '#f19a9a', 'text', 'dark', 'learn.css .alef-rate-1'],
  ['rating "hard" button', '#2b1c00', '#f1c27a', 'text', 'dark', 'learn.css .alef-rate-2'],
  ['spot-it hit', '#0d3b1a', '#dff3e3', 'text', 'light', 'learn.css .alef-spot-hit'], ['spot-it hit border', '#1d7a38', '#dff3e3', 'ui', 'light', 'learn.css'],
  ['spot-it wrong', '#5a0f0f', '#fbe3e3', 'text', 'light', 'learn.css .alef-spot-wrong'], ['spot-it wrong border', '#a31d1d', '#fbe3e3', 'ui', 'light', 'learn.css'],
  ['spot-it hit', '#c9f0d4', '#123d20', 'text', 'dark', 'learn.css'], ['spot-it wrong', '#ffd4d4', '#4a1616', 'text', 'dark', 'learn.css'],
  ['spot-it missed border', '#b45309', '#f6efe0', 'ui', 'light', 'learn.css .alef-spot-missed'], ['spot-it missed border', '#f1c27a', '#111722', 'ui', 'dark', 'learn.css'],
  ['atlas right tile border', '#1a7f37', '#e3f6e8', 'ui', 'both', 'atlas.view.js .tile.right'], ['atlas wrong tile border', '#c0392b', '#fdecea', 'ui', 'both', 'atlas.view.js .tile.wrong'],
  ['atlas right tile text', '#1b1b1f', '#e3f6e8', 'text', 'both', 'app.css override'], ['atlas wrong tile text', '#1b1b1f', '#fdecea', 'text', 'both', 'app.css override'],
  ['atlas tile sub-label (final/right/wrong)', '#3b3b44', '#e3f6e8', 'text', 'both', 'app.css override'],
    ['israel "sounds local" label', '#166534', '#f6efe0', 'text', 'light', 'israel/style.js .il-right'], ['israel "gives you away" label', '#b91c1c', '#f6efe0', 'text', 'light', 'israel/style.js .il-wrong'],
  ['israel "sounds local" label', '#86efac', '#111722', 'text', 'dark', 'israel/style.js'], ['israel "gives you away" label', '#fca5a5', '#111722', 'text', 'dark', 'israel/style.js'],
  ['trace tag chip', '#14582a', '#e3f6e8', 'text', 'both', 'trace.view.js .chip'], ['trace done badge', '#1a7f37', '#ffffff', 'text', 'both', 'trace.view.js .badge'],
  ['trace stroke guide (grey, was #e8e8ee at 1.22)', '#8f8fa0', '#ffffff', 'ui', 'both', 'trace.js guide'],
  ['trace button focus ring (was #e67e22)', '#b45309', '#ffffff', 'ui', 'both', 'trace/atlas/memory card'],
  ['atlas right tile mark', '#0b4a1c', '#e3f6e8', 'text', 'both', 'app.css .tile.right::after'], ['atlas wrong tile mark', '#7a1710', '#fdecea', 'text', 'both', 'app.css .tile.wrong::after'], ['trace your stroke (blue)', '#1f4e9c', '#ffffff', 'ui', 'both', 'trace.js'],
  ['trace wrong stroke (red)', '#c0392b', '#ffffff', 'ui', 'both', 'trace.js'],
  ['israel natural border (light)', '#1a7f37', '#f6efe0', 'ui', 'light', 'via --ok-line'], ['trace hint stroke (orange-brown)', '#b45309', '#ffffff', 'ui', 'both', 'trace.js'],
  ['trace start dot number', '#ffffff', '#1a7f37', 'text', 'both', 'trace.js'],
  ['trace hint number', '#b45309', '#ffffff', 'text', 'both', 'trace.js'],
  ['trace keyboard small label', '#667', '#fff', 'text', 'both', 'trace.view.js'],
  ['atlas muted text', '#556', '#fff', 'text', 'both', 'atlas.view.js'],
  ['hint panel text', '#5b4200', '#fff1c2', 'text', 'light', 'learn.css'],
];
// Memory-chain picture colours (src/letters/memorycard.js and assets/letters/morph/*.svg tokens), drawn on the card background
export const MORPH = [
  ['light', '--morph-1 orange', '#d9480f', '#fffaf0'], ['light', '--morph-2 blue', '#1b3a6b', '#fffaf0'], ['light', '--morph-3 yellow', '#ffd966', '#fffaf0'], ['light', '--morph-4 green', '#2f9e44', '#fffaf0'],
  ['dark', '--morph-1 orange', '#ff8a4c', '#1a2231'], ['dark', '--morph-2 blue', '#8db8ff', '#1a2231'], ['dark', '--morph-3 yellow', '#ffe08a', '#1a2231'], ['dark', '--morph-4 green', '#69db7c', '#1a2231'],
];
const need = { text: 4.5, ui: 3, 'ui-soft': 1 };
export function run() {
  const rows = [];
  const T = themes();
  for (const [name, t] of Object.entries(T)) {
    for (const [fg, bg, kind, what] of TOKEN_PAIRS) {
      if (!t[fg] || !t[bg]) continue;
      const r = ratio(t[fg], t[bg]);
      rows.push({ group: 'theme ' + name, what, fg: t[fg], bg: t[bg], kind, need: need[kind], ratio: +r.toFixed(2), pass: r >= need[kind] });
    }
  }
  for (const [what, fg, bg, kind, scheme, src] of EXTRA) {
    const norm = (h) => (h.length === 4 ? '#' + [...h.slice(1)].map((c) => c + c).join('') : h);
    const r = ratio(norm(fg), norm(bg));
    rows.push({ group: 'state colours (' + scheme + ')', what: what + ' [' + src + ']', fg, bg, kind, need: need[kind], ratio: +r.toFixed(2), pass: r >= need[kind] });
  }
  for (const [scheme, what, fg, bg] of MORPH) {
    const r = ratio(fg, bg);
    rows.push({ group: 'memory picture colours (' + scheme + ')', what, fg, bg, kind: 'ui', need: 3, ratio: +r.toFixed(2), pass: r >= 3 });
  }
  return rows.map((r, i) => [r, i]).sort((a, b) => (a[0].group < b[0].group ? -1 : a[0].group > b[0].group ? 1 : a[1] - b[1])).map((x) => x[0]);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = run();
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
  else {
    let g = '';
    for (const r of rows) {
      if (r.group !== g) { g = r.group; console.log('\n== ' + g); }
      console.log(`${r.pass ? 'ok  ' : 'FAIL'} ${String(r.ratio).padStart(5)} (need ${r.need})  ${r.fg} on ${r.bg}  ${r.what}`);
    }
    const bad = rows.filter((r) => !r.pass && r.kind !== 'ui-soft');
    console.log(`\n${rows.length} pairs checked, ${bad.length} below their target.`);
    if (process.argv.includes('--strict') && bad.length) process.exit(1);
  }
}
