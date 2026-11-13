// Antonym Tug-of-War — rapid opposite matching over a mud pit.
// Two teams pull a rope: a correct antonym pulls for you, a miss pulls for the other side. First side to drag the
// marker past its line wins; otherwise the closer side wins after 10 rounds.
//
// 600 numbered rounds: 300 opposite pairs (src/games/tugowar.bank.js, built from tools/games/tugowar-bank.psv), each
// played both ways. Rounds 1-100 are level 1, 101-200 level 2, ... 501-600 level 6. In each level the first 50 rounds ask
// "opposite of A?" and the next 50 ask the other way round, in a fixed shuffled order. A game is 10 rounds from any start
// the learner picks (number box, level buttons or "Surprise me"); the next start is remembered on this device.
//
// Pictures: 24 pairs use the indexed Opposites pictures (packs I and II plus the gap fills, resolver ids).
// Every other pair shows assets/games/tugowar/pairs/TUG_<key>.png once that file is pushed; until then the round is
// text-only (the picture removes itself, like the arcade art). Docs: docs/games/TUGOWAR-COMMANDS.md.

import { h, heSpan } from '../shell/ui.js';
import { createSession, loadGameImages, GAME_ENV, imgOf, pull, shuffled, resultsCard, speak } from './engine.js';
import { castEnvNode } from './cast-env.js';
import { sfx } from '../audio/sfx.js';
import { BANK } from './tugowar.bank.js';

export { BANK };

/** Best score, play count, last star rating. Device-local, listed on the privacy page. */
export const STORE_KEY = 'games.tugowar.v1';
/** Where the next game starts (round number 1-600). Device-local, listed on the privacy page. */
export const NEXT_KEY = 'games.tugowar.next.v1';
export const ROUND_COUNT = 600;
export const LEVEL_SIZE = 100;
export const GAME_ROUNDS = 10;
const PIC_BASE = 'assets/games/tugowar/pairs';

// The first twelve pairs, in the classic [hebrew, translit, gloss, oppositeHebrew, oppositeTranslit, oppositeGloss]
// shape with their picture id. They are rounds 1-12.
export const PAIRS = Object.freeze(BANK.slice(0, 12).map((b) => Object.assign([b[1], b[2], b[3], b[4], b[5], b[6]], { img: b[8].slice(3) })));

/** Small deterministic generator so the round order is the same on every device. */
function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

/** Round n (1-600) -> { n, level, pairIndex, reversed }. */
export const ROUNDS = Object.freeze((() => {
  const out = [];
  const perLevel = LEVEL_SIZE / 2;
  for (let level = 0; level < ROUND_COUNT / LEVEL_SIZE; level++) {
    const idx = Array.from({ length: perLevel }, (_, i) => level * perLevel + i);
    for (const i of idx) out.push({ pairIndex: i, reversed: false });
    for (const i of shuffled(idx, lcg(7 + level))) out.push({ pairIndex: i, reversed: true });
  }
  return out.map((r, i) => Object.freeze({ ...r, n: i + 1, level: Math.floor(i / LEVEL_SIZE) + 1 }));
})());

/** Clamp/wrap any number into a valid round number. */
export function normRound(n) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return 1;
  return ((((x - 1) % ROUND_COUNT) + ROUND_COUNT) % ROUND_COUNT) + 1;
}

/** Word side of a bank row: 0 = first word, 1 = its opposite. */
const side = (b, s) => (s === 0
  ? { he: b[1], tr: b[2], en: b[3], audio: b[9] }
  : { he: b[4], tr: b[5], en: b[6], audio: b[10] });
const form = (key) => (/_fpl$/.test(key) ? 'fpl' : /_pl$/.test(key) ? 'pl' : /_f$/.test(key) ? 'f' : 'base');

// Every word's set of accepted opposites, so a distractor can never be a second right answer.
const OPPOSITES = new Map();
for (const b of BANK) {
  if (!OPPOSITES.has(b[1])) OPPOSITES.set(b[1], new Set());
  if (!OPPOSITES.has(b[4])) OPPOSITES.set(b[4], new Set());
  OPPOSITES.get(b[1]).add(b[4]);
  OPPOSITES.get(b[4]).add(b[1]);
}

/**
 * The question for round n: prompt word, the right answer and two wrong choices of the same kind (same part of speech
 * and the same gender/number form when possible, so the ending never gives the answer away).
 */
export function buildRound(n, rnd = Math.random) {
  const r = ROUNDS[normRound(n) - 1];
  const b = BANK[r.pairIndex];
  const prompt = side(b, r.reversed ? 1 : 0);
  const answer = side(b, r.reversed ? 0 : 1);
  const bad = new Set([prompt.he, answer.he, ...(OPPOSITES.get(prompt.he) || [])]);
  const pool = (filter) => shuffled(BANK.filter((x) => x !== b && filter(x)), rnd)
    .map((x) => side(x, rnd() < 0.5 ? 0 : 1));
  const wrong = [];
  const take = (cands) => { for (const c of cands) { if (wrong.length >= 2) break; if (!bad.has(c.he)) { bad.add(c.he); wrong.push(c); } } };
  take(pool((x) => x[7] === b[7] && form(x[0]) === form(b[0])));
  if (wrong.length < 2) take(pool((x) => form(x[0]) === form(b[0])));
  if (wrong.length < 2) take(pool(() => true));
  return { n: r.n, level: r.level, reversed: r.reversed, key: b[0], pic: b[8], prompt, answer, choices: shuffled([answer, ...wrong], rnd), en: [b[3], b[6]] };
}

/** n distinct pairs drawn from a list (kept for callers that deal a random set). */
export function dealTugPairs(list, n, rnd = Math.random) {
  return shuffled(list, rnd).slice(0, Math.max(0, Math.min(n, list.length)));
}

export function mount(root, ctx) {
  const leaveSfx = sfx.enter(ctx);
  const store = ctx?.store;
  let session = createSession({ store, storeKey: STORE_KEY, par: 8 });
  let R = null;
  let pos = 0; // rope position: -1 (theirs) .. +1 (yours)
  let start = normRound(store?.get?.(NEXT_KEY)?.next ?? 1);
  let played = 0;
  let current = null;
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

  // Start anywhere: a round number, a level, or a surprise.
  const startInput = h('input', {
    type: 'number', min: '1', max: String(ROUND_COUNT), value: String(start), class: 'tug-start-input',
    id: 'tug-start', inputmode: 'numeric', 'aria-describedby': 'tug-start-help',
  });
  const levelBtns = Array.from({ length: ROUND_COUNT / LEVEL_SIZE }, (_, i) => h('button', {
    type: 'button', class: 'btn secondary tug-level', 'aria-label': `L${i + 1}: level ${i + 1}, rounds ${i * LEVEL_SIZE + 1} to ${(i + 1) * LEVEL_SIZE}`,
    onclick: () => begin(i * LEVEL_SIZE + 1),
  }, `L${i + 1}`));
  const picker = h('form', { class: 'tug-picker', onsubmit: (e) => { e.preventDefault(); begin(startInput.value); } },
    h('label', { for: 'tug-start' }, 'Start at round '), startInput,
    h('button', { type: 'submit', class: 'btn secondary' }, 'Go'),
    h('span', { class: 'tug-levels', role: 'group', 'aria-label': 'Jump to a level' }, ...levelBtns),
    h('button', { type: 'button', class: 'btn secondary', onclick: () => begin(1 + Math.floor(Math.random() * ROUND_COUNT)) }, 'Surprise me'),
    h('p', { class: 'muted tug-help', id: 'tug-start-help' }, `${ROUND_COUNT} rounds in ${ROUND_COUNT / LEVEL_SIZE} levels. Each game plays ${GAME_ROUNDS} rounds from where you start.`));

  function paintRope() { marker.style.insetInlineStart = `${50 + pos * 44}%`; }
  const roundNo = () => normRound(start + played);

  function saveNext(n) { try { store?.set?.(NEXT_KEY, { next: normRound(n) }); } catch { /* storage may be off */ } }

  function begin(n) {
    clearTimeout(timer);
    start = normRound(n);
    startInput.value = String(start);
    pos = 0; played = 0;
    session = createSession({ store, storeKey: STORE_KEY, par: 8 });
    nextRound();
  }

  function pictureNode(q) {
    if (q.pic.startsWith('id:')) {
      const img = imgOf(R, 'id', q.pic.slice(3));
      return img ? h('img', { class: 'game-card-img', src: img.src, alt: img.alt, width: img.width, height: img.height, 'data-img-id': img.id }) : null;
    }
    const el = h('img', { class: 'game-card-img', src: `${PIC_BASE}/${q.pic}.png`, alt: `${q.en[0]} and ${q.en[1]}`, width: 512, height: 512, loading: 'lazy', decoding: 'async', 'data-img-id': q.pic });
    el.addEventListener('error', () => el.remove());
    return el;
  }

  function nextRound() {
    if (played >= GAME_ROUNDS || Math.abs(pos) >= 1) return finish();
    const q = buildRound(roundNo());
    current = q;
    const hear = h('button', {
      type: 'button', class: 'btn ghost tug-hear', 'aria-label': `Hear ${q.prompt.tr}`,
      onclick: () => { void speak(ctx, q.prompt.he, { kind: 'word', id: q.prompt.audio || `tug-${q.key}-${q.reversed ? 2 : 1}` }); },
    }, '🔊');
    const nodes = [h('p', { class: 'game-prompt' }, 'Opposite of ', heSpan(q.prompt.he, 'he game-he'), ` (${q.prompt.tr}: ${q.prompt.en})? `, hear)];
    const pic = pictureNode(q);
    if (pic) nodes.push(pic);
    nodes.push(h('div', { class: 'game-choices' }, ...q.choices.map((c) => h('button', {
      type: 'button', class: 'btn secondary game-choice', onclick: () => answer(c),
    }, heSpan(c.he, 'he game-he-sm'), h('span', { class: 'muted' }, ` ${c.tr} · ${c.en}`)))));
    board.replaceChildren(...nodes);
    status.textContent = `Round ${played + 1} of ${GAME_ROUNDS} · #${q.n} of ${ROUND_COUNT} · Level ${q.level} · Score ${session.score} · Streak ${session.streak}`;
    paintRope();
  }

  function refreshPicture() {
    if (!current || !current.pic.startsWith('id:') || board.querySelector('.game-card-img')) return;
    const pic = pictureNode(current);
    const prompt = board.querySelector('.game-prompt');
    if (pic && prompt) prompt.after(pic);
  }

  function answer(choice) {
    if (!alive || !current) return;
    const q = current;
    const ok = choice.he === q.answer.he;
    current = null;
    played++;
    session.answer(ok);
    pos = pull(pos, ok ? 1 : -1, 0.14);
    sfx.play('tick');
    sfx.play(ok ? 'success' : 'miss');
    status.textContent = ok
      ? `Yes. ${q.prompt.he} × ${q.answer.he}. Your team pulls!`
      : `Not that one. The opposite of ${q.prompt.he} is ${q.answer.he} (${q.answer.tr}).`;
    paintRope();
    clearTimeout(timer);
    timer = setTimeout(() => { if (alive) nextRound(); }, ok ? 450 : 1100);
  }

  function finish() {
    const won = pos > 0;
    if (won) sfx.play('streak');
    const from = start;
    const next = normRound(start + played);
    saveNext(next);
    const card = resultsCard(h, heSpan, session, {
      title: won ? 'Your team wins the tug!' : 'Noa\'s team takes this one',
      onAgain: () => begin(from),
    });
    card.append(h('p', { class: 'muted' }, `You played rounds ${from} to ${normRound(from + played - 1)} of ${ROUND_COUNT}.`),
      h('button', { type: 'button', class: 'btn', onclick: () => begin(next) }, `Next ${GAME_ROUNDS} rounds (from #${next})`));
    board.replaceChildren(card);
    status.textContent = `Final rope: ${pos >= 0 ? '+' : ''}${pos.toFixed(2)} · ${session.correct} of ${session.rounds} right.`;
  }

  stage.append(ropeWrap, status, board);
  root.replaceChildren(
    h('article', { class: 'card game-card' },
      h('h1', { id: 'view-title', tabindex: '-1' }, 'Antonym Tug-of-War'),
      h('p', { class: 'muted' }, 'Match the Hebrew opposite. Every right answer pulls the rope your way; a miss pulls it theirs.'),
      picker, stage));
  paintRope();
  loadGameImages(ctx).then((r) => {
    if (!alive) return;
    R = r;
    const env = castEnvNode(h, R, 'tugowar', GAME_ENV.tugowar);
    if (env) stage.insertBefore(env, status);
    refreshPicture();
  });
  begin(start);
  return () => { alive = false; clearTimeout(timer); leaveSfx(); };
}
