// Fallback audio used when src/audio/player.js is missing or fails to load.
// Same interface as lane 4's player: {play(kind,id,opts?), playSequence([...]), has(kind,id), flags}.
// Speaks via speechSynthesis (he-IL) and flags 'tts-fallback'. No recorded audio is involved.
import { speechText } from './names.js';
export function createStubAudio({ settings } = {}) {
  /** @type {Record<string,string>|null} */
  let texts = null;
  async function lookup(kind, id) {
    if (!texts) {
      texts = {};
      try {
        for (const u of ['data/audio/manifest.json', 'data/audio/manifest-kind-word.json']) {
          const r = await fetch(u);
          if (r.ok) for (const e of await r.json()) texts[`${e.kind}:${e.id}`] ??= e.text;
        }
      } catch { /* manifest not available */ }
    }
    return texts[`${kind}:${id}`];
  }
  const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
  const api = {
    /** iOS: first speak() must happen inside a user gesture; app.js calls this on the first pointerdown/keydown */
    unlock() { try { if (synth && typeof SpeechSynthesisUtterance === 'function') { const u = new SpeechSynthesisUtterance(''); u.volume = 0; synth.speak(u); } } catch { /* ignore */ } },
    flags: ['tts-fallback'],
    source: 'stub',
    available: !!synth,
    has: () => false,
    /** @param {string} kind @param {string} id @param {{text?:string}} [opts] */
    async play(kind, id, opts = {}) {
      const text = opts.text ?? await lookup(kind, id) ?? (kind === 'word' || kind === 'line' ? id : undefined);
      if (!text || !synth) return { played: false, flags: api.flags, reason: !synth ? 'no speechSynthesis' : 'no text for ' + kind + ':' + id };
      return new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance(speechText(text));
        u.lang = 'he-IL'; u.rate = 0.85;
        u.onend = () => resolve({ played: true, flags: api.flags });
        u.onerror = () => resolve({ played: false, flags: api.flags, reason: 'tts error' });
        synth.cancel(); synth.speak(u);
      });
    },
    /** @param {Array<[string,string]|{kind:string,id:string}>} items */
    async playSequence(items) {
      for (const it of items) { const [k, i] = Array.isArray(it) ? it : [it.kind, it.id]; await api.play(k, i); }
    },
    stop() { synth?.cancel(); },
  };
  return api;
}
