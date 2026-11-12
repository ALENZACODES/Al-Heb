// A10 audio packs: src/audiolab/packs.js (cache logic), src/audiolab/packs.card.js (the card on Use Aleph offline), sw.js (serves and never trims).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDocument, flush } from './rimon.fakedom.js';
import { PACK_CACHE, PACK_HEADER, packStatus, downloadPack, removePack } from '../src/audiolab/packs.js';

function fakeCaches() {
  const stores = new Map();
  const open = async (name) => { if (!stores.has(name)) stores.set(name, new Map()); const m = stores.get(name);
    return { match: async (u) => m.get(u) || null, put: async (u, r) => { m.set(u, r); }, delete: async (u) => m.delete(u), keys: async () => [...m.keys()] }; };
  return { stores, open, match: async (u) => { for (const m of stores.values()) if (m.has(u)) return m.get(u); return null; } };
}
const resp = (n) => ({ ok: true, status: 200, headers: { get: (k) => (k === 'content-type' ? 'audio/mpeg' : null) }, arrayBuffer: async () => new ArrayBuffer(n) });
const base = 'http://x.test/';

test('download saves only what is missing into the pack cache, sends the pack header, measures bytes and reports progress', async () => {
  const caches = fakeCaches();
  (await caches.open('alef-runtime-v1')).put(`${base}a.mp3`, new Response(new ArrayBuffer(5)));
  const asked = []; const progress = [];
  const r = await downloadPack(['a.mp3', 'b.mp3', 'c.mp3'], { base, caches, fetch: async (u, init) => { asked.push([u, init.headers[PACK_HEADER]]); return u.endsWith('c.mp3') ? { ok: false, status: 404 } : resp(1000); }, onProgress: (p) => progress.push(p) });
  assert.deepEqual(asked, [[`${base}b.mp3`, '1'], [`${base}c.mp3`, '1']], 'a.mp3 was already on the device');
  assert.equal(r.requested, 2); assert.equal(r.ok, 1); assert.equal(r.bytes, 1000);
  assert.deepEqual(r.failed.map((f) => f.path), ['c.mp3']);
  assert.deepEqual(progress.at(-1), { done: 2, total: 2, bytes: 1000 });
  assert.ok(caches.stores.get(PACK_CACHE).has(`${base}b.mp3`));
  const st = await packStatus(['a.mp3', 'b.mp3', 'c.mp3'], { base, caches });
  assert.equal(st.saved, 2); assert.equal(st.inPack, 1); assert.equal(st.bytes, 1005); assert.deepEqual(st.missing, ['c.mp3']);
  assert.equal(await removePack(['a.mp3', 'b.mp3'], { base, caches }), 1, 'only the pack cache is touched');
  assert.equal((await packStatus(['a.mp3'], { base, caches })).saved, 1);
});

test('offline or cancelled downloads say so and keep what was saved', async () => {
  const caches = fakeCaches();
  assert.equal((await downloadPack(['a.mp3'], { base, caches, fetch: async () => resp(1), online: () => false })).offline, true);
  const ac = new AbortController();
  const r = await downloadPack(['a.mp3', 'b.mp3'], { base, caches, signal: ac.signal, fetch: async () => { ac.abort(); return resp(10); } });
  assert.equal(r.aborted, true); assert.equal(r.ok, 1);
});

test('the service worker answers a saved pack clip (ranges too), never trims the pack, and does not copy a pack download', () => {
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(sw, /const PACK = 'alef-audio-pack-v1';/);
  assert.match(sw, /\(await cache\.match\(req\.url\)\) \|\| \(await \(await caches\.open\(PACK\)\)\.match\(req\.url\)\)/);
  assert.match(sw, /req\.headers\.get\('x-alef-pack'\) === '1'\) \{ event\.respondWith\(clipFetch\(req\.url\)\); return; \}/);
  assert.ok(!/caches\.delete\(PACK\)|alef-audio-pack-v1'\)\.then\(\(c\) => c\.delete/.test(sw));
  const trim = sw.slice(sw.indexOf('async function trimClips'), sw.indexOf('async function putClip'));
  assert.ok(!trim.includes('PACK'));
});

test('the card on Use Aleph offline: choose a book, see the clip count and what is saved, save with progress', async () => {
  const doc = createDocument(); globalThis.document = doc;
  const { mountAudioPacks } = await import('../src/audiolab/packs.card.js');
  const book = { pages: [{ audio: { f: 'audio/f/israeli/book/bk-p01.mp3' } }, { audio: { f: 'audio/f/israeli/book/bk-p02.mp3' } }, { audioHeld: true, audio: { f: 'h.mp3' } }] };
  const files = { 'data/books/index.json': { books: [{ id: 'bk', titleEn: 'Test Book', hasAudio: true }] }, 'data/corpus/registry.json': { entries: [] }, 'data/curriculum/lessons.json': { lessons: [] }, 'data/books/bk.json': book };
  const caches = fakeCaches();
  const fetch = async (u) => (files[u] ? { ok: true, json: async () => files[u] } : resp(2048));
  const host = doc.createElement('div');
  globalThis.location = { href: base };
  mountAudioPacks(host, { settings: { get: () => 'f' }, audio: null }, { fetch, caches, navigator: { onLine: true } });
  await flush(5);
  const pick = host.querySelector('#of-audio-pick');
  assert.ok(pick.querySelectorAll('option').some((o) => o.textContent === 'Book: Test Book'));
  pick.dispatchEvent({ type: 'change', target: { value: 'book-bk' } });
  await flush(5);
  assert.match(host.querySelector('#of-audio-info').textContent, /Book: Test Book: 2 clips\. 0 of 2 on this device\./);
  host.querySelector('#of-audio-save').dispatchEvent({ type: 'click' });
  await flush(10);
  assert.match(host.querySelector('#of-audio-status').textContent, /Saved 2 clips \(4 KB\)/);
  assert.match(host.querySelector('#of-audio-info').textContent, /2 of 2 on this device \(4 KB\)/);
  delete globalThis.location;
});

test('Use Aleph offline loads the Audio Packs card on demand and no longer says clips cannot be saved', () => {
  const v = readFileSync(new URL('../src/shell/offline.view.js', import.meta.url), 'utf8');
  assert.match(v, /import\("\.\.\/audiolab\/packs\.card\.js"\)/);
  assert.match(v, /Audio Packs below save them on purpose/);
});
