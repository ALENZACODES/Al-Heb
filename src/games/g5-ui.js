// Holiday, Shabbat and prayer games (g5-*): the arcade mount for this lane plus a few DOM helpers.
// Every g5 game is an arcade game (src/games/arcade.js): five levels, HUD, best-score saver, badges, daily challenge.
// The tg helpers (host with Rimon, Ari and Noa; round tracking; grading; number keys) are reused as they are.
import { createArcade } from './arcade.js';
import { G5_GAMES } from './g5-catalog.js';
import { nextIn, showName, clean } from './g5-core.js';
export { host, track, grade, draftNote, numberKeys, roundKeys, orderBoard } from './tg-ui.js';
import { ensureStyle as tgStyle } from './tg-ui.js';

/**
 * mountArcade for this lane: the same shell, and the results card's "Next" link points at the next holiday game
 * (the shared hand-off only knows the main arcade list).
 */
export function mountG5(spec, setup) {
  return async function mount(root, ctx) {
    const A = await createArcade(root, ctx, { needsWords: false, needsLetters: false, ...spec });
    if (!A) return () => {};
    const finish = A.finish;
    A.finish = (...args) => {
      const out = finish(...args);
      const next = nextIn(G5_GAMES, spec.id);
      const link = [...(root.querySelectorAll?.('a') || [])].find((a) => /^Next: /.test(a.textContent || ''));
      if (link && next) { link.setAttribute('href', '#/' + next.id); link.textContent = `Next: ${next.title}`; }
      return out;
    };
    A.onRound((a) => { ensureStyle(); setup(a); });
    return () => A.destroy();
  };
}

/** Hebrew text, lang and dir set, divine name shown as ה׳, trailing sof pasuq dropped. */
export function heText(A, text, cls = 'he') {
  return A.h('span', { lang: 'he', dir: 'rtl', class: cls }, clean(showName(text)));
}
/** A card body: Hebrew on top, then optional small English lines. */
export function card(A, he, ...small) {
  return A.h('span', { class: 'g5-card' }, he ? heText(A, he, 'he g5-he') : null, ...small.filter(Boolean).map((s) => A.h('small', {}, s)));
}
/** A button whose handler gets the button itself (no reliance on event.currentTarget). Ignored once disabled. */
export function button(A, content, onPress, cls = 'arc-choice g5-word', attrs = {}) {
  const b = A.h('button', { type: 'button', class: cls, ...attrs }, content);
  b.addEventListener('click', () => { if (!b.disabled) onPress(b); });
  return b;
}
/** Disable every button inside an element. */
export function lock(el) { for (const b of el?.querySelectorAll?.('button') || []) b.disabled = true; }
/** Mark a button right or wrong in words as well as colour, and lock it. */
export function mark(btn, ok, label = ok ? 'right' : 'not this one') {
  if (!btn) return;
  btn.classList?.add(ok ? 'is-good' : 'is-bad');
  btn.setAttribute?.('aria-label', `${btn.textContent || ''} (${label})`);
  const tag = globalThis.document?.createElement?.('span');
  if (tag) { tag.className = 'g5-tag'; tag.textContent = ok ? ' ✓ right' : ' ✗ not this'; btn.append?.(tag); }
  btn.disabled = true;
}

/** Tiny style block for the g5 games, added once (plus the tg one). Reduced motion: nothing here animates unless allowed. */
export function ensureStyle() {
  tgStyle();
  const d = globalThis.document;
  if (!d?.head || d.getElementById?.('g5-style')) return;
  const s = d.createElement('style');
  s.id = 'g5-style';
  s.textContent = `
.g5-card{display:flex;flex-direction:column;align-items:center;gap:.1rem}
.g5-card small{font-size:.78rem;opacity:.85}
.g5-he{font-size:1.3rem}
.g5-big{font-size:2rem;text-align:center;min-block-size:3rem;margin:.4rem 0}
.g5-tag{font-size:.75rem;font-weight:700}
.g5-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(7.5rem,1fr));gap:.45rem;margin:.5rem 0}
.g5-row{display:flex;flex-wrap:wrap;gap:.4rem;justify-content:center;margin:.4rem 0}
.g5-beats{font-family:monospace;letter-spacing:.05rem;white-space:pre-wrap;text-align:center;margin:.2rem 0}
.g5-beats.is-on{font-weight:700;outline:2px solid currentColor;border-radius:.4rem}
.g5-plate{display:grid;grid-template-columns:repeat(3,1fr);gap:.4rem;max-inline-size:26rem;margin:.6rem auto;padding:.6rem;border:3px solid currentColor;border-radius:50%;aspect-ratio:1}
.g5-plate button{border-radius:50%;min-block-size:4.2rem}
.g5-slot-empty{opacity:.75;border-style:dashed}
.g5-line{display:flex;flex-wrap:wrap;gap:.35rem;justify-content:center;direction:rtl;margin:.6rem 0}
.g5-line button{font-size:1.25rem;min-inline-size:3rem}
.g5-line button[aria-pressed="true"]{outline:3px solid currentColor;outline-offset:2px}
.g5-line button.is-home{border-style:double;border-width:3px}
.g5-scroll{display:flex;gap:.25rem;justify-content:center;flex-wrap:wrap;margin:.5rem 0}
.g5-scroll span{padding:.2rem .4rem;border:1px solid currentColor;border-radius:.4rem;font-size:.8rem}
.g5-scroll span.is-here{font-weight:700;border-width:3px}
.g5-meter{block-size:.5rem;border:1px solid currentColor;border-radius:.3rem;overflow:hidden;margin:.3rem 0}
.g5-meter>span{display:block;block-size:100%;background:currentColor;opacity:.5}
.g5-sky{display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;min-block-size:12rem;margin:.5rem 0}
.g5-sky button{min-block-size:4.5rem;border-radius:50%}
.g5-sky .g5-empty{visibility:hidden}
.g5-links{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin:.5rem 0}
.g5-links>div{display:flex;flex-direction:column;gap:.35rem}
.g5-links button[aria-pressed="true"]{outline:3px solid currentColor;outline-offset:2px}
.g5-lanes{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}
.g5-lanes ol{min-block-size:3rem;border:1px dashed currentColor;border-radius:.5rem;padding:.4rem .4rem .4rem 1.6rem;margin:0}
.g5-step{display:flex;gap:.4rem;align-items:center}
.g5-count{font-size:1.4rem;min-inline-size:2.4rem;text-align:center;font-weight:700}
@media (prefers-reduced-motion: no-preference){.g5-sky button:not(.g5-empty){transition:transform .2s}.g5-beats.is-on{transition:outline-color .15s}}`;
  d.head.append(s);
}
