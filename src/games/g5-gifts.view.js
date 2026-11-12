// Mishloach Manot: on Purim, friends send each other gifts of food, at least two kinds of ready-to-eat food.
// Each friend leaves a note with a wish (something sweet, no dairy, exactly three things). Pack a basket from the
// shelf that meets the rule and the note, then send it.
import { mountG5, host, track, grade, draftNote, card, button, lock } from './g5-ui.js';
import { loadData, g5Data, shuffle, shortEn, basketProblems } from './g5-core.js';

export const STORE_KEY = 'games.g5-gifts.v1';
const FRIENDS = ['Noa', 'Ari', 'Rimon', 'your neighbour', 'Grandma', 'a friend from class', 'your teacher', 'the family next door'];
/** Notes a friend can leave, plainest first. */
const WISHES = [
  [{}],
  [{ sweet: true }, { fruit: true }],
  [{ sweet: true }, { fruit: true }, { noDairy: true }, { noNuts: true }],
  [{ sweet: true, fruit: true }, { fruit: true, noNuts: true }, { exactly: 3, sweet: true }, { kinds: 3 }],
  [{ sweet: true, fruit: true, noDairy: true }, { exactly: 3, fruit: true, noNuts: true }, { kinds: 3, sweet: true, noDairy: true }, { exactly: 2, fruit: true, sweet: true }],
];
/** The note in plain words. */
export function noteText(o) {
  const parts = [o.exactly ? `exactly ${o.exactly} things` : `at least ${o.kinds || 2} kinds of food`];
  if (o.sweet) parts.push('something sweet');
  if (o.fruit) parts.push('some fruit');
  if (o.noDairy) parts.push('no dairy, please');
  if (o.noNuts) parts.push('no nuts, please');
  return parts.join('; ');
}

const spec = {
  id: 'g5-gifts', title: 'Mishloach Manot', titleHe: 'מִשְׁלוֹחַ מָנוֹת',
  blurb: 'On Purim we send friends gifts of food: at least two kinds of ready-to-eat food. Read each friend\'s note, pack a basket that fits, and send it.',
  howTo: ['Read the note: who it is for and what they asked.', 'Tap foods on the shelf to put them in the basket (tap again to take one out).', 'Press Send. If the basket does not fit, Noa says why; fix it and send again.', 'Higher levels show the foods in Hebrew only and the notes ask for more.'],
  levels: [
    { name: 'Two kinds of food, with English', friends: 4, english: true, tr: true },
    { name: 'One wish each, how to say it', friends: 4, english: false, tr: true },
    { name: 'Hebrew only', friends: 5, english: false, tr: false },
    { name: 'Two wishes each', friends: 5, english: false, tr: false },
    { name: 'Three wishes each', friends: 6, english: false, tr: false },
  ],
  par: (l, cfg) => cfg.friends * 10,
  seconds: (l, cfg) => 40 + cfg.friends * 25,
};

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd, wishes = WISHES[A.level - 1];
  const note = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const shelf = A.h('div', { class: 'g5-grid', role: 'group', 'aria-label': 'Shelf' });
  const basket = A.h('p', { 'aria-live': 'polite' });
  const send = A.h('div', { class: 'g5-row' });
  const after = A.h('p', { class: 'muted' });
  A.board.replaceChildren(host(A, 'noa', 'Who is the next basket for?'), note, shelf, basket, send, after,
    draftNote(A, 'The rule is from the app\'s Purim article. Foods are from the app\'s word list; hamantasch is from the Purim page.'));
  loadData(A.ctx, g5Data('purim')).then((d) => {
    if (!T.live()) return;
    const friends = shuffle(FRIENDS, rnd).slice(0, cfg.friends);
    let f = 0;
    const next = () => {
      if (f >= friends.length) { T.end({ won: true }); return; }
      const who = friends[f++];
      const order = wishes[Math.floor(rnd() * wishes.length)];
      const pick = (g) => shuffle(d.foods.filter((x) => x.group === g), rnd);
      const foods = shuffle([...pick('sweet').slice(0, 2), ...pick('fruit').slice(0, 2), ...pick('dairy').slice(0, 1), ...pick('bread').slice(0, 1), ...pick('nuts').slice(0, 1), ...shuffle(d.foods, rnd)]
        .filter((x, i, a) => a.findIndex((y) => y.he === x.he) === i).slice(0, 8), rnd);
      const inBasket = new Set();
      let tries = 0;
      note.textContent = `Basket ${f} of ${friends.length}, for ${who}: ${noteText(order)}.`;
      after.textContent = '';
      const paint = () => { basket.textContent = inBasket.size ? `In the basket: ${[...inBasket].map((x) => (cfg.english ? shortEn(x.en) : x.he)).join(', ')}.` : 'The basket is empty.'; };
      shelf.replaceChildren(...foods.map((x) => {
        const b = button(A, card(A, x.he, cfg.english ? shortEn(x.en) : null, cfg.tr ? x.tr : null), () => {
          if (inBasket.has(x)) inBasket.delete(x); else inBasket.add(x);
          b.setAttribute('aria-pressed', String(inBasket.has(x))); b.classList.toggle('is-good', inBasket.has(x)); A.sfx('click'); paint();
        }, 'arc-choice g5-word', { 'aria-pressed': 'false' });
        return b;
      }));
      send.replaceChildren(button(A, 'Send', () => {
        const problems = basketProblems([...inBasket], order);
        tries += 1;
        if (problems.length) { grade(A, false, { wrong: `Not yet: ${problems.join(' ')}` }); after.textContent = problems.join(' '); return; }
        grade(A, true, { right: `Sent to ${who}. Purim sameach!`, points: tries === 1 ? 10 : 5 });
        after.textContent = [...inBasket].map((x) => `${x.he} (${x.tr}): ${shortEn(x.en)}`).join(' · ');
        lock(shelf); lock(send); T.later(1100, next);
      }, 'btn'));
      paint();
    };
    next();
  }).catch(() => A.announce('The shelf did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
