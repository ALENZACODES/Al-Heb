// Listening on this device (src/speak/ondevice.js, createListener in src/speak/recognizer.js, the Settings entries, the letter
// check, Talk). No browser, no microphone, no network: every outside piece is a stand-in.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

class N {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { this.children.push(...c.flat().filter((x) => x != null).map((x) => (typeof x === 'object' ? x : { nodeType: 3, data: String(x) }))); }
  replaceChildren(...c) { this.children = []; this.append(...c); }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v) }]; }
  get textContent() { return this.text; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  click() { for (const f of this.listeners.click || []) f({}); if (this.onclick) this.onclick({}); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }) };
const flush = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (f) => { for (let i = 0; i < 200; i++) { const v = f(); if (v) return v; await flush(); } throw new Error('timed out'); };
const root = fileURLToPath(new URL('..', import.meta.url));

const R = await import('../src/speak/recognizer.js');
const D = await import('../src/speak/ondevice.js');
const loader = await import('../assets/vendor/_alef-tools/loader@0.1.0/index.js');

const storage = (init = {}) => { const m = new Map(Object.entries(init)); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }; };
const micWin = (pack, extra = {}) => ({ localStorage: storage(pack ? { [R.PACK_KEY]: pack } : {}), navigator: { mediaDevices: { getUserMedia: async () => ({}) } }, AudioContext: class {}, ...extra });
const BrowserRec = (text) => class { start() { setTimeout(() => { this.onresult?.({ results: [[{ transcript: text }]] }); this.onend?.(); }, 0); } abort() {} };

// ---- which recognizer answers ----------------------------------------------------------------------------------------
test('devicePack: the remembered pack, only when this browser can record', () => {
  assert.equal(R.devicePack(micWin('listen-lite')), 'listen-lite');
  assert.equal(R.devicePack(micWin('listen-best')), 'listen-best');
  assert.equal(R.devicePack(micWin('')), '');
  assert.equal(R.devicePack(micWin('something-else')), '');
  assert.equal(R.devicePack({ localStorage: storage({ [R.PACK_KEY]: 'listen-lite' }), navigator: {} }), '', 'no microphone API');
  assert.equal(R.devicePack({ get localStorage() { throw new Error('blocked'); } }), '');
});

test('createListener: without a pack the browser recognizer answers, and it is labelled as the fallback', async () => {
  const l = R.createListener({ pack: '', Ctor: BrowserRec('שלום') });
  assert.equal(l.engine, 'browser'); assert.equal(l.note, R.FALLBACK_NOTE);
  assert.match(R.FALLBACK_NOTE, /^Fallback: /); assert.match(R.FALLBACK_NOTE, /may send the audio to its maker/); assert.match(R.FALLBACK_NOTE, /Language Packs page/);
  for (const t of [R.FALLBACK_NOTE, R.DEVICE_NOTE]) assert.doesNotMatch(t, /\b(AI|model|neural|machine learning|algorithm)\b/i);
  assert.deepEqual(await l.listen(), { ok: true, alternatives: ['שלום'], error: undefined, engine: 'browser' });
  const none = R.createListener({ pack: '', Ctor: null });
  assert.deepEqual([none.engine, none.supported, none.note], ['none', false, '']);
});

test('createListener: with a pack this device answers and the browser recognizer is never started', async () => {
  let started = 0, loads = 0;
  const Ctor = class { start() { started++; } abort() {} };
  const l = R.createListener({ pack: 'listen-lite', Ctor, loadDevice: async () => { loads++; return { createDeviceRecognizer: (o) => ({ listening: false, listen: async () => ({ ok: true, alternatives: [`heard with ${o.pack}`], engine: 'device' }), stop() {} }) }; } });
  assert.equal(loads, 0, 'the device code is not loaded until the first listen');
  assert.deepEqual([l.engine, l.supported, l.note], ['device', true, R.DEVICE_NOTE]);
  assert.match(R.DEVICE_NOTE, /on this device/); assert.match(R.DEVICE_NOTE, /Nothing you say leaves it/);
  assert.deepEqual(await l.listen(), { ok: true, alternatives: ['heard with listen-lite'], engine: 'device' });
  await l.listen();
  assert.deepEqual([loads, started], [1, 0]);
});

test('createListener: when the pack is gone or cannot run, the browser recognizer takes over and the label changes', async () => {
  for (const error of ['pack-missing', 'pack-failed']) {
    const l = R.createListener({ pack: 'listen-lite', Ctor: BrowserRec('תודה'), loadDevice: async () => ({ createDeviceRecognizer: () => ({ listen: async () => ({ ok: false, error, alternatives: [], engine: 'device' }), stop() {} }) }) });
    const r = await l.listen();
    assert.deepEqual([r.ok, r.alternatives[0], r.engine], [true, 'תודה', 'browser'], error);
    assert.deepEqual([l.engine, l.note], ['browser', R.FALLBACK_NOTE]);
  }
  // an ordinary miss (nothing heard) is not a reason to switch
  const quiet = R.createListener({ pack: 'listen-lite', Ctor: BrowserRec('x'), loadDevice: async () => ({ createDeviceRecognizer: () => ({ listen: async () => ({ ok: false, error: 'no-speech', alternatives: [], engine: 'device' }), stop() {} }) }) });
  assert.equal((await quiet.listen()).error, 'no-speech'); assert.equal(quiet.engine, 'device');
  // no browser recognizer to fall back to
  const alone = R.createListener({ pack: 'listen-lite', Ctor: null, loadDevice: async () => { throw new Error('offline'); } });
  assert.deepEqual(await alone.listen(), { ok: false, error: 'unsupported', engine: 'browser' });
});

// ---- the microphone ---------------------------------------------------------------------------------------------------
/** A microphone that plays a script of [level, milliseconds] pieces, 100 ms a chunk, on a clock the test owns. */
function fakeMic(script, opened = { n: 0, closed: 0 }) {
  let t = 0;
  const now = () => t;
  const openMic = async () => {
    opened.n++;
    return {
      rate: 16000,
      onChunk(fn) { (async () => { for (const [lv, ms] of script) for (let k = 0; k < ms / 100; k++) { await flush(); if (opened.closed) return; t += 100; fn(new Float32Array(1600).fill(lv)); } })(); },
      close() { opened.closed++; },
    };
  };
  return { openMic, now, opened };
}

test('captureTake: ends by itself once the speaker has gone quiet', async () => {
  const m = fakeMic([[0.001, 300], [0.2, 1000], [0.001, 3000]]);
  const r = await D.captureTake({ openMic: m.openMic, now: m.now }).done;
  assert.equal(r.ok, true); assert.equal(r.rate, 16000);
  assert.ok(r.ms >= 2100 && r.ms <= 2400, `took ${r.ms} ms`); // 0.3 s lead-in, 1 s speech, 0.9 s of quiet
  assert.equal(m.opened.closed, 1, 'the microphone is closed as soon as the take ends');
});

test('captureTake: nothing said, the learner stops it, the learner cancels, the microphone is refused', async () => {
  const silent = fakeMic([[0.001, 9000]]);
  assert.deepEqual(await D.captureTake({ openMic: silent.openMic, now: silent.now }).done, { ok: false, error: 'no-speech' });
  const long = fakeMic([[0.2, 60000]]);
  const cap = D.captureTake({ openMic: long.openMic, now: long.now });
  setTimeout(() => cap.stop(), 5);
  const got = await cap.done; assert.equal(got.ok, true); assert.ok(got.pcm.length > 0);
  const c2 = D.captureTake({ openMic: fakeMic([[0.2, 60000]]).openMic });
  setTimeout(() => c2.cancel(), 5);
  assert.deepEqual(await c2.done, { ok: false, error: 'aborted' });
  const deny = async () => { const e = new Error('no'); e.name = 'NotAllowedError'; throw e; };
  assert.deepEqual(await D.captureTake({ openMic: deny }).done, { ok: false, error: 'not-allowed' });
  const cap3 = fakeMic([[0.2, 30000]]);
  const capped = await D.captureTake({ openMic: cap3.openMic, now: cap3.now, maxMs: 2000 }).done;
  assert.ok(capped.ok && capped.ms <= 2100, 'a take never runs past its limit');
});

// ---- recognizing on this device ---------------------------------------------------------------------------------------
function fakeTools(over = {}) {
  const calls = { load: [], transcribe: [], score: [], unload: 0 };
  const speech = {
    SAMPLE_RATE: 16000, resample: (pcm, from) => { calls.resampledFrom = from; return pcm; },
    load: async (opts) => { calls.load.push(opts); if (over.loadError) { const e = new Error(over.loadError); e.code = over.loadError; throw e; } return { transcribe: async (pcm, o) => { calls.transcribe.push({ n: pcm.length, o }); return over.answer || { ok: true, text: 'בוקר טוב', confidence: 0.8 }; }, score: async (pcm, text, o) => { calls.score.push({ text, o }); return over.score || { ok: true, letters: [], words: [], checked: 0, right: 0, score: null }; } }; },
    unload: async () => { calls.unload++; },
  };
  return { loader, speech, loaderUrl: 'https://app.example/assets/vendor/_alef-tools/loader@0.1.0/index.js', calls };
}
const speechMic = () => fakeMic([[0.2, 800], [0.001, 2000]]);
/** The pieces a recognizer needs to record from a scripted microphone on the test's own clock. */
const mic = (m = speechMic()) => ({ openMic: m.openMic, capture: (c) => D.captureTake({ ...c, now: m.now }), m });

test('device recognizer: records after listen() is called, recognizes here, and sends the take nowhere', async () => {
  const t = fakeTools(), m = speechMic();
  const realFetch = globalThis.fetch; const fetched = [];
  globalThis.fetch = async (...a) => { fetched.push(a); return new Response('', { status: 404 }); };
  try {
    const rec = D.createDeviceRecognizer({ pack: 'listen-lite', tools: t, ...mic(m) });
    assert.equal(m.opened.n, 0, 'making the recognizer does not open the microphone');
    const r = await rec.listen();
    assert.deepEqual(r, { ok: true, alternatives: ['בוקר טוב'], confidence: 0.8, engine: 'device' });
    assert.equal(m.opened.n, 1); assert.equal(m.opened.closed, 1);
    assert.equal(t.calls.load[0].pack, 'listen-lite');
    assert.match(t.calls.load[0].ortBase, /assets\/vendor\/_ort\/$/);
    assert.deepEqual(t.calls.load[0].bases.map((b) => b.replace(/^.*(assets\/vendor\/_packs\/)$/, '$1')), ['assets/vendor/_packs/', 'https://alenzacodes.github.io/alef-packs/']);
    assert.deepEqual(t.calls.transcribe[0].o, { language: 'he' });
    // no request of any kind was made with the take: recognition is a call into the worker, not a fetch
    assert.equal(fetched.filter(([, init]) => init && (init.body !== undefined || (init.method && init.method !== 'GET'))).length, 0);
    assert.equal(fetched.length, 0);
  } finally { globalThis.fetch = realFetch; }
});

test('device recognizer: English for the other direction of Talk; errors keep their plain codes', async () => {
  const t = fakeTools();
  await D.createDeviceRecognizer({ pack: 'listen-lite', language: 'en', tools: t, ...mic() }).listen();
  assert.deepEqual(t.calls.transcribe[0].o, { language: 'en' });
  const missing = await D.createDeviceRecognizer({ pack: 'listen-lite', tools: fakeTools({ loadError: 'not-downloaded' }), ...mic() }).listen();
  assert.deepEqual([missing.ok, missing.error], [false, 'pack-missing']);
  const broken = await D.createDeviceRecognizer({ pack: 'listen-best', tools: fakeTools({ loadError: 'cannot-run' }), ...mic() }).listen();
  assert.equal(broken.error, 'pack-failed');
  const nothing = await D.createDeviceRecognizer({ pack: 'listen-lite', tools: fakeTools({ answer: { ok: false, text: '', error: 'no-speech' } }), ...mic() }).listen();
  assert.equal(nothing.error, 'no-speech');
  const refused = await D.createDeviceRecognizer({ pack: 'listen-lite', tools: fakeTools(), openMic: async () => { const e = new Error('no'); e.name = 'NotAllowedError'; throw e; } }).listen();
  assert.equal(refused.error, 'not-allowed');
});

test('with the real vendored packages: a pack that is not on the device is reported as missing, and nothing but its list is asked for', async () => {
  const speech = await import('../assets/vendor/_alef-tools/speech@0.1.0/index.js');
  const asked = [];
  const env = { caches: { open: async () => ({ match: async () => undefined, put: async () => {}, keys: async () => [] }), keys: async () => [], delete: async () => false }, fetch: async (url, init) => { asked.push({ url: String(url), init }); return new Response('', { status: 404 }); }, gpu: false, navigator: {}, storage: null };
  const r = await D.createDeviceRecognizer({ pack: 'listen-lite', tools: { loader, speech, loaderUrl: 'x/index.js' }, ...mic(), env }).listen();
  assert.deepEqual([r.ok, r.error, r.engine], [false, 'pack-missing', 'device']);
  assert.ok(asked.length >= 1 && asked.every((a) => a.url.endsWith('/listen-lite/pack.json') && a.init?.body === undefined));
  assert.deepEqual([speech.id, [...speech.packs]], ['speech', ['listen-lite', 'listen-best', 'pron-check']]);
});

// ---- which packs are here ---------------------------------------------------------------------------------------------
const cacheList = (names) => ({ keys: async () => names });
test('refreshPacks: with no pack cache it is one look at the cache names, loads nothing, and clears stale notes', async () => {
  let loads = 0;
  const win = { caches: cacheList(['alef-shell-1', 'alef-talk-pack-v1']), localStorage: storage({ [R.PACK_KEY]: 'listen-lite', [R.PRON_KEY]: '1' }) };
  assert.equal(await R.refreshPacks(win, async () => { loads++; return {}; }), true);
  assert.deepEqual([loads, win.localStorage.getItem(R.PACK_KEY), win.localStorage.getItem(R.PRON_KEY)], [0, null, null]);
  assert.equal(await R.refreshPacks(win, async () => { loads++; return {}; }), false);
  assert.equal(await R.refreshPacks({ get caches() { throw new Error('blocked'); } }), false);
  // a pack cache exists: the precise look is asked of the device code
  const win2 = { caches: cacheList(['alef-pack-listen-lite-v1']), localStorage: storage() };
  assert.equal(await R.refreshPacks(win2, async () => ({ syncPackNotes: async () => true })), true);
});

test('syncPackNotes: the notes follow what is complete on the device; a pack never downloaded is not asked about', async () => {
  const asked = []; const st = storage();
  const fakeLoader = { ...loader, hasGraphics: async () => false, packState: async (pack) => { asked.push(pack); return { ready: pack !== 'pron-check' }; } };
  const env = (names) => ({ caches: cacheList(names), storage: st, gpu: false });
  const t = { loader: fakeLoader, speech: {} };
  assert.equal(await D.syncPackNotes({ tools: t, env: env(['alef-pack-listen-lite-v1', 'alef-pack-pron-check-v1']) }), true);
  assert.deepEqual(asked, ['listen-lite', 'pron-check']);
  assert.deepEqual([st.getItem(R.PACK_KEY), st.getItem(R.PRON_KEY)], ['listen-lite', null], 'a half-downloaded pack does not count');
  // the pack for a graphics card is not used on a device without one
  assert.equal(await D.syncPackNotes({ tools: t, env: env(['alef-pack-listen-lite-v1', 'alef-pack-listen-best-v1']) }), false);
  assert.equal(st.getItem(R.PACK_KEY), 'listen-lite');
  assert.equal(await D.syncPackNotes({ tools: t, env: { ...env(['alef-pack-listen-lite-v1', 'alef-pack-listen-best-v1']), gpu: true } }), true);
  assert.equal(st.getItem(R.PACK_KEY), 'listen-best');
  assert.equal(await D.syncPackNotes({ tools: t, env: env([]) }), true);
  assert.equal(st.getItem(R.PACK_KEY), null);
});

test('createListener looks at the device once before the first take, so a pack downloaded a moment ago is used', async () => {
  const realCaches = globalThis.caches, realLS = Object.getOwnPropertyDescriptor(globalThis, 'localStorage'), realNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const st = storage();
  Object.defineProperty(globalThis, 'localStorage', { value: st, configurable: true });
  Object.defineProperty(globalThis, 'navigator', { value: { mediaDevices: { getUserMedia: async () => ({}) } }, configurable: true });
  globalThis.caches = cacheList(['alef-pack-listen-lite-v1']); globalThis.AudioContext = class {};
  try {
    const l = R.createListener({ Ctor: BrowserRec('browser'), loadDevice: async () => ({ syncPackNotes: async () => { st.setItem(R.PACK_KEY, 'listen-lite'); return true; }, createDeviceRecognizer: () => ({ listen: async () => ({ ok: true, alternatives: ['device'], engine: 'device' }), stop() {} }) }) });
    assert.equal(l.engine, 'browser', 'before the look, the note says there is no pack');
    assert.equal((await l.listen()).alternatives[0], 'device');
    assert.deepEqual([l.engine, await l.ready], ['device', true]);
  } finally { globalThis.caches = realCaches; delete globalThis.AudioContext; if (realLS) Object.defineProperty(globalThis, 'localStorage', realLS); else delete globalThis.localStorage; if (realNav) Object.defineProperty(globalThis, 'navigator', realNav); }
});

test('Shabbat: the shared loader comes with the app\'s check registered, and only a download the learner starts goes ahead', async () => {
  const { loader: viaApp } = await import('../src/settings/tools.js');
  const saturday = new Date(2026, 10, 14, 10, 0).getTime();
  assert.equal(viaApp.isShabbatSafeMode(saturday), true);
  assert.equal(viaApp.allowed('download', { now: saturday }), false);
  assert.equal(viaApp.allowed('download', { now: saturday, userStarted: true }), true);
  assert.equal(viaApp.allowed('notify', { now: saturday, userStarted: true }), false);
  // this lane's code never starts a download: there is no download call in it at all
  for (const f of ['speak/ondevice.js', 'speak/lettercheck.js', 'speak/recognizer.js', 'talk/speech.js']) assert.doesNotMatch(readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8'), /downloadPack|downloadFiles/, f);
});

// ---- the letter check -------------------------------------------------------------------------------------------------
test('Check my letters: asks for the microphone only after the tap, shows what to say again, and never lists the Name', async () => {
  const L = await import('../src/speak/lettercheck.js');
  const he = 'בָּרוּךְ יְהוָה';
  let asked = 0;
  const check = async (text, o) => { asked++; assert.equal(text, he); assert.equal(o.tradition, 'ashkenazi');
    return { ok: true, checked: 2, right: 1, score: 0.5, words: [], letters: [{ index: 0, ch: 'ב', word: 0, status: 'ok', why: '' }, { index: 3, ch: 'ר', word: 0, status: 'check', why: '', heard: 'ל' }, { index: 4, ch: 'ו', word: 0, status: 'skip', why: 'vowel-letter' }, { index: 6, ch: 'ך', word: 0, status: 'skip', why: 'beside-name' }] }; };
  const node = L.letterCheckControl(he, { tradition: 'ashkenazi', check, id: 'u1' });
  assert.equal(asked, 0);
  const b = node.find((n) => n.tag === 'button')[0];
  assert.equal(b.text, 'Check my letters');
  b.click();
  await waitFor(() => /checked letters/.test(node.text));
  assert.match(node.text, /1 of 2 checked letters sounded right/);
  assert.match(node.text, /ר sounded more like ל\. Say it again\./);
  assert.match(node.text, /Not checked: ו \(carries a vowel\)/);
  assert.match(node.text, /vowels are not checked/);
  assert.equal(node.find((n) => n.attrs['data-status'] === 'check').length, 1);
  assert.equal(node.find((n) => n.attrs['data-letter'] === 'check').length, 1);
  assert.equal(node.find((n) => n.tag === 'audio').length, 0, 'the check plays nothing');
  assert.match(L.renderLetters(he, { ok: false, error: 'pack-missing' }).text, /Get it on the Language Packs page/);
  assert.match(L.renderLetters(he, { ok: false, error: 'no-speech' }).text, /Nothing was heard/);
});

test('the letter check is offered only when its pack is on this device, and its code is loaded only then', async () => {
  const C = await import('../src/speak/check.js');
  let loads = 0;
  assert.equal(C.lettersSlot('שָׁלוֹם', { pron: false, loadLetters: async () => { loads++; return {}; } }), null);
  assert.equal(loads, 0);
  const slot = C.lettersSlot('שָׁלוֹם', { pron: true, tradition: 'sephardi', loadLetters: async () => { loads++; return { letterCheckControl: (he, o) => { const n = new N('div'); n.attrs['data-he'] = he; n.attrs['data-trad'] = o.tradition; return n; } }; } });
  await waitFor(() => slot.children.length === 1);
  assert.deepEqual([loads, slot.children[0].attrs['data-trad']], [1, 'sephardi']);
  assert.equal(R.pronReady({ localStorage: storage({ [R.PRON_KEY]: '1' }), navigator: { mediaDevices: { getUserMedia() {} } } }), true);
  assert.equal(R.pronReady({ localStorage: storage(), navigator: { mediaDevices: { getUserMedia() {} } } }), false);
});

test('checkLetters: records one take and scores it with the learner\'s tradition', async () => {
  const t = fakeTools({ score: { ok: true, letters: [{ index: 0, ch: 'ש', status: 'ok' }], words: [], checked: 1, right: 1, score: 1 } });
  const r = await D.checkLetters('שָׁלוֹם', { tradition: 'sephardi', tools: t, ...mic() });
  assert.equal(r.score, 1);
  assert.equal(t.calls.load[0].pack, 'pron-check');
  assert.deepEqual(t.calls.score[0], { text: 'שָׁלוֹם', o: { tradition: 'sephardi' } });
  const missing = await D.checkLetters('שָׁלוֹם', { tools: fakeTools({ loadError: 'not-downloaded' }), ...mic() });
  assert.deepEqual(missing, { ok: false, error: 'pack-missing' });
});

// ---- Talk -------------------------------------------------------------------------------------------------------------
test('Talk listens on this device in the language of the direction, and falls back to the browser recognizer when the pack cannot answer', async () => {
  const S = await import('../src/talk/speech.js');
  assert.equal(S.canListen(micWin('listen-lite')), true);
  assert.deepEqual([S.listenEngine(micWin('listen-lite')), S.listenEngine({ SpeechRecognition: class {} }), S.listenEngine({})], ['device', 'browser', 'none']);
  const langs = [];
  const loadDevice = async () => ({ createDeviceRecognizer: (o) => ({ listen: async () => { langs.push(o.language); return { ok: true, alternatives: [o.language === 'he' ? 'שלום' : 'hello'], engine: 'device' }; }, finish() {}, stop() {} }) });
  for (const direction of ['he-en', 'en-he']) {
    const got = await new Promise((resolve) => { const h = S.listenOnce({ direction, pack: 'listen-lite', loadDevice, win: {}, onFinal: (t) => resolve(t) }); assert.equal(h.engine, 'device'); });
    assert.equal(got, direction === 'he-en' ? 'שלום' : 'hello');
  }
  assert.deepEqual(langs, ['he', 'en']);
  const lost = async () => ({ createDeviceRecognizer: () => ({ listen: async () => ({ ok: false, error: 'pack-missing', alternatives: [] }), finish() {}, stop() {} }) });
  const win = { SpeechRecognition: class { start() { setTimeout(() => { this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: 'from the browser' }], { isFinal: true })] }); this.onend?.(); }, 0); } stop() {} } };
  const viaBrowser = await new Promise((resolve) => { S.listenOnce({ direction: 'en-he', pack: 'listen-lite', loadDevice: lost, win, onFinal: resolve }); });
  assert.equal(viaBrowser, 'from the browser');
  const errors = [];
  await new Promise((resolve) => { S.listenOnce({ direction: 'en-he', pack: 'listen-lite', loadDevice: lost, win: {}, onFinal: () => {}, onError: (m) => errors.push(m), onEnd: resolve }); });
  assert.equal(errors.length, 1);
});

// ---- what ships, and where --------------------------------------------------------------------------------------------
test('the vendored alef-tools files are the pinned ones, and none of this is in the first install', async () => {
  const check = spawnSync(process.execPath, ['tools/alef-tools/sync.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr || check.stdout);
  const lock = JSON.parse(readFileSync(new URL('../data/alef-tools.lock.json', import.meta.url), 'utf8'));
  assert.match(lock.ref, /^[0-9a-f]{40}$/); assert.ok(lock.packages.loader && lock.packages.speech);
  const { toolUrl, ALEF_TOOLS } = await import('../src/settings/tools.js');
  assert.equal(ALEF_TOOLS.commit, lock.ref); assert.match(toolUrl('speech'), /assets\/vendor\/_alef-tools\/speech@\d+\.\d+\.\d+\/index\.js$/);
  const scope = {}; new Function('self', readFileSync(new URL('../precache-manifest.js', import.meta.url), 'utf8'))(scope); // the list is written for the service worker
  const installed = new Set(scope.ALEF_PRECACHE);
  assert.ok(installed.size > 100, 'the first-install list was found');
  for (const f of ['src/speak/ondevice.js', 'src/speak/lettercheck.js', 'src/settings/tools.js', 'data/packs/catalog.json']) assert.equal(installed.has(f) || installed.has('./' + f) || installed.has('/' + f), false, `${f} must not be installed up front`);
  assert.equal([...installed].some((f) => String(f).includes('assets/vendor/')), false);
  // no model weights came along with the vendored code
  for (const p of Object.values(lock.packages)) for (const f of p.files) assert.match(f.path, /\.(js|json)$/);
  const speechPacks = JSON.parse(readFileSync(new URL('../data/packs/catalog.json', import.meta.url), 'utf8')).packs.filter((p) => ['listen-lite', 'listen-best', 'pron-check'].includes(p.name));
  assert.equal(speechPacks.length, 3); assert.ok(speechPacks.every((p) => p.published === false), 'not offered until the parts are on the pack host');
  assert.match(readFileSync(new URL('../.gitignore', import.meta.url), 'utf8'), /^assets\/vendor\/_packs\/$/m, 'pack parts staged for a local try-out can never be committed');
});

test('the microphone is opened in one place only, and the browser recognizer is constructed in one place only', () => {
  const src = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8').replace(/^\s*(\/\/|\*|\/\*).*$/gm, '');
  const on = src('speak/ondevice.js');
  assert.equal(on.match(/getUserMedia\(/g).length, 1);
  assert.ok(on.indexOf('getUserMedia(') > on.indexOf('export async function openMic'));
  assert.doesNotMatch(on, /XMLHttpRequest|sendBeacon|WebSocket|FormData|\bbody\s*:/);
  assert.doesNotMatch(src('speak/lettercheck.js'), /getUserMedia|\bfetch\(|XMLHttpRequest|sendBeacon/);
  assert.doesNotMatch(src('speak/lettercheck.js') + on, /Notification|requestPermission|showNotification/, 'no prompts or notifications from these screens');
});
