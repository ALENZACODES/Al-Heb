import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { listMorphIds, readMorph, checkContract, checkAll, CORE_CSS, PUBLIC_VARS, MAX_BYTES, cssRules, buildSheet } from '../tools/letters/build_morph_sheet.mjs';

// The shared contract is docs/letters/MORPH-USAGE.md. Every picture file must follow it.
const letters = JSON.parse(readFileSync(new URL('../data/letters/letters.json', import.meta.url), 'utf8'));
const FORMS = letters.map((l) => l.id);
const ids = listMorphIds();

test('contract: 27 letter forms, every one has a picture file (sin is the one extra)', () => {
  assert.equal(FORMS.length, 27);
  for (const id of FORMS) assert.ok(ids.includes(id), id + '.svg exists');
  assert.deepEqual(ids.filter((i) => !FORMS.includes(i)), ['sin']);
});

for (const id of ids) {
  test('contract: ' + id + ' follows MORPH-USAGE.md', () => {
    assert.deepEqual(checkContract(id, readMorph(id)), []);
  });
}

test('contract: all files carry the same variable set and the same core CSS', () => {
  const sets = new Set();
  for (const id of ids) {
    const src = readMorph(id);
    const style = src.match(/<style>([\s\S]*?)<\/style>/)[1];
    assert.ok(style.startsWith(CORE_CSS), id + ' core verbatim');
    const vars = [...new Set([...src.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]).filter((v) => v !== '--w'))].sort();
    for (const v of PUBLIC_VARS) assert.ok(vars.includes(v), id + ' reads ' + v);
    sets.add(vars.join(' '));
    assert.ok(!/--(?:fg|accent|muted|c1|c2|i|m1|m2|m3|m4|morph-a1|morph-a2)\b(?!-)/.test(src.replace(/--m-/g, '')), id + ' uses no legacy variable');
  }
  assert.equal(sets.size, 1, 'one variable set across files: ' + [...sets].join(' | '));
});

test('contract: the core gives static pictures, motion only on morph-play and never under reduced motion', () => {
  const rules = cssRules(CORE_CSS);
  const anim = rules.filter((r) => r.keyframes === undefined && /animation/.test(r.body) && !/animation:none/.test(r.body));
  assert.ok(anim.length > 0);
  for (const r of anim) { assert.match(r.at, /prefers-reduced-motion:\s*no-preference/); assert.match(r.selector, /morph-play/); }
  assert.match(CORE_CSS, /prefers-reduced-motion:reduce\)\{svg\.morph,svg\.morph \*\{animation:none!important/);
  assert.match(CORE_CSS, /forced-colors:active/);
  assert.match(CORE_CSS, /prefers-color-scheme:dark/);
  assert.ok(Buffer.byteLength(CORE_CSS) < 3200, 'core stays small');
});

test('contract: no file touches the page outside its own svg (no :root, no unscoped selectors)', () => {
  for (const id of ids) {
    const css = readMorph(id).match(/<style>([\s\S]*?)<\/style>/)[1];
    for (const r of cssRules(css)) if (r.selector !== undefined) for (const sel of r.selector.split(',')) assert.ok(/^svg\.morph\b/.test(sel.trim()), id + ': ' + sel);
  }
});

// Two or more files inlined in one HTML page: DOM-parse check without a browser (ids, references, class scope).
function inlineCheck(sel) {
  const page = '<!doctype html><body>' + sel.map((id) => readMorph(id)).join('\n') + '</body>';
  const all = [...page.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = all.filter((x, i) => all.indexOf(x) !== i);
  assert.deepEqual(dup, [], 'duplicate ids when inlined together: ' + dup.join(','));
  const known = new Set(all);
  for (const m of page.matchAll(/(?:href="#|url\(#|aria-labelledby=")([^")]+)/g)) for (const ref of m[1].split(' ')) assert.ok(known.has(ref), 'unresolved ' + ref);
  // every file's local keyframes and class rules are scoped, so the union of all style rules has no unscoped selector
  const styles = [...page.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  const names = styles.flatMap((c) => cssRules(c).filter((r) => r.keyframes !== undefined).map((r) => r.keyframes));
  const core = new Set(cssRules(CORE_CSS).filter((r) => r.keyframes !== undefined).map((r) => r.keyframes));
  for (const n of names) if (!core.has(n)) assert.ok(/^morph-[\w-]+-/.test(n), 'unscoped keyframes ' + n);
}
test('contract: two files inlined in one page share no id; all 28 together share none either', () => {
  inlineCheck(['kaf', 'kaf-final']);
  inlineCheck(['pe', 'pe-final']);
  inlineCheck(['mem', 'mem-final']);
  inlineCheck(['shin', 'sin']);
  inlineCheck(ids);
});

test('contract: the check itself catches the old vocabularies', () => {
  const good = readMorph('bet');
  assert.deepEqual(checkContract('bet', good), []);
  assert.ok(checkContract('bet', good.replace('class="morph morph-bet"', 'class="mph"')).length);
  assert.ok(checkContract('bet', good.replace(/var\(--m-2\)/, 'var(--accent)')).length);
  assert.ok(checkContract('bet', good.replace('<g class="morph-b">', '<g class="morph-b" id="x">')).length);
  assert.ok(checkContract('bet', good.replace(CORE_CSS, CORE_CSS + '\n.x{fill:red}')).length);
  assert.ok(checkContract('bet', good.replace('</style>', '@keyframes mx{to{opacity:0}}</style>')).length);
});

test('contract: the contact sheet lists every file at 160px, A and B, with no failures', () => {
  const html = buildSheet();
  assert.equal((html.match(/<figure/g) || []).length, ids.length);
  assert.equal((html.match(/morph-show-a/g) || []).length >= ids.length, true);
  assert.match(html, /\.c svg\{width:160px;height:160px/);
  assert.ok(!/class="fail"/.test(html), 'no file fails the contract on the sheet');
  assert.ok(MAX_BYTES === 6144);
});
