// Rimon, the mascot, as a flip-book of still frames (order sheet: docs/images/rimon-frames.csv).
//
//   import { mountMascot } from './shell/mascot.js';
//   const m = mountMascot(root, { fps: 6 });            // later: m.destroy()
//
// Frames live under assets/img/rimon/frames/<action>-NN.png. Every frame is optional: each one is preloaded with
// Image(), the ones that fail to load are skipped silently, and when no frame loads at all nothing is rendered.
// The idle blink loops; now and then one random other action plays once, then idle resumes. With
// prefers-reduced-motion the first idle frame is shown as a single still. Nothing here is wired into a view yet.

export const DEFAULT_ACTIONS = { idle: 4, smile: 1, wink: 1, yawn: 3, stretch: 3, laugh: 3, nod: 2, wave: 2 };
export const FRAMES_BASE = 'assets/img/rimon/frames';

const pad2 = (n) => String(n).padStart(2, '0');

/** Every frame path the order sheet names, per action: { idle: ['.../idle-01.png', ...], ... }. */
export function framePaths(actions = DEFAULT_ACTIONS, base = FRAMES_BASE) {
  const out = {};
  for (const [action, n] of Object.entries(actions)) {
    out[action] = [];
    for (let i = 1; i <= n; i++) out[action].push(`${base}/${action}-${pad2(i)}.png`);
  }
  return out;
}

/**
 * Pure frame scheduler. `frames` maps action -> array of frame paths that actually loaded (empty arrays are fine).
 * next() returns the path to show on this tick, or null when nothing can be shown.
 *
 * Timing: idle frames play in order; the first idle frame (eyes open) is held for `idleHold` ticks so the blink is
 * brief and the open eyes last. After each full idle loop, with probability `actionChance`, one other action with
 * frames is chosen through `random` (0 <= random() < 1, injectable for tests) and played once, each frame for
 * `actionHold` ticks; then idle resumes from its first frame. Without idle frames, the actions simply take turns.
 */
export function createScheduler(frames, { idleHold = 12, actionHold = 2, actionChance = 0.2, random = Math.random } = {}) {
  const have = Object.fromEntries(Object.entries(frames || {}).filter(([, v]) => Array.isArray(v) && v.length));
  const idle = have.idle || [];
  const others = Object.keys(have).filter((k) => k !== 'idle').sort();
  let action = idle.length ? 'idle' : others[0] || null;
  let index = 0, held = 0;

  const holdFor = () => (action === 'idle' ? (index === 0 ? idleHold : 1) : actionHold);
  const pickOther = () => others[Math.min(others.length - 1, Math.floor(random() * others.length))];

  function advance() {
    const list = have[action];
    if (++held < holdFor()) return;
    held = 0;
    if (++index < list.length) return;
    index = 0;
    if (action === 'idle') { if (others.length && random() < actionChance) action = pickOther(); }
    else if (idle.length) action = 'idle';
    else action = pickOther();
  }

  return {
    /** The frame to show now; advances the clock. */
    next() {
      if (!action) return null;
      const path = have[action][index];
      advance();
      return path;
    },
    /** Current action name (for tests and status lines). */
    get action() { return action; },
    /** The single still for reduced motion: the first idle frame, else the first frame of the first action. */
    still() { return idle[0] || (others.length ? have[others[0]][0] : null); },
    get empty() { return !action; },
  };
}

/** Preload one path with Image(); resolves to the path on load and to null on error (never throws). */
export function preload(path, ImageCtor = globalThis.Image) {
  return new Promise((resolve) => {
    if (typeof ImageCtor !== 'function') { resolve(null); return; }
    const img = new ImageCtor();
    img.onload = () => resolve(path);
    img.onerror = () => resolve(null);
    img.src = path;
  });
}

/** Preload every frame; keeps only the ones that loaded, in order. */
export async function loadFrames(paths, ImageCtor) {
  const out = {};
  for (const [action, list] of Object.entries(paths)) {
    const got = await Promise.all(list.map((p) => preload(p, ImageCtor)));
    out[action] = got.filter(Boolean);
  }
  return out;
}

/**
 * Mount Rimon into `root`. Returns { ready, destroy, element } where `ready` resolves once the frames are known.
 * @param {HTMLElement} root
 * @param {{fps?:number, actions?:Record<string,number>, base?:string, reduceMotion?:boolean, random?:()=>number, label?:string}} [opt]
 */
export function mountMascot(root, opt = {}) {
  const fps = Math.max(1, Math.min(24, Number(opt.fps) || 6));
  const paths = framePaths(opt.actions || DEFAULT_ACTIONS, opt.base || FRAMES_BASE);
  const reduce = typeof opt.reduceMotion === 'boolean' ? opt.reduceMotion
    : (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  let timer = 0, img = null, alive = true;

  const ready = loadFrames(paths).then((frames) => {
    if (!alive) return false;
    const sched = createScheduler(frames, { idleHold: fps * 2, random: opt.random || Math.random });
    if (sched.empty) return false;
    img = document.createElement('img');
    img.className = 'alef-mascot';
    img.alt = opt.label || 'Rimon, the pomegranate mascot';
    img.width = 256; img.height = 256;
    img.decoding = 'async';
    img.src = reduce ? sched.still() : sched.next();
    root.append(img);
    if (!reduce) timer = setInterval(() => { const p = sched.next(); if (p && img.getAttribute('src') !== p) img.src = p; }, Math.round(1000 / fps));
    return true;
  });

  return {
    ready,
    get element() { return img; },
    destroy() { alive = false; if (timer) clearInterval(timer); timer = 0; if (img) img.remove(); img = null; },
  };
}
