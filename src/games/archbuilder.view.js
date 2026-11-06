// Game 1 — Hebrew Arch-Builder: authentic letter print strokes from the canonical deck.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, resultsCard } from './engine.js';
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
  let alive = true, deck = [], images = null, round = 0, step = 0;
  let session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 6 });
  const status = h('p', { class: 'game-status', role: 'status', 'aria-live': 'polite' }, 'Loading authentic letter strokes…');
  const board = h('div', { class: 'game-board' });
  const article = h('article', { class: 'card game-card game-archbuilder' },
    h('h1', { id: 'view-title' }, 'Hebrew Arch-Builder'),
    h('p', {}, 'Build the letter by choosing its actual strokes in sequence.'), status, board);
  root.replaceChildren(article);
  function paint() {
    if (!alive || !article.isConnected) return;
    if (round >= 8) {
      board.replaceChildren(resultsCard(h, heSpan, session, { title: 'Arch complete', onAgain: () => {
        round = 0; step = 0; session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 6 }); paint();
      } }));
      return;
    }
    const letter = deck[round % deck.length];
    const reference = h('div', { class: 'game-arch-reference' },
      heSpan(letter.he, 'he game-he'), h('span', {}, letter.name));
    const picture = imgOf(images, 'letter', letter.id, { variant: 'print', role: 'mnemonic' });
    if (picture) reference.append(h('img', { src: picture.src, alt: picture.alt, width: picture.width,
      height: picture.height, class: 'game-card-img', 'data-img-id': picture.id }));
    const diagram = h('svg', { viewBox: '0 0 1000 1000', class: 'game-arch-svg', 'aria-label': 'Locked authentic letter strokes' });
    for (const stroke of letter.strokes.slice(0, step))
      diagram.append(h('path', { d: stroke.path, fill: 'none', stroke: 'currentColor', 'stroke-width': 65, 'stroke-linecap': 'round' }));
    const choices = shuffled(letter.strokes).map((stroke, i) =>
      h('button', { type: 'button', class: 'btn secondary game-choice', onclick: () => {
        if (!alive) return;
        const ok = acceptStroke(letter, stroke.id, step);
        session.answer(ok);
        if (ok) { step++; if (step === letter.strokes.length) { step = 0; round++; } }
        status.textContent = ok ? 'Correct stroke locked.' : 'Incorrect stroke: the arch cannot lock.';
        paint();
      } }, 'Stroke ' + (letter.strokes.indexOf(stroke) + 1)));
    board.replaceChildren(reference, diagram, h('p', {}, 'Stroke ' + (step + 1) + ' of ' + letter.strokes.length),
      h('div', { class: 'game-choices' }, ...choices));
  }
  Promise.all([loadJson('data/letters/letters.json'), loadGameImages(ctx)]).then(([data, R]) => {
    if (!alive || !article.isConnected) return;
    deck = shuffled(buildArchDeck(data)); images = R;
    if (deck.length < 3) { status.textContent = 'Not enough source letter geometry.'; return; }
    paint();
  }).catch(() => { if (alive) status.textContent = 'Letter data unavailable.'; });
  return () => { alive = false; };
}
