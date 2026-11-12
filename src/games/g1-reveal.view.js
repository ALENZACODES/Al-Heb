// Slow Reveal: a letter draws itself a little at a time from its own strokes (data/letters/letters.json). Name it as
// early as you can: the less of it you needed, the more it scores. Look-alikes are among the choices.
import { mountArcade } from './arcade.js';
import { strokeLetters, revealPlan, shuffle } from './g1-core.js';
import { host, track, draftNote, ensureStyle, loadLetterStrokes, letterSvg, series, numberKeys, choiceButtons, he } from './g1-ui.js';

export const STORE_KEY = 'games.g1-reveal.v1';

const spec = {
  id: 'g1-reveal', title: 'Slow Reveal', titleHe: 'אַט',
  blurb: 'A letter is being drawn, one piece at a time. Tap the letter you think it is. Guess early for more points, or press Draw More to see another piece. Letters that look alike are always among the choices.',
  howTo: ['Look at the part that is drawn so far.', 'Tap your guess, or press Draw More (or Enter) for another piece.', 'Early guesses score more. A wrong guess costs a point and draws the next piece for you.', 'Levels 4 and 5 draw the handwritten (script) letter; the choices are printed letters.'],
  levels: [
    { name: 'Print, three choices', hand: 'print', steps: 4, choices: 3, count: 8, finals: false },
    { name: 'Print, four choices', hand: 'print', steps: 4, choices: 4, count: 10, finals: false },
    { name: 'Finals and finer steps', hand: 'print', steps: 6, choices: 4, count: 10, finals: true },
    { name: 'Script letters', hand: 'cursive', steps: 4, choices: 3, count: 8, finals: false },
    { name: 'Script, fine steps', hand: 'cursive', steps: 6, choices: 5, count: 10, finals: true },
  ],
  par: (l, cfg) => cfg.count * 14,
  seconds: (l, cfg) => 30 + cfg.count * 12,
  needsWords: false, needsLetters: false,
};

/** Choices for a letter: the answer, its look-alikes first, then others. */
export function revealChoices(letter, letters, n, rnd = Math.random) {
  const like = letters.filter((l) => (letter.confusableWith || []).includes(l.id));
  const rest = shuffle(letters.filter((l) => l.id !== letter.id && !like.includes(l)), rnd);
  return shuffle([letter, ...shuffle(like, rnd), ...rest].slice(0, n), rnd);
}
/** Points for a right guess after `step` of `steps` pieces were shown. */
export const revealPoints = (step, steps) => Math.max(3, (steps - step + 1) * 4);

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const pic = A.h('div', { 'aria-live': 'polite' });
  const area = A.h('div', {});
  A.board.replaceChildren(host(A, 'noa-side', 'Do not wait for all of it. Trust your eyes.'), prompt, pic, area,
    draftNote(A, 'The strokes come from the app\'s letter data; a teacher has not checked the script forms yet.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  let more = null;
  A.keys((k) => { if (k === 'enter' && more && !more.disabled) { more.click(); return true; } return false; });
  const run = (items, all) => series(A, T, Math.min(cfg.count, items.length), (i, done) => {
    const letter = items[i - 1], strokes = letter[cfg.hand].strokes;
    let step = 1, over = false;
    const draw = () => {
      pic.replaceChildren(letterSvg(strokes, { parts: revealPlan(strokes, step, cfg.steps), label: `Piece ${step} of ${cfg.steps} of a ${cfg.hand === 'cursive' ? 'script' : 'printed'} letter` }));
      if (more) more.disabled = over || step >= cfg.steps;
    };
    prompt.textContent = `Letter ${i} of ${Math.min(cfg.count, items.length)}. Which letter is this?`;
    more = A.h('button', { type: 'button', class: 'btn secondary', onclick: () => { if (step < cfg.steps) { step += 1; A.sfx('tick'); draw(); } } }, 'Draw More');
    const row = choiceButtons(A, revealChoices(letter, all, cfg.choices, rnd), {
      render: (l) => he(A, l.he, 'he g1-glyph'), label: 'Which letter',
      isRight: (l) => l.id === letter.id,
      points: 0,
      say: (l, ok) => (ok ? `Yes, ${letter.name}, after ${step} of ${cfg.steps} pieces.` : `Not ${l.name}. Here is more of it.`),
      onWrong: () => { if (step < cfg.steps) { step += 1; draw(); } },
      onRight: () => { over = true; A.addScore(revealPoints(step, cfg.steps)); step = cfg.steps; draw(); A.sayLetter(letter); done(); },
    });
    area.replaceChildren(row, A.h('div', { class: 'row' }, more));
    draw();
  });
  A.announce('Getting the letters ready…');
  loadLetterStrokes(A.ctx).then((letters) => {
    if (!T.live()) return;
    const usable = strokeLetters(letters, cfg.hand, 1).filter((l) => cfg.finals || !/-final$/.test(l.id));
    run(shuffle(usable, rnd), usable)();
  }).catch(() => A.announce('The letters did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
