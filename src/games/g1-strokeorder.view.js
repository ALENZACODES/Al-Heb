// Stroke Order: a letter is drawn faintly with its strokes tagged A, B, C in a random order. Tap the strokes in the order
// you write them; each right one is inked in with its number. Print letters first, then the handwritten (script) forms.
// Strokes and their order come from the app's letter data (data/letters/letters.json), the same as the tracing pages.
import { mountArcade } from './arcade.js';
import { strokeLetters, describeStroke, viewBoxFor, shuffle } from './g1-core.js';
import { host, track, grade, draftNote, ensureStyle, loadLetterStrokes, letterSvg, series, numberKeys, markButton } from './g1-ui.js';

export const STORE_KEY = 'games.g1-strokeorder.v1';
const TAGS = 'ABCDE';
const SVG = 'http://www.w3.org/2000/svg';

const spec = {
  id: 'g1-strokeorder', title: 'Stroke Order', titleHe: 'קַו',
  blurb: 'A letter is drawn in pale lines, each stroke tagged with a capital letter. Tap the strokes in the order you would write them. Each right stroke is inked in with its number, so by the end you have written the letter.',
  howTo: ['Each button names a stroke and says where it starts and ends.', 'Tap the stroke you write first, then the next. Number keys 1 to 5 press the buttons.', 'A wrong stroke costs a point and stays open, so you can try again.', 'Levels 4 and 5 use the handwritten (script) letters.'],
  levels: [
    { name: 'Two strokes', hand: 'print', max: 2, count: 5, finals: false },
    { name: 'More print letters', hand: 'print', max: 3, count: 6, finals: false },
    { name: 'Final forms too', hand: 'print', max: 3, count: 7, finals: true },
    { name: 'Script letters', hand: 'cursive', max: 3, count: 5, finals: true },
    { name: 'Print and script', hand: 'mixed', max: 3, count: 8, finals: true },
  ],
  par: (l, cfg) => cfg.count * 22,
  seconds: (l, cfg) => 40 + cfg.count * 18,
  needsWords: false, needsLetters: false,
};

/** The letters for a level: enough strokes to have an order, no more than the level allows. */
export function pool(letters, cfg) {
  const hands = cfg.hand === 'mixed' ? ['print', 'cursive'] : [cfg.hand];
  return hands.flatMap((hand) => strokeLetters(letters, hand, 2).filter((l) => l[hand].strokes.length <= cfg.max && (cfg.finals || !/-final$/.test(l.id))).map((l) => ({ letter: l, hand })));
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const pic = A.h('div', {});
  const area = A.h('div', {});
  A.board.replaceChildren(host(A, 'noa', 'Write it the way your hand would: first stroke first.'), prompt, pic, area,
    draftNote(A, 'Stroke order follows the app\'s letter data; a teacher has not checked it yet. Some writers use another order.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  const round = (items) => series(A, T, Math.min(cfg.count, items.length), (i, done) => {
    const { letter, hand } = items[i - 1];
    const strokes = letter[hand].strokes, box = viewBoxFor(strokes), b = box.split(' ').map(Number);
    const tagOf = shuffle(strokes.map((_, k) => k), rnd); // tagOf[t] = stroke index wearing tag t
    let next = 0;
    const draw = () => {
      const svg = letterSvg(strokes, { box, label: `${hand === 'cursive' ? 'Script' : 'Print'} ${letter.name}: ${next} of ${strokes.length} strokes written`, style: (k) => ({ class: k < next ? 'g1-done' : 'g1-ghost' }) });
      tagOf.forEach((k, t) => {
        const m = strokes[k].median[Math.floor(strokes[k].median.length / 2)];
        const tx = globalThis.document.createElementNS(SVG, 'text');
        tx.setAttribute('x', String(m[0] + 30)); tx.setAttribute('y', String(m[1] - 30)); tx.setAttribute('font-size', String(Math.round(b[2] / 9)));
        tx.setAttribute('fill', 'currentColor'); tx.textContent = k < next ? String(k + 1) : TAGS[t];
        svg.appendChild(tx);
      });
      pic.replaceChildren(svg);
    };
    const tail = A.h('span', {}, ` ${letter.name}, ${hand === 'cursive' ? 'script' : 'print'}. Tap stroke 1.`);
    prompt.replaceChildren(`Letter ${i} of ${Math.min(cfg.count, items.length)}: `, A.h('span', { lang: 'he', dir: 'rtl', class: 'he' }, letter.he), tail);
    const row = A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'Strokes' }, ...tagOf.map((k, t) => {
      const btn = A.h('button', { type: 'button', class: 'arc-choice' }, `${TAGS[t]}: ${describeStroke(strokes[k], b)}`);
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        if (k === next) {
          next += 1; btn.disabled = true; markButton(A, btn, true);
          grade(A, true, { points: 6, right: `Stroke ${next} of ${strokes.length}.` });
          draw();
          if (next === strokes.length) { A.addScore(8); A.announce(`${letter.name} written in ${strokes.length} strokes.`); done(); }
          else tail.textContent = ` ${letter.name}, ${hand === 'cursive' ? 'script' : 'print'}. Tap stroke ${next + 1}.`;
        } else grade(A, false, { wrong: `Not yet: that is not stroke ${next + 1}.` });
      });
      return btn;
    }));
    area.replaceChildren(row);
    draw();
  });
  A.announce('Getting the letters ready…');
  loadLetterStrokes(A.ctx).then((letters) => {
    if (!T.live()) return;
    const items = shuffle(pool(letters, cfg), rnd);
    if (!items.length) { A.announce('No letters for this level.'); return; }
    round(items)();
  }).catch(() => A.announce('The letters did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
