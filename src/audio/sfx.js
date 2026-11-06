// Short, opt-in game feedback only. Never touches the Hebrew/prayer voice player.
// Public files must be supplied separately from the licensed CC0 staging pack.
import { mediaPolicy } from './policy.js';
export const SFX_FILES = Object.freeze({
  click: 'click.mp3', tick: 'tick.mp3', pop: 'pop.mp3',
  success: 'success.mp3', error: 'error.mp3', miss: 'miss.mp3',
  whoosh: 'whoosh.mp3', swoosh: 'swoosh.mp3', streak: 'streak.mp3',
  bubble_pop: 'bubble_pop.mp3', flipper: 'flipper.mp3',
  catch: 'catch.mp3', collect: 'collect.mp3', pluck: 'pluck.mp3',
  back: 'back.mp3', click_soft: 'click_soft.mp3', click_hard: 'click_hard.mp3',
  close: 'close.mp3', confirm: 'confirm.mp3', drop: 'drop.mp3',
  error_soft: 'error_soft.mp3', glitch: 'glitch.mp3', maximize: 'maximize.mp3',
  minimize: 'minimize.mp3', open: 'open.mp3', question: 'question.mp3',
  scroll: 'scroll.mp3', select: 'select.mp3', select_alt: 'select_alt.mp3',
  toggle: 'toggle.mp3',
});
export const HOT_SFX = Object.freeze([
  'click', 'tick', 'pop', 'success', 'error',
  'miss', 'whoosh', 'streak', 'bubble_pop', 'flipper',
]);
const clamp = (v) => Math.max(0, Math.min(1, Number.isFinite(Number(v)) ? Number(v) : 0));

/** Injectable pure-browser wrapper: Node can test it without a DOM. */
export function createSfxController({
  makeAudio = (url) => new globalThis.Audio(url),
  reducedMotion = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  base = 'audio/sfx/ui/',
} = {}) {
  let settings = null;
  let manualMute = false;
  let level = 0.5;
  let preloaded = false;
  const pools = new Map();
  const missing = new Set();
  let turn = 0;

  function enabled() {
    try {
      return !manualMute && level > 0 && settings?.get?.('soundEffects') === true &&
        settings.get('calmMode') !== true && settings.get('audioFree') !== true &&
        !reducedMotion();
    } catch { return false; }
  }
  function create(name) {
    if (!Object.hasOwn(SFX_FILES, name) || missing.has(name)) return null;
    try {
      const a = makeAudio(base + SFX_FILES[name]);
      if (!a) return null;
      a.preload = 'auto';
      a.volume = level;
      a.addEventListener?.('error', () => missing.add(name));
      if (!pools.has(name)) pools.set(name, []);
      pools.get(name).push(a);
      return a;
    } catch { return null; }
  }
  function preload() {
    if (!enabled() || preloaded) return;
    preloaded = true;
    for (const name of HOT_SFX) {
      const a = create(name);
      try { a?.load?.(); } catch { /* missing file: silent */ }
    }
  }
  function enter(ctx) {
    settings = ctx?.settings || null;
    preload();
    return () => { if (settings === ctx?.settings) settings = null; };
  }
  function play(name) {
    if (!enabled() || !Object.hasOwn(SFX_FILES, name) || missing.has(name)) return false;
    preload();
    let pool = pools.get(name) || [];
    let a = pool.find(node => node.paused || node.ended);
    if (!a && pool.length < 3) a = create(name);
    if (!a) { if (!pool.length) return false; a = pool[turn++ % pool.length]; }
    try {
      a.volume = level;
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
      return true;
    } catch { return false; }
  }
  function pause() {
    for (const pool of pools.values()) for (const a of pool) { try { a.pause(); } catch { /* ignore */ } }
  }
  function mute(flag) { manualMute = !!flag; if (manualMute) pause(); }
  function volume(v) {
    level = clamp(v);
    for (const pool of pools.values()) for (const a of pool) {
      try { a.volume = level; } catch { /* best effort */ }
    }
    return level;
  }
  return Object.freeze({ enter, play, pause, mute, volume, preload, enabled });
}

const TWIN = { success: 'Correct', miss: 'Not this time', streak: 'Streak' };
function showTwin(kind) {
  const text = TWIN[kind];
  if (!text) return;
  try {
    let node = globalThis.document?.getElementById?.('media-twin');
    if (!node && globalThis.document?.body) {
      node = globalThis.document.createElement('p');
      node.id = 'media-twin';
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      globalThis.document.body.append(node);
    }
    if (node) node.textContent = text;
  } catch { /* a missing status line must not block the game */ }
}
const rawSfx = createSfxController();
/** Games call this singleton. The small feedback set is correct, gentle miss, and streak. */
export const sfx = Object.freeze({
  ...rawSfx,
  pause: () => rawSfx.pause(),
  play(name) {
    const kind = mediaPolicy.feedbackName(name);
    mediaPolicy.observe(name);
    if (kind) showTwin(kind);
    if (!kind || !mediaPolicy.allowsSfx()) return false;
    return rawSfx.play(kind);
  },
});
