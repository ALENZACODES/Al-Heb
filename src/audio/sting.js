// A few seconds of an original song after a finished lesson, only for a learner who turned music on in the game bar.
// Same rules as the bed: not on a sacred route, not with prayer or cantorial audio, never with speech (it waits for a cheer line
// to finish, gives up after WAIT_MS, and stops the moment any voice starts), never in calm or audio-free mode.
// Loaded lazily (src/app.js, on 'alef:celebrate'); the files are cut from the songs by the ffmpeg line in audio/music/CREDITS.md.
// A missing file is silent.
import { mediaPolicy } from './policy.js';
import { gameMusic } from './music.js';
import { MUSIC_BASE } from '../listen/catalog.js';

export const STINGS = Object.freeze(['stings/yachad-sting.mp3', 'stings/open-hands-sting.mp3']);
export const WAIT_MS = 4000;

/** Returns false when nothing will play; true when the sting is waiting or playing. */
export function playSting({ settings = null, makeAudio = (u) => new globalThis.Audio(u), pick = (list) => list[Math.floor(Math.random() * list.length)], setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const want = gameMusic.snapshot();
  if (!want.want || want.muted || !(want.volume > 0)) return false;
  if (settings?.get?.('calmMode') === true || settings?.get?.('audioFree') === true) return false;
  let node = null; let done = false; let unsub = () => {}; let timer = null;
  const stop = () => {
    if (done) return;
    done = true;
    try { node?.pause?.(); node?.remove?.(); } catch { /* gone */ }
    try { unsub(); } catch { /* ignore */ }
    if (timer) clearTimer(timer);
  };
  const react = (s) => {
    if (done) return;
    if (node) { if (s.speech || s.cantorial || s.routeSacred) stop(); return; }
    if (s.speech) return; // a cheer line is speaking: wait for it
    if (!mediaPolicy.allowsMusic()) { stop(); return; }
    try { node = makeAudio(MUSIC_BASE + pick(STINGS)); } catch { node = null; }
    if (!node) { stop(); return; }
    node.volume = want.volume;
    node.addEventListener?.('ended', stop);
    node.addEventListener?.('error', stop);
    try { const p = node.play?.(); if (p && typeof p.catch === 'function') p.catch(stop); } catch { stop(); }
  };
  timer = setTimer(() => { if (!node) stop(); }, WAIT_MS);
  unsub = mediaPolicy.subscribe(react);
  if (done) unsub();
  return !done;
}
