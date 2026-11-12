// Vowel Dominoes: a chain of syllables. Play a tile from your hand that shares the open end's letter or its vowel sound.
// From level 3 the hand holds the twin vowel marks (kamatz with patach, tsere with segol), which match by sound. At level
// 5 only the vowel sound counts. Syllables are built from the app's tables (src/games/syllables.js); Israeli sounds.
import { mountArcade } from './arcade.js';
import { tile, fits, dealHand, MAIN_MARKS, VOWEL_MARKS, SOUND_CARDS, shuffle } from './g1-core.js';
import { host, track, grade, draftNote, ensureStyle, he, numberKeys, loadSyllables, saySyllable } from './g1-ui.js';

export const STORE_KEY = 'games.g1-vowelchain.v1';

const spec = {
  id: 'g1-vowelchain', title: 'Vowel Dominoes', titleHe: 'שַׁרְשֶׁרֶת',
  blurb: 'Grow the chain. The last syllable is the open end: play a tile from your hand that has the same letter or the same vowel sound. Stuck? Draw a tile. Later levels add vowel marks that look different but sound the same.',
  howTo: ['Read the open end (outlined, on the left end of the chain).', 'Tap a tile from your hand that shares its letter or its vowel sound, or press its number key.', 'A tile that does not fit costs a point. Draw costs a point but always helps when nothing fits.', 'At level 5 only the vowel sound counts.'],
  levels: [
    { name: 'Five marks', marks: 'main', hand: 5, goal: 8, rule: 'either' },
    { name: 'Longer chain', marks: 'main', hand: 5, goal: 10, rule: 'either' },
    { name: 'Twin marks', marks: 'all', hand: 5, goal: 10, rule: 'either' },
    { name: 'Smaller hand', marks: 'all', hand: 4, goal: 12, rule: 'either' },
    { name: 'Sound only', marks: 'all', hand: 4, goal: 12, rule: 'vowel' },
  ],
  par: (l, cfg) => cfg.goal * 10,
  seconds: (l, cfg) => 30 + cfg.goal * 8,
  needsWords: false, needsLetters: false,
};

/** Does the tile fit under the level's rule? */
export const fitsRule = (t, open, rule) => (rule === 'vowel' ? t.v.sound === open.v.sound : fits(t, open));
const SOUND_WORD = { a: 'a', e: 'e', i: 'i', o: 'o', u: 'u' };

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const marks = cfg.marks === 'all' ? VOWEL_MARKS : MAIN_MARKS;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const chainEl = A.h('div', { class: 'g1-chain', role: 'list', 'aria-label': 'The chain, open end last' });
  const handEl = A.h('div', {});
  const actions = A.h('div', { class: 'row' });
  A.board.replaceChildren(host(A, 'ari', 'Same letter or same vowel sound: play it on the end.'), prompt, chainEl, handEl, actions,
    draftNote(A, 'Israeli sounds. In Ashkenazi reading kamatz and tsere sound different from patach and segol.'));
  numberKeys(A, () => handEl);
  let syllables = [];
  const randomTile = () => tile(SOUND_CARDS[Math.floor(rnd() * SOUND_CARDS.length)], marks[Math.floor(rnd() * marks.length)]);
  const chain = [randomTile()];
  let hand = dealHand(chain[0], cfg.hand, marks, rnd);
  const open = () => chain[chain.length - 1];
  const say = (t) => `${t.c.name} with ${t.v.id}, “${t.tr}”`;
  const draw = () => {
    chainEl.replaceChildren(...chain.slice(-7).map((t) => A.h('span', { role: 'listitem', lang: 'he', dir: 'rtl' }, t.he)));
    prompt.replaceChildren(`${chain.length - 1} of ${cfg.goal} played. Open end: `, he(A, open().he), ` (“${open().tr}”). ${cfg.rule === 'vowel' ? `Play the ${SOUND_WORD[open().v.sound]} sound.` : 'Same letter or same vowel sound.'}`);
    handEl.replaceChildren(A.h('div', { class: 'arc-choices g1-rtl', role: 'group', 'aria-label': 'Your hand' }, ...hand.map((t) => {
      const b = A.h('button', { type: 'button', class: 'arc-choice', 'aria-label': say(t) }, he(A, t.he));
      b.addEventListener('click', () => play(t));
      return b;
    })));
  };
  const drawTile = () => {
    const helpful = !hand.some((t) => fitsRule(t, open(), cfg.rule));
    let t = randomTile(), guard = 0;
    while (helpful && !fitsRule(t, open(), cfg.rule) && guard++ < 200) t = randomTile();
    if (hand.length < 8) hand.push(t); else hand[Math.floor(rnd() * hand.length)] = t;
    A.addScore(-1); A.sfx('drop'); A.announce(`You drew ${say(t)}.`);
    draw();
  };
  const play = (t) => {
    if (!T.live()) return;
    if (!fitsRule(t, open(), cfg.rule)) { grade(A, false, { wrong: `${say(t)} does not fit “${open().tr}”.` }); return; }
    const same = t.c.he === open().c.he ? 'same letter' : 'same vowel sound';
    chain.push(t); hand = hand.filter((x) => x !== t);
    grade(A, true, { right: `${say(t)}: ${same}.` });
    saySyllable(A, syllables, t.he);
    if (chain.length - 1 >= cfg.goal) { A.addScore(15); A.announce(`Chain of ${cfg.goal} complete!`); T.end({ won: true }); return; }
    if (hand.length < cfg.hand) hand.push(randomTile());
    draw();
  };
  actions.replaceChildren(A.h('button', { type: 'button', class: 'btn secondary', onclick: drawTile }, 'Draw a Tile'));
  loadSyllables(A.ctx).then((s) => { syllables = s; }).catch(() => {});
  draw();
}

export const mount = mountArcade(spec, setup);
