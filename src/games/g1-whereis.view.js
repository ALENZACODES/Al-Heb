// Start, Middle or End: a real word and one of its letters. Is the letter at the start, in the middle or at the end?
// Hebrew starts on the right. Final forms only ever sit at the end, which the game points out. Later levels name the
// letter, then give only its sound. Words come from data/games/g1/words.json (copied from the app's word list).
import { mountArcade } from './arcade.js';
import { positionOf, onceLetters, shortEn, shuffle, toBase, letterClusters } from './g1-core.js';
import { host, track, grade, draftNote, ensureStyle, he, series, markButton, roundKeys, loadWords } from './g1-ui.js';

export const STORE_KEY = 'games.g1-whereis.v1';
const SPOTS = [['start', 'Start (right)'], ['middle', 'Middle'], ['end', 'End (left)']];
/** Letters with one plain sound in every word (Israeli), for the sound level. */
export const SOUND_ONLY = Object.freeze({ 'ג': 'g', 'ד': 'd', 'ז': 'z', 'ל': 'l', 'מ': 'm', 'נ': 'n', 'צ': 'tz', 'ר': 'r' });

const spec = {
  id: 'g1-whereis', title: 'Start, Middle or End', titleHe: 'אֶמְצַע',
  blurb: 'A real Hebrew word and one of its letters. Where does the letter sit: at the start, in the middle or at the end? Remember that Hebrew starts on the right.',
  howTo: ['Find the letter in the word. The start is on the right.', 'Tap Start, Middle or End, or press 1, 2 or 3 (the arrow keys work too: right is start, left is end).', 'A wrong answer costs a point; the letter is then underlined for you.', 'Level 3 gives the letter\'s name, levels 4 and 5 only its sound.'],
  levels: [
    { name: 'Short words', ask: 'letter', maxLen: 4, count: 10 },
    { name: 'Longer words', ask: 'letter', maxLen: 7, count: 12 },
    { name: 'By name', ask: 'name', maxLen: 7, count: 12 },
    { name: 'By sound', ask: 'sound', maxLen: 5, count: 12 },
    { name: 'Mixed, quick', ask: 'mixed', maxLen: 7, count: 15 },
  ],
  par: (l, cfg) => cfg.count * 10,
  seconds: (l, cfg) => 20 + cfg.count * 7,
  needsWords: false,
};

/** Questions: a word and a letter that appears in it once. ask 'sound' only uses SOUND_ONLY letters. */
export function questions(words, cfg, rnd = Math.random) {
  const out = [];
  for (const w of shuffle(words, rnd)) {
    if (out.length >= cfg.count) break;
    const n = letterClusters(w.he).length;
    if (n < 3 || n > cfg.maxLen) continue;
    const ask = cfg.ask === 'mixed' ? ['letter', 'name', 'sound'][out.length % 3] : cfg.ask;
    const pool = onceLetters(w.he).filter((c) => ask !== 'sound' || SOUND_ONLY[c]);
    if (!pool.length) continue;
    const letter = pool[Math.floor(rnd() * pool.length)];
    out.push({ word: w, letter, ask, spot: positionOf(w.he, letter) });
  }
  return out;
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const nameOf = (c) => A.letters.find((l) => l.he === c)?.name || c;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const wordEl = A.h('div', { class: 'g1-word', lang: 'he', dir: 'rtl' });
  const area = A.h('div', {});
  const meaning = A.h('p', { class: 'muted' });
  A.board.replaceChildren(host(A, 'rimon', 'Start on the right, end on the left.'), prompt, wordEl, meaning, area,
    draftNote(A, 'Words from the app\'s word list. Sounds are Israeli.'));
  let buttons = [];
  roundKeys(A, (k) => { const i = { 1: 0, 2: 1, 3: 2, right: 0, left: 2, up: 1, down: 1 }[k]; const b = buttons[i]; if (b && !b.disabled) { b.click(); return true; } return false; });
  const show = (qs) => series(A, T, qs.length, (i, done) => {
    const q = qs[i - 1], cl = letterClusters(q.word.he);
    const at = cl.findIndex((c) => toBase(c.base) === q.letter);
    const shown = cl[at].base; // as written: a final form where the word has one
    const drawWord = (hl) => wordEl.replaceChildren(...cl.map((c, k) => A.h('span', { class: hl && k === at ? 'g1-hl' : '' }, c.text)));
    drawWord(false);
    meaning.textContent = `“${shortEn(q.word.en)}”`;
    const what = q.ask === 'name' ? [nameOf(q.letter)] : q.ask === 'sound' ? [`the letter that says “${SOUND_ONLY[q.letter]}”`] : [he(A, shown), ` (${nameOf(q.letter)})`];
    prompt.replaceChildren(`Word ${i} of ${qs.length}: where is `, ...what, '?');
    buttons = SPOTS.map(([spot, label]) => {
      const b = A.h('button', { type: 'button', class: 'arc-choice' }, label);
      b.addEventListener('click', () => {
        if (b.disabled) return;
        const ok = spot === q.spot;
        markButton(A, b, ok); b.disabled = true;
        const why = q.spot === 'end' && shown !== q.letter ? ` ${nameOf(q.letter)} takes its final shape ${shown} there.` : '';
        grade(A, ok, { right: `Yes, at the ${q.spot}.${why}`, wrong: 'Look again: the letter is underlined now.' });
        if (ok) { drawWord(true); for (const x of buttons) x.disabled = true; A.sayWord(q.word); done(); } else drawWord(true);
      });
      return b;
    });
    area.replaceChildren(A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'Where is the letter' }, ...buttons));
  });
  loadWords(A.ctx).then((words) => { if (T.live()) show(questions(words, cfg, rnd))(); })
    .catch(() => A.announce('The words did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
