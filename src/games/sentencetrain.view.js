// Sentence Train: Noa is the conductor. The words of a sentence arrive as loose carriages; couple them
// in order so the train reads right to left. English on the platform sign tells you what it should say.
import { mountArcade } from './arcade.js';
import { pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.sentencetrain.v1';
const EXTRA_URL = new URL('../../data/games/arcade-extra.json', import.meta.url);

const spec = {
  id: 'sentencetrain', title: 'Sentence Train', titleHe: 'רַכֶּבֶת מִשְׁפָּטִים',
  blurb: 'The carriages of a sentence are uncoupled on the platform. Noa shows the English; you couple the Hebrew words in order, engine on the right. Every sentence comes from the little books.',
  howTo: ['Read the English on the sign.', 'Tap the loose words in order. The train grows right to left. Tap a coupled word to uncouple it.', 'Short sentences first; longer ones with extra decoy carriages later.', 'Eight sentences per round.'],
  levels: [
    { name: '3-word sentences', min: 3, max: 3, count: 8, decoys: 0 },
    { name: '3 to 4 words', min: 3, max: 4, count: 8, decoys: 0 },
    { name: '4 words, one decoy', min: 4, max: 4, count: 8, decoys: 1 },
    { name: '4 to 5 words, decoys', min: 4, max: 5, count: 8, decoys: 2 },
    { name: 'Up to 7 words, decoys', min: 5, max: 7, count: 8, decoys: 2 },
  ],
  par: (l, cfg) => cfg.count * 15,
  seconds: (l, cfg) => 150 + l * 20,
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
  const host = A.h('div', { class: 'arc-host' }, A.cast('noa-conductor', 'Noa the conductor'), A.h('p', { class: 'arc-prompt' }));
  const sign = host.lastChild;
  const train = A.h('div', { class: 'arc-train', 'aria-label': 'The train so far' });
  const yard = A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'Loose carriages' });
  A.board.replaceChildren(host, train, yard);
  let deck = [], n = 0, s = null, coupled = [], loose = [], allWords = [];
  loadExtra(A.ctx).then((x) => {
    allWords = [...new Set(x.sentences.flatMap((q) => q.words))];
    deck = pickSeeded(x.sentences.filter((q) => q.words.length >= cfg.min && q.words.length <= cfg.max), cfg.count, rnd);
    if (!deck.length) { A.announce('No sentences of this length.'); return; }
    next();
  }).catch(() => A.announce('The sentence list did not load.'));
  const draw = () => {
    train.replaceChildren(A.h('span', { 'aria-hidden': 'true' }, '🚂'), ...coupled.map((w, i) => A.h('button', { type: 'button', class: 'arc-choice', lang: 'he', dir: 'rtl', 'aria-label': `coupled: ${w}, tap to uncouple`, onclick: () => { loose.push(w); coupled.splice(i, 1); draw(); } }, w)));
    yard.replaceChildren(...loose.map((w, i) => A.h('button', { type: 'button', class: 'arc-choice', lang: 'he', dir: 'rtl', onclick: () => couple(i) }, w)));
  };
  const next = () => {
    if (n >= deck.length) { A.finish({ won: true }); return; }
    s = deck[n++]; coupled = [];
    const decoys = pickSeeded(allWords.filter((w) => !s.words.includes(w)), cfg.decoys, rnd);
    loose = pickSeeded([...s.words, ...decoys], s.words.length + decoys.length, rnd);
    sign.textContent = `${s.en} · ${n} of ${deck.length}`;
    draw();
  };
  const couple = (i) => {
    coupled.push(loose[i]); loose.splice(i, 1); A.sfx('click_soft'); draw();
    if (coupled.length === s.words.length) {
      if (coupled.join(' ') === s.words.join(' ')) { A.addScore(15 + s.words.length * 2); A.sfx('success'); A.announce(`${s.he} · ${s.en}`); next(); }
      else if (!cfg.decoys || coupled.every((w) => s.words.includes(w))) { A.addScore(-3); A.sfx('miss'); A.miss(); A.announce('Right words, wrong order. Uncouple and try again.'); }
      else { A.addScore(-3); A.sfx('miss'); A.miss(); A.announce('A decoy carriage is on the train.'); }
    }
  };
  A.setLives(0);
}

export const mount = mountArcade(spec, setup);
