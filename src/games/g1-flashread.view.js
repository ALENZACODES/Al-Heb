// Flash Read: a real word flashes for a moment and hides. How did it sound? Pick its reading. The flash gets shorter
// each level, which trains reading the whole word at a glance instead of letter by letter. Words and readings are
// copied from the app's word list (data/games/g1/words.json). In calm mode the word stays on screen.
import { mountArcade } from './arcade.js';
import { shortEn, shuffle, letterClusters, toBase } from './g1-core.js';
import { host, track, draftNote, ensureStyle, he, series, choiceButtons, numberKeys, loadWords } from './g1-ui.js';

export const STORE_KEY = 'games.g1-flashread.v1';

const spec = {
  id: 'g1-flashread', title: 'Flash Read', titleHe: 'בָּזָק',
  blurb: 'A word flashes up and hides again. Read it in that moment, then pick how it sounds. Each level flashes it for less time. The wrong choices start with the same letter, so you have to read it all.',
  howTo: ['Watch the box: the word shows, then hides.', 'Tap the reading that matches, or press its number key.', 'Missed it? Show Again costs a point.', 'In calm mode, or with the clock turned off in Settings, the word does not hide.'],
  levels: [
    { name: 'Two seconds', ms: 2000, choices: 3, maxLen: 4, count: 10 },
    { name: 'One and a half', ms: 1500, choices: 4, maxLen: 5, count: 10 },
    { name: 'One second', ms: 1000, choices: 4, maxLen: 6, count: 10 },
    { name: 'A blink', ms: 700, choices: 4, maxLen: 7, count: 12 },
    { name: 'A flash', ms: 450, choices: 5, maxLen: 7, count: 12 },
  ],
  par: (l, cfg) => cfg.count * 10,
  seconds: (l, cfg) => 20 + cfg.count * 8,
  needsWords: false,
};

/** Readings to choose from: other words starting with the same letter come first; every reading is different. */
export function readingChoices(word, words, n, rnd = Math.random) {
  const first = toBase(letterClusters(word.he)[0]?.base);
  const others = words.filter((w) => w.translit !== word.translit && w.he !== word.he);
  const same = shuffle(others.filter((w) => toBase(letterClusters(w.he)[0]?.base) === first), rnd);
  const out = [word], seen = new Set([word.translit]);
  for (const w of [...same, ...shuffle(others, rnd)]) { if (out.length >= n) break; if (!seen.has(w.translit)) { seen.add(w.translit); out.push(w); } }
  return shuffle(out, rnd);
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const hide = !A.untimed;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const box = A.h('div', { class: 'g1-flash', lang: 'he', dir: 'rtl' });
  const area = A.h('div', {});
  const after = A.h('p', { class: 'muted' });
  A.board.replaceChildren(host(A, 'ari', 'Eyes ready… flash!'), prompt, box, area, after,
    draftNote(A, 'Words and readings from the app\'s word list.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  const run = (words, pool) => series(A, T, Math.min(cfg.count, words.length), (i, done) => {
    const w = words[i - 1];
    let solved = false;
    const flash = () => {
      box.replaceChildren(he(A, w.he));
      if (hide) T.later(cfg.ms, () => { if (!solved) box.replaceChildren(A.h('span', { 'aria-label': 'Hidden' }, '· · ·')); });
    };
    prompt.textContent = `Word ${i} of ${Math.min(cfg.count, words.length)}: how did it sound?`;
    after.textContent = '';
    const again = hide ? A.h('button', { type: 'button', class: 'btn secondary', onclick: () => { A.addScore(-1); flash(); } }, 'Show Again') : null;
    area.replaceChildren(choiceButtons(A, readingChoices(w, pool, cfg.choices, rnd), {
      render: (o) => o.translit, label: 'Readings', rtl: false, isRight: (o) => o.translit === w.translit,
      say: (o, ok) => (ok ? `Yes, ${w.translit}.` : `Not ${o.translit}.`),
      onRight: () => { solved = true; if (again) again.disabled = true; box.replaceChildren(he(A, w.he)); after.textContent = `${w.translit}: “${shortEn(w.en)}”`; A.sayWord(w); done(); },
    }), again);
    flash();
  }, 900);
  loadWords(A.ctx).then((all) => {
    if (!T.live()) return;
    const fit = all.filter((w) => letterClusters(w.he).length <= cfg.maxLen && letterClusters(w.he).length >= 2);
    run(shuffle(fit, rnd), fit)();
  }).catch(() => A.announce('The words did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
