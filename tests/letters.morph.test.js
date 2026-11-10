import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { sanitizeSvg } from '../src/letters/memorycard.js';

// Letter-to-picture morphs for the nine letters of lane 1 (assets/letters/morph/<id>.svg).
const IDS = ['alef', 'bet', 'gimel', 'dalet', 'he', 'vav', 'zayin', 'chet', 'tet'];
const file = (id) => new URL(`../assets/letters/morph/${id}.svg`, import.meta.url);
const read = (id) => readFileSync(file(id), 'utf8');

/** Tiny well-formedness check: balanced tags, one root, quoted attributes, no stray '<' or '&'. Returns the list of element names. */
function checkXml(src) {
  const names = []; const stack = [];
  let i = 0; let roots = 0;
  const re = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+\s*=\s*(?:"[^"<]*"|'[^'<]*'))*)\s*(\/?)>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>/y;
  while (i < src.length) {
    const lt = src.indexOf('<', i);
    const text = src.slice(i, lt < 0 ? src.length : lt);
    assert.ok(!/&(?!(amp|lt|gt|quot|apos);)/.test(text), 'bare ampersand in text');
    if (stack.length === 0) assert.ok(/^\s*$/.test(text), 'text outside root');
    if (lt < 0) break;
    re.lastIndex = lt;
    const m = re.exec(src);
    assert.ok(m, 'malformed markup near: ' + src.slice(lt, lt + 40));
    i = re.lastIndex;
    if (!m[2]) continue;
    if (m[1]) { assert.equal(stack.pop(), m[2], 'mismatched closing tag ' + m[2]); continue; }
    if (stack.length === 0) roots++;
    names.push(m[2]);
    if (!m[4]) stack.push(m[2]);
  }
  assert.equal(stack.length, 0, 'unclosed tags: ' + stack.join(','));
  assert.equal(roots, 1, 'exactly one root element');
  return names;
}

for (const id of IDS) {
  test(`morph ${id}: file exists, under 6 KB, well-formed XML`, () => {
    assert.ok(existsSync(file(id)), 'missing ' + id + '.svg');
    assert.ok(statSync(file(id)).size < 6 * 1024, id + ' is 6 KB or larger');
    const names = checkXml(read(id));
    assert.equal(names[0], 'svg');
  });

  test(`morph ${id}: viewBox, title, desc, A and B layers`, () => {
    const s = read(id);
    assert.match(s, /<svg\b[^>]*viewBox="0 0 200 200"/);
    assert.match(s, /<title id="[^"]+">[^<]{8,}<\/title>/);
    assert.match(s, /<desc id="[^"]+">[^<]{30,}<\/desc>/);
    assert.match(s, /<g class="morph-a morph-strokes">/);
    assert.match(s, /<g class="morph-b">/);
    assert.ok((s.match(/<path class="L"/g) || []).length >= 1, 'the letter strokes are kept in picture B');
  });

  test(`morph ${id}: no script, no external references, no fixed colours`, () => {
    const s = read(id);
    assert.ok(!/<\s*(script|foreignObject|iframe|image|a)[\s>]/i.test(s), 'forbidden element');
    assert.ok(!/\son[a-z]+\s*=/i.test(s), 'event handler attribute');
    assert.ok(!/javascript:|data:|@import|<!DOCTYPE|<!ENTITY/i.test(s));
    for (const m of s.matchAll(/(?:xlink:)?href\s*=\s*"([^"]*)"/g)) assert.ok(m[1].startsWith('#'), 'external href ' + m[1]);
    for (const m of s.matchAll(/url\(\s*['"]?([^)'"]*)/g)) assert.ok(m[1].startsWith('#'), 'external url() ' + m[1]);
    assert.ok(!/https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(s), 'remote URL');
    assert.ok(!/(?:fill|stroke)="#/.test(s), 'hard-coded colour attribute');
    // picture colours come from the page's variables, falling back to currentColor
    // (the shared variable contract is in docs/letters/MORPH-USAGE.md and letters.morph.contract.test.js)
    assert.match(s, /var\(--morph-ink,currentColor\)/);
    assert.match(s, /var\(--morph-2,#1b3a6b\)/);
    assert.match(s, /var\(--m-ink\)/);
  });

  test(`morph ${id}: motion is opt-in and respects reduced motion; forced colours handled`, () => {
    const s = read(id);
    assert.match(s, /@media \(prefers-reduced-motion:no-preference\)\{[^]*\.morph-play/);
    assert.match(s, /@media \(prefers-reduced-motion:reduce\)/);  // the guard itself is checked rule by rule in letters.morph.contract.test.js
    assert.match(s, /@media \(forced-colors:active\)/);
    assert.match(s, /\.morph-show-a/);
  });

  test(`morph ${id}: the in-app inliner accepts it`, () => {
    assert.ok(sanitizeSvg(read(id)), 'sanitizeSvg rejected ' + id);
  });
}

test('morph: the picture keeps the traced letter: every letter stroke path from letters.json appears in layer A', () => {
  const letters = JSON.parse(readFileSync(new URL('../data/letters/letters.json', import.meta.url), 'utf8'));
  for (const id of IDS) {
    const l = letters.find((x) => x.id === id);
    const s = read(id);
    const a = s.slice(s.indexOf('<g class="morph-a morph-strokes">'), s.indexOf('<g class="morph-b">'));
    for (const st of l.print.strokes) assert.ok(a.includes(`d="${st.path}"`), `${id}: stroke path missing from layer A`);
  }
});
