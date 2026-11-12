// Torah and Hebrew games (tg-*): small DOM helpers on top of the arcade contract (src/games/arcade.js).
// Every tg game is an arcade game: five levels, the HUD, best-score saver, badges and the daily challenge come from there.
import { showName } from './tg-core.js';

/** Hebrew text node, lang and dir set, with the divine name shown as ה׳. */
export function he(A, text, cls = 'he') {
  return A.h('span', { lang: 'he', dir: 'rtl', class: cls }, showName(text));
}

/** The cast picture plus a short line. who: rimon, ari or noa (existing art in assets/games/arcade/cast). */
const CAST = { rimon: ['rimon-face', 'Rimon'], ari: ['ari-host', 'Ari'], noa: ['noa-hint', 'Noa'] };
export function host(A, who, line) {
  const [art, name] = CAST[who] || CAST.rimon;
  return A.h('div', { class: 'arc-host tg-host' }, A.cast(art, name, 'arc-sprite-inline'), A.h('p', { class: 'arc-prompt' }, A.h('strong', {}, name + ': '), line));
}

/**
 * Round bookkeeping. Timers set by a round stop when the round ends (the clock running out included),
 * so nothing changes on the board after the results card appears.
 */
export function track(A) {
  if (!A.__tg) {
    A.__tg = { gen: 0, over: false, offs: [] };
    const finish = A.finish;
    A.finish = (...args) => { A.__tg.over = true; return finish(...args); };
  }
  A.__tg.gen += 1; A.__tg.over = false;
  for (const off of A.__tg.offs.splice(0)) off(); // last round's key handlers go with it
  const gen = A.__tg.gen;
  const live = () => !A.__tg.over && A.__tg.gen === gen;
  return {
    live,
    later(ms, fn) { setTimeout(() => { if (live()) fn(); }, ms); },
    end(opts) { if (live()) A.finish(opts); },
  };
}

/** A key handler for this round only (see track). */
export function roundKeys(A, fn) {
  const off = A.keys(fn);
  if (A.__tg) A.__tg.offs.push(off);
  return off;
}

/** Number keys 1 to 9 press the matching enabled button inside the element the getter returns. */
export function numberKeys(A, getEl) {
  roundKeys(A, (k) => {
    if (!/^[1-9]$/.test(k)) return false;
    const el = getEl();
    const buttons = el ? [...el.querySelectorAll('button')].filter((b) => !b.disabled) : [];
    const b = buttons[Number(k) - 1];
    if (!b) return false;
    b.click();
    return true;
  });
}

/** One right or wrong answer, scored the same way in every tg game. */
export function grade(A, ok, { right = '', wrong = '', points = 10 } = {}) {
  if (ok) { A.addScore(points); A.sfx('success'); if (right) A.announce(right); }
  else { A.addScore(-3); A.sfx('miss'); if (wrong) A.announce(wrong); A.miss(); }
  return ok;
}

/** A short draft line under the board. */
export const draftNote = (A, text) => A.h('p', { class: 'muted arc-foot tg-note' }, text);

/**
 * Tap-in-order board: items shuffled into a tray; tapping the next one in order moves it to the line.
 * render(item, placed) returns the button content. onDone() runs when all are placed.
 */
export function orderBoard(A, items, { render, label = 'Tap them in order', onRight, onWrong, onDone, rnd = Math.random, shuffleFn }) {
  const line = A.h('ol', { class: 'tg-line', 'aria-label': 'Your order so far' });
  const tray = A.h('div', { class: 'arc-choices tg-tray', role: 'group', 'aria-label': label });
  const loose = shuffleFn ? shuffleFn(items, rnd) : [...items];
  let next = 0;
  const draw = () => tray.replaceChildren(...loose.map((item) => A.h('button', { type: 'button', class: 'arc-choice tg-card', onclick: () => tap(item) }, render(item, false))));
  const tap = (item) => {
    if (item === items[next]) {
      next += 1; loose.splice(loose.indexOf(item), 1);
      line.append(A.h('li', { class: 'tg-placed' }, render(item, true)));
      onRight?.(item, next); draw();
      if (next === items.length) onDone?.();
    } else onWrong?.(item, items[next], next);
  };
  draw();
  return A.h('div', { class: 'tg-order' }, line, tray);
}

/** Tiny style block for the tg games, added once. Reduced motion: nothing here animates. */
export function ensureStyle() {
  const d = globalThis.document;
  if (!d?.head || d.getElementById?.('tg-style')) return;
  const s = d.createElement('style');
  s.id = 'tg-style';
  s.textContent = `
.tg-verse{font-size:1.5rem;line-height:2.1;text-align:center;margin:.5rem 0}
.tg-verse .tg-word{display:inline-block;margin:.1rem .2rem;padding:.1rem .35rem;border-radius:.5rem;border:1px solid transparent;font:inherit;background:none;color:inherit;cursor:pointer}
.tg-verse button.tg-word:focus-visible,.tg-verse button.tg-let:focus-visible{outline:3px solid currentColor;outline-offset:2px}
.tg-verse .tg-word.is-good,.tg-let.is-good{background:var(--good,#cfeedd);border-color:currentColor}
.tg-verse .tg-word.is-bad,.tg-let.is-bad{background:var(--bad,#f6d3d3)}
.tg-let{font:inherit;background:none;border:1px solid transparent;border-radius:.4rem;padding:0 .05rem;margin:0;color:inherit;cursor:pointer;min-inline-size:1.6rem}
.tg-group{display:inline-block;margin-inline:.35rem;white-space:nowrap}
.tg-line{display:flex;flex-wrap:wrap;gap:.4rem;padding:0;margin:.4rem 0;list-style:none;counter-reset:tg}
.tg-line li{counter-increment:tg;border:1px solid currentColor;border-radius:.6rem;padding:.25rem .5rem}
.tg-line li::before{content:counter(tg) ". ";font-weight:700}
.tg-card small,.tg-placed small{display:block;font-size:.75rem;opacity:.85}
.tg-rows{display:grid;gap:.3rem;justify-content:center;margin:.5rem 0}
.tg-row{display:flex;gap:.3rem;direction:rtl}
.tg-tile{inline-size:2.6rem;block-size:2.6rem;display:grid;place-items:center;border:2px solid currentColor;border-radius:.4rem;font-size:1.4rem;position:relative}
.tg-tile.hit{background:var(--good,#cfeedd)}.tg-tile.near{background:#fbe7b5}.tg-tile.miss{opacity:.6}
.tg-tile .tg-sym{position:absolute;inset-block-start:0;inset-inline-end:.15rem;font-size:.65rem}
.tg-keys{display:flex;flex-wrap:wrap;gap:.25rem;justify-content:center;direction:rtl;margin:.4rem 0}
.tg-keys button{min-inline-size:2.2rem;min-block-size:2.4rem;font-size:1.15rem}
.tg-keys button.hit{background:var(--good,#cfeedd)}.tg-keys button.near{background:#fbe7b5}.tg-keys button.miss{opacity:.5}
.tg-bins{display:grid;grid-template-columns:repeat(auto-fit,minmax(8rem,1fr));gap:.4rem;margin:.5rem 0}
.tg-flash{font-size:2.6rem;min-block-size:3.6rem;text-align:center;letter-spacing:.4rem}
.tg-note{font-size:.8rem}`;
  d.head.append(s);
}
