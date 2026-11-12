// Everyday Israel games (g4-*): DOM helpers on top of the arcade contract (src/games/arcade.js) and the tg helpers.
// Every g4 game is an arcade game: five levels, HUD, best-score saver, badges and the daily challenge come from there.
import { playRecordedClip } from './engine.js';
import { isAudioFree } from '../shell/audiofree.js';
import { host, track, roundKeys, numberKeys, grade, draftNote, ensureStyle as tgStyle } from './tg-ui.js';
import { loadBank, stripPoints, showName } from './g4-core.js';
import { G4_GAMES } from './g4-catalog.js';

export { host, track, roundKeys, numberKeys, grade, draftNote };

/** Hebrew line for an item: the Hebrew (unpointed when plain), then optional transliteration and English in small type. */
export function heItem(A, item, { tr = false, en = false, plain = false, cls = 'g4-he' } = {}) {
  return A.h('span', { class: 'g4-item' },
    A.h('span', { lang: 'he', dir: 'rtl', class: cls }, showName(plain ? stripPoints(item.he) : item.he)),
    tr && item.tr ? A.h('small', { class: 'g4-tr', lang: 'en' }, item.tr) : null,
    en ? A.h('small', { class: 'g4-en', lang: 'en' }, item.en) : null);
}
/** Plain Hebrew span. */
export const heText = (A, text, { plain = false, cls = 'g4-he' } = {}) => A.h('span', { lang: 'he', dir: 'rtl', class: cls }, showName(plain ? stripPoints(text) : text));
/** English span (inside buttons that the arcade marks lang=he). */
export const enText = (A, text) => A.h('span', { lang: 'en', dir: 'ltr' }, text);

/** The item's recorded clip, if one exists (ctx.audio plays files only; nothing is synthesised). Text stays on screen. */
export function say(A, item) {
  if (!item?.clip || isAudioFree(A.ctx)) return;
  try { playRecordedClip(A.ctx, item.clip.kind, item.clip.id, { text: item.he })?.catch?.(() => {}); } catch { /* sound is optional */ }
}

/** The g4 game after this one, for the results hand-off. */
export function nextG4(id) {
  const i = G4_GAMES.findIndex((g) => g.id === id);
  return G4_GAMES[(i + 1) % G4_GAMES.length] || null;
}

/**
 * Round start for every g4 game: style, round bookkeeping (tg track) and the results card's "Next" link pointed at the
 * next Everyday Israel game instead of the main arcade list.
 */
export function begin(A) {
  tgStyle(); ensureStyle();
  if (!A.__g4) {
    A.__g4 = true;
    const finish = A.finish;
    A.finish = (...args) => {
      const out = finish(...args);
      try {
        const next = nextG4(A.spec.id);
        const card = A.board.parentNode?.querySelector?.('.arc-results-card');
        const link = card ? [...card.querySelectorAll('a')].find((a) => /^Next:/.test(a.textContent)) : null;
        if (link && next) { link.setAttribute('href', `#/${next.id}`); link.textContent = `Next: ${next.title}`; }
      } catch { /* the link is a convenience */ }
      return out;
    };
  }
  return track(A);
}

/** Load the bank (and any other files), then run fn while the round is live. */
export function withBank(A, T, fn, ...more) {
  Promise.all([loadBank(A.ctx), ...more.map((f) => f(A.ctx))]).then((all) => { if (T.live()) fn(...all); })
    .catch((e) => { console.warn(A.spec.id, e); A.announce('The game words did not load. Check the connection and press Start again.'); });
}

/** A step every ms; holds during the get-ready count and while paused; stops when step returns false or the round ends. */
export function ticker(A, T, ms, step) {
  const go = () => T.later(ms, () => { if (A.paused || Date.now() < A.readyAt) { go(); return; } if (step() !== false) go(); });
  go();
}

/** Buttons in a group; onPick(opt, button) returns true when right. Wrong buttons lock; a right one locks the row. */
export function buttons(A, opts, render, onPick, { label = 'Choices', cls = 'arc-choice' } = {}) {
  const row = A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': label });
  for (const opt of opts) {
    const b = A.h('button', { type: 'button', class: cls }, render(opt));
    b.addEventListener('click', () => {
      if (b.disabled) return;
      const ok = onPick(opt, b);
      if (ok === null || ok === undefined) return;
      b.classList.add(ok ? 'is-good' : 'is-bad');
      b.append(A.h('span', { class: 'visually-hidden' }, ok ? ' (right)' : ' (not this one)'));
      if (ok) for (const x of row.querySelectorAll('button')) x.disabled = true; else b.disabled = true;
    });
    row.append(b);
  }
  return row;
}

/** Style for the g4 games, added once. Nothing animates when the learner asked for reduced motion. */
export function ensureStyle() {
  const d = globalThis.document;
  if (!d?.head || d.getElementById?.('g4-style')) return;
  const s = d.createElement('style');
  s.id = 'g4-style';
  s.textContent = `
.g4-item{display:inline-flex;flex-direction:column;align-items:center;gap:.05rem}
.g4-he{font-size:1.25rem}.g4-big{font-size:1.9rem}
.g4-tr,.g4-en{font-size:.75rem;opacity:.85}
.g4-scene{border:2px solid currentColor;border-radius:.8rem;padding:.6rem .8rem;margin:.5rem 0}
.g4-scene p{margin:.2rem 0}
.g4-wall{display:grid;grid-template-columns:repeat(auto-fit,minmax(7.5rem,1fr));gap:.5rem;margin:.5rem 0}
.g4-sign{font:inherit;color:#fff;background:#1f5130;border:3px solid #e8d48b;border-radius:.4rem;padding:.6rem .4rem;min-block-size:3.6rem;cursor:pointer}
.g4-sign.blue{background:#164a7a}.g4-sign.red{background:#8b2020}.g4-sign.brown{background:#6b4a22}
.g4-sign .g4-he{font-size:1.35rem;font-weight:700}
.g4-sign.is-good{outline:4px solid #e8d48b}.g4-sign.is-bad{opacity:.55}
.g4-board{inline-size:100%;border-collapse:collapse;margin:.5rem 0;font-variant-numeric:tabular-nums}
.g4-board th,.g4-board td{border-block-end:1px solid currentColor;padding:.3rem .4rem;text-align:start}
.g4-dark{background:#111;color:#f6c94c;border-radius:.6rem;padding:.4rem}
.g4-clock{position:relative;inline-size:12rem;block-size:12rem;border:4px solid currentColor;border-radius:50%;margin:.5rem auto}
.g4-clock .g4-n{position:absolute;inline-size:1.6rem;text-align:center;font-weight:700;transform:translate(-50%,-50%)}
.g4-hand{position:absolute;left:50%;bottom:50%;transform-origin:50% 100%;background:currentColor;border-radius:.2rem}
.g4-hand.h{inline-size:.45rem;block-size:3.2rem;margin-left:-.225rem}.g4-hand.m{inline-size:.25rem;block-size:4.8rem;margin-left:-.125rem;opacity:.75}
.g4-tray{display:flex;flex-wrap:wrap;gap:.35rem;justify-content:center;margin:.4rem 0;min-block-size:2.4rem}
.g4-coin{font:inherit;border-radius:50%;inline-size:3rem;block-size:3rem;border:2px solid currentColor;background:#e9d9a6;color:#222;cursor:pointer}
.g4-note{font:inherit;border-radius:.3rem;min-inline-size:4.2rem;block-size:2.6rem;border:2px solid currentColor;background:#cfe3d0;color:#222;cursor:pointer}
.g4-meter{display:flex;gap:.2rem;align-items:center;margin:.3rem 0}
.g4-meter span{inline-size:1rem;block-size:1rem;border:1px solid currentColor;border-radius:.2rem}
.g4-meter span.on{background:currentColor}
.g4-grid{display:grid;gap:.2rem;margin:.5rem auto;inline-size:max-content}
.g4-cell{inline-size:3rem;block-size:3rem;display:grid;place-items:center;border:1px solid currentColor;border-radius:.3rem;font-size:.7rem;text-align:center}
.g4-cell.me{background:#e8d48b;color:#222;font-size:1.3rem}.g4-cell.goal{outline:3px solid currentColor}
.g4-route{list-style:none;padding:0;display:flex;flex-wrap:wrap;gap:.3rem;margin:.3rem 0}
.g4-route li{border:1px solid currentColor;border-radius:.5rem;padding:.15rem .4rem}
.g4-week{display:grid;grid-template-columns:repeat(7,minmax(4.5rem,1fr));gap:.25rem;margin:.5rem 0;overflow-x:auto}
.g4-day{font:inherit;color:inherit;background:none;border:1px solid currentColor;border-radius:.4rem;padding:.3rem .2rem;min-block-size:5rem;display:flex;flex-direction:column;gap:.15rem;align-items:center;cursor:pointer}
.g4-day small{font-size:.7rem}
.g4-chips{display:flex;flex-wrap:wrap;gap:.3rem;justify-content:center}
.g4-chip{border:1px solid currentColor;border-radius:1rem;padding:.1rem .55rem;font-size:.9rem}
.g4-pita{border:2px dashed currentColor;border-radius:2rem;min-block-size:3rem;padding:.4rem;display:flex;flex-wrap:wrap;gap:.3rem;justify-content:center;align-items:center}
.g4-pillbox{display:grid;grid-template-columns:repeat(4,1fr);gap:.3rem;margin:.4rem 0}
.g4-slot{font:inherit;color:inherit;background:none;border:2px solid currentColor;border-radius:.5rem;min-block-size:3.2rem;cursor:pointer}
.g4-slot.on{background:#e8d48b;color:#222}
.g4-ok{font-weight:700}.g4-no{font-weight:700;text-decoration:underline}
@media (prefers-reduced-motion:no-preference){.g4-sign,.g4-coin,.g4-note{transition:transform .12s}.g4-sign:active,.g4-coin:active,.g4-note:active{transform:scale(.96)}}`;
  d.head.append(s);
}
