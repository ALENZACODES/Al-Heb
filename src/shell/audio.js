// Shell audio: wraps lane 4's player (src/audio/player.js) with the manifest and an honest status indicator.
// The wrapper keeps the player's interface (play, playSequence, has, status, stop) and publishes what is actually
// being used for sound: a recorded file, the browser's text-to-speech voice, or nothing.
// Status wording comes from ./audio-labels.js (one table for every screen and report).
import { fileLabel, isSyntheticStatus, STATUS_LABELS, traditionCaption } from './audio-labels.js';
import { spokenClips } from './audio-truth.js';
import { gameMusic } from '../audio/music.js';
import { sfx } from '../audio/sfx.js';
import { mediaPolicy } from '../audio/policy.js';
export const REASONS = {
  'english-recording-unavailable': 'the English recording is unavailable',
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
  for (const e of manifest) { if (e.status === 'recorded') s.recorded++; else if (isSyntheticStatus(e.status)) s.tts++; else s.missing++; }
  return s;
}

/** Pure: status text for the indicator from a player plan/result. */
export function describeResult(r, congregation = 'israeli') {
  if (!r) return { mode: 'none', text: '' };
  if (r.source === 'file') {
    return { mode: 'file', text: `Sound: ${fileLabel(r.entryStatus, r.fileTradition || r.tradition, r.entrySource)} (${r.voice === 'm' ? 'man' : 'woman'}, ${traditionCaption(r.tradition, r.fileTradition)}).` };
  }
  if (r.source === 'tts-fallback' || r.played === true) {
    const mismatch = r.mismatch || (r.tradition && r.tradition !== 'israeli');
    return { mode: 'tts', text: `Sound: your browser's text-to-speech voice, not a recording. Gender and accent are set by your device, not by the Man/Woman choice${mismatch ? `, and it reads Israeli pronunciation, not ${TRAD[r.tradition] || r.tradition}` : ''}.` };
  }
  return { mode: 'none', text: `No sound: ${REASONS[r.reason] || r.reason || r.error || 'unavailable'}.` };
}

/** Status from a real media event. Clicking Play does not produce this line. */
export function playbackLine(ev, plan = ev || {}) {
  const who = `${plan.voice === 'm' ? 'man' : 'woman'}, ${traditionCaption(plan.tradition, plan.fileTradition)}`;
  const speed = ev?.rate === 0.7 ? ' Slow, 0.7×.' : ' Normal speed.';
  if (ev?.type === 'playing' && (plan.source === 'file' || ev?.source === 'file')) {
    return { mode: 'file', text: `Playing: ${fileLabel(plan.entryStatus, plan.fileTradition || plan.tradition, plan.entrySource)} (${who}).${speed}` };
  }
  if (ev?.type === 'playing') return { mode: 'tts', text: `Playing with this device's Hebrew voice.${speed}` };
  if (ev?.type === 'your-turn') return { mode: 'idle', text: 'Your turn: say it.' };
  if (ev?.type === 'ended' && ev?.step === 'your-turn') return { mode: 'idle', text: 'Sound finished. Press Play to hear it again.' };
  if (ev?.type === 'ended' && ev?.step === 'first') return { mode: 'idle', text: 'Now slowly.' };
  if (ev?.type === 'ended') return { mode: 'idle', text: 'Sound finished.' };
  if (ev?.type === 'error') return { mode: 'none', text: 'No sound: the recording did not load.' };
  if (ev?.type === 'stopped') return { mode: 'idle', text: 'Sound stopped.' };
  return { mode: 'none', text: 'No sound: unavailable.' };
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
const IDLE_TEXT = "Sound: the list has not been loaded yet."; // one short line: the sound bar is one line at 360px; Details explains
// The idle line. `summary` is the loaded list's own count (core manifest + word shard: only part of the clips); `shipped` is
// data/audio/summary.json, whose `spoken` field counts every synthetic speech clip on disk, including the book, arcade and
// opening-prayer clips that no manifest lists (tools/audio/summary.mjs). The number is read from there, never typed here.
const spokenLine = (shipped) => {
  const n = spokenClips(shipped);
  return n > 0
    ? `Sound: ${n.toLocaleString('en-US')} Hebrew clips (man and woman voices; synthetic, not a human recording); your device's voice fills any gap.`
    : "Sound: synthetic Hebrew clips (man and woman voices, not a human recording); your device's voice fills any gap.";
};
const initialText = (summary, shipped = null) => (summary.recorded > 0
  ? { mode: 'idle', text: `Sound: ${summary.recorded} clips listed as "${STATUS_LABELS.recorded}" and ${summary.tts} as "${STATUS_LABELS.tts}"; anything else uses your browser's voice.` }
  : summary.tts > 0
    ? { mode: 'idle', text: spokenLine(shipped) }
    : { mode: 'idle', text: "No recordings yet. Uses your device's Hebrew voice, if it has one." });

/**
 * @param {{settings:any, manifest?:any[], loadManifest?:()=>Promise<any[]>, loadSummary?:()=>Promise<{recorded:number,tts:number}>, createAudio?:Function}} o
 * `loadSummary` (optional) reads the shipped data/audio/summary.json: when the list loads it supplies the clip count for the idle line;
 * when the list fails to load, a {recorded:0,tts:0} answer keeps the idle "No recordings yet" line.
 * Give `manifest` for an already-loaded list (state 'ready'), or `loadManifest` to resolve it lazily. Nothing is fetched at
 * creation: `manifestState` starts 'idle' (status text says no list is loaded). The first status()/has()/play()/playSequence()/
 * ensureManifest() moves it to 'checking' and starts the load; until it resolves has() is false and status() says "checking audio..."
 * for anything not already known to be a file, and play() waits for the list. A failed load gives 'offline' (retried on the next
 * play/ensureManifest, not on every status()). onNeed(fn) calls fn(kind) whenever something asks about a clip of that kind (the shell
 * uses it to load the word shard only when a word clip is asked about).
 */
export function createShellAudio({ settings, manifest, loadManifest, loadSummary, createAudio }) {
  let summary = summarizeManifest(manifest || []);
  const inner = createAudio({
    settings: {
      get voice() { return settings.get('voice'); },
      get congregation() { return settings.get('congregation'); },
      get clipRate() { return settings.get('clipRate'); },
      get echoMode() { return settings.get('echoMode'); },
    },
    manifest: manifest || [],
  });
  const subs = new Set(), mSubs = new Set();
  const needSubs = new Set();
  let mstate = !manifest && typeof loadManifest === 'function' ? 'idle' : 'ready';
  let state = mstate === 'idle' ? { mode: 'idle', pending: true, text: IDLE_TEXT } : initialText(summary); // pending: nothing has been asked yet, so the sound bar stays hidden
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
    if (mstate !== 'checking') { setM('checking'); publish({ mode: 'idle', pending: true, text: 'Sound: checking which recordings exist...' }); }
    pending = Promise.resolve().then(loadManifest).then(async (list) => {
      inner.extend(list); summary = summarizeManifest(list);
      let shipped = null;
      try { if (typeof loadSummary === 'function') shipped = await loadSummary(); } catch { shipped = null; } // no count: the line still says what the clips are
      setM('ready'); publish(initialText(summary, shipped)); return true;
    }).catch(async () => {
      setM('offline');
      // The big list is not here (offline, not cached). If the tiny shipped summary says no clip exists at all, there is nothing the
      // list could add: stay with the honest idle line instead of an alarming "could not be loaded". Unknown summary: say it could not load.
      let none = false;
      try { if (typeof loadSummary === 'function') { const t = await loadSummary(); none = !!t && t.recorded === 0 && t.tts === 0; } } catch { none = false; }
      publish(none ? initialText({ recorded: 0, tts: 0 }) : { mode: 'none', text: "Sound: the list of recordings could not be loaded (offline?). Only your browser's voice is available, where your device has one." });
      return false;
    }).finally(() => { pending = null; });
    return pending;
  }
  const settle = () => (mstate === 'checking' || mstate === 'idle' ? ensureManifest() : Promise.resolve());
  /** something asked about a clip: start the lazy load the first time, and tell the shell which kind (it may load a shard) */
  const need = (kind) => {
    if (mstate === 'idle') ensureManifest();
    for (const f of needSubs) { try { f(kind); } catch { /* ignore */ } }
  };
  const checking = (kind, id) => ({ source: 'none', reason: CHECKING, kind, id });
  const gate = (r, kind, id) => (mstate === 'checking' && r.source !== 'file' ? checking(kind, id) : r);

  let speechDepth = 0;
  let playEpoch = 0;
  let playsInFlight = 0;
  const speechBegin = () => {
    speechDepth += 1;
    mediaPolicy.setSpeech(true);
    try { sfx.pause(); } catch { /* ignore */ }
    gameMusic.setSpeech(true);
  };
  const speechEnd = () => {
    speechDepth = Math.max(0, speechDepth - 1);
    if (!speechDepth) { mediaPolicy.clearSpeech(); gameMusic.setSpeech(false); }
  };
  return {
    ...inner,
    stop() {
      playEpoch += 1;
      speechDepth = 0; mediaPolicy.clearSpeech(); gameMusic.setSpeech(false);
      const r = inner.stop();
      if (r?.interrupted || playsInFlight > 0) publish({ mode: 'idle', text: 'Sound stopped.' });
      return r;
    },
    /** call synchronously inside the first user gesture (see createAudioUnlock); safe to call again */
    unlock: createAudioUnlock(globalThis),
    get summary() { return summary; },
    get state() { return state; },
    /** 'idle' (not asked for yet) | 'checking' | 'ready' | 'offline' - whether the core recording list is known. */
    get manifestState() { return mstate; },
    ensureManifest,
    /** the in-flight load (or null); never starts one */
    get loading() { return pending; },
    /** fn(kind) whenever status/has/play/playSequence is asked about a clip; returns an unsubscribe function */
    onNeed(fn) { needSubs.add(fn); return () => needSubs.delete(fn); },
    /** fn(state) on every manifest state change; returns an unsubscribe function. */
    onManifestState(fn) { mSubs.add(fn); return () => mSubs.delete(fn); },
    /** short extra note appended to the sound-status line (e.g. 'audio info unavailable offline'); '' clears it */
    setNote(n) { note = n || ''; publish(raw); },
    subscribe(fn) { subs.add(fn); fn(state); return () => subs.delete(fn); },
    status: (kind, id, o) => { need(kind); return gate(inner.status(kind, id, opts(o)), kind, id); },
    has: (kind, id, o) => { need(kind); return inner.has(kind, id, opts(o)); },
    async play(kind, id, o) {
      need(kind);
      const epoch = playEpoch;
      playsInFlight += 1;
      try {
        await settle();
        if (epoch !== playEpoch) return { source: 'none', stopped: true, reason: 'stopped' };
        const o2 = opts(o);
        speechBegin();
        let fromMedia = false;
        try {
          const r = await inner.play(kind, id, { ...o2, onMedia(ev) {
            fromMedia = true;
            if (epoch !== playEpoch) return;
            publish(playbackLine(ev));
          } });
          if (epoch !== playEpoch) return { ...r, stopped: true };
          if (!fromMedia || r?.source === 'tts-fallback' || r?.source === 'none' || r?.fileError) publish(describeResult(r));
          return r;
        } finally { speechEnd(); }
      } finally { playsInFlight = Math.max(0, playsInFlight - 1); }
    },
    async playSequence(items, so) {
      for (const it of items) need(Array.isArray(it) ? it[0] : it && it.kind);
      await settle();
      speechBegin();
      try {
        const res = await inner.playSequence(items.map((it) => ({ ...(Array.isArray(it) ? { kind: it[0], id: it[1] } : it), ...opts() })), so);
        if (res.length) publish(describeResult(res[res.length - 1]));
        return res;
      } finally { speechEnd(); }
    },
  };
}
