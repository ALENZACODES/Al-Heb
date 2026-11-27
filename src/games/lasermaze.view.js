// Game 2 — Laser Mirror Maze: the beam must traverse actual Hebrew letters in RTL order.
// (Title corrected Nov 7 2026: it previously read "Laser Mirror Laser Maze".)
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, resultsCard, envNode, GAME_ENV, roundStatus, placeBoard } from './engine.js';
import { castEnvNode } from './cast-env.js';
import { sfx } from '../audio/sfx.js';
import { loadJson } from '../grammar/loader.js';
export const STORE_KEY = 'games.lasermaze.v1';
export const hebrewLetters = (word) => Array.from(String(word || '').normalize('NFD')).filter(c => /[\u05D0-\u05EA]/u.test(c));
export function correctBeamStep(word, index, step) {
  const letters = hebrewLetters(word);
  return Number.isInteger(index) && index === step && step >= 0 && step < letters.length;
}
export function correctBeamPath(word, path) {
  const ordered = hebrewLetters(word);
  return Array.isArray(path) && ordered.length === path.length && ordered.every((letter, i) => letter === path[i]);
}
export function correctMirrorStep(letters, nextIndex, choice) {
  return Array.isArray(letters) && !!choice && choice.i === nextIndex &&
    letters[nextIndex] === choice.letter;
}
export function buildMazeDeck(index) {
  const fields = index?.fields || [], rows = index?.rows || [];
  const id = fields.indexOf('id'), he = fields.indexOf('he'), en = fields.indexOf('en');
  if (Math.min(id, he, en) < 0) return [];
  return rows.filter(r => typeof r[he] === 'string' && hebrewLetters(r[he]).length >= 3 &&
    hebrewLetters(r[he]).length <= 5 &&
    new Set(hebrewLetters(r[he])).size === hebrewLetters(r[he]).length).map(r => ({ id: r[id], he: r[he], en: r[en] }));
}
const FIELD_W = 600, FIELD_H = 300, COLS = 5, ROWS = 3;
/** Places for n mirrors on the field: n distinct cells of the grid. */
export function mazeLayout(n, rnd = Math.random) {
  const cells = []; for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) cells.push({ col, row });
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  return cells.slice(0, Math.max(0, Math.min(n, cells.length)));
}
export function mount(root, ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive = true, deck = [], images = null, round = 0, selected = [], used = [], layout = null;
  let session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 6 });
  const status = h('p', { class: 'game-status', role: 'status', 'aria-live': 'polite' }, 'Loading Hebrew beam targets…');
  const board = h('div', { class: 'game-board' });
  const article = h('article', { class: 'card game-card game-lasermaze' },
    h('h1', { id: 'view-title' }, 'Laser Mirror Maze'),
    h('p', {}, 'Direct the beam through the letters in their true right-to-left reading order.'), status, board);
  root.replaceChildren(article);
  function paint(feedback) {
    if (!alive || !article.isConnected) return;
    if (round >= 8) {
      roundStatus(status, '', 'RTL maze solved.');
      board.replaceChildren(resultsCard(h, heSpan, session, { title: 'RTL maze solved', onAgain: () => {
        round = 0; selected = []; used = []; session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 6 }); paint();
      } }));
      return;
    }
    const item = deck[round % deck.length], letters = hebrewLetters(item.he), image = imgOf(images, 'word', item.id);
    roundStatus(status, feedback, `Word ${round + 1} of 8: mirror ${selected.length + 1} of ${letters.length}.`);
    const target = h('div', { class: 'game-laser-target' }, heSpan(item.he, 'he game-he'), h('p', {}, item.en));
    if (image) target.append(h('img', { class: 'game-card-img', src: image.src, alt: image.alt,
      width: image.width, height: image.height, 'data-img-id': image.id }));
    // The maze: every letter is a mirror at a fixed place on the field for the whole word (it used to be a reshuffled row of
    // buttons with no maze and no beam, 27 Nov 2026 review). The beam leaves the lamp on the right, and bends at each mirror
    // chosen in reading order; the last mirror sends it to the gate on the left.
    if (!layout || layout.round !== round) layout = { round, cells: mazeLayout(letters.length) };
    const at = (k) => ({ x: (layout.cells[k].col + 0.5) * (FIELD_W / COLS), y: (layout.cells[k].row + 0.5) * (FIELD_H / ROWS) });
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + FIELD_W + ' ' + FIELD_H); svg.setAttribute('class', 'game-laser-svg'); svg.setAttribute('aria-hidden', 'true');
    const pts = [{ x: FIELD_W - 8, y: FIELD_H / 2 }, ...used.map(at)];
    for (const [cls, width] of [['game-laser-glow', 14], ['game-laser-beam', 5]]) {
      const line = document.createElementNS(svgNS, 'polyline');
      line.setAttribute('points', pts.map((q) => q.x + ',' + q.y).join(' '));
      line.setAttribute('fill', 'none'); line.setAttribute('stroke-width', String(width)); line.setAttribute('stroke-linecap', 'round'); line.setAttribute('stroke-linejoin', 'round');
      line.setAttribute('class', cls); svg.append(line);
    }
    const mirrors = letters.map((letter, i) => {
      const q = at(i), hit = used.includes(i);
      return h('button', { type: 'button', class: 'btn secondary game-choice game-laser-mirror' + (hit ? ' is-hit' : ''), disabled: hit,
        style: 'left:' + (q.x / FIELD_W) * 100 + '%;top:' + (q.y / FIELD_H) * 100 + '%', 'aria-label': hit ? 'Mirror ' + letter + ', lit' : 'Mirror ' + letter,
        onclick: () => {
          if (!alive || used.includes(i)) return;
          const ok = correctBeamStep(item.he, i, selected.length);
          session.answer(ok); sfx.play(ok ? 'success' : 'miss');
          if (!ok) { paint('Not that mirror yet. Hebrew reads right to left: follow the word from its first letter.'); return; }
          selected.push(letter); used.push(i);
          if (selected.length === letters.length) { round++; selected = []; used = []; }
          paint();
        } }, heSpan(letter, 'he game-he-sm'));
    });
    const field = h('div', { class: 'game-laser-field', role: 'group', 'aria-label': 'Maze of mirrors. Choose the mirrors in reading order.' },
      svg, h('span', { class: 'game-laser-lamp', 'aria-hidden': 'true' }, '◀'), h('span', { class: 'game-laser-gate', 'aria-hidden': 'true' }, '◎'), ...mirrors);
    placeBoard(board, castEnvNode(h, images, 'lasermaze', GAME_ENV.laser), target, h('p', {}, 'Beam through ' + selected.length + ' of ' + letters.length + ' mirrors'), field);
  }
  Promise.all([loadJson('data/vocab/index.json'), loadGameImages(ctx)]).then(([data, R]) => {
    if (!alive || !article.isConnected) return;
    deck = shuffled(buildMazeDeck(data)).slice(0, 200); images = R;
    if (deck.length < 8) { status.textContent = 'Not enough real word targets.'; return; }
    paint();
  }).catch(() => { if (alive) status.textContent = 'Vocabulary unavailable.'; });
  return () => { alive = false; leaveSfx(); };
}
