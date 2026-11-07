// Gender Split: nouns fly in; sort each to Ari's side (masculine, he) or Noa's side (feminine, she).
// Hebrew nouns have grammatical gender and it drives every adjective and verb around them.
import { mountArcade, randInt } from './arcade.js';
import { pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.gendersplit.v1';
const EXTRA_URL = new URL('../../data/games/arcade-extra.json', import.meta.url);

const spec = {
  id: 'gendersplit', title: 'Gender Split', titleHe: 'זָכָר אוֹ נְקֵבָה',
  blurb: 'Every Hebrew noun is he or she. Sort each word to Ari (masculine, זָכָר) or Noa (feminine, נְקֵבָה). Words ending in ה or ת are usually feminine, but the exceptions are where the points are.',
  howTo: ['A noun appears with its meaning.', 'Tap Ari (masculine) or Noa (feminine), or press ← for Ari and → for Noa.', 'The ending hint shows on the first two levels; later you decide from memory.', 'Twenty nouns per round; a streak multiplies points.'],
  levels: [
    { name: 'Common nouns, hints on', count: 16, hint: true, perCard: 7 },
    { name: 'More nouns, hints on', count: 20, hint: true, perCard: 6 },
    { name: 'Hints off', count: 20, hint: false, perCard: 5 },
    { name: 'Tricky endings', count: 22, hint: false, perCard: 5, tricky: true },
    { name: 'Fast, tricky', count: 26, hint: false, perCard: 3.5, tricky: true },
  ],
  par: (l, cfg) => cfg.count * 10,
  seconds: (l, cfg) => Math.round(cfg.count * cfg.perCard) + 10,
  needsLetters: false,
};

async function loadExtra(ctx) {
  const f = ctx?.fetchFn || ctx?.fetch || globalThis.fetch;
  const res = await f(EXTRA_URL);
  if (!res.ok) throw new Error(`could not load data/games/arcade-extra.json: HTTP ${res.status}`);
  return res.json();
}

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const he = A.h('div', { class: 'arc-big', lang: 'he', dir: 'rtl' });
  const en = A.h('p', { class: 'arc-prompt' });
  const bar = A.h('div', { class: 'arc-bar', 'aria-hidden': 'true' }, A.h('span', { style: 'width:100%' }));
  const ari = A.h('button', { type: 'button', class: 'arc-bin', 'aria-label': 'Masculine, Ari (left arrow)', onclick: () => answer('m') }, A.cast('ari-side', ''), 'Ari · זָכָר (he)');
  const noa = A.h('button', { type: 'button', class: 'arc-bin', 'aria-label': 'Feminine, Noa (right arrow)', onclick: () => answer('f') }, A.cast('noa-side', ''), 'Noa · נְקֵבָה (she)');
  A.board.replaceChildren(he, en, bar, A.h('div', { class: 'arc-two' }, ari, noa));
  let deck = [], n = 0, card = null, streak = 0, deadline = 0;
  const endsFem = (w) => /[הת]$/.test(w.he.replace(/[֑-ׇ]/g, ''));
  loadExtra(A.ctx).then((x) => {
    const m = x.gender.m, f = x.gender.f;
    let pool = [...m, ...f];
    if (cfg.tricky) { const tricky = pool.filter((w) => (w.gender === 'm') === endsFem(w)); pool = [...tricky, ...pickSeeded(pool.filter((w) => !tricky.includes(w)), Math.max(0, cfg.count - tricky.length), rnd)]; }
    deck = pickSeeded(pool, cfg.count, rnd);
    next();
  }).catch(() => A.announce('The noun list did not load.'));
  const next = () => {
    if (n >= deck.length) { A.finish({ won: true }); return; }
    card = deck[n++];
    he.textContent = card.he;
    en.textContent = `${card.en} · "${card.translit}"${cfg.hint ? (endsFem(card) ? ' · ends in ה/ת: usually she' : ' · no ה/ת ending: usually he') : ''} · ${n} of ${deck.length}`;
    deadline = Date.now() + cfg.perCard * 1000;
    A.sayWord(card);
  };
  const answer = (g) => {
    if (!card) return;
    if (g === card.gender) { streak++; const pts = 10 + Math.min(streak - 1, 5) * 2; A.addScore(pts); A.sfx(streak >= 5 ? 'streak' : 'tick'); A.announce(`${card.he} is ${g === 'm' ? 'masculine' : 'feminine'}.`); }
    else { streak = 0; A.addScore(-4); A.sfx('miss'); A.miss(); A.announce(`${card.he} (${card.en}) is ${card.gender === 'm' ? 'masculine, he' : 'feminine, she'}${(card.gender === 'm') === endsFem(card) ? ' — one of the exceptions.' : '.'}`); }
    next();
  };
  A.keys((k) => { if (k === 'left') { answer('m'); return true; } if (k === 'right') { answer('f'); return true; } return false; });
  if (!A.untimed) A.loop(() => { if (!card) return; const left = Math.max(0, deadline - Date.now()); bar.firstChild.style.width = `${(100 * left) / (cfg.perCard * 1000)}%`; if (left <= 0) { streak = 0; A.miss(); A.announce(`Too slow: ${card.he} is ${card.gender === 'm' ? 'masculine' : 'feminine'}.`); next(); } }, 100);
  A.setLives(0);
}

export const mount = mountArcade(spec, setup);
