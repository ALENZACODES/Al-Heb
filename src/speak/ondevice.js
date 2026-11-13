// @ts-check
// Listening on this device: the app's side of the listening packs (alef-tools packages/speech, vendored under
// assets/vendor/_alef-tools and reached through src/settings/tools.js). Loaded on demand; never part of the first install.
//
// What happens to the sound: the microphone is opened only inside listen() or a letter check, which the screens call from a
// tap. The samples go to a worker on this device and are dropped when the answer comes back. Nothing is sent anywhere and
// nothing is kept. Packs are downloaded and deleted on the Language Packs page (#/packs); nothing here downloads by itself.
import { PACK_KEY, PRON_KEY, LISTEN_PACKS } from './recognizer.js';

const g = () => /** @type {any} */ (globalThis);
export const ORT_BASE = new URL('../../assets/vendor/_ort/', import.meta.url).href;
export const PACK_HOST = 'https://alenzacodes.github.io/alef-packs/';
/** Where pack lists are looked for: this copy of the site first, then the static pack host (the same two places the Language Packs page uses). */
export const PACK_BASES = Object.freeze([new URL('../../assets/vendor/_packs/', import.meta.url).href, PACK_HOST]);
export const PRON_PACK = 'pron-check';
export const ALL_PACKS = Object.freeze([...LISTEN_PACKS, PRON_PACK]);

/** @type {Promise<{loader:any, speech:any, loaderUrl:string}>|null} */
let toolsP = null;
/** The shared loader (with the app's Shabbat check already registered) and the speech package. `inj` replaces them in tests. */
export function tools(inj) {
  if (inj) return Promise.resolve(inj);
  if (!toolsP) {
    toolsP = (async () => {
      const { loader, toolUrl } = await import('../settings/tools.js');
      return { loader, speech: await import(toolUrl('speech')), loaderUrl: toolUrl('loader') };
    })();
    toolsP.catch(() => { toolsP = null; });
  }
  return toolsP;
}

const store = (env) => { try { return env?.storage ?? g().localStorage ?? null; } catch { return null; } };
/** Remembers which listening pack to use (so the first-install code can tell without loading anything). */
export function rememberPack(pack, env) { try { if (pack) store(env)?.setItem(PACK_KEY, pack); else store(env)?.removeItem(PACK_KEY); } catch { /* private mode: the pack is found again from Settings */ } }

const storedPack = (env) => { try { const v = store(env)?.getItem(PACK_KEY); return LISTEN_PACKS.includes(v) ? v : ''; } catch { return ''; } };
/** The better of the listening packs named (the larger one when both are there). */
export const bestListenPack = (names) => (names.includes('listen-best') ? 'listen-best' : names.includes('listen-lite') ? 'listen-lite' : '');

/** Which of this lane's packs are complete on this device. Only packs whose cache exists are looked at, so nothing is asked of any host for a pack that was never downloaded. */
export async function packsOnDevice(o = {}) {
  const { loader } = await tools(o.tools);
  const env = o.env || {};
  const cachesApi = env.caches ?? g().caches;
  let names = [];
  try { names = await cachesApi.keys(); } catch { return []; }
  const ready = [];
  for (const pack of ALL_PACKS) {
    if (!names.includes(loader.cacheName(pack))) continue;
    if (pack === 'listen-best' && !('gpu' in env ? env.gpu : await loader.hasGraphics(env))) continue; // it cannot run here
    try { if ((await loader.packState(pack, { ...env, bases: [...PACK_BASES], gpu: pack === 'listen-best' })).ready) ready.push(pack); } catch { /* its list cannot be read and none was saved: not usable */ }
  }
  return ready;
}

/**
 * Brings the two small notes (which listening pack, and whether the letter check is here) in step with what is really on the
 * device. The Language Packs page downloads and deletes packs; this is how the speaking screens find out.
 * @returns {Promise<boolean>} true when a note changed
 */
export async function syncPackNotes(o = {}) {
  const ready = await packsOnDevice(o);
  const st = store(o.env);
  let changed = false;
  try {
    const best = bestListenPack(ready);
    if (best !== storedPack(o.env)) { rememberPack(best, o.env); changed = true; }
    const pron = ready.includes(PRON_PACK), had = st?.getItem(PRON_KEY) === '1';
    if (pron !== had) { if (pron) st?.setItem(PRON_KEY, '1'); else st?.removeItem(PRON_KEY); changed = true; }
  } catch { /* private mode */ }
  return changed;
}

/** The loaded pack's API, or a PackError (code 'not-downloaded' when the pack is not on this device). */
export async function engine(pack, o = {}) {
  const t = await tools(o.tools);
  return t.speech.load({ loader: t.loader, pack, ortBase: ORT_BASE, ortDataBase: PACK_HOST + '_ort/', loaderUrl: t.loaderUrl, bases: [...PACK_BASES], env: o.env });
}

// ---- the microphone --------------------------------------------------------------------------------------------------
/**
 * Opens the microphone and hands over raw samples. Browser only; tests pass their own.
 * @returns {Promise<{rate:number, onChunk:(fn:(samples:Float32Array)=>void)=>void, close:()=>void}>}
 */
export async function openMic() {
  const gum = g().navigator?.mediaDevices?.getUserMedia;
  const Ctx = g().AudioContext || g().webkitAudioContext;
  if (!gum || !Ctx) { const e = new Error('unsupported'); e.name = 'NotSupportedError'; throw e; }
  const stream = await g().navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  const ctx = new Ctx();
  try { await ctx.resume?.(); } catch { /* already running */ }
  const src = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(4096, 1, 1);
  const mute = ctx.createGain(); mute.gain.value = 0; // the take is never played back through the speakers
  let fn = null;
  node.onaudioprocess = (ev) => { if (fn) fn(new Float32Array(ev.inputBuffer.getChannelData(0))); };
  src.connect(node); node.connect(mute); mute.connect(ctx.destination);
  return {
    rate: ctx.sampleRate,
    onChunk: (f) => { fn = f; },
    close: () => { fn = null; try { node.disconnect(); src.disconnect(); mute.disconnect(); } catch { /* gone */ } try { for (const t of stream.getTracks()) t.stop(); } catch { /* gone */ } try { ctx.close(); } catch { /* gone */ } },
  };
}

const level = (x) => { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / (x.length || 1)); };

/**
 * Records one utterance: starts at once, ends after the speaker has gone quiet for `quietMs`, when stop() is called, or at
 * `maxMs`. If nothing is said within `waitMs` it ends with 'no-speech'.
 * @param {{openMic?:typeof openMic, maxMs?:number, quietMs?:number, waitMs?:number, untilStopped?:boolean, now?:()=>number}} [o]
 *   untilStopped: no automatic end (for a learner who needs more time); only stop() or maxMs ends the take.
 * @returns {{done:Promise<{ok:true, pcm:Float32Array, rate:number, ms:number}|{ok:false, error:string}>, stop:()=>void, cancel:()=>void}}
 */
export function captureTake(o = {}) {
  const maxMs = o.maxMs || 12000, quietMs = o.quietMs || 900, waitMs = o.waitMs || 6000;
  const now = o.now || (() => Date.now());
  let finish = /** @type {(why:'done'|'cancel'|'no-speech')=>void} */ (() => {});
  let wanted = /** @type {''|'done'|'cancel'} */ ('');
  const done = (async () => {
    let mic;
    try { mic = await (o.openMic || openMic)(); } catch (e) {
      const n = /** @type {any} */ (e)?.name;
      return /** @type {const} */ ({ ok: false, error: n === 'NotAllowedError' || n === 'SecurityError' ? 'not-allowed' : n === 'NotSupportedError' ? 'unsupported' : 'audio-capture' });
    }
    const chunks = []; let samples = 0, floor = Infinity, peak = 0, spoke = false, lastLoud = 0;
    const started = now();
    const why = await new Promise((resolve) => {
      finish = resolve;
      if (wanted) return resolve(wanted);
      mic.onChunk((c) => {
        chunks.push(c); samples += c.length;
        const t = now() - started, lv = level(c);
        floor = Math.min(floor, Math.max(lv, 1e-5)); peak = Math.max(peak, lv);
        // loud = a real share of the loudest moment so far and, once a quiet moment has been heard, clearly above it.
        // (A take that starts mid-word has no quiet moment yet: it counts as speech until one comes.)
        const loud = lv > Math.max(peak * 0.25, 0.0015) && (peak < floor * 3 || lv > floor * 3);
        if (loud) { spoke = true; lastLoud = t; }
        if (t >= maxMs) return resolve('done');
        if (o.untilStopped) return;
        if (!spoke && t >= waitMs) return resolve('no-speech');
        if (spoke && t - lastLoud >= quietMs) return resolve('done');
      });
    });
    mic.close();
    if (why === 'cancel') return /** @type {const} */ ({ ok: false, error: 'aborted' });
    if (why === 'no-speech' || !samples) return /** @type {const} */ ({ ok: false, error: 'no-speech' });
    const pcm = new Float32Array(samples); let at = 0;
    for (const c of chunks) { pcm.set(c, at); at += c.length; }
    return /** @type {const} */ ({ ok: true, pcm, rate: mic.rate, ms: Math.round((samples * 1000) / mic.rate) });
  })();
  return { done, stop: () => { wanted = 'done'; finish('done'); }, cancel: () => { wanted = 'cancel'; finish('cancel'); } };
}

/**
 * The same interface as the browser recognizer in recognizer.js, answered on this device.
 * listen() resolves {ok:true, alternatives:[text], engine:'device'} or {ok:false, error, engine:'device'}; error 'pack-missing' means the
 * pack is not on this device any more (the caller may fall back).
 * @param {{pack:string, language?:'he'|'en', tools?:any, openMic?:any, capture?:any, env?:any}} o
 */
export function createDeviceRecognizer(o) {
  /** @type {ReturnType<typeof captureTake>|null} */ let take = null;
  let busy = false;
  async function listen(opts = {}) {
    if (busy) stop();
    busy = true;
    try {
      // the microphone opens at once, so the learner can speak while the pack loads
      const cap = take = (o.capture || captureTake)({ openMic: o.openMic, maxMs: opts.timeoutMs ? Math.max(opts.timeoutMs, 4000) : 12000, untilStopped: !!opts.untilStopped });
      let api;
      try { api = await engine(o.pack, o); } catch (e) {
        cap.cancel(); await cap.done;
        return { ok: false, error: /** @type {any} */ (e)?.code === 'not-downloaded' || /** @type {any} */ (e)?.code === 'no-pack-list' ? 'pack-missing' : 'pack-failed', alternatives: [], engine: 'device' };
      }
      const got = await cap.done;
      if (!got.ok) return { ok: false, error: got.error, alternatives: [], engine: 'device' };
      const { speech } = await tools(o.tools);
      const pcm = speech.resample(got.pcm, got.rate, speech.SAMPLE_RATE);
      let r;
      try { r = await api.transcribe(pcm, { language: opts.language || o.language || 'he' }); } catch { return { ok: false, error: 'pack-failed', alternatives: [], engine: 'device' }; }
      return r.ok && r.text ? { ok: true, alternatives: [r.text], confidence: r.confidence, engine: 'device' } : { ok: false, error: 'no-speech', alternatives: [], engine: 'device' };
    } finally { busy = false; take = null; }
  }
  /** Ends the take early and answers with what was said so far. */
  function finish() { take?.stop(); }
  function stop() { take?.cancel(); }
  return { supported: true, engine: 'device', listen, stop, finish, get listening() { return busy; } };
}

/**
 * Letter-by-letter feedback on one take, with the pron-check pack. The take is recorded here (after the caller's tap).
 * @param {string} he the expected Hebrew (pointed) @param {{tradition?:string, tools?:any, openMic?:any, capture?:any, env?:any, onListening?:()=>void}} [o]
 * @returns {Promise<{ok:boolean, error?:string, letters?:any[], words?:any[], checked?:number, right?:number, score?:number|null}>}
 */
export async function checkLetters(he, o = {}) {
  const cap = (o.capture || captureTake)({ openMic: o.openMic, maxMs: 15000 });
  o.onListening?.();
  let api;
  try { api = await engine(PRON_PACK, o); } catch (e) { cap.cancel(); await cap.done; return { ok: false, error: /** @type {any} */ (e)?.code === 'not-downloaded' ? 'pack-missing' : 'pack-failed' }; }
  const got = await cap.done;
  if (!got.ok) return { ok: false, error: got.error };
  const { speech } = await tools(o.tools);
  try { return await api.score(speech.resample(got.pcm, got.rate, speech.SAMPLE_RATE), he, { tradition: o.tradition }); } catch { return { ok: false, error: 'pack-failed' }; }
}

/** Frees the workers and the loaded packs (a screen calls this when it closes). */
export async function release(o = {}) { try { (await tools(o.tools)).speech.unload(); } catch { /* nothing loaded */ } }
