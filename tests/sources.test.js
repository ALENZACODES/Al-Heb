// src/shell/sources.js: the Sources line and the per-sentence Tatoeba credit. Checks text and attributes on a tiny fake DOM, not rendering. Not legal advice.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mk = (tag, attrs = {}, ...kids) => ({ tag, attrs, text: kids.map((k) => (k && k.tag ? k.text : k ?? '')).join(''), kids });
const { sourcesLine, exampleCredit } = await import('../src/shell/sources.js');
const link = (n) => n.kids.find((k) => k && k.tag === 'a');

test('sourcesLine renders nothing visible: credits live once, on #/credits, behind the site-wide link', () => {
  const a = sourcesLine(mk); assert.equal(a.text, ''); assert.equal(a.attrs.hidden, '');
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /class="fine-print"/);
  assert.match(html, /href="#\/privacy">Privacy</);
  assert.match(html, /href="#\/terms">Terms &amp; sources</);
  const credits = fs.readFileSync(new URL('../src/shell/credits.view.js', import.meta.url), 'utf8');
  assert.match(credits, /VOCAB_ATTRIBUTION/); assert.match(credits, /Tatoeba contributors \(CC BY 2\.0 FR\)/);
});

test('exampleCredit: author(s), licence and sentence-id link from the data; null for non-Tatoeba examples', () => {
  const words = JSON.parse(fs.readFileSync(new URL('../data/vocab/words.json', import.meta.url), 'utf8')).words;
  const rec = words.find((w) => w.example?.source?.type === 'tatoeba');
  assert.ok(rec, 'data has a Tatoeba example');
  const s = rec.example.source, c = exampleCredit(mk, rec.example);
  assert.ok(c.text.includes(s.heAuthor) && c.text.includes(s.enAuthor)); assert.match(c.text, /Tatoeba contributors, CC BY 2\.0 FR/);
  assert.equal(link(c).attrs.href, s.url); assert.ok(link(c).text.includes(String(s.heId)));
  assert.equal(exampleCredit(mk, { source: { type: 'corpus' } }), null);
  assert.equal(exampleCredit(mk, null), null);
});

test('exampleCredit: missing authors falls back to "Tatoeba contributors"; non-tatoeba.org links are dropped', () => {
  const c = exampleCredit(mk, { source: { type: 'tatoeba', url: 'http://evil.example/x' } });
  assert.match(c.text, /Sentence by Tatoeba contributors, CC BY 2\.0 FR/); assert.equal(link(c), undefined);
});
