// Clock Talk: read the hour off a clock face in Hebrew ("the time is three"), set the hand to a time you read,
// add half and quarter, and turn 24-hour timetable times into the hour people say. Hours 1 to 10: the counting numbers
// the course has (lesson il04); 11 and 12 are left out until their Hebrew is in the app's data.
import { mountArcade } from './arcade.js';
import { pick, hourPhrase, hourAngle, minuteAngle, options, sample } from './g4-core.js';
import { begin, withBank, host, heText, heItem, enText, say, grade, numberKeys, buttons, draftNote } from './g4-ui.js';

export const STORE_KEY = 'games.g4-clock.v1';
const ROUNDS = 10;

const spec = {
  id: 'g4-clock', title: 'Clock Talk', titleHe: 'מָה הַשָּׁעָה?',
  blurb: 'Ask "ma hasha\'a?" in Israel and you hear "hasha\'a" and a number: the time is three. The hour uses the counting numbers (achat, shtayim, shalosh). Timetables run on the 24-hour clock, but people say the hour as on a clock face.',
  howTo: ['Levels 1 and 2: read the clock and pick what it says. Press 1 to 6 or tap.', 'Level 3: read the Hebrew and tap the number the short hand points to.', 'Level 4: the hour first, then half or quarter.', 'Level 5: a timetable time such as 17:00; pick the hour people say.'],
  levels: [
    { name: 'One to five, with help', mode: 'read', max: 5, choices: 3, legend: true },
    { name: 'One to ten', mode: 'read', max: 10, choices: 4 },
    { name: 'Set the hand', mode: 'set', max: 10 },
    { name: 'Half and quarter', mode: 'part', max: 10, choices: 4 },
    { name: '24-hour times', mode: 'digital', max: 10, choices: 6 },
  ],
  par: (l) => ROUNDS * (l === 4 ? 20 : 10),
  seconds: (l) => (l === 5 ? 90 : 150),
  needsWords: false, needsLetters: false,
};

/** Hours asked in a round (1..max, spread out, no immediate repeats). */
export function hoursFor(max, rnd = Math.random) {
  const out = [];
  while (out.length < ROUNDS) out.push(...sample(Array.from({ length: max }, (_, i) => i + 1), max, rnd));
  return out.slice(0, ROUNDS);
}

/** Clock face: numbers 1 to 12 round the edge, hour and minute hands. onNumber makes 1-10 tappable. */
export function face(A, h, m, { onNumber = null, hands = true } = {}) {
  const el = A.h('div', { class: 'g4-clock', role: onNumber ? 'group' : 'img', 'aria-label': onNumber ? 'Clock face: tap the number the short hand points to' : `Clock showing ${h}:${String(m).padStart(2, '0')}` });
  for (let n = 1; n <= 12; n++) {
    const a = (n * 30 - 90) * Math.PI / 180;
    const style = `left:${50 + 40 * Math.cos(a)}%;top:${50 + 40 * Math.sin(a)}%`;
    el.append(onNumber && n <= 10
      ? A.h('button', { type: 'button', class: 'g4-n btn secondary', style, 'aria-label': `point to ${n}`, onclick: (e) => onNumber(n, e.currentTarget || e.target) }, String(n))
      : A.h('span', { class: 'g4-n', style, 'aria-hidden': 'true' }, String(n)));
  }
  if (hands) el.append(A.h('span', { class: 'g4-hand h', style: `transform:rotate(${hourAngle(h, m)}deg)` }), A.h('span', { class: 'g4-hand m', style: `transform:rotate(${minuteAngle(m)}deg)` }));
  return el;
}

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const top = A.h('div'), area = A.h('div'), after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'ari', 'Ma hasha\'a? What time is it?'), top, area, after,
    draftNote(A, 'Each time is the phrasebook\'s "hasha\'a" with a counting number from lesson il04, put side by side. Not yet checked by a native speaker.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  withBank(A, T, (B) => {
    const hours = hoursFor(cfg.max, rnd);
    const phrases = Array.from({ length: cfg.max }, (_, i) => hourPhrase(B, i + 1));
    const [half, quarter, ask] = pick(B, 't.half', 't.quarter', 't.whattime');
    let n = 0;
    const next = () => {
      if (n >= ROUNDS) { T.end({ won: true }); return; }
      const h = hours[n]; n += 1;
      const ph = phrases[h - 1];
      after.textContent = '';
      const count = A.h('p', { class: 'arc-prompt' }, `Time ${n} of ${ROUNDS}`);
      const pickHour = (onRight) => buttons(A, options(ph, phrases, cfg.choices, rnd, (x) => x.n), (x) => heText(A, x.he), (x) => {
        const ok = grade(A, x.n === h, { right: `Yes, ${h} o'clock.`, wrong: `That one says ${x.n}.` });
        if (ok) onRight();
        return ok;
      }, { label: 'Times' });
      if (cfg.mode === 'read') {
        top.replaceChildren(count, face(A, h, 0), cfg.legend ? A.h('p', { class: 'g4-chips' }, ...phrases.map((p) => A.h('span', { class: 'g4-chip' }, `${p.n} = `, heText(A, p.parts[1].he)))) : null);
        area.replaceChildren(pickHour(() => T.later(600, next)));
      } else if (cfg.mode === 'set') {
        top.replaceChildren(count, A.h('p', {}, heItem(A, ask), ' ', heText(A, ph.he, { cls: 'g4-he g4-big' })));
        area.replaceChildren(face(A, 0, 0, { hands: false, onNumber: (k, b) => {
          if (!b || b.disabled) return;
          const ok = grade(A, k === h, { right: `Right: the short hand on ${h}.`, wrong: `${k} is not it. Read the number word again.` });
          b.disabled = true; b.classList?.add(ok ? 'is-good' : 'is-bad');
          if (ok) { for (const x of area.querySelectorAll('button')) x.disabled = true; T.later(700, next); }
        } }));
      } else if (cfg.mode === 'part') {
        const m = rnd() < 0.5 ? 30 : 15;
        const word = m === 30 ? half : quarter;
        top.replaceChildren(count, face(A, h, m));
        area.replaceChildren(pickHour(() => {
          after.textContent = 'Now the minutes: and a ...?';
          area.replaceChildren(buttons(A, options(word, [half, quarter], 2, rnd, (x) => x.key), (x) => heItem(A, x, { en: A.level < 5 }), (x) => {
            const ok = grade(A, x === word, { right: `${h}:${m}: ${m === 30 ? 'half' : 'a quarter'} past.`, wrong: `The long hand is on ${m === 30 ? 'the 6: half' : 'the 3: a quarter'}.` });
            if (ok) { say(A, word); T.later(600, next); }
            return ok;
          }, { label: 'Minutes' }));
        }));
      } else {
        const pm = rnd() < 0.6;
        const shown = `${String(pm ? h + 12 : h).padStart(2, '0')}:00`;
        top.replaceChildren(count, A.h('p', { class: 'g4-dark g4-big', 'aria-label': `Timetable time ${shown}` }, enText(A, shown)), A.h('p', {}, 'What do people say?'));
        area.replaceChildren(pickHour(() => { after.textContent = pm ? `${shown} is ${h} in the afternoon or evening; people just say ${h}.` : ''; T.later(700, next); }));
      }
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
