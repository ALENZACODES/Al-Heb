// Shell audio: wraps lane 4's player (src/audio/player.js) with the manifest and an honest status indicator.
// The wrapper keeps the player's interface (play, playSequence, has, status, stop) and publishes what is actually
// being used for sound: a recorded file, the browser's text-to-speech voice, or nothing.
// Status wording comes from ./audio-labels.js (one table for every screen and report).
import { fileLabel, STATUS_LABELS } from './audio-labels.js';
export const REASONS = {
  'no-hebrew-browser-voice': 'your browser has no Hebrew voice installed',
  'tts-pronunciation-mismatch': 'the browser voice only reads Israeli pronunciation and you chose another tradition',
  'no-speech-synthesis': 'this browser has no speech synthesis',
  'unknown-item': 'no audio entry exists for this item',
  'invalid-voice': 'invalid voice setting',
  'invalid-tradition': 'invalid pronunciation setting',
  'no-audio-support': 'this browser cannot play audio files',
  'speech-error': 'the browser voice reported an error',
  'checking audio...': 'still checking which recordings exist',
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
    return { mode: 'file', text: `Sound: ${fileLabel(r.entryStatus)} (${r.voice === 'm' ? 'man' : 'woman'}, ${TRAD[r.fileTradition || r.tradition] || r.tradition}).` };
  }
  if (r.source === 'tts-fallback' || r.played === true) {
    const mismatch = r.mismatch || (r.tradition && r.tradition !== 'israeli');
    return { mode: 'tts', text: `Sound: your browser's text-to-speech voice, not a recording. Gender and accent are set by your device, not by the Man/Woman choice${mismatch ? `, and it reads Israeli pronunciation, not ${TRAD[r.tradition] || r.tradition}` : ''}.` };
  }
  return { mode: 'none', text: `No sound: ${REASONS[r.reason] || r.reason || r.error || 'unavailable'}.` };
}

/**
 * iOS/Safari audio unlock. Mobile Safari only lets a page make sound after a user gesture, and the FIRST sound call must be
 * synchronous inside that gesture (our play() awaits the manifest first, so its first call is too late). This primes every engine
 * the player may use, once, from the first pointerdown/keydown: resumes an AudioContext when the browser has one (no-op without),
 * plays a muted empty Audio element, and speaks an empty utterance. Pure of the DOM; everything optional; never throws.
 * @param {any} [g] window-like @returns {() => {done:boolean, context:boolean, audio:boolean, speech:boolean}}
 */
export function createAudioUnlock(g = globalThis) {
  let done = false, ctx = null;
  return function unlock() {
    if (done) return { done: true, context: false, audio: false, speech: false };
    done = true;
    const out = { done: true, context: false, audio: false, speech: false };
    try {
      const AC = g?.AudioContext || g?.webkitAudioContext;
      if (typeof AC === 'function') {
        ctx = ctx || new AC();
        if (ctx.state === 'suspended' && typeof ctx.resume === 'function') { const p = ctx.resume(); if (p && typeof p.catch === 'function') p.catch(() => {}); }
        out.context = true;
      }
    } catch { /* no AudioContext here */ }
    try {
      if (typeof g?.Audio === 'function') {
        const a = new g.Audio(); a.muted = true;
        const p = typeof a.play === 'function' ? a.play() : null; if (p && typeof p.catch === 'function') p.catch(() => {});
        out.audio = true;
      }
    } catch { /* no audio element */ }
    try {
      const sp = g?.speechSynthesis, U = g?.SpeechSynthesisUtterance;
      if (sp && typeof sp.speak === 'function' && typeof U === 'function') { const u = new U(''); u.volume = 0; sp.speak(u); out.speech = true; }
    } catch { /* no speech */ }
    return out;
  };
}

const CHECKING = 'checking audio...';
const initialText = (summary) => (summary.recorded + summary.tts > 0
  ? { mode: 'idle', text: `Sound: ${summary.recorded} clips listed as "${STATUS_LABELS.recorded}" and ${summary.tts} as "${STATUS_LABELS.tts}"; anything else uses your browser's voice.` }
  : { mode: 'idle', text: "Sound: no recordings exist yet. Audio uses your browser's Hebrew text-to-speech voice, if your device has one." });

/**
 * @param {{settings:any, manifest?:any[], loadManifest?:()=>Promise<any[]>, createAudio?:Function}} o
 * Give `manifest` for an already-loaded list (state 'ready'), or `loadManifest` to resolve it lazily: until it resolves,
 * `manifestState` is 'checking', has() is false and status() says "checking audio..." for anything not already known to be a
 * file, and play() waits for the list. A failed load gives 'offline' (and is retried on the next play/ensureManifest).
 */
export function createShellAudio({ settings, manifest, loadManifest, createAudio }) {
  let summary = summarizeManifest(manifest || []);
  const inner = createAudio({
    settings: { get voice() { return settings.get('voice'); }, get congregation() { return settings.get('congregation'); } },
    manifest: manifest || [],
  });
  const subs = new Set(), mSubs = new Set();
  let mstate = !manifest && typeof loadManifest === 'function' ? 'checking' : 'ready';
  let state = mstate === 'checking' ? { mode: 'idle', text: 'Sound: checking which recordings exist...' } : initialText(summary);
  let note = '', raw = state, pending = null;
  const compose = (s) => (note ? { ...s, text: `${s.text} (${note})` } : s);
  const publish = (s) => { raw = s; state = compose(s); for (const f of subs) { try { f(state); } catch { /* ignore */ } } };
  const setM = (s) => { mstate = s; for (const f of mSubs) { try { f(s); } catch { /* ignore */ } } };
  const opts = (o = {}) => ({ allowMismatchedTts: !!settings.get('browserVoiceAnyway'), ...o });

  /** Resolve the core manifest once (memoised while in flight). Resolves true when ready, false when unavailable. Never throws. */
  function ensureManifest() {
    if (mstate === 'ready') return Promise.resolve(true);
    if (pending) return pending;
    if (typeof loadManifest !== 'function') return Promise.resolve(false);
    if (mstate !== 'checking') { setM('checking'); publish({ mode: 'idle', text: 'Sound: checking which recordings exist...' }); }
    pending = Promise.resolve().then(loadManifest).then((list) => {
      inner.extend(list); summary = summarizeManifest(list);
      setM('ready'); publish(initialText(summary)); return true;
    }).catch(() => {
      setM('offline'); publish({ mode: 'none', text: "Sound: the list of recordings could not be loaded (offline?). Only your browser's voice is available, where your device has one." }); return false;
    }).finally(() => { pending = null; });
    return pending;
  }
  const settle = () => (mstate === 'checking' ? ensureManifest() : Promise.resolve());
  const checking = (kind, id) => ({ source: 'none', reason: CHECKING, kind, id });
  const gate = (r, kind, id) => (mstate === 'checking' && r.source !== 'file' ? checking(kind, id) : r);

  return {
    ...inner,
    /** call synchronously inside the first user gesture (see createAudioUnlock); safe to call again */
    unlock: createAudioUnlock(globalThis),
    get summary() { return summary; },
    get state() { return state; },
    /** 'ready' | 'checking' | 'offline' - whether the core recording list is known. */
    get manifestState() { return mstate; },
    ensureManifest,
    /** fn(state) on every manifest state change; returns an unsubscribe function. */
    onManifestState(fn) { mSubs.add(fn); return () => mSubs.delete(fn); },
    /** short extra note appended to the sound-status line (e.g. 'audio info unavailable offline'); '' clears it */
    setNote(n) { note = n || ''; publish(raw); },
    subscribe(fn) { subs.add(fn); fn(state); return () => subs.delete(fn); },
    status: (kind, id, o) => gate(inner.status(kind, id, opts(o)), kind, id),
    has: (kind, id, o) => inner.has(kind, id, opts(o)),
    async play(kind, id, o) {
      await settle();
      const o2 = opts(o);
      publish(describeResult(inner.status(kind, id, o2)));      // what WILL be used, before it speaks
      const r = await inner.play(kind, id, o2);
      publish(describeResult(r));
      return r;
    },
    async playSequence(items, so) {
      await settle();
      const res = await inner.playSequence(items.map((it) => ({ ...(Array.isArray(it) ? { kind: it[0], id: it[1] } : it), ...opts() })), so);
      if (res.length) publish(describeResult(res[res.length - 1]));
      return res;
    },
  };
}
