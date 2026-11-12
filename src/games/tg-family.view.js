// Family Letters: many Hebrew words are built around three core letters, and words that share them often share a
// meaning. Tap the three letters a word shares with its family. The families come from the app's word list and have
// not been confirmed by a native reader, so the game says the words share letters, not that they share a root.
import { mountArcade, choiceRow } from './arcade.js';
import { loadData, rootLetters, rootPositions, tappedSpellsRoot, letterClusters, bare, toBase, shuffle, options } from './tg-core.js';
import { host, track, numberKeys, grade, draftNote, ensureStyle } from './tg-ui.js';

export const STORE_KEY = 'games.tg-family.v1';
const ROUNDS = 8;

const spec = {
  id: 'tg-family', title: 'Family Letters', titleHe: 'מִשְׁפָּחָה',
  blurb: 'Hebrew builds families of words around three core letters: a story, a book and a number share three letters. Find the three letters each word shares with its family. Extra letters in front, inside and at the end are the pattern; the three are the core.',
  howTo: ['Tap the three shared letters in reading order (right to left). A wrong tap starts that word again.', 'Level 1 shows the three letters; level 2 shows two family members instead.', 'Level 3 hides the hints; level 4: pick the word that belongs to the family.', 'Level 5: longer words, no hints.'],
  levels: [
    { name: 'Letters shown', mode: 'tap', hint: 'letters', max: 5 },
    { name: 'Two relatives shown', mode: 'tap', hint: 'relatives', max: 6 },
    { name: 'No hints', mode: 'tap', hint: 'none', max: 6 },
    { name: 'Who belongs?', mode: 'belongs' },
    { name: 'Longer words', mode: 'tap', hint: 'none', min: 5, max: 9 },
  ],
  par: () => ROUNDS * 10,
  seconds: () => 150,
  needsWords: false, needsLetters: false,
};

/** Round items: family words whose core letters can be found in order, within the level's length band. */
export function familyItems(families, { min = 3, max = 9 } = {}) {
  const out = [];
  for (const f of families || []) {
    const letters = rootLetters(f.root);
    for (const w of f.words || []) {
      const len = bare(w.he).length;
      if (letters.length === 3 && len >= min && len <= max && rootPositions(w.he, letters)) out.push({ family: f, word: w, letters });
    }
  }
  return out;
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const hint = A.h('p', { class: 'muted' });
  const wordEl = A.h('div', { class: 'tg-verse', lang: 'he', dir: 'rtl' });
  const area = A.h('div');
  A.board.replaceChildren(host(A, 'ari', 'Three letters hold a word family together.'), prompt, hint, wordEl, area,
    draftNote(A, 'Families come from the app\'s word list and dictionary source. A native reader has not confirmed them yet.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  let families = [], items = [], n = 0;
  const next = () => { if (n >= ROUNDS || !items.length) { T.end({ won: true }); return; } n += 1; cfg.mode === 'belongs' ? belongs() : tap(); };
  const tap = () => {
    const it = items[(n - 1) % items.length];
    const word = it.word, letters = it.letters;
    let taps = [];
    prompt.textContent = `Word ${n} of ${ROUNDS}: tap the three letters it shares with its family. "${word.en.split(/[;,(]/)[0].trim()}"`;
    const rel = it.family.words.filter((w) => w.id !== word.id).slice(0, 2);
    hint.replaceChildren(...(cfg.hint === 'letters' ? ['Family letters: ', A.h('span', { lang: 'he', dir: 'rtl', class: 'he' }, letters.join(' ־ '))]
      : cfg.hint === 'relatives' ? ['Relatives: ', ...rel.flatMap((w, i) => [i ? ', ' : '', A.h('span', { lang: 'he', dir: 'rtl', class: 'he' }, w.he), ` (${w.en.split(/[;,(]/)[0].trim()})`])]
      : ['No hints at this level.']));
    const cl = letterClusters(word.he);
    const buttons = cl.map((c, i) => {
      const b = A.h('button', { type: 'button', class: 'tg-let', style: 'font-size:2.2rem;min-inline-size:2.6rem' }, c.text);
      b.addEventListener('click', () => {
        if (b.disabled) return;
        taps.push(i); b.classList.add('is-good');
        const sofar = taps.map((p) => toBase(cl[p].base));
        const okSoFar = sofar.every((x, k) => x === letters[k]) && taps.every((p, k) => k === 0 || p > taps[k - 1]);
        if (!okSoFar) {
          grade(A, false, { wrong: `Not ${cl[i].base} yet. The family letters are ${letters.join(', ')}; start this word again.` });
          taps = []; for (const x of buttons) x.classList.remove('is-good');
          return;
        }
        if (taps.length === 3 && tappedSpellsRoot(word.he, letters, taps)) {
          for (const x of buttons) x.disabled = true;
          grade(A, true, { right: `${word.he} (${word.translit}) shares ${letters.join(' ')} with ${rel.map((w) => w.he).join(', ') || 'its family'}.` });
          A.sayWord(word);
          T.later(1000, next);
        }
      });
      return b;
    });
    wordEl.replaceChildren(...buttons);
    area.replaceChildren();
  };
  const belongs = () => {
    const fam = families[(n - 1) % families.length];
    const [shown, answer] = shuffle(fam.words, rnd);
    const others = families.filter((f) => f !== fam).flatMap((f) => f.words).filter((w) => !rootPositions(w.he, rootLetters(fam.root)));
    prompt.textContent = `Family ${n} of ${ROUNDS}: which word shares three letters with this one?`;
    hint.textContent = `"${shown.en.split(/[;,(]/)[0].trim()}"`;
    wordEl.textContent = shown.he;
    area.replaceChildren(choiceRow(options(answer, others, 4, rnd, (w) => bare(w.he)), (o) => o.he, (o) => {
      const ok = o.id === answer.id;
      grade(A, ok, { right: `${answer.he}: ${rootLetters(fam.root).join(' ')} again. It means "${answer.en.split(/[;,(]/)[0].trim()}".`, wrong: `${o.he} does not have ${rootLetters(fam.root).join(', ')} in order.` });
      if (ok) { A.sayWord(answer); T.later(1100, next); }
      return ok;
    }, { label: 'Words' }));
  };
  loadData(A.ctx, 'data/games/tg/families.json').then((d) => {
    if (!T.live()) return;
    families = shuffle((d.families || []).filter((f) => f.words.length >= 2), rnd);
    items = shuffle(familyItems(families, { min: cfg.min || 3, max: cfg.max || 9 }).filter((x) => x.family.words.length >= 2), rnd);
    next();
  }).catch(() => A.announce('The word families did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
