// The Ten Words: the ten statements of Exodus 20, placed on two tablets in order. Levels move from
// matching Hebrew keyword to meaning, to ordering, to filling empty tablets from memory.
import { mountArcade, choiceRow, randInt } from './arcade.js';
import { pickSeeded } from './arcade.model.js';
import { uiEnglish } from '../shell/names.js';
import { loadLaws, LAWS_NOTICE } from './laws.js';

export const STORE_KEY = 'games.tenwords.v1';

const spec = {
  id: 'tenwords', title: 'The Ten Words', titleHe: 'עֲשֶׂרֶת הַדִּבְּרוֹת',
  blurb: 'The ten statements, as the Torah lists them in Exodus 20, each known by its opening Hebrew word. Learn the keywords, then place all ten on the two tablets in order: five about our relationship with the Creator, five between people.',
  howTo: ['Level 1: a Hebrew keyword appears; pick its meaning.', 'Level 2: the meaning appears; pick the Hebrew.', 'Level 3: ten loose keywords; tap them in order 1 to 10.', 'Levels 4 and 5: fill the tablets from memory, right tablet first, with fewer hints.'],
  levels: [
    { name: 'Keyword to meaning', mode: 'he2en', rounds: 10 },
    { name: 'Meaning to keyword', mode: 'en2he', rounds: 10 },
    { name: 'Put them in order', mode: 'order', rounds: 10, hint: true },
    { name: 'Fill the tablets, hints', mode: 'tablets', rounds: 10, hint: true },
    { name: 'Fill the tablets from memory', mode: 'tablets', rounds: 10, hint: false },
  ],
  par: (l, cfg) => cfg.rounds * 10,
  seconds: (l, cfg) => 180,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd, ctx = A.ctx;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const big = A.h('div', { class: 'arc-big', lang: 'he', dir: 'rtl' });
  const area = A.h('div');
  A.board.replaceChildren(big, prompt, area, A.h('p', { class: 'muted arc-foot' }, LAWS_NOTICE));
  let ten = [], n = 0, placed = 0;
  loadLaws(ctx).then((d) => { ten = d.ten; start(); }).catch(() => A.announce('The laws file did not load.'));
  const grade = (ok, item) => {
    if (ok) { A.addScore(10); A.sfx('success'); A.sayFile(`laws/ten-${String(item.n).padStart(2, '0')}`); A.announce(`${item.he}: ${uiEnglish(ctx, item.en)}.`); }
    else { A.addScore(-3); A.sfx('miss'); A.miss(); A.announce(`${item.he} means ${uiEnglish(ctx, item.en)}.`); }
    return ok;
  };
  const start = () => {
    if (cfg.mode === 'he2en' || cfg.mode === 'en2he') {
      const order = pickSeeded(ten, 10, rnd);
      const ask = () => {
        if (n >= cfg.rounds) { A.finish({ won: true }); return; }
        const item = order[n++];
        const opts = pickSeeded(ten.filter((x) => x.n !== item.n), 3, rnd).concat(item).sort(() => rnd() - 0.5);
        if (cfg.mode === 'he2en') { big.textContent = item.he; prompt.textContent = `"${item.translit}" (${n} of 10)`; area.replaceChildren(choiceRow(opts, (o) => uiEnglish(ctx, o.short), (o) => { const ok = grade(o.n === item.n, item); if (ok) ask(); return ok; })); }
        else { big.textContent = ''; prompt.textContent = `${uiEnglish(ctx, item.en)} (${n} of 10)`; area.replaceChildren(choiceRow(opts, (o) => o.he, (o) => { const ok = grade(o.n === item.n, item); if (ok) ask(); return ok; })); }
      };
      ask();
    } else {
      // tablets: right tablet holds 1 to 5, left tablet 6 to 10
      const slots = ten.map((item) => A.h('div', { class: 'arc-slot', 'aria-label': `slot ${item.n}` }, cfg.hint ? A.h('span', { class: 'muted', style: 'font-size:.8rem' }, `${item.n}. ${uiEnglish(ctx, item.short)}`) : A.h('span', { class: 'muted' }, String(item.n))));
      const right = A.h('div', { class: 'arc-tablet', 'aria-label': 'Right tablet, one to five' }, ...slots.slice(0, 5));
      const left = A.h('div', { class: 'arc-tablet', 'aria-label': 'Left tablet, six to ten' }, ...slots.slice(5));
      const tray = A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'Keywords to place' });
      big.textContent = ''; prompt.textContent = cfg.mode === 'order' ? 'Tap the keywords in order, 1 to 10.' : 'Place the next keyword. The tablets fill in order, right tablet first.';
      area.replaceChildren(A.h('div', { class: 'arc-tablets' }, right, left), tray);
      const loose = pickSeeded(ten, 10, rnd);
      const drawTray = () => tray.replaceChildren(...loose.map((item) => A.h('button', { type: 'button', class: 'arc-choice', lang: 'he', dir: 'rtl', onclick: () => place(item) }, A.h('span', {}, item.he, cfg.mode === 'order' && cfg.hint ? A.h('small', { style: 'display:block;font-size:.7rem' }, uiEnglish(ctx, item.short)) : null))));
      const place = (item) => {
        if (item.n === placed + 1) {
          placed++; loose.splice(loose.indexOf(item), 1); const slot = slots[item.n - 1]; slot.classList.add('is-filled'); slot.replaceChildren(A.heSpan(item.he), A.h('small', { style: 'margin-inline-start:.4rem' }, uiEnglish(ctx, item.short)));
          A.addScore(10); A.sfx('drop'); A.sayFile(`laws/ten-${String(item.n).padStart(2, '0')}`); A.announce(`${item.n}: ${item.he}, ${uiEnglish(ctx, item.en)}.`); drawTray();
          if (placed === 10) { A.addScore(20); A.finish({ won: true }); }
        } else { A.addScore(-3); A.sfx('miss'); A.miss(); A.announce(`${item.he} is number ${item.n}. Next needed: number ${placed + 1}.`); }
      };
      drawTray();
    }
  };
  A.setLives(0);
}

export const mount = mountArcade(spec, setup);
