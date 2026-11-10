// Mobile quirks: static checks on index.html / CSS / manifest and the storage-notice decision. No browser needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { decide } from '../src/shell/install-notice.js';
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const html = read('index.html'), css = read('assets/css/app.css'), man = JSON.parse(read('manifest.webmanifest'));

test('index.html: iOS and Android head tags', () => {
  assert.match(html, /viewport-fit=cover/);
  for (const n of ['apple-mobile-web-app-capable', 'mobile-web-app-capable', 'apple-mobile-web-app-title', 'apple-mobile-web-app-status-bar-style']) assert.match(html, new RegExp(`name="${n}"`));
  assert.equal((html.match(/name="theme-color"/g) || []).length, 3); // default + light + dark
  assert.match(html, /apple-touch-icon\.png/);
});
test('CSS: 16px fields, safe-area bottom bar, no 100vh, keyboard rule', () => {
  assert.match(css, /input, select, textarea \{ font-size: max\(16px/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.doesNotMatch(css, /\b100vh\b/);
  assert.match(css, /body:has\(input:focus/);
});
test('manifest: icons and screenshots exist, maskable present', () => {
  assert.ok(man.icons.some((i) => i.purpose === 'maskable'));
  for (const f of [...man.icons, ...man.screenshots]) assert.ok(existsSync(new URL('../' + f.src, import.meta.url)), f.src);
});
test('storage notice: iOS tab after a day only; never when installed or dismissed', () => {
  const t = 1e12, ios = { ios: true, standalone: false };
  assert.equal(decide({ platform: ios, rec: null, now: t }).show, false);
  assert.equal(decide({ platform: ios, rec: { first: t }, now: t + 86400000 }).show, true);
  assert.equal(decide({ platform: { ios: true, standalone: true }, rec: { first: t }, now: t + 9e8 }).show, false);
  assert.equal(decide({ platform: ios, rec: { first: t, dismissed: true }, now: t + 9e8 }).show, false);
  assert.equal(decide({ platform: { ios: false, standalone: false }, rec: { first: t }, now: t + 9e8 }).show, false);
});
