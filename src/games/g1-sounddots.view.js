// Dot or No Dot: bet, kaf and pe change sound with the dot inside (dagesh): b or v, k or kh, p or f. Shin and sin
// change with the dot on top: sh or s. Read the letter and pick its sound. Levels 4 and 5 point at the letter inside a
// real word from the app's word list.
import { mountArcade } from './arcade.js';
import { DOT_SOUNDS, dotItems, PT, shortEn, shuffle, letterClusters } from './g1-core.js';
import { host, track, draftNote, ensureStyle, he, series, choiceButtons, roundKeys, loadWords, loadSyllables, saySyllable } from './g1-ui.js';

export const STORE_KEY = 'games.g1-sounddots.v1';
const NAMES = { 'ב': ['bet', 'vet'], 'כ': ['kaf', 'khaf'], 'פ': ['pe', 'fe'], 'ש': ['shin', 'sin'] };
const WHY = { 'ב': 'the dot inside', 'כ': 'the dot inside', 'פ': 'the dot inside', 'ש': 'the dot on the right for sh, on the left for s' };

const spec = {
  id: 'g1-sounddots', title: 'Dot or No Dot', titleHe: 'נְקֻדָּה',
  blurb: 'One small dot changes the sound. Bet with a dot is b, without it v. Kaf: k or kh. Pe: p or f. Shin with the dot on the right is sh; with the dot on the left it is sin, s. Read the letter and pick its sound.',
  howTo: ['Look closely at the dot.', 'Tap the sound, or press 1 or 2 (or the left and right arrows).', 'A wrong pick costs a point and tells you what the dot does.', 'Levels 4 and 5 underline the letter inside a real word. At the end of a word kaf and pe take their final shapes ך ף.'],
  levels: [
    { name: 'Bet and vet', from: 'syllable', letters: ['ב'], count: 10 },
    { name: 'Bet, kaf and pe', from: 'syllable', letters: ['ב', 'כ', 'פ'], count: 12 },
    { name: 'Shin and sin too', from: 'syllable', letters: ['ב', 'כ', 'פ', 'ש'], count: 14 },
    { name: 'Inside real words', from: 'word', letters: ['ב', 'כ', 'פ', 'ש'], count: 12 },
    { name: 'Real words, quick', from: 'word', letters: ['ב', 'כ', 'פ', 'ש'], count: 16 },
  ],
  par: (l, cfg) => cfg.count * 10,
  seconds: (l, cfg) => 15 + cfg.count * (cfg.from === 'word' ? 7 : 5),
  needsWords: false, needsLetters: false,
};

/** A syllable question: the letter with or without its dot, and a vowel. */
export function syllableItem(letter, rnd = Math.random) {
  const hard = rnd() < 0.5, v = [PT.PATACH, PT.SEGOL, PT.HIRIQ, PT.HOLAM, PT.KUBUTZ][Math.floor(rnd() * 5)];
  const dot = letter === 'ש' ? (hard ? PT.SHIN_DOT : PT.SIN_DOT) : hard ? PT.DAGESH : '';
  return { he: letter + dot + v, letter, sound: DOT_SOUNDS[letter][hard ? 0 : 1], at: 0 };
}
/** Word questions: one dotted letter (ב כ פ ך ף ש) per word, from the word list. */
export function wordItems(words, n, rnd = Math.random) {
  const out = [];
  for (const w of shuffle(words, rnd)) {
    if (out.length >= n) break;
    const items = dotItems(w.he);
    if (!items.length) continue;
    const [at, sound] = items[Math.floor(rnd() * items.length)];
    const base = letterClusters(w.he)[at].base;
    out.push({ word: w, he: w.he, at, sound, letter: 'בכפש'.includes(base) ? base : base === 'ך' ? 'כ' : 'פ' });
  }
  return out;
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const shown = A.h('div', { class: 'g1-word', lang: 'he', dir: 'rtl' });
  const meaning = A.h('p', { class: 'muted' });
  const area = A.h('div', {});
  A.board.replaceChildren(host(A, 'noa-side', 'Small dot, big difference.'), prompt, shown, meaning, area,
    draftNote(A, 'The b/v, k/kh and p/f pairs and sh/s are the same in Israeli, Sephardi and Ashkenazi reading.'));
  roundKeys(A, (k) => { const i = { 1: 0, 2: 1, left: 0, right: 1 }[k]; const b = area.querySelectorAll('button')[i]; if (b && !b.disabled) { b.click(); return true; } return false; });
  let syllables = [];
  const ask = (items) => series(A, T, items.length, (i, done) => {
    const q = items[i - 1];
    const cl = letterClusters(q.he);
    shown.replaceChildren(...cl.map((c, k) => A.h('span', { class: k === q.at && cl.length > 1 ? 'g1-hl' : 'g1-big' }, c.text)));
    meaning.textContent = q.word ? `“${shortEn(q.word.en)}”` : '';
    prompt.textContent = `${i} of ${items.length}: ${cl.length > 1 ? 'the underlined letter says…' : 'this letter says…'}`;
    const pair = DOT_SOUNDS[q.letter];
    area.replaceChildren(choiceButtons(A, pair, {
      render: (s) => `“${s}”`, label: 'Sounds', rtl: false,
      isRight: (s) => s === q.sound,
      say: (s, ok) => (ok ? `Yes: ${NAMES[q.letter][pair.indexOf(s)]}, “${s}”.` : `Not “${s}”. Look at ${WHY[q.letter]}.`),
      onRight: () => { if (q.word) A.sayWord(q.word); else saySyllable(A, syllables, q.he); done(); },
    }));
  }, 500);
  const start = (words) => {
    const items = cfg.from === 'word' ? wordItems(words, cfg.count, rnd) : Array.from({ length: cfg.count }, (_, k) => syllableItem(cfg.letters[k % cfg.letters.length], rnd));
    ask(cfg.from === 'word' ? items : shuffle(items, rnd))();
  };
  Promise.all([cfg.from === 'word' ? loadWords(A.ctx) : [], loadSyllables(A.ctx).catch(() => [])]).then(([w, s]) => { syllables = s; if (T.live()) start(w); })
    .catch(() => A.announce('The words did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
