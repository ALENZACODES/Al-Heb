// @ts-check
// Quiz Ladder for Two (#/quizladder-duo, D8): pass-and-play on one device. Two players take turns on the same ten-rung ladder as
// Quiz Ladder (src/games/quizladder.view.js): a right answer climbs a rung, a wrong one drops to the last safe rung (3 or 6).
// Ten turns each; the higher rung wins (a tie is shared). Separate scores, no accounts, no network. Words: the arcade word bank.
import { h, heSpan } from '../shell/ui.js';
import { loadWords } from './arcade.js';
import { recordScore } from './scores.js';
import { injectStyles } from './library.view.js';

export const STORE_KEY = 'games.quizladder-duo.v1';
export const RUNGS = Object.freeze([10, 20, 30, 50, 70, 100, 140, 180, 240, 300]);
export const TURNS = 10;
/** A player's rung after one answer. Pure. */
export const climb = (rung, ok) => (ok ? Math.min(RUNGS.length, rung + 1) : rung >= 6 ? 6 : rung >= 3 ? 3 : 0);
export const valueOf = (rung) => (rung > 0 ? RUNGS[rung - 1] : 0);
/** Winner index (0 or 1), or -1 for a tie. */
export const winnerOf = (rungs) => (rungs[0] === rungs[1] ? -1 : rungs[0] > rungs[1] ? 0 : 1);

export function mount(root, ctx) {
  injectStyles();
  let alive = true, words = [], rungs = [0, 0], turns = [0, 0], who = 0, q = null;
  const names = ['Player 1', 'Player 2'];
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'gb-status' }, 'Loading the word bank…');
  const board = h('div', {});
  const ladders = h('div', { class: 'gb-filters', 'aria-label': 'Both ladders' });
  const rnd = Math.random;
  const pickN = (arr, n) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
  const paintLadders = () => ladders.replaceChildren(...names.map((n, i) => h('p', { class: 'gb-card' + (i === who ? ' gb-turn' : '') }, h('strong', {}, n), `: rung ${rungs[i]} (${valueOf(rungs[i])} points) · turn ${Math.min(turns[i] + (i === who ? 1 : 0), TURNS)} of ${TURNS}`)));

  function end() {
    const w = winnerOf(rungs), top = Math.max(valueOf(rungs[0]), valueOf(rungs[1]));
    try { const prev = ctx?.store?.get?.(STORE_KEY) || {}; ctx?.store?.set?.(STORE_KEY, { best: Math.max(prev.best || 0, top), plays: (prev.plays || 0) + 1, lastStars: 0 }); } catch { /* storage */ }
    recordScore(ctx?.store, 'quizladder-duo', top, 0);
    board.replaceChildren(h('section', { class: 'card game-results', 'aria-labelledby': 'qd-h' },
      h('h2', { id: 'qd-h', tabindex: '-1' }, w < 0 ? 'A tie: you share the win' : `${names[w]} wins`),
      h('ul', {}, ...names.map((n, i) => h('li', {}, `${n}: rung ${rungs[i]}, ${valueOf(rungs[i])} points`))),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onclick: start }, 'Play again'), h('a', { class: 'btn secondary', href: '#/game-library' }, 'Games Library'))));
    status.textContent = w < 0 ? 'Game over: a tie.' : `Game over: ${names[w]} wins.`;
    paintLadders();
  }
  function ask() {
    if (turns[0] >= TURNS && turns[1] >= TURNS) { end(); return; }
    paintLadders();
    const w = words[Math.floor(rnd() * words.length)];
    const reverse = rnd() < 0.5;
    const opts = pickN([w, ...pickN(words.filter((x) => x.id !== w.id && x.en !== w.en), 3)], 4);
    q = { w };
    board.replaceChildren(
      h('p', {}, h('strong', {}, `${names[who]}, your turn. `), `Rung ${rungs[who] + 1} for ${RUNGS[Math.min(rungs[who], RUNGS.length - 1)]}: `,
        ...(reverse ? [`Which word means "${w.en}"?`] : ['What does ', heSpan(w.he), ' mean?'])),
      h('div', { class: 'gb-filters', role: 'group', 'aria-label': 'Answers' }, ...opts.map((o) => h('button', { type: 'button', class: 'btn secondary', onclick: () => {
        const ok = o.id === q.w.id;
        rungs[who] = climb(rungs[who], ok); turns[who]++;
        status.textContent = ok ? `${names[who]}: right, up to rung ${rungs[who]}.` : `${names[who]}: not that one (${q.w.he} = ${q.w.en}). Down to rung ${rungs[who]}.`;
        who = turns[1 - who] < TURNS ? 1 - who : who;
        if (turns[who] < TURNS) status.textContent += ` Pass the device to ${names[who]}.`;
        ask();
      } }, reverse ? heSpan(o.he) : o.en))));
  }
  function start() { rungs = [0, 0]; turns = [0, 0]; who = 0; status.textContent = 'Player 1 starts. Pass the device after each answer.'; ask(); }

  root.replaceChildren(h('article', { class: 'card game-card gb-lib' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Quiz Ladder for Two ', heSpan('שְׁנַיִם')),
    h('p', {}, `Two players, one device. Take turns: ${TURNS} questions each. Right climbs a rung; wrong drops you to the last safe rung (3 or 6). The higher rung wins.`),
    status, ladders, board));
  (async () => {
    try { words = (await loadWords(ctx)).filter((w) => w && w.id && w.he && w.en); } catch { words = []; }
    if (!alive) return;
    if (words.length < 8) { status.textContent = 'The word bank did not load. Check the connection and open the game again.'; return; }
    status.textContent = 'Ready.'; board.replaceChildren(h('button', { type: 'button', class: 'btn', onclick: start }, 'Start'));
  })();
  return () => { alive = false; };
}
