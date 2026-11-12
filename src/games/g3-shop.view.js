// Counting Shop: customers order three to ten of something. Hebrew numbers 3 to 10 have two forms, and they swap the
// usual endings: the form ending in -a goes with masculine nouns (shlosha bakbukim, three bottles), the short form with
// feminine ones (shalosh kosot, three cups). Ring up the right number word.
import { mountArcade, choiceRow } from './arcade.js';
import { loadG3, shuffle, numberFor, looksOdd } from './g3-core.js';
import { begin, grade, numberKeys, countRow, heText } from './g3-ui.js';

export const STORE_KEY = 'games.g3-shop.v1';
const ROUNDS = 10;
const spec = {
  id: 'g3-shop', title: 'Counting Shop', titleHe: 'חֲנוּת',
  blurb: 'From three to ten, each Hebrew number has two forms, and they look back to front: the one that ends in -a (shlosha, arba\'a) goes with masculine nouns, the short one (shalosh, arba) with feminine nouns. The number comes before the plural noun. Customers order; ring up the number word.',
  howTo: ['Read the order: how many, and of what. Pick the number word; keys 1 to 4.', 'Level 1 shows the noun\'s gender; level 2 hides it. Level 3 offers two numbers in both forms.', 'Level 4 picks nouns whose endings fool you. Level 5 is the full till: every number, both forms.'],
  levels: [
    { name: 'Gender shown', choices: 'pair', showGender: true },
    { name: 'Gender hidden', choices: 'pair' },
    { name: 'Two numbers, two forms', choices: 'four' },
    { name: 'Nouns that fool you', choices: 'four', odd: true },
    { name: 'The full till', choices: 'till' },
  ],
  par: () => ROUNDS * 10,
  seconds: (l) => (l === 5 ? 180 : 150),
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'rimon', 'Masculine nouns get the number with -a. Yes, really.',
    'Number words from the phrasebook; nouns and their genders from the word list. The number-and-noun order line is the game\'s own: not reviewed by a teacher.');
  const cfg = A.cfg, rnd = A.rnd;
  numberKeys(A, () => area.querySelector('.arc-choices'));
  let nums = [], nouns = [], n = 0;
  const next = () => { if (n >= ROUNDS) { T.end({ won: true }); return; } n += 1; ask(); };
  const ask = () => {
    const pool = cfg.odd ? nouns.filter(looksOdd) : nouns;
    const noun = pool[Math.floor(rnd() * pool.length)], k = 3 + Math.floor(rnd() * 8);
    const want = numberFor(nums, k, noun.gender);
    big.replaceChildren(countRow(A, k, '■'), heText(A, noun.plural));
    prompt.textContent = `Order ${n} of ${ROUNDS}: ${k} × ${noun.en}${cfg.showGender ? ` (${noun.gender === 'f' ? 'feminine' : 'masculine'})` : ''}.`;
    let opts;
    if (cfg.choices === 'pair') opts = [numberFor(nums, k, 'm'), numberFor(nums, k, 'f')];
    else if (cfg.choices === 'four') { const j = 3 + ((k - 3 + 1 + Math.floor(rnd() * 7)) % 8); opts = [numberFor(nums, k, 'm'), numberFor(nums, k, 'f'), numberFor(nums, j, 'm'), numberFor(nums, j, 'f')]; }
    else opts = nums.filter((x) => x.n >= 3).flatMap((x) => [x.m, x.f]);
    if (cfg.choices !== 'till') opts = shuffle(opts, rnd);
    const row = choiceRow(opts, (o) => o, (o) => {
      const ok = o === want;
      const rec = nums.find((x) => x.m === o || x.f === o);
      grade(A, ok, { right: `${want} ${noun.plural}: ${k} ${noun.en}. ${noun.he} is ${noun.gender === 'f' ? 'feminine, so the short form' : 'masculine, so the form with -a'}.`, wrong: rec ? `${o} is ${rec.n}, the form for ${rec.m === o ? 'masculine' : 'feminine'} nouns.` : '' });
      if (ok) T.later(800, next);
      return ok;
    }, { label: 'Number words' });
    if (cfg.choices === 'till') row.classList.add('g3-till');
    area.replaceChildren(row);
  };
  Promise.all([loadG3(A.ctx, 'numbers'), loadG3(A.ctx, 'nouns')]).then(([nm, nn]) => {
    if (!T.live()) return;
    nums = nm.numbers; nouns = shuffle(nn.nouns, rnd);
    next();
  }).catch(() => A.announce('The shop did not open. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
