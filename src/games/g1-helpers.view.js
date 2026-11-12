// Silent Helpers: some letters in a pointed word are not said as consonants. A vav can carry the o or u vowel (וֹ וּ), a
// yod can follow an i or e without a sound of its own, and a final he or a bare alef is silent. Tap every helper.
// Real words from the app's word list; the rule set is g1-core.js helperTargets (words it does not cover are left out).
import { mountArcade } from './arcade.js';
import { helperTargets, shortEn, shuffle, letterClusters } from './g1-core.js';
import { host, track, grade, draftNote, ensureStyle, series, markButton, loadWords } from './g1-ui.js';

export const STORE_KEY = 'games.g1-helpers.v1';

/** What kind of helper a letter is, in plain words. */
export function helperKind(c) {
  if (c.base === 'ו') return c.text.includes('ֹ') ? 'vav-o' : 'vav-u';
  return { 'י': 'yod', 'ה': 'he', 'א': 'alef' }[c.base] || 'other';
}
export const KIND_SAY = Object.freeze({
  'vav-o': 'this vav is the o vowel (holam), not a v',
  'vav-u': 'this vav is the u vowel (shuruk), not a v',
  yod: 'this yod only lengthens the vowel before it',
  he: 'a he at the end of a word with no vowel is silent',
  alef: 'an alef with no vowel of its own is silent',
});

const spec = {
  id: 'g1-helpers', title: 'Silent Helpers', titleHe: 'סָמוּי',
  blurb: 'Some letters work behind the scenes. A vav can be the o or u vowel, a yod can sit after an i or e without a sound, and a he at the end of a word or an alef with no vowel is silent. Find every helper: the letters you do not say as a consonant.',
  howTo: ['Tap each letter you would not say as a consonant.', 'A wrong letter costs a point; a right one tells you what kind of helper it is.', 'When you have found them all, press All Found.', 'From level 4 some words have no helpers at all.'],
  levels: [
    { name: 'Vav helpers', kinds: ['vav-o', 'vav-u'], none: false, count: 8 },
    { name: 'Vav and yod', kinds: ['vav-o', 'vav-u', 'yod'], none: false, count: 8 },
    { name: 'Silent he and alef', kinds: ['vav-o', 'vav-u', 'yod', 'he', 'alef'], none: false, count: 10 },
    { name: 'Some have none', kinds: ['vav-o', 'vav-u', 'yod', 'he', 'alef'], none: true, count: 10 },
    { name: 'Longer words', kinds: ['vav-o', 'vav-u', 'yod', 'he', 'alef'], none: true, count: 12, minLen: 4 },
  ],
  par: (l, cfg) => cfg.count * 13,
  seconds: (l, cfg) => 20 + cfg.count * 9,
  needsWords: false,
};

/** Words for a level: every helper in the word is of a kind the level teaches (and, with none, a few words with none). */
export function helperWords(words, cfg, rnd = Math.random) {
  const out = [], spare = [];
  for (const w of shuffle(words, rnd)) {
    const t = helperTargets(w.he);
    if (!t || letterClusters(w.he).length < (cfg.minLen || 2)) continue;
    const cl = letterClusters(w.he);
    if (!t.length) { if (cfg.none && letterClusters(w.he).some((c) => 'ויהא'.includes(c.base))) spare.push(w); continue; }
    if (t.every((i) => cfg.kinds.includes(helperKind(cl[i])))) out.push(w);
  }
  const n = cfg.none ? Math.round(cfg.count / 4) : 0;
  return shuffle([...out.slice(0, cfg.count - n), ...spare.slice(0, n)], rnd);
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const wordEl = A.h('div', {});
  const meaning = A.h('p', { class: 'muted' });
  const actions = A.h('div', { class: 'row' });
  A.board.replaceChildren(host(A, 'ari-side', 'Some letters help quietly. Spot them.'), prompt, wordEl, meaning, actions,
    draftNote(A, 'Helpers are found by a simple rule set over the app\'s pointed words; a teacher has not checked every word.'));
  const run = (words) => series(A, T, words.length, (i, done) => {
    const w = words[i - 1], cl = letterClusters(w.he), want = new Set(helperTargets(w.he));
    let found = 0;
    prompt.textContent = `Word ${i} of ${words.length}: tap every silent helper, then press All Found.`;
    meaning.textContent = `“${shortEn(w.en)}”`;
    const all = A.h('button', { type: 'button', class: 'btn' }, 'All Found');
    const finish = () => { for (const b of [...wordEl.querySelectorAll('button'), all]) b.disabled = true; meaning.textContent = `${w.translit}: “${shortEn(w.en)}”`; A.sayWord(w); done(); };
    wordEl.replaceChildren(A.h('div', { class: 'g1-word', lang: 'he', dir: 'rtl', role: 'group', 'aria-label': 'Letters of the word' }, ...cl.map((c, k) => {
      const b = A.h('button', { type: 'button' }, c.text);
      b.addEventListener('click', () => {
        if (b.disabled) return;
        if (want.has(k)) { found += 1; b.disabled = true; markButton(A, b, true); grade(A, true, { points: 6, right: `Yes: ${KIND_SAY[helperKind(c)]}.` }); }
        else grade(A, false, { wrong: 'You say that one: it is a consonant here.' });
      });
      return b;
    })));
    all.addEventListener('click', () => {
      if (all.disabled) return;
      if (found === want.size) { markButton(A, all, true); grade(A, true, { right: want.size ? 'All found.' : 'Right: every letter in this word is said.' }); finish(); }
      else grade(A, false, { wrong: `${want.size - found} still hiding.` });
    });
    actions.replaceChildren(all);
  }, 800);
  loadWords(A.ctx).then((all) => { if (T.live()) run(helperWords(all, cfg, rnd))(); })
    .catch(() => A.announce('The words did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
