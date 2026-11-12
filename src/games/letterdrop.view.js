// Letter Drop: letters fall down three to five lanes. Slide your basket under the one that matches the
// letter named at the top and let the others fall past. A catch-the-right-thing reflex game.
import { mountArcade, randInt } from './arcade.js';
import { pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.letterdrop.v1';

const spec = {
  id: 'letterdrop', title: 'Letter Drop', titleHe: 'אוֹתִיּוֹת יוֹרְדוֹת',
  blurb: 'Letters rain down the lanes. Ari calls the letter; you run Noa\'s basket under it and let the rest fall. The lanes multiply and the rain gets faster.',
  howTo: ['Move the basket left and right (keys, pad or tap a lane).', 'Catch the letter named at the top. Catching another letter costs a life.', 'Each catch picks a new letter to find.', 'Twelve catches finish the level.'],
  levels: [
    { name: '3 lanes', lanes: 3, speed: 140, goal: 10, pool: 6 },
    { name: '3 lanes, faster', lanes: 3, speed: 120, goal: 12, pool: 9 },
    { name: '4 lanes', lanes: 4, speed: 105, goal: 12, pool: 14 },
    { name: '5 lanes', lanes: 5, speed: 90, goal: 14, pool: 22 },
    { name: '5 lanes, finals, fast', lanes: 5, speed: 72, goal: 16, pool: 27 },
  ],
  par: (l, cfg) => cfg.goal * 10,
  seconds: (l, cfg) => 150,
  needsWords: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const pool = pickSeeded(cfg.pool >= 27 ? A.letters : A.letters.filter((x) => !x.isFinal), cfg.pool, rnd);
  if (!pool.length) { A.announce('Letter data did not load.'); return; }
  const H = 300;
  let basket = Math.floor(cfg.lanes / 2), target = null, catches = 0;
  let fallers = []; // { lane, y, letter, el }
  const prompt = A.h('p', { class: 'arc-prompt' });
  const lanesEl = A.h('div', { class: 'arc-lanes', style: `grid-template-columns: repeat(${cfg.lanes}, 1fr)` });
  const laneEls = [], baskets = [];
  for (let i = 0; i < cfg.lanes; i++) {
    const b = A.h('div', { class: 'arc-basket', 'aria-hidden': 'true' }, '');
    const lane = A.h('button', { type: 'button', class: 'arc-lane', 'aria-label': `Lane ${i + 1}`, style: 'padding:0;border-width:1px', onclick: () => { basket = i; drawBasket(); } }, b);
    laneEls.push(lane); baskets.push(b); lanesEl.append(lane);
  }
  A.board.replaceChildren(prompt, lanesEl);
  A.setLives(3);
  const drawBasket = () => baskets.forEach((b, i) => { if (i === basket) b.replaceChildren(A.cast('noa-basket', 'Noa with the basket', 'arc-sprite-inline'), '🧺'); else b.replaceChildren(); });
  const newTarget = () => { target = pool[randInt(rnd, pool.length)]; prompt.replaceChildren(`Catch: ${target.name} `, A.heSpan(target.he)); A.sayLetter(target); };
  const spawn = () => {
    const lane = randInt(rnd, cfg.lanes);
    const wantTarget = !fallers.some((f) => f.letter.id === target.id) || rnd() < 0.35;
    const letter = wantTarget ? target : pool[randInt(rnd, pool.length)];
    const el = A.h('div', { class: 'arc-faller', lang: 'he', dir: 'rtl', style: 'top:-40px' }, letter.he);
    laneEls[lane].append(el);
    fallers.push({ lane, y: -40, letter, el });
  };
  const step = () => {
    if (fallers.length < 2 + Math.floor(A.level / 2) && rnd() < 0.25) spawn();
    for (const f of [...fallers]) {
      f.y += 6; f.el.style.top = `${f.y}px`;
      if (f.y >= H - 44) {
        f.el.remove(); fallers.splice(fallers.indexOf(f), 1);
        if (f.lane === basket) {
          if (f.letter.id === target.id) { catches++; A.addScore(10); A.sfx('catch'); A.announce(`Caught ${target.name}! ${cfg.goal - catches} to go.`); if (catches >= cfg.goal) { A.finish({ won: true }); return; } newTarget(); }
          else { A.sfx('miss'); A.announce(`That was ${f.letter.name}, not ${target.name}.`); if (A.miss()) return; }
        } else if (f.letter.id === target.id) { A.addScore(-2); A.slip(); A.announce(`${target.name} fell past.`); }
      }
    }
  };
  A.dpad((d) => { if (d === 'left') basket = Math.min(cfg.lanes - 1, basket + 1); else if (d === 'right') basket = Math.max(0, basket - 1); drawBasket(); if (A.quiet) for (let k = 0; k < 8; k++) step(); });
  drawBasket(); newTarget();
  if (!A.quiet) A.loop(step, cfg.speed);
  else { spawn(); A.announce('Calm mode: letters fall a stretch each time you move; press space to let them fall.'); A.keys((k) => { if (k === 'space') { for (let i = 0; i < 8; i++) step(); return true; } return false; }); }
}

export const mount = mountArcade(spec, setup);
