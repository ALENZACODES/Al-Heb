// Letter Rhythm: letters sit on pads. A pattern lights up pad by pad (each letter named as it lights), then you play it
// back. Every pattern is one longer than the last. Later levels put look-alike letters on neighbouring pads.
import { mountArcade } from './arcade.js';
import { rhythm, lookalikePairs, shuffle } from './g1-core.js';
import { host, track, grade, draftNote, ensureStyle, he, numberKeys } from './g1-ui.js';

export const STORE_KEY = 'games.g1-rhythm.v1';

const spec = {
  id: 'g1-rhythm', title: 'Letter Rhythm', titleHe: 'קֶצֶב',
  blurb: 'Watch the pads: letters light up one after another, and each is named as it lights. Then tap the same letters in the same order. Each new pattern is one letter longer.',
  howTo: ['Watch (and listen) while the pattern plays. The pads wait until it ends.', 'Tap the letters back in order, or press their number keys.', 'A slip shows the pattern again; after three slips the next pattern starts.', 'From level 3 look-alike letters share the board.'],
  levels: [
    { name: 'Four pads', pads: 4, start: 2, songs: 5, ms: 750, alike: false },
    { name: 'Four pads, longer', pads: 4, start: 3, songs: 5, ms: 700, alike: false },
    { name: 'Look-alikes', pads: 5, start: 3, songs: 5, ms: 650, alike: true },
    { name: 'Six pads', pads: 6, start: 4, songs: 5, ms: 600, alike: false },
    { name: 'Six look-alikes, quick', pads: 6, start: 4, songs: 6, ms: 480, alike: true },
  ],
  par: (l, cfg) => cfg.songs * (cfg.start + 2) * 4,
  timed: false,
  needsWords: false,
};

/** Letters for the pads: plain letters, or look-alike pairs side by side. */
export function padLetters(letters, n, alike, rnd = Math.random) {
  const base = letters.filter((l) => !l.isFinal);
  if (!alike) return shuffle(base, rnd).slice(0, n);
  const out = [];
  for (const [a, b] of shuffle(lookalikePairs(base), rnd)) { if (out.length >= n) break; for (const l of [a, b]) if (!out.includes(l) && out.length < n) out.push(l); }
  for (const l of shuffle(base, rnd)) if (out.length < n && !out.includes(l)) out.push(l);
  return out;
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const padsEl = A.h('div', { class: 'g1-pads', role: 'group', 'aria-label': 'Letter pads' });
  A.board.replaceChildren(host(A, 'noa-conductor', 'Watch the pattern, then play it back.'), prompt, padsEl,
    draftNote(A, 'With sound on, each letter\'s name is said as it lights, where a recording exists.'));
  numberKeys(A, () => padsEl);
  const letters = padLetters(A.letters, cfg.pads, cfg.alike, rnd);
  let song = 0, seq = [], at = 0, slips = 0, listening = false;
  const pads = letters.map((l, i) => {
    const b = A.h('button', { type: 'button', class: 'g1-pad', 'aria-label': `${i + 1}: ${l.name}` }, he(A, l.he));
    b.addEventListener('click', () => tap(i, b));
    return b;
  });
  padsEl.replaceChildren(...pads);
  for (const b of pads) b.disabled = true;
  const lock = (on) => { listening = !on; for (const b of pads) b.disabled = on; };
  const show = () => {
    lock(true); at = 0;
    prompt.textContent = `Pattern ${song} of ${cfg.songs}: watch ${seq.length} letters.`;
    seq.forEach((p, k) => {
      T.later(k * cfg.ms + 300, () => { for (const b of pads) b.classList.remove('is-lit'); pads[p].classList.add('is-lit'); A.announce(`${k + 1}: ${letters[p].name}`); A.sayLetter(letters[p]); });
    });
    T.later(seq.length * cfg.ms + 350, () => { for (const b of pads) b.classList.remove('is-lit'); lock(false); prompt.textContent = `Pattern ${song} of ${cfg.songs}: your turn, ${seq.length} letters.`; A.announce('Your turn.'); });
  };
  const nextSong = () => {
    if (!T.live()) return;
    if (song >= cfg.songs) { T.end({ won: true }); return; }
    song += 1; slips = 0;
    seq = rhythm(cfg.start + song - 1, cfg.pads, rnd);
    show();
  };
  const tap = (i, b) => {
    if (!listening || b.disabled) return;
    if (seq[at] === i) {
      at += 1; grade(A, true, { points: 3, right: `${letters[i].name}, ${at} of ${seq.length}.` });
      if (at === seq.length) { lock(true); A.addScore(seq.length * 2); A.announce(`Pattern ${song} played back.`); T.later(600, nextSong); }
    } else {
      slips += 1;
      grade(A, false, { wrong: `That was ${letters[i].name}; letter ${at + 1} was ${letters[seq[at]].name}.` });
      if (slips >= 3) { lock(true); A.announce(`The pattern was ${seq.map((p) => letters[p].name).join(', ')}. Next one.`); T.later(900, nextSong); }
      else { A.announce('Watch it once more.'); show(); }
    }
  };
  nextSong();
}

export const mount = mountArcade(spec, setup);
