// First route must not wait for the ~1.3 MB core audio manifest; audio availability resolves lazily and honestly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAudio } from '../src/audio/player.js';
import { createShellAudio } from '../src/shell/audio.js';
import { fetchCoreManifest, fetchAudioSummary, afterPaint } from '../src/shell/audio-manifest.js';
import { wireSoundBar } from '../src/shell/audio-access.js';

const entry = { path: 'audio/m/israeli/letter/bet.mp3', voice: 'm', tradition: 'israeli', kind: 'letter', id: 'bet', text: 'בֵּית', status: 'recorded', source: 'x' };
const settings = { get: (k) => ({ voice: 'm', congregation: 'israeli' })[k] };
class FakeAudio { constructor(u) { this.u = u; } play() { queueMicrotask(() => this.onended?.()); return Promise.resolve(); } pause() {} }
const make = (loadManifest) => createShellAudio({ settings, loadManifest, createAudio: (o) => createAudio({ ...o, AudioCtor: FakeAudio, speech: null }) });
const deferred = () => { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; };

test('app.js does not await the core manifest before the router starts', () => {
  const src = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  const boot = src.slice(src.indexOf('async function boot()'));
  assert.ok(!/await[^\n]*manifest/i.test(boot), 'boot must not await a manifest');
  assert.ok(!/fetch\('data\/audio\/manifest\.json'\)/.test(src.slice(0, src.indexOf('async function boot()'))), 'no eager manifest fetch in makeAudio');
  assert.ok(boot.indexOf('router.start()') < boot.indexOf('scheduleManifest('), 'manifest is scheduled after the router starts');
  assert.ok(!/ensureManifest\(\)/.test(src.slice(src.indexOf('function scheduleManifest'), src.indexOf('function refreshWhenCalm'))), 'scheduleManifest only watches; it never starts the load');
  assert.ok(!/loader\.load\(\)/.test(src.slice(src.indexOf('function startShardLoading'), src.indexOf('audio.onNeed(')) ), 'the shard is not loaded at boot');
});

test('nothing is fetched at creation: idle state, idle status text, no clip counts, the sound-bar subscriber gets the idle text', () => {
  let calls = 0;
  const a = make(async () => { calls++; return [entry]; });
  assert.equal(a.manifestState, 'idle'); assert.equal(calls, 0); assert.equal(a.loading, null);
  assert.equal(a.state.mode, 'idle'); assert.match(a.state.text, /not been loaded/);
  assert.ok(!/clips listed/.test(a.state.text) && !/checking/i.test(a.state.text), 'no claim about recordings before a load');
  let seen; a.subscribe((s) => { seen = s; }); assert.equal(seen.mode, 'idle'); assert.match(seen.text, /not been loaded/);
  assert.equal(a.summary.total, 0); assert.equal(calls, 0, 'reading state never loads');
});

test('first status()/has() starts the one lazy load; onNeed reports the kind', async () => {
  let calls = 0; const d = deferred();
  const a = make(() => { calls++; return d.p; });
  const kinds = []; a.onNeed((k) => kinds.push(k));
  assert.equal(a.has('letter', 'bet'), false);
  assert.equal(calls, 0, 'the load starts in a microtask, after the synchronous check');
  assert.equal(a.manifestState, 'checking'); assert.ok(a.loading);
  a.status('word', 'x'); a.has('letter', 'bet');
  await Promise.resolve(); await Promise.resolve();
  assert.equal(calls, 1, 'one load however many checks'); assert.deepEqual(kinds, ['letter', 'word', 'letter']);
  d.res([entry]); await a.loading; assert.equal(a.manifestState, 'ready'); assert.equal(a.has('letter', 'bet'), true);
});

test('a failed load is not retried by every status() call (only by play/ensureManifest)', async () => {
  let calls = 0; const a = make(async () => { calls++; throw new Error('offline'); });
  a.status('letter', 'bet'); await a.loading; assert.equal(a.manifestState, 'offline');
  a.status('letter', 'bet'); a.has('letter', 'bet'); await Promise.resolve(); assert.equal(calls, 1);
});

test('while the manifest is pending: has() is false, status says checking, nothing is claimed to exist', async () => {
  const d = deferred();
  const a = make(() => d.p);
  assert.equal(a.manifestState, 'idle');
  const states = []; a.onManifestState((x) => states.push(x));
  assert.equal(a.has('letter', 'bet'), false);
  assert.equal(a.manifestState, 'checking');
  const s = a.status('letter', 'bet');
  assert.equal(s.source, 'none'); assert.equal(s.reason, 'checking audio...');
  assert.match(a.state.text, /checking/i);
  assert.ok(!/clips listed/.test(a.state.text), 'no clip counts before the manifest is loaded');
  const ready = a.ensureManifest(); const again = a.ensureManifest();
  assert.equal(ready, again, 'in-flight load is shared');
  d.res([entry]);
  assert.equal(await ready, true);
  assert.equal(a.manifestState, 'ready'); assert.deepEqual(states, ['checking', 'ready']);
  assert.equal(a.has('letter', 'bet'), true);
  assert.equal(a.status('letter', 'bet').source, 'file');
  assert.equal(a.summary.recorded, 1);
  assert.match(a.state.text, /1 clips listed as "Recorded by a human reader"/);
});

test('play() waits for the manifest instead of guessing', async () => {
  const d = deferred(); const a = make(() => d.p);
  const pr = a.play('letter', 'bet');
  d.res([entry]);
  const r = await pr;
  assert.equal(r.source, 'file');
});

test('failed manifest load: offline state, honest text, still no false claim, retried on next ensure', async () => {
  let n = 0;
  const a = make(async () => { if (++n === 1) throw new Error('offline'); return [entry]; });
  assert.equal(await a.ensureManifest(), false);
  assert.equal(a.manifestState, 'offline'); assert.equal(a.has('letter', 'bet'), false);
  assert.match(a.state.text, /could not be loaded/);
  assert.equal(await a.ensureManifest(), true);
  assert.equal(a.has('letter', 'bet'), true);
});

test('failed manifest load with a summary of zero clips: still offline, but the line stays the idle "No recordings yet" text', async () => {
  const mk = (loadSummary) => createShellAudio({ settings, loadManifest: async () => { throw new Error('offline'); }, loadSummary, createAudio: (o) => createAudio({ ...o, AudioCtor: FakeAudio, speech: null }) });
  const a = mk(async () => ({ total: 10, recorded: 0, tts: 0 }));
  assert.equal(await a.ensureManifest(), false);
  assert.equal(a.manifestState, 'offline'); assert.equal(a.has('letter', 'bet'), false);
  assert.equal(a.state.text, "No recordings yet. Uses your device's Hebrew voice, if it has one."); assert.equal(a.state.mode, 'idle');
  // clips are listed (or the summary is unavailable / malformed): the honest "could not be loaded" line stays
  for (const ls of [async () => ({ total: 10, recorded: 2, tts: 0 }), async () => ({ total: 10, recorded: 0, tts: 3 }), async () => { throw new Error('offline'); }, async () => null, undefined]) {
    const b = mk(ls); await b.ensureManifest(); assert.match(b.state.text, /could not be loaded/);
  }
});

test('fetchAudioSummary accepts {recorded,tts} and rejects HTTP errors and non-summaries', async () => {
  const ok = (body) => async () => ({ ok: true, status: 200, json: async () => body });
  assert.deepEqual(await fetchAudioSummary(ok({ total: 5, recorded: 0, tts: 0 })), { total: 5, recorded: 0, tts: 0 });
  await assert.rejects(fetchAudioSummary(async () => ({ ok: false, status: 404 })));
  await assert.rejects(fetchAudioSummary(ok([1])));
  await assert.rejects(fetchAudioSummary(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('html'); } })));
});

test('a preloaded manifest keeps the old synchronous behaviour', () => {
  const a = createShellAudio({ settings, manifest: [entry], createAudio: (o) => createAudio({ ...o, AudioCtor: FakeAudio, speech: null }) });
  assert.equal(a.manifestState, 'ready'); assert.equal(a.has('letter', 'bet'), true);
});

test('fetchCoreManifest rejects HTTP errors and non-lists (e.g. offline.html)', async () => {
  await assert.rejects(fetchCoreManifest(async () => ({ ok: false, status: 503 })));
  await assert.rejects(fetchCoreManifest(async () => ({ ok: true, json: async () => { throw new SyntaxError('html'); } })));
  await assert.rejects(fetchCoreManifest(async () => ({ ok: true, json: async () => ({}) })));
  assert.deepEqual(await fetchCoreManifest(async () => ({ ok: true, json: async () => [entry] })), [entry]);
});

test('afterPaint defers to a frame then an idle slot', () => {
  const log = [];
  const win = { requestAnimationFrame: (f) => { log.push('raf'); f(); }, setTimeout: (f) => { log.push('t'); f(); }, requestIdleCallback: (f, o) => { log.push('idle' + o.timeout); f(); } };
  afterPaint(() => log.push('run'), { win });
  assert.deepEqual(log, ['raf', 't', 'idle1500', 'run']);
});

test('the audio manifest is on demand and its loader module is still precached for offline use', () => {
  const pre = readFileSync(new URL('../precache-manifest.js', import.meta.url), 'utf8');
  assert.ok(pre.includes('"data/audio/manifest.json"') && pre.indexOf('"data/audio/manifest.json"') > pre.indexOf('ALEF_ON_DEMAND'), 'the audio manifest is listed as on demand (runtime-cached), not installed');
  assert.ok(pre.includes('"src/shell/audio-manifest.js"'));
});

test('sound bar: nothing is shown until the list has been asked for; a real failure is shown', async () => {
  const d = deferred();
  const a = make(() => d.p);
  assert.equal(a.state.pending, true, 'nothing asked yet: the "not loaded yet" line is flagged pending, not news');
  const bar = { hidden: true, querySelector: () => null };
  const doc = { querySelector: (q) => (q === '.sound-bar' ? bar : null), getElementById: () => null };
  const w = wireSoundBar(a, { doc, storage: { getItem: () => null, setItem() {} } });
  assert.equal(bar.hidden, true, 'hidden on the first screen');
  a.has('word', 'x');
  assert.equal(a.state.pending, true, 'still loading: still hidden');
  w.show(a.state.mode, !!a.state.pending); assert.equal(bar.hidden, true);
  d.rej(new Error('offline')); await a.ensureManifest();
  assert.equal(a.manifestState, 'offline'); assert.ok(!a.state.pending);
  w.show(a.state.mode, !!a.state.pending); assert.equal(bar.hidden, false, 'a failed load is shown');
  assert.match(a.state.text, /could not be loaded/);
  const ok = make(async () => [entry]); await ok.ensureManifest();
  assert.ok(!ok.state.pending, 'once loaded the status is the real one');
});
test('index.html ships the sound bar hidden, and app.js hides it while the state is pending', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<div class="sound-bar" hidden /);
  assert.match(readFileSync(new URL('../src/app.js', import.meta.url), 'utf8'), /soundBar\.show\(s\.mode, !!s\.pending\)/);
});
