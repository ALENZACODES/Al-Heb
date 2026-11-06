// Antonym Tug-of-War — rapid opposite matching over a mud pit.
// Two teams pull a rope: a correct antonym pulls for you, a miss pulls
// for the other side. First side to drag the marker past its line wins;
// otherwise the closer side wins after 10 rounds.
//
// Images: the header band shows OPP_two_04 (sapling vs old olive tree —
// young/old, the game's own first pair). Per-card pictures resolve through
// the games engine when the QB lane fills PAIRS[].img with real index ids
// (kind 'id'); a card with no picture falls back to the large Hebrew word,
// so the game is fully playable today and gets richer as images land.
// Data: PAIRS is the starter set; the production wiring swaps it for the
// opposites rows of data/vocab + theme packs (see the registry brief).

import { h, heSpan } from '../shell/ui.js';
import { createSession, loadGameImages, imgOf, pull, pick, resultsCard } from './engine.js';

/** Best score, play count, last star rating. Device-local, listed on the privacy page. */
export const STORE_KEY = 'games.tugowar.v1';

// [hebrew, transliteration, gloss, oppositeHebrew, oppositeTranslit, oppositeGloss]
export const PAIRS = Object.freeze([
  ['גָּדוֹל', 'gadol', 'big', 'קָטָן', 'katan', 'small'],
  ['חַם', 'cham', 'hot', 'קַר', 'kar', 'cold'],
  ['לָבָן', 'lavan', 'white', 'שָׁחֹר', 'shachor', 'black'],
  ['גָּבוֹהַּ', 'gavoha', 'tall / high', 'נָמוּךְ', 'namukh', 'low'],
  ['מָהִיר', 'mahir', 'fast', 'אִטִּי', 'iti', 'slow'],
  ['יָקָר', 'yakar', 'expensive', 'זוֹל', 'zol', 'cheap'],
  ['חָזָק', 'chazak', 'strong', 'חַלָּשׁ', 'chalash', 'weak'],
  ['שָׂמֵחַ', 'sameach', 'happy', 'עָצוּב', 'atzuv', 'sad'],
  ['יָשָׁן', 'yashan', 'old (thing)', 'חָדָשׁ', 'chadash', 'new'],
  ['קָרוֹב', 'karov', 'near', 'רָחוֹק', 'rachok', 'far'],
  ['מָלֵא', 'male', 'full', 'רֵיק', 'reik', 'empty'],
  ['אוֹר', 'or', 'light', 'חֹשֶׁךְ', 'choshekh', 'darkness'],
]);

const ROUNDS = 10;

export function mount(root, ctx) {
  const session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 8 });
  let R = null;
  let pos = 0; // rope position: -1 (theirs) .. +1 (yours)
  let round = 0;
  let current = null; // {pair, choices, answer}
  let timer = 0;
  let alive = true;

  const stage = h('div', { class: 'game-stage tug' });
  const status = h('p', { class: 'game-status', role: 'status', 'aria-live': 'polite' }, 'Pull the rope: match the opposite.');
  const ropeWrap = h('div', { class: 'tug-track', 'aria-hidden': 'true' },
    h('span', { class: 'tug-team tug-you' }, 'YOU'),
    h('div', { class: 'tug-rope' }, h('span', { class: 'tug-marker' }, '◆')),
    h('span', { class: 'tug-team tug-them' }, 'NOA'));
  const marker = ropeWrap.querySelector('.tug-marker');
  const board = h('div', { class: 'game-board' });

  function paintRope() { marker.style.insetInlineStart = `${50 + pos * 44}%`; }

  function nextRound() {
    round++;
    if (round > ROUNDS || Math.abs(pos) >= 1) return finish();
    const pair = PAIRS[(round - 1) % PAIRS.length];
    const wrongs = pick(PAIRS.filter((p) => p !== pair), 2);
    const choices = [pair, ...wrongs];
    // present choices shuffled but deterministically per round render
    const order = [0, 1, 2].sort(() => 0.5 - Math.random());
    current = { pair, answer: pair };
    const img = imgOf(R, 'id', pair.img);
    // replaceChildren stringifies a null child as the text "null", so omit the picture node.
    const nodes = [h('p', { class: 'game-prompt' }, 'Opposite of ', heSpan(pair[0], 'he game-he'), ` (${pair[1]} — ${pair[2]})?`)];
    if (img) nodes.push(h('img', { class: 'game-card-img', src: img.src, alt: img.alt, width: img.width, height: img.height }));
    nodes.push(h('div', { class: 'game-choices' }, ...order.map((i) => {
      const c = choices[i];
      return h('button', { type: 'button', class: 'btn secondary game-choice', onclick: () => answer(c) },
        heSpan(c[3], 'he game-he-sm'), h('span', { class: 'muted' }, ` ${c[4]} · ${c[5]}`));
    })));
    board.replaceChildren(...nodes);
    status.textContent = `Round ${round} of ${ROUNDS} · Score ${session.score} · Streak ${session.streak}`;
    paintRope();
  }

  function answer(choice) {
    if (!alive || !current) return;
    const pair = current.pair;
    const ok = choice === current.answer;
    current = null;
    session.answer(ok);
    pos = pull(pos, ok ? 1 : -1, 0.14);
    status.textContent = ok ? `Yes — ${pair[0]} × ${pair[3]}. Your team pulls!` : `Not that one. The opposite of ${pair[0]} is ${pair[3]}.`;
    paintRope();
    clearTimeout(timer);
    timer = setTimeout(() => { if (alive) nextRound(); }, ok ? 450 : 1100);
  }

  function finish() {
    const won = pos > 0;
    board.replaceChildren(resultsCard(h, heSpan, session, {
      title: won ? 'Your team wins the tug!' : 'Noa\'s team takes this one',
      onAgain: () => { pos = 0; round = 0; nextRound(); },
    }));
    status.textContent = `Final rope: ${pos >= 0 ? '+' : ''}${pos.toFixed(2)} · ${session.correct} of ${session.rounds} right.`;
  }

  root.replaceChildren(
    h('article', { class: 'card game-card' },
      h('h1', { id: 'view-title', tabindex: '-1' }, 'Antonym Tug-of-War'),
      h('p', { class: 'muted' }, 'Match the Hebrew opposite. Every right answer pulls the rope your way; a miss pulls it theirs.'),
      ropeWrap, status, board));
  paintRope();
  loadGameImages(ctx).then((r) => { if (alive) R = r; });
  nextRound();
  return () => { alive = false; clearTimeout(timer); };
}
