// One sacred-listen recording at a time. Nothing plays until the learner presses Play.
// A missing file or a refused play() is reported; it does not throw. Playback never loops.
import { mediaPolicy } from '../audio/policy.js';

export function createShelfPlayer({ makeAudio = (url) => new globalThis.Audio(url), base = 'audio/listen/' } = {}) {
  let node = null;
  let currentId = null;
  let phase = 'idle';
  let error = '';
  const subs = new Set();
  const snap = () => ({ id: currentId, phase, error });
  const emit = () => { for (const fn of subs) { try { fn(snap()); } catch { /* a view must not break playback */ } } };
  function clearNode() {
    if (!node) return;
    try { node.pause(); } catch { /* already gone */ }
    try { node.removeAttribute?.('src'); node.load?.(); node.remove?.(); } catch { /* ignore */ }
    node = null;
  }
  function releaseLayer() { mediaPolicy.setCantorial(false); }
  function stop() {
    clearNode();
    releaseLayer();
    currentId = null;
    phase = 'idle';
    error = '';
    emit();
  }
  function play(item) {
    if (!item?.file) {
      currentId = item?.id ?? null;
      phase = 'error';
      error = 'This recording has no file.';
      emit();
      return;
    }
    stop();
    currentId = item.id;
    let audio;
    try { audio = makeAudio(base + item.file); } catch {
      phase = 'error';
      error = 'This browser could not open the recording.';
      emit();
      return;
    }
    if (!audio) {
      phase = 'error';
      error = 'This browser could not open the recording.';
      emit();
      return;
    }
    node = audio;
    try { audio.setAttribute?.('data-alef-audio', 'listen'); globalThis.document?.body?.append?.(audio); } catch { /* keeping it off-DOM still plays */ }
    audio.preload = 'none';
    audio.loop = false;
    const still = () => currentId === item.id && node === audio;
    audio.addEventListener?.('error', () => {
      if (!still()) return;
      phase = 'missing';
      error = 'This recording did not load. The file is missing or the server refused it.';
      emit();
    });
    audio.addEventListener?.('playing', () => { if (still()) { phase = 'playing'; error = ''; emit(); } });
    audio.addEventListener?.('pause', () => { if (still() && phase === 'playing') { phase = 'paused'; emit(); } });
    audio.addEventListener?.('ended', () => { if (still()) { phase = 'ended'; releaseLayer(); emit(); } });
    phase = 'loading';
    error = '';
    mediaPolicy.setCantorial(true);
    emit();
    try {
      const pending = audio.play?.();
      if (pending && typeof pending.catch === 'function') {
        pending.catch(() => {
          if (!still()) return;
          phase = 'rejected';
          error = 'The browser refused playback. Tap the page, then press play again.';
          emit();
        });
      }
    } catch {
      phase = 'rejected';
      error = 'The browser refused playback. Tap the page, then press play again.';
      emit();
    }
  }
  function pause() {
    if (!node) return;
    try { node.pause(); } catch { /* ignore */ }
    releaseLayer();
    if (phase === 'playing' || phase === 'loading') { phase = 'paused'; emit(); }
  }
  function toggle(item) {
    if (currentId === item.id && node && node.paused === false && phase === 'playing') pause();
    else play(item);
  }
  return {
    play, pause, toggle, stop,
    snapshot: snap,
    subscribe(fn) { subs.add(fn); fn(snap()); return () => subs.delete(fn); },
  };
}
