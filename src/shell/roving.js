// Roving tab stop for a long group of buttons (the letter picker has 27): Tab enters the group once, the arrow keys move inside it, and Tab leaves it.
// This cuts the number of key presses for a person who uses a keyboard, a switch or voice-driven keys, where every press costs effort.
// Behaviour: the "current" button (aria-pressed="true", or aria-current, or the first) is the one tab stop; Left/Right/Up/Down, Home and End move focus;
// Enter and Space still press the focused button (the browser does that). Arrow keys follow the reading direction of the group.
/** @param {HTMLElement} group @param {{items?:string}} [opt] */
export function makeRoving(group, opt = {}) {
  const sel = opt.items || 'button';
  const items = () => [...group.querySelectorAll(sel)].filter((b) => !b.disabled && !b.hidden);
  const setStop = (target) => { for (const b of items()) b.setAttribute('tabindex', b === target ? '0' : '-1'); };
  const initial = () => { const all = items(); return all.find((b) => b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-current') === 'true' || b.getAttribute('aria-current') === 'page') || all[0]; };
  setStop(initial());
  group.addEventListener('focusin', (e) => { const b = e.target.closest?.(sel); if (b && group.contains(b)) setStop(b); });
  group.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const all = items(); const i = all.indexOf(e.target.closest?.(sel)); if (i < 0) return;
    const rtl = (group.closest('[dir]')?.getAttribute('dir') || document.documentElement.dir) === 'rtl' || getComputedStyle(group).direction === 'rtl';
    // buttons in the first visual row = the number of columns, for Up and Down
    const top0 = all[0].getBoundingClientRect().top; let cols = all.filter((b) => Math.abs(b.getBoundingClientRect().top - top0) < 4).length || 1;
    let n = i;
    switch (e.key) {
      case 'ArrowRight': n = rtl ? i - 1 : i + 1; break;
      case 'ArrowLeft': n = rtl ? i + 1 : i - 1; break;
      case 'ArrowDown': n = i + cols; break;
      case 'ArrowUp': n = i - cols; break;
      case 'Home': n = 0; break;
      case 'End': n = all.length - 1; break;
      default: return;
    }
    e.preventDefault();
    if (n < 0 || n >= all.length) return;
    setStop(all[n]); all[n].focus();
  });
  return { refresh: () => setStop(initial()) };
}
