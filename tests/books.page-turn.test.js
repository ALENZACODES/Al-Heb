import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/books/book.view.js', import.meta.url), 'utf8');
// C-04 and S-06 (12 Nov site check). Checked live in a browser after deploy; this guards the source against a regression.
test('book: a page turn stops the voice and clears the status line before the new page is drawn', () => {
  assert.match(src, /const render = \(\) => \{\n\s+if \(page !== shownPage\) \{ stopVoice\(\); shownPage = page; \}/);
  assert.match(src, /const stopVoice = \(\) => \{[\s\S]*?audioEl\.pause\(\)[\s\S]*?removeAttribute\("src"\)[\s\S]*?audioState\.textContent = "";/);
  assert.match(src, /if \(tok !== playToken \|\| at !== page\)/, 'a slow clip that starts after the page changed is stopped');
});
test('book: a held page shows the reason and no Listen button', () => {
  assert.match(src, /stage\.append\(p\.audioHeld\s+\? h\("div", \{ class: "book-listen-row book-held" \}, h\("p", \{ class: "muted", role: "note" \}, HELD_PAGE\)\)/);
});
