// True or Not: a Hebrew word and an English meaning flash up together. Right pairing or wrong one?
// Decide fast: right side for true, left for not. The streak multiplier rewards a run of correct calls.
import { mountArcade, randInt } from './arcade.js';
import { pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.trueornot.v1';

const spec = {
  id: 'trueornot', title: 'True or Not', titleHe: 'נָכוֹן אוֹ לֹא',
  blurb: 'A Hebrew word appears with a meaning under it. Is the meaning right? Tap TRUE on the right, NOT on the left, and keep the streak alive. Wrong pairings get sneakier each level.',
  howTo: ['Read the word and the meaning shown.', 'Tap TRUE (or press →) if they match, NOT (or press ←) if they do not.', 'A streak of right answers multiplies your points. One wrong call resets it.', 'Twenty cards per round; the timer per card shrinks on higher levels.'],
  levels: [
    { name: '20 cards, easy decoys', cards: 20, perCard: 6, sameTheme: false },
    { name: 'Decoys from the same theme', cards: 20, perCard: 5, sameTheme: true },
    { name: 'Faster', cards: 24, perCard: 4, sameTheme: true },
    { name: 'Sounds instead of Hebrew', cards: 24, perCard: 4, sameTheme: true, translit: true },
    { name: '30 cards, 3 seconds each', cards: 30, perCard: 3, sameTheme: true, translit: false },
  ],
  par: (l, cfg) => cfg.cards * 10,
  seconds: (l, cfg) => cfg.cards * cfg.perCard + 10,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const words = A.words; if (words.length < 10) { A.announce('Word bank did not load.'); return; }
  let n = 0, card = null, streak = 0, deadline = 0;
  const he = A.h('div', { class: 'arc-big', lang: 'he', dir: 'rtl' });
  const en = A.h('p', { class: 'arc-prompt' });
  const bar = A.h('div', { class: 'arc-bar', 'aria-hidden': 'true' }, A.h('span', { style: 'width:100%' }));
  const left = A.h('button', { type: 'button', class: 'arc-bin', 'aria-label': 'Not a match (left arrow)', onclick: () => answer(false) }, '✗ NOT');
  const right = A.h('button', { type: 'button', class: 'arc-bin', 'aria-label': 'True match (right arrow)', onclick: () => answer(true) }, 'TRUE ✓');
  A.board.replaceChildren(he, en, bar, A.h('div', { class: 'arc-two' }, left, right));
  const next = () => {
    if (n >= cfg.cards) { A.finish({ won: true }); return; }
    n++;
    const w = words[randInt(rnd, words.length)];
    const truth = rnd() < 0.5;
    let shown = w;
    if (!truth) { const pool = (cfg.sameTheme ? words.filter((x) => x.theme === w.theme && x.id !== w.id) : words.filter((x) => x.id !== w.id)); shown = pool.length ? pool[randInt(rnd, pool.length)] : words[(words.indexOf(w) + 1) % words.length]; }
    card = { w, truth };
    he.textContent = cfg.translit ? w.translit : w.he;
    en.textContent = `${shown.en} · card ${n} of ${cfg.cards} · streak ${streak}`;
    deadline = Date.now() + cfg.perCard * 1000;
    if (!cfg.translit) A.sayWord(w);
  };
  const answer = (said) => {
    if (!card) return;
    const ok = said === card.truth;
    if (ok) { streak++; const pts = 10 + Math.min(streak - 1, 5) * 2; A.addScore(pts); A.sfx(streak >= 5 ? 'streak' : 'tick'); A.announce(`${card.w.he} = ${card.w.en}. +${pts}.`); }
    else { streak = 0; A.addScore(-4); A.sfx('miss'); A.miss(); A.announce(`${card.w.he} means ${card.w.en}.`); }
    next();
  };
  A.keys((k) => { if (k === 'right') { answer(true); return true; } if (k === 'left') { answer(false); return true; } return false; });
  if (!A.untimed) A.loop(() => { const left2 = Math.max(0, deadline - Date.now()); bar.firstChild.style.width = `${(100 * left2) / (cfg.perCard * 1000)}%`; if (left2 <= 0 && card) { A.announce(`Too slow. ${card.w.he} means ${card.w.en}.`); streak = 0; A.miss(); next(); } }, 100);
  A.setLives(0);
  next();
}

export const mount = mountArcade(spec, setup);
