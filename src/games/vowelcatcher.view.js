// Shooting Star Vowel Catcher — catch the falling niqqud mark that turns
// the stage consonant into the target syllable. Isolates vowel recognition:
// the letter never changes inside a round, only the mark does.
//
// Play: move the letter (pointer drag, touch, or ←/→) under a falling star
// to catch it. The target is announced as text (and spoken when audio is
// available): "Make SHI — catch the hirik." Catching the named mark scores;
// any other mark bursts. 12 targets per game.
//
// Zero-dependency DOM + requestAnimationFrame; the loop self-terminates
// when the stage leaves the document, and mount returns a cleanup.

import { h, heSpan } from '../shell/ui.js';
import { createSession, speak, loadGameImages, imgOf, resultsCard } from './engine.js';
import { sfx } from '../audio/sfx.js';

/** Best score, play count, last star rating. Device-local, listed on the privacy page. */
export const STORE_KEY = 'games.vowelcatcher.v1';

// Curated game subset; actual letter and vowel data come from the authoritative JSON files.
// Unlike the old starter tables, these are IDs, not invented syllable readings.
const LETTER_IDS = Object.freeze(['shin', 'bet', 'kaf', 'mem', 'resh']);
const VOWEL_IDS = Object.freeze(['kamatz', 'patach', 'chirik', 'tzere', 'segol', 'kubutz', 'shva']);

/** Pure parsing: no network, DOM, or speech. Exported for isolated tests. */
export function buildVowelDeck(letters, niqqud) {
  const letterRows = Array.isArray(letters) ? letters : [];
  const vowelRows = Array.isArray(niqqud?.records) ? niqqud.records : [];
  const LETTERS = LETTER_IDS.map((id) => letterRows.find((row) => row.id === id))
    .filter((row) => row && typeof row.he === 'string' && row.he.length > 0)
    .map((row) => ({ id: row.id, glyph: row.he, name: row.name, img: { kind: 'letter', id: row.id, opts: { variant: 'print', role: 'mnemonic' } } }));
  const MARKS = VOWEL_IDS.map((id) => vowelRows.find((row) => row.id === id && row.kind === 'vowel'))
    .filter((row) => row && typeof row.shape === 'string' && row.shape.startsWith(row.base))
    .map((row) => {
      const point = row.shape.slice(row.base.length);
      // Shva has no single predictable spoken syllable; name the mark instead.
      return { id: row.id, name: row.name, point, glyph: '◌' + point,
        sound: row.israeliQuality, img: { kind: 'vowel', id: row.id, opts: { role: 'card' } },
        variants: Array.isArray(row.variants) ? row.variants : [] };
    }).filter((row) => row.point.length > 0);
  return { LETTERS, MARKS };
}

async function loadDeck(ctx) {
  const raw = ctx?.fetchFn || ctx?.fetch || globalThis.fetch?.bind(globalThis);
  if (typeof raw !== 'function') return { LETTERS: [], MARKS: [] };
  const json = async (url) => {
    const result = await raw(url);
    if (result?.ok === false) throw new Error('Data fetch failed: ' + url);
    return typeof result?.json === 'function' ? result.json() : result;
  };
  try {
    const [letters, niqqud] = await Promise.all([
      json('data/letters/letters.json'), json('data/pronunciation/niqqud.json'),
    ]);
    return buildVowelDeck(letters, niqqud);
  } catch { return { LETTERS: [], MARKS: [] }; }
}
const TARGETS_PER_GAME = 12;

// The router keeps the cleanup from the first mount. Play again mounts
// again on the same root, so the latest stop function has to be what that
// first cleanup calls.
const liveCleanup = new WeakMap();

export function mount(root, ctx) {
  liveCleanup.get(root)?.();
  const leaveSfx = sfx.enter(ctx);
  const session = createSession({ store: ctx?.store, storeKey: STORE_KEY, par: 9 });
  let LETTERS = [], MARKS = [], letter = null, R = null;
  let target = null; // current MARKS entry
  let targetsDone = 0;
  let basketX = 50; // percent
  let stars = []; // {el, mark, x, y, speed}
  let raf = 0, last = 0, spawnAt = 0;
  let alive = true;

  const announce = h('p', { class: 'game-status', role: 'status', 'aria-live': 'polite' });
  const sky = h('div', { class: 'catcher-sky' });
  const basket = h('div', { class: 'catcher-basket', 'aria-hidden': 'true' });
  const hud = h('div', { class: 'game-catcher-hud' });
  sky.append(basket);
  const board = h('div', { class: 'game-board' }, sky);

  function newTarget() {
    target = MARKS[Math.floor(Math.random() * MARKS.length)];
    targetsDone++;
    announce.replaceChildren(`Target ${targetsDone} of ${TARGETS_PER_GAME}: catch ${target.name} for `,
      heSpan(letter.glyph + target.point, 'he game-he-sm'), '.');
    speak(ctx, letter.glyph + target.point).catch(() => {});
  }

  function spawn(now) {
    const mark = MARKS[Math.floor(Math.random() * MARKS.length)];
    const image = imgOf(R, mark.img.kind, mark.img.id, mark.img.opts);
    const el = h('div', { class: 'catcher-star', 'aria-hidden': 'true' },
      image ? h('img', { class: 'game-catcher-mark-img', src: image.src, alt: '', width: 60, height: 60, 'data-img-id': image.id }) : heSpan(mark.glyph));
    const x = 6 + Math.random() * 88;
    sky.append(el);
    stars.push({ el, mark, x, y: -8, speed: 22 + Math.random() * 16 }); // %/s
    spawnAt = now + 650 + Math.random() * 500;
  }

  function step(ts) {
    if (!alive || !sky.isConnected) { alive = false; return; }
    const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
    if (ts >= spawnAt) spawn(ts);
    for (const s of [...stars]) {
      s.y += s.speed * dt;
      s.el.style.insetInlineStart = `${s.x}%`;
      s.el.style.top = `${s.y}%`;
      // catch zone: near the bottom, close to basket x
      if (s.y > 84 && s.y < 96 && Math.abs(s.x - basketX) < 9) {
        const ok = s.mark === target;
        session.answer(ok);
        sfx.play(ok ? 'catch' : 'miss');
        if (ok) sfx.play('collect');
        if (ok && session.streak >= 3 && session.streak % 3 === 0) sfx.play('streak');
        announce.replaceChildren(ok
          ? heSpan(letter.glyph + target.point, 'he game-he-sm')
          : `That was ${s.mark.name}. Catch ${target.name}.`,
          ...(ok ? [` — yes! ${session.correct} caught · Score ${session.score}`] : []));
        s.el.remove(); stars = stars.filter((x) => x !== s);
        if (ok) { if (targetsDone >= TARGETS_PER_GAME) return finish(); newTarget(); }
      } else if (s.y >= 100) { s.el.remove(); stars = stars.filter((x) => x !== s); }
    }
    raf = requestAnimationFrame(step);
  }

  function finish() {
    alive = false; cancelAnimationFrame(raf);
    board.replaceChildren(resultsCard(h, heSpan, session, {
      title: 'Star shower complete',
      onAgain: () => mount(root, ctx),
    }));
  }

  // controls: pointer + keys
  const move = (clientX) => {
    const r = sky.getBoundingClientRect();
    if (!r.width) return;
    basketX = Math.max(4, Math.min(96, ((clientX - r.left) / r.width) * 100));
    basket.style.insetInlineStart = `${basketX}%`;
  };
  const pointerMove = (e) => move(e.clientX);
  sky.addEventListener('pointermove', pointerMove);
  sky.addEventListener('pointerdown', pointerMove);
  const keys = (e) => {
    if (e.key === 'ArrowLeft') { basketX = Math.max(4, basketX - 6); basket.style.insetInlineStart = `${basketX}%`; }
    if (e.key === 'ArrowRight') { basketX = Math.min(96, basketX + 6); basket.style.insetInlineStart = `${basketX}%`; }
  };
  document.addEventListener('keydown', keys);
  basket.style.insetInlineStart = '50%';

  const article = h('article', { class: 'card game-card' },
      h('h1', { id: 'view-title', tabindex: '-1' }, 'Vowel Catcher'),
      h('p', { class: 'muted' }, 'Catch the named niqqud mark. Move with your finger, mouse, or arrow keys.'),
      hud, announce, board);
  root.replaceChildren(article);
  Promise.all([loadDeck(ctx), loadGameImages(ctx)]).then(([deck, images]) => {
    if (!alive || !article.isConnected) return;
    LETTERS = deck.LETTERS; MARKS = deck.MARKS; R = images;
    if (!LETTERS.length || !MARKS.length) {
      announce.textContent = 'Vowel data unavailable. Try again when the course data is loaded.';
      return;
    }
    letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    basket.replaceChildren(heSpan(letter.glyph));
    const picture = imgOf(R, letter.img.kind, letter.img.id, letter.img.opts);
    hud.replaceChildren(heSpan(letter.glyph, 'he game-he'),
      h('span', {}, letter.name),
      ...(picture ? [h('img', { class: 'game-catcher-letter-img', src: picture.src, alt: picture.alt,
        width: 76, height: 76, 'data-img-id': picture.id })] : []));
    newTarget();
    sfx.play('whoosh');
    raf = requestAnimationFrame(step);
  }).catch(() => { if (alive) announce.textContent = 'Vowel data unavailable.'; });
  const stop = () => {
    alive = false;
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', keys);
    sky.removeEventListener('pointermove', pointerMove);
    sky.removeEventListener('pointerdown', pointerMove);
    leaveSfx();
    if (liveCleanup.get(root) === stop) liveCleanup.delete(root);
  };
  liveCleanup.set(root, stop);
  return () => liveCleanup.get(root)?.();
}
