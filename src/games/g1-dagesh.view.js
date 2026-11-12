// Dagesh Spotter: real words from the app's word list. Tap every letter with a dot inside it (a dagesh). At levels 4
// and 5 only the dots that change the sound count: the ones in bet, kaf and pe. Words with a shuruk (וּ) or a mappiq (הּ)
// are left out, because those dots are not a dagesh.
import { mountArcade } from './arcade.js';
import { dageshEligible, dageshTargets, shortEn, shuffle, letterClusters } from './g1-core.js';
import { host, track, grade, draftNote, ensureStyle, series, markButton, loadWords } from './g1-ui.js';

export const STORE_KEY = 'games.g1-dagesh.v1';

const spec = {
  id: 'g1-dagesh', title: 'Dagesh Spotter', titleHe: 'דָּגֵשׁ',
  blurb: 'A dagesh is a dot inside a letter. Spot every one in the word. At levels 4 and 5 only the dots that change the sound count, the ones in bet, kaf and pe (b not v, k not kh, p not f). If a word has none of those, say so.',
  howTo: ['Tap each letter that has a dot inside it. Tab and Enter work too.', 'The counter says how many are left. A wrong letter costs a point.', 'At levels 4 and 5, press No More Here when every bet, kaf and pe with a dot is found (or the word has none).', 'The dot in a vav that says u (וּ) is a different mark, so those words are not used here.'],
  levels: [
    { name: 'Short words', maxLen: 4, max: 1, soundOnly: false, count: 8 },
    { name: 'Up to two dots', maxLen: 5, max: 2, soundOnly: false, count: 8 },
    { name: 'Longer words', maxLen: 7, max: 3, soundOnly: false, count: 10 },
    { name: 'Only sound changers', maxLen: 6, max: 3, soundOnly: true, count: 10 },
    { name: 'Sound changers, longer', maxLen: 7, max: 3, soundOnly: true, count: 12 },
  ],
  par: (l, cfg) => cfg.count * 12,
  seconds: (l, cfg) => 20 + cfg.count * 9,
  needsWords: false,
};

/** Words for a level: a dagesh that is really a dagesh, short enough, not too many dots. */
export const dageshWords = (words, cfg) => words.filter((w) => dageshEligible(w.he) && letterClusters(w.he).length <= cfg.maxLen && dageshTargets(w.he).length <= cfg.max);

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const wordEl = A.h('div', {});
  const meaning = A.h('p', { class: 'muted' });
  const actions = A.h('div', { class: 'row' });
  A.board.replaceChildren(host(A, 'ari', 'Look inside the letters. Some hold a dot.'), prompt, wordEl, meaning, actions,
    draftNote(A, 'Words from the app\'s word list.'));
  const run = (words) => series(A, T, Math.min(cfg.count, words.length), (i, done) => {
    const w = words[i - 1], want = new Set(dageshTargets(w.he, cfg.soundOnly));
    let found = 0;
    const what = cfg.soundOnly ? 'bet, kaf or pe with a dot' : 'letter with a dot inside';
    const left = () => { prompt.textContent = `Word ${i} of ${Math.min(cfg.count, words.length)}: tap every ${what}. ${cfg.soundOnly ? `${found} found; press No More Here when there are no more.` : `${want.size - found} left.`}`; };
    left();
    meaning.textContent = `${w.translit}: “${shortEn(w.en)}”`;
    const finish = () => { for (const b of wordEl.querySelectorAll('button')) b.disabled = true; none && (none.disabled = true); A.sayWord(w); done(); };
    wordEl.replaceChildren(A.h('div', { class: 'g1-word', lang: 'he', dir: 'rtl', role: 'group', 'aria-label': 'Letters of the word' }, ...letterClusters(w.he).map((c, k) => {
      const b = A.h('button', { type: 'button' }, c.text);
      b.addEventListener('click', () => {
        if (b.disabled) return;
        if (want.has(k)) {
          found += 1; b.disabled = true; markButton(A, b, true);
          grade(A, true, { points: 6, right: `Yes, ${c.base} has a dagesh.` }); left();
          if (found === want.size && !cfg.soundOnly) { A.addScore(6); finish(); }
        } else grade(A, false, { wrong: cfg.soundOnly && c.text.includes('ּ') ? 'That dot does not change the sound: only bet, kaf and pe count here.' : 'No dot inside that one.' });
      });
      return b;
    })));
    const none = cfg.soundOnly ? A.h('button', { type: 'button', class: 'btn secondary' }, 'No More Here') : null;
    none?.addEventListener('click', () => {
      if (none.disabled) return;
      if (found === want.size) { markButton(A, none, true); grade(A, true, { right: found ? 'Right: that was all of them.' : 'Right: no bet, kaf or pe with a dot in this word.' }); finish(); }
      else grade(A, false, { wrong: `There ${want.size - found === 1 ? 'is one' : `are ${want.size - found}`} to find.` });
    });
    actions.replaceChildren(...(none ? [none] : []));
  }, 700);
  loadWords(A.ctx).then((all) => { if (T.live()) run(shuffle(dageshWords(all, cfg), rnd))(); })
    .catch(() => A.announce('The words did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
