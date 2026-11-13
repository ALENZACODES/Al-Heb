// Game 1 — Hebrew Arch-Builder: authentic letter print strokes from the canonical deck.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, resultsCard, GAME_ENV, placeBoard } from './engine.js';
import { castEnvNode } from './cast-env.js';
import { sfx } from '../audio/sfx.js';
import { loadJson } from '../grammar/loader.js';

export const STORE_KEY = 'games.archbuilder.v1';
export function buildArchDeck(rows) {
  return (Array.isArray(rows) ? rows : []).filter(r =>
    r?.id && r?.he && Array.isArray(r?.print?.strokes) && r.print.strokes.length > 1 &&
    r.print.strokes.every(s => typeof s.path === 'string' && s.path.length > 0))
    .map(r => ({ id: r.id, he: r.he, name: r.name,
      strokes: r.print.strokes.map((s, i) => ({ id: r.id + ':' + i, path: s.path })) }));
}
export function acceptStroke(letter, chosen, step) {
  return !!letter?.strokes?.[step] && letter.strokes[step].id === chosen;
}
export function mount(root, ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive = true, deck = [], images = null, round = 0, step = 0;
  let session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 6 });
  const status = h('p', { class: 'game-status', role: 'status', 'aria-live': 'polite' }, 'Loading authentic letter strokes…');
  const board = h('div', { class: 'game-board' });
  const article = h('article', { class: 'card game-card game-archbuilder' },
    h('h1', { id: 'view-title' }, 'Hebrew Arch-Builder'),
    h('p', {}, 'Build the letter by choosing its actual strokes in sequence.'), status, board);
  root.replaceChildren(article);
  function paint(feedback) {
    if (!alive || !article.isConnected) return;
    if (round >= 8) {
      status.textContent = 'Arch complete.';
      board.replaceChildren(resultsCard(h, heSpan, session, { title: 'Arch complete', onAgain: () => {
        round = 0; step = 0; session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 6 }); paint();
      } }));
      return;
    }
    const letter = deck[round % deck.length];
    status.textContent = feedback || `Letter ${round + 1} of 8, stroke ${step + 1} of ${letter.strokes.length}.`;
    const reference = h('div', { class: 'game-arch-reference' },
      heSpan(letter.he, 'he game-he'), h('span', {}, letter.name));
    const picture = imgOf(images, 'letter', letter.id, { variant: 'print', role: 'mnemonic' });
    if (picture) reference.append(h('img', { src: picture.src, alt: picture.alt, width: picture.width,
      height: picture.height, class: 'game-card-img', 'data-img-id': picture.id }));
    const svgNS = 'http://www.w3.org/2000/svg';
    const diagram = document.createElementNS(svgNS, 'svg');
    diagram.setAttribute('viewBox', '0 0 1000 1000');
    diagram.setAttribute('class', 'game-arch-svg');
    diagram.setAttribute('aria-label', 'Locked authentic letter strokes');
    for (const stroke of letter.strokes.slice(0, step)) {
      const path = document.createElementNS(svgNS, 'path');
      path.setAttribute('d', stroke.path);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '65');
      path.setAttribute('stroke-linecap', 'round');
      diagram.append(path);
    }
    // Shape-only options: never expose index/step order on the choice buttons.
    const choices = shuffled(letter.strokes).map((stroke) => {
      const miniature = document.createElementNS(svgNS, 'svg');
      miniature.setAttribute('viewBox', '0 0 1000 1000');
      miniature.setAttribute('class', 'game-arch-option-svg');
      miniature.setAttribute('aria-hidden', 'true');
      const shape = document.createElementNS(svgNS, 'path');
      shape.setAttribute('d', stroke.path);
      shape.setAttribute('fill', 'none');
      shape.setAttribute('stroke', 'currentColor');
      shape.setAttribute('stroke-width', '85');
      shape.setAttribute('stroke-linecap', 'round');
      miniature.append(shape);
      return h('button', { type: 'button', class: 'btn secondary game-choice',
        'aria-label': 'Try this stroke shape', onclick: () => {
          if (!alive) return;
          const ok = acceptStroke(letter, stroke.id, step);
          session.answer(ok); sfx.play(ok ? 'success' : 'miss');
          if (ok) { step++; if (step === letter.strokes.length) { step = 0; round++; } paint(); }
          else paint('Incorrect stroke: the arch cannot lock.');
        } }, miniature);
    });
    placeBoard(board, castEnvNode(h, images, 'archbuilder', GAME_ENV.arch), reference, diagram, h('p', {}, 'Stroke ' + (step + 1) + ' of ' + letter.strokes.length),
      h('div', { class: 'game-choices' }, ...choices));
  }
  Promise.all([loadJson('data/letters/letters.json'), loadGameImages(ctx)]).then(([data, R]) => {
    if (!alive || !article.isConnected) return;
    deck = shuffled(buildArchDeck(data)); images = R;
    if (deck.length < 3) { status.textContent = 'Not enough source letter geometry.'; return; }
    paint();
  }).catch(() => { if (alive) status.textContent = 'Letter data unavailable.'; });
  return () => { alive = false; leaveSfx(); };
}
