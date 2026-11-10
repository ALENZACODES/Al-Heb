// @ts-check
// Tiny DOM helper for the retention screens. No inline scripts or handlers in markup (CSP script-src 'self'):
// listeners are attached with addEventListener.
/** @param {string} tag @param {Record<string, any>} [attrs] @param {...any} kids */
export function h(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'class') n.className = v;
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
}
export const reducedMotion = (g = globalThis) => { try { return !!g.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || g.document?.documentElement?.hasAttribute('data-calm'); } catch { return false; } };
/** Count a number up over `ms` (final value at once under reduced motion or calm mode). Returns a cancel function. */
export function countUp(node, from, to, ms = 600, g = globalThis) {
  if (reducedMotion(g) || from === to || typeof g.requestAnimationFrame !== 'function') { node.textContent = String(to); return () => {}; }
  let raf = 0, t0 = 0, done = false;
  const step = (t) => { if (done) return; t0 = t0 || t; const f = Math.min(1, (t - t0) / ms); node.textContent = String(Math.round(from + (to - from) * f)); if (f < 1) raf = g.requestAnimationFrame(step); };
  raf = g.requestAnimationFrame(step);
  return () => { done = true; try { g.cancelAnimationFrame(raf); } catch { /* ignore */ } node.textContent = String(to); };
}
/** Confetti pieces (CSS animation; hidden under reduced motion and calm mode by retention.css). Decorative. */
export const confetti = (n = 24) => h('div', { class: 'ret-confetti', 'aria-hidden': 'true' }, ...Array.from({ length: n }, (_, i) => h('i', { style: `--i:${i};--x:${(i * 37) % 100}` })));
