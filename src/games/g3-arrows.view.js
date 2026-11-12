// Gift Arrows: Rimon is talking. An arrow shows who gets the gift (or who goes along, or who is seen). Pick the little
// word with the right person ending: li (to me), lecha / lach (to you), lo (to him), la (to her), lanu (to us) …
import { mountArcade, choiceRow } from './arcade.js';
import { loadG3, options } from './g3-core.js';
import { begin, grade, numberKeys } from './g3-ui.js';

export const STORE_KEY = 'games.g3-arrows.v1';
const ROUNDS = 10;
/** Scenes, from Rimon's point of view (Rimon is the one talking). */
export const SCENES = Object.freeze([
  { person: '1sg', from: 'Ari', to: 'Rimon (me)', how: 'Rimon is talking about itself' },
  { person: '2msg', to: 'Ari', how: 'Rimon is talking to Ari' },
  { person: '2fsg', to: 'Noa', how: 'Rimon is talking to Noa' },
  { person: '3msg', to: 'Ari', how: 'Rimon is talking about Ari' },
  { person: '3fsg', to: 'Noa', how: 'Rimon is talking about Noa' },
  { person: '1pl', from: 'Noa', to: 'Rimon and friends (us)', how: 'Rimon is talking about all of us' },
  { person: '2mpl', to: 'Ari and Noa', how: 'Rimon is talking to them both' },
  { person: '3mpl', to: 'Ari and Noa', how: 'Rimon is talking about them both' },
  { person: '3fpl', to: 'Noa and her sister', how: 'Rimon is talking about the two women' },
]);
const VERB = { le: ['Gift', 'to'], im: ['Walk', 'with'], et: ['Look', 'at (the object)'] };
const spec = {
  id: 'g3-arrows', title: 'Gift Arrows', titleHe: 'מַתָּנָה',
  blurb: 'In Hebrew "to him", "with her" and "me" (as an object) are one word each: the little word takes the person as an ending. Rimon is talking. Follow the arrow to see who gets the gift, who comes along or who is being looked at, and pick the word.',
  howTo: ['Read the arrow and who Rimon is talking to or about. Pick the word; keys 1 to 4.', 'Talking to Ari is "you" (a man); talking about Ari is "him".', 'Level 4 switches to "with": who walks with whom. Level 5 mixes to, with and the object word.'],
  levels: [
    { name: 'To me, to him, to her', preps: ['le'], persons: ['1sg', '3msg', '3fsg'] },
    { name: 'To you', preps: ['le'], persons: ['1sg', '2msg', '2fsg', '3msg', '3fsg'] },
    { name: 'To us, to them', preps: ['le'], persons: ['1sg', '2msg', '2fsg', '3msg', '3fsg', '1pl', '2mpl', '3mpl', '3fpl'] },
    { name: 'With them', preps: ['im'], persons: ['1sg', '2msg', '2fsg', '3msg', '3fsg', '1pl', '2mpl', '3mpl', '3fpl'] },
    { name: 'To, with or the object?', preps: ['le', 'im', 'et'], persons: ['1sg', '2msg', '2fsg', '3msg', '3fsg', '1pl', '3mpl', '3fpl'] },
  ],
  par: () => ROUNDS * 10,
  seconds: () => 150,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'rimon', 'Follow the arrow. Who is it for?',
    'Endings copied from the app\'s word lists and phrasebook. Rimon has no gender, so the game never needs a "you" or "him" for Rimon. Not reviewed by a teacher.');
  const cfg = A.cfg, rnd = A.rnd;
  numberKeys(A, () => area.querySelector('.arc-choices'));
  let preps = [], n = 0;
  const next = () => { if (n >= ROUNDS) { T.end({ won: true }); return; } n += 1; ask(); };
  const ask = () => {
    const p = preps[Math.floor(rnd() * preps.length)];
    const scenes = SCENES.filter((s) => cfg.persons.includes(s.person) && p.forms[s.person]);
    const s = scenes[Math.floor(rnd() * scenes.length)];
    const [act, word] = VERB[p.key];
    big.replaceChildren(A.h('div', { class: 'g3-scene', role: 'img', 'aria-label': `${act}: an arrow from ${s.from || 'Rimon'} to ${s.to}` }, A.h('span', { class: 'g3-tag' }, s.from || 'Rimon'), A.h('span', { 'aria-hidden': 'true' }, '→'), A.h('span', { class: 'g3-tag' }, s.to)));
    prompt.textContent = `${act} ${word} … ${s.how}. (${n} of ${ROUNDS})`;
    const want = p.forms[s.person].he;
    const pool = Object.values(p.forms).map((f) => f.he);
    area.replaceChildren(choiceRow(options(want, pool, 4, rnd), (o) => o, (o) => {
      const ok = o === want;
      const said = Object.entries(p.forms).find(([, f]) => f.he === o)?.[0];
      grade(A, ok, { right: `${want}: ${word} ${s.to}.`, wrong: said ? `${o} would be for ${SCENES.find((x) => x.person === said)?.how.replace('Rimon is talking ', '') || said}.` : 'Not that one.' });
      if (ok) T.later(700, next);
      return ok;
    }, { label: 'Words' }));
  };
  loadG3(A.ctx, 'suffixes').then((d) => { if (!T.live()) return; preps = cfg.preps.map((k) => d.preps.find((p) => p.key === k)); next(); })
    .catch(() => A.announce('The words did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
