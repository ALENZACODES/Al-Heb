// Antonym Tug-of-War — rapid opposite matching over a mud pit.
// Two teams pull a rope: a correct antonym pulls for you, a miss pulls
// for the other side. First side to drag the marker past its line wins;
// otherwise the closer side wins after 10 rounds.
//
// Images are indexed Opposites pictures: packs I and II, plus the five gap fills.
// Old/new stays on OPP_two_05. Every pair has an img id.

import { h, heSpan } from '../shell/ui.js';
import { createSession, loadGameImages, imgOf, pull, pick, shuffled, resultsCard } from './engine.js';
import { sfx } from '../audio/sfx.js';

/** Best score, play count, last star rating. Device-local, listed on the privacy page. */
export const STORE_KEY = 'games.tugowar.v1';

// [hebrew, transliteration, gloss, oppositeHebrew, oppositeTranslit, oppositeGloss]
export const PAIRS = Object.freeze([
  Object.assign(['גָּדוֹל', 'gadol', 'big', 'קָטָן', 'katan', 'small'], { img: 'OPP_one_01' }),
  Object.assign(['חַם', 'cham', 'hot', 'קַר', 'kar', 'cold'], { img: 'OPP_two_01' }),
  Object.assign(['לָבָן', 'lavan', 'white', 'שָׁחֹר', 'shachor', 'black'], { img: 'OPP_gap_white_black' }),
  Object.assign(['גָּבוֹהַּ', 'gavoha', 'tall / high', 'נָמוּךְ', 'namukh', 'low'], { img: 'OPP_one_02' }),
  Object.assign(['מָהִיר', 'mahir', 'fast', 'אִטִּי', 'iti', 'slow'], { img: 'OPP_two_02' }),
  Object.assign(['יָקָר', 'yakar', 'expensive', 'זוֹל', 'zol', 'cheap'], { img: 'OPP_gap_expensive_cheap' }),
  Object.assign(['חָזָק', 'chazak', 'strong', 'חַלָּשׁ', 'chalash', 'weak'], { img: 'OPP_gap_strong_weak' }),
  Object.assign(['שָׂמֵחַ', 'sameach', 'happy', 'עָצוּב', 'atzuv', 'sad'], { img: 'OPP_gap_happy_sad' }),
  Object.assign(['יָשָׁן', 'yashan', 'old (thing)', 'חָדָשׁ', 'chadash', 'new'], { img: 'OPP_two_05' }),
  Object.assign(['קָרוֹב', 'karov', 'near', 'רָחוֹק', 'rachok', 'far'], { img: 'OPP_gap_near_far' }),
  Object.assign(['מָלֵא', 'male', 'full', 'רֵיק', 'reik', 'empty'], { img: 'OPP_one_08' }),
  Object.assign(['אוֹר', 'or', 'light', 'חֹשֶׁךְ', 'choshekh', 'darkness'], { img: 'OPP_two_03' }),
]);

const ROUNDS = 10;

/** Ten rounds drawn from the whole pair list, so the last pairs are not stuck off-screen. */
export function dealTugPairs(pairs, rounds = ROUNDS, rnd = Math.random) {
  return shuffled(pairs, rnd).slice(0, Math.min(rounds, pairs.length));
}

export function mount(root, ctx) {
  const leaveSfx = sfx.enter(ctx);
  const session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 8 });
  let R = null;
  let pos = 0; // rope position: -1 (theirs) .. +1 (yours)
  let round = 0;
  let current = null; // {pair, choices, answer}
  let timer = 0;
  let alive = true;
  let paused = false;
  const deck = dealTugPairs(PAIRS, ROUNDS);

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
    const pair = deck[(round - 1) % deck.length];
    const wrongs = pick(PAIRS.filter((p) => p !== pair), 2);
    const choices = [pair, ...wrongs];
    // present choices shuffled but deterministically per round render
    const order = [0, 1, 2].sort(() => 0.5 - Math.random());
    current = { pair, answer: pair };
    const img = imgOf(R, 'id', pair.img);
    // replaceChildren stringifies a null child as the text "null", so omit the picture node.
    const nodes = [h('p', { class: 'game-prompt' }, 'Opposite of ', heSpan(pair[0], 'he game-he'), ` (${pair[1]} — ${pair[2]})?`)];
    if (img) nodes.push(h('img', { class: 'game-card-img', src: img.src, alt: img.alt, width: img.width, height: img.height, 'data-img-id': img.id }));
    nodes.push(h('div', { class: 'game-choices' }, ...order.map((i, n) => {
      const c = choices[i];
      return h('button', { type: 'button', class: 'btn secondary game-choice', 'data-choice': String(n + 1), onclick: () => answer(c) },
        h('span', { class: 'muted' }, `${n + 1}. `), heSpan(c[3], 'he game-he-sm'), h('span', { class: 'muted' }, ` ${c[4]} · ${c[5]}`));
    })));
    board.replaceChildren(...nodes);
    status.textContent = `Round ${round} of ${ROUNDS} · Score ${session.score} · Streak ${session.streak}`;
    paintRope();
  }

  function nextRoundImage() {
    const picture = current && imgOf(R, 'id', current.pair.img);
    if (!picture || board.querySelector('.game-card-img')) return;
    const prompt = board.querySelector('.game-prompt');
    if (prompt) prompt.after(h('img', {
      class: 'game-card-img', src: picture.src, alt: picture.alt,
      width: picture.width, height: picture.height, 'data-img-id': picture.id,
    }));
  }

  function answer(choice) {
    if (!alive || !current) return;
    const pair = current.pair;
    const ok = choice === current.answer;
    current = null;
    session.answer(ok);
    pos = pull(pos, ok ? 1 : -1, 0.14);
    sfx.play('tick');
    sfx.play(ok ? 'success' : 'miss');
    status.textContent = ok ? `Yes — ${pair[0]} × ${pair[3]}. Your team pulls!` : `Not that one. The opposite of ${pair[0]} is ${pair[3]}.`;
    paintRope();
    clearTimeout(timer);
    timer = setTimeout(() => { if (alive && !paused) nextRound(); }, ok ? 450 : 1100);
  }

  function togglePause() {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    pauseBtn.setAttribute('aria-pressed', String(paused));
    if (!paused && alive && !current && round > 0 && round <= ROUNDS && Math.abs(pos) < 1) nextRound();
  }
  const pauseBtn = h('button', { type: 'button', class: 'btn secondary', 'aria-pressed': 'false', onclick: togglePause }, 'Pause');
  const onKey = (e) => {
    if (!alive || paused) return;
    if (!/^[123]$/.test(e.key)) return;
    const tag = e.target?.tagName || '';
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    const button = board.querySelector(`[data-choice="${e.key}"]`);
    if (!button) return;
    e.preventDefault();
    button.click();
  };
  document.addEventListener('keydown', onKey);

  function finish() {
    const won = pos > 0;
    if (won) sfx.play('streak');
    board.replaceChildren(resultsCard(h, heSpan, session, {
      title: won ? 'Your team wins the tug!' : 'Noa\'s team takes this one',
      onAgain: () => { pos = 0; round = 0; nextRound(); },
    }));
    status.textContent = `Final rope: ${pos >= 0 ? '+' : ''}${pos.toFixed(2)} · ${session.correct} of ${session.rounds} right.`;
  }

  root.replaceChildren(
    h('article', { class: 'card game-card' },
      h('h1', { id: 'view-title', tabindex: '-1' }, 'Antonym Tug-of-War'),
      h('p', { class: 'muted' }, 'Match the Hebrew opposite. Every right answer pulls the rope your way; a miss pulls it theirs. Keys 1, 2 and 3 choose.'),
      ropeWrap, h('div', { class: 'row' }, pauseBtn), status, board));
  paintRope();
  loadGameImages(ctx).then((r) => { if (alive) { R = r; if (current) nextRoundImage(); } });
  nextRound();
  return () => { alive = false; clearTimeout(timer); document.removeEventListener('keydown', onKey); try { ctx?.audio?.stop?.(); } catch { /* already gone */ } leaveSfx(); };
}
