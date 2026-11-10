// Game 17 — plural bridge: only the source-attested plural completes the span.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, envNode, GAME_ENV, imgOf, resultsCard, roundStatus } from './engine.js';
import { sfx } from '../audio/sfx.js';
import { loadJson } from '../grammar/loader.js';
export const STORE_KEY = 'games.letterbridge.v1';
export const pluralSuffix = (text) => String(text || '').normalize('NFD').replace(/[\u0591-\u05C7]/gu, '').endsWith('ים') ? 'im'
  : String(text || '').normalize('NFD').replace(/[\u0591-\u05C7]/gu, '').endsWith('ות') ? 'ot' : null;
export function buildBridgeDeck(families) {
  const seen = new Set(), rows = [];
  for (const f of families?.families || []) for (const word of f.words || []) {
    const plural = word?.forms?.plural;
    if (word.pos !== 'noun' || !word.he || !plural || word.needsReview || seen.has(word.id)) continue;
    const joint = pluralSuffix(plural);
    if (!joint) continue;
    seen.add(word.id); rows.push({ id: word.id, singular: word.he, plural, gloss: word.en, joint });
  }
  return rows;
}
export function bridgeHolds(row, joint) { return !!row && row.joint === joint; }
export function mount(root, ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive = true, deck = [], images = null, round = 0, locked = false, nextTimer = 0;
  let session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 6 });
  const status = h('p', { class: 'game-status', role: 'status', 'aria-live': 'polite' }, 'Loading documented plural forms…');
  const board = h('div', { class: 'game-board' });
  const article = h('article', { class: 'card game-card game-letterbridge' },
    h('h1', { id: 'view-title' }, 'Letter Bridge Builder'),
    h('p', {}, 'Connect the singular noun to its source-attested plural ending. Wrong joints sag and break.'), status, board);
  root.replaceChildren(article);
  // The stone-bridge backdrop made for this game (approved art, decorative only —
  // never a word cue). A missing picture leaves the page as it was.
  loadGameImages(ctx).then((R) => {
    if (!alive) return;
    const env = envNode(h, R, GAME_ENV.letterbridge);
    if (env) article.insertBefore(env, status);
  }).catch(() => {});
  function paint(feedback) {
    if (!alive || !article.isConnected) return;
    if (round >= 8) {
      roundStatus(status, '', 'Bridge complete.');
      board.replaceChildren(resultsCard(h, heSpan, session, { title: 'Bridge complete', onAgain: () => {
        clearTimeout(nextTimer); round = 0; locked = false;
        session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 6 }); paint();
      } }));
      return;
    }
    const broken = feedback === 'Mismatched joint: bridge collapses. This attempt is over.';
    roundStatus(status, feedback, `Noun ${round + 1} of 8: choose the attested plural joint.`);
    const r = deck[round % deck.length], picture = imgOf(images, 'word', r.id);
    const entry = h('div', { class: 'game-bridge-entry' }, heSpan(r.singular, 'he game-he'), h('p', {}, r.gloss));
    if (picture) entry.append(h('img', { class: 'game-card-img', src: picture.src, alt: picture.alt,
      width: picture.width, height: picture.height, 'data-img-id': picture.id }));
    const span = h('div', { class: 'game-bridge-span' + (broken ? ' game-bridge-broken' : '') }, '╞════╡');
    const options = ['im','ot'].map(joint => h('button', { type: 'button', class: 'btn secondary game-choice', onclick: () => {
      if (!alive || locked) return;
      locked = true;
      const ok = bridgeHolds(r, joint); session.answer(ok); sfx.play(ok ? 'success' : 'miss');
      if (!ok) {
        span.classList.add('game-bridge-broken');
        board.querySelectorAll('button.game-choice').forEach(b => { b.disabled = true; });
        paint('Mismatched joint: bridge collapses. This attempt is over.');
        nextTimer = setTimeout(() => { if (!alive) return; round++; locked = false; paint(); }, 750);
        return;
      }
      round++; locked = false; paint();
    } }, joint === 'im' ? heSpan('־ים') : heSpan('־ות')));
    board.replaceChildren(entry, span, h('p', {}, 'Which joint is present in the attested plural?'),
      h('div', { class: 'game-choices' }, ...options));
  }
  Promise.all([loadJson('data/roots/families.json'), loadGameImages(ctx)]).then(([data, R]) => {
    if (!alive || !article.isConnected) return;
    deck = shuffled(buildBridgeDeck(data)); images = R;
    if (deck.length < 8) { status.textContent = 'Insufficient sourced plural nouns.'; return; }
    paint();
  }).catch(() => { if (alive) status.textContent = 'Plural records unavailable.'; });
  return () => { alive = false; clearTimeout(nextTimer); leaveSfx(); };
}
