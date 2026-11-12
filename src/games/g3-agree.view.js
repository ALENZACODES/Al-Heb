// Agreement Match: a Hebrew adjective comes after its noun and copies the noun's gender and number: four forms of "big"
// for a big house, a big car, big houses, big cars. Pair each noun with its form. Watch the nouns whose endings fool you.
import { mountArcade } from './arcade.js';
import { loadG3, shuffle, adjFor, looksOdd } from './g3-core.js';
import { begin, grade, pairBoard, heText } from './g3-ui.js';

export const STORE_KEY = 'games.g3-agree.v1';
const BOARDS = 4;
const spec = {
  id: 'g3-agree', title: 'Agreement Match', titleHe: 'זוּג',
  blurb: 'In Hebrew the adjective follows the noun and agrees with it: masculine or feminine, one or many. Big is gadol, gdola, gdolim, gdolot. Most feminine nouns end in -a or -t and most masculine plurals in -im, but not all: a noun keeps its gender even when its ending looks like the other one. Pair every noun with the form of the adjective it takes.',
  howTo: ['Tap an adjective form on the right, then the noun it goes with on the left.', 'The match shows the pair as a phrase. A wrong pair costs points.', 'Level 3 picks nouns whose endings fool you. Level 4 hides the English. Level 5 mixes two adjectives.'],
  levels: [
    { name: 'He or she?', size: 2, plural: false },
    { name: 'One or many', size: 4, plural: true },
    { name: 'Endings that fool you', size: 4, plural: true, odd: true },
    { name: 'Hebrew only', size: 4, plural: true, hideEn: true },
    { name: 'Two adjectives', size: 4, plural: true, two: true, hideEn: true },
  ],
  par: (l, cfg) => BOARDS * cfg.size * 10,
  seconds: () => 210,
  needsWords: false, needsLetters: false,
};
/** One board: nouns (each { he, en, gender, plural:bool }) with the adjective form each takes. */
export function board(nouns, adjs, cfg, rnd = Math.random) {
  const pickG = (g) => shuffle(nouns.filter((x) => x.gender === g && (!cfg.odd || looksOdd(x))), rnd)[0] || shuffle(nouns.filter((x) => x.gender === g), rnd)[0];
  const m = pickG('m'), f = pickG('f');
  const [a, b] = shuffle(adjs, rnd);
  const rows = [
    { noun: { he: m.he, en: m.en, gender: 'm', plural: false }, adj: a },
    { noun: { he: f.he, en: f.en, gender: 'f', plural: false }, adj: cfg.two ? b : a },
  ];
  if (cfg.size === 4) rows.push({ noun: { he: m.plural, en: m.en + ' (many)', gender: 'm', plural: true }, adj: cfg.two ? b : a }, { noun: { he: f.plural, en: f.en + ' (many)', gender: 'f', plural: true }, adj: a });
  return rows.map((r) => ({ ...r, form: adjFor(r.adj, r.noun.gender, r.noun.plural) }));
}

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'ari', 'The adjective copies its noun.',
    'Nouns from the word list; adjective forms from the Tug-of-War bank. Each pair is the game\'s own phrase: not reviewed by a teacher.');
  const cfg = A.cfg, rnd = A.rnd;
  let nouns = [], adjs = [], b = 0;
  const next = () => {
    if (b >= BOARDS) { T.end({ won: true }); return; }
    b += 1;
    let rows = board(nouns, adjs, cfg, rnd);
    for (let i = 0; i < 5 && new Set(rows.map((r) => r.form)).size < rows.length; i++) rows = board(nouns, adjs, cfg, rnd);
    const adjNames = [...new Set(rows.map((r) => r.adj.en))].join(' and ');
    big.textContent = adjNames;
    prompt.textContent = `Board ${b} of ${BOARDS}: pair each noun with "${adjNames}".`;
    area.replaceChildren(pairBoard(A, shuffle(rows, rnd), shuffle(rows, rnd), {
      renderLeft: (r) => [heText(A, r.noun.he), cfg.hideEn ? null : A.h('small', { style: 'display:block' }, r.noun.en)],
      renderRight: (r) => r.form,
      isPair: (l, r) => l.form === r.form,
      onPair: (l) => grade(A, true, { right: `${l.noun.he} ${l.form}: ${l.noun.gender === 'f' ? 'feminine' : 'masculine'}${l.noun.plural ? ' plural' : ''}.` }),
      onWrong: (l, r) => grade(A, false, { wrong: `${r.form} is ${/f/.test(formKey(r)) ? 'feminine' : 'masculine'}${/p$/.test(formKey(r)) ? ' plural' : ''}; ${l.noun.he} needs another form.` }),
      onDone: () => T.later(700, next),
      label: 'Nouns and adjectives',
    }));
  };
  const formKey = (r) => ['ms', 'fs', 'mp', 'fp'].find((k) => r.adj[k] === r.form) || '';
  Promise.all([loadG3(A.ctx, 'nouns'), loadG3(A.ctx, 'adjectives')]).then(([nn, ad]) => {
    if (!T.live()) return;
    nouns = nn.nouns; adjs = ad.adjectives;
    next();
  }).catch(() => A.announce('The words did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
