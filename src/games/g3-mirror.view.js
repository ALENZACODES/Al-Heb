// Mirror Flip: Ari said a line; now Noa says it (or now it is said to Noa). Which words change? In Hebrew "I", "you"
// and the present tense all show whether a man or a woman is talking or listening. Tap every word that changes.
import { mountArcade } from './arcade.js';
import { loadG3, shuffle, genderDiff, wordsOf } from './g3-core.js';
import { begin, grade, wordLine, heText } from './g3-ui.js';

export const STORE_KEY = 'games.g3-mirror.v1';
const ROUNDS = 8;
const spec = {
  id: 'g3-mirror', title: 'Mirror Flip', titleHe: 'מַרְאָה',
  blurb: 'English "I am tired" is the same for everyone. Hebrew is not: the adjective and the present-tense verb change when a woman says it, and "you" and its verbs change when you talk to a woman. Ari says a line; then the mirror flips. Tap each word that has to change, and see the new line.',
  howTo: ['Read the line and who says it (or who hears it). Then read the flip.', 'Tap every word that changes. A word that stays the same greys out and costs points.', 'When all the changing words are found, the new line appears.', 'Level 4 flips both ways; level 5 is against the clock.'],
  levels: [
    { name: 'Now Noa says it', who: ['speaker'], dir: ['m'], max: 1 },
    { name: 'Now say it to Noa', who: ['addressee'], dir: ['m'], max: 1 },
    { name: 'More than one word', who: ['speaker', 'addressee'], dir: ['m'], min: 2 },
    { name: 'Both ways', who: ['speaker', 'addressee'], dir: ['m', 'f'] },
    { name: 'Quick mirror', who: ['speaker', 'addressee'], dir: ['m', 'f'], fast: true },
  ],
  par: () => ROUNDS * 12,
  seconds: (l) => (l === 5 ? 120 : 180),
  needsWords: false, needsLetters: false,
};
const PEOPLE = { m: 'Ari', f: 'Noa' };
/** Lines for a level: right speaker or listener kind, and the number of changing words in range. */
export const mirrorItems = (items, cfg) => items.filter((x) => { const d = genderDiff(x.m, x.f); return d && d.length && cfg.who.includes(x.who) && (!cfg.max || d.length <= cfg.max) && (!cfg.min || d.length >= cfg.min); });

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'noa', 'Same line, other person. What changes?',
    'Lines from the gender pairs and the phrasebook, both forms as written there. Not reviewed by a teacher.');
  const cfg = A.cfg, rnd = A.rnd;
  let items = [], n = 0;
  const next = () => { if (n >= ROUNDS || !items.length) { T.end({ won: true }); return; } n += 1; ask(items[(n - 1) % items.length]); };
  const ask = (it) => {
    const from = cfg.dir[Math.floor(rnd() * cfg.dir.length)], to = from === 'm' ? 'f' : 'm';
    const diff = genderDiff(it.m, it.f), ws = wordsOf(it[from]), found = new Set();
    const said = it.who === 'speaker' ? `${PEOPLE[from]} says` : `Said to ${PEOPLE[from]}`;
    const flip = it.who === 'speaker' ? `Now ${PEOPLE[to]} says it.` : `Now say it to ${PEOPLE[to]}.`;
    big.replaceChildren(heText(A, it[from]));
    prompt.textContent = `${said}: "${it.en}" ${flip} Tap the words that change. (${n} of ${ROUNDS})`;
    const row = wordLine(A, ws.map((x) => x.w), (i, b) => {
      if (!T.live() || b.disabled) return;
      if (diff.includes(i)) {
        found.add(i); b.disabled = true; b.classList.add('is-good');
        grade(A, true, { right: `${ws[i].w} changes.`, points: 6 });
        if (found.size === diff.length) {
          big.replaceChildren(heText(A, it[to]));
          A.announce(`${PEOPLE[to]}: ${it[to]}`);
          for (const x of row.querySelectorAll('button')) x.disabled = true;
          T.later(cfg.fast ? 700 : 1200, next);
        }
      } else { b.disabled = true; b.classList.add('is-bad'); grade(A, false, { wrong: `${ws[i].w} stays the same for ${PEOPLE[to]}.` }); }
    }, { label: 'Words of the line' });
    area.replaceChildren(row);
  };
  loadG3(A.ctx, 'gender').then((d) => { if (!T.live()) return; items = shuffle(mirrorItems(d.items, cfg), rnd); next(); })
    .catch(() => A.announce('The lines did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
