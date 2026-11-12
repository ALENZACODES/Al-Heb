// Ending Decoder: endings arrive on the tape one after another, on every little word (mine, to me, with me, me, to me
// (towards), in me, on him …). Read the ending and press the person. Right answers in a row build a streak bonus.
import { mountArcade } from './arcade.js';
import { loadG3, shuffle, allEndings } from './g3-core.js';
import { begin, grade, roundKeys, heText } from './g3-ui.js';

export const STORE_KEY = 'games.g3-decoder.v1';
const spec = {
  id: 'g3-decoder', title: 'Ending Decoder', titleHe: 'קוֹד',
  blurb: 'The person endings repeat across many little words: -i is me, -cha and -ach are you, -o is him, -a is her, -nu is us, -chem is you all, -hem and -hen are them. Learn them once and you can read shelanu, itanu, otanu and lanu at a glance. Decode each word on the tape: who is it about?',
  howTo: ['Read the word on the tape and press its person. Keys 1 to 9 press the person keys in order.', 'A wrong key greys out; the word waits for another try.', 'Right answers in a row add a streak bonus, up to 10 extra.', 'Each level adds persons and little words.'],
  levels: [
    { name: 'Me, him, her', persons: ['1sg', '3msg', '3fsg'], preps: ['shel', 'le', 'im'], count: 12 },
    { name: 'Us and you', persons: ['1sg', '2msg', '2fsg', '3msg', '3fsg', '1pl'], preps: ['shel', 'le', 'im'], count: 14 },
    { name: 'Them', persons: ['1sg', '2msg', '2fsg', '3msg', '3fsg', '1pl', '2mpl', '3mpl', '3fpl'], preps: ['le', 'im', 'et'], count: 16 },
    { name: 'More little words', persons: null, preps: ['shel', 'le', 'im', 'et', 'el', 'be', 'al', 'etzel', 'min', 'bishvil'], count: 18 },
    { name: 'Full tape', persons: null, preps: null, count: 24 },
  ],
  par: (l, cfg) => cfg.count * 14,
  seconds: (l, cfg) => cfg.count * 9,
  needsWords: false, needsLetters: false,
};
/** Streak bonus: 0 for the first right answer, then 2 more for each in a row, at most 10. */
export const streakBonus = (streak) => Math.min(10, Math.max(0, streak - 1) * 2);

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'ari', 'The ending tells you who.',
    'Endings copied from the app\'s word lists and phrasebook (data/games/g3/suffixes.json). Not reviewed by a teacher.');
  const cfg = A.cfg, rnd = A.rnd;
  let tape = [], at = 0, streak = 0, tried = new Set(), suf = null, keysRow = null;
  const draw = () => {
    const it = tape[at];
    big.replaceChildren(heText(A, it.he));
    prompt.textContent = `Word ${at + 1} of ${tape.length} (${it.prepEn}). Who is it about?${streak > 1 ? ` Streak ${streak}.` : ''}`;
    for (const b of keysRow.querySelectorAll('button')) b.disabled = tried.has(b.getAttribute('data-key'));
  };
  const press = (person) => {
    const it = tape[at];
    if (!it || !T.live() || tried.has(person)) return;
    if (person === it.person) {
      streak = tried.size ? 0 : streak + 1;
      grade(A, true, { right: `${it.he}: ${it.prepEn}, ${suf.personEn[person]}.`, points: (tried.size ? 4 : 10) + streakBonus(streak) });
      at += 1; tried = new Set();
      if (at >= tape.length) T.end({ won: true }); else draw();
    } else { streak = 0; tried.add(person); grade(A, false, { wrong: `Not ${suf.personEn[person]}. Look at the ending of ${it.he}.` }); draw(); }
  };
  roundKeys(A, (k) => { const b = keysRow?.querySelectorAll('button')[Number(k) - 1]; if (b && !b.disabled) { b.click(); return true; } return false; });
  loadG3(A.ctx, 'suffixes').then((d) => {
    if (!T.live()) return;
    suf = d;
    const pool = allEndings(d).filter((e) => (!cfg.persons || cfg.persons.includes(e.person)) && (!cfg.preps || cfg.preps.includes(e.prep)));
    const persons = d.persons.filter((p) => pool.some((e) => e.person === p));
    tape = [];
    while (tape.length < cfg.count) tape.push(...shuffle(pool, rnd));
    tape = tape.slice(0, cfg.count);
    keysRow = A.h('div', { class: 'arc-choices g3-bins', role: 'group', 'aria-label': 'Person keys' },
      ...persons.map((p, i) => A.h('button', { type: 'button', class: 'arc-choice', 'data-key': p, onclick: () => press(p) }, `${i + 1}. ${d.personEn[p]}`)));
    area.replaceChildren(keysRow);
    draw();
  }).catch(() => A.announce('The tape did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
