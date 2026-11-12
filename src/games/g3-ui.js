// Grammar in Action games (g3-*): small DOM helpers on top of the arcade contract (src/games/arcade.js) and the
// tg helpers (src/games/tg-ui.js). Every g3 game is an arcade game: five levels, the HUD, best-score saver, badges and
// the daily challenge come from there. Nothing here animates, so reduced motion needs no special case.
import { host, track, grade, numberKeys, roundKeys, draftNote, ensureStyle, he } from './tg-ui.js';
import { showName } from './tg-core.js';
import { G3_GAMES } from './g3-catalog.js';

export { host, track, grade, numberKeys, roundKeys, draftNote, he };

/** The game after this one in the Grammar in Action list (wraps). */
export const nextG3 = (id) => { const i = G3_GAMES.findIndex((g) => g.id === id); return i < 0 ? null : G3_GAMES[(i + 1) % G3_GAMES.length]; };

/** The results card's Next link points at the next Grammar in Action game, not the arcade's first game. */
function handoff(A) {
  if (A.__g3) return;
  A.__g3 = true;
  const finish = A.finish;
  A.finish = (...args) => {
    const out = finish(...args);
    const next = nextG3(A.spec.id);
    const card = A.board?.parentNode?.querySelector?.('.arc-results-card');
    const link = card ? [...card.querySelectorAll('a')].find((a) => /^Next:/.test(a.textContent || '')) : null;
    if (next && link) { link.setAttribute('href', '#/' + next.id); link.textContent = 'Next: ' + next.title; }
    return out;
  };
}

/**
 * Start a round: styles, round bookkeeping, the host line, and the three parts most games use.
 * Returns { T, big, prompt, area }; `note` goes under the board.
 */
export function begin(A, who, line, note) {
  ensureStyle(); g3Style(); handoff(A);
  const T = track(A);
  const big = A.h('div', { class: 'arc-big g3-big', lang: 'he', dir: 'rtl' });
  const prompt = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const area = A.h('div', { class: 'g3-area' });
  A.board.replaceChildren(host(A, who, line), big, prompt, area, draftNote(A, note));
  return { T, big, prompt, area };
}

/** Hebrew text with lang and dir (and the divine-name rule, though no g3 data holds the name). */
export const heText = (A, text, cls = 'he') => he(A, text, cls);
/** A button holding Hebrew. */
export const heButton = (A, text, onclick, cls = 'arc-choice', extra = {}) => A.h('button', { type: 'button', class: cls, lang: 'he', dir: 'rtl', onclick, ...extra }, showName(text));
/** Play the word-list clip for an entry that came from data/vocab/words.json (silent when there is none). */
export function sayEntry(A, entry) {
  const id = entry?.id || (entry?.src?.file === 'data/vocab/words.json' ? entry.src.id : null);
  if (id) A.sayWord({ id, he: entry.he });
}

/**
 * Two columns to pair up: tap one on the right (Hebrew side), then its match on the left.
 * isPair(a, b) decides; onPair(a, b) and onWrong(a, b) report; onDone() when every left item is paired.
 */
export function pairBoard(A, left, right, { renderLeft, renderRight, isPair, onPair, onWrong, onDone, label = 'Pairs' }) {
  let picked = null, done = 0;
  const lb = left.map((x) => A.h('button', { type: 'button', class: 'arc-choice g3-pair', onclick: () => tapLeft(x, lb[left.indexOf(x)]) }, ...[].concat(renderLeft(x))));
  const rb = right.map((x) => A.h('button', { type: 'button', class: 'arc-choice g3-pair', lang: 'he', dir: 'rtl', 'aria-pressed': 'false', onclick: () => tapRight(x, rb[right.indexOf(x)]) }, ...[].concat(renderRight(x))));
  const tapRight = (x, b) => { for (const o of rb) o.setAttribute('aria-pressed', 'false'); picked = { x, b }; b.setAttribute('aria-pressed', 'true'); A.sfx('drop'); };
  const tapLeft = (x, b) => {
    if (!picked) { A.announce('First pick a Hebrew word on the right.'); return; }
    if (isPair(x, picked.x)) {
      b.disabled = true; picked.b.disabled = true; b.classList.add('is-good'); picked.b.classList.add('is-good');
      b.append(A.h('span', { class: 'visually-hidden' }, ' (matched)'));
      onPair?.(x, picked.x); picked = null; done += 1;
      if (done === left.length) onDone?.();
    } else { onWrong?.(x, picked.x); }
  };
  return A.h('div', { class: 'g3-pairs', role: 'group', 'aria-label': label },
    A.h('div', { class: 'g3-col', role: 'group', 'aria-label': 'Hebrew' }, ...rb),
    A.h('div', { class: 'g3-col', role: 'group', 'aria-label': 'Match it to' }, ...lb));
}

/** A line of tappable words (right to left). onWord(index, button). */
export function wordLine(A, words, onWord, { label = 'Words' } = {}) {
  const buttons = words.map((w, i) => A.h('button', { type: 'button', class: 'g3-word', onclick: () => onWord(i, buttons[i]) }, showName(w)));
  return A.h('div', { class: 'g3-line', lang: 'he', dir: 'rtl', role: 'group', 'aria-label': label }, ...buttons);
}

/** A line with a tappable gap before, between and after the words. onGap(index) where index 0 is before the first word. */
export function gapLine(A, words, onGap, { label = 'Places for the missing word' } = {}) {
  const kids = [];
  for (let i = 0; i <= words.length; i++) {
    kids.push(A.h('button', { type: 'button', class: 'g3-gap', 'aria-label': i === 0 ? 'Before the first word' : i === words.length ? 'After the last word' : `Between word ${i} and word ${i + 1}`, onclick: () => onGap(i) }, '＋'));
    if (i < words.length) kids.push(A.h('span', { class: 'g3-word g3-static' }, showName(words[i])));
  }
  return A.h('div', { class: 'g3-line', lang: 'he', dir: 'rtl', role: 'group', 'aria-label': label }, ...kids);
}

/** Labelled bins to drop the current card into. bins: [{ key, label, sub }]; onBin(key). Keys 1..n press them. */
export function binRow(A, bins, onBin, { label = 'Bins' } = {}) {
  return A.h('div', { class: 'arc-choices g3-bins', role: 'group', 'aria-label': label },
    ...bins.map((b, i) => A.h('button', { type: 'button', class: 'arc-choice g3-bin', 'data-key': b.key, onclick: () => onBin(b.key) },
      A.h('strong', {}, `${i + 1}. ${b.label}`), b.sub ? A.h('small', {}, b.sub) : null)));
}

/** A row of dots or squares to count (with the number in words for screen readers). */
export function countRow(A, n, symbol = '●') {
  return A.h('div', { class: 'g3-count', role: 'img', 'aria-label': `${n} of them` }, A.h('span', { 'aria-hidden': 'true' }, Array.from({ length: n }, () => symbol).join(' ')));
}

/** Style block for the g3 games, added once. Results are shown with words and symbols as well as colour. */
export function g3Style() {
  const d = globalThis.document;
  if (!d?.head || d.getElementById?.('g3-style')) return;
  const s = d.createElement('style');
  s.id = 'g3-style';
  s.textContent = `
.g3-big{min-block-size:3rem}
.g3-line{display:flex;flex-wrap:wrap;gap:.3rem;justify-content:center;align-items:center;font-size:1.35rem;margin:.6rem 0}
.g3-word{font:inherit;padding:.2rem .55rem;border:1px solid currentColor;border-radius:.6rem;background:none;color:inherit;cursor:pointer}
.g3-word.g3-static{cursor:default;border-style:dashed}
.g3-word.is-good::after,.arc-choice.is-good::after{content:" ✓"}
.g3-word.is-bad::after,.arc-choice.is-bad::after{content:" ✗"}
.g3-word.is-picked{outline:3px solid currentColor;outline-offset:2px}
.g3-gap{font:inherit;font-size:.9rem;min-inline-size:1.8rem;min-block-size:2rem;border:1px dashed currentColor;border-radius:.5rem;background:none;color:inherit;opacity:.75;cursor:pointer}
.g3-gap:focus-visible,.g3-word:focus-visible,.g3-cell:focus-visible{outline:3px solid currentColor;outline-offset:2px;opacity:1}
.g3-pairs{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin:.5rem 0}
.g3-col{display:grid;gap:.35rem;align-content:start}
.g3-pair[aria-pressed="true"]{outline:3px solid currentColor;outline-offset:2px}
.g3-bins{display:grid;grid-template-columns:repeat(auto-fit,minmax(7.5rem,1fr));gap:.4rem}
.g3-bin small{display:block;font-size:.75rem;opacity:.85}
.g3-count{font-size:1.6rem;letter-spacing:.3rem;text-align:center;margin:.3rem 0}
.g3-belt{display:flex;gap:.4rem;justify-content:flex-start;direction:rtl;overflow:hidden;min-block-size:3.4rem;border-block:2px dashed currentColor;padding:.4rem;margin:.5rem 0}
.g3-belt .g3-item{border:1px solid currentColor;border-radius:.5rem;padding:.2rem .5rem;font-size:1.3rem;white-space:nowrap}
.g3-belt .g3-item.is-next{outline:3px solid currentColor;font-weight:700}
.g3-meter{block-size:.5rem;border:1px solid currentColor;border-radius:.3rem;overflow:hidden;margin:.3rem 0}
.g3-meter>span{display:block;block-size:100%;background:currentColor;opacity:.5}
.g3-grid{display:grid;gap:.3rem;margin:.5rem 0;direction:rtl}
.g3-cell{font:inherit;font-size:1.1rem;min-block-size:2.6rem;border:1px solid currentColor;border-radius:.5rem;background:none;color:inherit;cursor:pointer;padding:.15rem .3rem}
.g3-cell.is-filled{border-style:solid;font-weight:700;cursor:default}
.g3-cell.is-head{border:none;font-size:.85rem;cursor:default}
.g3-holes{display:grid;grid-template-columns:repeat(3,1fr);gap:.4rem;margin:.5rem 0}
.g3-hole{min-block-size:3.2rem;border:2px solid currentColor;border-radius:1.6rem;font:inherit;font-size:1.2rem;background:none;color:inherit;cursor:pointer}
.g3-hole:disabled{opacity:.35;cursor:default}
.g3-pack{display:flex;flex-wrap:wrap;gap:.4rem;justify-content:center;margin:.5rem 0;padding:0;list-style:none}
.g3-pack li{border:1px solid currentColor;border-radius:.5rem;padding:.2rem .6rem}
.g3-scene{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center;align-items:center;margin:.4rem 0}
.g3-tag{border:1px solid currentColor;border-radius:999px;padding:.1rem .6rem;font-size:.9rem}`;
  d.head.append(s);
}
