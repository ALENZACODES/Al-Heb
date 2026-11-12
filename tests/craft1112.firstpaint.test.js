// Plan 4.9 (12 Nov): data pages painted an empty shell for 1-3 s. Checked with headless Chrome against a server that holds data/ back
// (283 static routes; the harness is not part of the repo). Two causes, both fixed: the shell's visually hidden fallback heading
// counted as content, so the loading placeholder left before the view painted anything (Library, Sound like a local); and views
// that draw a visible heading before their data with an empty body (Books, Theme packs, Roots, Gender drill, Pronunciation rules).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isBlank } from '../src/shell/loading-contract.js';
import { newRoot, El } from './pronunciation.dom-helper.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('plan 4.9: the hidden fallback heading does not count as content, so the placeholder stays', () => {
  const app = read('src/app.js');
  const keepSrc = /loadHold = holdMain\(root, \{[^\n]*keep: (\(n\) => [^\n]*?) \}\);/.exec(app);
  assert.ok(keepSrc, 'holdMain keep found');
  assert.match(keepSrc[1], /hasAttribute\('data-fallback-title'\)/);
  const keep = eval(keepSrc[1]); // the same function app.js passes
  const node = (attrs, text) => ({ nodeType: 1, tagName: 'H1', textContent: text, attrs, classList: { contains: () => false }, hasAttribute: (k) => k in attrs, matches: () => false, querySelector: () => null });
  const root = { childNodes: [node({ 'data-fallback-title': '' }, 'Library')] };
  assert.equal(isBlank(root, keep), true, 'only the hidden fallback heading: still blank, the placeholder stays');
  root.childNodes.push(node({}, 'Short reads on Jewish life'));
  assert.equal(isBlank(root, keep), false, 'real content: the placeholder goes');
});

test('plan 4.9: views that draw their heading first show a loading line in place of the data', () => {
  for (const [f, line] of [
    ['src/books/books.view.js', 'Loading the bookshelf…'],
    ['src/vocab/themes.view.js', 'Loading the theme packs…'],
    ['src/roots/roots.view.js', 'Loading the word families…'],
    ['src/genderdrill/genderdrill.view.js', 'Loading the words…'],
    ['src/pronunciation/rules.view.js', 'Loading the rules…'],
  ]) assert.match(read(f), new RegExp(`role: ['"]status['"] \\}, ['"]${line}['"]`), f);
});

test('plan 4.9: the bookshelf says it is loading until the shelf arrives, then shows the books', async () => {
  Object.assign(El.prototype, { get classList() { return { add() {}, remove() {}, contains: () => false }; }, querySelectorAll() { return []; } });
  const root = newRoot();
  globalThis.document = root.ownerDocument;
  let release; const gate = new Promise((r) => { release = r; });
  const shelf = { books: [{ id: 'book1', titleHe: 'א', titleTranslit: 'a', titleEn: 'One', level: 'Beginner 1', pageCount: 3, hasImages: false, hasAudio: false }] };
  const ctx = { store: { get: async () => ({}), set: async () => {} }, fetchFn: async () => { await gate; return { ok: true, json: async () => shelf }; } };
  const V = await import('../src/books/books.view.js');
  const done = V.mount(root, ctx);
  await new Promise((r) => setTimeout(r, 10));
  assert.match(root.textContent, /Loading the bookshelf…/);
  release(); await done;
  assert.doesNotMatch(root.textContent, /Loading the bookshelf/);
  assert.match(root.textContent, /One/);
});
