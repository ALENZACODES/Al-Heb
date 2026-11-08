// Every data or asset file that app code names as a literal path must be in the deploy output (listShipFiles), because a view that
// fetches a file the build leaves out 404s only in production (the 7 MB words.json did, for /listen, /grammar and /placement).
// Also: those files stay out of the first-install precache, and a 404 is reported as a missing file, not as the learner's connection.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listShipFiles } from '../tools/deploy/make-dist.mjs';
import { computeManifest } from '../tools/build-precache.mjs';
import { isFileMissing, loadFailureText, MISSING_FILE_NOTE } from '../src/shell/load-error.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const walk = (d, o = []) => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p, o) : o.push(p); } return o; };
// build-time scripts (*.mjs) and tests never run in the browser, so only plain .js modules count
const appModules = () => walk(join(root, 'src')).filter((f) => /\.js$/.test(f) && !/\.test\.js$/.test(f));
export const literalPaths = (text) => [...text.matchAll(/['"`]((?:\.\.?\/)*(?:data|assets)\/[A-Za-z0-9_\-/.]+\.(?:json|js|svg|mp3|webp|png|woff2))['"`]/g)].map((m) => m[1].replace(/^(\.\.?\/)+/, ''));

test('every data/assets file named by a literal path in src/ ships in dist', () => {
  const ship = new Set(listShipFiles());
  const missing = [];
  for (const f of appModules()) for (const rel of literalPaths(readFileSync(f, 'utf8'))) if (existsSync(join(root, rel)) && !ship.has(rel)) missing.push(`${rel} (named in ${f.slice(root.length + 1)})`);
  assert.deepEqual([...new Set(missing)], []);
});
test('words.json (used by /listen, /grammar, /placement) ships but is not in the first-install precache', () => {
  assert.ok(listShipFiles().includes('data/vocab/words.json'));
  const m = computeManifest(root);
  assert.ok(!m.files.includes('data/vocab/words.json') && !m.onDemand.includes('data/vocab/words.json'), 'over the 2 MiB cap: neither installed nor listed');
});
test('a 404 is reported as a missing file; other failures keep the connection hint', () => {
  assert.equal(isFileMissing(new Error('could not load data/vocab/words.json: HTTP 404')), true);
  assert.equal(isFileMissing(new TypeError('Failed to fetch')), false);
  assert.equal(isFileMissing(new Error('could not load x: HTTP 500')), false);
  const t = loadFailureText(new Error('could not load a: HTTP 404'), 'Could not load the word list', 'FALLBACK');
  assert.ok(t.includes(MISSING_FILE_NOTE) && /not your connection/.test(t) && !/Check your connection/i.test(t));
  assert.equal(loadFailureText(new TypeError('Failed to fetch'), 'x', 'FALLBACK'), 'FALLBACK');
});

// Template-built portrait paths are not captured by the literal-path scan above.
test('runtime portal, mascot and every route companion portrait ship without --with-img', () => {
  const ship = new Set(listShipFiles());
  const required = ['assets/img/rimon/rimon-sprite.png', ...['PORTAL_words_clay.webp', 'PORTAL_games_shofar.webp', 'MASCOT_rimon.800.webp'].map(n => `assets/img/gen/${n}`), ...['ari', 'noa'].flatMap(v => ['neutral', 'speak', 'listen', 'celebrate', 'synagogue', 'telaviv'].map(p => `assets/img/gen/CHAR_${v}_${p}.800.webp`))];
  for (const path of required) { assert.ok(existsSync(join(root, path)), path); assert.ok(ship.has(path), `${path} must ship`); }
});
