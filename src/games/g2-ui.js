// Words by topic (g2-*): DOM helpers on top of the arcade contract (src/games/arcade.js) and the tg helpers (src/games/tg-ui.js).
// Every g2 game is an arcade game: five levels, the HUD, best-score saver, badges and the daily challenge come from there.
import { host, track as tgTrack, grade, numberKeys, roundKeys, draftNote, ensureStyle as tgStyle, orderBoard, he } from './tg-ui.js';
import { loadAll } from './g2-core.js';
import { G2_GAMES } from './g2-catalog.js';

export { host, grade, numberKeys, roundKeys, draftNote, orderBoard, he };

/** The next game in this lane (wraps), for the results card. */
export function nextG2(id) {
  const i = G2_GAMES.findIndex((g) => g.id === id);
  return i < 0 ? null : G2_GAMES[(i + 1) % G2_GAMES.length];
}
/** Point the results card's "Next" button at the next word game instead of the arcade list. */
function patchNext(A) {
  const next = nextG2(A.spec.id);
  const card = A.board?.parentNode?.querySelector?.('.arc-results-card');
  if (!next || !card) return;
  for (const a of card.querySelectorAll('a')) {
    if (!String(a.textContent).startsWith('Next:')) continue;
    a.setAttribute('href', '#/' + next.id);
    a.textContent = `Next: ${next.title}`;
  }
}
/** Round bookkeeping from tg-ui (timers stop at the results card), plus the lane's own next-game hand-off. */
export function track(A) {
  const T = tgTrack(A);
  if (!A.__g2) {
    A.__g2 = true;
    const finish = A.finish;
    A.finish = (...args) => { const r = finish(...args); try { patchNext(A); } catch { /* the link is optional */ } return r; };
  }
  return T;
}

/**
 * Standard round start: style, round tracking, the two data files, then go(D, T). A failed load says so on the status line.
 */
export function start(A, go) {
  ensureStyle();
  const T = track(A);
  loadAll(A.ctx).then((D) => { if (T.live()) go(D, T); })
    .catch((e) => { console.warn(A.spec.id, e); A.announce('The words did not load. Check the connection and press Start again.'); });
  return T;
}

/** A word as the learner sees it: the Hebrew, then (when asked) the transliteration and the English. */
export function word(A, w, { en = false, tr = false, cls = '' } = {}) {
  if (!w) return A.h('span', {}, '');
  return A.h('span', { class: ('g2-word ' + cls).trim() }, he(A, w.he, 'he g2-he'),
    tr && w.tr ? A.h('small', { class: 'g2-tr' }, w.tr) : null,
    en ? A.h('small', { class: 'g2-en' }, w.en) : null);
}
/** A topic's name: its Hebrew label word and its English title. */
export function topicName(A, D, id, { hebrew = true } = {}) {
  const t = D.topics[id];
  return A.h('span', { class: 'g2-topic' }, hebrew && t?.label ? he(A, t.label.he, 'he g2-he') : null, A.h('small', {}, t?.title || id));
}
/** Recorded word clip when the word list has one (never a made-up voice). */
export function say(A, w) { if (w?.w) A.sayWord({ id: w.w, he: w.he }).catch?.(() => {}); }

/** The lane's small style block, added once (with the tg one). Nothing here animates, so reduced motion needs no switch. */
export function ensureStyle() {
  tgStyle();
  const d = globalThis.document;
  if (!d?.head || d.getElementById?.('g2-style')) return;
  const s = d.createElement('style');
  s.id = 'g2-style';
  s.textContent = `
.g2-word{display:inline-flex;flex-direction:column;align-items:center;gap:.05rem}
.g2-word .g2-he{font-size:1.35em;line-height:1.3}
.g2-word small,.g2-topic small{display:block;font-size:.75rem;opacity:.85}
.g2-topic{display:inline-flex;flex-direction:column;align-items:center}
.g2-big{font-size:2.2rem;text-align:center;min-block-size:3rem;margin:.4rem 0}
.g2-row{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;margin:.5rem 0}
.g2-grid{display:grid;gap:.35rem;direction:rtl;justify-content:center;margin:.5rem auto}
.g2-grid button{min-inline-size:4.6rem;min-block-size:3.2rem;padding:.2rem}
.g2-grid button.is-on,.g2-row button.is-on,.g2-chip.is-on{outline:3px solid currentColor;outline-offset:1px;font-weight:700}
.g2-grid button.is-path{background:var(--good,#cfeedd)}
.g2-grid button.is-bad,.g2-row button.is-bad{background:var(--bad,#f6d3d3)}
.g2-fuse{block-size:.5rem;border:1px solid currentColor;border-radius:.3rem;margin:.3rem auto;max-inline-size:20rem}
.g2-fuse>span{display:block;block-size:100%;background:currentColor;opacity:.5}
.g2-figure{position:relative;inline-size:min(18rem,80vw);aspect-ratio:3/5;margin:.5rem auto;border:2px dashed currentColor;border-radius:45% 45% 10% 10%}
.g2-face{position:relative;inline-size:min(12rem,60vw);aspect-ratio:1;margin:.5rem auto;border:2px dashed currentColor;border-radius:50%}
.g2-dot{position:absolute;transform:translate(-50%,-50%);min-inline-size:2.4rem;min-block-size:2.4rem;border-radius:1.2rem;font-size:.8rem;padding:.1rem .3rem}
.g2-dot.is-mark{outline:4px solid currentColor}
.g2-swatch{display:inline-block;inline-size:1.4rem;block-size:1.4rem;border:1px solid currentColor;border-radius:.3rem;vertical-align:middle;margin-inline-end:.3rem}
.g2-tree{display:grid;grid-template-columns:repeat(4,minmax(4.5rem,1fr));gap:.4rem;direction:ltr;margin:.5rem 0}
.g2-tree button,.g2-tree .g2-you{min-block-size:3.4rem}
.g2-you{display:grid;place-items:center;border:2px solid currentColor;border-radius:.6rem;font-weight:700}
.g2-tile{display:inline-flex;border:2px solid currentColor;border-radius:.6rem;overflow:hidden;margin:.25rem}
.g2-tile button{border:0;border-radius:0;min-inline-size:5rem;min-block-size:3rem}
.g2-tile button+button{border-inline-start:2px dashed currentColor}
.g2-houses{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;direction:rtl}
.g2-house{min-inline-size:6rem;min-block-size:5rem;border-radius:.6rem .6rem .2rem .2rem}
.g2-hive{display:grid;grid-template-columns:repeat(3,3.4rem);gap:.35rem;justify-content:center;direction:rtl}
.g2-hive button{block-size:3.4rem;font-size:1.5rem;clip-path:polygon(25% 5%,75% 5%,100% 50%,75% 95%,25% 95%,0 50%)}
.g2-hive button.is-centre{font-weight:700;outline:3px solid currentColor}
.g2-entry{font-size:1.8rem;min-block-size:2.6rem;text-align:center;letter-spacing:.2rem}
.g2-found{display:flex;flex-wrap:wrap;gap:.4rem;justify-content:center;padding:0;list-style:none}
.g2-found li{border:1px solid currentColor;border-radius:.5rem;padding:.1rem .4rem}
.g2-rungs{list-style:none;padding:0;margin:.4rem auto;max-inline-size:18rem;text-align:center}
.g2-rungs li{border:1px solid currentColor;border-radius:.5rem;margin:.2rem 0;padding:.2rem}
.g2-rungs li.is-target{border-style:dashed}
.g2-rungs b{text-decoration:underline}
.g2-clues{padding-inline-start:1.2rem}
.g2-solved{border:2px solid currentColor;border-radius:.6rem;padding:.3rem;margin:.3rem 0;text-align:center}`;
  d.head.append(s);
}
