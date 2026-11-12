// Article Whack: words pop up in the holes. Tap only the ones that mean "the …": ha- glued to the front, usually with a
// dot (dagesh) doubling the next letter, or ha-/he- with a longer vowel before a letter that cannot be doubled.
// Leave the plain words alone, and the words that only happen to start with he.
import { mountArcade } from './arcade.js';
import { loadG3, shuffle, gloss } from './g3-core.js';
import { begin, grade, roundKeys } from './g3-ui.js';

export const STORE_KEY = 'games.g3-whack.v1';
const TARGET = 10;
const spec = {
  id: 'g3-whack', title: 'Article Whack', titleHe: 'הַבַּיִת',
  blurb: 'Hebrew has no separate word for "the". It is the letter he glued to the front of the noun, usually with a dot in the next letter. Before aleph, ayin and resh (and often he and chet) the dot cannot go in, so the vowel under the he changes instead. Whack every "the" word as it pops up. Leave the plain nouns alone.',
  howTo: ['Tap a word that means "the …". Ten good whacks finish the round.', 'Tapping a plain word ("a …") costs points.', 'Keys 1 to 9 match the holes, top row first.', 'From level 3 some plain words also start with he: look for the dot or the long vowel.'],
  levels: [
    { name: 'The or a?', holes: 4, decoys: 'base', stay: 4.5, every: 1.4 },
    { name: 'More holes', holes: 6, decoys: 'base', stay: 4, every: 1.1 },
    { name: 'Not every he is "the"', holes: 6, decoys: 'mixed', stay: 3.5, every: 1 },
    { name: 'No dot to help', holes: 9, decoys: 'mixed', stay: 3.2, every: 0.9, gutturals: true },
    { name: 'Whack attack', holes: 9, decoys: 'mixed', stay: 2.4, every: 0.6, gutturals: true },
  ],
  par: () => TARGET * 10,
  seconds: () => 90,
  needsWords: false, needsLetters: false,
};
/** Verbs (dictionary form) that start with he but are not "the": the he carries hiriq, tsere or a vav vowel, never the article's vowels. */
export const heDecoys = (verbs) => verbs.filter((v) => /^ה[ִֵ]|^הוֹ|^הוּ/.test(v.he));

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'rimon', 'Only "the" words. Leave the others.',
    '"The" forms are written as they are in the lessons, the phrasebook and the Torah text; the plain words are from the word list and the verb list. Not reviewed by a teacher.');
  big.textContent = '';
  const cfg = A.cfg, rnd = A.rnd;
  let targets = [], decoys = [], hits = 0, t = 0;
  const holes = Array.from({ length: cfg.holes }, (_, i) => ({ i, item: null, at: 0 }));
  const grid = A.h('div', { class: 'g3-holes', role: 'group', 'aria-label': 'Holes' });
  const buttons = holes.map((h) => A.h('button', { type: 'button', class: 'g3-hole', lang: 'he', dir: 'rtl', 'aria-label': `Hole ${h.i + 1}, empty`, onclick: () => whack(h) }));
  for (const b of buttons) b.disabled = true;
  grid.replaceChildren(...buttons);
  area.replaceChildren(grid);
  const show = (h) => {
    const b = buttons[h.i];
    b.textContent = h.item ? h.item.he : '';
    b.disabled = !h.item;
    b.setAttribute('aria-label', h.item ? `Hole ${h.i + 1}: ${h.item.he}` : `Hole ${h.i + 1}, empty`);
  };
  const pick = () => (rnd() < 0.5 ? { ...targets[Math.floor(rnd() * targets.length)], the: true } : { ...decoys[Math.floor(rnd() * decoys.length)], the: false });
  const pop = (h) => { h.item = pick(); h.at = t; show(h); };
  const whack = (h) => {
    if (!h.item || !T.live()) return;
    const it = h.item;
    h.item = null; show(h);
    if (it.the) {
      hits += 1;
      grade(A, true, { right: `${it.he}: the ${it.en}.${it.note ? ' ' + it.note : ''}` });
      prompt.textContent = `${hits} of ${TARGET} whacked.`;
      if (hits >= TARGET) { T.end({ won: true }); return; }
    } else grade(A, false, { wrong: `${it.he} is not "the …": ${it.en}.` });
    pop(h); // a new word comes up in its place
  };
  roundKeys(A, (k) => { const i = Number(k) - 1; if (buttons[i] && !buttons[i].disabled) { buttons[i].click(); return true; } return false; });
  // in the browser words also come and go on their own; the arcade loop holds still during the countdown and while paused
  A.loop(() => {
    if (!T.live() || !targets.length) return;
    t += 0.1;
    for (const h of holes) if (h.item && t - h.at > cfg.stay) { h.item = null; show(h); }
    if (Math.round(t * 10) % Math.round(cfg.every * 10) === 0) { const empty = holes.filter((h) => !h.item); if (empty.length) pop(empty[Math.floor(rnd() * empty.length)]); }
  }, 100);
  Promise.all([loadG3(A.ctx, 'article'), loadG3(A.ctx, 'verbs')]).then(([art, vb]) => {
    if (!T.live()) return;
    const pairs = art.pairs.filter((p) => !p.baseFlagged);
    const gut = (p) => !p.dagesh;
    targets = shuffle(cfg.gutturals ? [...pairs.filter(gut), ...pairs.filter(gut), ...pairs] : pairs, rnd).map((p) => ({ he: p.the, en: p.base.en, note: p.dagesh ? '' : 'No dot here: the vowel under he changes instead.' }));
    const plain = pairs.map((p) => ({ he: p.base.he, en: 'a ' + p.base.en }));
    const heWords = heDecoys(vb.verbs.filter((v) => v.level === 'A1')).map((v) => ({ he: v.he, en: `a verb, ${gloss(v.en)}` }));
    decoys = cfg.decoys === 'mixed' && heWords.length ? [...plain, ...heWords, ...heWords] : plain;
    prompt.textContent = `0 of ${TARGET} whacked.`;
    for (const h of holes.slice(0, Math.min(3, holes.length))) pop(h);
  }).catch(() => A.announce('The words did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
