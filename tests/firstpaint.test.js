// First route must not wait for the ~1.3 MB core audio manifest; audio availability resolves lazily and honestly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAudio } from '../src/audio/player.js';
import { createShellAudio } from '../src/shell/audio.js';
import { fetchCoreManifest, afterPaint } from '../src/shell/audio-manifest.js';

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
});

test('while the manifest is pending: has() is false, status says checking, nothing is claimed to exist', async () => {
  const d = deferred();
  const a = make(() => d.p);
  assert.equal(a.manifestState, 'checking');
  assert.equal(a.has('letter', 'bet'), false);
  const s = a.status('letter', 'bet');
  assert.equal(s.source, 'none'); assert.equal(s.reason, 'checking audio...');
  assert.match(a.state.text, /checking/i);
  assert.ok(!/clips listed/.test(a.state.text), 'no clip counts before the manifest is loaded');
  const states = []; a.onManifestState((x) => states.push(x));
  const ready = a.ensureManifest(); const again = a.ensureManifest();
  assert.equal(ready, again, 'in-flight load is shared');
  d.res([entry]);
  assert.equal(await ready, true);
  assert.equal(a.manifestState, 'ready'); assert.deepEqual(states, ['ready']);
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

test('the core manifest and the new module are still precached for offline use', () => {
  const pre = readFileSync(new URL('../precache-manifest.js', import.meta.url), 'utf8');
  assert.ok(pre.includes('"data/audio/manifest.json"'));
  assert.ok(pre.includes('"src/shell/audio-manifest.js"'));
});
