// Sign Spotter: you need something (cash, a toilet, the bus); find its sign on a busy street of signboards. From level 4
// the signs lose their vowel points, the way Israeli streets print them.
import { mountArcade } from './arcade.js';
import { pick, sample, shuffle, stripPoints } from './g4-core.js';
import { begin, withBank, host, heText, say, grade, numberKeys, draftNote } from './g4-ui.js';

export const STORE_KEY = 'games.g4-signs.v1';
const ROUNDS = 10;

export const NEEDS = Object.freeze([
  { en: 'You need cash, and the bank is closed.', key: 's.atm' },
  { en: 'You want fresh bread.', key: 's.bakery' },
  { en: 'You need a toilet.', key: 's.toilets' },
  { en: 'Your head hurts. You want something for it.', key: 's.pharmacy' },
  { en: 'Time to leave the building.', key: 's.exit' },
  { en: 'You are looking for a place to leave the car.', key: 's.parking' },
  { en: 'Your bag was stolen. You want to report it.', key: 's.police' },
  { en: 'You have a parcel to send.', key: 's.post' },
  { en: 'You want to swim in the sea.', key: 's.beach' },
  { en: 'You want to catch a bus.', key: 's.station' },
  { en: 'You want dinner out tonight.', key: 's.restaurant' },
  { en: 'You need somewhere to sleep tonight.', key: 's.hotel' },
  { en: 'You want cheap fresh vegetables.', key: 's.market' },
  { en: 'You want to open an account.', key: 's.bank' },
  { en: 'Your train leaves soon: where do you stand?', key: 's.platform' },
  { en: 'Someone is badly hurt.', key: 's.hospital' },
  { en: 'Can you go in? Find the sign that says yes.', key: 's.open' },
  { en: 'A sign warns you to keep back.', key: 's.danger' },
  { en: 'Many shops under one roof, with air conditioning.', key: 's.mall' },
  { en: 'You have a lecture this morning.', key: 's.university' },
]);
/** Signs that could answer each other's need never share a street. */
export const CLASH = Object.freeze([['s.atm', 's.bank'], ['s.station', 's.platform', 's.bus', 's.taxi', 's.train'], ['s.open', 's.closed', 's.forbidden', 's.danger', 's.exit'], ['s.mall', 's.market', 's.shop'], ['s.hospital', 's.pharmacy']]);
export const WALL = Object.freeze([...new Set([...NEEDS.map((x) => x.key), 's.closed', 's.forbidden', 's.taxi', 's.bus', 's.train', 's.bridge', 's.office', 's.street', 's.kindergarten'])]);
const COLOUR = { 's.station': 'blue', 's.platform': 'blue', 's.bus': 'blue', 's.taxi': 'blue', 's.train': 'blue', 's.hospital': 'red', 's.pharmacy': 'red', 's.police': 'red', 's.danger': 'red', 's.forbidden': 'red', 's.closed': 'red', 's.market': 'brown', 's.bakery': 'brown' };

/** The street for one need: its sign plus others that cannot also answer it. */
export function street(need, size, rnd = Math.random) {
  const clash = new Set(CLASH.filter((g) => g.includes(need.key)).flat());
  return shuffle([need.key, ...sample(WALL.filter((k) => k !== need.key && !clash.has(k)), size - 1, rnd)], rnd);
}

const spec = {
  id: 'g4-signs', title: 'Sign Spotter', titleHe: 'רְחוֹב',
  blurb: 'Out on the street you have a need and a row of signs. Find the one you want. Street signs in Israel are printed without vowel points, so from level 4 you read them bare, as the locals do.',
  howTo: ['Read what you need, then tap its sign. Number keys 1 to 9 press the signs in order.', 'Level 1 shows how each sign sounds. Levels 2 and 3 add more signs.', 'Levels 4 and 5: no vowel points, like real signs.'],
  levels: [
    { name: 'Four signs, with sounds', size: 4, tr: true },
    { name: 'Six signs', size: 6 },
    { name: 'Nine signs', size: 9 },
    { name: 'No vowels, like the street', size: 9, plain: true },
    { name: 'Twelve bare signs, fast', size: 12, plain: true },
  ],
  par: () => ROUNDS * 10,
  seconds: (l) => (l === 5 ? 70 : 120),
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('div', { class: 'g4-scene' }), wall = A.h('div', { class: 'g4-wall', role: 'group', 'aria-label': 'Signs on the street' });
  A.board.replaceChildren(host(A, 'ari', 'What are you looking for?'), prompt, wall, draftNote(A, 'Sign words from the app\'s lessons and word list. Not yet checked by a native speaker.'));
  numberKeys(A, () => wall);
  withBank(A, T, (B) => {
    pick(B, WALL);
    const deck = sample(NEEDS, ROUNDS, rnd);
    let n = 0;
    const next = () => {
      if (n >= deck.length) { T.end({ won: true }); return; }
      const need = deck[n]; n += 1;
      const want = B.get(need.key);
      prompt.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Need ${n} of ${deck.length}`), A.h('p', {}, A.h('strong', {}, need.en)));
      wall.replaceChildren(...street(need, cfg.size, rnd).map((k) => {
        const it = B.get(k);
        const b = A.h('button', { type: 'button', class: `g4-sign ${COLOUR[k] || ''}`.trim() },
          heText(A, cfg.plain ? stripPoints(it.he) : it.he), cfg.tr && it.tr ? A.h('small', { class: 'g4-tr', lang: 'en' }, ' ' + it.tr) : null);
        b.addEventListener('click', () => {
          if (b.disabled) return;
          const ok = grade(A, k === need.key, { right: `Yes: that sign says ${want.en}.`, wrong: `That sign says ${it.en}.` });
          b.disabled = true; b.classList.add(ok ? 'is-good' : 'is-bad');
          b.append(A.h('span', { class: 'visually-hidden' }, ok ? ' (right)' : ` (${it.en})`));
          if (ok) { for (const x of wall.querySelectorAll('button')) x.disabled = true; say(A, want); T.later(650, next); }
        });
        return b;
      }));
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
