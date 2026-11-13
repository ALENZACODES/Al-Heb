// @ts-check
// Talk: listening. With a listening pack on this device (Settings) the sound is recognized here and goes nowhere.
// Without one, the fallback is the browser's own speech recognition (Web Speech API): how the browser turns sound into text
// is the browser's business; some do it on the device, some send the sound to the browser maker. The screen says which is in use.
// Aleph has no speech service of its own and uploads nothing itself.
// Not every browser has it (Firefox does not), and Hebrew is not offered everywhere: callers must handle `supported: false`
// and the 'language-not-supported' error by falling back to typing.

export const LISTEN_LANG = Object.freeze({ 'en-he': 'en-US', 'he-en': 'he-IL' });

/** The recognition constructor, or null. */
export function recognitionCtor(win = globalThis) {
  return /** @type {any} */ (win)?.SpeechRecognition || /** @type {any} */ (win)?.webkitSpeechRecognition || null;
}

import { devicePack } from '../speak/recognizer.js';

/** True when this page can listen at all: a listening pack on this device, or the browser's own recognizer. */
export const canListen = (win = globalThis) => !!devicePack(win) || !!recognitionCtor(win);
/** Where listening happens for Talk right now: 'device' (a listening pack), 'browser' (the fallback) or 'none'. */
export const listenEngine = (win = globalThis) => (devicePack(win) ? 'device' : recognitionCtor(win) ? 'browser' : 'none');
/** The language each direction is spoken in, for a listening pack. */
export const DEVICE_LANG = Object.freeze({ 'en-he': 'en', 'he-en': 'he' });

/** One utterance on this device. Same callbacks as listenOnce. If the pack cannot answer, `fallback()` is tried once. */
function listenOnDevice(o, pack, fallback) {
  let rec = null, stopped = false, inner = null;
  (async () => {
    try {
      rec = (await (o.loadDevice || (() => import('../speak/ondevice.js')))()).createDeviceRecognizer({ pack, language: DEVICE_LANG[o.direction] || 'en' });
      if (stopped) return;
      const r = await rec.listen({ timeoutMs: 15000 });
      if (r.ok) { try { o.onFinal(r.alternatives[0]); } catch { /* ignore */ } }
      else if ((r.error === 'pack-missing' || r.error === 'pack-failed') && !stopped && (inner = fallback())) return; // the browser's recognizer takes over and ends the turn itself
      else if (r.error !== 'aborted') { const msg = listenError(r.error === 'pack-missing' || r.error === 'pack-failed' ? 'error' : r.error); if (msg) { try { o.onError?.(msg, r.error); } catch { /* ignore */ } } }
    } catch { try { o.onError?.(listenError('error'), 'error'); } catch { /* ignore */ } }
    try { o.onEnd?.(); } catch { /* ignore */ }
  })();
  // stop: finish the take and answer with what was said so far (the browser recognizer's stop() does the same)
  return { stop: () => { stopped = true; try { inner ? inner.stop() : rec?.finish?.(); } catch { /* ended */ } }, engine: 'device' };
}

/** Plain words for a recognition error code. */
export function listenError(code) {
  switch (code) {
    case 'not-allowed': case 'service-not-allowed': return 'The microphone is blocked for this site. Allow it in the browser, or type instead.';
    case 'no-speech': return 'Nothing was heard. Tap the button and speak again.';
    case 'audio-capture': return 'No microphone was found. You can type instead.';
    case 'network': return 'This browser needs to be online to listen. You can type instead; typing works offline.';
    case 'language-not-supported': return 'This browser cannot listen in that language. You can type instead.';
    case 'aborted': return '';
    case 'unsupported': return 'This browser cannot listen here. You can type instead.';
    default: return 'Listening stopped. You can try again or type instead.';
  }
}

/**
 * Listen for one utterance.
 * @param {{direction:'en-he'|'he-en', onPartial?:(text:string)=>void, onFinal:(text:string)=>void, onError?:(message:string, code:string)=>void, onEnd?:()=>void, win?:any, pack?:string, loadDevice?:()=>Promise<any>, browserOnly?:boolean}} o
 *   On this device there are no partial results: the text arrives when the speaker stops.
 * @returns {{stop:()=>void}|null} null when the browser cannot listen
 */
export function listenOnce(o) {
  const pack = o.pack !== undefined ? o.pack : devicePack(o.win);
  if (pack && !o.browserOnly) return listenOnDevice(o, pack, () => listenOnce({ ...o, browserOnly: true }));
  const SR = recognitionCtor(o.win);
  if (!SR) return null;
  let rec;
  try { rec = new SR(); } catch { return null; }
  rec.lang = LISTEN_LANG[o.direction] || 'en-US';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let finalText = '';
  let done = false;
  rec.onresult = (ev) => {
    let interim = '';
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const r = ev.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    const shown = `${finalText} ${interim}`.trim();
    if (shown) { try { o.onPartial?.(shown); } catch { /* caller's display only */ } }
  };
  rec.onerror = (ev) => {
    const code = String(ev?.error || 'error');
    const msg = listenError(code);
    if (msg) { try { o.onError?.(msg, code); } catch { /* ignore */ } }
  };
  rec.onend = () => {
    if (done) return;
    done = true;
    const text = finalText.trim();
    if (text) { try { o.onFinal(text); } catch { /* ignore */ } }
    try { o.onEnd?.(); } catch { /* ignore */ }
  };
  try { rec.start(); } catch { return null; }
  return { stop: () => { try { rec.stop(); } catch { /* already ended */ } } };
}
