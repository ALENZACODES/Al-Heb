import { test } from 'node:test';
import assert from 'node:assert/strict';
import { overlaySvg, overlayAllStates, GLYPHS, LETTER_IDS, STATES, glyphFor } from '../tools/images/overlay.mjs';
import { buildHtml, parseArgs, letterUrl } from '../book/build.mjs';

// minimal well-formedness check: balanced tags, single root, no stray ampersands
function wellFormed(xml) {
  const body = xml.replace(/<\?xml[^>]*\?>/, '').trim();
  assert.ok(body.startsWith('<svg') && body.endsWith('</svg>'));
  const stack = [];
  for (const m of body.matchAll(/<(\/?)([a-zA-Z:][\w:.-]*)([^>]*?)(\/?)>/g)) {
    const [, close, name, , self] = m;
    if (self) continue;
    if (close) assert.equal(stack.pop(), name, `mismatched </${name}>`); else stack.push(name);
  }
  assert.equal(stack.length, 0);
  assert.doesNotMatch(body.replace(/&(amp|lt|gt|quot);/g, ''), /&/);
}

test('27 letter ids with single Hebrew glyph each', () => {
  assert.equal(LETTER_IDS.length, 27);
  for (const id of LETTER_IDS) assert.match(GLYPHS[id], /^[א-ת]$/);
  assert.deepEqual(['ך', 'ם', 'ן', 'ף', 'ץ'], LETTER_IDS.slice(22).map((i) => GLYPHS[i]));
});
test('overlay SVG well-formed for all letters x states, glyph is a vector text layer, RTL/lang he', () => {
  for (const id of LETTER_IDS) for (const state of STATES) {
    const svg = overlaySvg({ id, state, imageHref: 'x.svg', lettersJson: null });
    wellFormed(svg);
    assert.match(svg, /<text id="glyph"[^>]*lang="he"[^>]*direction="rtl"|<text id="glyph"[^>]*direction="rtl"[^>]*lang="he"/);
    assert.ok(svg.includes(GLYPHS[id]));
    assert.equal(/<image /.test(svg), state !== 'silhouette');
  }
});
test('state styling differs: outline ~40% opacity, solid dims image, silhouette charcoal', () => {
  const s = overlayAllStates({ id: 'alef', imageHref: 'x.svg', lettersJson: null });
  assert.match(s.outline, /opacity="0.4"/); assert.match(s.solid, /opacity="0.25"/); assert.match(s.silhouette, /#2B2B2B/);
  assert.throws(() => overlaySvg({ id: 'nope' }));
  assert.throws(() => overlaySvg({ id: 'alef', state: 'bad', lettersJson: null }));
});
test('glyphFor uses letters.json record when valid, else built-in', () => {
  assert.equal(glyphFor('bet', [{ id: 'bet', he: 'ב' }]), 'ב');
  assert.equal(glyphFor('bet', [{ id: 'bet', he: 'x' }]), GLYPHS.bet);
});
test('book HTML: 27 letter pages, RTL Hebrew spans, draft opening prayer block, URL map', () => {
  const html = buildHtml(parseArgs([]));
  assert.equal((html.match(/<section class="letter"/g) || []).length, 27);
  assert.match(html, /lang="he" dir="rtl"/);
  assert.match(html, /Prayer for the One Who Begins/); assert.match(html, /pending clergy\/educator review/); assert.match(html, /Hineni/);
  for (const id of LETTER_IDS) assert.ok(html.includes(letterUrl('alef.example.org', id)), id);
  assert.match(html, /Illustrations created with AI tools and edited by the author/);
  assert.throws(() => parseArgs(['--trim', '1x1']));
});
