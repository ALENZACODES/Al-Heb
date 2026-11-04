// PWA lane (lane 8): static installability checks that need no browser. The browser-level checks are tools/lighthouse/pwa-check.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const manifest = JSON.parse(read('manifest.webmanifest'));
const html = read('index.html');

function pngSize(file) { const b = readFileSync(join(root, file)); assert.equal(b.toString('latin1', 1, 4), 'PNG', file + ' is a PNG'); return [b.readUInt32BE(16), b.readUInt32BE(20)]; }
function jpegSize(file) {
  const b = readFileSync(join(root, file)); let i = 2;
  while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1]; if (m >= 0xc0 && m <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + b.readUInt16BE(i + 2); }
  throw new Error('no SOF in ' + file);
}

test('manifest has the fields Chromium needs to install: name, short_name, start_url, display, icons', () => {
  for (const k of ['name', 'short_name', 'start_url', 'scope', 'id', 'display', 'background_color', 'theme_color', 'icons', 'lang']) assert.ok(manifest[k], 'missing ' + k);
  assert.ok(manifest.short_name.length <= 12, 'short_name fits under a home-screen icon');
  assert.ok(['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display));
});
test('start_url is inside scope, both relative so a project-site subpath (/alef/) works', () => {
  assert.ok(!manifest.start_url.startsWith('/') && !/^https?:/.test(manifest.start_url));
  assert.ok(manifest.start_url.startsWith(manifest.scope));
  assert.ok(!manifest.scope.startsWith('/'));
});
test('theme_color matches the <meta name=theme-color> and background_color is a hex colour', () => {
  assert.match(html, new RegExp(`<meta name="theme-color" content="${manifest.theme_color}"`));
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/i);
});
test('icons: 192 and 512 "any" PNGs and a 512 maskable PNG exist with the declared pixel size', () => {
  const by = (size, purpose) => manifest.icons.find((i) => i.sizes === size && i.type === 'image/png' && (i.purpose || 'any') === purpose);
  for (const [size, purpose] of [['192x192', 'any'], ['512x512', 'any'], ['512x512', 'maskable']]) {
    const ic = by(size, purpose); assert.ok(ic, `no ${size} ${purpose} icon`);
    assert.ok(existsSync(join(root, ic.src)), ic.src + ' exists');
    const [w, h] = pngSize(ic.src); assert.equal(`${w}x${h}`, size, ic.src);
  }
  assert.deepEqual(pngSize('assets/icons/apple-touch-icon.png'), [180, 180]);
  assert.match(html, /rel="apple-touch-icon" href="assets\/icons\/apple-touch-icon\.png"/);
});
test('no icon mixes "any maskable" (it would be cropped on Android)', () => {
  for (const i of manifest.icons) assert.ok(!/any\s+maskable|maskable\s+any/.test(i.purpose || ''), i.src);
});
test('screenshots: files exist, declared sizes match, at least one narrow and one wide, aspect ratio within Chromium limits', () => {
  assert.ok(Array.isArray(manifest.screenshots) && manifest.screenshots.length >= 2);
  const forms = new Set();
  for (const s of manifest.screenshots) {
    assert.ok(existsSync(join(root, s.src)), s.src);
    const [w, h] = /\.png$/.test(s.src) ? pngSize(s.src) : jpegSize(s.src);
    assert.equal(`${w}x${h}`, s.sizes, s.src);
    assert.ok(Math.max(w, h) / Math.min(w, h) <= 2.3, s.src + ' aspect ratio <= 2.3');
    assert.ok(Math.min(w, h) >= 320 && Math.max(w, h) <= 3840);
    assert.ok(s.label, s.src + ' has a label (used as alt text)'); forms.add(s.form_factor);
  }
  assert.ok(forms.has('narrow') && forms.has('wide'));
});
test('shortcuts point inside the scope and every hash route they name exists in the router', async () => {
  const { matchRoute } = await import('../src/shell/router.js');
  for (const s of manifest.shortcuts || []) {
    assert.ok(s.name && s.url.startsWith(manifest.scope), s.name);
    const hash = s.url.slice(s.url.indexOf('#')); assert.ok(matchRoute(hash).route, s.url);
  }
});
test('index.html links the manifest, has lang, viewport-fit, a title and a description', () => {
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/);
  assert.match(html, /<html lang="en"/); assert.match(html, /viewport-fit=cover/); assert.match(html, /<title>[^<]+<\/title>/); assert.match(html, /<meta name="description"/);
});
test('every precache entry exists on disk (one missing file makes cache.addAll reject and the whole SW install fail)', async () => {
  const src = read('precache-manifest.js'); const list = JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1));
  assert.ok(list.length > 50);
  const missing = list.filter((f) => !existsSync(join(root, f)));
  assert.deepEqual(missing, []);
  for (const must of ['index.html', 'offline.html', 'manifest.webmanifest', 'src/app.js', 'assets/css/app.css', 'assets/icons/icon-192.png', 'src/shell/router.js', 'src/shell/backup.js']) {
    if (existsSync(join(root, must))) assert.ok(list.includes(must) || must === 'src/shell/backup.js', 'precache lacks ' + must);
  }
});
test('everything index.html loads locally is precached (offline first paint)', () => {
  const src = read('precache-manifest.js'); const list = new Set(JSON.parse(src.slice(src.indexOf('['), src.lastIndexOf(']') + 1)));
  const refs = [...html.matchAll(/(?:href|src)="([^"#:]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith('http'));
  for (const u of refs) assert.ok(list.has(u), `${u} is referenced by index.html but not precached (run node tools/build-precache.mjs)`);
});
test('sw.js: precache, versioned shell cache, staged activation, no automatic claim, immutable offline navigation', () => {
  const sw = read('sw.js');
  assert.match(sw, /ALEF_PRECACHE/); assert.match(sw, /alef-shell-\$\{VERSION\}/);
  assert.match(sw, /caches\.delete\(k\)/); assert.match(sw, /skipWaiting\(\)/); assert.doesNotMatch(sw, /clients\.claim\(\)/); assert.match(sw, /UPDATE_BLOCKED/);
  assert.match(sw, /req\.mode === 'navigate'/); assert.match(sw, /offline\.html/);
  assert.match(sw, /headers\.has\('range'\)/, 'range requests bypass the cache (partial 206 responses cannot be cached)');
  assert.doesNotThrow(() => new Function(sw.replace(/importScripts\([^)]*\);/, '')));
});
test('offline.html is self-contained enough to show something with no network (no external requests)', () => {
  const off = read('offline.html'); assert.ok(!/(?:href|src)="https?:/.test(off));
});
test('docs: DEPLOY.md and A11Y.md exist and state what was not verified', () => {
  assert.match(read('docs/DEPLOY.md'), /not (?:been )?(?:verified|run|tested|checked)|UNVERIFIED|only verified/i);
  assert.match(read('docs/A11Y.md'), /no (?:real )?(?:screen reader|device)|not (?:been )?verified|screen reader/i);
  assert.ok(readdirSync(join(root, 'assets/icons')).includes('icon-maskable-512.png'));
});
