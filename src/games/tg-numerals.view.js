// Letter Numbers: every Hebrew letter is also a number. Learn the values, then read the letter numerals a printed
// Chumash uses for chapters and verses, then build numbers the traditional way (15 is ט״ו, 16 is ט״ז).
import { mountArcade, choiceRow } from './arcade.js';
import { LETTER_VALUES, ALPHABET, numeralLetters, numeralWritten, NUMERAL_SKIP, options } from './tg-core.js';
import { host, track, numberKeys, grade, draftNote, ensureStyle, roundKeys } from './tg-ui.js';

export const STORE_KEY = 'games.tg-numerals.v1';
const ROUNDS = 10;

const spec = {
  id: 'tg-numerals', title: 'Letter Numbers', titleHe: 'עֵרֶךְ הָאוֹתִיּוֹת',
  blurb: 'Every Hebrew letter is also a number. Aleph is 1, Yod is 10, Kaf is 20, Qof is 100. A printed Chumash numbers its chapters and verses with letters, and the Jewish calendar writes dates the same way.',
  howTo: ['Levels 1 and 2: a letter appears; pick its number.', 'Level 3: a number appears; pick its letter.', 'Level 4: read a chapter number written in letters.', 'Level 5: build a number from letters, largest first. Press 1 to 4 for answers, or tap.'],
  levels: [
    { name: 'Aleph to Yod: 1 to 10', mode: 'l2v', letters: ALPHABET.slice(0, 10) },
    { name: 'The tens: 20 to 90', mode: 'l2v', letters: ALPHABET.slice(10, 18) },
    { name: 'All 22, hundreds too', mode: 'v2l', letters: ALPHABET },
    { name: 'Read chapter numbers', mode: 'read', max: 50 },
    { name: 'Build the number', mode: 'build', max: 499 },
  ],
  par: () => ROUNDS * 10,
  seconds: (l) => (l >= 4 ? 180 : 120),
  needsWords: false,
};

/** Targets for the build level: 11 to max, skipping numbers some communities spell another way. */
export function buildTargets(max, rnd = Math.random) {
  const out = [];
  while (out.length < ROUNDS) {
    const n = 11 + Math.floor(rnd() * (max - 10));
    if (!NUMERAL_SKIP.has(n) && !out.includes(n)) out.push(n);
  }
  if (!out.includes(15)) out[Math.floor(rnd() * 3)] = 15; // the 15 rule comes up every round
  return out;
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const big = A.h('div', { class: 'arc-big', lang: 'he', dir: 'rtl' });
  const prompt = A.h('p', { class: 'arc-prompt' });
  const area = A.h('div');
  const letterOf = (c) => A.letters.find((l) => l.he === c);
  A.board.replaceChildren(host(A, 'ari', 'Letters count too. Aleph is one.'), big, prompt, area,
    draftNote(A, 'Standard values. Final letters count like their plain letter here; a few books use them for 500 to 900.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  let n = 0;
  const next = () => { if (n >= ROUNDS) { T.end({ won: true }); return; } n += 1; ask(); };
  const ask = () => {
    if (cfg.mode === 'l2v' || cfg.mode === 'v2l') {
      const c = cfg.letters[Math.floor(rnd() * cfg.letters.length)];
      const v = LETTER_VALUES[c];
      if (cfg.mode === 'l2v') {
        big.textContent = c; prompt.textContent = `What number is this letter? (${n} of ${ROUNDS})`;
        const opts = options(v, cfg.letters.map((x) => LETTER_VALUES[x]), 4, rnd);
        area.replaceChildren(choiceRow(opts, (o) => String(o), (o) => {
          const ok = grade(A, o === v, { right: `${c} is ${v}.`, wrong: `${c} is ${v}.` });
          if (ok) { A.sayLetter(letterOf(c)); T.later(500, next); }
          return ok;
        }, { label: 'Numbers' }));
      } else {
        big.textContent = String(v); prompt.textContent = `Which letter is ${v}? (${n} of ${ROUNDS})`;
        const opts = options(c, cfg.letters, 4, rnd);
        area.replaceChildren(choiceRow(opts, (o) => o, (o) => {
          const ok = grade(A, o === c, { right: `${v} is ${c}.`, wrong: `${v} is ${c}, not ${o}.` });
          if (ok) { A.sayLetter(letterOf(c)); T.later(500, next); }
          return ok;
        }, { label: 'Letters' }));
      }
    } else if (cfg.mode === 'read') {
      let v = 1 + Math.floor(rnd() * cfg.max);
      if (v === 5) v = 6; // 5 written alone (he with a geresh) looks exactly like the app's sign for the divine name, so it is not asked
      big.textContent = numeralWritten(v); prompt.textContent = `Chapter ${n} of ${ROUNDS}: which number is this?`;
      const near = [v - 1, v + 1, v + 9, v - 9, v + 10, v - 10, v + 2].filter((x) => x >= 1 && x <= 99 && x !== 5);
      area.replaceChildren(choiceRow(options(v, near, 4, rnd), (o) => String(o), (o) => {
        const ok = grade(A, o === v, { right: `${numeralWritten(v)} is ${v}.`, wrong: `${numeralWritten(v)} is ${v}.` });
        if (ok) T.later(500, next);
        return ok;
      }, { label: 'Numbers' }));
    } else build();
  };
  const targets = cfg.mode === 'build' ? buildTargets(cfg.max, rnd) : [];
  const build = () => {
    const v = targets[n - 1];
    const want = numeralLetters(v);
    let typed = '';
    const shown = A.h('div', { class: 'arc-big', lang: 'he', dir: 'rtl', 'aria-live': 'polite' });
    const keys = A.h('div', { class: 'tg-keys', role: 'group', 'aria-label': 'Letters' });
    big.textContent = String(v);
    prompt.textContent = `Build ${v} in letters, largest value first (${n} of ${ROUNDS}).` + (v % 100 === 15 || v % 100 === 16 ? ' Remember how 15 and 16 are written.' : '');
    const redraw = () => { shown.textContent = typed || '…'; };
    const press = (c) => {
      const cand = typed + c;
      if (want.startsWith(cand)) {
        typed = cand; redraw(); A.sfx('drop');
        if (typed === want) { grade(A, true, { right: `${v} is ${numeralWritten(v)}.` }); T.later(700, next); }
      } else {
        const why = (v % 100 === 15 || v % 100 === 16) && /[יה]/.test(c) ? ' 15 and 16 are written ט״ו and ט״ז.' : '';
        grade(A, false, { wrong: `${c} does not come next.${why} ${v} is ${numeralWritten(v)}.` });
      }
    };
    keys.replaceChildren(...ALPHABET.map((c) => A.h('button', { type: 'button', class: 'btn secondary', lang: 'he', 'aria-label': `${c}, ${LETTER_VALUES[c]}`, onclick: () => press(c) }, c)));
    redraw();
    area.replaceChildren(shown, keys);
  };
  roundKeys(A, (k, e) => { if (cfg.mode === 'build' && /^[א-ת]$/.test(e?.key || '')) { const b = [...area.querySelectorAll('button')].find((x) => x.textContent === e.key); if (b) { b.click(); return true; } } return false; });
  next();
}

export const mount = mountArcade(spec, setup);
