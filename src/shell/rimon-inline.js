// Rimon inside a page (welcome, plan, lesson finish), as opposed to the corner companion in rimon.js.
// Same twelve-frame sheets and the same timing (frameDuration), from the light web copies in assets/img/rimon/web/
// (960 x 720 WebP, 240 px frames, about 100 KB each instead of about 1 MB). He plays his action once, settles on
// his first frame, and blinks now and then while he is on the page. Reduced motion, calm pages and test DOMs get a still frame.
import { ACTIONS, FRAME_COUNT, frameDuration } from './rimon.js';
import { h } from './ui.js';

export const SHEET_DIR = '../../assets/img/rimon/web/';
/** URL of one action's sheet; unknown actions fall back to blink. */
export const sheetUrl = (action) => new URL(`${SHEET_DIR}${ACTIONS[action] ? action : 'blink'}.webp`, import.meta.url).href;
/** background-position of frame i on a 4 x 3 sheet (row-major), as background-size 400% 300% expects. */
export function framePos(i) {
  const f = ((Math.trunc(Number(i) || 0) % FRAME_COUNT) + FRAME_COUNT) % FRAME_COUNT;
  return `${+((f % 4) * 100 / 3).toFixed(4)}% ${Math.floor(f / 4) * 50}%`;
}

function stillWanted(doc) {
  try {
    const win = doc?.defaultView || globalThis;
    if (typeof win?.matchMedia !== 'function') return true; // not a real browser (tests): never start timers
    if (win.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    return !!doc?.documentElement?.hasAttribute?.('data-calm'); // calm mode (src/shell/comfort.js): one still picture
  } catch { return true; }
}

/**
 * @param {{action?:string, size?:number, loop?:boolean, idle?:string|null, label?:string, doc?:Document, still?:boolean}} [o]
 * @returns {{el:HTMLElement, play:(action?:string, opts?:{loop?:boolean})=>void, stop:()=>void}}
 */
export function rimonInline({ action = 'wave', size = 112, loop = false, idle = 'blink', label = 'Rimon', doc = globalThis.document, still } = {}) {
  const el = h('span', { class: 'rimon-inline', role: 'img', 'aria-label': label, 'data-action': action, 'data-frame': '0', style: `--rimon-size:${size}px` });
  const isStill = () => (still ?? stillWanted(doc));
  let timer = 0, cur = action, frame = 0, stopped = false;
  const show = (a, f) => {
    el.setAttribute('data-action', a); el.setAttribute('data-frame', String(f));
    el.setAttribute('style', `--rimon-size:${size}px;background-image:url("${sheetUrl(a)}");background-position:${framePos(f)}`);
  };
  const gone = () => stopped || el.isConnected !== true;
  const idleLater = () => {
    if (!idle) return;
    timer = setTimeout(() => { if (!gone()) play(idle, { loop: false }); }, 3500 + Math.random() * 3000);
  };
  function play(a = action, { loop: l = loop } = {}) {
    clearTimeout(timer); cur = ACTIONS[a] ? a : 'blink'; frame = 0; show(cur, 0);
    if (isStill()) return;
    const step = () => {
      if (gone()) return;
      frame += 1;
      if (frame >= FRAME_COUNT) { if (!l) { frame = 0; show(cur, 0); idleLater(); return; } frame = 0; }
      show(cur, frame);
      timer = setTimeout(step, frameDuration(cur, frame));
    };
    timer = setTimeout(step, frameDuration(cur, 0));
  }
  show(cur, 0);
  // A sheet that fails to load (offline before it was cached, a blocked file) must never leave an empty box: fall back to the
  // single Rimon picture, still, and stop the frame timer.
  const fallback = () => {
    stopped = true; clearTimeout(timer);
    el.setAttribute('data-fallback', '1');
    el.setAttribute('style', `--rimon-size:${size}px;background-image:url("${new URL('../../assets/img/gen/MASCOT_rimon.800.webp', import.meta.url).href}");background-size:contain;background-position:center`);
  };
  try { if (typeof globalThis.Image === 'function') { const probe = new globalThis.Image(); probe.onerror = fallback; probe.src = sheetUrl(cur); } } catch { /* no image loader: keep the sheet */ }
  // Start once he is on the page (the caller appends him right after this returns).
  if (!isStill()) setTimeout(() => { if (!gone()) play(action); }, 30);
  return { el, play, stop() { stopped = true; clearTimeout(timer); } };
}

/** Rimon with a speech bubble beside him. The bubble is visible text; pass ariaHidden when the same words are said elsewhere (a legend). */
export function rimonSays(text, { action = 'wave', size = 104, ariaHidden = false, id = null, doc } = {}) {
  const r = rimonInline({ action, size, label: 'Rimon the pomegranate', doc });
  const bubble = h('p', { class: 'rimon-say-bubble', id, 'aria-hidden': ariaHidden ? 'true' : null }, text);
  return { el: h('div', { class: 'rimon-say' }, r.el, bubble), rimon: r, bubble };
}
