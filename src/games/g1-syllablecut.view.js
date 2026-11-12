// Syllable Cut: a real word with a small cut button between each pair of letters. Cut it into the beats you say: one
// vowel sound per piece. Only words whose split is not in dispute are used (no said shva, no hurried vowel); the split
// comes from the app's syllable rules, worked out ahead in data/games/g1/words.json.
import { mountArcade } from './arcade.js';
import { cutsOf, cutEligible, shortEn, shuffle, letterClusters } from './g1-core.js';
import { host, track, grade, draftNote, ensureStyle, he, series, markButton, loadWords } from './g1-ui.js';

export const STORE_KEY = 'games.g1-syllablecut.v1';

const spec = {
  id: 'g1-syllablecut', title: 'Syllable Cut', titleHe: 'חִלֵּק',
  blurb: 'Say the word slowly and cut it into beats. Each beat has one vowel sound. Tap the cut marks between the letters where one beat ends and the next begins.',
  howTo: ['The small dashed buttons sit between letters. Tap one to make a cut there.', 'A right cut stays; a wrong one costs a point.', 'When every cut is made, the word reads out in pieces.', 'Levels 1 to 4 tell you how many beats; level 5 does not, so press All Cut when you are done.'],
  levels: [
    { name: 'Two beats, short words', syl: [2, 2], maxLen: 4, count: 6, tell: true },
    { name: 'Two beats', syl: [2, 2], maxLen: 7, count: 8, tell: true },
    { name: 'Three beats', syl: [3, 3], maxLen: 7, count: 6, tell: true },
    { name: 'Two or three beats', syl: [2, 3], maxLen: 7, count: 8, tell: true },
    { name: 'Count them yourself', syl: [1, 3], maxLen: 7, count: 10, tell: false },
  ],
  par: (l, cfg) => cfg.count * 14,
  seconds: (l, cfg) => 20 + cfg.count * 12,
  needsWords: false,
};

/** Words for a level. */
export const cutWords = (words, cfg) => words.filter((w) => (cfg.syl[0] === 1 ? w.syl && !(w.shva || []).some((s) => s[1] === 'na') && !w.shvaOpen && !/[ֱ-ֳ]/.test(w.he) : cutEligible(w))
  && w.syl.length >= cfg.syl[0] && w.syl.length <= cfg.syl[1] && letterClusters(w.he).length <= cfg.maxLen);

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const wordEl = A.h('div', {});
  const meaning = A.h('p', { class: 'muted' });
  const actions = A.h('div', { class: 'row' });
  A.board.replaceChildren(host(A, 'rimon', 'Clap it out: one beat per vowel.'), prompt, wordEl, meaning, actions,
    draftNote(A, 'Splits come from the app\'s syllable rules; a teacher has not checked every word.'));
  const run = (words) => series(A, T, Math.min(cfg.count, words.length), (i, done) => {
    const w = words[i - 1], cl = letterClusters(w.he), want = new Set(cutsOf(w.syl)), made = new Set();
    const total = Math.min(cfg.count, words.length);
    const say = () => { prompt.textContent = `Word ${i} of ${total}: ${cfg.tell ? `cut it into ${w.syl.length} beats (${want.size - made.size} cut${want.size - made.size === 1 ? '' : 's'} left).` : 'cut it into beats, then press All Cut.'}`; };
    say();
    meaning.textContent = `“${shortEn(w.en)}”`;
    const all = cfg.tell ? null : A.h('button', { type: 'button', class: 'btn' }, 'All Cut');
    const finish = () => {
      for (const b of wordEl.querySelectorAll('button')) b.disabled = true;
      if (all) all.disabled = true;
      wordEl.replaceChildren(A.h('div', { class: 'g1-row g1-rtl' }, ...w.syl.map((s) => A.h('span', { class: 'g1-card is-good' }, he(A, s)))));
      meaning.textContent = `${w.translit}: “${shortEn(w.en)}”, ${w.syl.length} beat${w.syl.length > 1 ? 's' : ''}`;
      A.sayWord(w); done();
    };
    const parts = [];
    cl.forEach((c, k) => {
      parts.push(A.h('span', { 'aria-hidden': 'true' }, c.text));
      if (k === cl.length - 1) return;
      const b = A.h('button', { type: 'button', class: 'g1-gap', 'aria-label': `Cut after letter ${k + 1}, ${c.base}` }, '|');
      b.addEventListener('click', () => {
        if (b.disabled) return;
        if (want.has(k)) {
          made.add(k); b.disabled = true; b.classList.add('is-on'); markButton(A, b, true);
          grade(A, true, { points: 6, right: `Cut after ${c.base}.` }); say();
          if (cfg.tell && made.size === want.size) { A.addScore(6); finish(); }
        } else grade(A, false, { wrong: 'A beat does not end there: each beat keeps its vowel and the letter that starts it.' });
      });
      parts.push(b);
    });
    wordEl.replaceChildren(A.h('div', { class: 'g1-word', lang: 'he', dir: 'rtl', role: 'group', 'aria-label': `The word ${w.he}, with cut marks` }, ...parts));
    all?.addEventListener('click', () => {
      if (all.disabled) return;
      if (made.size === want.size) { markButton(A, all, true); grade(A, true, { right: want.size ? 'All the cuts are made.' : 'Right: one beat, no cut.' }); finish(); }
      else grade(A, false, { wrong: `${want.size - made.size} cut${want.size - made.size === 1 ? '' : 's'} still to make.` });
    });
    actions.replaceChildren(...(all ? [all] : []));
  }, 1000);
  loadWords(A.ctx).then((ws) => { if (T.live()) run(shuffle(cutWords(ws, cfg), rnd))(); })
    .catch(() => A.announce('The words did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
