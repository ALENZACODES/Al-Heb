// Shooting Star Vowel Catcher — catch the falling niqqud mark that turns
// the stage consonant into the target syllable. Isolates vowel recognition:
// the letter never changes inside a round, only the mark does.
//
// Play: move the letter (pointer drag, touch, or ←/→) under a falling star
// to catch it. The target is announced as text (and spoken when audio is
// available): "Make SHI — catch the hirik." Catching the named mark scores;
// any other mark bursts. 12 targets per game.
//
// Zero-dependency DOM + requestAnimationFrame; the loop self-terminates
// when the stage leaves the document, and mount returns a cleanup.

import { h, heSpan } from '../shell/ui.js';
import { createSession, speak, resultsCard } from './engine.js';

const MARKS = Object.freeze([
  { name: 'kamatz', glyph: '◌ָ', point: 'ָ', sound: 'a' },
  { name: 'patach', glyph: '◌ַ', point: 'ַ', sound: 'a' },
  { name: 'hirik', glyph: '◌ִ', point: 'ִ', sound: 'i' },
  { name: 'tsere', glyph: '◌ֵ', point: 'ֵ', sound: 'e' },
  { name: 'segol', glyph: '◌ֶ', point: 'ֶ', sound: 'e' },
  { name: 'kubutz', glyph: '◌ֻ', point: 'ֻ', sound: 'u' },
  { name: 'shva', glyph: '◌ְ', point: 'ְ', sound: '(silent / e)' },
]);
const LETTERS = Object.freeze([
  { glyph: 'ש', name: 'shin', base: 'sh' },
  { glyph: 'ב', name: 'bet', base: 'b' },
  { glyph: 'כ', name: 'kaf', base: 'k' },
  { glyph: 'מ', name: 'mem', base: 'm' },
  { glyph: 'ר', name: 'resh', base: 'r' },
]);
const TARGETS_PER_GAME = 12;

export function mount(root, ctx) {
  const session = createSession({ store: ctx?.store, storeKey: 'games.vowelcatcher.v1', par: 9 });
  const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  let target = null; // current MARKS entry
  let targetsDone = 0;
  let basketX = 50; // percent
  let stars = []; // {el, mark, x, y, speed}
  let raf = 0, last = 0, spawnAt = 0;
  let alive = true;

  const announce = h('p', { class: 'game-status', role: 'status', 'aria-live': 'polite' });
  const sky = h('div', { class: 'catcher-sky' });
  const basket = h('div', { class: 'catcher-basket', 'aria-hidden': 'true' }, letter.glyph);
  sky.append(basket);
  const board = h('div', { class: 'game-board' }, sky);

  function newTarget() {
    target = MARKS[Math.floor(Math.random() * MARKS.length)];
    targetsDone++;
    const syll = (letter.base + (target.sound === '(silent / e)' ? '' : target.sound)).toUpperCase();
    announce.textContent = `Target ${targetsDone} of ${TARGETS_PER_GAME}: make ${syll} — catch the ${target.name}.`;
    speak(ctx, letter.glyph + target.point).catch(() => {});
  }

  function spawn(now) {
    const mark = MARKS[Math.floor(Math.random() * MARKS.length)];
    const el = h('div', { class: 'catcher-star', 'aria-hidden': 'true' }, mark.glyph);
    const x = 6 + Math.random() * 88;
    sky.append(el);
    stars.push({ el, mark, x, y: -8, speed: 22 + Math.random() * 16 }); // %/s
    spawnAt = now + 650 + Math.random() * 500;
  }

  function step(ts) {
    if (!alive || !sky.isConnected) { alive = false; return; }
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    if (ts >= spawnAt) spawn(ts);
    const H = sky.clientHeight || 320;
    for (const s of [...stars]) {
      s.y += s.speed * dt;
      s.el.style.insetInlineStart = `${s.x}%`;
      s.el.style.top = `${s.y}%`;
      // catch zone: near the bottom, close to basket x
      if (s.y > 84 && s.y < 96 && Math.abs(s.x - basketX) < 9) {
        const ok = s.mark === target;
        session.answer(ok);
        announce.textContent = ok
          ? `${letter.glyph}${target.point} — yes! ${session.correct} caught · Score ${session.score}`
          : `That was the ${s.mark.name}. The ${target.name} is still the target.`;
        s.el.remove(); stars = stars.filter((x) => x !== s);
        if (ok) { if (targetsDone >= TARGETS_PER_GAME) return finish(); newTarget(); }
      } else if (s.y >= 100) { s.el.remove(); stars = stars.filter((x) => x !== s); }
    }
    raf = requestAnimationFrame(step);
  }

  function finish() {
    alive = false; cancelAnimationFrame(raf);
    board.replaceChildren(resultsCard(h, heSpan, session, {
      title: 'Star shower complete',
      onAgain: () => mount(root, ctx),
    }));
  }

  // controls: pointer + keys
  const move = (clientX) => {
    const r = sky.getBoundingClientRect();
    if (!r.width) return;
    basketX = Math.max(4, Math.min(96, ((clientX - r.left) / r.width) * 100));
    basket.style.insetInlineStart = `${basketX}%`;
  };
  sky.addEventListener('pointermove', (e) => move(e.clientX));
  sky.addEventListener('pointerdown', (e) => move(e.clientX));
  const keys = (e) => {
    if (e.key === 'ArrowLeft') { basketX = Math.max(4, basketX - 6); basket.style.insetInlineStart = `${basketX}%`; }
    if (e.key === 'ArrowRight') { basketX = Math.min(96, basketX + 6); basket.style.insetInlineStart = `${basketX}%`; }
  };
  document.addEventListener('keydown', keys);
  basket.style.insetInlineStart = '50%';

  root.replaceChildren(
    h('article', { class: 'card game-card' },
      h('h1', { id: 'view-title', tabindex: '-1' }, 'Vowel Catcher'),
      h('p', { class: 'muted' }, `The letter is ${letter.name}. Catch the falling vowel mark that makes the target sound — move with your finger, mouse, or arrow keys.`),
      announce, board));

  newTarget();
  raf = requestAnimationFrame(step);
  return () => { alive = false; cancelAnimationFrame(raf); document.removeEventListener('keydown', keys); };
}
