// One, Two, Many: Hebrew has a special form for "two" of some things, the dual, ending -ayim: one day, two days (one
// word), many days. Body parts that come in pairs use that form for two and for more. A few things look like a pair word
// but are one object (glasses, trousers) or are not about two at all (water, sky).
import { mountArcade, choiceRow } from './arcade.js';
import { loadG3, shuffle, formForCount } from './g3-core.js';
import { begin, grade, numberKeys, countRow, binRow, heText, sayEntry } from './g3-ui.js';

export const STORE_KEY = 'games.g3-onetwomany.v1';
const ROUNDS = 10;
const spec = {
  id: 'g3-onetwomany', title: 'One, Two, Many', titleHe: 'שְׁנַיִם',
  blurb: 'Hebrew counts one, two and many. For time words and big numbers there is a single word meaning "two of them": the dual, ending -ayim. Two days is one word, two years is one word, two hundred is one word. Body pairs (eyes, ears, feet) use the -ayim word for two and for more. Count the dots and pick the word.',
  howTo: ['Count the dots, read the thing, pick the word. Keys 1 to 4 pick.', 'Level 3 is about body pairs: the -ayim word covers two and many.', 'Level 5: a word ending in -ayim appears. Is it about two of something, or is it one thing?'],
  levels: [
    { name: 'One or two?', kinds: ['count'], counts: [1, 2] },
    { name: 'One, two or many', kinds: ['count'], counts: [1, 2, 3, 4, 5, 6, 7] },
    { name: 'Body pairs', kinds: ['pair'], counts: [1, 2, 4] },
    { name: 'Everything together', kinds: ['count', 'pair'], counts: [1, 2, 3, 5, 7] },
    { name: 'Two, or just one thing?', mode: 'sort' },
  ],
  par: () => ROUNDS * 10,
  seconds: () => 150,
  needsWords: false, needsLetters: false,
};
const FORM_EN = { one: 'one', two: 'two (the -ayim word)', many: 'many' };

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'ari', 'Two has its own word. Count first.',
    'Forms from the word list; the two-forms come from the Torah text, a lesson and two little books where the list has none. Not reviewed by a teacher.');
  const cfg = A.cfg, rnd = A.rnd;
  numberKeys(A, () => area.querySelector('.arc-choices'));
  let sets = [], n = 0;
  const next = () => { if (n >= ROUNDS) { T.end({ won: true }); return; } n += 1; cfg.mode === 'sort' ? sort() : ask(); };
  const ask = () => {
    const pool = sets.filter((s) => cfg.kinds.includes(s.kind));
    const set = pool[Math.floor(rnd() * pool.length)];
    const counts = set.kind === 'pair' ? cfg.counts.filter((c) => c !== 3) : cfg.counts;
    const count = counts[Math.floor(rnd() * counts.length)], want = formForCount(set, count);
    big.replaceChildren(countRow(A, count, '●'));
    prompt.textContent = `${count} × ${set.en}. Which word? (${n} of ${ROUNDS})`;
    const own = ['one', 'two', 'many'].filter((k) => set[k]).map((k) => ({ he: set[k].he, key: k, entry: set[k] }));
    const other = shuffle(sets.filter((s) => s !== set && s.kind !== 'looks' && s.kind !== 'single'), rnd)[0];
    const extra = other ? [{ he: other[want]?.he || other.one.he, key: 'other', entry: null }] : [];
    const opts = shuffle([...own, ...extra].filter((o, i, a) => a.findIndex((x) => x.he === o.he) === i), rnd);
    area.replaceChildren(choiceRow(opts, (o) => o.he, (o) => {
      const ok = o.key === want;
      const why = set.kind === 'pair' && count > 2 ? ' Body pairs keep the -ayim word for more than two.' : '';
      grade(A, ok, { right: `${count} × ${set.en}: ${set[want].he} (${FORM_EN[want]}).${why}`, wrong: o.key === 'other' ? `${o.he} is another word.` : `${o.he} is the "${FORM_EN[o.key]}" word.` });
      if (ok) { sayEntry(A, set[want]); T.later(700, next); }
      return ok;
    }, { label: 'Words' }));
  };
  const sort = () => {
    const pool = sets.filter((s) => s.two || s.kind === 'single' || s.kind === 'looks');
    const set = pool[Math.floor(rnd() * pool.length)];
    const word = set.two || set.one, isTwo = !!set.two;
    big.replaceChildren(heText(A, word.he));
    prompt.textContent = `Word ${n} of ${ROUNDS}: ${set.en.replace(/ \(.*\)$/, '')}. Two of something, or one thing?`;
    const row = binRow(A, [{ key: 'two', label: 'Two of something', sub: 'a real pair or a count of two' }, { key: 'one', label: 'One thing', sub: 'only looks like a pair word' }], (k) => {
      const ok = (k === 'two') === isTwo;
      grade(A, ok, { right: isTwo ? `${word.he}: two of them (${set.en}).` : `${word.he}: ${set.en}. One thing, even with -ayim.`, wrong: 'Think about what the word means, not how it ends.' });
      if (ok) { for (const b of row.querySelectorAll('button')) b.disabled = true; T.later(700, next); } else row.querySelector(`[data-key="${k}"]`).disabled = true;
    }, { label: 'Two or one' });
    area.replaceChildren(row);
  };
  loadG3(A.ctx, 'duals').then((d) => { if (!T.live()) return; sets = d.sets; next(); })
    .catch(() => A.announce('The words did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
