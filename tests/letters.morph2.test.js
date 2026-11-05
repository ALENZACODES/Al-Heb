import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';

// Morph pictures, group 2: yod kaf lamed mem nun samekh ayin pe tsadi.
const IDS = ['yod', 'kaf', 'lamed', 'mem', 'nun', 'samekh', 'ayin', 'pe', 'tsadi'];
const url = (id) => new URL('../assets/letters/morph/' + id + '.svg', import.meta.url);
const letters = JSON.parse(readFileSync(new URL('../data/letters/letters.json', import.meta.url), 'utf8'));

/** Minimal well-formedness check: balanced tags, quoted attributes, one root. */
function checkXml(src) {
  const body = src.replace(/<\?xml[^>]*\?>/, '').trim();
  const re = /<!--[\s\S]*?-->|<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  const stack = []; let roots = 0; let m; let pos = 0;
  while ((m = re.exec(body)) !== null) {
    assert.equal(m.index, pos, 'unparsable markup near offset ' + pos);
    pos = re.lastIndex;
    if (m[5] !== undefined) { assert.ok(stack.length > 0 || !m[5].trim(), 'text outside root'); continue; }
    if (m[2] === undefined) continue; // comment
    if (m[1]) { assert.equal(stack.pop(), m[2], 'mismatched close tag ' + m[2]); }
    else { if (stack.length === 0) roots++; if (!m[4]) stack.push(m[2]); }
  }
  assert.equal(pos, body.length, 'trailing junk');
  assert.equal(stack.length, 0, 'unclosed tags');
  assert.equal(roots, 1, 'exactly one root element');
}

for (const id of IDS) {
  test('morph svg: ' + id, () => {
    const f = url(id);
    assert.ok(existsSync(f), id + '.svg exists');
    assert.ok(statSync(f).size < 6 * 1024, id + ' under 6 KB');
    const s = readFileSync(f, 'utf8');
    checkXml(s);
    assert.match(s, /^<svg [^>]*viewBox="0 0 200 200"/);
    assert.match(s, /<title id="[^"]+">[^<]{8,}<\/title>/, 'title');
    assert.match(s, /<desc id="[^"]+">[^<]{40,}<\/desc>/, 'desc');
    assert.match(s, /role="img"/);
    assert.match(s, /class="morph-a [^"]*morph-trace"/);
    assert.match(s, /class="morph-b"/);
    assert.ok(!/<script/i.test(s), 'no script');
    assert.ok(!/<animate|<set\b|<animateTransform/i.test(s), 'no SMIL');
    assert.ok(!/(?:href|src)\s*=\s*"(?!#)/i.test(s), 'no external href/src');
    assert.ok(!/https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(s), 'no external URLs');
    assert.ok(!/url\(\s*['"]?(?!#)/i.test(s), 'no external url()');
    assert.ok(!/@import|<image|<foreignObject/i.test(s));
    assert.match(s, /prefers-reduced-motion/);
    assert.match(s, /forced-colors/);
    assert.match(s, /var\(--morph-1,/); // fallback chain lives in the shared core (see letters.morph.contract.test.js)
    // glyph strokes are the repo's own print strokes
    const rec = letters.find((l) => l.id === id);
    rec.print.strokes.forEach((st) => assert.ok(s.includes('d="' + st.path + '"'), id + ' uses trace stroke path'));
    // ids are namespaced so several can be inlined on one page
    const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, 'unique ids');
    ids.forEach((x) => assert.ok(x.startsWith(id + '-'), 'namespaced id ' + x));
    assert.ok(!/[֐-׿]/.test(s), 'no Hebrew text inside the picture');
  });
}
