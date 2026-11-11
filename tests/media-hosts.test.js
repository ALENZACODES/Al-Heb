// Media hosts: audio folders that are also served from the alef-packs and alef-audio repositories.
// Checks the generated table, the address mapping, that the worker asks the host first and falls back to this site,
// and that no clip can come from a host that holds an older take: a sub-folder is in the table only while its clips here
// are the ones the host was last synced to (needs a git checkout with the audio; skipped without one).
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readConfig, scriptText, rows, drift, tree, workTree, partOf, partStates, stateNow, digest, ROOT } from '../tools/deploy/media-hosts.mjs';

const cfg = readConfig();
const JS = readFileSync(new URL('../media-hosts.js', import.meta.url), 'utf8');
const SW = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
const SCOPE = 'https://alef.test/';
const PACKS = 'https://alenzacodes.github.io/alef-packs/';
const AUDIO_HOST = 'https://alenzacodes.github.io/alef-audio/';

/** The clips as they stand in this checkout, or a reason why they cannot be read (no git, or a checkout without the audio). */
function standing() {
  if (!existsSync(new URL('../.git', import.meta.url))) return { skip: 'not a git checkout' };
  let now;
  try { now = stateNow(cfg); } catch { return { skip: 'git is not available' }; }
  for (const h of cfg.hosts) for (const prefix of h.prefixes) if (!Object.keys(now).some((k) => k.startsWith(prefix))) return { skip: `${prefix} is not in this checkout` };
  return { now };
}

function mapper() { const self = {}; vm.runInNewContext(JS, { self, URL }); return self; }

test('media-hosts.js is what the tool writes from tools/deploy/media-hosts.json and the clips as they stand here', (t) => {
  assert.equal(cfg.schema, 'alef.media-hosts.v2');
  for (const h of cfg.hosts) { assert.match(h.host, /^https:\/\/[a-z0-9.-]+\/[a-z0-9-]+\/$/); for (const p of h.prefixes) assert.match(p, /^audio\/[mf]\/[a-z]+\/$/); }
  const all = cfg.hosts.flatMap((h) => h.prefixes);
  assert.equal(new Set(all).size, all.length, 'a folder lives on one host only');
  for (const k of Object.keys(cfg.trees)) assert.ok(all.some((p) => k.startsWith(p)), `${k} is recorded but not hosted`);
  assert.equal(scriptText({ ...cfg, enabled: false }, cfg.trees).includes('self.ALEF_MEDIA_HOSTS = [];'), true, 'switching it off empties the table');
  const s = standing();
  if (s.skip) { t.skip(s.skip); return; }
  assert.equal(JS, scriptText(cfg, s.now), 'a clip in a hosted folder changed: run node tools/deploy/media-hosts.mjs --write (its folder is then served by this site until the next sync)');
});

test('a sub-folder is in the table only while its clips here are the ones the host was synced to', () => {
  const H1 = 'https://h.test/one/', H2 = 'https://h.test/two/';
  const c = { enabled: true, hosts: [{ host: H1, repo: 'o/one', prefixes: ['audio/f/x/'] }, { host: H2, repo: 'o/two', prefixes: ['audio/m/x/'] }],
    trees: { 'audio/f/x/word/': 'A', 'audio/f/x/line/': 'B', 'audio/m/x/word/': 'C' } };
  // all in step: one row per hosted folder
  assert.deepEqual(rows(c, { ...c.trees }), [['audio/f/x/', H1], ['audio/m/x/', H2]]);
  assert.deepEqual(drift(c, { ...c.trees }), []);
  // a clip in line/ was re-recorded here: line/ leaves the table, its neighbour and the other host stay
  const changed = { ...c.trees, 'audio/f/x/line/': 'B2' };
  assert.deepEqual(rows(c, changed), [['audio/f/x/word/', H1], ['audio/m/x/', H2]]);
  assert.deepEqual(drift(c, changed).map((d) => d.folder), ['audio/f/x/line/']);
  // a sub-folder that is new here was never synced: not sent to the host
  assert.deepEqual(rows(c, { ...c.trees, 'audio/m/x/book/': 'N' }), [['audio/f/x/', H1], ['audio/m/x/word/', H2]]);
  // a sub-folder that is gone here
  assert.deepEqual(rows(c, { 'audio/f/x/word/': 'A', 'audio/m/x/word/': 'C' }), [['audio/f/x/word/', H1], ['audio/m/x/', H2]]);
  // everything changed: nothing goes to a host; switched off: nothing either
  assert.deepEqual(rows(c, { 'audio/f/x/word/': 'Z', 'audio/f/x/line/': 'Z', 'audio/m/x/word/': 'Z' }), []);
  assert.deepEqual(rows({ ...c, enabled: false }, { ...c.trees }), []);
  // loose clips directly in a hosted folder cannot be told apart by a folder row once the folder is split: this site keeps them
  const loose = { ...c, trees: { ...c.trees, 'audio/f/x/': 'L' } };
  assert.deepEqual(rows(loose, { ...loose.trees }), [['audio/f/x/', H1], ['audio/m/x/', H2]]);
  assert.deepEqual(rows(loose, { ...loose.trees, 'audio/f/x/line/': 'B2' }), [['audio/f/x/word/', H1], ['audio/m/x/', H2]]);
  assert.equal(partOf('audio/f/x/word/a.mp3', 'audio/f/x/'), 'audio/f/x/word/');
  assert.equal(partOf('audio/f/x/word/deep/a.mp3', 'audio/f/x/'), 'audio/f/x/word/');
  assert.equal(partOf('audio/f/x/a.mp3', 'audio/f/x/'), 'audio/f/x/');
  const parts = partStates(new Map([['audio/f/x/word/a.mp3', '1'], ['audio/f/x/word/b.mp3', '2'], ['audio/f/x/line/c.mp3', '3']]), 'audio/f/x/');
  assert.deepEqual(Object.keys(parts), ['audio/f/x/line/', 'audio/f/x/word/']);
  assert.match(parts['audio/f/x/word/'], /^2 files [0-9a-f]{20}$/);
});

test('the folder state is read from the files as they stand, so a clip changed, added or deleted before the commit counts', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'media-hosts-'));
  const git = (...a) => execFileSync('git', ['-C', dir, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  try {
    try { git('init', '-q'); } catch { t.skip('git is not available'); return; }
    git('config', 'user.email', 't@alef.test'); git('config', 'user.name', 't'); git('config', 'commit.gpgsign', 'false');
    mkdirSync(join(dir, 'audio/f/x/word'), { recursive: true });
    for (const [f, body] of [['a.mp3', 'one'], ['b.mp3', 'two'], ['c.mp3', 'three'], ['a.mp3.meta.json', '{}']]) writeFileSync(join(dir, 'audio/f/x/word', f), body);
    git('add', '-A'); git('commit', '-q', '-m', 'clips');
    const before = workTree(dir, 'audio/f/x/');
    assert.deepEqual([...before.keys()].sort(), ['audio/f/x/word/a.mp3', 'audio/f/x/word/b.mp3', 'audio/f/x/word/c.mp3'], 'clips only: the notes beside them are not hosted');
    assert.deepEqual([...before], [...tree(dir, 'audio/f/x/')], 'a clean checkout is the last commit');
    writeFileSync(join(dir, 'audio/f/x/word/a.mp3'), 'one, a new take');           // changed
    writeFileSync(join(dir, 'audio/f/x/word/d.mp3'), 'four');                      // added, not tracked
    rmSync(join(dir, 'audio/f/x/word/c.mp3'));                                    // deleted
    writeFileSync(join(dir, 'audio/f/x/word/a.mp3.meta.json'), '{"retake":1}');   // a note: not a clip
    const after = workTree(dir, 'audio/f/x/');
    assert.deepEqual([...after.keys()].sort(), ['audio/f/x/word/a.mp3', 'audio/f/x/word/b.mp3', 'audio/f/x/word/d.mp3']);
    assert.notEqual(after.get('audio/f/x/word/a.mp3'), before.get('audio/f/x/word/a.mp3'));
    assert.equal(after.get('audio/f/x/word/b.mp3'), before.get('audio/f/x/word/b.mp3'));
    assert.equal(after.get('audio/f/x/word/a.mp3'), git('hash-object', 'audio/f/x/word/a.mp3').trim());
    assert.notEqual(digest(after), digest(before));
    // and once committed the same state is read from the commit
    git('add', '-A'); git('commit', '-q', '-m', 'retake');
    assert.deepEqual([...workTree(dir, 'audio/f/x/')].sort(), [...after].sort());
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a clip address maps to its host only for hosted folders of this site', () => {
  const m = mapper();
  assert.equal(m.alefMediaUrl(SCOPE + 'audio/f/israeli/word/r01-w1.mp3', SCOPE), PACKS + 'audio/f/israeli/word/r01-w1.mp3');
  assert.equal(m.alefMediaUrl(SCOPE + 'audio/m/israeli/word/x.mp3', SCOPE), AUDIO_HOST + 'audio/m/israeli/word/x.mp3');
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

test('every folder the table sends to a host holds exactly the clips that host was last synced to', (t) => {
  const s = standing();
  if (s.skip) { t.skip(s.skip); return; }
  const table = mapper().ALEF_MEDIA_HOSTS;
  assert.ok(Array.isArray(table));
  const hostOf = Object.fromEntries(cfg.hosts.flatMap((h) => h.prefixes.map((p) => [p, h.host])));
  for (const [prefix, host] of table) {
    const top = Object.keys(hostOf).find((p) => prefix.startsWith(p));
    assert.ok(top, `${prefix} is not a hosted folder`);
    assert.equal(host, hostOf[top], `${prefix} is sent to the wrong host`);
    const here = Object.keys(s.now).filter((k) => k.startsWith(prefix));
    assert.ok(here.length, `${prefix} has no clips here`);
    for (const k of here) assert.equal(s.now[k], cfg.trees[k], `${k} changed here since the hosts were synced but media-hosts.js still sends it to ${host}: run node tools/deploy/media-hosts.mjs --write`);
  }
});
