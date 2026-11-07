// 613 Sorter: tradition counts 613 commandments, 248 "do" and 365 "do not". A sample of 48 well-known ones.
// Sort each into Do or Do Not, then match Hebrew keywords to meanings, then to the book of the Torah they come from.
import { mountArcade, choiceRow, randInt } from './arcade.js';
import { pickSeeded } from './arcade.model.js';
import { uiEnglish } from '../shell/names.js';
import { loadLaws, LAWS_NOTICE } from './laws.js';

export const STORE_KEY = 'games.mitzvot613.v1';

const BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy'];

const spec = {
  id: 'mitzvot613', title: '613 Sorter', titleHe: 'תַּרְיַ"ג מִצְווֹת',
  blurb: 'Tradition counts 613 commandments: 248 things to do and 365 things not to do. Here are 48 of the best known. Sort each into Do or Do Not, learn their Hebrew keywords, and find which book of the Torah each comes from.',
  howTo: ['Level 1: a mitzvah appears in English. Is it a Do (positive) or a Do Not (prohibition)? Tap or press ← →.', 'Level 2: the same, but you see only the Hebrew keyword.', 'Level 3: match Hebrew keyword to meaning.', 'Level 4: pick the book of the Torah the verse comes from. Level 5 mixes everything, fast.'],
  levels: [
    { name: 'Do or do not (English)', mode: 'sortEn', rounds: 16, perCard: 8 },
    { name: 'Do or do not (Hebrew)', mode: 'sortHe', rounds: 16, perCard: 8 },
    { name: 'Keyword to meaning', mode: 'match', rounds: 14, perCard: 15 },
    { name: 'Which book?', mode: 'book', rounds: 14, perCard: 15 },
    { name: 'Everything, fast', mode: 'mixed', rounds: 20, perCard: 6 },
  ],
  par: (l, cfg) => cfg.rounds * 10,
  seconds: (l, cfg) => Math.round(cfg.rounds * cfg.perCard) + 20,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd, ctx = A.ctx;
  const big = A.h('div', { class: 'arc-big', lang: 'he', dir: 'rtl' });
  const prompt = A.h('p', { class: 'arc-prompt' });
  const area = A.h('div');
  const tally = A.h('p', { class: 'muted arc-prompt' });
  A.board.replaceChildren(big, prompt, area, tally, A.h('p', { class: 'muted arc-foot' }, LAWS_NOTICE));
  let list = [], deck = [], n = 0, item = null, streak = 0;
  loadLaws(ctx).then((d) => { list = d.mitzvot; deck = pickSeeded(list, Math.min(cfg.rounds, list.length), rnd); next(); }).catch(() => A.announce('The laws file did not load.'));
  const grade = (ok, explain) => {
    if (ok) { streak++; A.addScore(10 + Math.min(streak - 1, 5) * 2); A.sfx(streak >= 5 ? 'streak' : 'success'); A.sayFile(`laws/mitzvah-${String(list.indexOf(item) + 1).padStart(2, '0')}`); A.announce(explain); }
    else { streak = 0; A.addScore(-3); A.sfx('miss'); A.miss(); A.announce(explain); }
    return ok;
  };
  const explainOf = (it) => `${it.he} (${it.translit}): ${uiEnglish(ctx, it.en)}. ${it.kind === 'positive' ? 'A Do' : 'A Do Not'}, ${it.source}.`;
  const next = () => {
    if (n >= deck.length) { A.finish({ won: true }); return; }
    item = deck[n++];
    const mode = cfg.mode === 'mixed' ? ['sortEn', 'sortHe', 'match', 'book'][randInt(rnd, 4)] : cfg.mode;
    tally.textContent = `${n} of ${deck.length} · streak ${streak}`;
    if (mode === 'sortEn' || mode === 'sortHe') {
      big.textContent = mode === 'sortHe' ? item.he : '';
      prompt.textContent = mode === 'sortHe' ? `"${item.translit}"` : uiEnglish(ctx, item.en);
      const doBtn = A.h('button', { type: 'button', class: 'arc-bin', 'aria-label': 'Do, a positive commandment (left arrow)', onclick: () => sort('positive') }, 'DO · עֲשֵׂה');
      const notBtn = A.h('button', { type: 'button', class: 'arc-bin', 'aria-label': 'Do not, a prohibition (right arrow)', onclick: () => sort('negative') }, 'DO NOT · לֹא תַעֲשֶׂה');
      area.replaceChildren(A.h('div', { class: 'arc-two' }, doBtn, notBtn));
    } else if (mode === 'match') {
      big.textContent = item.he; prompt.textContent = `"${item.translit}": which mitzvah?`;
      const opts = pickSeeded(list.filter((x) => x.he !== item.he), 3, rnd).concat(item).sort(() => rnd() - 0.5);
      area.replaceChildren(choiceRow(opts, (o) => uiEnglish(ctx, o.en), (o) => { const ok = grade(o.he === item.he, explainOf(item)); if (ok) next(); return ok; }));
    } else {
      big.textContent = item.he; prompt.textContent = `${uiEnglish(ctx, item.en)}: which book of the Torah is its verse in?`;
      const book = item.source.split(' ')[0];
      area.replaceChildren(choiceRow(BOOKS, (o) => o, (o) => { const ok = grade(o === book, explainOf(item)); if (ok) next(); return ok; }));
    }
  };
  const sort = (kind) => { grade(kind === item.kind, explainOf(item)); next(); };
  A.keys((k) => { if (area.querySelector('.arc-two')) { if (k === 'left') { sort('positive'); return true; } if (k === 'right') { sort('negative'); return true; } } return false; });
  A.setLives(0);
}

export const mount = mountArcade(spec, setup);
