// Optional secular game beds. Off until the learner turns them on.
// Prayer, cantorial listen, and learner speech all pause the bed. Speech is never ducked.
import { MUSIC_BASE, MUSIC_TRACKS, SACRED_ROUTES } from '../listen/catalog.js';
import { mediaPolicy } from './policy.js';

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
  const prefs = { want: false, muted: false, volume: 0.4, trackId: tracks[0]?.id || '' };
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
    return audio;
  }
  function start() {
    if (!allowed()) { halt(sacred || quiet || !policy.allowsMusic() ? 'blocked' : (prefs.want ? 'paused' : 'off')); return false; }
    const node = ensure();
    if (!node) return false;
    node.volume = prefs.volume;
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
      if (audio) { try { audio.volume = prefs.volume; } catch { /* ignore */ } }
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

export const gameMusic = createMusicController();
mediaPolicy.subscribe(() => gameMusic.notePolicy());
export function musicContextFor(route, { calm = false, audioFree = false } = {}) {
  const name = route?.name || '';
  return {
    sacred: SACRED_ROUTES.has(name),
    game: route?.owner === 'games',
    quiet: !!(calm || audioFree),
  };
}
