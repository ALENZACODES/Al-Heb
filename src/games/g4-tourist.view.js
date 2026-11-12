// Spot the Tourist: Ari and Noa each say the same thing, one the way a local would and one the way a learner gives
// themselves away (wrong form, stiff wording, English stress, a rolled r). Tap the local. From level 4, answer the
// follow-up question too. Items are read straight from data/israel/giveaways.json.
import { mountArcade } from './arcade.js';
import { loadIsrael, sample, shuffle, stripPoints } from './g4-core.js';
import { begin, withBank, host, heText, enText, grade, draftNote, buttons, numberKeys } from './g4-ui.js';

export const STORE_KEY = 'games.g4-tourist.v1';
/** Categories each level adds. Notes on these are context ("said by a woman"); on sound items they describe the slip. */
export const CONTEXT_CATS = Object.freeze(['gender', 'register', 'form']);
const LEVEL_CATS = [['gender', 'form'], ['gender', 'form', 'register'], ['gender', 'form', 'register', 'stress', 'sound'], ['gender', 'form', 'register', 'stress', 'sound'], ['gender', 'form', 'register', 'stress', 'sound']];
const HEB = /[\u05D0-\u05EA]/;

/** The two lines for an item, shuffled: [{ local: true|false, he, translit }]. */
export const pair = (it, rnd = Math.random) => shuffle([{ local: true, ...it.right }, { local: false, ...it.wrong }], rnd);
/** The context line shown to both speakers, or '' (sound and stress notes would give the answer away). */
export const contextOf = (it) => (CONTEXT_CATS.includes(it.category) && it.wrong.note ? it.wrong.note : '');

const spec = {
  id: 'g4-tourist', title: 'Spot the Tourist', titleHe: 'תַּיָּר',
  blurb: 'Small slips give a learner away: a masculine verb from a woman, a stiff "ha\'im" question, English stress on toda, a rolled r. Two people say the same thing. Which one sounds local? Capital letters in the English spelling mark the stressed syllable.',
  howTo: ['Read both lines and tap the one a local would say (keys 1 and 2).', 'Each answer explains the slip and how to fix it.', 'Level 3 adds sounds and stress: read the English spelling, where capitals mark the stress.', 'Levels 4 and 5 add a follow-up question on the same point.'],
  levels: [
    { name: 'Gender and grammar', count: 5 },
    { name: 'Stiff or natural', count: 7 },
    { name: 'Sounds and stress', count: 10 },
    { name: 'With a follow-up', count: 8, drill: true },
    { name: 'Bare text, every slip', count: 12, drill: true, plain: true },
  ],
  par: (l) => spec.levels[l - 1].count * (spec.levels[l - 1].drill ? 20 : 10),
  seconds: (l) => 40 + spec.levels[l - 1].count * (spec.levels[l - 1].drill ? 30 : 18),
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const scene = A.h('div', { class: 'g4-scene' }), area = A.h('div'), after = A.h('div', { 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'rimon', 'Who is the tourist? Who sounds local?'), scene, area, after, draftNote(A, 'Items from the app\'s "gives you away" list. Not yet checked by a native speaker.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  withBank(A, T, (_B, data) => {
    const pool = data.items.filter((x) => LEVEL_CATS[A.level - 1].includes(x.category) && x.wrong?.translit && x.right?.translit);
    const deck = sample(pool, Math.min(cfg.count, pool.length), rnd);
    const txt = (s) => (cfg.plain ? stripPoints(s) : s);
    const line = (o) => A.h('span', { class: 'g4-item' }, heText(A, txt(o.he)), A.h('small', { class: 'g4-tr', lang: 'en' }, o.translit));
    let n = 0;
    const drill = (it) => {
      const d = it.drill;
      area.replaceChildren(A.h('p', { class: 'arc-prompt' }, 'Follow-up: ', d.prompt),
        buttons(A, shuffle(d.options, rnd), (o) => (HEB.test(o.text) ? heText(A, txt(o.text)) : enText(A, o.text)), (o) => {
          const ok = grade(A, o.id === d.answer, { right: d.explain, wrong: 'Not quite. ' + d.explain });
          if (ok) T.later(1200, next);
          return ok;
        }, { label: 'Follow-up' }));
    };
    const next = () => {
      if (n >= deck.length) { T.end({ won: true }); return; }
      const it = deck[n]; n += 1;
      after.replaceChildren();
      const ctx = contextOf(it);
      scene.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Pair ${n} of ${deck.length}`), ctx ? A.h('p', {}, `The moment: ${ctx}.`) : A.h('p', {}, 'Same words, said two ways.'));
      const two = pair(it, rnd);
      area.replaceChildren(buttons(A, two, (o) => A.h('span', {}, A.h('strong', { lang: 'en' }, (o === two[0] ? 'Ari' : 'Noa') + ': '), line(o)), (o) => {
        const ok = grade(A, o.local, { right: 'Yes, that one sounds local.', wrong: 'That one gives the speaker away.' });
        after.replaceChildren(A.h('p', {}, A.h('strong', {}, it.title + '. '), it.why), A.h('p', { class: 'muted' }, it.fix));
        if (ok) T.later(1500, () => (cfg.drill && it.drill ? drill(it) : next()));
        return ok;
      }, { label: 'Who sounds local' }));
    };
    next();
  }, (ctx) => loadIsrael(ctx, 'giveaways'));
}

export const mount = mountArcade(spec, setup);
