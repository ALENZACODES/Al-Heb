import { reactRimon } from '../shell/rimon-events.js';
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
      node.setAttribute('class', 'visually-hidden');
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      globalThis.document.body.append(node);
    }
    // The twin is a status line for assistive tech only; it must never show as stray text (audit D-45).
    if (node && node.getAttribute?.('class') !== 'visually-hidden') node.setAttribute('class', 'visually-hidden');
    if (node) node.textContent = text;
  } catch { /* a missing status line must not block the game */ }
}
/** Action sounds (a tick, a whoosh, a pop) may not repeat faster than this, so a busy game never rattles. */
export const ACTION_GAP_MS = 90;
/**
 * The player games call. Two kinds of sound go through it:
 *  - feedback (correct, gentle miss, streak): also writes the screen-reader line and moves Rimon;
 *  - action sounds a game asks for by name (tick, whoosh, pop, collect, drop and the rest of SFX_FILES).
 * Both obey the same media rules (src/audio/policy.js): nothing in the first minute, nothing before a first win, nothing while
 * a voice is speaking, a cantor is singing or a prayer screen is open, and nothing when the learner has sound effects off.
 * Injectable so Node can test it without audio.
 */
export function createGameSfx({ raw, policy = mediaPolicy, twin = showTwin, react = reactRimon, now = () => Date.now() } = {}) {
  const last = new Map();
  return Object.freeze({
    ...raw,
    pause: () => raw.pause(),
    play(name) {
      const kind = policy.feedbackName(name);
      policy.observe(name);
      if (kind) { twin(kind); react(kind === 'success' ? 'bounce' : kind === 'miss' ? 'sad' : 'stretch'); }
      if (!policy.allowsSfx()) return false;
      if (kind) return raw.play(kind);
      if (!Object.hasOwn(SFX_FILES, name)) return false;
      const t = now();
      if (t - (last.get(name) ?? -Infinity) < ACTION_GAP_MS) return false;
      last.set(name, t);
      return raw.play(name);
    },
  });
}
const rawSfx = createSfxController();
/** Games call this singleton. */
export const sfx = createGameSfx({ raw: rawSfx });
