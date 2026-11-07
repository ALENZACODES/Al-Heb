// Game 20 — point-to-unpointed cipher over source-verified corpus lines.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, resultsCard, roundStatus, loadGameImages, envNode, GAME_ENV } from './engine.js';
import { sfx } from '../audio/sfx.js';
import { loadJson } from '../grammar/loader.js';
import { stripPoints } from '../typing/typing.js';
export const STORE_KEY = 'games.ciphergrid.v1';
export function buildCipherDeck(registry) {
  return (registry?.entries || []).filter(r => r.id && r.he && r.status === 'verified' &&
    /public domain|copy without restriction/i.test(r.license || '') &&
    /[\u05B0-\u05C7]/u.test(r.he))
    .map(r => ({ id: r.id, he: r.he, unpointed: stripPoints(r.he), english: r.english, source: r.source }));
}
export function matchCipher(row, pointed) {
  return !!row && pointed === row.he && stripPoints(pointed) === row.unpointed;
}
export function mount(root, ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive = true, deck = [], round = 0, session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 6 });
  const status = h('p', { class: 'game-status', role: 'status', 'aria-live': 'polite' }, 'Loading source-aligned corpus…');
  const board = h('div', { class: 'game-board' });
  const article = h('article', { class: 'card game-card game-ciphergrid' },
    h('h1', { id: 'view-title' }, 'Cipher Decryption Grid'),
    h('p', {}, 'Find the authentic pointed form of this unpointed corpus line.'), status, board);
  root.replaceChildren(article);
  // The cipher-desk backdrop made for this game (approved art, decorative
  // only — never a cue). A missing picture leaves the page as it was.
  loadGameImages(ctx).then((R) => {
    if (!alive) return;
    const env = envNode(h, R, GAME_ENV.ciphergrid);
    if (env) article.insertBefore(env, status);
  }).catch(() => {});
  function paint(feedback) {
    if (!alive || !article.isConnected) return;
    if (round >= 8) {
      roundStatus(status, '', 'Cipher deciphered.');
      board.replaceChildren(resultsCard(h, heSpan, session, { title: 'Cipher deciphered', onAgain: () => {
      round = 0; session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 6 }); paint();
    } })); return; }
    const row = deck[round % deck.length];
    const other = shuffled(deck.filter(r => r.id !== row.id && r.unpointed !== row.unpointed)).slice(0, 2);
    if (other.length < 2) { status.textContent = 'Not enough distinct corpus lines.'; return; }
    roundStatus(status, feedback, `Line ${round + 1} of 8: choose the pointed source.`);
    // No manuscript asset ID exists in this index: the prompt stage itself stays text-only (the scene above the status line is a backdrop, not a cue).
    const prompt = h('div', { class: 'game-cipher-prompt' }, heSpan(row.unpointed, 'he game-he'));
    const options = shuffled([row, ...other]).map(opt => h('button', {
      type: 'button', class: 'btn secondary game-choice', onclick: () => {
        const ok = matchCipher(row, opt.he); session.answer(ok); sfx.play(ok ? 'success' : 'miss');
        if (ok) { round++; paint(); }
        else paint('Those points do not match this source line.');
      } }, heSpan(opt.he, 'he game-he-sm')));
    board.replaceChildren(prompt, h('div', { class: 'game-choices game-rtl-grid', dir: 'rtl' }, ...options));
  }
  loadJson('data/corpus/registry.json').then((data) => {
    if (!alive || !article.isConnected) return;
    deck = shuffled(buildCipherDeck(data));
    if (deck.length < 8) { status.textContent = 'Insufficient verified-source corpus text.'; return; }
    paint();
  }).catch(() => { if (alive) status.textContent = 'Corpus unavailable.'; });
  return () => { alive = false; leaveSfx(); };
}
