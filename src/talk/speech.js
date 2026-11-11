// @ts-check
// Talk: listening through the browser's own speech recognition (Web Speech API). Aleph has no speech service of its own
// and uploads nothing itself. How the browser turns sound into text is the browser's business: some do it on the device,
// some send the sound to the browser maker. The screen says so before the first use.
// Not every browser has it (Firefox does not), and Hebrew is not offered everywhere: callers must handle `supported: false`
// and the 'language-not-supported' error by falling back to typing.

export const LISTEN_LANG = Object.freeze({ 'en-he': 'en-US', 'he-en': 'he-IL' });

/** The recognition constructor, or null. */
export function recognitionCtor(win = globalThis) {
  return /** @type {any} */ (win)?.SpeechRecognition || /** @type {any} */ (win)?.webkitSpeechRecognition || null;
}

export const canListen = (win = globalThis) => !!recognitionCtor(win);

/** Plain words for a recognition error code. */
export function listenError(code) {
  switch (code) {
    case 'not-allowed': case 'service-not-allowed': return 'The microphone is blocked for this site. Allow it in the browser, or type instead.';
    case 'no-speech': return 'Nothing was heard. Tap the button and speak again.';
    case 'audio-capture': return 'No microphone was found. You can type instead.';
    case 'network': return 'This browser needs to be online to listen. You can type instead; typing works offline.';
    case 'language-not-supported': return 'This browser cannot listen in that language. You can type instead.';
    case 'aborted': return '';
    default: return 'Listening stopped. You can try again or type instead.';
  }
}

/**
 * Listen for one utterance.
 * @param {{direction:'en-he'|'he-en', onPartial?:(text:string)=>void, onFinal:(text:string)=>void, onError?:(message:string, code:string)=>void, onEnd?:()=>void, win?:any}} o
 * @returns {{stop:()=>void}|null} null when the browser cannot listen
 */
export function listenOnce(o) {
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
