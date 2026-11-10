// Speed Type: type the Hebrew word on an on-screen keyboard laid out like the Israeli standard keyboard
// (or your own keyboard). Words scroll in; type each before it leaves. Typing is a different memory from
// reading, and it is the one you need for messages.
import { mountArcade } from './arcade.js';
import { bareLetters, wordsOfLength, pickSeeded, FINAL_TO_BASE } from './arcade.model.js';

export const STORE_KEY = 'games.speedtype.v1';

// Israeli standard layout, letter keys only, three rows as on a physical keyboard (right to left on screen).
const ROWS = [[...'קראטוןםפ'], [...'שדגכעיחלךף'], [...'זסבהנמצתץ']];

const spec = {
  id: 'speedtype', title: 'Speed Type', titleHe: 'הַקְלָדָה מְהִירָה',
  blurb: 'Words arrive; type them. The keys are laid out like a real Israeli keyboard, so your fingers learn where the letters live. Finals count: type ם not מ at the end.',
  howTo: ['Type with your own keyboard in Hebrew mode, or tap the keys shown.', 'Type the word exactly; the final forms ך ם ן ף ץ are different keys.', 'Submit happens by itself when the word is complete. Backspace fixes a slip.', 'Words per minute and accuracy set your score.'],
  levels: [
    { name: '2 to 3 letters, keys lit', min: 2, max: 3, words: 10, light: true },
    { name: '3 letters', min: 3, max: 3, words: 10, light: true },
    { name: '3 to 4 letters, no key lights', min: 3, max: 4, words: 12, light: false },
    { name: '4 to 5 letters', min: 4, max: 5, words: 12, light: false },
    { name: '5 to 7 letters', min: 5, max: 7, words: 14, light: false },
  ],
  par: (l, cfg) => cfg.words * 12,
  seconds: (l, cfg) => 60 + cfg.words * 6,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const bank = wordsOfLength(A.words, cfg.min, cfg.max);
  if (bank.length < cfg.words) { A.announce('Not enough words.'); return; }
  const queue = pickSeeded(bank, cfg.words, rnd);
  let k = 0, word = null, target = '', typed = '', errors = 0, t0 = Math.max(Date.now(), A.readyAt || 0), chars = 0;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const shown = A.h('div', { class: 'arc-big', lang: 'he', dir: 'rtl' });
  const typedEl = A.h('div', { class: 'arc-typed', lang: 'he', dir: 'rtl', 'aria-live': 'polite' });
  const kb = A.h('div', { class: 'arc-keyboard', role: 'group', 'aria-label': 'Hebrew keyboard' });
  const keyEls = new Map();
  kb.replaceChildren(...ROWS.map((row) => A.h('div', { class: 'arc-keyrow' }, ...row.map((ch) => { const b = A.h('button', { type: 'button', class: 'arc-key', lang: 'he', dir: 'rtl', onclick: () => type(ch) }, ch); keyEls.set(ch, b); return b; }))),
    A.h('div', { class: 'arc-keyrow' }, A.h('button', { type: 'button', class: 'arc-key', style: 'min-width:4rem', onclick: () => type(null) }, '⌫')));
  A.board.replaceChildren(prompt, shown, typedEl, kb);
  const light = () => { for (const b of keyEls.values()) b.classList.remove('is-target'); if (cfg.light) { const next = target[typed.length]; if (next && keyEls.get(next)) keyEls.get(next).classList.add('is-target'); } };
  const next = () => {
    if (k >= queue.length) { const mins = (Date.now() - t0) / 60000; const wpm = Math.round((chars / 5) / Math.max(mins, 0.05)); A.addScore(Math.min(60, wpm)); A.announce(`Done. About ${wpm} words per minute, ${errors} slips.`); A.finish({ won: true }); return; }
    word = queue[k++]; target = bareLetters(word.he); typed = '';
    prompt.textContent = `${word.en} · "${word.translit}" · ${k} of ${queue.length}`;
    shown.textContent = word.he; typedEl.textContent = ''; light();
    A.sayWord(word);
  };
  const type = (ch) => {
    if (ch === null) { typed = typed.slice(0, -1); typedEl.textContent = typed; light(); return; }
    const want = target[typed.length];
    const same = ch === want || (FINAL_TO_BASE[ch] && FINAL_TO_BASE[ch] === want && false);
    if (same) { typed += ch; chars++; A.sfx('click_soft'); typedEl.textContent = typed; if (typed === target) { A.addScore(10 + target.length); A.sfx('success'); next(); } else light(); }
    else { errors++; A.addScore(-1); A.sfx('error_soft'); A.miss(); typedEl.textContent = typed + '✗'; A.announce(FINAL_TO_BASE[want] && ch === FINAL_TO_BASE[want] ? `End of word: use the final form ${want}.` : `Next letter is ${want}.`); setTimeout(() => { typedEl.textContent = typed; }, A.quiet ? 0 : 300); }
  };
  A.keys((k2, e) => { if (/^[א-ת]$/.test(e.key)) { type(e.key); return true; } if (e.key === 'Backspace') { type(null); return true; } return false; });
  A.setLives(0);
  next();
}

export const mount = mountArcade(spec, setup);
