// Departure Board: an amber station board lists lines, destinations and times, printed without vowels like the real
// thing. The station clock runs; catch the right departure before it leaves the board. Trains add a platform question,
// and the last level asks you to arrive by a set time.
import { mountArcade } from './arcade.js';
import { pick, sample, shuffle, stripPoints, hhmm } from './g4-core.js';
import { begin, withBank, host, heItem, heText, say, grade, draftNote, buttons, ticker, numberKeys } from './g4-ui.js';

export const STORE_KEY = 'games.g4-busboard.v1';
const ROUNDS = 8;
export const PLACES = Object.freeze(['s.market', 's.hospital', 's.beach', 's.hotel', 's.university', 's.mall', 's.post', 's.bank', 's.bridge', 's.police', 's.mountain', 's.sea']);

/**
 * A board: rows { line, dest, dep, travel, platform } around `now`, with `twins` rows going to the target place.
 * Returns { rows, target }.
 */
export function makeBoard(size, twins, now, rnd = Math.random) {
  const dests = sample(PLACES, size - twins + 1, rnd);
  const target = dests[0];
  const used = new Set();
  const line = () => { let x; do x = 1 + Math.floor(rnd() * 98); while (used.has(x)); used.add(x); return x; };
  const rows = [...Array.from({ length: twins }, () => target), ...dests.slice(1)].map((dest) => ({ line: line(), dest, dep: now + 3 + Math.floor(rnd() * 16), travel: 10 + 5 * Math.floor(rnd() * 6), platform: 1 + Math.floor(rnd() * 6) }));
  return { rows: shuffle(rows, rnd).sort((a, b) => a.dep - b.dep), target };
}
/** Rows that answer the task at time now: to the target, not gone yet, and (with a deadline) arriving in time. */
export const goodRows = (board, now, deadline = null) => board.rows.filter((r) => r.dest === board.target && r.dep >= now && (deadline == null || r.dep + r.travel <= deadline));
/** A deadline that the given rows can just make: the earliest arrival among them plus a little slack. */
export const deadlineFor = (rows) => Math.min(...rows.map((r) => r.dep + r.travel)) + 4;

const spec = {
  id: 'g4-busboard', title: 'Departure Board', titleHe: 'אוֹטוֹבּוּס',
  blurb: 'Bus and train boards in Israel use the 24-hour clock and print the destinations without vowel points. The clock is running: find your departure and get on before it leaves.',
  howTo: ['Read where you are going, then tap the departure that takes you there (number keys 1 to 9 work too).', 'Departures leave the board when the clock passes their time.', 'If two go to your place, take the next one that has not left.', 'Level 4 asks for the train platform. Level 5 gives a time you must arrive by.'],
  levels: [
    { name: 'Three buses, English help', size: 3, twins: 1, en: true, ms: 1400 },
    { name: 'Five buses, take the next one', size: 5, twins: 2, en: true, ms: 1200 },
    { name: 'Bare board', size: 6, twins: 2, plain: true, ms: 1000 },
    { name: 'Trains and platforms', size: 6, twins: 2, plain: true, train: true, ms: 1000 },
    { name: 'Arrive by...', size: 7, twins: 3, plain: true, train: true, deadline: true, ms: 800 },
  ],
  par: (l) => ROUNDS * (l >= 4 ? 20 : 10),
  seconds: (l) => (l >= 4 ? 200 : 160),
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const task = A.h('div', { class: 'g4-scene' }), clock = A.h('p', { class: 'g4-dark', 'aria-live': 'off' });
  const table = A.h('div', { class: 'g4-dark arc-choices', role: 'group', 'aria-label': 'Departures' }), area = A.h('div');
  A.board.replaceChildren(host(A, 'noa', 'Which one do we take?'), task, clock, table, area, draftNote(A, 'Place words from the app\'s lessons and word list. Lines and times are made up for the game.'));
  numberKeys(A, () => (area.querySelector('.arc-choices') || table));
  withBank(A, T, (B) => {
    pick(B, PLACES, cfg.train ? 's.train' : 's.bus', 's.platform');
    const vehicle = B.get(cfg.train ? 's.train' : 's.bus'), plat = B.get('s.platform');
    const place = (k) => heText(A, cfg.plain ? stripPoints(B.get(k).he) : B.get(k).he);
    let n = 0, now = 0, board = null, deadline = null, busy = false;
    const draw = () => {
      clock.textContent = `Station clock ${hhmm(now)}`;
      table.replaceChildren(...board.rows.map((r) => {
        const gone = r.dep < now;
        return A.h('button', { type: 'button', class: 'arc-choice', disabled: gone || busy || undefined, onclick: () => choose(r) },
          `${cfg.train ? '' : r.line + ' · '}`, place(r.dest), cfg.en ? A.h('small', { class: 'g4-en', lang: 'en' }, ` ${B.get(r.dest).en}`) : null,
          ` · ${hhmm(r.dep)}`, cfg.train ? ` · platform ${r.platform}` : '', cfg.deadline ? ` · ${r.travel} min ride` : '', gone ? ' · left' : '');
      }));
    };
    const choose = (r) => {
      if (busy) return;
      const good = goodRows(board, now, deadline);
      const ok = good.includes(r);
      const why = r.dest !== board.target ? `That one goes to ${B.get(r.dest).en}.` : deadline != null && r.dep + r.travel > deadline ? `That gets in at ${hhmm(r.dep + r.travel)}: too late.` : 'That one has left.';
      if (!grade(A, ok, { right: `On board: ${hhmm(r.dep)} to ${B.get(r.dest).en}.`, wrong: why })) return;
      say(A, B.get(r.dest));
      if (!cfg.train) { busy = true; draw(); T.later(700, next); return; }
      busy = true; draw();
      area.replaceChildren(A.h('p', {}, 'Which platform? ', heItem(A, plat, { en: true })), buttons(A, [1, 2, 3, 4, 5, 6], (p) => String(p), (p) => {
        const right = grade(A, p === r.platform, { right: `Platform ${r.platform}.`, wrong: `Look at the board again: that train leaves from platform ${r.platform}.` });
        if (right) T.later(600, next);
        return right;
      }, { label: 'Platforms' }));
    };
    const next = () => {
      if (n >= ROUNDS) { T.end({ won: true }); return; }
      n += 1; busy = false; area.replaceChildren();
      now = 6 * 60 + Math.floor(rnd() * 16 * 60);
      board = makeBoard(cfg.size, cfg.twins, now, rnd);
      if (cfg.train) board.rows.forEach((r) => { r.line = 0; });
      deadline = cfg.deadline ? deadlineFor(board.rows.filter((r) => r.dest === board.target).slice(1)) : null;
      task.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Trip ${n} of ${ROUNDS}: `, heItem(A, vehicle), ' to'),
        A.h('p', {}, cfg.en ? A.h('strong', {}, B.get(board.target).en) : place(board.target), deadline != null ? ` · arrive by ${hhmm(deadline)}` : ''));
      draw();
      const mine = board;
      ticker(A, T, cfg.ms, () => {
        if (board !== mine || busy) return false;
        now += 1; draw();
        if (!goodRows(board, now, deadline).length) { grade(A, false, { wrong: 'Your departure has gone. The next trip is coming up.' }); busy = true; T.later(600, next); return false; }
        return true;
      });
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
