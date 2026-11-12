// Letters, vowels and reading sounds (g1-*): DOM helpers on top of the arcade contract (src/games/arcade.js) and the
// round bookkeeping shared with the Torah and Hebrew games (src/games/tg-ui.js).
import { track, roundKeys, numberKeys, grade, draftNote, ensureStyle as ensureTgStyle } from './tg-ui.js';
import { loadData } from './tg-core.js';
import { playRecordedClip } from './engine.js';
import { isAudioFree } from '../shell/audiofree.js';
import { viewBoxFor, expandSyl } from './g1-core.js';

export { track, roundKeys, numberKeys, grade, draftNote, loadData };

/** The cast with their existing pictures (assets/games/arcade/cast). */
const CAST = {
  rimon: ['rimon-face', 'Rimon'], 'rimon-fly': ['rimon-fly', 'Rimon'],
  ari: ['ari-host', 'Ari'], 'ari-caller': ['ari-caller', 'Ari'], 'ari-side': ['ari-side', 'Ari'],
  noa: ['noa-hint', 'Noa'], 'noa-side': ['noa-side', 'Noa'], 'noa-conductor': ['noa-conductor', 'Noa'],
};
export function host(A, who, line) {
  const [art, name] = CAST[who] || CAST.rimon;
  return A.h('div', { class: 'arc-host g1-host' }, A.cast(art, name, 'arc-sprite-inline'), A.h('p', { class: 'arc-prompt' }, A.h('strong', {}, name + ': '), line));
}
/** Hebrew text with lang and dir. */
export const he = (A, text, cls = 'he') => A.h('span', { lang: 'he', dir: 'rtl', class: cls }, text);

/** Mark a button right or wrong in words as well as colour: a ✓ or ✗ and hidden text for screen readers. */
export function markButton(A, b, ok) {
  b.classList.add(ok ? 'is-good' : 'is-bad');
  b.append(A.h('span', { class: 'g1-mark', 'aria-hidden': 'true' }, ok ? ' ✓' : ' ✗'), A.h('span', { class: 'visually-hidden' }, ok ? ' (right)' : ' (not this one)'));
}

/** The learner's reading tradition; the recorded syllables are Israeli. */
export const tradition = (ctx) => { try { const t = ctx?.settings?.get?.('congregation'); return t === 'sephardi' || t === 'ashkenazi' ? t : 'israeli'; } catch { return 'israeli'; } };
/** Play the recorded Israeli syllable that is written exactly like `text`, when there is one and the learner reads Israeli. */
export function saySyllable(A, syllables, text) {
  if (!text || isAudioFree(A.ctx) || tradition(A.ctx) !== 'israeli') return false;
  const key = String(text).normalize('NFC');
  const s = (syllables || []).find((x) => String(x.he).normalize('NFC') === key);
  if (s) playRecordedClip(A.ctx, 'syllable', s.id, { text }).catch?.(() => {});
  return !!s;
}

/** The letters with their print and cursive strokes (data/letters/letters.json). */
export const loadLetterStrokes = (ctx) => loadData(ctx, 'data/letters/letters.json');
export const loadSyllables = (ctx) => loadData(ctx, 'data/lab/syllables.json').then((d) => d.syllables || []);
/** The g1 words, each with its syllables as text (syl) cut from the stored letter counts. */
export const loadWords = (ctx) => loadData(ctx, 'data/games/g1/words.json').then((d) => (d.words || []).map((w) => ({ ...w, syl: expandSyl(w.he, w.syl) || undefined })));

const SVG = 'http://www.w3.org/2000/svg';
/**
 * A letter drawn from its stroke centrelines. parts: per stroke, how much to draw (0 to 1). style(i) returns extra
 * attributes per stroke (class, data). Decorative unless a label is given.
 */
export function letterSvg(strokes, { parts = null, label = '', width = 85, cls = 'g1-svg', style = null, box = null } = {}) {
  const d = globalThis.document;
  const svg = d.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', box || viewBoxFor(strokes));
  svg.setAttribute('class', cls);
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); } else svg.setAttribute('aria-hidden', 'true');
  strokes.forEach((s, i) => {
    const part = parts ? parts[i] : 1;
    if (part <= 0) return;
    const p = d.createElementNS(SVG, 'path');
    p.setAttribute('d', s.path);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', String(width));
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    if (part < 1) { p.setAttribute('pathLength', '100'); p.setAttribute('stroke-dasharray', `${Math.round(part * 100)} 100`); }
    for (const [k, v] of Object.entries(style ? style(i) || {} : {})) p.setAttribute(k, v);
    svg.appendChild(p);
  });
  return svg;
}

/** The g1 style block (on top of the tg one), added once. Nothing animates under reduced motion. */
export function ensureStyle() {
  ensureTgStyle();
  const d = globalThis.document;
  if (!d?.head || d.getElementById?.('g1-style')) return;
  const s = d.createElement('style');
  s.id = 'g1-style';
  s.textContent = `
.g1-svg{inline-size:min(14rem,60vw);block-size:auto;display:block;margin:.4rem auto;color:var(--ink,#2b2b2b)}
.g1-svg .g1-ghost{opacity:.18}.g1-svg .g1-done{color:var(--accent,#2a6);stroke:var(--accent,#2a6)}
.g1-mini{inline-size:3.2rem;block-size:3.2rem;display:inline-block;vertical-align:middle}
.g1-big{font-size:clamp(2.4rem,10vw,3.8rem);text-align:center;line-height:1.4;margin:.3rem 0}
.g1-row{display:flex;flex-wrap:wrap;gap:.45rem;justify-content:center;margin:.45rem 0}
.g1-rtl{direction:rtl}
.g1-cols{display:grid;grid-template-columns:1fr 1fr;gap:.6rem}
.g1-col{display:grid;gap:.4rem;align-content:start}
.g1-card{min-block-size:3.4rem;font-size:1.6rem;border-radius:12px;border:1px solid var(--line,#8a8a8a66);background:var(--card,transparent);color:inherit;cursor:pointer;padding:.25rem .6rem}
.g1-card.is-picked{outline:3px solid var(--accent,#2a6);outline-offset:2px}
.g1-card.is-good{background:var(--good,#cfeedd)}.g1-card.is-bad{background:var(--bad,#f6d3d3)}
.g1-card[disabled]{opacity:.7;cursor:default}
.g1-track{display:grid;gap:.3rem;margin:.4rem 0}
.g1-lane{display:flex;align-items:center;gap:.4rem}
.g1-lane .arc-bar{flex:1}
.g1-pads{display:grid;grid-template-columns:repeat(auto-fit,minmax(4.2rem,1fr));gap:.5rem;max-inline-size:22rem;margin:.5rem auto;direction:rtl}
.g1-pad{min-block-size:4.2rem;font-size:2rem;border-radius:14px;border:2px solid var(--line,#8a8a8a66);background:var(--card,transparent);color:inherit}
.g1-pad.is-lit{background:var(--accent,#2a6);color:#fff;border-color:currentColor}
.g1-train{display:flex;flex-wrap:wrap;gap:.3rem;justify-content:center;direction:rtl;margin:.5rem 0}
.g1-car{min-inline-size:3rem;min-block-size:3rem;display:grid;place-items:center;border:2px solid currentColor;border-radius:.5rem .5rem 1rem 1rem;font-size:1.6rem}
.g1-car.is-gap{border-style:dashed;opacity:.8}.g1-car.is-next{outline:3px solid var(--accent,#2a6)}
.g1-word{display:flex;gap:.15rem;justify-content:center;direction:rtl;font-size:2.2rem;margin:.4rem 0;flex-wrap:wrap}
.g1-word button{font:inherit;min-inline-size:2.6rem;border-radius:.5rem;border:1px solid var(--line,#8a8a8a66);background:var(--card,transparent);color:inherit;padding:0 .2rem}
.g1-word button.is-on{outline:3px solid var(--accent,#2a6);background:var(--good,#cfeedd)}
.g1-word .g1-gap{min-inline-size:1.4rem;font-size:1rem;padding:0;border-style:dashed}
.g1-word .g1-gap.is-on{background:var(--accent,#2a6);color:#fff}
.g1-hl{text-decoration:underline;text-decoration-thickness:3px;text-underline-offset:.35em;background:var(--good,#cfeedd);border-radius:.3rem}
.g1-chain{display:flex;flex-wrap:wrap;gap:.25rem;justify-content:center;direction:rtl;margin:.4rem 0;font-size:1.5rem}
.g1-chain span{border:1px solid currentColor;border-radius:.4rem;padding:0 .35rem}
.g1-chain span:last-child{outline:3px solid var(--accent,#2a6)}
.g1-river{display:grid;gap:.4rem;direction:rtl;margin:.5rem auto;max-inline-size:20rem}
.g1-river-row{display:grid;grid-template-columns:repeat(var(--cols,3),1fr);gap:.4rem}
.g1-stone{min-block-size:3rem;border-radius:50%;font-size:1.4rem;border:2px solid var(--line,#8a8a8a66);background:var(--card,transparent);color:inherit}
.g1-stone.is-here{background:var(--accent,#2a6);color:#fff}
.g1-flash{font-size:clamp(2.4rem,10vw,3.6rem);min-block-size:4.6rem;text-align:center;line-height:1.5}
.g1-mark{font-size:.8em}
@media (prefers-reduced-motion:no-preference){.g1-pad,.g1-card,.g1-stone{transition:background-color .15s}}`;
  d.head.append(s);
}

/** n items one after another; show(i, done) draws item i (1-based) and calls done() when it is answered. */
export function series(A, T, count, show, pause = 650) {
  let i = 0;
  const next = () => { if (!T.live()) return; if (i >= count) { T.end({ won: true }); return; } i += 1; show(i, () => T.later(pause, next)); };
  return next;
}
/**
 * A row of answer buttons. A wrong pick is marked and locked; the right one locks the row and calls onRight.
 * isRight(option) decides; say(option, ok) gives the spoken line. Number keys 1 to 9 press the buttons.
 */
export function choiceButtons(A, opts, { render, isRight, onRight, onWrong, points = 10, label = 'Choices', cls = 'arc-choice', say = null, rtl = true }) {
  const row = A.h('div', { class: 'arc-choices' + (rtl ? ' g1-rtl' : ''), role: 'group', 'aria-label': label });
  for (const o of opts) {
    const b = A.h('button', { type: 'button', class: cls }, render(o));
    b.addEventListener('click', () => {
      if (b.disabled) return;
      const ok = !!isRight(o);
      markButton(A, b, ok);
      grade(A, ok, { points, right: say ? say(o, true) : 'Right.', wrong: say ? say(o, false) : 'Not that one. Look again.' });
      if (ok) { for (const x of row.querySelectorAll('button')) x.disabled = true; onRight?.(o); }
      else { b.disabled = true; onWrong?.(o); }
    });
    row.append(b);
  }
  return row;
}
