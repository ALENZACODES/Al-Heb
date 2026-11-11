// More life for Rimon (styles: assets/css/rimon-motion.css).
//
// The companion (src/shell/rimon.js) already plays a 12-drawing move for each reaction and blinks while it waits. This adds body
// movement on top, so Rimon is never a frozen picture:
//   - a hop in when a new screen opens, and a small pop whenever Rimon changes clothes (a new still);
//   - a short fidget every few seconds while waiting (a hop, a wiggle, a nod, a twirl, a lean, a duck-and-pop);
//   - now and then a move of Rimon's own (a wave, a wink, a bounce, a laugh);
//   - a happy reaction when the learner taps or points at Rimon.
// The sway while idle and the movement that goes with each reaction are plain CSS, keyed off the data-action the companion sets.
//
// Decoration only: nothing here reads or changes scores, streaks or saved progress, and every failure is silent. Rimon keeps
// still under reduced motion and calm mode, while hidden, on quiet days and screens, while ducked behind the phone's bottom bar,
// and from Friday evening to Saturday night, when only the gentle sway stays.

/** Fidgets and how long each lasts (ms). The class on the companion is `rimon-fx-<name>`. */
export const FIDGETS = Object.freeze({ hop: 640, wiggle: 1100, nod: 1100, twirl: 860, lean: 980, peekaboo: 1100 });
/** One-off moves that are not part of the idle rotation. */
export const MOVES = Object.freeze({ enter: 600, pop: 440, boing: 540 });
/** While waiting, a fidget every FIDGET_MIN_MS .. FIDGET_MIN_MS + FIDGET_SPAN_MS. */
export const FIDGET_MIN_MS = 5500, FIDGET_SPAN_MS = 5500;
/** Every OWN_MOVE_EVERY-th idle beat is one of Rimon's drawn moves instead of a fidget. */
export const OWN_MOVE_EVERY = 3;
export const OWN_MOVES = Object.freeze(['wave', 'wink', 'bounce', 'laugh']);
/** What a tap on Rimon can set off. */
export const TAP_MOVES = Object.freeze(['laugh', 'bounce', 'wink', 'highfive']);
const ALL_FX = [...Object.keys(FIDGETS), ...Object.keys(MOVES)].map((n) => `rimon-fx-${n}`);

/** Friday 18:00 to Saturday 21:00 local time: the same quiet window the big moments keep (src/shell/rimon-stills.js). */
export function isShabbatQuiet(date = new Date()) {
  const d = date.getDay(), hr = date.getHours();
  return (d === 5 && hr >= 18) || (d === 6 && hr < 21);
}

/** A fidget name, never the same one twice in a row. Pure: random is injectable. */
export function pickFidget(random = Math.random, avoid = '') {
  const names = Object.keys(FIDGETS).filter((n) => n !== avoid);
  const r = Math.min(Math.max(Number(random()) || 0, 0), 0.999999);
  return names[Math.floor(r * names.length)];
}

/**
 * @param {{companion:{element:any, play?:Function, pageStill?:any}|null, doc?:Document, win?:any, random?:()=>number,
 *          now?:()=>number, date?:()=>Date, tickMs?:number}} opt
 */
export function mountRimonMotion({ companion = null, doc = globalThis.document, win = doc?.defaultView || globalThis, random = Math.random, now = () => Date.now(), date = () => new Date(), tickMs = 500 } = {}) {
  const host = companion?.element;
  if (!host?.classList || !doc) return null;
  const media = (() => { try { return win?.matchMedia?.('(prefers-reduced-motion: reduce)') || null; } catch { return null; } })();
  let alive = true, fxTimer = 0, enterTimer = 0, last = '', beats = 0, lastTap = 0, lastStill = '';
  let nextAt = now() + FIDGET_MIN_MS + random() * FIDGET_SPAN_MS;

  const still = () => { try { return host.querySelector?.('.rimon-still') || null; } catch { return null; } };
  const calm = () => { try { return !!doc.documentElement?.hasAttribute?.('data-calm'); } catch { return false; } };
  /** True when a movement would be seen and is welcome. */
  function canMove() {
    if (!alive || host.hidden || doc.hidden) return false;
    if (media?.matches || calm() || host.classList.contains('rimon-static')) return false;
    if (host.classList.contains('rimon-peek') || host.classList.contains('rimon-yield')) return false;
    try { if (doc.body?.dataset?.rimonQuiet) return false; } catch { /* no body */ }
    return true;
  }
  const idle = () => { const a = host.dataset?.action; return !a || a === 'idle'; };
  function clearFx() { clearTimeout(fxTimer); fxTimer = 0; host.classList.remove(...ALL_FX); }
  /** Play one movement class for its length. Returns false when Rimon should keep still. */
  function fx(name) {
    const ms = FIDGETS[name] ?? MOVES[name];
    if (!ms || !canMove()) return false;
    clearFx();
    void host.offsetWidth; // restart the CSS animation when the same movement comes twice
    host.classList.add(`rimon-fx-${name}`);
    fxTimer = setTimeout(() => { fxTimer = 0; host.classList.remove(`rimon-fx-${name}`); }, ms);
    return true;
  }
  function plan(from = now()) { nextAt = from + FIDGET_MIN_MS + random() * FIDGET_SPAN_MS; }

  /** One idle beat: a fidget, or every few beats one of Rimon's own drawn moves. */
  function beat() {
    if (!canMove() || !idle() || fxTimer) return false;
    if (isShabbatQuiet(date())) return false; // the sway stays; nothing jumps
    beats++;
    if (beats % OWN_MOVE_EVERY === 0 && typeof companion.play === 'function') {
      const move = OWN_MOVES[Math.floor(Math.min(Math.max(Number(random()) || 0, 0), 0.999999) * OWN_MOVES.length)];
      try { companion.play(move); } catch { /* a move is optional */ }
      return move;
    }
    last = pickFidget(random, last);
    return fx(last) ? last : false;
  }
  function tick() {
    if (!alive) return;
    // a new still (Rimon dressed for the screen, or a pose) arrives with a small pop
    const s = still(), src = s && !s.hidden ? (s.getAttribute?.('src') || '') : '';
    if (src !== lastStill) { lastStill = src; if (src) fx('pop'); }
    const t = now();
    if (t < nextAt) return;
    plan(t);
    beat();
  }
  const timer = setInterval(tick, tickMs);

  const onReady = () => {
    // a new screen: forget the old movement, hop in once the companion has taken its place, and wait a while before fidgeting
    clearFx(); clearTimeout(enterTimer); plan();
    enterTimer = setTimeout(() => { fx('enter'); }, 60);
  };
  const onReaction = () => { clearFx(); plan(); }; // a reaction has its own movement (CSS): do not fidget over it
  const onTap = (e) => {
    const t = e?.target;
    if (t?.closest?.('.rimon-dismiss, .rimon-next') || host.classList.contains('rimon-peek')) return;
    const at = now();
    if (at - lastTap < 900) return;
    lastTap = at;
    if (!canMove()) return;
    fx('boing'); plan(at);
    if (idle() && typeof companion.play === 'function') {
      const move = TAP_MOVES[Math.floor(Math.min(Math.max(Number(random()) || 0, 0), 0.999999) * TAP_MOVES.length)];
      try { companion.play(move); } catch { /* a move is optional */ }
    }
  };
  const onHover = (e) => {
    if (e?.pointerType && e.pointerType !== 'mouse') return; // touch has the tap
    const at = now();
    if (at - lastTap < 2500 || !idle()) return;
    lastTap = at;
    if (fx('boing')) plan(at);
  };
  doc.addEventListener?.('alef:ready', onReady);
  doc.addEventListener?.('alef:rimon', onReaction);
  host.addEventListener?.('click', onTap);
  host.addEventListener?.('pointerenter', onHover);
  // The movement stylesheet is not part of the first install: it is fetched here, once. Without it the classes do nothing.
  try {
    if (doc.head && !doc.querySelector?.('link[data-rimon-motion]')) {
      const css = doc.createElement('link'); css.rel = 'stylesheet'; css.setAttribute('data-rimon-motion', '');
      css.href = new URL('../../assets/css/rimon-motion.css', import.meta.url).href;
      doc.head.append(css);
    }
  } catch { /* the movement is optional */ }
  host.classList.add('rimon-lively');

  return {
    fx, beat, canMove, stop: clearFx,
    _test: { tick, get nextAt() { return nextAt; }, set nextAt(v) { nextAt = v; } },
    destroy() {
      alive = false;
      clearInterval(timer); clearTimeout(enterTimer); clearFx();
      host.classList.remove('rimon-lively');
      doc.removeEventListener?.('alef:ready', onReady);
      doc.removeEventListener?.('alef:rimon', onReaction);
      host.removeEventListener?.('click', onTap);
      host.removeEventListener?.('pointerenter', onHover);
    },
  };
}
