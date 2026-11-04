// Shell audio: wraps lane 4's player (src/audio/player.js) with the manifest and an honest status indicator.
// The wrapper keeps the player's interface (play, playSequence, has, status, stop) and publishes what is actually
// being used for sound: a recorded file, the browser's text-to-speech voice, or nothing.
export const REASONS = {
  'no-hebrew-browser-voice': 'your browser has no Hebrew voice installed',
  'tts-pronunciation-mismatch': 'the browser voice only reads Israeli pronunciation and you chose another tradition',
  'no-speech-synthesis': 'this browser has no speech synthesis',
  'unknown-item': 'no audio entry exists for this item',
  'invalid-voice': 'invalid voice setting',
  'invalid-tradition': 'invalid pronunciation setting',
  'no-audio-support': 'this browser cannot play audio files',
  'speech-error': 'the browser voice reported an error',
};
const TRAD = { israeli: 'Israeli', sephardi: 'Sephardi', ashkenazi: 'Ashkenazi' };

/** Pure: summarise the manifest ({total, recorded, tts, missing}). */
export function summarizeManifest(manifest) {
  const s = { total: manifest.length, recorded: 0, tts: 0, missing: 0 };
  for (const e of manifest) { if (e.status === 'recorded') s.recorded++; else if (e.status === 'tts') s.tts++; else s.missing++; }
  return s;
}

/** Pure: status text for the indicator from a player plan/result. */
export function describeResult(r, congregation = 'israeli') {
  if (!r) return { mode: 'none', text: '' };
  if (r.source === 'file') {
    const kind = r.entryStatus === 'tts' ? 'pre-rendered synthetic voice file' : 'recorded audio file';
    return { mode: 'file', text: `Sound: ${kind} (${r.voice === 'm' ? 'man' : 'woman'}, ${TRAD[r.fileTradition || r.tradition] || r.tradition}).` };
  }
  if (r.source === 'tts-fallback' || r.played === true) {
    const mismatch = r.mismatch || (r.tradition && r.tradition !== 'israeli');
    return { mode: 'tts', text: `Sound: your browser's text-to-speech voice, not a recording. Gender and accent are set by your device, not by the Man/Woman choice${mismatch ? `, and it reads Israeli pronunciation, not ${TRAD[r.tradition] || r.tradition}` : ''}.` };
  }
  return { mode: 'none', text: `No sound: ${REASONS[r.reason] || r.reason || r.error || 'unavailable'}.` };
}

/**
 * @param {{settings:any, manifest?:any[], createAudio?:Function}} o
 */
export function createShellAudio({ settings, manifest = [], createAudio }) {
  const summary = summarizeManifest(manifest);
  const inner = createAudio({
    settings: { get voice() { return settings.get('voice'); }, get congregation() { return settings.get('congregation'); } },
    manifest,
  });
  const subs = new Set();
  const initial = summary.recorded + summary.tts > 0
    ? { mode: 'idle', text: `Sound: ${summary.recorded} recorded and ${summary.tts} pre-rendered clips are listed; anything else uses your browser's voice.` }
    : { mode: 'idle', text: "Sound: no recordings exist yet. Audio uses your browser's Hebrew text-to-speech voice, if your device has one." };
  let state = initial;
  const publish = (s) => { state = s; for (const f of subs) { try { f(state); } catch { /* ignore */ } } };
  const opts = (o = {}) => ({ allowMismatchedTts: !!settings.get('browserVoiceAnyway'), ...o });

  return {
    ...inner,
    summary,
    get state() { return state; },
    subscribe(fn) { subs.add(fn); fn(state); return () => subs.delete(fn); },
    status: (kind, id, o) => inner.status(kind, id, opts(o)),
    has: (kind, id, o) => inner.has(kind, id, opts(o)),
    async play(kind, id, o) {
      const o2 = opts(o);
      publish(describeResult(inner.status(kind, id, o2)));      // what WILL be used, before it speaks
      const r = await inner.play(kind, id, o2);
      publish(describeResult(r));
      return r;
    },
    async playSequence(items, so) {
      const res = await inner.playSequence(items.map((it) => ({ ...(Array.isArray(it) ? { kind: it[0], id: it[1] } : it), ...opts() })), so);
      if (res.length) publish(describeResult(res[res.length - 1]));
      return res;
    },
  };
}
