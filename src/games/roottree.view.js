// Game 16 — cultivated branches are sourced only from recorded root families.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, resultsCard, roundStatus } from './engine.js';
import { sfx } from '../audio/sfx.js';
import { loadJson } from '../grammar/loader.js';
export const STORE_KEY = 'games.roottree.v1';
export function buildRootDeck(data) {
  return (data?.families || []).map(f => ({
    root: f.root, words: (f.words || []).filter(w => w.id && w.he && w.pos === 'verb' && w.binyan && !w.needsReview)
  })).filter(f => f.root && f.words.length >= 2);
}
export function isRootLeaf(family, word) { return !!word?.id && !!family?.words?.some(w => w.id === word.id); }
export function mount(root, ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive = true, deck = [], R = null, round = 0;
  let session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 6 });
  const status = h('p', { role: 'status', class: 'game-status', 'aria-live': 'polite' }, 'Loading root families…');
  const board = h('div', { class: 'game-board' });
  const article = h('article', { class: 'card game-card game-roottree' },
    h('h1', { id: 'view-title' }, 'Hebrew Root Tree Cultivator'),
    h('p', {}, 'Grow a branch only with a verb listed under the displayed Hebrew root.'),
    h('p', { class: 'muted' }, 'Family assignments are dictionary-derived and await Hebrew-editor review.'), status, board);
  root.replaceChildren(article);
  function paint(feedback) {
    if (!alive || !article.isConnected) return;
    if (round >= 8) {
      roundStatus(status, '', 'Root orchard complete.');
      board.replaceChildren(resultsCard(h, heSpan, session, { title: 'Root orchard complete', onAgain: () => {
        round = 0; session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 6 }); paint();
      } }));
      return;
    }
    const family = deck[round % deck.length];
    const correct = shuffled(family.words)[0];
    const distractor = shuffled(deck.filter(f => f !== family).flatMap(f => f.words)).find(w => !isRootLeaf(family, w));
    if (!distractor) { status.textContent = 'No distinct derivative distractor in source data.'; return; }
    roundStatus(status, feedback, `Root ${round + 1} of 8: choose a documented derivative.`);
    const buttons = shuffled([correct, distractor]).map(w => {
      const image = imgOf(R, 'word', w.id);
      const choice = h('button', { type: 'button', class: 'btn secondary game-choice', onclick: () => {
        if (!alive) return;
        const ok = isRootLeaf(family, w);
        session.answer(ok); sfx.play(ok ? 'success' : 'miss');
        if (ok) { round++; paint(); }
        else paint('Not in this documented root family.');
      } }, heSpan(w.he, 'he game-he-sm'), h('span', {}, w.binyan));
      if (image) choice.append(h('img', { class: 'game-card-img', src: image.src, alt: image.alt,
        width: image.width, height: image.height, 'data-img-id': image.id }));
      return choice;
    });
    board.replaceChildren(h('div', { class: 'game-root-branch' }, heSpan(family.root, 'he game-he')),
      h('p', {}, 'Pick the true derivative for this root.'), h('div', { class: 'game-choices' }, ...buttons));
  }
  Promise.all([loadJson('data/roots/families.json'), loadGameImages(ctx)]).then(([data, images]) => {
    if (!alive || !article.isConnected) return;
    deck = shuffled(buildRootDeck(data)); R = images;
    if (deck.length < 2) { status.textContent = 'Not enough source root families; no round started.'; return; }
    paint();
  }).catch(() => { if (alive) status.textContent = 'Root records unavailable.'; });
  return () => { alive = false; leaveSfx(); };
}
