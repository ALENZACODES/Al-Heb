// Open or Closed? Read the hours on a shop door (Sunday to Thursday, a short Friday, closed on Shabbat) and say whether
// you can go in now. Later: which of three shops is open, and when the shut one opens again.
import { mountArcade } from './arcade.js';
import { pick, sample, options, stripPoints, hhmm, isOpen, DAY_KEYS, DAY_EN } from './g4-core.js';
import { begin, withBank, host, heItem, heText, enText, say, grade, draftNote, buttons, numberKeys } from './g4-ui.js';

export const STORE_KEY = 'games.g4-hours.v1';
const ROUNDS = 10;
const H = (h, m = 0) => h * 60 + m;
/** Door signs (hours made up for the game, in the usual Israeli pattern). days: 0 Sunday ... 6 Shabbat. */
export const SIGNS = Object.freeze([
  { key: 's.bakery', rows: [{ days: [0, 4], open: H(7), close: H(19) }, { days: [5, 5], open: H(6, 30), close: H(14) }, { days: [6, 6], closed: true }] },
  { key: 's.pharmacy', rows: [{ days: [0, 4], open: H(8), close: H(21) }, { days: [5, 5], open: H(8), close: H(14) }, { days: [6, 6], closed: true }] },
  { key: 's.bank', rows: [{ days: [0, 4], open: H(8, 30), close: H(13, 30) }, { days: [5, 6], closed: true }] },
  { key: 's.post', rows: [{ days: [0, 4], open: H(8), close: H(18) }, { days: [5, 5], open: H(8), close: H(12) }, { days: [6, 6], closed: true }] },
  { key: 's.mall', rows: [{ days: [0, 4], open: H(10), close: H(22) }, { days: [5, 5], open: H(9, 30), close: H(15) }, { days: [6, 6], closed: true }] },
  { key: 's.market', rows: [{ days: [0, 4], open: H(8), close: H(19) }, { days: [5, 5], open: H(7), close: H(15) }, { days: [6, 6], closed: true }] },
  { key: 's.restaurant', rows: [{ days: [0, 4], open: H(12), close: H(23) }, { days: [5, 5], open: H(11), close: H(15) }, { days: [6, 6], closed: true }] },
]);
/** A moment worth asking about: often near opening or closing, often on Friday or Shabbat. */
export function moment(sign, rnd = Math.random) {
  const day = rnd() < 0.45 ? 5 + Math.floor(rnd() * 2) : Math.floor(rnd() * 5);
  const row = sign.rows.find((r) => day >= r.days[0] && day <= r.days[1]);
  const edges = row && !row.closed ? [row.open, row.close] : [H(10), H(16)];
  const mins = Math.max(H(6), Math.min(H(23, 30), edges[Math.floor(rnd() * 2)] + (Math.floor(rnd() * 9) - 4) * 15));
  return { day, mins };
}
/** The next time the shop opens after (day, mins), as { day, mins }; null if the sign never opens. */
export function nextOpening(sign, day, mins) {
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7;
    const row = sign.rows.find((r) => d >= r.days[0] && d <= r.days[1]);
    if (row && !row.closed && (i > 0 || mins < row.open)) return { day: d, mins: row.open };
  }
  return null;
}

const spec = {
  id: 'g4-hours', title: 'Open or Closed?', titleHe: 'פָּתוּחַ',
  blurb: 'In Israel the working week runs Sunday to Thursday. On Friday, erev Shabbat, shops close early in the afternoon, and most stay shut on Shabbat. Read the door, then say if you can go in.',
  howTo: ['Read the hours on the door and the time now, then choose open or closed (keys 1 and 2).', 'Levels 1 and 2 show the English of the days. From level 3 the sign has no vowel points.', 'Level 4: three doors; tap the one that is open.', 'Level 5: a shut door; when does it open next?'],
  levels: [
    { name: 'One door, with English', mode: 'one', en: true },
    { name: 'The time in Hebrew', mode: 'one', heDay: true },
    { name: 'Bare signs', mode: 'one', heDay: true, plain: true },
    { name: 'Which door is open?', mode: 'three', heDay: true, plain: true },
    { name: 'When does it open?', mode: 'next', heDay: true, plain: true },
  ],
  par: () => ROUNDS * 10,
  seconds: (l) => (l >= 4 ? 200 : 150),
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const top = A.h('div'), doors = A.h('div', { class: 'g4-wall' }), area = A.h('div');
  A.board.replaceChildren(host(A, 'rimon', 'Can we still go in?'), top, doors, area, draftNote(A, 'Day and shop words from the app\'s lessons, word lists and calendar. Opening hours are made up for the game; real ones vary.'));
  numberKeys(A, () => area.querySelector('.arc-choices') || doors);
  withBank(A, T, (B) => {
    pick(B, DAY_KEYS, SIGNS.map((s) => s.key), 's.open', 's.closed');
    const he = (k) => heText(A, cfg.plain ? stripPoints(B.get(k).he) : B.get(k).he);
    const dayName = (d) => (cfg.en ? A.h('span', {}, he(DAY_KEYS[d]), A.h('small', { class: 'g4-en', lang: 'en' }, ` ${DAY_EN[d]}`)) : he(DAY_KEYS[d]));
    const door = (sign, onPick) => {
      const rows = sign.rows.map((r) => A.h('tr', {}, A.h('td', {}, dayName(r.days[0]), r.days[1] > r.days[0] ? [' – ', dayName(r.days[1])] : null),
        A.h('td', {}, r.closed ? he('s.closed') : enText(A, `${hhmm(r.open)}–${hhmm(r.close)}`))));
      const body = [A.h('p', { class: 'g4-big' }, he(sign.key)), A.h('table', { class: 'g4-board' }, A.h('tbody', {}, ...rows))];
      return onPick ? A.h('button', { type: 'button', class: 'g4-sign', onclick: (e) => onPick(e.currentTarget || e.target) }, ...body) : A.h('div', { class: 'g4-sign', role: 'img', 'aria-label': `Door sign: ${B.get(sign.key).en}` }, ...body);
    };
    const nowLine = (m) => A.h('p', { class: 'arc-prompt' }, 'Now: ', cfg.heDay ? he(DAY_KEYS[m.day]) : A.h('strong', {}, DAY_EN[m.day]), ` ${hhmm(m.mins)}`);
    let n = 0;
    const next = () => {
      if (n >= ROUNDS) { T.end({ won: true }); return; }
      n += 1; area.replaceChildren(); doors.replaceChildren();
      const count = A.h('p', { class: 'muted' }, `Door ${n} of ${ROUNDS}`);
      if (cfg.mode === 'three') {
        let m, trio;
        do { m = moment(sample(SIGNS, 1, rnd)[0], rnd); trio = sample(SIGNS, 3, rnd); } while (trio.filter((s) => isOpen(s, m.day, m.mins)).length !== 1);
        top.replaceChildren(count, nowLine(m), A.h('p', {}, 'Only one of these is open. Which?'));
        doors.replaceChildren(...trio.map((s) => door(s, (b) => {
          if (!b || b.disabled) return;
          const ok = grade(A, isOpen(s, m.day, m.mins), { right: `Yes, the ${B.get(s.key).en} is open.`, wrong: `The ${B.get(s.key).en} is closed then.` });
          b.disabled = true; b.classList?.add(ok ? 'is-good' : 'is-bad');
          if (ok) { for (const x of doors.querySelectorAll('button')) x.disabled = true; say(A, B.get(s.key)); T.later(800, next); }
        })));
        return;
      }
      const sign = sample(SIGNS, 1, rnd)[0];
      let m = moment(sign, rnd);
      if (cfg.mode === 'next') while (isOpen(sign, m.day, m.mins)) m = moment(sign, rnd);
      top.replaceChildren(count, nowLine(m));
      doors.replaceChildren(door(sign));
      if (cfg.mode === 'next') {
        const want = nextOpening(sign, m.day, m.mins);
        const label = (o) => A.h('span', {}, he(DAY_KEYS[o.day]), ` ${hhmm(o.mins)}`);
        const decoys = [0, 1, 2, 3, 4, 5].map((d) => ({ day: d, mins: sign.rows.find((r) => d >= r.days[0] && d <= r.days[1] && !r.closed)?.open ?? H(8) }));
        area.replaceChildren(A.h('p', {}, 'Closed now. When does it open next?'), buttons(A, options(want, decoys, 4, rnd, (o) => `${o.day}-${o.mins}`), label, (o) => {
          const ok = grade(A, o.day === want.day && o.mins === want.mins, { right: `Right: ${DAY_EN[want.day]} at ${hhmm(want.mins)}.`, wrong: 'Read the sign again, day by day from now.' });
          if (ok) T.later(800, next);
          return ok;
        }, { label: 'Next opening' }));
        return;
      }
      const open = isOpen(sign, m.day, m.mins);
      area.replaceChildren(buttons(A, ['s.open', 's.closed'], (k) => heItem(A, B.get(k), { en: !!cfg.en }), (k) => {
        const ok = grade(A, (k === 's.open') === open, { right: open ? 'Open: in you go.' : 'Closed: try another time.', wrong: open ? 'It is open then. Check the hours again.' : `It is closed then${m.day === 6 ? ': Shabbat' : m.day === 5 ? ': Friday hours are short' : ''}.` });
        if (ok) { say(A, B.get(k)); T.later(700, next); }
        return ok;
      }, { label: 'Open or closed' }));
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
