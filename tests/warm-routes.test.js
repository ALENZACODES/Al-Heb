// Brain Lab works offline and on a weak connection: the shell keeps its on-demand files on the device once per build.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAB_FILES, warmFiles } from '../src/shell/warm-routes.js';
import { computeManifest } from '../tools/build-precache.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/** Every module src/lab/lab.view.js reaches through static imports, as repo paths. */
function importGraph(entry) {
  const seen = new Set(); const todo = [entry];
  while (todo.length) {
    const f = todo.pop(); if (seen.has(f)) continue; seen.add(f);
    for (const m of read(f).matchAll(/(?:^|\n)\s*(?:import|export)\s[^'"]*?from\s*['"](\.[^'"]+)['"]/g)) todo.push(path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1])));
  }
  return [...seen];
}

test('LAB_FILES is exactly what Brain Lab needs that the first install leaves out', () => {
  const m = computeManifest(ROOT);
  const installed = new Set(m.files), onDemand = new Set(m.onDemand);
  const modules = importGraph('src/lab/lab.view.js');
  const labFiles = fs.readdirSync(path.join(ROOT, 'src/lab')).filter((f) => f.endsWith('.js')).map((f) => `src/lab/${f}`);
  const dataFiles = [...new Set(labFiles.flatMap((f) => [...read(f).matchAll(/getJSON\(env, '([^']+)'\)|new URL\('\.\.\/\.\.\/(data\/[^']+)'/g)].map((x) => x[1] || x[2])))];
  assert.ok(dataFiles.includes('data/lab/words.json') && dataFiles.includes('data/lab/syllables.json'), 'data files are read from every Brain Lab module');
  for (const f of [...modules, ...dataFiles]) assert.ok(installed.has(f) || onDemand.has(f), `${f} is shipped`);
  const needed = [...modules, ...dataFiles].filter((f) => !installed.has(f)).sort();
  assert.deepEqual([...LAB_FILES].sort(), needed);
  const bytes = LAB_FILES.reduce((n, f) => n + fs.statSync(path.join(ROOT, f)).size, 0);
  // 450 KB for the classic and Claude games; the 3D Studio code (lab.studio.js, lab.art.js) adds about 30 KB.
  assert.ok(bytes < 520 * 1024, `about ${Math.round(bytes / 1024)} KB fetched once per build`);
});

function fakes({ cached = [], controller = true, onLine = true, saveData = false, failing = [] } = {}) {
  const asked = [];
  const store = new Set(cached.map((f) => new URL(f, 'https://app.test/').href));
  return {
    asked,
    opts: {
      root: 'https://app.test/',
      cachesApi: { match: async (u) => (store.has(u) ? {} : undefined) },
      fetchFn: async (u) => { asked.push(u.replace('https://app.test/', '')); const ok = !failing.some((f) => u.endsWith(f)); if (ok) store.add(u); return { ok, arrayBuffer: async () => new ArrayBuffer(1) }; },
      navigatorLike: { onLine, connection: { saveData }, serviceWorker: { controller: controller ? {} : null, addEventListener() {} } },
      timeoutMs: 10,
    },
  };
}

test('warmFiles fetches only what the worker does not hold yet, once', async () => {
  const f = fakes({ cached: ['src/lab/lab.view.js'] });
  assert.equal(await warmFiles(LAB_FILES, f.opts), 'warmed');
  assert.deepEqual(f.asked, LAB_FILES.filter((x) => x !== 'src/lab/lab.view.js'));
  f.asked.length = 0;
  assert.equal(await warmFiles(LAB_FILES, f.opts), 'warmed', 'second run: everything is already kept');
  assert.deepEqual(f.asked, []);
});

test('warmFiles stays quiet offline, under data saver, without a worker; a failed file is reported, not thrown', async () => {
  for (const [o, want] of [[{ onLine: false }, 'offline'], [{ saveData: true }, 'saver'], [{ controller: false }, 'skipped']]) {
    const f = fakes(o); assert.equal(await warmFiles(LAB_FILES, f.opts), want); assert.deepEqual(f.asked, [], want);
  }
  const f = fakes({ failing: ['data/roots/families.json'] });
  assert.equal(await warmFiles(LAB_FILES, f.opts), 'partial');
  assert.equal(f.asked.length, LAB_FILES.length);
  assert.equal(await warmFiles(LAB_FILES, { ...f.opts, fetchFn: () => { throw new Error('boom'); } }), 'partial');
});

test('the shell warms Brain Lab after first paint, and shows an offline card instead of "did not load" when offline', () => {
  const app = read('src/app.js');
  assert.match(app, /if \(swc && available\.has\('lab'\)\) shownFirst\.then\(\(\) => afterPaint\(\(\) => import\('\.\/shell\/warm-routes\.js'\)\.then\(\(m\) => m\.warmFiles\(m\.LAB_FILES\)\)/);
  assert.match(app, /kind: globalThis\.navigator\?\.onLine === false \? 'offline' : 'error'/);
});
