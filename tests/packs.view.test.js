// alef-tools lane 7: the Language Packs page (#/packs) and its model, on a fake DOM. Download, progress, delete in two presses,
// "Only download on Wi-Fi", the storage line, Shabbat-safe mode, plain wording, and the way home.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { install, newRoot, El, tick } from './wordtrace.fakedom.js';

const doc = install();
const toNode = (c) => (typeof c === 'string' ? doc.createTextNode(c) : c);
El.prototype.append = function (...k) { for (const c of k) this.appendChild(toNode(c)); };
El.prototype.replaceChildren = function (...k) { for (const c of [...this.childNodes]) this.removeChild(c); this.append(...k); };

const root0 = join(dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(readFileSync(join(root0, 'data/packs/catalog.json'), 'utf8'));
const { mount } = await import('../src/settings/packs.view.js');
const M = await import('../src/settings/packs.model.js');
const { loader } = await import('../src/settings/tools.js');
const talkView = await import('../src/talk/talk.view.js');
const { ROUTES } = await import('../src/shell/router.js');

const sha = (b) => createHash('sha256').update(b).digest('hex');
const at = (isoLocal) => new Date(isoLocal).getTime();
async function until(fn, ms = 3000) { const end = Date.now() + ms; while (Date.now() < end) { const v = fn(); if (v) return v; await tick(10); } return fn(); }
const memoryStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };

/** A stand-in for the Talk pack client: sizes like the real packs, a download that reports progress, and per-direction delete. */
function fakeTalk({ fail = null } = {}) {
  const total = { 'en-he': 97 * M.MiB, 'he-en': 96 * M.MiB }; const have = { 'en-he': 0, 'he-en': 0 }; const calls = [];
  return { calls, have,
    state: async (d) => ({ ready: have[d] === total[d], gpu: false, have: have[d], total: total[d], missing: total[d] - have[d] }),
    download: async (d, opts) => { calls.push(['download', d, opts.userStarted]); opts.onProgress?.(total[d] / 2, total[d]); await tick(5); if (fail) { have[d] = total[d] / 2; throw new loader.PackError(fail); } if (opts.signal?.aborted) throw new loader.PackError('aborted'); have[d] = total[d]; opts.onProgress?.(total[d], total[d]); return { ready: true }; },
    removeOne: async (d) => { calls.push(['remove', d]); have[d] = 0; return true; },
  };
}
function page(over = {}) {
  const storage = memoryStorage();
  const talk = over.talk || fakeTalk(over);
  const packs = M.createPacks({ catalog: over.catalog || catalog, talk, env: { storage, navigator: over.navigator || {}, caches: over.caches || { keys: async () => [], open: async () => ({ keys: async () => [], match: async () => undefined }) } } });
  const root = newRoot(doc);
  const off = mount(root, { packs, now: over.now ?? at('2026-11-10T12:00:00') });
  return { root, talk, packs, storage, off };
}
const rowOf = (root, name) => root.querySelector(`[data-pack=${name}]`);

test('only packs that exist are offered: the two translation packs today, each with its name, what it does and its size before any download', async () => {
  assert.deepEqual(catalog.packs.filter((p) => p.published).map((p) => p.name), ['translate-en-he', 'translate-he-en']);
  assert.ok(catalog.packs.length >= 10, 'the packs the other lanes are building are in the list, unpublished');
  const { root } = page();
  const row = await until(() => rowOf(root, 'translate-en-he'));
  assert.equal(root.querySelector('#view-title').textContent, 'Language Packs');
  assert.equal(root.querySelectorAll('.pk-row').length, 2, 'nothing unpublished is shown, so no button leads nowhere');
  assert.equal(row.querySelector('h2').textContent, 'English to Hebrew');
  assert.match(row.textContent, /Translates everyday English lines into Hebrew on this device\./);
  await until(() => /About 97 MB/.test(row.querySelector('.pk-state').textContent));
  assert.equal(row.querySelector('.pk-state').textContent, 'Not on this device. About 97 MB to download.');
  const get = row.querySelector('[data-pack-get]');
  assert.equal(get.textContent, 'Download'); assert.equal(get.getAttribute('aria-label'), 'Download English to Hebrew'); assert.equal(get.disabled, false);
  assert.equal(row.querySelector('[data-pack-delete]').hidden, true, 'nothing to delete yet');
  assert.match(root.querySelector('#pk-storage').textContent, /^No language packs are on this device\./);
  // the way home: Home is one tap away
  const links = root.querySelectorAll('a').map((a) => a.getAttribute('href'));
  assert.ok(links.includes('#/') && links.includes('#/settings'));
});

test('Download is a learner\'s tap: it shows progress, then says the pack is on the device; Delete takes two presses', async () => {
  const { root, talk } = page();
  const row = await until(() => rowOf(root, 'translate-he-en'));
  await until(() => !row.querySelector('[data-pack-get]').disabled);
  assert.deepEqual(talk.calls, [], 'opening the page downloads nothing');
  const get = row.querySelector('[data-pack-get]');
  get.click();
  assert.equal(get.textContent, 'Stop');
  await until(() => /is on this device/.test(row.querySelector('.pk-note').textContent));
  assert.deepEqual(talk.calls, [['download', 'he-en', true]], 'the download is marked as started by the learner');
  assert.equal(row.querySelector('.pk-state').textContent, 'On this device. 96 MB.');
  assert.equal(row.querySelector('.pk-note').textContent, 'Hebrew to English is on this device. It works offline from now on.');
  assert.equal(get.hidden, true);
  const del = row.querySelector('[data-pack-delete]');
  assert.equal(del.hidden, false);
  del.click();
  assert.equal(del.textContent, 'Delete Now'); assert.match(row.querySelector('.pk-note').textContent, /Press Delete Now to remove Hebrew to English/);
  assert.equal(talk.calls.length, 1, 'one press deletes nothing');
  del.click();
  await until(() => /was deleted/.test(row.querySelector('.pk-note').textContent));
  assert.deepEqual(talk.calls[1], ['remove', 'he-en']);
  await until(() => /Not on this device/.test(row.querySelector('.pk-state').textContent));
  assert.equal(row.querySelector('[data-pack-get]').hidden, false);
});

test('a download that stops says why in plain words and offers to carry on', async () => {
  for (const [code, say] of [['wifi-only', /does not look like Wi-Fi/], ['too-full', /too little free space/], ['over-limit', /storage limit you set/], ['fetch', /The download stopped\. What arrived is kept/]]) {
    const { root } = page({ fail: code });
    const row = await until(() => rowOf(root, 'translate-en-he'));
    await until(() => !row.querySelector('[data-pack-get]').disabled);
    row.querySelector('[data-pack-get]').click();
    await until(() => say.test(row.querySelector('.pk-note').textContent));
    assert.match(row.querySelector('.pk-note').textContent, say, code);
    await until(() => row.querySelector('[data-pack-get]').textContent === 'Carry On');
    assert.match(row.querySelector('.pk-state').textContent, /Part of it is on this device: 49 of 97 MB\./);
  }
});

test('"Only download on Wi-Fi" is on until the learner turns it off, and the storage limit is the learner\'s to set; both say they saved', async () => {
  const { root, packs } = page();
  const wifi = await until(() => { const w = root.querySelector('#pk-wifi'); return w?.listeners.change ? w : null; });
  assert.equal(wifi.checked, true); assert.equal(packs.getWifiOnly(), true);
  wifi.checked = false; wifi.dispatch('change');
  assert.equal(packs.getWifiOnly(), false);
  assert.equal(root.querySelector('#pk-status').textContent, 'Saved ✓ Packs may download on any connection.');
  const limit = root.querySelector('#pk-limit');
  assert.deepEqual(limit.children.map((o) => o.textContent), ['No limit', '250 MB', '500 MB', '1 GB', '2 GB']);
  limit.value = String(500 * M.MiB); limit.dispatch('change');
  assert.equal(packs.getLimit(), 500 * M.MiB);
  assert.equal(root.querySelector('#pk-status').textContent, 'Saved ✓ Language packs may use up to 500 MB.');
});

test('Shabbat-safe mode: the page says so on Shabbat, nothing starts by itself, and a download the learner starts still works', async () => {
  const sat = page({ now: at('2026-11-14T12:00:00') });
  await until(() => rowOf(sat.root, 'translate-en-he'));
  assert.equal(sat.root.querySelector('#pk-shabbat').hidden, false);
  assert.match(sat.root.querySelector('#pk-shabbat').textContent, /Shabbat or a holiday\. Nothing downloads by itself\. A download you start here still works\./);
  assert.deepEqual(sat.talk.calls, []);
  const row = rowOf(sat.root, 'translate-en-he');
  await until(() => !row.querySelector('[data-pack-get]').disabled);
  row.querySelector('[data-pack-get]').click();
  await until(() => /is on this device/.test(row.querySelector('.pk-note').textContent));
  assert.deepEqual(sat.talk.calls, [['download', 'en-he', true]]);
  const tue = page({ now: at('2026-11-10T12:00:00') });
  await until(() => rowOf(tue.root, 'translate-en-he'));
  assert.equal(tue.root.querySelector('#pk-shabbat').hidden, true);
});

test('a pack in the newer format goes through the shared loader: its own cache, parts checked, counted in storage, deleted cleanly', async () => {
  const enc = (s) => new TextEncoder().encode(s);
  const parts = { 'model.onnx.p000': enc('0123456789'), 'model.onnx.p001': enc('abcde') };
  const list = { schema: 'alef.pack.v1', pack: 'words', version: '1', files: [{ name: 'model.onnx', bytes: 15, sha256: sha(enc('0123456789abcde')), parts: Object.entries(parts).map(([path, b]) => ({ path, bytes: b.length, sha256: sha(b) })) }] };
  const host = 'https://alenzacodes.github.io/alef-packs/';
  const table = { [`${host}words/pack.json`]: JSON.stringify(list) };
  for (const [path, b] of Object.entries(parts)) table[`${host}words/${path}?v=${sha(b).slice(0, 16)}`] = b;
  const urls = [];
  const fetch = async (url) => { urls.push(url); return url in table ? new Response(table[url]) : new Response('', { status: 404 }); };
  const stores = new Map();
  const caches = { keys: async () => [...stores.keys()], delete: async (n) => stores.delete(n), open: async (name) => { if (!stores.has(name)) stores.set(name, new Map()); const m = stores.get(name); const u = (k) => (typeof k === 'string' ? k : k.url); return { match: async (k) => { const e = m.get(u(k)); return e ? new Response(e.body, { headers: e.headers }) : undefined; }, put: async (k, res) => { m.set(u(k), { body: new Uint8Array(await res.arrayBuffer()), headers: [...res.headers] }); }, delete: async (k) => m.delete(u(k)), keys: async () => [...m.keys()].map((url) => ({ url })) }; } };
  const cat = { ...catalog, packs: catalog.packs.map((p) => (p.name === 'words' ? { ...p, published: true } : p)) };
  const packs = M.createPacks({ catalog: cat, talk: null, env: { fetch, caches, storage: memoryStorage(), navigator: {}, origin: 'https://alef-review.onrender.com', gpu: false, now: at('2026-11-10T12:00:00') } });
  assert.deepEqual(packs.list().map((p) => p.name), ['words'], 'without the Talk client its packs are not offered');
  assert.deepEqual(await packs.state('words'), { ready: false, have: 0, total: 15, missing: 15 });
  await packs.download('words');
  assert.deepEqual([...stores.keys()], ['alef-pack-words-v1']);
  assert.equal((await packs.state('words')).ready, true);
  assert.ok(urls.every((u) => u.startsWith(host) || u.includes('/assets/vendor/_packs/')), 'only the site itself and the pack host were asked');
  assert.equal((await packs.storage()).used, 15, "the parts are counted");
  assert.equal(await packs.remove('words'), true);
  assert.equal(stores.size, 0, 'nothing is left on the device');
  await assert.rejects(packs.state('nikud'), (e) => e.code === 'no-pack-list', 'a pack that is not published cannot be reached');
});

test('wording: plain English, no talk of how a pack was made, and the same words on the Talk page', () => {
  const BANNED = /\b(AI|A\.I\.|artificial|machine learning|machine|model|models|neural|LLM|GPT|algorithm|inference|ONNX|WebGPU|WASM|WebAssembly|quanti[sz]ed|transformer)\b/i;
  const strings = [...Object.values(M.COPY), ...M.LIMIT_CHOICES.map(M.limitLabel),
    ...['wifi-only', 'too-full', 'quota', 'over-limit', 'cannot-run', 'no-storage', 'shabbat', 'aborted', 'no-pack-list', 'fetch', 'hash-mismatch', 'failed'].map(M.whyLine),
    M.statusLine({ ready: true, have: 5, total: 5, missing: 0 }), M.statusLine({ ready: false, have: 2 * M.MiB, total: 5 * M.MiB, missing: 3 * M.MiB }), M.statusLine({ ready: false, have: 0, total: 5 * M.MiB, missing: 5 * M.MiB }),
    M.deviceLine({ webgpu: true, minRamGB: 8 }), M.storageLine({ used: 3 * M.MiB, limit: 0, browser: { free: 9 * M.MiB } }), M.storageLine({ used: 0, limit: 0, browser: null }),
    ...catalog.packs.flatMap((p) => [p.title, p.what]), talkView.PACK_WIFI_ONLY, talkView.PACK_OVER_LIMIT, talkView.PACK_LEAD];
  for (const s of strings) { assert.equal(typeof s, 'string'); assert.ok(!BANNED.test(s), `"${s}"`); assert.ok(!/[—–]/.test(s), `no dashes used as punctuation: "${s}"`); }
  const src = readFileSync(join(root0, 'src/settings/packs.view.js'), 'utf8');
  const shown = [...src.matchAll(/'([^'\n]{12,})'|`([^`\n]{12,})`/g)].map((m) => m[1] || m[2]).filter((s) => / /.test(s) && !/^[.#\[]|\{|;/.test(s));
  for (const s of shown) assert.ok(!BANNED.test(s), `packs.view.js: "${s}"`);
  assert.equal(M.deviceLine({ webgpu: true, minRamGB: 8 }), 'Needs a computer with a graphics card and 8 GB of memory or more.');
  assert.equal(M.deviceLine({ webgpu: false, minRamGB: 0 }), '');
  assert.match(M.COPY.lead, /on this device, with nothing sent anywhere/);
});

test('the route, its menu label and the link from Settings', () => {
  const r = ROUTES.find((x) => x.name === 'packs');
  assert.deepEqual({ pattern: r.pattern, module: r.module, title: r.title, optional: r.optional }, { pattern: '/packs', module: '../settings/packs.view.js', title: 'Language Packs', optional: true });
  assert.match(readFileSync(join(root0, 'src/shell/settings.view.js'), 'utf8'), /href: '#\/packs', id: 's-packs-link' \}, 'Language packs'\)/);
  assert.match(readFileSync(join(root0, 'src/talk/talk.view.js'), 'utf8'), /href: '#\/packs'/);
});

test('credits: a downloadable pack whose licence asks for a credit line gets one on the Credits page; a pack nobody can download yet does not', async () => {
  const credits = await import('../src/shell/credits.view.js');
  const attributions = { entries: [] };
  const serve = (cat) => async (url) => new Response(JSON.stringify(String(url).endsWith('catalog.json') ? cat : attributions));
  const before = newRoot(doc);
  await credits.mount(before, { fetch: serve(catalog) });
  assert.equal(before.querySelector('#cg-packs'), null, 'today only Apache-2.0 packs can be downloaded, so there is no line to print');
  const words = catalog.packs.find((p) => p.name === 'words');
  assert.match(words.credits[0], /dictabert-tiny-joint by Dicta.*CC BY 4\.0/);
  const after = newRoot(doc);
  await credits.mount(after, { fetch: serve({ ...catalog, packs: catalog.packs.map((p) => (p.name === 'words' ? { ...p, published: true } : p)) }) });
  assert.equal(after.querySelector('#cg-packs').textContent, 'Language packs');
  assert.deepEqual(after.querySelectorAll('li').map((li) => li.textContent), words.credits);
});
