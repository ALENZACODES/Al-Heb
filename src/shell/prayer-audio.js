// Israeli reading for one opening-prayer entry. Never another tradition, never browser speech.

export function clipFor(catalog, he, voice) {
  if (voice !== 'm' && voice !== 'f') return null;
  const slot = voice;
  const wanted = String(he || '').normalize('NFC');
  const row = (catalog && catalog.clips || []).find((c) => String(c.he || '').normalize('NFC') === wanted);
  const path = row && row[slot];
  return typeof path === 'string' && path.startsWith(`audio/${slot}/israeli/`) ? path : null;
}

/** Sound off, calm mode, and audio-free mean the opening entry does not start by itself. */
export function autoplayAllowed(settings) {
  if (!settings || typeof settings !== 'object') return true;
  if (settings.audioFree === true || settings.calmMode === true || settings.soundEffects === false) return false;
  return true;
}

/**
 * One clip at a time. start() replaces any clip this controller already started.
 * play() rejection is autoplay-blocked, not a reason to speak another way.
 */
export function createEntryPlayback({ path, AudioCtor = globalThis.Audio, onEnded } = {}) {
  let token = 0;
  let audio = null;
  const halt = () => {
    const current = audio;
    audio = null;
    if (!current) return;
    try { current.pause(); } catch { /* already stopped */ }
    try { current.removeAttribute('src'); current.load(); } catch { /* not a media element */ }
  };
  return {
    get playing() { return !!(audio && !audio.paused); },
    stop() { token += 1; halt(); },
    async start() {
      const gen = ++token;
      halt();
      token = gen;
      if (!path || typeof AudioCtor !== 'function') return { ok: false, reason: 'no-israeli-clip' };
      const el = new AudioCtor(path);
      audio = el;
      try { el.preload = 'auto'; } catch { /* optional */ }
      try { el.addEventListener('ended', () => { if (audio === el && typeof onEnded === 'function') onEnded(); }); } catch { /* optional */ }
      try {
        const pending = el.play();
        if (pending && typeof pending.then === 'function') await pending;
        if (token !== gen) { halt(); return { ok: false, reason: 'replaced' }; }
        return { ok: true };
      } catch {
        if (token !== gen) return { ok: false, reason: 'replaced' };
        return { ok: false, reason: 'autoplay-blocked' };
      }
    },
  };
}
