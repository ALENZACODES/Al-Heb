// Cloudflare Pages deploy tooling: _headers is valid and safe, make-dist ships only runtime files, check-deploy can fail.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, cpSync, writeFileSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseHeaders, headersFor, cacheRuleCount, runChecks, woff2Coverage } from '../tools/deploy/check-deploy.mjs';
import { listShipFiles } from '../tools/deploy/make-dist.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readdirSyncRec = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? readdirSyncRec(join(d, n)) : [join(d, n)]));
const rules = parseHeaders(readFileSync(join(root, '_headers'), 'utf8'));

test('_headers: within Cloudflare limits, CSP has no third-party origin', () => {
  assert.ok(rules.length <= 100);
  const csp = headersFor(rules, '/index.html').get('content-security-policy').value;
  assert.match(csp, /default-src 'self'/);
  assert.deepEqual([...csp.matchAll(/https?:\/\/[^\s;]+/g)].map((m) => m[0]).filter((u) => !/127\.0\.0\.1|localhost/.test(u)), []);
});
test('_headers: cache rules per file kind, and never two Cache-Control rules on one path', () => {
  const cc = (p) => headersFor(rules, p).get('cache-control')?.value;
  for (const p of ['/', '/index.html', '/sw.js', '/precache-manifest.js', '/manifest.webmanifest', '/src/app.js', '/data/audio/manifest.json', '/preview/loops/daily.view.js']) assert.equal(cc(p), 'no-cache', p);
  assert.match(cc('/assets/fonts/web/heebo.woff2'), /max-age=604800/);
  // fix #15: every binary-asset prefix that ships has a one-week rule, not the host default.
  for (const p of ['/assets/books/book1/BOOK1_p01.jpg', '/assets/letters/morph/alef.svg', '/assets/letter-cartoons/alef.png', '/assets/game-art/game/hold/x.png', '/assets/speak-hold/SPEAK_09_cafe_order.png', '/assets/speak-candidates/SPEAK_05_table_welcome.png']) assert.match(cc(p), /max-age=604800/, p);
  for (const p of ['/', '/sw.js', '/src/a/b.js', '/assets/fonts/web/heebo.woff2', '/audio/x/y.mp3', '/assets/css/app.css', '/assets/books/book1/BOOK1_p01.jpg', '/assets/letters/morph/alef.svg', '/preview/loops/daily.view.js']) assert.equal(cacheRuleCount(rules, p), 1, p);
  assert.equal(headersFor(rules, '/manifest.webmanifest').get('content-type').value, 'application/manifest+json');
  // fix #15 regression guard: every file make-dist ships carries exactly one Cache-Control rule
  // (_headers/_redirects themselves are the only exception: the host never serves them).
  const unruled = listShipFiles().filter((f) => !['_headers', '_redirects'].includes(f) && cacheRuleCount(rules, '/' + f) !== 1);
  assert.deepEqual(unruled, []);
});
test('header merge follows Cloudflare: same header from two rules is comma-joined; "! Name" detaches', () => {
  const r = parseHeaders('/*\n  X-A: 1\n/a/*\n  X-A: 2\n  X-B: b\n/a/b\n  ! X-B\n');
  assert.equal(headersFor(r, '/a/b').get('x-a').value, '1, 2');
  assert.equal(headersFor(r, '/a/b').get('x-b'), undefined);
});
test('make-dist ships runtime files only', () => {
  const files = listShipFiles();
  for (const must of ['index.html', 'sw.js', '_headers', 'manifest.webmanifest', 'assets/fonts/web/heebo.woff2', 'assets/vendor/_tesseract/heb.traineddata', 'src/app.js']) assert.ok(files.includes(must), must);
  for (const f of files) assert.ok(!/^(docs|tests|tools|book|research|assets\/images|node_modules)\//.test(f) && !/\.test\.js$/.test(f), f);
});
test('make-dist ships clip mp3s but never *.meta.json sidecars or ingest reports', () => {
  const files = listShipFiles();
  const audio = files.filter((f) => f.startsWith('audio/'));
  for (const f of audio) assert.match(f, /\.(mp3|m4a|ogg)$/i, f);
  const bad = files.filter((f) => /\.meta\.json$/i.test(f) || /ingest-report/i.test(f));
  assert.deepEqual(bad, []);
  if (existsSync(join(root, 'audio'))) {
    const onDisk = readdirSyncRec(join(root, 'audio')).filter((f) => /\.mp3$/i.test(f));
    assert.equal(audio.filter((f) => /\.mp3$/i.test(f)).length, onDisk.length, 'every mp3 on disk still ships');
  }
});
test('check-deploy passes on a build and FAILS when the headers are broken', { timeout: 120000 }, async (t) => {
  const tmp = mkdtempSync(join(tmpdir(), 'alef-deploy-'));
  try {
    // dist/ is gitignored, so a clean CI checkout has no build: skip with a message instead of failing on the copy
    if (!existsSync(join(root, 'dist', 'index.html'))) { t.skip('dist/ not built in this checkout (run tools/make-dist.mjs first)'); return; }
    cpSync(join(root, 'dist'), tmp, { recursive: true });
    cpSync(join(root, '_headers'), join(tmp, '_headers'));
    const good = await runChecks(tmp);
    assert.deepEqual(good.results.filter((r) => !r.pass).map((r) => r.name), []);
    const bad = readFileSync(join(root, '_headers'), 'utf8').replace('Content-Type: application/manifest+json\n', '').replace("connect-src 'self'", "connect-src 'self' https://evil.example");
    writeFileSync(join(tmp, '_headers'), bad);
    const r = await runChecks(tmp);
    const failed = r.results.filter((x) => !x.pass).map((x) => x.name).join(' | ');
    assert.match(failed, /third-party origins/); assert.match(failed, /application\/manifest\+json/);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
test('woff2Coverage rejects a non-woff2 buffer', () => { assert.throws(() => woff2Coverage(Buffer.from('not a font at all, padding padding padding padding padding'), [0x5d0])); });
