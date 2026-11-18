// Pure parts of tools/deploy/check-live.mjs (no network).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseManifest, parseRenderHeaders, headersFor, compareHeaders } from '../tools/deploy/check-live.mjs';

test('parseManifest reads the version and the precache list of the committed manifest', () => {
  const m = parseManifest(readFileSync(new URL('../precache-manifest.js', import.meta.url), 'utf8'));
  assert.match(m.version, /^[0-9a-f]{12}$/);
  assert.ok(m.files.includes('index.html') && m.files.length > 100);
  assert.deepEqual(parseManifest('nothing here'), { version: '', files: [] });
});

test('parseRenderHeaders reads every header in render.yaml, with quotes removed', () => {
  const hs = parseRenderHeaders(readFileSync(new URL('../render.yaml', import.meta.url), 'utf8'));
  const csp = hs.find((h) => h.name === 'Content-Security-Policy');
  assert.ok(csp && csp.path === '/*' && csp.value.startsWith("default-src 'self'"));
  assert.ok(csp.value.includes('https://alenzacodes.github.io'), 'pack host allowed');
  assert.ok(hs.some((h) => h.path === '/manifest.webmanifest' && h.value === 'application/manifest+json'));
  assert.ok(hs.some((h) => h.path === '/sw.js' && h.name === 'Cache-Control'));
});

test('the CSP in render.yaml and _headers are the same', () => {
  const y = parseRenderHeaders(readFileSync(new URL('../render.yaml', import.meta.url), 'utf8')).find((h) => h.name === 'Content-Security-Policy').value;
  const cf = readFileSync(new URL('../_headers', import.meta.url), 'utf8').match(/Content-Security-Policy:\s*(.+)/)[1].trim();
  assert.equal(y, cf);
});

test('headersFor matches exact paths and /* prefixes; compareHeaders reports missing and wrong values', () => {
  const want = [{ path: '/*', name: 'X-Frame-Options', value: 'DENY' }, { path: '/sw.js', name: 'Cache-Control', value: 'no-cache' }];
  assert.equal(headersFor('/sw.js', want).length, 2);
  assert.equal(headersFor('/', want).length, 1);
  const got = new Headers({ 'cache-control': 'public, max-age=0' });
  assert.deepEqual(compareHeaders(headersFor('/sw.js', want), got).map((b) => [b.name, b.got]), [['X-Frame-Options', null], ['Cache-Control', 'public, max-age=0']]);
  assert.deepEqual(compareHeaders(want, new Headers({ 'x-frame-options': 'DENY', 'cache-control': 'no-cache' })), []);
});
