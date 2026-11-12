// Trope Hunt: a verse from anywhere in the Torah, printed with its cantillation marks (the app's Leningrad Codex text).
// Find the word that carries the mark: the etnachta that splits the verse in two, then zakef katan, tipcha and more.
// It teaches what the marks look like and where they fall, not their melodies (those differ by community).
import { uiEnglish } from '../shell/names.js';
import { mountArcade } from './arcade.js';
import { loadData, loadChapter, tokens, hasName, showName, wordsWithMark, BOOKS, refText, shuffle } from './tg-core.js';
import { host, track, grade, draftNote, ensureStyle } from './tg-ui.js';

export const STORE_KEY = 'games.tg-tropehunt.v1';
const ROUNDS = 8;
/** The marks this game teaches, with where they sit on the letter. Names come from data/corpus/trope/table.json. */
export const MARKS = Object.freeze([
  { id: 'etnachta', ch: '֑', where: 'below' }, { id: 'zakef-katan', ch: '֔', where: 'above' },
  { id: 'tipcha', ch: '֖', where: 'below' }, { id: 'revia', ch: '֗', where: 'above' },
  { id: 'pashta', ch: '֙', where: 'above, at the end of the word' }, { id: 'segol', ch: '֒', where: 'above, at the end of the word' },
  { id: 'mercha', ch: '֥', where: 'below' }, { id: 'munach', ch: '֣', where: 'below' },
]);

const spec = {
  id: 'tg-tropehunt', title: 'Trope Hunt', titleHe: 'טְעָמִים',
  blurb: 'A Torah reader sings each word to a short tune shown by a small mark, the trope. The marks also work like punctuation: the etnachta splits a verse into two halves, the zakef katan and tipcha mark smaller pauses. Find the word with the mark in real verses from all five books.',
  howTo: ['The mark is shown on a dotted circle. Tap the one word in the verse that carries it.', 'Level 1: the etnachta. Level 2: zakef katan. Level 3: tipcha.', 'Level 4: one of four marks each verse. Level 5: eight marks and longer verses.', 'Tab moves from word to word; Enter or Space picks.'],
  levels: [
    { name: 'Etnachta: the big pause', marks: ['etnachta'], max: 9 },
    { name: 'Zakef katan', marks: ['zakef-katan'], max: 11 },
    { name: 'Tipcha', marks: ['tipcha'], max: 11 },
    { name: 'Four marks', marks: ['etnachta', 'zakef-katan', 'tipcha', 'revia'], max: 14 },
    { name: 'Eight marks, longer verses', marks: MARKS.map((m) => m.id), max: 20 },
  ],
  par: () => ROUNDS * 10,
  seconds: (l) => (l === 5 ? 200 : 160),
  needsWords: false, needsLetters: false,
};

/** Words of a verse with trope: letterless tokens (a paseq written apart) stay with the word before them. */
export function tropeWords(heTrope) {
  const out = [];
  for (const t of tokens(heTrope)) { if (/[א-ת]/.test(t) || !out.length) out.push(t); else out[out.length - 1] += ' ' + t; }
  return out;
}
/** Verses where one of the marks sits on exactly one word, no divine name, within the length: [{ ref, words, mark, at }]. */
export function candidates(chapter, book, markIds, max, rnd = Math.random) {
  const out = [];
  for (const v of chapter.verses || []) {
    if (!v.heTrope || hasName(v.he)) continue;
    const words = tropeWords(v.heTrope);
    if (words.length < 3 || words.length > max) continue;
    const fits = MARKS.filter((m) => markIds.includes(m.id) && wordsWithMark(words.join(' '), m.ch).length === 1 && words.filter((w) => w.includes(m.ch)).length === 1);
    if (!fits.length) continue;
    const mark = fits[Math.floor(rnd() * fits.length)];
    out.push({ ref: { book, chapter: chapter.chapter, verse: v.n }, words, mark, at: words.findIndex((w) => w.includes(mark.ch)), en: v.en });
  }
  return out;
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd, ctx = A.ctx;
  const legend = A.h('div', { class: 'arc-big', 'aria-hidden': 'true' });
  const prompt = A.h('p', { class: 'arc-prompt' });
  const verseEl = A.h('div', { class: 'tg-verse', lang: 'he', dir: 'rtl', style: 'font-size:1.7rem' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'ari', 'Find the mark. It tells the reader where to pause.'), legend, prompt, verseEl, after,
    draftNote(A, 'Marks from a machine reading of the Leningrad Codex text; not checked by a cantor. Verses with the divine name are left out here. Melodies differ by community.'));
  let names = {}, pool = [], n = 0;
  const nameOf = (m) => { const r = names[m.id]; return r ? (r.ashkenazi === r.sephardi ? r.ashkenazi : `${r.ashkenazi} (Sephardi: ${r.sephardi})`) : m.id; };
  const next = () => {
    if (n >= ROUNDS || !pool.length) { T.end({ won: true }); return; }
    const c = pool[n % pool.length]; n += 1;
    legend.replaceChildren(A.h('span', { lang: 'he', dir: 'rtl', style: 'font-size:3rem' }, '◌' + c.mark.ch));
    prompt.textContent = `Verse ${n} of ${ROUNDS}: tap the word with the ${nameOf(c.mark)}. It sits ${c.mark.where}.`;
    after.textContent = refText(c.ref);
    verseEl.replaceChildren(...c.words.map((w, i) => {
      const b = A.h('button', { type: 'button', class: 'tg-word' }, w);
      b.addEventListener('click', () => {
        if (b.disabled) return;
        if (i === c.at) {
          b.classList.add('is-good'); for (const x of verseEl.querySelectorAll('button')) x.disabled = true;
          grade(A, true, { right: `Yes: word ${i + 1} of ${c.words.length} carries the ${nameOf(c.mark)}.` });
          after.textContent = `${refText(c.ref)}: ${uiEnglish(ctx, showName(c.en))}`;
          T.later(1500, next);
        } else { b.classList.add('is-bad'); grade(A, false, { wrong: `Not that word. Look ${c.mark.where} the letters.` }); T.later(600, () => b.classList.remove('is-bad')); }
      });
      return b;
    }));
  };
  const chapters = shuffle(BOOKS.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => [b.id, i + 1])), rnd).slice(0, 6);
  Promise.all([loadData(ctx, 'data/corpus/trope/table.json'), ...chapters.map(([b, c]) => loadChapter(ctx, b, c))]).then(([table, ...chs]) => {
    if (!T.live()) return;
    for (const r of table.prose || []) names[r.id] = r;
    pool = shuffle(chs.flatMap((ch, i) => candidates(ch, chapters[i][0], cfg.marks, cfg.max, rnd)), rnd);
    if (!pool.length) { A.announce('No verse in these chapters fits this level. Press Start for other chapters.'); return; }
    next();
  }).catch(() => A.announce('The verses did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
