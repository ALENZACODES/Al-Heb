// Thin wrappers around three browser APIs used by "Say it", and the choice between listening on this device and the browser's
// recognizer (createListener). Every constructor is injectable so tests run in Node.
// Nothing starts until the learner presses a button; nothing is uploaded by Aleph. The browser's SpeechRecognition may itself
// send audio to the browser vendor's servers (Chromium does); it is used only as a fallback, and the screen says so.
// Aleph has not measured how well any browser recognizer hears Hebrew: treat its text as a hint.

import { speechText } from '../shell/names.js';
const g = () => /** @type {any} */ (globalThis);

/**
 * SpeechRecognition (lang he-IL, one utterance, up to `maxAlternatives` candidates).
 * listen() resolves {ok:true, alternatives:string[]} or {ok:false, error:'no-speech'|'not-allowed'|'network'|'audio-capture'|'aborted'|'timeout'|'unsupported'|string}.
 */
export function createRecognizer(o = {}) {
  const Ctor = o.Ctor !== undefined ? o.Ctor : (g().SpeechRecognition || g().webkitSpeechRecognition);
  const lang = o.lang || 'he-IL', maxAlternatives = o.maxAlternatives || 5, timeoutMs = o.timeoutMs || 10000;
  const setT = o.setTimeout || ((f, ms) => g().setTimeout(f, ms)), clearT = o.clearTimeout || ((h) => g().clearTimeout(h));
  let rec = null, finish = null;
  function listen(opts = {}) {
    const limitMs = opts.timeoutMs || timeoutMs;
    if (!Ctor) return Promise.resolve({ ok: false, error: 'unsupported' });
    if (rec) stop();
    return new Promise((resolve) => {
      let done = false, timer = null, alternatives = [];
      const end = (r) => { if (done) return; done = true; if (timer != null) clearT(timer); rec = null; finish = null; resolve(r); };
      let r;
      try { r = new Ctor(); } catch (e) { return end({ ok: false, error: 'unsupported' }); }
      rec = r; finish = end;
      try { r.lang = lang; r.continuous = false; r.interimResults = false; r.maxAlternatives = maxAlternatives; } catch { /* read-only in some fakes */ }
      r.onresult = (ev) => {
        try {
          const res = ev?.results?.[0];
          const list = [];
          const n = res?.length ?? 0;
          for (let i = 0; i < n; i++) { const t = res[i]?.transcript; if (typeof t === 'string' && t.trim()) list.push(t.trim()); }
          alternatives = list;
        } catch { /* ignore */ }
        end({ ok: alternatives.length > 0, alternatives, error: alternatives.length ? undefined : 'no-speech' });
      };
      r.onerror = (ev) => end({ ok: false, error: String(ev?.error || 'error'), alternatives: [] });
      r.onend = () => end({ ok: alternatives.length > 0, alternatives, error: alternatives.length ? undefined : 'no-speech' });
      timer = setT(() => { try { r.abort?.(); } catch { /* ignore */ } end({ ok: false, error: 'timeout', alternatives: [] }); }, limitMs);
      try { r.start(); } catch (e) { end({ ok: false, error: 'start-failed', alternatives: [] }); }
    });
  }
  function stop() { const r = rec, f = finish; if (r) { try { r.abort?.(); } catch { /* ignore */ } } if (f) f({ ok: false, error: 'aborted', alternatives: [] }); }
  return { supported: !!Ctor, listen, stop, get listening() { return !!rec; } };
}

// ---- Listening on this device ----------------------------------------------------------------------------------------
// When a listening pack is on the device (downloaded on the Language Packs page, #/packs), speech is recognized here and the
// browser's recognizer is not used. Only the pack's name is read at this point; the code that runs it (./ondevice.js) is loaded on
// the first listen. Without a pack, or if the pack cannot run, the browser's recognizer is the fallback and the screens say so.
export const PACK_KEY = 'alef.listen.pack';
export const LISTEN_PACKS = Object.freeze(['listen-lite', 'listen-best']);
export const DEVICE_NOTE = 'Listening happens on this device, with the listening pack you downloaded. Nothing you say leaves it, and nothing is kept. Treat what it writes as a hint, not a grade.';
export const FALLBACK_NOTE = 'Fallback: this check uses your browser\'s own recognizer, and your browser may send the audio to its maker. To keep listening on this device, get a listening pack on the Language Packs page.';
export const PACKS_ROUTE = '#/packs';

export const PRON_KEY = 'alef.pron.pack';
/** True when the precise pronunciation pack was downloaded to this device (so "Check my letters" is offered). */
export function pronReady(win = g()) { try { return win?.localStorage?.getItem(PRON_KEY) === '1' && !!win?.navigator?.mediaDevices?.getUserMedia; } catch { return false; } }
/** The listening pack on this device ('' when there is none, or when the browser cannot record). */
export function devicePack(win = g()) {
  try {
    const v = win?.localStorage?.getItem(PACK_KEY);
    return LISTEN_PACKS.includes(v) && win?.navigator?.mediaDevices?.getUserMedia && (win.AudioContext || win.webkitAudioContext) ? v : '';
  } catch { return ''; }
}

const PACK_CACHES = /^alef-pack-(listen-lite|listen-best|pron-check)-v1$/;
/**
 * Brings the two small notes above in step with what is really on the device (packs come and go on the Language Packs page).
 * When no listening pack was ever downloaded this is one look at the cache names: nothing is loaded and nothing is fetched.
 * @returns {Promise<boolean>} true when a note changed
 */
export async function refreshPacks(win = g(), load = () => import('./ondevice.js')) {
  try {
    const names = await win.caches.keys();
    if (names.some((n) => PACK_CACHES.test(n))) return await (await load()).syncPackNotes();
    const had = win.localStorage.getItem(PACK_KEY) || win.localStorage.getItem(PRON_KEY);
    win.localStorage.removeItem(PACK_KEY); win.localStorage.removeItem(PRON_KEY);
    return !!had;
  } catch { return false; }
}

/**
 * The recognizer the screens use: this device first, the browser's recognizer as the labelled fallback.
 * Same interface as createRecognizer, plus `engine` ('device' | 'browser' | 'none') and `note` (the line to show the learner).
 * Every result carries `engine`, so a screen can say which one answered.
 * @param {{pack?:string, language?:string, loadDevice?:()=>Promise<any>} & Record<string, any>} [o] the rest goes to createRecognizer
 */
export function createListener(o = {}) {
  const browser = createRecognizer(o);
  const fixed = o.pack !== undefined;
  let pack = fixed ? o.pack : devicePack();
  const load = o.loadDevice || (() => import('./ondevice.js'));
  let dev = null, lost = !pack, active = null;
  // a pack downloaded or deleted since the note was written: look once, before the first take
  const ready = fixed ? Promise.resolve(false) : refreshPacks(g(), load).then((changed) => { if (changed) { pack = devicePack(); lost = !pack; dev = null; } return changed; });
  const viaBrowser = async (opts) => ({ ...(await browser.listen(opts)), engine: 'browser' });
  async function listen(opts = {}) {
    await ready;
    if (lost) return viaBrowser(opts);
    try { dev ||= (await load()).createDeviceRecognizer({ pack, language: o.language }); } catch { lost = true; return viaBrowser(opts); }
    active = dev;
    const r = await dev.listen(opts);
    active = null;
    // the pack is gone or cannot run here: from now on the browser's recognizer answers, and the screens show the fallback line
    if (!r.ok && (r.error === 'pack-missing' || r.error === 'pack-failed')) { lost = true; return browser.supported ? viaBrowser(opts) : { ok: false, error: 'unsupported', alternatives: [], engine: 'none' }; }
    return r;
  }
  return {
    listen,
    /** Resolves true when a look at the device changed which recognizer is used (a screen may then redraw its note). */
    ready,
    stop() { try { active?.stop(); } catch { /* ignore */ } browser.stop(); },
    get supported() { return !lost || browser.supported; },
    get engine() { return !lost ? 'device' : browser.supported ? 'browser' : 'none'; },
    get note() { return !lost ? DEVICE_NOTE : browser.supported ? FALLBACK_NOTE : ''; },
    get listening() { return !!active?.listening || browser.listening; },
  };
}

/**
 * MediaRecorder: record the microphone for up to `maxMs`, then give back an object URL for playback. Stays in memory; dispose() revokes it.
 * start() resolves when recording is running; stop() resolves {ok, url, ms} (or {ok:false, error}).
 */
export function createRecorder(o = {}) {
  const MR = o.MediaRecorderCtor !== undefined ? o.MediaRecorderCtor : g().MediaRecorder;
  const gum = o.getUserMedia !== undefined ? o.getUserMedia : (g().navigator?.mediaDevices?.getUserMedia ? (c) => g().navigator.mediaDevices.getUserMedia(c) : null);
  const URLImpl = o.URL || g().URL;
  const maxMs = o.maxMs || 6000;
  const setT = o.setTimeout || ((f, ms) => g().setTimeout(f, ms)), clearT = o.clearTimeout || ((h) => g().clearTimeout(h));
  const now = o.now || (() => Date.now());
  let mr = null, stream = null, chunks = [], urls = [], startedAt = 0, timer = null, stopping = null, held = null; // held: the take that the maxMs timer ended, kept until the caller's next stop()
  const supported = !!(MR && gum);
  async function start() {
    if (!supported) return { ok: false, error: 'unsupported' };
    held = null; // an earlier take nobody collected is dropped; its object URL is still revoked by dispose()
    if (mr) await stop();
    try { stream = await gum({ audio: true }); } catch (e) { return { ok: false, error: e?.name === 'NotAllowedError' ? 'not-allowed' : 'audio-capture' }; }
    try { mr = new MR(stream); } catch { release(); return { ok: false, error: 'unsupported' }; }
    chunks = []; startedAt = now();
    mr.ondataavailable = (ev) => { if (ev?.data) chunks.push(ev.data); };
    try { mr.start(); } catch { release(); return { ok: false, error: 'start-failed' }; }
    timer = setT(() => { timer = null; held = stop(); }, maxMs);
    return { ok: true };
  }
  function release() { try { for (const t of stream?.getTracks?.() || []) t.stop?.(); } catch { /* ignore */ } stream = null; mr = null; if (timer != null) { clearT(timer); timer = null; } }
  function stop() {
    if (!mr && held) { const h = held; held = null; return h; }
    if (!mr) return Promise.resolve({ ok: false, error: 'not-recording' });
    if (stopping) { if (held === stopping) held = null; return stopping; }
    const r = mr;
    stopping = new Promise((resolve) => {
      r.onstop = () => {
        const ms = now() - startedAt;
        let url = null, blob = null;
        try { const Blob = o.BlobCtor || g().Blob; blob = Blob ? new Blob(chunks, { type: r.mimeType || 'audio/webm' }) : null; url = blob && URLImpl?.createObjectURL ? URLImpl.createObjectURL(blob) : null; if (url) urls.push(url); } catch { url = null; }
        release(); stopping = null;
        resolve(url ? { ok: true, url, ms, blob } : { ok: false, error: 'no-data', ms }); // blob: for a page that keeps a take on the device (Speaking Studio voice journal)
      };
      try { r.stop(); } catch { release(); stopping = null; resolve({ ok: false, error: 'stop-failed' }); }
    });
    return stopping;
  }
  function dispose() { held = null; if (mr) { try { mr.stop(); } catch { /* ignore */ } } release(); for (const u of urls) { try { URLImpl?.revokeObjectURL?.(u); } catch { /* ignore */ } } urls = []; }
  return { supported, start, stop, dispose, get recording() { return !!mr || !!held; } };
}

/**
 * Browser text-to-speech for the model pronunciation when no clip exists (lang he-IL). Not a recording; gender and accent are the
 * device's. speak() resolves {ok} or {ok:false, error}.
 */
export function createSpeaker(o = {}) {
  const synth = o.synth !== undefined ? o.synth : g().speechSynthesis;
  const U = o.UtteranceCtor !== undefined ? o.UtteranceCtor : g().SpeechSynthesisUtterance;
  const supported = !!(synth && U);
  function speak(text, { rate } = {}) {
    if (!supported) return Promise.resolve({ ok: false, error: 'no-speech-synthesis' });
    return new Promise((resolve) => {
      let u;
      try { u = new U(speechText(String(text))); } catch { return resolve({ ok: false, error: 'speech-threw' }); }
      u.lang = 'he-IL'; if (typeof rate === 'number') u.rate = rate;
      u.onend = () => resolve({ ok: true });
      u.onerror = (ev) => resolve({ ok: false, error: ev?.error || 'speech-error' });
      try { synth.cancel?.(); synth.speak(u); } catch { resolve({ ok: false, error: 'speech-threw' }); }
    });
  }
  return { supported, speak, cancel: () => { try { synth?.cancel?.(); } catch { /* ignore */ } } };
}
