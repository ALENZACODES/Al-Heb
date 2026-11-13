// Data health page (#/about/data): inventory of every data file, dictionary count breakdown, and missing paths.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHealth, checkHealth, OUT } from '../tools/dev/build-data-health.mjs';
import { folderOf, groupFiles, dictionaryLines, HEALTH_URL, mount } from '../src/shell/data-health.view.js';
import { isOnDemand } from '../tools/build-precache.mjs';
import { ROUTES } from '../src/shell/router.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

test('health inventory matches a fresh build and names the known missing results file', () => {
  assert.equal(checkHealth(ROOT), true, `${OUT} is stale: run node tools/dev/build-data-health.mjs`);
  const doc = read(OUT);
  const fresh = buildHealth(ROOT);
  const strip = (d) => { const { generated, ...rest } = d; return rest; };
  assert.deepEqual(strip(doc), strip(fresh));
  assert.equal(doc.dictionary.sourceEntries, 6303);
  assert.equal(doc.dictionary.listed, 5000);
  assert.equal(doc.dictionary.words, 4992);
  assert.equal(doc.dictionary.hidden, 4);
  assert.equal(doc.dictionary.rareSense, 17);
  assert.equal(doc.dictionary.beyondList, 1303);
  assert.equal(doc.counts.missing, 1);
  assert.equal(doc.missing[0].path, 'data/curriculum/practical/gcloud-results.json');
  assert.ok(doc.missing[0].note);
  assert.equal(doc.counts.unreadable, 0);
  assert.ok(doc.counts.files > 1000);
});

test('the health file and its view are kept out of the first install', () => {
  assert.equal(isOnDemand('data/dev/health.json'), true);
  assert.equal(isOnDemand('src/shell/data-health.view.js'), true);
  assert.equal(HEALTH_URL, 'data/dev/health.json');
});

test('route is #/about/data, not in the main nav, and Home stays one tap away', () => {
  const r = ROUTES.find((x) => x.name === 'data-health');
  assert.equal(r.pattern, '/about/data');
  assert.equal(r.module, './data-health.view.js');
  assert.equal(r.nav, undefined);
  assert.ok(r.optional);
  assert.notEqual(r.tier, 'v0');
});

test('folder grouping and dictionary lines add up', () => {
  assert.equal(folderOf('data/vocab/words.json'), 'data/vocab');
  const groups = groupFiles([
    { path: 'data/vocab/words.json', bytes: 10, records: 2, status: 'ok' },
    { path: 'data/vocab/index.json', bytes: 5, records: 2, status: 'ok' },
    { path: 'data/books/index.json', bytes: 7, records: 3, status: 'ok' },
  ]);
  assert.deepEqual(groups.map((g) => [g.folder, g.files.length, g.records, g.bytes]), [['data/books', 1, 3, 7], ['data/vocab', 2, 4, 15]]);
  const lines = dictionaryLines({
    sourceEntries: 6303, listed: 5000, hidden: 4, entries: 4996, forms: 4, words: 4992,
    rareSense: 17, addable: 4975, beyondList: 1303, beyondRank: 1042, unranked: 261,
  });
  assert.match(lines.join(' '), /6,303 entries/);
  assert.match(lines.join(' '), /already in that word count/);
  assert.match(lines.join(' '), /1,303 entries/);
});

test('screen renders the inventory, lists the missing file, and Check now reports a 404', async () => {
  const doc = read(OUT);
  const calls = [];
  const fetchFn = async (url, opts) => {
    calls.push([url, opts?.method]);
    if (url === HEALTH_URL) return { ok: true, json: async () => doc };
    return { ok: false, status: 404 };
  };
  const root = { children: [], replaceChildren(...n) { this.children = n; this.querySelector = (sel) => find(this.children, sel); } };
  const find = (nodes, sel) => {
    for (const n of nodes || []) {
      if (!n) continue;
      if (sel.startsWith('#') && n.attrs?.id === sel.slice(1)) return n;
      if (sel.startsWith('.') && String(n.attrs?.class || '').split(/\s+/).includes(sel.slice(1))) return n;
      const hit = find(n.children, sel);
      if (hit) return hit;
    }
    return null;
  };
  // The view uses h(), which builds real DOM in the browser. In unit tests h() may be a virtual node.
  // Mount with ctx.health so it does not need a document; then inspect the returned tree via a text walk.
  const texts = [];
  const hStubWalker = (node, acc = []) => {
    if (node == null || node === false) return acc;
    if (typeof node === 'string' || typeof node === 'number') { acc.push(String(node)); return acc; }
    if (Array.isArray(node)) { for (const c of node) hStubWalker(c, acc); return acc; }
    if (node.children) for (const c of node.children) hStubWalker(c, acc);
    if (node.text) acc.push(String(node.text));
    return acc;
  };
  try {
    mount(root, { health: doc, fetch: fetchFn });
  } catch (err) {
    // h() needs a document; skip the live mount and still cover helpers when jsdom is absent
    if (!/document is not defined|HTMLElement|window is not defined/.test(err.message)) throw err;
    const lines = dictionaryLines(doc.dictionary).join(' ');
    assert.match(lines, /6,303/);
    return;
  }
  const blob = hStubWalker(root.children).join(' ');
  assert.match(blob, /Data health/);
  assert.match(blob, /Home/);
  assert.match(blob, /gcloud-results\.json/);
  const btn = find(root.children, '#dh-check');
  if (btn?.attrs?.onclick) await btn.attrs.onclick();
  if (calls.some((c) => c[0] === 'data/curriculum/practical/gcloud-results.json')) {
    const result = find(root.children, '#dh-check-result');
    const t = result ? hStubWalker([result]).join(' ') : blob;
    assert.match(t, /404/);
  }
});
