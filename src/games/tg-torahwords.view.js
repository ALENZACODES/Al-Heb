// Torah Top Thirty: the thirty spellings the Torah uses most (data/torahread/words30.json, counted over the five books).
// Learn what they mean in three bands of ten, then the other way round, then guess which of two comes up more often.
import { mountArcade, choiceRow } from './arcade.js';
import { loadData, hasName, options, shuffle } from './tg-core.js';
import { host, track, numberKeys, grade, draftNote, ensureStyle, roundKeys } from './tg-ui.js';

export const STORE_KEY = 'games.tg-torahwords.v1';
const ROUNDS = 10;

const spec = {
  id: 'tg-torahwords', title: 'Torah Top Thirty', titleHe: 'מִלִּים בַּתּוֹרָה',
  blurb: 'A handful of short words make up a large part of the Torah. Know these thirty and you will spot them on every page of a Chumash. The counts are how often each spelling appears in the five books.',
  howTo: ['Levels 1 to 3: a word appears; pick its meaning. Each level is the next ten words.', 'Level 4: a meaning appears; pick the word.', 'Level 5: two words; tap the one the Torah uses more often (left and right arrows work too).', 'Press 1 to 4 to answer from the keyboard.'],
  levels: [
    { name: 'The top ten', mode: 'he2en', ranks: [1, 10] },
    { name: 'Eleven to twenty', mode: 'he2en', ranks: [11, 20] },
    { name: 'Twenty-one to thirty', mode: 'he2en', ranks: [21, 30] },
    { name: 'Meaning to word', mode: 'en2he', ranks: [1, 30] },
    { name: 'Which comes up more?', mode: 'more', ranks: [1, 30] },
  ],
  par: () => ROUNDS * 10,
  seconds: (l) => (l === 5 ? 90 : 120),
  needsWords: false, needsLetters: false,
};

/** Playable entries: the divine name is left out (it is never a quiz item and never voiced). */
export function playable(list) {
  return (list || []).filter((w) => w.pointed && w.gloss && !hasName(w.pointed) && !w.say);
}
const short = (gloss) => String(gloss).split(/[;(]/)[0].trim();

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const big = A.h('div', { class: 'arc-big', lang: 'he', dir: 'rtl' });
  const prompt = A.h('p', { class: 'arc-prompt' });
  const area = A.h('div');
  const fact = A.h('p', { class: 'muted' });
  A.board.replaceChildren(host(A, 'noa', 'These words are on every page of a Chumash.'), big, prompt, area, fact,
    draftNote(A, 'Counts are of written spellings in the Leningrad Codex text, so a prefix makes a separate entry. Meanings are short and written for this app; not reviewed by a teacher.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  let all = [], pool = [], n = 0;
  const next = () => { if (n >= ROUNDS) { T.end({ won: true }); return; } n += 1; ask(); };
  const say = (w) => { if (w.vocabId) A.sayWord({ id: w.vocabId, he: w.pointed }); };
  const ask = () => {
    fact.textContent = '';
    if (cfg.mode === 'more') return more();
    const w = pool[(n - 1) % pool.length];
    const opts = options(w, all, 4, rnd, (x) => short(x.gloss));
    const done = (ok, picked) => {
      fact.textContent = `${w.pointed} appears ${w.count.toLocaleString('en')} times in the Torah (rank ${w.rank}).`;
      grade(A, ok, { right: `${w.pointed}: ${short(w.gloss)}.`, wrong: `${picked} is not it. ${w.pointed} means "${short(w.gloss)}".` });
      if (ok) { say(w); T.later(900, next); }
      return ok;
    };
    if (cfg.mode === 'he2en') {
      big.textContent = w.pointed; prompt.textContent = `What does it mean? (${n} of ${ROUNDS})`;
      area.replaceChildren(choiceRow(opts, (o) => A.h('span', { lang: 'en', dir: 'ltr' }, short(o.gloss)), (o) => done(o === w, `"${short(o.gloss)}"`), { label: 'Meanings' }));
    } else {
      big.textContent = ''; prompt.textContent = `Which word means "${short(w.gloss)}"? (${n} of ${ROUNDS})`;
      area.replaceChildren(choiceRow(opts, (o) => o.pointed, (o) => done(o === w, o.pointed), { label: 'Words' }));
    }
  };
  const more = () => {
    const [a, b] = shuffle(all, rnd).filter((x, i, arr) => i < 2 || x.count !== arr[0].count).slice(0, 2);
    big.textContent = ''; prompt.textContent = `Which does the Torah use more often? (${n} of ${ROUNDS})`;
    const pickIt = (x) => {
      const win = a.count >= b.count ? a : b;
      const ok = x === win;
      fact.textContent = `${a.pointed}: ${a.count.toLocaleString('en')} times. ${b.pointed}: ${b.count.toLocaleString('en')} times.`;
      grade(A, ok, { right: `Yes, ${win.pointed} (${short(win.gloss)}).`, wrong: `${win.pointed} comes up more.` });
      for (const btn of area.querySelectorAll('button')) btn.disabled = true;
      T.later(1100, next);
      return ok;
    };
    const card = (x) => A.h('button', { type: 'button', class: 'arc-choice tg-card', onclick: () => pickIt(x) }, A.h('span', { lang: 'he', dir: 'rtl', style: 'font-size:1.6rem' }, x.pointed), A.h('small', {}, short(x.gloss)));
    area.replaceChildren(A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'Two words' }, card(a), card(b)));
  };
  roundKeys(A, (k) => {
    if (cfg.mode !== 'more' || (k !== 'left' && k !== 'right')) return false;
    const btns = [...area.querySelectorAll('button')].filter((x) => !x.disabled);
    // the cards sit left to right in reading order of the page (English layout): left arrow is the first card
    (k === 'left' ? btns[0] : btns[1])?.click();
    return true;
  });
  loadData(A.ctx, 'data/torahread/words30.json').then((d) => {
    if (!T.live()) return;
    all = playable(d.words);
    pool = shuffle(all.filter((w) => w.rank >= cfg.ranks[0] && w.rank <= cfg.ranks[1]), rnd);
    next();
  }).catch(() => A.announce('The word counts did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
