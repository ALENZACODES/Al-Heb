// Parashah Path: the Torah is read in 54 weekly portions, each named for a word near its start.
// Learn which book each portion is in, read its Hebrew name, put runs of portions in order, and match opening words.
import { uiEnglish } from '../shell/names.js';
import { mountArcade, choiceRow } from './arcade.js';
import { loadData, loadVerse, tokens, showName, refText, BOOKS, bookEn, options, shuffle } from './tg-core.js';
import { host, track, numberKeys, grade, draftNote, ensureStyle, orderBoard } from './tg-ui.js';

export const STORE_KEY = 'games.tg-parashah.v1';
const ROUNDS = 10;

const spec = {
  id: 'tg-parashah', title: 'Parashah Path', titleHe: 'פָּרָשָׁה',
  blurb: 'Each week a portion of the Torah, a parashah, is read in the synagogue; over the year all five books are read through. Every portion is named for a word in its first verses. Learn where each one sits, from Bereshit to Vezot Haberakhah.',
  howTo: ['Level 1: a portion appears; pick its book.', 'Level 2: read the Hebrew name; pick the English one.', 'Level 3: tap five portions in their weekly order.', 'Level 4: which portion comes next? Hebrew only.', 'Level 5: the opening words of a portion; which one is it? Press 1 to 5 or tap.'],
  levels: [
    { name: 'Which book?', mode: 'book' },
    { name: 'Read the name', mode: 'name' },
    { name: 'Put five in order', mode: 'order', runs: 4, len: 5 },
    { name: 'What comes next?', mode: 'next' },
    { name: 'Opening words', mode: 'opening' },
  ],
  par: (l, cfg) => (cfg.mode === 'order' ? cfg.runs * cfg.len * 10 : ROUNDS * 10),
  seconds: (l) => (l === 5 ? 180 : 150),
  needsWords: false, needsLetters: false,
};

/** A run of `len` consecutive portions starting at a random place. */
export function run(parashot, len, rnd = Math.random) {
  const start = Math.floor(rnd() * (parashot.length - len + 1));
  return parashot.slice(start, start + len);
}

/** How many opening words to show so the portion's name word is on screen (at least six). */
export function openingLength(words, nameHe) {
  const first = tokens(nameHe)[0] || '';
  const at = words.findIndex((w) => w === first || w.replace(/[\u05C3\u05C0]$/, '') === first || w.startsWith(first));
  return Math.min(words.length, Math.max(6, at + 2));
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd, ctx = A.ctx;
  const big = A.h('div', { class: 'arc-big', lang: 'he', dir: 'rtl' });
  const prompt = A.h('p', { class: 'arc-prompt' });
  const area = A.h('div');
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'noa', 'One portion a week, the whole Torah in a year.'), big, prompt, area, after,
    draftNote(A, 'Order and books follow the app\'s Torah index. Hebrew names are copied from each portion\'s opening verse; a few appear there with a prefix or a shorter spelling, and the game says so.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  let list = [], books = [], n = 0, deck = [];
  const nameNote = (p) => (p.asInVerse ? ' (as written in its opening verse)' : '');
  const next = () => {
    if (n >= (cfg.mode === 'order' ? cfg.runs : ROUNDS)) { T.end({ won: true }); return; }
    n += 1; after.textContent = '';
    Promise.resolve(({ book, name, order, next: nextOne, opening })[cfg.mode]()).catch(() => A.announce('The verse did not load. Check the connection and press Start again.'));
  };
  const book = () => {
    const p = deck[n - 1];
    big.textContent = p.he; prompt.textContent = `Parashat ${p.en}${nameNote(p)}: which book is it in? (${n} of ${ROUNDS})`;
    area.replaceChildren(choiceRow(books, (b) => A.h('span', {}, A.h('span', { lang: 'he', dir: 'rtl' }, b.he), ` ${b.en}`), (b) => {
      const ok = b.id === p.book;
      grade(A, ok, { right: `${p.en} is portion ${p.num}, in ${bookEn(p.book)}.`, wrong: `Not ${b.en}.` });
      if (ok) T.later(900, next);
      return ok;
    }, { label: 'Books' }));
  };
  const name = () => {
    const p = deck[n - 1];
    big.textContent = p.he; prompt.textContent = `Which portion is this? (${n} of ${ROUNDS})${nameNote(p)}`;
    const near = list.filter((x) => x.book === p.book);
    area.replaceChildren(choiceRow(options(p, near, 4, rnd, (x) => x.id), (x) => A.h('span', { lang: 'en', dir: 'ltr' }, x.en), (x) => {
      const ok = x.id === p.id;
      grade(A, ok, { right: `${p.he} is ${p.en}, ${refText(p.ref)}.`, wrong: `That is not ${x.en}.` });
      if (ok) T.later(900, next);
      return ok;
    }, { label: 'Portions' }));
  };
  const order = () => {
    const items = run(list, cfg.len, rnd);
    big.textContent = ''; prompt.textContent = `Run ${n} of ${cfg.runs}: tap these portions in weekly order.`;
    area.replaceChildren(orderBoard(A, items, {
      rnd, shuffleFn: shuffle, label: 'Portions to order',
      render: (p, placed) => A.h('span', {}, A.h('span', { lang: 'he', dir: 'rtl', class: 'he' }, p.he), A.h('small', {}, placed ? `${p.num}. ${p.en}` : p.en)),
      onRight: (p) => grade(A, true, { right: `${p.num}: ${p.en}.` }),
      onWrong: (p, want) => grade(A, false, { wrong: `${p.en} comes later.` }),
      onDone: () => { A.addScore(10); T.later(900, next); },
    }));
  };
  const nextOne = () => {
    const p = deck[n - 1].num === 54 ? list[0] : deck[n - 1];
    const want = list[p.num];
    big.textContent = p.he; prompt.textContent = `Which portion comes after this one? (${n} of ${ROUNDS})`;
    area.replaceChildren(choiceRow(options(want, list.filter((x) => x.id !== p.id), 4, rnd, (x) => x.id), (x) => x.he, (x) => {
      const ok = x.id === want.id;
      grade(A, ok, { right: `${p.en}, then ${want.en} (${want.he}).`, wrong: `${x.he} (${x.en}) is portion ${x.num}.` });
      if (ok) T.later(900, next);
      return ok;
    }, { label: 'Portions' }));
  };
  const opening = async () => {
    const p = deck[n - 1];
    const v = await loadVerse(ctx, p.ref);
    if (!T.live()) return;
    const words = tokens(v.he);
    const upto = openingLength(words, p.he);
    big.textContent = showName(words.slice(0, upto).join(' ')) + (words.length > upto ? ' …' : '');
    prompt.textContent = `${refText(p.ref)}: this verse names a portion. Which one? (${n} of ${ROUNDS})`;
    const near = list.filter((x) => x.book === p.book);
    area.replaceChildren(choiceRow(options(p, near, 4, rnd, (x) => x.id), (x) => A.h('span', {}, A.h('span', { lang: 'he', dir: 'rtl' }, x.he), ` ${x.en}`), (x) => {
      const ok = x.id === p.id;
      grade(A, ok, { right: `${p.en}: its name, ${p.he}, is in this verse.`, wrong: `Not ${x.en}.` });
      if (ok) { after.textContent = `${refText(p.ref)}: ${uiEnglish(ctx, showName(v.en))}`; T.later(1500, next); }
      return ok;
    }, { label: 'Portions' }));
  };
  Promise.all([loadData(ctx, 'data/games/tg/parashot.json'), loadData(ctx, 'data/corpus/torah/index.json')]).then(([d, idx]) => {
    if (!T.live()) return;
    list = (d.parashot || []).slice().sort((a, b) => a.num - b.num);
    books = BOOKS.map((b) => ({ ...b, he: idx.books?.find((x) => x.id === b.id)?.he || '' }));
    deck = shuffle(list, rnd);
    next();
  }).catch(() => A.announce('The portions did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
