// Read It Back: phone numbers are read out digit by digit in Hebrew (efes, chamesh, shtayim...). Key in what you read,
// first with the words in view, then in groups that hide, and at the end read a number out yourself, word by word.
import { mountArcade } from './arcade.js';
import { pick, shuffle, stripPoints } from './g4-core.js';
import { begin, withBank, host, heItem, heText, say, grade, draftNote, roundKeys } from './g4-ui.js';

export const STORE_KEY = 'games.g4-phone.v1';
const ROUNDS = 5;
export const DIGIT_KEYS = Object.freeze(Array.from({ length: 10 }, (_, d) => 'nf' + d));

/** A number to read: short, a seven-digit local number, or an Israeli mobile number (05 and eight more digits). */
export function makeNumber(kind, rnd = Math.random) {
  const d = () => Math.floor(rnd() * 10);
  if (kind === 'short') return [1 + Math.floor(rnd() * 9), d(), d()];
  if (kind === 'local') return [2 + Math.floor(rnd() * 8), ...Array.from({ length: 6 }, d)];
  return [0, 5, [0, 2, 3, 4, 8][Math.floor(rnd() * 5)], ...Array.from({ length: 7 }, d)];
}
/** Split into the groups people say: 3 then 3 then 4 for ten digits, 3 then 4 for seven. */
export const groups = (digits) => (digits.length === 10 ? [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)] : digits.length === 7 ? [digits.slice(0, 3), digits.slice(3)] : [digits]);
export const showDigits = (digits) => groups(digits).map((g) => g.join('')).join('-');

const spec = {
  id: 'g4-phone', title: 'Read It Back', titleHe: 'מִסְפַּר טֶלֶפוֹן',
  blurb: 'Israelis read a phone number one digit at a time, using the counting words: efes (zero), achat, shtayim, shalosh. Mobile numbers start with 05. Key in what you read, then read one out yourself.',
  howTo: ['Read the Hebrew digits and key them in with the pad or your number keys.', 'A wrong digit is not entered; try again. Backspace is not needed.', 'Levels 3 and 4: each group of digits hides after a few seconds, like hearing it once.', 'Level 5: a number in digits; tap the Hebrew words in order to read it out.'],
  levels: [
    { name: 'Three digits', kind: 'short', mode: 'type' },
    { name: 'A local number', kind: 'local', mode: 'type' },
    { name: 'A mobile, in groups', kind: 'mobile', mode: 'type', hide: 5000 },
    { name: 'Quick and bare', kind: 'mobile', mode: 'type', hide: 3500, plain: true },
    { name: 'Read it out', kind: 'mobile', mode: 'say' },
  ],
  par: (l) => ROUNDS * ({ short: 3, local: 7, mobile: 10 })[spec.levels[l - 1].kind] * 2,
  seconds: (l) => (l >= 3 ? 240 : 180),
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const top = A.h('div', { class: 'g4-scene' }), words = A.h('p', { class: 'g4-chips', 'aria-live': 'polite' }), typed = A.h('p', { class: 'g4-dark g4-big', 'aria-live': 'polite' });
  const pad = A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': cfg.mode === 'say' ? 'Hebrew digit words' : 'Number pad' });
  A.board.replaceChildren(host(A, 'ari', 'Halo? Write this number down.'), top, words, typed, pad, draftNote(A, 'Digits are the counting numbers from lesson il04, with zero from the word list. Not yet checked by a native speaker.'));
  withBank(A, T, (B) => {
    pick(B, DIGIT_KEYS, 'p.hello', 'p.number');
    const word = (d) => (cfg.plain ? heText(A, stripPoints(B.get('nf' + d).he)) : heItem(A, B.get('nf' + d)));
    let n = 0, digits = [], at = 0, g = 0;
    const showTyped = () => { typed.textContent = cfg.mode === 'say' ? '' : (showDigits(digits.map((x, i) => (i < at ? x : '_'))) || '…'); };
    const showGroup = () => {
      const gs = groups(digits);
      if (cfg.mode === 'say') { words.replaceChildren(...digits.slice(0, at).map((d) => A.h('span', { class: 'g4-chip' }, word(d)))); return; }
      if (!cfg.hide) { words.replaceChildren(...digits.map((d) => A.h('span', { class: 'g4-chip' }, word(d)))); return; }
      words.replaceChildren(A.h('span', { class: 'muted' }, `Group ${g + 1} of ${gs.length}: `), ...gs[g].map((d) => A.h('span', { class: 'g4-chip' }, word(d))));
      const mine = `${n}-${g}`;
      T.later(cfg.hide, () => { if (`${n}-${g}` === mine) { words.replaceChildren(A.h('span', { class: 'muted' }, `Group ${g + 1}: hidden. Key it in from memory.`)); } });
    };
    const press = (d) => {
      if (at >= digits.length) return;
      const ok = d === digits[at];
      grade(A, ok, { right: '', wrong: cfg.mode === 'say' ? `Not that word: the next digit is ${digits[at]}.` : 'Not that digit. Read it again.', points: 2 });
      if (!ok) return;
      if (cfg.mode === 'say') say(A, B.get('nf' + d));
      at += 1; showTyped();
      const gs = groups(digits), end = gs.slice(0, g + 1).flat().length;
      if (at >= digits.length) { A.announce(`Got it: ${showDigits(digits)}.`); T.later(700, next); return; }
      if (cfg.mode === 'say') showGroup();
      else if (cfg.hide && at >= end) { g += 1; showGroup(); }
    };
    const keys = cfg.mode === 'say' ? shuffle(Array.from({ length: 10 }, (_, i) => i), rnd) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
    pad.replaceChildren(...keys.map((d) => A.h('button', { type: 'button', class: 'arc-choice', 'aria-label': cfg.mode === 'say' ? B.get('nf' + d).en : String(d), onclick: () => press(d) }, cfg.mode === 'say' ? word(d) : String(d))));
    if (cfg.mode !== 'say') roundKeys(A, (k) => { if (/^[0-9]$/.test(k)) { press(Number(k)); return true; } return false; });
    const next = () => {
      if (n >= ROUNDS) { T.end({ won: true }); return; }
      n += 1; at = 0; g = 0; digits = makeNumber(cfg.kind, rnd);
      top.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Number ${n} of ${ROUNDS} · `, heItem(A, B.get('p.number'), { en: true })),
        cfg.mode === 'say' ? A.h('p', { class: 'g4-big' }, `Read out: ${showDigits(digits)}`) : null);
      showTyped(); showGroup();
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
