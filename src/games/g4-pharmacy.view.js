// Pill Box: the pharmacist hands over medicine with a Hebrew label: what it is for, how many times a day, before or
// after a meal. Give the right box to the customer, then fill the weekly organiser's morning, noon and evening slots
// to match. Label words come from the app's pharmacy lesson. A game, not medical advice.
import { mountArcade } from './arcade.js';
import { pick, sample, options, stripPoints } from './g4-core.js';
import { begin, withBank, host, heItem, heText, say, grade, draftNote, buttons, numberKeys } from './g4-ui.js';

export const STORE_KEY = 'games.g4-pharmacy.v1';
export const COMPLAINTS = Object.freeze([
  { key: 'ph.headache', en: 'My head has been pounding since this morning.' },
  { key: 'ph.throat', en: 'It hurts when I swallow.' },
  { key: 'ph.stomach', en: 'My stomach has hurt since dinner.' },
  { key: 'ph.fever', en: 'I feel hot and shivery; I think I have a temperature.' },
]);
export const TIMES = Object.freeze(['t.morning', 't.noon', 't.evening']);
export const WHEN = Object.freeze(['ph.before', 'ph.after']);
/** A label: complaint, once or twice a day, before or after the meal. */
export const makeLabel = (rnd = Math.random) => ({ for: COMPLAINTS[Math.floor(rnd() * COMPLAINTS.length)].key, times: rnd() < 0.5 ? 1 : 2, when: WHEN[Math.floor(rnd() * 2)] });
/** Is tapping slot (row when, column time) right, given what is already in? Twice a day means morning and evening. */
export function slotOk(label, filled, when, time, checkWhen) {
  if (checkWhen && when !== label.when) return false;
  if (filled.some((f) => f.time === time)) return false;
  if (filled.length >= label.times) return false;
  return label.times === 1 || time !== 't.noon';
}

const spec = {
  id: 'g4-pharmacy', title: 'Pill Box', titleHe: 'תְּרוּפָה',
  blurb: 'Israeli pharmacy labels say what the medicine is against (neged), how often (pa\'am beyom, once a day; pa\'amayim beyom, twice a day) and when (lifnei, before, or acharei, after the meal). Match the box to the customer and fill the organiser. A game, not medical advice.',
  howTo: ['Read what the customer says, then give them the box whose label fits (keys 1 to 4).', 'From level 2, fill the organiser: tap as many slots as the label says. Twice a day means morning and evening.', 'From level 3 the row matters too: before or after the meal.', 'Level 4 brings two medicines per customer; level 5 prints labels without vowels.'],
  levels: [
    { name: 'Which box?', fill: false, meds: 1, en: true },
    { name: 'How often', fill: true, meds: 1 },
    { name: 'Before or after the meal', fill: true, when: true, meds: 1 },
    { name: 'Two medicines', fill: true, when: true, meds: 2 },
    { name: 'Bare labels', fill: true, when: true, meds: 2, plain: true },
  ],
  par: (l) => 5 * spec.levels[l - 1].meds * (spec.levels[l - 1].fill ? 25 : 10),
  seconds: (l) => (l >= 4 ? 240 : 180),
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const scene = A.h('div', { class: 'g4-scene' }), area = A.h('div');
  A.board.replaceChildren(host(A, 'ari', 'Excuse me, I need something for this...'), scene, area, draftNote(A, 'Label words from the app\'s pharmacy lesson and phrasebook. Not yet checked by a native speaker. A game, not medical advice.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  withBank(A, T, (B) => {
    pick(B, COMPLAINTS.map((c) => c.key), TIMES, WHEN, 'ph.against', 'ph.once', 'ph.twice', 'f.meal', 'ph.medicine');
    const w = (k) => heText(A, cfg.plain ? stripPoints(B.get(k).he) : B.get(k).he);
    const labelEl = (lb, { full = true } = {}) => A.h('span', { class: 'g4-item' }, A.h('span', {}, w('ph.against'), ' ', w(lb.for)),
      full ? A.h('span', {}, w(lb.times === 1 ? 'ph.once' : 'ph.twice'), ' · ', w(lb.when), ' ', w('f.meal')) : null);
    let n = 0, meds = [], m = 0;
    const fill = (lb) => {
      const filled = [];
      const grid = A.h('div', { class: 'g4-pillbox arc-choices', role: 'group', 'aria-label': 'Pill organiser' });
      const draw = () => grid.replaceChildren(A.h('span'), ...TIMES.map((t) => A.h('strong', {}, w(t))),
        ...WHEN.flatMap((wh) => [A.h('span', {}, w(wh), ' ', w('f.meal')), ...TIMES.map((t) => {
          const on = filled.some((f) => f.time === t && f.when === wh);
          return A.h('button', { type: 'button', class: 'g4-slot' + (on ? ' on' : ''), disabled: on || undefined, 'aria-label': `${B.get(t).en}, ${B.get(wh).en} the meal${on ? ', filled' : ''}`, onclick: () => tap(wh, t) }, on ? '💊' : '');
        })]));
      const tap = (wh, t) => {
        const ok = slotOk(lb, filled, wh, t, !!cfg.when);
        const why = cfg.when && wh !== lb.when ? `The label says ${B.get(lb.when).en} the meal.` : lb.times === 2 && t === 't.noon' ? 'Twice a day: morning and evening.' : 'Not that slot.';
        if (!grade(A, ok, { right: '', wrong: why, points: 5 })) return;
        filled.push({ when: cfg.when ? wh : lb.when, time: t }); draw();
        if (filled.length >= lb.times) { A.announce('Organiser filled.'); T.later(700, nextMed); }
      };
      area.replaceChildren(A.h('p', {}, 'Label: ', labelEl(lb)), A.h('p', { class: 'muted' }, cfg.when ? 'Fill the slots the label asks for.' : 'Fill as many slots as the label says (either row).'), grid);
      draw();
    };
    const nextMed = () => {
      if (m >= meds.length) { T.later(300, next); return; }
      const lb = meds[m]; m += 1;
      const said = COMPLAINTS.find((c) => c.key === lb.for);
      scene.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Customer ${n} of 5${meds.length > 1 ? ` · medicine ${m} of ${meds.length}` : ''}`), A.h('p', {}, `"${said.en}"`));
      const boxes = options(lb, COMPLAINTS.map((c) => ({ ...lb, for: c.key })), 4, rnd, (x) => x.for);
      area.replaceChildren(A.h('p', {}, 'Which box? ', heItem(A, B.get('ph.medicine'), { en: true })), buttons(A, boxes, (x) => labelEl(x, { full: false }), (x) => {
        const ok = grade(A, x.for === lb.for, { right: `Yes: against ${B.get(lb.for).en}.`, wrong: `That one is against ${B.get(x.for).en}.` });
        if (ok) { say(A, B.get(lb.for)); T.later(600, () => (cfg.fill ? fill(lb) : nextMed())); }
        return ok;
      }, { label: 'Medicine boxes' }));
    };
    const next = () => {
      if (n >= 5) { T.end({ won: true }); return; }
      n += 1; m = 0;
      meds = sample(COMPLAINTS, cfg.meds, rnd).map((c) => ({ ...makeLabel(rnd), for: c.key }));
      nextMed();
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
