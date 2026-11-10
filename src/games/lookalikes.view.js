// Look-Alike Sorter: the letters beginners mix up (bet/kaf, dalet/resh, he/chet/tav, vav/zayin/nun-final,
// gimel/nun, samekh/mem-final, tet/mem). A letter appears; tap the bin with its name. Speed rises per level.
import { mountArcade, randInt } from './arcade.js';
import { pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.lookalikes.v1';

const GROUPS = [
  ['bet', 'kaf', 'pe'], ['dalet', 'resh', 'kaf-final'], ['he', 'chet', 'tav'], ['vav', 'zayin', 'nun-final'],
  ['gimel', 'nun'], ['samekh', 'mem-final'], ['tet', 'mem'], ['ayin', 'tsadi'], ['shin', 'sin'],
].map((g) => g.filter((x) => x !== 'sin'));

const spec = {
  id: 'lookalikes', title: 'Look-Alike Sorter', titleHe: 'דּוֹמִים',
  blurb: 'Bet or kaf? Dalet or resh? He, chet or tav? One letter at a time, sort it into the right bin. These are the pairs every beginner mixes up, so this is the game to replay.',
  howTo: ['A letter appears large in the middle.', 'Tap the bin with its name (or press 1, 2, 3).', 'Right sorts score; a wrong bin shows you the difference and costs a point.', 'Twenty letters per round; the stopwatch keeps you honest.'],
  levels: [
    { name: 'Bet, kaf · dalet, resh', groups: [0, 1], count: 16 },
    { name: 'He, chet, tav · vav, zayin', groups: [2, 3], count: 18 },
    { name: 'Gimel, nun · samekh, mem', groups: [4, 5, 6], count: 20 },
    { name: 'All groups', groups: [0, 1, 2, 3, 4, 5, 6, 7], count: 22 },
    { name: 'All groups, timed tight', groups: [0, 1, 2, 3, 4, 5, 6, 7], count: 26 },
  ],
  par: (l, cfg) => cfg.count * 9,
  seconds: (l, cfg) => 110 - l * 10,
  needsWords: false,
};

const TIPS = {
  bet: 'bet has a little foot sticking out to the right at the bottom', kaf: 'kaf is rounded, no foot', pe: 'pe has a tooth curling inside',
  dalet: 'dalet has a corner with an overhang', resh: 'resh is a smooth curve', 'kaf-final': 'final kaf drops below the line',
  he: 'he has a gap at the top left', chet: 'chet is closed at the top', tav: 'tav has a foot at the bottom left',
  vav: 'vav is a straight hook', zayin: 'zayin has a crossbar on top', 'nun-final': 'final nun drops below the line',
  gimel: 'gimel has a little foot stepping left', nun: 'nun sits on a short base', samekh: 'samekh is closed and round', 'mem-final': 'final mem is closed and square',
  tet: 'tet curls inward at the top', mem: 'mem has an opening at the bottom left', ayin: 'ayin has a long sweeping left arm', tsadi: 'tsadi has a short arm on the right',
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const byId = Object.fromEntries(A.letters.map((x) => [x.id, x]));
  const groups = cfg.groups.map((i) => GROUPS[i].map((id) => byId[id]).filter(Boolean)).filter((g) => g.length >= 2);
  if (!groups.length) { A.announce('Letter data did not load.'); return; }
  let n = 0, current = null, group = null;
  const big = A.h('div', { class: 'arc-big', lang: 'he', dir: 'rtl' });
  const bins = A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'Bins' });
  const tip = A.h('p', { class: 'muted arc-prompt' });
  A.board.replaceChildren(big, bins, tip);
  const next = () => {
    if (n >= cfg.count) { A.finish({ won: true }); return; }
    n++;
    group = groups[randInt(rnd, groups.length)];
    current = group[randInt(rnd, group.length)];
    big.textContent = current.he;
    tip.textContent = `${n} of ${cfg.count}`;
    const order = pickSeeded(group, group.length, rnd);
    bins.replaceChildren(...order.map((g, i) => A.h('button', { type: 'button', class: 'arc-bin', 'aria-label': `${g.name} bin, key ${i + 1}`, onclick: () => pick(g) }, `${i + 1}. ${g.name}`)));
  };
  const pick = (g) => {
    if (g.id === current.id) { A.addScore(10); A.sfx('select'); A.announce(`${g.name}. ${TIPS[g.id] || ''}`); A.sayLetter(g); }
    else { A.addScore(-3); A.sfx('miss'); A.miss(); A.announce(`That is ${current.name}: ${TIPS[current.id] || ''}. You chose ${g.name}: ${TIPS[g.id] || ''}.`); }
    next();
  };
  A.keys((k) => { const i = Number(k) - 1; const b = bins.children[i]; if (b) { b.click(); return true; } return false; });
  A.setLives(0);
  next();
}

export const mount = mountArcade(spec, setup);
