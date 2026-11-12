// Chain Links: Hebrew joins two nouns into one idea, "X of Y", with no word for "of": beit cholim, house of the sick, a
// hospital. The first noun often changes shape (bayit becomes beit) and never takes "the"; to say "the hospital" the
// "the" goes on the second noun. Build each chain from the tiles: first link, then second link.
import { mountArcade } from './arcade.js';
import { loadG3, shuffle } from './g3-core.js';
import { begin, grade, heButton, heText } from './g3-ui.js';

export const STORE_KEY = 'games.g3-chains.v1';
const ROUNDS = 6;
const spec = {
  id: 'g3-chains', title: 'Chain Links', titleHe: 'שַׁרְשֶׁרֶת',
  blurb: 'Two nouns side by side make "X of Y" in Hebrew: this is smichut, the construct chain. The first noun is the head; it often changes shape (bayit, house, becomes beit) and it never carries "the". When the whole chain is "the …", the ha- goes on the second noun. Build each chain from the tiles.',
  howTo: ['Read the English. Tap the first link (the head noun), then the second link.', 'Some tiles are the head noun in its stand-alone shape, or the second noun with or without "the": only one fits.', 'Level 4 has plural heads, which end in -ei. Level 5 mixes every kind.'],
  levels: [
    { name: 'Two nouns, no change', pick: (c) => !c.changed && !c.plural && !c.definite },
    { name: 'The first noun changes', pick: (c) => c.changed && !c.plural },
    { name: 'Where does "the" go?', pick: (c) => c.definite && !c.plural },
    { name: 'Plural heads: -ei', pick: (c) => c.plural },
    { name: 'All the chains', pick: () => true },
  ],
  par: () => ROUNDS * 20,
  seconds: () => 180,
  needsWords: false, needsLetters: false,
};
/** The tiles for a chain: its two links, the head's stand-alone form, the other-definiteness tail, and links from other chains. */
export function chainTiles(c, all, rnd = Math.random) {
  const tiles = [{ he: c.head, slot: 0 }, { he: c.tail, slot: 1 }];
  if (c.free.he !== c.head) tiles.push({ he: c.free.he, slot: -1, why: `${c.free.he} is the noun on its own; in a chain it is ${c.head}.` });
  if (c.tailAlt) tiles.push({ he: c.tailAlt.he, slot: -1, why: c.definite ? `"${c.en}" needs "the" on the second noun.` : `"${c.en}" has no "the".` });
  const others = shuffle(all.filter((x) => x.head !== c.head && x.tail !== c.tail), rnd);
  if (others[0]) tiles.push({ he: others[0].head, slot: -1, why: `${others[0].head} starts another chain (${others[0].en}).` });
  if (others[1]) tiles.push({ he: others[1].tail, slot: -1, why: `${others[1].tail} ends another chain (${others[1].en}).` });
  const seen = new Set();
  return shuffle(tiles.filter((t) => (seen.has(t.he) ? false : seen.add(t.he))), rnd);
}

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'ari', 'No word for "of". The nouns hold hands.',
    'Chains as written in the lessons, units and phrasebook; the stand-alone nouns from the word list. Not reviewed by a teacher.');
  const cfg = A.cfg, rnd = A.rnd;
  let all = [], deck = [], n = 0;
  const next = () => { if (n >= ROUNDS || !deck.length) { T.end({ won: true }); return; } n += 1; ask(deck[(n - 1) % deck.length]); };
  const ask = (c) => {
    let slot = 0, tries = 0;
    const slots = [A.h('span', { class: 'g3-tag', lang: 'he' }, '1 ?'), A.h('span', { class: 'g3-tag', lang: 'he' }, '2 ?')];
    big.replaceChildren(A.h('div', { class: 'g3-scene', dir: 'rtl', 'aria-live': 'polite' }, ...slots));
    prompt.textContent = `Chain ${n} of ${ROUNDS}: "${c.en}". Tap the first link.`;
    const tray = A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'Links' });
    tray.replaceChildren(...chainTiles(c, all, rnd).map((t) => {
      const b = heButton(A, t.he, () => {
        if (!T.live() || b.disabled) return;
        if (t.slot === slot) {
          slots[slot].replaceChildren(heText(A, t.he)); b.disabled = true; slot += 1;
          if (slot === 2) {
            grade(A, true, { right: `${c.head} ${c.tail}: ${c.en}.`, points: Math.max(6, 20 - 4 * tries) });
            for (const x of tray.querySelectorAll('button')) x.disabled = true;
            T.later(900, next);
          } else { A.sfx('drop'); prompt.textContent = `"${c.en}". Now the second link.`; }
        } else if (t.slot >= 0) { tries += 1; grade(A, false, { wrong: 'That is the second link. Start with the head.' }); } // stays: it is needed next
        else { tries += 1; b.disabled = true; grade(A, false, { wrong: t.why }); }
      });
      return b;
    }));
    area.replaceChildren(tray);
  };
  loadG3(A.ctx, 'chains').then((d) => {
    if (!T.live()) return;
    all = d.chains; deck = shuffle(all.filter(cfg.pick), rnd);
    next();
  }).catch(() => A.announce('The chains did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
