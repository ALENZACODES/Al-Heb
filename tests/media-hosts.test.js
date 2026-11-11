// Media hosts: audio folders that are also served from the alef-packs and alef-audio repositories.
// Checks the generated table, the address mapping, that the worker asks the host first and falls back to this site,
// and that no hosted folder has changed here since the hosts were last synced (needs a git checkout; skipped without one).
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import { readConfig, scriptText, tree, digest, ROOT } from '../tools/deploy/media-hosts.mjs';

const cfg = readConfig();
const JS = readFileSync(new URL('../media-hosts.js', import.meta.url), 'utf8');
const SW = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const SCOPE = 'https://alef.test/';
const PACKS = 'https://alenzacodes.github.io/alef-packs/';
const AUDIO_HOST = 'https://alenzacodes.github.io/alef-audio/';

function mapper() { const self = {}; vm.runInNewContext(JS, { self, URL }); return self; }

test('media-hosts.js is what the tool writes from tools/deploy/media-hosts.json', () => {
  assert.equal(JS, scriptText(cfg), 'run node tools/deploy/media-hosts.mjs --write');
  assert.equal(cfg.schema, 'alef.media-hosts.v1');
  for (const h of cfg.hosts) { assert.match(h.host, /^https:\/\/[a-z0-9.-]+\/[a-z0-9-]+\/$/); for (const p of h.prefixes) assert.match(p, /^audio\/[mf]\/[a-z]+\/$/); }
  const all = cfg.hosts.flatMap((h) => h.prefixes);
  assert.equal(new Set(all).size, all.length, 'a folder lives on one host only');
  assert.equal(scriptText({ ...cfg, enabled: false }).includes('self.ALEF_MEDIA_HOSTS = [];'), true, 'switching it off empties the table');
});

test('a clip address maps to its host only for hosted folders of this site', () => {
  const m = mapper();
  assert.equal(m.alefMediaUrl(SCOPE + 'audio/f/israeli/word/r01-w1.mp3', SCOPE), PACKS + 'audio/f/israeli/word/r01-w1.mp3');
  assert.equal(m.alefMediaUrl(SCOPE + 'audio/m/israeli/line/x.mp3', SCOPE), AUDIO_HOST + 'audio/m/israeli/line/x.mp3');
  assert.equal(m.alefMediaUrl(SCOPE + 'audio/m/english/a.mp3?v=2', SCOPE), AUDIO_HOST + 'audio/m/english/a.mp3?v=2');
  // a site served from a sub-path (GitHub Pages project site)
  assert.equal(m.alefMediaUrl('https://x.github.io/Al-Heb/audio/f/english/a.mp3', 'https://x.github.io/Al-Heb/'), AUDIO_HOST + 'audio/f/english/a.mp3');
  // not hosted: other traditions, music, builder words, pictures, other sites, nonsense
  for (const p of ['audio/f/sephardi/word/a.mp3', 'audio/m/ashkenazi/word/a.mp3', 'audio/music/dayenu.mp3', 'audio/builder/a_ari.mp3', 'assets/img/a.webp', 'data/audio/manifest.json']) assert.equal(m.alefMediaUrl(SCOPE + p, SCOPE), null, p);
  assert.equal(m.alefMediaUrl('https://elsewhere.test/audio/f/israeli/word/a.mp3', SCOPE), null);
  assert.equal(m.alefMediaUrl('https://x.github.io/other/audio/f/israeli/a.mp3', 'https://x.github.io/Al-Heb/'), null);
  assert.equal(m.alefMediaUrl('::::', 'not a url'), null);
});

/** sw.js in a sandbox with the media table loaded; `net(url, init)` plays the network. */
function worker(net) {
  const calls = [];
  const self = { ALEF_VERSION: 'v', ALEF_PRECACHE: [], location: { origin: 'https://alef.test' }, registration: { scope: SCOPE }, addEventListener() {} };
  const ctx = { self, URL, Response, Headers, AbortController, setTimeout, clearTimeout, caches: {},
    importScripts(f) { if (f === 'media-hosts.js') vm.runInNewContext(JS, { self, URL }); },
    fetch: async (req, init) => { const url = typeof req === 'string' ? req : req.url; calls.push({ url, init }); return net(url, init); } };
  ctx.globalThis = ctx;
  vm.runInNewContext(SW, ctx);
  return { clipFetch: self.clipFetch, calls };
}
const OWN = SCOPE + 'audio/f/israeli/word/r01-w1.mp3';
const HOSTED = PACKS + 'audio/f/israeli/word/r01-w1.mp3';

test('worker: a hosted clip is asked from the media host first, and the range the player wants goes with it', async () => {
  const w = worker(async (url) => new Response('host bytes', { status: url.startsWith(PACKS) ? 206 : 500 }));
  const res = await w.clipFetch({ url: OWN, headers: new Headers({ range: 'bytes=0-' }) });
  assert.equal(res.status, 206);
  assert.equal(await res.text(), 'host bytes');
  assert.deepEqual(w.calls.map((c) => c.url), [HOSTED]);
  assert.equal(w.calls[0].init.mode, 'cors');
  assert.equal(w.calls[0].init.credentials, 'omit');
  assert.equal(w.calls[0].init.headers.Range, 'bytes=0-');
});

test('worker: when the host fails, is missing the clip or cannot be reached, this site answers as before', async () => {
  for (const hostAnswer of [async () => new Response('', { status: 404 }), async () => new Response('', { status: 503 }), async () => { throw new TypeError('offline'); }]) {
    const w = worker(async (url) => (url.startsWith(PACKS) ? hostAnswer() : new Response('own bytes', { status: 200 })));
    const res = await w.clipFetch(OWN);
    assert.equal(await res.text(), 'own bytes');
    assert.deepEqual(w.calls.map((c) => c.url), [HOSTED, OWN]);
  }
  // both down: the failure is this site's, exactly as without media hosts
  const down = worker(async () => { throw new TypeError('offline'); });
  await assert.rejects(() => down.clipFetch(OWN), /offline/);
});

test('worker: a clip whose folder is not hosted never touches a media host', async () => {
  const w = worker(async () => new Response('own', { status: 200 }));
  for (const p of ['audio/f/sephardi/word/a.mp3', 'audio/music/dayenu.mp3', 'audio/builder/a_noa.mp3']) await w.clipFetch(SCOPE + p);
  assert.ok(w.calls.every((c) => c.url.startsWith(SCOPE)));
  assert.equal(w.calls.length, 3);
});

test('worker: the import is guarded, so a missing table cannot stop the worker installing', () => {
  assert.match(SW, /try \{ importScripts\('media-hosts\.js'\); \} catch/);
});

test('no hosted folder has changed here since the media hosts were last synced', { skip: !existsSync(new URL('../.git', import.meta.url)) && 'not a git checkout' }, (t) => {
  for (const h of cfg.hosts) for (const prefix of h.prefixes) {
    let now;
    try { now = tree(ROOT, prefix); } catch { t.skip('git is not available'); return; }
    if (!now.size) { t.skip(`${prefix} is not in this checkout`); return; }
    assert.equal(digest(now), cfg.trees[prefix], `${prefix} changed: sync the media repositories (node tools/deploy/media-hosts.mjs --sync <alef-packs clone> <alef-audio clone>), push them, then commit tools/deploy/media-hosts.json`);
  }
});
