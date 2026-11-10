// Privacy page vs source: storage keys, cache names and permission statements. Reads files only; no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as privacy from '../src/shell/privacy.view.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const files = []; (function walk(d) { for (const n of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const p = `${d}/${n.name}`; if (n.isDirectory()) walk(p); else if (n.name.endsWith('.js') && p !== 'src/shell/privacy.view.js') files.push(p); } })('src');
const listed = new Set(privacy.STORE_KEYS.map((r) => r[0]));
// Not store keys: 'congregation' is a settings field named in a constant.
const NOT_STORE = new Set(['congregation']);

test('privacy audit: every key named by a *KEY constant, a KEYS map value, a literal store call or a direct web-storage call is listed', () => {
  const found = new Map();
  const add = (k, p) => { if (k && !NOT_STORE.has(k)) found.set(k, p); };
  for (const p of files) {
    const src = read(p).replace(/^\s*\/\/.*$/gm, '');
    for (const m of src.matchAll(/(?:const|let|var)\s+[A-Za-z_]*(?:KEY|Key|PREFS)[A-Za-z_]*\s*=\s*['"`]([^'"`$]+)['"`]/g)) add(m[1], p);
    for (const m of src.matchAll(/\b(?:store|ctx\??\.store)\??\.(?:get|set|update|remove)\(\s*['"`]([^'"`$]+)['"`]/g)) add(m[1], p);
    for (const m of src.matchAll(/(?:local|session)Storage\??\.(?:get|set|remove)Item\(\s*['"`]([^'"`]+)['"`]/g)) add(m[1], p);
    const km = src.match(/export const KEYS = Object\.freeze\(\{([\s\S]*?)\}\)/); if (km) for (const m of km[1].matchAll(/:\s*'([^']+)'/g)) add(m[1], p);
  }
  add('__meta', 'src/store.js'); assert.match(read('src/store.js'), /const META = '__meta'/);
  const missing = [...found].filter(([k]) => !listed.has(k)).map(([k, p]) => `${k} (${p})`);
  assert.deepEqual(missing, [], 'keys used by the code but missing from the privacy table');
  const stale = [...listed].filter((k) => !found.has(k));
  assert.deepEqual(stale, [], 'listed keys that no scan found in the code');
});

test('privacy audit: Permissions-Policy statements on the page match _headers', () => {
  const pp = read('_headers').match(/Permissions-Policy:\s*(.*)/)[1];
  const mic = pp.match(/microphone=(\([^)]*\))/)[1]; const cam = pp.match(/camera=(\([^)]*\))/)[1];
  const page = [...privacy.FLOWS.map((f) => f.when), ...privacy.LOCAL_ONLY].join('\n');
  const claims = [...page.matchAll(/microphone=(\([^)]*\))/g)].map((m) => m[1]);
  assert.ok(claims.length >= 2);
  for (const c of claims) assert.equal(c, mic, `page says microphone=${c}, _headers says microphone=${mic}`);
  for (const m of page.matchAll(/camera=(\([^)]*\))/g)) assert.equal(m[1], cam);
});

test('privacy audit: cache names on the page are the ones sw.js opens, and only the Light screen calls the camera API', () => {
  const sw = read('sw.js');
  assert.match(sw, /`alef-shell-\$\{VERSION\}`/); assert.match(sw, /`alef-data-\$\{VERSION\}`/); assert.match(sw, /'alef-runtime-v1'/); assert.match(sw, /'alef-music-v1'/); assert.match(sw, /'alef-retention'/);
  const page = privacy.LOCAL_ONLY.join('\n');
  for (const n of ['alef-shell-<version>', 'alef-data-<version>', 'alef-runtime-v1', 'alef-music-v1', 'alef-retention']) assert.ok(page.includes(n), n);
  const cameraCallers = new Set(['src/light/light.view.js']);
  for (const p of files) {
    const src = read(p).replace(/\/\/.*$/gm, '');
    const requestsVideo = /video\s*:\s*(true|\{)/.test(src);
    if (cameraCallers.has(p)) {
      assert.ok(requestsVideo, `${p} should request the camera for the torch`);
    } else {
      assert.ok(!requestsVideo, `${p} requests video`);
    }
  }
  assert.match(page, /Light screen/);
  assert.match(page, /torch/);
  assert.match(page, /not sent anywhere/);
});
