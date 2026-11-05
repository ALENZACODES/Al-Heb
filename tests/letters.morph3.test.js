import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const IDS = ['qof', 'resh', 'shin', 'sin', 'tav', 'kaf-final', 'mem-final', 'nun-final', 'pe-final', 'tsadi-final'];
const dir = new URL('../assets/letters/morph/', import.meta.url);
const load = (id) => readFileSync(new URL(id + '.svg', dir), 'utf8');

for (const id of IDS) {
  test(`morph ${id}: exists, well-formed, accessible, self-contained, small`, () => {
    assert.ok(existsSync(new URL(id + '.svg', dir)), 'file exists');
    const s = load(id);
    assert.ok(Buffer.byteLength(s) < 6 * 1024, 'under 6 KB');
    assert.match(s, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*viewBox="0 0 200 200"/);
    assert.ok(s.trimEnd().endsWith('</svg>'));
    // balanced tags (simple structural XML check: every non-self-closing open tag is closed in order)
    const stack = [];
    for (const m of s.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
      const [, close, name, , self] = m;
      if (self) continue;
      if (close) assert.equal(stack.pop(), name, 'tag order near </' + name + '>');
      else stack.push(name);
    }
    assert.deepEqual(stack, [], 'all tags closed');
    assert.match(s, /<title id="([^"]+)">[^<]{8,}<\/title>/);
    assert.match(s, /<desc id="([^"]+)">[^<]{40,}<\/desc>/);
    assert.match(s, /aria-labelledby="[^"]+ [^"]+"/);
    assert.ok(!/<script|\son[a-z]+\s*=|<foreignObject|<image|<animate|<set\b/i.test(s), 'no script, handlers, images or SMIL');
    assert.ok(!/(?:xlink:)?href="(?!#)/.test(s), 'only same-document href');
    assert.ok(!/url\(\s*['"]?(?!#)/.test(s), 'no external url()');
    assert.ok(!/@import|https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(s), 'no remote references');
    assert.ok(s.includes('class="morph-a"') && s.includes('class="morph-b"'), 'both states');
    assert.match(s, /prefers-reduced-motion:reduce/);
    assert.match(s, /forced-colors:active/);
    assert.match(s, /prefers-color-scheme:dark/);
    assert.match(s, /var\(--morph-ink,currentColor\)/);
    // IDs are namespaced so several can be inlined together
    for (const m of s.matchAll(/\sid="([^"]+)"/g)) assert.ok(m[1].startsWith(id + '-'), 'namespaced id ' + m[1]);
  });
}

test('final forms and sin reuse the glyph data of their base shapes', () => {
  const letters = JSON.parse(readFileSync(new URL('../data/letters/letters.json', import.meta.url), 'utf8'));
  const outline = (id) => letters.find((l) => l.id === id).print.outline;
  const gl = (s) => s.match(/<path id="[^"]+-g"[^>]* d="([^"]+)"/)[1];
  for (const id of ['qof', 'resh', 'tav', 'kaf-final', 'mem-final', 'nun-final', 'pe-final', 'tsadi-final']) assert.equal(gl(load(id)), outline(id), id);
  assert.equal(gl(load('shin')), outline('shin'));
  assert.equal(gl(load('sin')), outline('shin'));
});

test('shin and sin differ only by the dot side in state A', () => {
  const dot = (s) => Number(s.match(/<circle class="mfi" cx="(\d+)" cy="28"/)[1]);
  assert.ok(dot(load('shin')) > 100);
  assert.ok(dot(load('sin')) < 100);
});
