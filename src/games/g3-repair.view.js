// Repair Shop: a line comes in with one word that does not agree with who is talking or who is listening. Find the broken
// word, then pick the part that fixes it. Both parts on the bench are real words; only one fits this speaker or listener.
import { mountArcade, choiceRow } from './arcade.js';
import { loadG3, shuffle, brokenLine, genderDiff } from './g3-core.js';
import { begin, grade, wordLine, heText } from './g3-ui.js';

export const STORE_KEY = 'games.g3-repair.v1';
const ROUNDS = 8;
const PEOPLE = { m: 'Ari', f: 'Noa' };
const spec = {
  id: 'g3-repair', title: 'Repair Shop', titleHe: 'בְּעָיָה',
  blurb: 'In Hebrew the words around "I" and "you" show whether a man or a woman is talking or being talked to. A line has come in broken: one word is in the wrong form for the person. Read who is speaking and to whom, tap the broken word, then fit the right part.',
  howTo: ['Read the job card: who is talking, and to whom.', 'Tap the word that does not fit. Then pick the right form from the two parts on the bench.', 'Level 4 has lines with more than one word that changes (only one is broken). Level 5 is against the clock.'],
  levels: [
    { name: 'Who is talking?', who: ['speaker'] },
    { name: 'Who is listening?', who: ['addressee'] },
    { name: 'Talking or listening', who: ['speaker', 'addressee'] },
    { name: 'Longer repairs', who: ['speaker', 'addressee'], min: 2 },
    { name: 'Rush job', who: ['speaker', 'addressee'], fast: true },
  ],
  par: () => ROUNDS * 16,
  seconds: (l) => (l === 5 ? 120 : 180),
  needsWords: false, needsLetters: false,
};
/** The job card line: who talks to whom, for a gendered line said by or to `g`. */
export const jobCard = (who, g) => (who === 'speaker' ? `${PEOPLE[g]} is talking.` : `${PEOPLE[g === 'm' ? 'f' : 'm']} is talking to ${PEOPLE[g]}.`);

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'noa', 'One word does not fit. Find it, fix it.',
    'Lines from the gender pairs and the phrasebook; the broken line swaps in the word from the other form of the same line. Not reviewed by a teacher.');
  const cfg = A.cfg, rnd = A.rnd;
  let items = [], n = 0;
  const next = () => { if (n >= ROUNDS || !items.length) { T.end({ won: true }); return; } n += 1; ask(items[(n - 1) % items.length]); };
  const ask = (it) => {
    const g = rnd() < 0.5 ? 'm' : 'f', br = brokenLine(it, g, rnd);
    let wrongTaps = 0;
    big.replaceChildren(A.h('p', { class: 'g3-tag' }, `Job ${n} of ${ROUNDS}: ${jobCard(it.who, g)}`));
    prompt.textContent = `"${it.en}" Tap the word that does not fit.`;
    const row = wordLine(A, br.words.map((x) => x.w), (i, b) => {
      if (!T.live() || b.disabled) return;
      if (i !== br.at) { wrongTaps += 1; b.disabled = true; grade(A, false, { wrong: `${br.words[i].w} is fine for ${PEOPLE[g]}.` }); return; }
      b.classList.add('is-picked');
      for (const x of row.querySelectorAll('button')) x.disabled = true;
      A.sfx('drop');
      prompt.textContent = `${br.bad} is the broken part. Which part fits?`;
      area.replaceChildren(row, choiceRow(shuffle([br.fix, br.bad], rnd), (o) => o, (o) => {
        const ok = o === br.fix;
        grade(A, ok, { right: `Fixed: ${it[g]}`, wrong: `${o} is the form for ${PEOPLE[g === 'm' ? 'f' : 'm']}.`, points: Math.max(6, 16 - 4 * wrongTaps) });
        if (ok) { big.replaceChildren(heText(A, it[g])); T.later(cfg.fast ? 700 : 1100, next); }
        return ok;
      }, { label: 'Parts' }));
    }, { label: 'The broken line' });
    area.replaceChildren(row);
  };
  loadG3(A.ctx, 'gender').then((d) => {
    if (!T.live()) return;
    items = shuffle(d.items.filter((x) => { const df = genderDiff(x.m, x.f); return df?.length && cfg.who.includes(x.who) && (!cfg.min || df.length >= cfg.min); }), rnd);
    next();
  }).catch(() => A.announce('The lines did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
