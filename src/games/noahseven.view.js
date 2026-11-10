// The Seven Laws: the seven laws tradition says were given to all humanity through Noah.
// Match the Hebrew name to its meaning, then sort real-life scenes under the right law, then recall all seven.
import { mountArcade, choiceRow, randInt } from './arcade.js';
import { pickSeeded } from './arcade.model.js';
import { uiEnglish } from '../shell/names.js';
import { loadLaws, LAWS_NOTICE } from './laws.js';

export const STORE_KEY = 'games.noahseven.v1';

const SCENES = [
  { law: 1, en: 'Bowing to a statue and asking it for rain' }, { law: 1, en: 'Treating a lucky charm as a power that decides your fate' },
  { law: 2, en: 'Cursing the Name in anger' }, { law: 2, en: 'Mocking what is holy in order to wound' },
  { law: 3, en: 'Taking a life' }, { law: 3, en: 'Standing by while someone is killed when you could stop it' },
  { law: 4, en: 'Adultery' }, { law: 4, en: 'A relationship the Torah forbids within a family' },
  { law: 5, en: 'Taking a bicycle that is not yours' }, { law: 5, en: 'Keeping change the cashier gave by mistake' },
  { law: 6, en: 'Cutting meat from an animal that is still alive' }, { law: 6, en: 'Needless cruelty to an animal' },
  { law: 7, en: 'Setting up a fair court for a dispute' }, { law: 7, en: 'A judge who takes no bribes' },
];

const spec = {
  id: 'noahseven', title: 'The Seven Laws', titleHe: 'שֶׁבַע מִצְווֹת',
  blurb: 'Tradition counts seven laws given to all humanity after the flood: six things not to do and one thing to build. Learn their Hebrew names, sort real scenes under them, then recite all seven from memory.',
  howTo: ['Level 1: match each Hebrew name to its meaning.', 'Level 2: the other way round, English to Hebrew.', 'Level 3: a real-life scene appears; choose the law it falls under.', 'Levels 4 and 5: recall all seven in order with fewer and fewer hints.'],
  levels: [
    { name: 'Hebrew to meaning', mode: 'he2en', rounds: 7 },
    { name: 'Meaning to Hebrew', mode: 'en2he', rounds: 7 },
    { name: 'Scenes', mode: 'scene', rounds: 10 },
    { name: 'Recite with first letters', mode: 'recite', rounds: 7, hint: true },
    { name: 'Recite from memory', mode: 'recite', rounds: 7, hint: false },
  ],
  par: (l, cfg) => cfg.rounds * 10,
  seconds: (l, cfg) => 150,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd, ctx = A.ctx;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const big = A.h('div', { class: 'arc-big', lang: 'he', dir: 'rtl' });
  const row = A.h('div');
  const notice = A.h('p', { class: 'muted arc-foot' }, LAWS_NOTICE);
  A.board.replaceChildren(big, prompt, row, notice);
  let laws = [], n = 0, order = [];
  loadLaws(ctx).then((d) => { laws = d.noahide; order = cfg.mode === 'recite' ? laws.map((x) => x.n) : pickSeeded(laws.map((x) => x.n), laws.length, rnd); next(); }).catch(() => A.announce('The laws file did not load.'));
  const byN = (k) => laws.find((x) => x.n === k);
  const next = () => {
    if (n >= cfg.rounds) { A.finish({ won: true }); return; }
    n++;
    if (cfg.mode === 'he2en') {
      const law = byN(order[(n - 1) % 7]);
      big.textContent = law.he; prompt.textContent = `"${law.translit}": what is it? (${n} of ${cfg.rounds})`;
      row.replaceChildren(choiceRow(pickSeeded(laws, 4, rnd).filter((x) => x.n !== law.n).slice(0, 3).concat(law).sort(() => rnd() - 0.5), (o) => uiEnglish(ctx, o.en), (o) => grade(o.n === law.n, law)));
    } else if (cfg.mode === 'en2he') {
      const law = byN(order[(n - 1) % 7]);
      big.textContent = ''; prompt.textContent = `${uiEnglish(ctx, law.en)}: which Hebrew name? (${n} of ${cfg.rounds})`;
      row.replaceChildren(choiceRow(pickSeeded(laws.filter((x) => x.n !== law.n), 3, rnd).concat(law).sort(() => rnd() - 0.5), (o) => o.he, (o) => grade(o.n === law.n, law)));
    } else if (cfg.mode === 'scene') {
      const scene = SCENES[randInt(rnd, SCENES.length)]; const law = byN(scene.law);
      big.textContent = ''; prompt.textContent = `${uiEnglish(ctx, scene.en)}. Which law? (${n} of ${cfg.rounds})`;
      row.replaceChildren(choiceRow(pickSeeded(laws.filter((x) => x.n !== law.n), 3, rnd).concat(law).sort(() => rnd() - 0.5), (o) => A.h('span', {}, A.heSpan(o.he), ' ', A.h('small', {}, uiEnglish(ctx, o.en))), (o) => grade(o.n === law.n, law)));
    } else {
      const law = byN(n);
      big.textContent = cfg.hint ? law.he[0] + '…' : '?';
      prompt.textContent = `Law ${n} of 7${cfg.hint ? `: begins with ${law.he[0]}` : ''}. Which is it?`;
      row.replaceChildren(choiceRow(pickSeeded(laws, 7, rnd), (o) => A.h('span', {}, A.heSpan(o.he), ' ', A.h('small', {}, uiEnglish(ctx, o.en))), (o) => grade(o.n === law.n, law)));
    }
  };
  const grade = (ok, law) => {
    if (ok) { A.addScore(10); A.sfx('success'); A.sayFile(`laws/noah-${String(law.n).padStart(2, '0')}`); A.announce(`${law.he}, ${law.translit}: ${uiEnglish(ctx, law.gloss)}`); next(); }
    else { A.addScore(-3); A.sfx('miss'); A.miss(); A.announce(`Not that one. ${law.he} means ${uiEnglish(ctx, law.en.toLowerCase())}.`); }
    return ok;
  };
  A.setLives(0);
}

export const mount = mountArcade(spec, setup);
