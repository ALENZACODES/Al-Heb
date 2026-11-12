// Count the Lights: count the candles or the gelt and pick the Hebrew number. Counting words are the masculine forms
// (אֶחָד, שְׁנַיִם, שְׁלוֹשָׁה ...) because נֵר (candle) and מַטְבֵּעַ (coin) are masculine nouns: שְׁלוֹשָׁה נֵרוֹת, three candles.
import { mountHanukkahArcade, byKey } from './hanukkah-shell.js';
import { randInt } from './arcade.js';
import { pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.hanukkah-count.v1';

/** Pure: n distinct choices including the answer, drawn from 1..max. */
export function numberChoices(answer, max, n, rnd = Math.random) {
  const others = pickSeeded(Array.from({ length: max }, (_, i) => i + 1).filter((x) => x !== answer), n - 1, rnd);
  return pickSeeded([answer, ...others], n, rnd);
}

const spec = {
  id: 'hanukkah-count', title: 'Count the Lights', titleHe: 'כַּמָּה נֵרוֹת',
  blurb: 'Noa lights candles and Ari drops gelt on the table. Count them and pick the number in Hebrew.',
  howTo: ['Count the candles or the coins.', 'Pick the Hebrew number word. Level 1 also shows the digit and how to say it.', 'Ten questions a round; a wrong pick costs a life.', 'Level 4 counts the shamash too: the eighth night has nine flames.'],
  levels: [
    { name: 'One to three, with digits', max: 3, choices: 3, digits: true, translit: true },
    { name: 'One to five', max: 5, choices: 3, digits: false, translit: true },
    { name: 'One to eight, Hebrew only', max: 8, choices: 4, digits: false, translit: false },
    { name: 'Nights with the shamash', max: 8, choices: 4, digits: false, translit: false, shamash: true },
    { name: 'One to nine, fast', max: 9, choices: 4, digits: false, translit: false },
  ],
  par: () => 90,
  seconds: (l) => 100 - l * 8,
};

function setup(A, data) {
  const cfg = A.cfg, rnd = A.rnd, h = A.h;
  const words = byKey(data);
  const num = (n) => words.get('num' + n);
  const howMany = words.get('kama'), nerot = words.get('nerot'), matbeot = words.get('matbeot'), coin = words.get('matbea');
  let q = 0, done = false;
  A.setLives(3);
  function ask() {
    if (done) return;
    if (q >= 10) { done = true; A.finish({ won: true }); return; }
    q++;
    const coins = !cfg.shamash && rnd() < 0.4;
    const night = 1 + randInt(rnd, cfg.max);
    const answer = cfg.shamash ? Math.min(9, night + 1) : night;
    const items = h('ul', { class: 'hk-row', style: 'list-style:none;padding:0;justify-content:center;font-size:2.2rem', 'aria-label': coins ? 'Coins on the table' : 'Candles' },
      ...Array.from({ length: coins ? answer : answer - (cfg.shamash ? 1 : 0) }, () => h('li', { role: 'img', 'aria-label': coins ? 'coin' : 'candle' }, coins ? '\u{1FA99}' : '\u{1F56F}️')),
      cfg.shamash ? h('li', { role: 'img', 'aria-label': 'shamash candle', style: 'font-size:2.8rem' }, '\u{1F56F}️') : null);
    const options = numberChoices(answer, Math.max(cfg.max, cfg.shamash ? 9 : 0), cfg.choices, rnd);
    const row = h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'How many?' }, ...options.map((n) => {
      const w = num(n);
      const b = h('button', { type: 'button', class: 'arc-choice', onclick: () => {
        if (b.disabled || done) return;
        if (n === answer) {
          for (const x of row.querySelectorAll('button')) x.disabled = true;
          b.classList.add('is-good'); A.addScore(9); A.sfx('success'); A.sayWord(w);
          A.announce(`Yes: ${w.translit}, ${n}.`);
          setTimeout(ask, A.quiet ? 0 : 600);
        } else {
          b.disabled = true; b.classList.add('is-bad'); A.sfx('miss');
          A.announce(`${w.translit} is ${n}. Count again.`);
          if (A.miss()) done = true;
        }
      } }, A.heSpan(w.he), cfg.translit ? h('span', { class: 'hk-tr' }, ` ${w.translit}`) : null, cfg.digits ? h('span', {}, ` (${n})`) : null);
      return b;
    }));
    A.board.replaceChildren(
      h('p', { class: 'arc-prompt' }, `${q} of 10 · `, A.heSpan(`${howMany.he} ${(coins ? matbeot : nerot).he}?`), cfg.translit ? ` ${howMany.translit} ${(coins ? matbeot : nerot).translit}?` : '', ` How many ${coins ? 'coins' : cfg.shamash ? 'flames, with the shamash' : 'candles'}?`),
      items, row,
      coins && cfg.translit ? h('p', { class: 'muted' }, 'One coin: ', A.heSpan(coin.he), ` ${coin.translit}.`) : null);
    try { row.querySelector('button')?.focus?.(); } catch { /* ignore */ }
  }
  ask();
}

export const mount = mountHanukkahArcade(spec, setup);
