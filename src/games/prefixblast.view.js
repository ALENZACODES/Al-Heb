// Game 10. Cast and production voices stay untouched.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, speak, resultsCard } from './engine.js';
import { loadGrammarData } from '../grammar/loader.js';
import { buildTopics } from '../grammar/model.js';
import { sfx } from '../audio/sfx.js';

export const STORE_KEY = 'games.prefixblast.v1';
export const PREFIXES = Object.freeze([
  { id: 'ה', name: 'ha-' }, { id: 'ב', name: 'be-' },
  { id: 'ל', name: 'le-' }, { id: 'ו', name: 've-' },
]);
export function buildPrefixDeck(data) {
  const topics = buildTopics(data);
  const nouns = new Set((data.words || []).filter(w => w.pos === 'noun' && !w.hidden).map(w => w.id));
  return [...topics.article.items.map(r => ({ ...r, prefix: 'ה' })), ...topics.prefixes.items]
    .filter(r => nouns.has(r.wordId) && r.he && r.baseHe && r.meaning && PREFIXES.some(p => p.id === r.prefix));
}
// A miss returns no phrase. Never concatenate a guessed prefix to a noun.
export function completePrefix(record, prefix) {
  return record && PREFIXES.some(p => p.id === prefix) && record.prefix === prefix ? record.he : null;
}
export function mount(root, ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive = true, deck = [], R = null, index = 0, session;
  const status = h('p', { role: 'status', 'aria-live': 'polite' }, 'Loading attested phrases…');
  const speechNote = h('p', { class: 'muted', 'data-speech': 'prefix' });
  const board = h('div', { class: 'game-board' });
  root.replaceChildren(h('article', { class: 'card game-card' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Bubble Pop Prefix Blast'),
    h('p', {}, 'Pop the prefix that gives the requested meaning. A miss leaves the phrase unfinished.'),
    h('p', { class: 'muted' }, 'Preview: corpus-attested study aid; native review pending.'), status, speechNote, board));
  function start() {
    session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: Math.min(8, deck.length) });
    deck = shuffled(deck).slice(0, 10); index = 0; paint();
  }
  function paint() {
    if (!alive) return;
    if (index >= deck.length) {
      status.textContent = 'Prefix round complete.';
      board.replaceChildren(resultsCard(h, heSpan, session, { title: 'Prefix round complete', onAgain: start }));
      return;
    }
    const r = deck[index];
    const image = imgOf(R, 'word', r.wordId);
    const stage = imgOf(R, 'id', 'GAME_prefix_blast_stage');
    const prompt = h('div', { class: 'prefix-pedestal' },
      heSpan(r.baseHe, 'he game-he'), h('p', {}, `Make: ${r.meaning}`));
    if (image) prompt.prepend(h('img', { class: 'game-card-img', src: image.src, alt: image.alt, 'data-img-id': image.id }));
    const bubbles = h('div', { class: 'prefix-bubbles' }, ...shuffled(PREFIXES).map(p => {
      const button = h('button', { type: 'button', class: 'prefix-bubble', onclick: () => {
        if (!alive || deck[index] !== r || button.disabled) return;
        sfx.play('bubble_pop');
        const phrase = completePrefix(r, p.id);
        if (!phrase) {
          button.disabled = true;
          session.answer(false);
          sfx.play('miss');
          status.textContent = `${p.name} does not make that phrase. It stays unfinished. Score ${session.score}.`;
          return;
        }
        session.answer(true);
        sfx.play('success');
        if (session.streak >= 3 && session.streak % 3 === 0) sfx.play('streak');
        index++;
        void speak(ctx, phrase, { onStatus: (m) => { speechNote.textContent = m; } });
        paint();
      } }, heSpan(p.id), h('span', {}, p.name));
      return button;
    }));
    const scene = h('div', { class: 'prefix-scene' }, bubbles, prompt);
    if (stage) scene.style.backgroundImage = `url("${stage.src}")`;
    board.replaceChildren(scene);
    status.textContent = `Phrase ${index + 1} of ${deck.length} · Score ${session.score} · Streak ${session.streak}`;
  }
  Promise.all([loadGrammarData(), loadGameImages(ctx)]).then(([data, images]) => {
    if (!alive) return;
    R = images; deck = buildPrefixDeck(data);
    if (!deck.length) { status.textContent = 'No usable attested prefix records available.'; return; }
    start();
  }).catch(() => { if (alive) status.textContent = 'Phrase data unavailable. Try again when online.'; });
  return () => { alive = false; try { ctx?.audio?.stop?.(); } catch { /* already gone */ } leaveSfx(); };
}
