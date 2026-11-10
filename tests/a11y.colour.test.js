// Colour-blind and low-vision round: contrast numbers, the high-contrast theme values, and second cues for right/wrong.
// This checks colour numbers and CSS text. It does not show how a page looks to a person with colour-vision deficiency.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { run, themes, ratio } from '../tools/a11y/contrast.mjs';
import { ENUMS, validate } from '../src/shell/settings.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const css = read('assets/css/app.css');

test('every text and component pair measured by tools/a11y/contrast.mjs meets its target, except the known sun-yellow fill', () => {
  const bad = run().filter((r) => !r.pass && r.kind !== 'ui-soft').map((r) => `${r.group}: ${r.what} ${r.ratio}`);
  assert.deepEqual(bad, ['memory picture colours (light): --morph-3 yellow 1.31']);
});
test('the high-contrast themes exist and reach 7:1 for body and muted text', () => {
  const T = themes();
  for (const n of ['contrast', 'contrast-dark']) {
    assert.ok(T[n], n);
    assert.ok(ratio(T[n].fg, T[n].bg) >= 7); assert.ok(ratio(T[n].muted, T[n].bg) >= 7); assert.ok(ratio(T[n].accent, T[n].bg) >= 7);
  }
});
test('theme setting accepts the two high-contrast values and still rejects others', () => {
  assert.deepEqual(ENUMS.theme, ['auto', 'light', 'dark', 'contrast', 'contrast-dark']);
  assert.equal(validate('theme', 'contrast').ok, true); assert.equal(validate('theme', 'contrast-dark').ok, true);
  assert.equal(validate('theme', 'neon').ok, false);
  assert.match(read('src/shell/i18n.js'), /'settings\.theme\.contrast': .*'settings\.theme\.contrast-dark'/);
});
test('CSS follows prefers-contrast: more for the automatic theme and keeps a forced-colors block', () => {
  assert.match(css, /@media \(prefers-contrast: more\) and \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme\]\)/);
  assert.match(css, /@media \(prefers-contrast: more\) \{\s*:root:not\(\[data-theme\]\) \{ --bg: #ffffff/);
  assert.match(css, /forced-colors: active/);
  assert.doesNotMatch(css, /:root:not\(\[data-theme\]\) :focus-visible \{ outline-width: 4px; \}\n/, 'a 4px ring must not be forced on every automatic-theme user via a bare rule');
});
test('right and wrong are shown by a tick or cross and words, not only colour', () => {
  assert.match(css, /\.tile\.right::after \{ content: "\\2713\\00a0Right"/);
  assert.match(css, /\.tile\.wrong::after \{ content: "\\2717\\00a0Not this"/);
  assert.match(css, /\.il-opt\[data-state="natural"\]::before \{ content: "\\2713/);
  assert.match(css, /\.il-opt\[data-state="picked-wrong"\]::before \{ content: "\\2717/);
  assert.match(css, /nq-cell\[data-state=ok\]::after \{ content: "\\2713"/);
  assert.match(css, /nq-cell\[data-state=bad\]::after \{ content: "\\2717"/);
  const learn = read('assets/css/learn.css');
  assert.match(learn, /alef-int-opt\[data-state="right"\]::before \{ content: "\\2713/); assert.match(learn, /alef-spot-wrong::after \{ content: " \\2717/);
});
test('tracing colours that failed contrast were replaced', () => {
  const t = read('src/letters/trace.js');
  for (const old of ['#e8e8ee', '#e67e22', '#2ca02c']) assert.ok(!t.includes(old), old);
  for (const f of ['trace.view.js', 'atlas.view.js', 'memorycard.js']) assert.ok(!read('src/letters/' + f).includes('#e67e22'), f);
});
