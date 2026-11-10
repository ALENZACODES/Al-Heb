// Final Five: the five letters that change shape at the end of a word (kaf, mem, nun, pe, tsadi).
// A word is shown with its last letter missing; choose the right shape. Later levels flip it:
// given a final form, pick its regular form, or spot the word written with the wrong shape.
import { mountArcade, choiceRow, randInt } from './arcade.js';
import { bareLetters, FINAL_TO_BASE, BASE_TO_FINAL, pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.finalfive.v1';

const spec = {
  id: 'finalfive', title: 'Final Five', titleHe: 'אוֹתִיּוֹת סוֹפִיּוֹת',
  blurb: 'Five letters put on a different coat at the end of a word. A word appears with its last letter missing: choose the right shape.',
  howTo: ['Read the word with the gap. Its meaning is written under it.', 'Choose the letter that ends it. At the end of a word kaf, mem, nun, pe and tsadi use their final forms.', 'Later levels ask the reverse (final form to regular) and ask you to spot a word spelled with the wrong shape.', 'Twelve words per round.'],
  levels: [
    { name: 'Which ending?', mode: 'end', count: 10, options: 2 },
    { name: 'Three choices', mode: 'end', count: 12, options: 3 },
    { name: 'Final to regular', mode: 'reverse', count: 12, options: 3 },
    { name: 'Spot the wrong shape', mode: 'spot', count: 12, options: 3 },
    { name: 'All mixed, fast', mode: 'mixed', count: 15, options: 4 },
  ],
  par: (l, cfg) => cfg.count * 10,
  seconds: (l, cfg) => 100,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const finals = Object.keys(FINAL_TO_BASE);
  const endsFinal = A.words.filter((w) => finals.includes(bareLetters(w.he).slice(-1)));
  const others = A.words.filter((w) => !finals.includes(bareLetters(w.he).slice(-1)) && bareLetters(w.he).length >= 2);
  if (endsFinal.length < 5) { A.announce('Not enough words ending in a final letter.'); return; }
  let n = 0;
  const prompt = A.h('p', { class: 'arc-big', lang: 'he', dir: 'rtl' });
  const meaning = A.h('p', { class: 'arc-prompt' });
  const row = A.h('div');
  A.board.replaceChildren(prompt, meaning, row);
  const next = () => {
    if (n >= cfg.count) { A.finish({ won: true }); return; }
    n++;
    const mode = cfg.mode === 'mixed' ? ['end', 'reverse', 'spot'][randInt(rnd, 3)] : cfg.mode;
    if (mode === 'spot') return spot();
    const w = endsFinal[randInt(rnd, endsFinal.length)];
    const bare = bareLetters(w.he), last = bare.slice(-1), base = FINAL_TO_BASE[last];
    if (mode === 'end') {
      prompt.textContent = bare.slice(0, -1) + ' ▢';
      meaning.replaceChildren(`${w.en} · ${w.translit}`);
      const wrong = pickSeeded([base, ...finals.filter((f) => f !== last)], cfg.options - 1, rnd);
      row.replaceChildren(choiceRow(pickSeeded([last, ...wrong], cfg.options, rnd), (o) => o, (o) => {
        const ok = o === last;
        if (ok) { A.addScore(10); A.sfx('success'); A.announce(`${w.he}: ${w.en}. Final ${A.letters.find((x) => x.he === last)?.name || ''}.`); A.sayWord(w); next(); }
        else { A.addScore(-3); A.sfx('miss'); A.miss(); A.announce(o === base ? 'That is the regular shape; at the end of a word it changes.' : 'Not that ending.'); }
        return ok;
      }));
    } else {
      prompt.textContent = last;
      meaning.replaceChildren(`This final form belongs to which regular letter? (from ${w.he}, ${w.en})`);
      const wrong = pickSeeded(Object.values(FINAL_TO_BASE).filter((b) => b !== base), cfg.options - 1, rnd);
      row.replaceChildren(choiceRow(pickSeeded([base, ...wrong], cfg.options, rnd), (o) => o, (o) => {
        const ok = o === base;
        if (ok) { A.addScore(10); A.sfx('success'); next(); } else { A.addScore(-3); A.sfx('miss'); A.miss(); }
        return ok;
      }));
    }
  };
  const spot = () => {
    // one real word, written correctly or with the final/regular shape swapped at the end
    const w = endsFinal[randInt(rnd, endsFinal.length)];
    const bare = bareLetters(w.he), last = bare.slice(-1);
    const wrongForm = bare.slice(0, -1) + FINAL_TO_BASE[last];
    const other = others[randInt(rnd, others.length)];
    const otherBare = bareLetters(other.he), ob = otherBare.slice(-1);
    const otherWrong = BASE_TO_FINAL[ob] ? otherBare.slice(0, -1) + BASE_TO_FINAL[ob] : null;
    const options = pickSeeded([{ t: bare, ok: true, w }, { t: wrongForm, ok: false, w }, ...(otherWrong ? [{ t: otherWrong, ok: false, w: other }] : [])], 3, rnd);
    prompt.textContent = '?';
    meaning.replaceChildren(`Which spelling is right? (${w.en})`);
    row.replaceChildren(choiceRow(options, (o) => o.t, (o) => {
      if (o.ok) { A.addScore(10); A.sfx('success'); A.sayWord(w); next(); }
      else { A.addScore(-3); A.sfx('miss'); A.miss(); A.announce(o.w === w ? 'The last letter needs its final form.' : `That is ${o.w.en} with a wrong ending.`); }
      return o.ok;
    }));
  };
  next();
}

export const mount = mountArcade(spec, setup);
