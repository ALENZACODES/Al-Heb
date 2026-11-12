// Look-Alike Duel: two letters that are easy to mix up stand side by side and one name is called. Tap the one called,
// quickly: answers inside two seconds earn a speed bonus. Later rounds call the Hebrew name, then only the sound.
// Pairs come from each letter's look-alike list in the app's letter data.
import { mountArcade } from './arcade.js';
import { lookalikePairs, shuffle } from './g1-core.js';
import { host, track, grade, draftNote, ensureStyle, he, markButton, roundKeys, series } from './g1-ui.js';

export const STORE_KEY = 'games.g1-duel.v1';

const spec = {
  id: 'g1-duel', title: 'Look-Alike Duel', titleHe: 'תְּאוֹם',
  blurb: 'Bet or kaf? Vav or zayin? Two look-alike letters face off and one is called. Tap it, or press the left or right arrow. Fast, right answers earn a bonus.',
  howTo: ['Read (or hear) the letter that is called.', 'Tap it, or press the arrow on its side.', 'Inside two seconds: bonus points. A wrong tap costs a point.', 'Level 3 calls the Hebrew name; levels 4 and 5 call only the sound.'],
  levels: [
    { name: 'English names', call: 'name', count: 12 },
    { name: 'More duels', call: 'name', count: 16 },
    { name: 'Hebrew names', call: 'nameHe', count: 16 },
    { name: 'By sound', call: 'sound', count: 16 },
    { name: 'Mixed and fast', call: 'mixed', count: 20 },
  ],
  par: (l, cfg) => cfg.count * 13,
  seconds: (l, cfg) => 20 + cfg.count * 6,
  needsWords: false,
};

/** The pairs to duel, with the sound call left out where both letters sound the same (a final and its letter's look-alike). */
export function duelPairs(letters, call) {
  return lookalikePairs(letters).filter(([a, b]) => call !== 'sound' || (a.sound && b.sound && a.sound !== b.sound));
}
export const speedBonus = (ms) => (ms < 2000 ? 5 : ms < 3500 ? 2 : 0);

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const area = A.h('div', {});
  A.board.replaceChildren(host(A, 'ari', 'One is called. Pick your side.'), prompt, area,
    draftNote(A, 'Look-alike pairs and sounds come from the app\'s letter data.'));
  let sides = [];
  roundKeys(A, (k) => { const b = k === 'left' ? sides[0] : k === 'right' ? sides[1] : null; if (b && !b.disabled) { b.click(); return true; } return false; });
  const callOf = (l, how) => (how === 'nameHe' ? he(A, l.nameHe) : how === 'sound' ? `the letter that says: ${l.sound}` : l.name);
  const pairs = duelPairs(A.letters, cfg.call === 'mixed' ? 'sound' : cfg.call);
  if (!pairs.length) { A.announce('No look-alike pairs loaded.'); return; }
  const deck = Array.from({ length: cfg.count }, (_, i) => pairs[i % pairs.length]);
  const order = shuffle(deck, rnd);
  series(A, T, cfg.count, (i, done) => {
    const pair = shuffle(order[i - 1], rnd), want = pair[Math.floor(rnd() * 2)];
    const how = cfg.call === 'mixed' ? ['name', 'nameHe', 'sound'][Math.floor(rnd() * 3)] : cfg.call;
    const t0 = Date.now();
    prompt.replaceChildren(`Duel ${i} of ${cfg.count}: tap `, callOf(want, how));
    if (how !== 'sound') A.sayLetter(want);
    sides = pair.map((l, k) => {
      const b = A.h('button', { type: 'button', class: 'g1-card', 'aria-label': `${k ? 'Right' : 'Left'}: ${l.he}` }, A.letterTile(l, 'arc-glyph g1-big'));
      b.addEventListener('click', () => {
        if (b.disabled) return;
        const ok = l.id === want.id;
        markButton(A, b, ok);
        b.disabled = true;
        if (ok) {
          for (const x of sides) x.disabled = true;
          const bonus = speedBonus(Date.now() - t0);
          grade(A, true, { points: 10 + bonus, right: `${want.name}${bonus ? `, quick: +${bonus}` : ''}.` });
          done();
        } else grade(A, false, { wrong: `That is ${l.name}. ${want.name} is the other one.` });
      });
      return b;
    });
    area.replaceChildren(A.h('div', { class: 'g1-row', dir: 'ltr', role: 'group', 'aria-label': 'Left or right' }, ...sides));
  }, 450)();
}

export const mount = mountArcade(spec, setup);
