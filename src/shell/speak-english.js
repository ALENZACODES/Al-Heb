// Read English aloud with the device's own voice, without the cut-off phones and Chrome apply to long text.
// The browser voice often stops after roughly 10 to 15 seconds of one long utterance (Android and desktop Chrome), so the text
// is split into short pieces at sentence and clause breaks, and each piece starts when the previous one ends. On desktop Chrome
// a pause/resume nudge every 10 s also keeps a long piece from being dropped (skipped on Android, where it can stop speech).
// No recordings are involved: this is the device voice, and callers say so.

import { chunkText } from './speech-chunker.js';
export { chunkText };

let token = 0;
let nudge = null;

/** Stop any English reading in progress. */
export function stopEnglish(speech = globalThis.speechSynthesis) {
  token += 1;
  if (nudge) { clearInterval(nudge); nudge = null; }
  try { speech?.cancel?.(); } catch { /* ignore */ }
}

/**
 * Speak `text` in English, piece by piece. Resolves true when every piece was spoken, false when it was stopped or could not start.
 * @param {string} text
 * @param {{speech?: any, Utterance?: any, lang?: string, rate?: number, onPiece?: (i:number, n:number) => void}} [o]
 */
export function speakEnglish(text, o = {}) {
  const speech = o.speech || globalThis.speechSynthesis;
  const U = o.Utterance || globalThis.SpeechSynthesisUtterance;
  if (!speech || typeof U !== 'function') return Promise.resolve(false);
  stopEnglish(speech);
  const mine = token;
  const pieces = chunkText(text);
  if (!pieces.length) return Promise.resolve(false);
  let voice = null;
  try {
    const voices = speech.getVoices?.() || [];
    voice = voices.find((v) => /^en[-_]US/i.test(v.lang) && v.localService) || voices.find((v) => /^en[-_]US/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang)) || null;
  } catch { voice = null; }
  const android = /Android/i.test(globalThis.navigator?.userAgent || '');
  if (!android) nudge = setInterval(() => { try { if (speech.speaking && !speech.paused) { speech.pause(); speech.resume(); } } catch { /* ignore */ } }, 10000);
  return new Promise((resolve) => {
    let i = 0;
    const done = (ok) => { if (nudge && token === mine) { clearInterval(nudge); nudge = null; } resolve(ok); };
    const next = () => {
      if (token !== mine) return done(false);
      if (i >= pieces.length) return done(true);
      const u = new U(pieces[i]);
      u.lang = o.lang || 'en-US';
      if (voice) u.voice = voice;
      if (o.rate) u.rate = o.rate;
      try { o.onPiece?.(i, pieces.length); } catch { /* ignore */ }
      i += 1;
      // a piece that never reports its end (some phones) still moves on: a generous guess from its length
      let moved = false;
      const go = () => { if (moved) return; moved = true; clearTimeout(guard); next(); };
      const guard = setTimeout(go, 2500 + pieces[i - 1].length * 120);
      u.onend = go;
      u.onerror = (e) => { if (e && (e.error === 'interrupted' || e.error === 'canceled')) { moved = true; clearTimeout(guard); done(false); } else go(); };
      try { speech.speak(u); } catch { clearTimeout(guard); done(false); }
    };
    next();
  });
}
