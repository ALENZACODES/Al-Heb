// Game 2 — Laser Mirror Maze: the beam must traverse actual Hebrew letters in RTL order.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, resultsCard } from './engine.js';
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
export function mount(root, ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive = true, deck = [], images = null, round = 0, selected = [], used = [];
  let session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 6 });
  const status = h('p', { class: 'game-status', role: 'status', 'aria-live': 'polite' }, 'Loading Hebrew beam targets…');
  const board = h('div', { class: 'game-board' });
  const article = h('article', { class: 'card game-card game-lasermaze' },
    h('h1', { id: 'view-title' }, 'Laser Mirror Laser Maze'),
    h('p', {}, 'Direct the beam through the letters in their true right-to-left reading order.'), status, board);
  root.replaceChildren(article);
  function paint() {
    if (!alive || !article.isConnected) return;
    if (round >= 8) {
      board.replaceChildren(resultsCard(h, heSpan, session, { title: 'RTL maze solved', onAgain: () => {
        round = 0; selected = []; used = []; session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 6 }); paint();
      } }));
      return;
    }
    const item = deck[round % deck.length], letters = hebrewLetters(item.he), image = imgOf(images, 'word', item.id);
    const target = h('div', { class: 'game-laser-target' }, heSpan(item.he, 'he game-he'), h('p', {}, item.en));
    if (image) target.append(h('img', { class: 'game-card-img', src: image.src, alt: image.alt,
      width: image.width, height: image.height, 'data-img-id': image.id }));
    const buttons = shuffled(letters.map((letter, i) => ({ letter, i }))).map(choice =>
      h('button', { type: 'button', class: 'btn secondary game-choice', disabled: used.includes(choice.i),
        onclick: () => {
          if (!alive || used.includes(choice.i)) return;
          const ok = correctBeamStep(item.he, choice.i, selected.length);
          session.answer(ok); sfx.play(ok ? 'success' : 'miss');
          if (ok) { selected.push(choice.letter); used.push(choice.i); }
          status.textContent = ok ? 'Beam reflected to the next RTL letter.' : 'Wrong mirror: RTL path rejected.';
          if (selected.length === letters.length) { round++; selected = []; used = []; }
          paint();
        } }, heSpan(choice.letter, 'he game-he-sm')));
    board.replaceChildren(target, h('p', {}, 'Path ' + selected.length + ' of ' + letters.length),
      h('div', { class: 'game-choices game-rtl-grid', dir: 'rtl' }, ...buttons));
  }
  Promise.all([loadJson('data/vocab/index.json'), loadGameImages(ctx)]).then(([data, R]) => {
    if (!alive || !article.isConnected) return;
    deck = shuffled(buildMazeDeck(data)).slice(0, 200); images = R;
    if (deck.length < 8) { status.textContent = 'Not enough real word targets.'; return; }
    paint();
  }).catch(() => { if (alive) status.textContent = 'Vocabulary unavailable.'; });
  return () => { alive = false; leaveSfx(); };
}
