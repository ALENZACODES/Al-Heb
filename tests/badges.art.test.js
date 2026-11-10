import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'preview/loops/badges.catalog.json'), 'utf8'));
const A = await import('../preview/loops/badges.art.js');
const { themes, ratio } = await import('../tools/a11y/contrast.mjs');

/** Small well-formedness check: balanced tags, quoted attributes, one root. Not a full XML parser. */
function wellFormed(svg) {
  const stack = []; let roots = 0;
  const re = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>|([^<]+)/g; let m, pos = 0;
  while ((m = re.exec(svg))) {
    if (m.index !== pos) return `junk at ${pos}`; pos = re.lastIndex;
    if (m[5] !== undefined) { if (!stack.length) return 'text outside root'; continue; }
    const [, close, name, , self] = m;
    if (close) { if (stack.pop() !== name) return `mismatch </${name}>`; } else if (!self) { if (!stack.length) roots++; stack.push(name); } else if (!stack.length) roots++;
  }
  return stack.length || roots !== 1 || pos !== svg.length ? 'unbalanced' : null;
}
const all = [];
for (const bd of catalog.badges) for (const lv of [0, 1, 2, 3]) all.push([bd, lv, A.artFor(bd, lv)]);

test('art: every glyph named in the catalogue exists, and every badge at every level is valid SVG with a title and desc', () => {
  for (const bd of catalog.badges) assert.ok(A.GLYPH_NAMES.includes(bd.glyph), bd.glyph);
  assert.equal(all.length, catalog.badges.length * 4);
  for (const [bd, lv, svg] of all) {
    assert.equal(wellFormed(svg), null, `${bd.id} ${lv}`);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 100 100"/); assert.match(svg, /role="img"/);
    const t = /<title id="([^"]+)">([^<]+)<\/title>/.exec(svg), d = /<desc id="([^"]+)">([^<]+)<\/desc>/.exec(svg);
    assert.ok(t && t[2].length > 3, `${bd.id} title`); assert.ok(d && d[2].length > 20, `${bd.id} desc`);
    assert.match(svg, new RegExp(`aria-labelledby="${t[1]} ${d[1]}"`));
    assert.doesNotMatch(svg, /<image|<script|href=|url\(|onload|data:|<foreignObject/i, 'no raster, no script, no external reference');
  }
});
test('art: deterministic, and ids are unique per badge and level so a page can hold many', () => {
  assert.equal(A.artFor(catalog.badges[0], 2), A.artFor(catalog.badges[0], 2));
  const ids = all.flatMap(([, , svg]) => [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])); assert.equal(new Set(ids).size, ids.length);
});
test('art: all strokes are 6 units, colours come from the page variables, and the only text is a plain letter on letter badges', () => {
  for (const [bd, lv, svg] of all) {
    const widths = [...svg.matchAll(/stroke-width:(\d+)/g)].map((m) => m[1]); assert.ok(widths.length >= 1 && widths.every((w) => w === '6'), `${bd.id} ${lv}`);
    for (const c of svg.matchAll(/(?:fill|stroke):([^;"]+)/g)) assert.match(c[1], /^(none|var\(--[a-z-]+,#[0-9a-f]{6}\))$/, c[1]);
    const texts = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)];
    if (bd.family === 'letters') { if (lv) { assert.equal(texts.length, 1); assert.match(texts[0][1], /^[א-ת]$/); } } else assert.equal(texts.length, 0, `${bd.id} has no text`);
    assert.doesNotMatch(svg, /@keyframes|animate|<set /, 'nothing moves');
  }
  assert.equal(A.STROKE, 6);
});
test('art: the level shows by shape and dots, not colour alone; an unearned badge is a dashed outline', () => {
  const bd = catalog.badges[0], s = [1, 2, 3].map((l) => A.artFor(bd, l));
  assert.match(s[0], /<circle cx="50" cy="50" r="40"/); assert.match(s[1], /<rect /); assert.match(s[2], /<polygon /);
  for (const l of [1, 2, 3]) assert.equal((s[l - 1].match(/r="4"/g) || []).length, l, `${l} dots`);
  const none = A.artFor(bd, 0); assert.match(none, /stroke-dasharray/); assert.doesNotMatch(none, /r="4"/);
  assert.match(none, /not earned yet/);
  assert.match(A.artFor(bd, 3), /hexagon/); assert.match(A.artFor(bd, 2), /rounded square/);
});
test('art: colour pairs reach 3:1 against the card and page in the light, dark and high-contrast themes (text 4.5:1 for the level-3 ink)', () => {
  const T = themes(); assert.ok(T.light && T.dark);
  for (const [name, t] of Object.entries(T)) {
    for (const bgName of ['card', 'bg']) {
      assert.ok(ratio(t.accent, t[bgName]) >= 3, `${name}: frame/picture accent on ${bgName}`);
      assert.ok(ratio(t.muted, t[bgName]) >= 3, `${name}: unearned outline on ${bgName}`);
    }
    assert.ok(ratio(t['accent-fg'], t.accent) >= 4.5, `${name}: picture on the filled hexagon`);
  }
  const css = fs.readFileSync(path.join(ROOT, 'assets/css/app.css'), 'utf8').match(/:root \{[^}]*\}/)[0];
  for (const [k, hex] of [['accent', '#1e4634'], ['card', '#fffaf0'], ['accent-fg', '#fffaf0'], ['muted', '#5a6656']]) {
    assert.ok(css.includes(`--${k}: ${hex}`), `fallback colour for --${k} matches the light theme`);
    assert.ok(fs.readFileSync(path.join(ROOT, 'preview/loops/badges.art.js'), 'utf8').includes(`var(--${k},${hex})`));
  }
});
