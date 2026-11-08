// Optional secular game beds. Off until the learner turns them on.
// Prayer, cantorial listen, and learner speech all pause the bed. Speech is never ducked.
import { MUSIC_BASE, MUSIC_TRACKS, SACRED_ROUTES } from '../listen/catalog.js';
import { mediaPolicy } from './policy.js';
import { SYNTH_STYLES, createSynthTrack, createGaplessTrack } from './synth-music.js';

const clamp = (v) => Math.max(0, Math.min(1, Number.isFinite(Number(v)) ? Number(v) : 0));

export function createMusicController({
  makeAudio = (url) => new globalThis.Audio(url),
  base = MUSIC_BASE,
  tracks = MUSIC_TRACKS,
  readPrefs: readArg = () => null,
  writePrefs: writeArg = () => {},
  policy = mediaPolicy,
} = {}) {
  let readPrefs = readArg;
  let writePrefs = writeArg;
  // Default volume 0.22 (owner report, Nov 7 2026: the bed was too loud at
  // 0.4). A learner's own saved volume always wins via applyStored.
  const prefs = { want: false, muted: false, volume: 0.22, trackId: tracks[0]?.id || '' };
  let audio = null;
  let audioId = '';
  let speech = false;
  let sacred = false;
  let game = false;
  let quiet = false;
  let armed = false;
  let phase = 'off';
  let error = '';
  const subs = new Set();
  const snap = () => ({ phase, want: prefs.want, muted: prefs.muted, volume: prefs.volume, trackId: prefs.trackId, speech, sacred, game, quiet, error, armed });
  const emit = () => { for (const fn of subs) { try { fn(snap()); } catch { /* ignore */ } } };
  function save() { try { writePrefs({ want: prefs.want, muted: prefs.muted, volume: prefs.volume, trackId: prefs.trackId }); } catch { /* prefs are optional */ } }
  function applyStored(raw) {
    if (!raw || typeof raw !== 'object') return;
    if (typeof raw.want === 'boolean') { prefs.want = raw.want; armed = raw.want; }
    if (typeof raw.muted === 'boolean') prefs.muted = raw.muted;
    if (Number.isFinite(Number(raw.volume))) prefs.volume = clamp(raw.volume);
    if (tracks.some((t) => t.id === raw.trackId)) prefs.trackId = raw.trackId;
  }
  applyStored(readPrefs());
  function track() { return tracks.find((t) => t.id === prefs.trackId) || tracks[0] || null; }
  // Seamless loop (owner report: the hard loop point sounded unnatural).
  // One node cannot overlap itself, so the seam is crossed with a short dip:
  // the volume eases down over the last FADE_S seconds and back up over the
  // first FADE_S after the wrap — a crossfade's shape, honestly done with
  // the single element the design allows. Speech ducking is stronger than a
  // dip by contract: setSpeech pauses the bed outright (never under speech).
  const FADE_S = 1.2;
  let seamFade = 1;
  function applyVolume() {
    if (!audio) return;
    try { audio.volume = clamp(prefs.volume * seamFade * (speech ? 0.3 : 1)); } catch { /* ignore */ }
  }
  function onTimeUpdate(node) {
    if (audio !== node) return;
    const d = node.duration, t = node.currentTime;
    let f = 1;
    if (Number.isFinite(d) && d > 2 * FADE_S && Number.isFinite(t)) {
      if (t > d - FADE_S) f = Math.max(0, (d - t) / FADE_S);
      else if (t < FADE_S) f = Math.max(0.15, t / FADE_S);
    }
    if (Math.abs(f - seamFade) > 0.02) { seamFade = f; applyVolume(); }
  }
  function allowed() {
    return armed && prefs.want && !prefs.muted && prefs.volume > 0 && !speech && !sacred && game && !quiet && policy.allowsMusic() && !!track();
  }
  function halt(next) {
    try { audio?.pause?.(); } catch { /* ignore */ }
    phase = next;
    emit();
  }
  function ensure() {
    const row = track();
    if (!row) return null;
    if (audio && audioId === row.id) return audio;
    try { audio?.pause?.(); } catch { /* ignore */ }
    let created;
    try { created = makeAudio(base + row.file); } catch { created = null; }
    try { audio?.remove?.(); } catch { /* ignore */ }
    audio = created;
    audioId = row.id;
    seamFade = 1;
    try { audio?.setAttribute?.('data-alef-audio', 'music'); globalThis.document?.body?.append?.(audio); } catch { /* off-DOM still plays */ }
    if (!audio) { phase = 'missing'; error = 'This browser could not open the music file.'; emit(); return null; }
    audio.loop = true;
    audio.preload = 'none';
    audio.volume = prefs.volume;
    audio.addEventListener?.('error', () => {
      phase = 'missing';
      error = `${row.title} is not available.`;
      emit();
    });
    // The status follows the element, not the request (audit D-44): only the element's own
    // 'playing' event may call the phase playing, and only while this node is still current.
    created.addEventListener?.('playing', () => {
      if (audio === created && allowed()) { phase = 'playing'; emit(); }
    });
    created.addEventListener?.('pause', () => {
      if (audio === created && (phase === 'playing' || phase === 'starting') && allowed()) { phase = 'paused'; emit(); }
    });
    created.addEventListener?.('timeupdate', () => onTimeUpdate(created));
    return audio;
  }
  function start() {
    if (!allowed()) { halt(sacred || quiet || !policy.allowsMusic() ? 'blocked' : (prefs.want ? 'paused' : 'off')); return false; }
    const node = ensure();
    if (!node) return false;
    applyVolume();
    error = '';
    // 'starting' is set before play() because the element may fire 'playing' synchronously
    // inside play(); the event listener is what may then move the phase to 'playing'.
    phase = 'starting';
    emit();
    try {
      const pending = node.play?.();
      if (pending && typeof pending.catch === 'function') {
        pending.catch(() => { phase = 'rejected'; error = 'The browser refused the music.'; emit(); });
      }
    } catch {
      phase = 'rejected';
      error = 'The browser refused the music.';
      emit();
      return false;
    }
    return true;
  }
  return {
    tracks,
    snapshot: snap,
    subscribe(fn) { subs.add(fn); fn(snap()); return () => subs.delete(fn); },
    usePrefs(io = {}) {
      if (typeof io.readPrefs === 'function') { readPrefs = io.readPrefs; applyStored(readPrefs()); }
      if (typeof io.writePrefs === 'function') writePrefs = io.writePrefs;
      emit();
    },
    setContext({ sacred: isSacred = false, game: isGame = false, quiet: isQuiet = false } = {}) {
      sacred = !!isSacred;
      game = !!isGame;
      quiet = !!isQuiet;
      if (!allowed()) halt(sacred || quiet ? 'blocked' : (armed && prefs.want ? 'paused' : 'off'));
      else start();
    },
    setSpeech(on) {
      const was = speech;
      speech = !!on;
      if (speech) halt('paused');
      else if (was && allowed()) start();
      else emit();
    },
    enable() {
      armed = true;
      prefs.want = true;
      save();
      if (sacred || quiet || !game) { halt('blocked'); return false; }
      return start();
    },
    disable() {
      armed = false;
      prefs.want = false;
      save();
      halt('off');
    },
    mute(flag) {
      prefs.muted = !!flag;
      save();
      if (prefs.muted) halt('paused');
      else if (allowed()) start();
      else emit();
    },
    volume(v) {
      prefs.volume = clamp(v);
      save();
      applyVolume();
      if (prefs.volume <= 0) halt('paused');
      else if (allowed()) start();
      else emit();
      return prefs.volume;
    },
    notePolicy() {
      if (policy.allowsMusic() || phase !== 'playing') return;
      const snap = policy.snapshot?.() || {};
      halt(policy.quiet?.() || snap.routeSacred || snap.cantorial ? 'blocked' : 'paused');
    },
    choose(id) {
      if (!tracks.some((t) => t.id === id)) return false;
      prefs.trackId = id;
      save();
      try { audio?.pause?.(); } catch { /* ignore */ }
      audio = null;
      audioId = '';
      if (allowed()) start();
      else emit();
      return true;
    },
  };
}

/** Every track the game bar offers: the styles composed live in the browser first, then the three Kenney loops. */
export const GAME_TRACKS = [
  ...SYNTH_STYLES.map((st) => ({ id: st.id, file: `synth:${st.id}`, title: st.title, role: st.role, group: 'Made for ALEF' })),
  ...MUSIC_TRACKS.map((t) => ({ ...t, group: 'Kenney loops' })),
];
function makeGameAudio(url) {
  const m = /synth:([\w-]+)$/.exec(String(url));
  if (m) { const st = SYNTH_STYLES.find((x) => x.id === m[1]); if (st) return createSynthTrack(st); }
  return createGaplessTrack(url);
}
export const gameMusic = createMusicController({ tracks: GAME_TRACKS, makeAudio: makeGameAudio });
mediaPolicy.subscribe(() => gameMusic.notePolicy());
export function musicContextFor(route, { calm = false, audioFree = false } = {}) {
  const name = route?.name || '';
  return {
    sacred: SACRED_ROUTES.has(name),
    game: route?.owner === 'games',
    quiet: !!(calm || audioFree),
  };
}
