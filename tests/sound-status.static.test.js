// Item 04: the sound status text can be expanded from the keyboard. Static checks only (no browser); the rendered
// check is the "sound status" block in tools/a11y/keyboard.mjs. Copy to tests/ when the patch is applied.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => readFileSync(join(root, p), 'utf8');

test('index.html: the expand control is a real button that names the element it controls and starts collapsed', () => {
  const html = rd('index.html');
  const m = html.match(/<button type="button" class="sound-bar-more"[^>]*>([^<]*)<\/button>/);
  assert.ok(m, 'a button.sound-bar-more exists');
  assert.match(m[0], /aria-expanded="false"/);
  assert.match(m[0], /aria-controls="sound-status"/);
  assert.ok(m[1].trim().length > 0, 'the button has visible text, which is its accessible name');
  assert.equal((html.match(/id="sound-status"/g) || []).length, 1);
});

test('app.js: the button and the text both toggle .open and the button keeps aria-expanded in step', () => {
  const js = rd('src/app.js');
  assert.match(js, /\.sound-bar-more/);
  assert.match(js, /setAttribute\('aria-expanded', String\(open\)\)/);
  assert.match(js, /soundMore\.addEventListener\('click'/);
});

test('app.css: the button meets the 44px target and the large-target setting covers it', () => {
  const css = rd('assets/css/app.css');
  assert.match(css, /\.sound-bar-more \{[^}]*min-inline-size: 44px; min-block-size: 44px/);
  assert.match(css, /data-target-size="large"\][^{]*\.sound-bar-more/);
});
