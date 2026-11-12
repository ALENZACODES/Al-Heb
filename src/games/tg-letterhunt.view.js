// Verse Letter Hunt: real Torah verses (Genesis 1 and 2, from the app's Torah text) become the board. Find every copy
// of a letter, then look-alikes, final forms and vowel signs; at the top level, find a word in a prayer from the siddur.
import { mountArcade } from './arcade.js';
import { loadChapter, loadData, tokens, letterClusters, toBase, bare, hasName, showName, shuffle } from './tg-core.js';
import { host, track, grade, draftNote, ensureStyle } from './tg-ui.js';

export const STORE_KEY = 'games.tg-letterhunt.v1';

export const VOWELS = Object.freeze([
  { mark: 'ָ', name: 'kamatz' }, { mark: 'ַ', name: 'patach' }, { mark: 'ִ', name: 'hiriq' },
  { mark: 'ֵ', name: 'tsere' }, { mark: 'ֶ', name: 'segol' }, { mark: 'ֹ', name: 'holam' }, { mark: 'ְ', name: 'shva' },
]);
const PLAIN = [...'אלמרשהבויתנעדק'];
const LOOKALIKES = [['ב', 'כ'], ['ד', 'ר'], ['ה', 'ח'], ['ו', 'ז'], ['ע', 'צ'], ['ס', 'ם'], ['ג', 'נ']];
const FINALS = [...'םןךףץ'];
/** Divine names and titles are never the word to hunt (they still show in the line as written, never voiced). */
const HOLY = new Set(['אדני', 'אלהים', 'אלהינו', 'אלהי', 'אלהיכם', 'אלהיך', 'שדי', 'אל']);

const spec = {
  id: 'tg-letterhunt', title: 'Verse Letter Hunt', titleHe: 'צַיִד אוֹתִיּוֹת',
  blurb: 'The board is a real verse from the start of the Torah. Find every copy of the letter, then the look-alikes, the final forms and the vowel signs. At the top level the board is a line from the siddur and you hunt for a word.',
  howTo: ['Tap every letter that matches the target. Use Tab and Enter if you prefer the keyboard.', 'Level 1: one letter (its final form counts too).', 'Level 2: a letter with a look-alike nearby.', 'Level 3: final forms only. Level 4: every letter that carries a vowel sign.', 'Level 5: find the word in a prayer line.'],
  levels: [
    { name: 'One letter', mode: 'letter', verses: 5 },
    { name: 'Look-alikes', mode: 'pair', verses: 5 },
    { name: 'Final forms', mode: 'final', verses: 5 },
    { name: 'Find the vowel', mode: 'vowel', verses: 5 },
    { name: 'Siddur word hunt', mode: 'word', verses: 8 },
  ],
  par: (l, cfg) => (cfg.mode === 'word' ? 8 * 15 : 5 * 30),
  seconds: (l) => (l === 5 ? 150 : 180),
  needsWords: false, needsLetters: false,
};

/** Positions [wordIndex, letterIndex] in the verse that match the target. */
export function huntTargets(verseHe, target) {
  const out = [];
  tokens(verseHe).forEach((w, wi) => letterClusters(w).forEach((c, li) => { if (matches(c, target)) out.push([wi, li]); }));
  return out;
}
export function matches(cluster, target) {
  if (target.kind === 'letter') return toBase(cluster.base) === target.he;
  if (target.kind === 'exact') return cluster.base === target.he;
  if (target.kind === 'vowel') return cluster.text.includes(target.mark);
  return false;
}
/** A target for this verse and level, or null when the verse has nothing that fits. */
export function pickTarget(verseHe, mode, rnd = Math.random) {
  const cl = tokens(verseHe).flatMap((w) => letterClusters(w));
  const bases = new Set(cl.map((c) => toBase(c.base))), exact = new Set(cl.map((c) => c.base));
  if (mode === 'letter') { const c = shuffle(PLAIN, rnd).find((x) => bases.has(x)); return c ? { kind: 'letter', he: c, label: c } : null; }
  if (mode === 'pair') {
    const pair = shuffle(LOOKALIKES, rnd).find(([a, b]) => exact.has(a) && exact.has(b));
    if (!pair) return null;
    const c = pair[Math.floor(rnd() * 2)];
    return { kind: 'exact', he: c, label: c, other: pair.find((x) => x !== c) };
  }
  if (mode === 'final') { const c = shuffle(FINALS, rnd).find((x) => exact.has(x)); return c ? { kind: 'exact', he: c, label: c } : null; }
  if (mode === 'vowel') { const v = shuffle(VOWELS, rnd).find((x) => cl.some((c) => c.text.includes(x.mark))); return v ? { kind: 'vowel', mark: v.mark, label: 'ב' + v.mark, name: v.name } : null; }
  return null;
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd, ctx = A.ctx;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const verseEl = A.h('div', { class: 'tg-verse', lang: 'he', dir: 'rtl' });
  const refEl = A.h('p', { class: 'muted' });
  A.board.replaceChildren(host(A, 'noa', cfg.mode === 'word' ? 'Find the word in the prayer.' : 'Find every one. Some are hiding.'), prompt, verseEl, refEl,
    draftNote(A, 'Verses from the Torah text in this app (Leningrad Codex). Siddur lines from the app\'s prayer texts. The divine name is shown as ה׳.'));
  let queue = [], n = 0;
  const loadBoards = async () => {
    if (cfg.mode === 'word') {
      const reg = await loadData(ctx, 'data/corpus/registry.json');
      return shuffle((reg.entries || []).filter((e) => e.category === 'siddur' && e.he && tokens(e.he).length >= 4 && tokens(e.he).length <= 30), rnd)
        .map((e) => ({ he: showName(e.he), ref: e.title, en: e.english || '' }));
    }
    const chs = await Promise.all([loadChapter(ctx, 'genesis', 1), loadChapter(ctx, 'genesis', 2)]);
    return shuffle(chs.flatMap((c) => c.verses.map((v) => ({ he: v.he, ref: `Genesis ${c.chapter}:${v.n}`, en: v.en }))).filter((v) => !hasName(v.he) && tokens(v.he).length <= 12), rnd);
  };
  const next = () => {
    if (n >= cfg.verses || !queue.length) { T.end({ won: true }); return; }
    const board = queue.shift();
    if (cfg.mode === 'word') return wordBoard(board);
    const target = pickTarget(board.he, cfg.mode, rnd);
    if (!target) { next(); return; }
    n += 1;
    letterBoard(board, target);
  };
  const letterBoard = (board, target) => {
    const want = huntTargets(board.he, target);
    const key = (wi, li) => `${wi}.${li}`;
    const wanted = new Set(want.map(([w, l]) => key(w, l)));
    let found = 0;
    const what = target.kind === 'vowel' ? `the ${target.name} sign (${target.label})` : target.kind === 'letter' ? `${target.label} (its final form counts too)` : target.label;
    prompt.textContent = `Verse ${n} of ${cfg.verses}: tap every ${what}. ${want.length} to find.`;
    refEl.textContent = board.ref;
    verseEl.replaceChildren(...tokens(board.he).map((w, wi) => A.h('span', { class: 'tg-group' }, ...letterClusters(w).map((c, li) => {
      const b = A.h('button', { type: 'button', class: 'tg-let' }, c.text);
      b.addEventListener('click', () => {
        if (b.disabled) return;
        if (wanted.has(key(wi, li))) {
          b.disabled = true; b.classList.add('is-good'); found += 1;
          grade(A, true, { points: 5, right: `${found} of ${want.length} found.` });
          if (found === want.length) { A.addScore(10); A.announce(`All ${want.length} found in ${board.ref}.`); T.later(700, next); }
        } else {
          b.classList.add('is-bad');
          grade(A, false, { wrong: target.other && c.base === target.other ? `That is ${target.other}, the look-alike.` : 'Not that one.' });
          T.later(500, () => b.classList.remove('is-bad'));
        }
      });
      return b;
    }))));
  };
  const wordBoard = (board) => {
    const words = tokens(board.he);
    const counts = new Map(); words.forEach((w) => counts.set(w, (counts.get(w) || 0) + 1));
    const choices = words.map((w, i) => [w, i]).filter(([w]) => counts.get(w) === 1 && !w.includes('ה׳') && !HOLY.has(bare(w)) && letterClusters(w).length >= 3);
    if (!choices.length) { next(); return; }
    n += 1;
    const [goal] = choices[Math.floor(rnd() * choices.length)];
    prompt.replaceChildren(`Line ${n} of ${cfg.verses}: find `, A.h('span', { lang: 'he', dir: 'rtl', class: 'he', style: 'font-size:1.4em' }, goal));
    refEl.textContent = board.ref;
    verseEl.replaceChildren(...words.map((w) => {
      const b = A.h('button', { type: 'button', class: 'tg-word' }, w);
      b.addEventListener('click', () => {
        if (b.disabled) return;
        if (w === goal) { b.classList.add('is-good'); for (const x of verseEl.querySelectorAll('button')) x.disabled = true; grade(A, true, { points: 15, right: `Found it in ${board.ref}.` }); T.later(800, next); }
        else { b.classList.add('is-bad'); grade(A, false, { wrong: 'Not that word. Look letter by letter.' }); T.later(500, () => b.classList.remove('is-bad')); }
      });
      return b;
    }));
  };
  A.announce('Getting the verses ready…');
  loadBoards().then((q) => { if (!T.live()) return; queue = q; next(); }).catch(() => A.announce('The verses did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
