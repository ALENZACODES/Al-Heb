// City Grid: directions in Hebrew on a grid of city blocks. "Turn right" depends on where you are facing. Follow the
// directions step by step, then from memory, then give directions yourself, then work out where a route ends.
import { mountArcade } from './arcade.js';
import { pick, sample, stripPoints, walk, randomRoute, CMD_KEY } from './g4-core.js';
import { begin, withBank, host, heItem, heText, say, grade, draftNote, buttons, numberKeys } from './g4-ui.js';

export const STORE_KEY = 'games.g4-grid.v1';
const ROUNDS = 6, SIZE = 5;
const ARROW = { N: '▲', E: '▶', S: '▼', W: '◀' };
const FACING = { N: 'up the map', E: 'to the right of the map', S: 'down the map', W: 'to the left of the map' };
export const PLACES = Object.freeze(['s.pharmacy', 's.bank', 's.bakery', 's.post', 's.market', 's.hotel', 's.station', 's.police']);

/** Fewest commands from (pos, heading) to goal, by breadth-first search over the grid (Infinity if it cannot be reached). */
export function stepsTo(pos, heading, goal, size = SIZE) {
  const key = (p, h) => `${p[0]},${p[1]},${h}`;
  const seen = new Set([key(pos, heading)]);
  let frontier = [[pos, heading]], d = 0;
  while (frontier.length) {
    for (const [p] of frontier) if (p[0] === goal[0] && p[1] === goal[1]) return d;
    const nxt = [];
    for (const [p, h] of frontier) for (const c of ['straight', 'left', 'right']) {
      const w = walk(p, h, [c], size);
      if (w.off || seen.has(key(w.end, w.heading))) continue;
      seen.add(key(w.end, w.heading)); nxt.push([w.end, w.heading]);
    }
    frontier = nxt; d += 1;
  }
  return Infinity;
}
/** A direction you give is good when it brings the walker closer (in commands) to the goal. */
export function goodDirection(pos, heading, goal, cmd, size = SIZE) {
  const w = walk(pos, heading, [cmd], size);
  return !w.off && stepsTo(w.end, w.heading, goal, size) < stepsTo(pos, heading, goal, size);
}

const spec = {
  id: 'g4-grid', title: 'City Grid', titleHe: 'לֵךְ יָשָׁר',
  blurb: 'Lech yashar, pne yamina, pne smola: go straight, turn right, turn left. Right and left depend on which way you face, not on the map. Follow directions, remember them, give them, and picture where they lead.',
  howTo: ['The yellow square is you; the arrow shows which way you face. Each move goes one block.', 'Levels 1 and 2: read each direction and press the matching move (keys 1 to 3).', 'Level 3: the whole route shows for a few seconds; then walk it from memory.', 'Level 4: guide a visitor to the place by choosing the Hebrew directions. Level 5: read the route and tap where it ends.'],
  levels: [
    { name: 'Three steps', mode: 'follow', len: 3, tr: true },
    { name: 'Four steps', mode: 'follow', len: 4 },
    { name: 'From memory', mode: 'memory', len: 4 },
    { name: 'Give directions', mode: 'give' },
    { name: 'Where does it end?', mode: 'end', len: 5, plain: true },
  ],
  par: (l) => ROUNDS * (l === 5 ? 10 : (spec.levels[l - 1].len || 4) * 10),
  seconds: (l) => (l >= 3 ? 220 : 180),
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const info = A.h('div', { class: 'g4-scene' }), map = A.h('div'), area = A.h('div');
  A.board.replaceChildren(host(A, 'rimon', 'Which way? Right depends on where you face!'), info, map, area, draftNote(A, 'Directions from the app\'s phrasebook. Not yet checked by a native speaker.'));
  numberKeys(A, () => area.querySelector('.arc-choices') || map.querySelector('.arc-choices'));
  withBank(A, T, (B) => {
    pick(B, Object.values(CMD_KEY), PLACES);
    const dir = (cmd) => (cfg.plain ? heText(A, stripPoints(B.get(CMD_KEY[cmd]).he)) : heItem(A, B.get(CMD_KEY[cmd]), { tr: !!cfg.tr }));
    let n = 0, pos = null, hd = 'N', goal = null, labels = new Map();
    const draw = (onCell) => {
      const cells = [];
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
        const me = pos && pos[0] === r && pos[1] === c, isGoal = goal && goal[0] === r && goal[1] === c && cfg.mode !== 'end';
        const lab = labels.get(`${r},${c}`);
        const inner = [me ? ARROW[hd] : '', lab ? heText(A, stripPoints(B.get(lab).he), { cls: 'g4-tr' }) : ''];
        cells.push(onCell ? A.h('button', { type: 'button', class: `g4-cell${me ? ' me' : ''}`, 'aria-label': `row ${r + 1}, column ${c + 1}${lab ? ', ' + B.get(lab).en : ''}`, onclick: (e) => onCell(r, c, e.currentTarget || e.target) }, ...inner)
          : A.h('span', { class: `g4-cell${me ? ' me' : ''}${isGoal ? ' goal' : ''}`, 'aria-hidden': 'true' }, ...inner));
      }
      map.replaceChildren(A.h('div', { class: 'g4-grid' + (onCell ? ' arc-choices' : ''), role: onCell ? 'group' : 'img', style: `grid-template-columns:repeat(${SIZE},3rem)`,
        'aria-label': onCell ? 'Tap the square where the route ends' : `Map: you are at row ${pos[0] + 1}, column ${pos[1] + 1}, facing ${FACING[hd]}` }, ...cells));
    };
    const moveBtns = (want, onRight) => buttons(A, ['straight', 'left', 'right'], (c) => ({ straight: '↑ Ahead', left: '↰ Turn left', right: '↱ Turn right' })[c], (c) => {
      const ok = grade(A, c === want, { right: 'Yes.', wrong: `Not that way. You face ${FACING[hd]}.` });
      if (ok) onRight();
      return ok;
    }, { label: 'Moves' });
    const placeLabels = (except) => { labels = new Map(sample(PLACES, 4, rnd).map((k) => [`${Math.floor(rnd() * SIZE)},${Math.floor(rnd() * SIZE)}`, k])); if (except) labels.set(`${except[0]},${except[1]}`, except[2]); };
    const next = () => {
      if (n >= ROUNDS) { T.end({ won: true }); return; }
      n += 1;
      const count = A.h('p', { class: 'arc-prompt' }, `Route ${n} of ${ROUNDS}`);
      if (cfg.mode === 'give') {
        const route = randomRoute(3 + Math.floor(rnd() * 2), SIZE, rnd);
        const place = sample(PLACES, 1, rnd)[0];
        pos = route.start; hd = route.heading; goal = route.end; placeLabels([...goal, place]);
        info.replaceChildren(count, A.h('p', {}, 'A visitor asks the way to the ', A.h('strong', {}, B.get(place).en), '. Choose each direction.'));
        const stepGive = () => {
          draw();
          if (pos[0] === goal[0] && pos[1] === goal[1]) { say(A, B.get(place)); A.announce('You got them there!'); T.later(800, next); return; }
          area.replaceChildren(buttons(A, ['straight', 'left', 'right'], dir, (c) => {
            const ok = grade(A, goodDirection(pos, hd, goal, c), { right: 'Good, closer.', wrong: 'That takes them further away or off the map.' });
            if (ok) { const w = walk(pos, hd, [c], SIZE); pos = w.end; hd = w.heading; say(A, B.get(CMD_KEY[c])); T.later(350, stepGive); }
            return ok;
          }, { label: 'Directions' }));
        };
        stepGive();
        return;
      }
      const route = randomRoute(cfg.len, SIZE, rnd);
      pos = route.start; hd = route.heading; goal = cfg.mode === 'end' ? null : route.end; placeLabels();
      const list = () => A.h('ol', { class: 'g4-route', 'aria-label': 'Directions' }, ...route.cmds.map((c) => A.h('li', {}, dir(c))));
      if (cfg.mode === 'end') {
        info.replaceChildren(count, A.h('p', {}, `You start on the yellow square facing ${FACING[hd]}. Where do these directions end?`), list());
        const start = pos, startHd = hd;
        area.replaceChildren(A.h('p', { class: 'muted' }, 'Then tap the square below.'));
        const end = walk(start, startHd, route.cmds, SIZE).end;
        draw((r, c, b) => {
          if (!b || b.disabled) return;
          const ok = grade(A, r === end[0] && c === end[1], { right: 'Exactly there.', wrong: 'Not there. Walk it again in your head, turning where you face.' });
          b.disabled = true; b.classList?.add(ok ? 'is-good' : 'is-bad');
          if (ok) { for (const x of map.querySelectorAll('button')) x.disabled = true; T.later(800, next); }
        });
        info.append(A.h('p', { class: 'muted' }, `Start: row ${start[0] + 1}, column ${start[1] + 1}, arrow ${ARROW[startHd]}.`));
        return;
      }
      let i = 0;
      const step = () => {
        draw();
        if (i >= route.cmds.length) { A.announce('You are there!'); T.later(700, next); return; }
        const c = route.cmds[i];
        area.replaceChildren(cfg.mode === 'follow' ? A.h('p', {}, 'Direction ', String(i + 1), ': ', dir(c)) : A.h('p', {}, `Step ${i + 1} of ${route.cmds.length}, from memory.`),
          moveBtns(c, () => { const w = walk(pos, hd, [c], SIZE); pos = w.end; hd = w.heading; i += 1; T.later(300, step); }));
      };
      info.replaceChildren(count, cfg.mode === 'memory' ? list() : A.h('p', {}, 'Follow the directions to the outlined square.'));
      if (cfg.mode === 'memory') {
        area.replaceChildren(A.h('p', { class: 'muted' }, 'Read the route. It will hide in a moment.'));
        draw();
        T.later(5000, () => { info.replaceChildren(count, A.h('p', {}, 'Now walk it from memory.')); step(); });
      } else step();
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
