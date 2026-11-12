// Shva: Said or Silent: the two dots under a letter (ְ) are sometimes said as a quick e and sometimes not said at all.
// A real word with one shva underlined: said or silent? Only shvas that the app's basic and full rule sets agree on are
// asked (src/pronunciation/shva.js, worked out ahead in data/games/g1/words.json). Levels 4 and 5 also ask why.
import { mountArcade } from './arcade.js';
import { shortEn, shuffle, letterClusters } from './g1-core.js';
import { host, track, draftNote, ensureStyle, series, choiceButtons, numberKeys, loadWords } from './g1-ui.js';

export const STORE_KEY = 'games.g1-shva.v1';
/** Plain reasons, by where the shva sits. */
export const WHY = Object.freeze({
  start: 'It is under the first letter of the word, so it is said.',
  end: 'It is under the last letter of the word, so it is silent.',
  middle: 'It closes a syllable in the middle of the word, so it is silent.',
});
export const placeOf = (word, i) => (i === 0 ? 'start' : i === letterClusters(word).length - 1 ? 'end' : 'middle');

const spec = {
  id: 'g1-shva', title: 'Shva: Said or Silent', titleHe: 'שְׁוָא',
  blurb: 'The shva (two dots under a letter, ְ) is a small puzzle. At the start of a word you say it as a quick e. At the end of a word it is silent, and in the middle it usually closes a syllable and is silent too. Read the word and decide.',
  howTo: ['The letter carrying the shva is underlined.', 'Tap Said (a quick e) or Silent, or press 1 or 2.', 'Levels 4 and 5 then ask why; a right reason scores extra.', 'These are the reading rules for prayer and careful speech; everyday Israeli speech often drops the said shva too.'],
  levels: [
    { name: 'Start or end', places: ['start', 'end'], why: false, count: 10 },
    { name: 'Start or middle', places: ['start', 'middle'], why: false, count: 10 },
    { name: 'Anywhere', places: ['start', 'middle', 'end'], why: false, count: 12 },
    { name: 'Say why', places: ['start', 'middle', 'end'], why: true, count: 10 },
    { name: 'Say why, more words', places: ['start', 'middle', 'end'], why: true, count: 14 },
  ],
  par: (l, cfg) => cfg.count * (cfg.why ? 16 : 10),
  seconds: (l, cfg) => 20 + cfg.count * (cfg.why ? 12 : 7),
  needsWords: false,
};

/** Questions: one settled shva per word, from the places the level asks about, places mixed evenly. */
export function shvaQuestions(words, places, n, rnd = Math.random) {
  const by = Object.fromEntries(places.map((p) => [p, []]));
  for (const w of shuffle(words, rnd)) for (const [i, verdict] of w.shva || []) { const p = placeOf(w.he, i); if (by[p] && !by[p].some((q) => q.word.he === w.he)) by[p].push({ word: w, at: i, said: verdict === 'na', place: p }); }
  const out = [];
  for (let k = 0; out.length < n && k < n * places.length; k++) { const p = by[places[k % places.length]]; if (p.length) out.push(p.shift()); }
  return shuffle(out, rnd);
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const wordEl = A.h('div', { class: 'g1-word', lang: 'he', dir: 'rtl' });
  const meaning = A.h('p', { class: 'muted' });
  const area = A.h('div', {});
  A.board.replaceChildren(host(A, 'noa', 'Two little dots: say them, or keep quiet?'), prompt, wordEl, meaning, area,
    draftNote(A, 'Verdicts come from the app\'s shva rules; only shvas where the simple and the full rules agree are asked. A teacher has not checked every word.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  const run = (qs) => series(A, T, qs.length, (i, done) => {
    const q = qs[i - 1], cl = letterClusters(q.word.he);
    wordEl.replaceChildren(...cl.map((c, k) => A.h('span', { class: k === q.at ? 'g1-hl' : '' }, c.text)));
    meaning.textContent = `“${shortEn(q.word.en)}”`;
    prompt.textContent = `Word ${i} of ${qs.length}: the shva under the underlined letter is…`;
    const reason = () => {
      prompt.textContent = 'Why?';
      area.replaceChildren(choiceButtons(A, shuffle(Object.keys(WHY), rnd), {
        render: (p) => WHY[p], label: 'Why', rtl: false, points: 6, isRight: (p) => p === q.place,
        say: (p, ok) => (ok ? 'Right reason.' : 'Look at where the letter sits in the word.'),
        onRight: () => { meaning.textContent = `${q.word.translit}: “${shortEn(q.word.en)}”`; A.sayWord(q.word); done(); },
      }));
    };
    area.replaceChildren(choiceButtons(A, [true, false], {
      render: (s) => (s ? 'Said (a quick e)' : 'Silent'), label: 'Said or silent', rtl: false, isRight: (s) => s === q.said,
      say: (s, ok) => (ok ? `${q.said ? 'Said' : 'Silent'}. ${cfg.why ? '' : WHY[q.place]}` : `Not quite. ${WHY[q.place]}`),
      onRight: () => { if (cfg.why) T.later(500, reason); else { meaning.textContent = `${q.word.translit}: “${shortEn(q.word.en)}”`; A.sayWord(q.word); done(); } },
    }));
  }, 900);
  loadWords(A.ctx).then((all) => { if (T.live()) run(shvaQuestions(all, cfg.places, cfg.count, rnd))(); })
    .catch(() => A.announce('The words did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
