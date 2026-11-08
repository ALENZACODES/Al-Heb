// Alef-Bet Run: the letters are scattered on a board; tap them in alphabetical order as fast as you can.
// The classic "tap the numbers in order" reflex game, with the alphabet as the sequence.
import { mountArcade, makeGrid } from './arcade.js';
import { pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.alefbetrun.v1';

const ORDER = ['alef', 'bet', 'gimel', 'dalet', 'he', 'vav', 'zayin', 'chet', 'tet', 'yod', 'kaf', 'lamed', 'mem', 'nun', 'samekh', 'ayin', 'pe', 'tsadi', 'qof', 'resh', 'shin', 'tav'];

const spec = {
  id: 'alefbetrun', title: 'Alef-Bet Run', titleHe: 'רִיצַת אָלֶף־בֵּית',
  blurb: 'The letters are scattered. Tap them in order, alef to tav, as fast as you can. Each level gives you a longer run and a bigger board.',
  howTo: ['Tap the next letter in alphabetical order. The one you need is named at the top.', 'A wrong tap costs two points; the right one lights up.', 'Finish the run to score a time bonus: faster is more.', 'Level 5 is the whole alphabet with the final forms mixed in as distractors.'],
  levels: [
    { name: 'Alef to he', from: 0, to: 5, size: 3 },
    { name: 'Alef to yod', from: 0, to: 10, size: 4 },
    { name: 'Kaf to tav', from: 10, to: 22, size: 4 },
    { name: 'The whole alphabet', from: 0, to: 22, size: 5 },
    { name: 'Alphabet plus finals', from: 0, to: 22, size: 6, finals: true },
  ],
  par: (l, cfg) => (cfg.to - cfg.from) * 10 + 30,
  seconds: (l, cfg) => 45 + (cfg.to - cfg.from) * 3,
  needsWords: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const byId = Object.fromEntries(A.letters.map((x) => [x.id, x]));
  const run = ORDER.slice(cfg.from, cfg.to).map((id) => byId[id]).filter(Boolean);
  if (!run.length) { A.announce('Letter data did not load.'); return; }
  const extras = cfg.finals ? A.letters.filter((x) => x.isFinal) : [];
  const size = cfg.size;
  const items = pickSeeded([...run, ...extras], size * size, rnd);
  while (items.length < size * size) items.push(null);
  const placed = pickSeeded(items, items.length, rnd);
  let idx = 0; const t0 = Math.max(Date.now(), A.readyAt || 0);
  const prompt = A.h('p', { class: 'arc-prompt' });
  const { el, cells } = makeGrid(size, size, { label: 'Letters', onCell: (r, c, cell) => tap(r * size + c, cell) });
  placed.forEach((it, i) => { const cell = cells[Math.floor(i / size)][i % size]; cell.textContent = it ? it.he : ''; if (!it) { cell.classList.add('is-blank'); cell.disabled = true; } cell.setAttribute('aria-label', it ? it.name : 'empty'); });
  A.board.replaceChildren(prompt, el);
  const show = () => { prompt.replaceChildren(`Next: ${run[idx].name} `, A.heSpan(run[idx].nameHe || '', 'he muted'), ` · ${idx} of ${run.length} done`); };
  const tap = (i, cell) => {
    const it = placed[i]; if (!it || cell.disabled) return;
    if (it.id === run[idx].id) {
      cell.classList.add('is-good'); cell.disabled = true; A.addScore(10); A.sfx('tick'); A.sayLetter(it); idx++;
      if (idx >= run.length) { const secs = (Date.now() - t0) / 1000; const bonus = Math.max(0, Math.round(60 - secs)); A.addScore(bonus); A.announce(`Run complete in ${secs.toFixed(1)} s. Time bonus ${bonus}.`); A.finish({ won: true }); return; }
      show();
    } else { A.addScore(-2); A.sfx('error_soft'); A.miss(); cell.classList.add('is-bad'); setTimeout(() => cell.classList.remove('is-bad'), A.quiet ? 0 : 400); A.announce(`That is ${it.name}. Next is ${run[idx].name}.`); }
  };
  show();
}

export const mount = mountArcade(spec, setup);
