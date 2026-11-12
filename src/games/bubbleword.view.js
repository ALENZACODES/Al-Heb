// Bubble Word: a word is missing one letter. Bubbles float up carrying letters; pop the one that completes
// the word before it reaches the top. Rimon blows the bubbles; Ari reads the word when you get it.
import { mountArcade, randInt } from './arcade.js';
import { bareLetters, wordsOfLength, ALPHABET, pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.bubbleword.v1';

const spec = {
  id: 'bubbleword', title: 'Bubble Word', titleHe: 'בּוּעוֹת',
  blurb: 'A word with a hole in it. Bubbles rise carrying letters; pop the one that fills the hole before it floats away. The meaning tells you which letter it must be.',
  howTo: ['Read the word with a gap and its meaning.', 'Tap the bubble carrying the missing letter.', 'A wrong bubble costs two points; letting the right bubble escape costs a life.', 'Ten words finish level 1. Later levels need more words, with more bubbles rising faster.'],
  levels: [
    { name: '3 bubbles, slow', bubbles: 3, speed: 95, goal: 10, min: 2, max: 3 },
    { name: '4 bubbles', bubbles: 4, speed: 85, goal: 12, min: 3, max: 4 },
    { name: '5 bubbles', bubbles: 5, speed: 75, goal: 12, min: 3, max: 5 },
    { name: '6 bubbles, look-alikes', bubbles: 6, speed: 66, goal: 14, min: 3, max: 6, confuse: true },
    { name: '7 bubbles, fast', bubbles: 7, speed: 58, goal: 16, min: 4, max: 7, confuse: true },
  ],
  par: (l, cfg) => cfg.goal * 10,
  seconds: (l, cfg) => 120,
};

const LOOKALIKE = { 'ב': 'כ', 'כ': 'ב', 'ד': 'ר', 'ר': 'ד', 'ה': 'ח', 'ח': 'ה', 'ת': 'ח', 'ו': 'ז', 'ז': 'ו', 'ג': 'נ', 'נ': 'ג', 'ס': 'ם', 'ט': 'מ', 'מ': 'ט', 'ע': 'צ', 'צ': 'ע' };

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const bank = wordsOfLength(A.words, cfg.min, cfg.max);
  if (bank.length < 5) { A.announce('Not enough words.'); return; }
  const H = 280;
  let word = null, missing = '', gapIdx = 0, solved = 0, bubbles = [];
  const prompt = A.h('p', { class: 'arc-big', lang: 'he', dir: 'rtl' });
  const meaning = A.h('p', { class: 'arc-prompt' });
  const tank = A.h('div', { class: 'arc-lane', style: `height:${H}px;width:100%` });
  A.board.replaceChildren(prompt, meaning, tank);
  A.setLives(3);
  const newWord = () => {
    word = bank[randInt(rnd, bank.length)]; const letters = [...bareLetters(word.he)];
    gapIdx = randInt(rnd, letters.length); missing = letters[gapIdx];
    prompt.textContent = letters.map((ch, i) => i === gapIdx ? '▢' : ch).join('');
    meaning.textContent = `${word.en} · "${word.translit}"`;
    for (const b of bubbles) b.el.remove(); bubbles = [];
    const decoys = pickSeeded(ALPHABET.filter((ch) => ch !== missing), cfg.bubbles - 1, rnd);
    if (cfg.confuse && LOOKALIKE[missing] && !decoys.includes(LOOKALIKE[missing])) decoys[0] = LOOKALIKE[missing];
    pickSeeded([missing, ...decoys], cfg.bubbles, rnd).forEach((ch, i) => {
      const el = A.h('button', { type: 'button', class: 'arc-choice', lang: 'he', dir: 'rtl', style: `position:absolute;border-radius:50%;width:56px;height:56px;left:${Math.round((i + 0.5) * (100 / cfg.bubbles))}%;transform:translateX(-50%);top:${H}px;font-size:1.5rem`, 'aria-label': `Bubble with ${ch}`, onclick: () => pop(ch, el) }, ch);
      const y0 = A.quiet ? H / 2 - 28 : H + randInt(rnd, 60); el.style.top = `${y0}px`; tank.append(el); bubbles.push({ ch, el, y: y0 });
    });
  };
  const pop = (ch, el) => {
    if (ch === missing) { solved++; A.addScore(10); A.sfx('bubble_pop'); A.announce(`${word.he}: ${word.en}.`); A.sayWord(word); if (solved >= cfg.goal) { A.finish({ won: true }); return; } newWord(); }
    else { A.addScore(-2); A.sfx('error_soft'); A.slip(); el.remove(); bubbles = bubbles.filter((b) => b.el !== el); A.announce(`${ch} does not make "${word.translit}".`); }
  };
  const step = () => {
    for (const b of bubbles) { b.y -= 3; b.el.style.top = `${b.y}px`; }
    const gone = bubbles.find((b) => b.ch === missing && b.y < -56);
    if (gone) { A.announce(`The ${missing} bubble escaped. The word was ${word.he}.`); if (A.miss()) return; newWord(); }
  };
  newWord();
  if (!A.quiet) A.loop(step, cfg.speed);
  else A.announce('Calm mode: the bubbles hold still.');
}

export const mount = mountArcade(spec, setup);
