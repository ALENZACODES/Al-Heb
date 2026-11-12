// Who Do You Call? Something goes wrong: a stolen bag, a lost passport, a broken lock, a fever. Pick who helps,
// then (from level 4) the Hebrew words to ask with. Help and service words come from the app's lessons and phrasebook.
// A game, not advice: in a real emergency in Israel, call the emergency numbers.
import { mountArcade } from './arcade.js';
import { pick, sample, options, stripPoints } from './g4-core.js';
import { begin, withBank, host, heItem, heText, say, grade, draftNote, buttons, numberKeys } from './g4-ui.js';

export const STORE_KEY = 'games.g4-emergency.v1';
export const SERVICES = Object.freeze(['e.police', 'e.ambulance', 's.pharmacy', 'ph.doctor', 'e.electrician', 'e.landlord']);
/** Services that overlap (any of them could be right for some cases), so they never compete in one question. */
export const CLASH = Object.freeze([['e.ambulance', 's.pharmacy', 'ph.doctor'], ['e.electrician', 'e.landlord']]);
export const CASES = Object.freeze([
  { en: 'A thief grabs your bag in the street.', key: 'e.thief', who: 'e.police', say: 'e.callpolice' },
  { en: 'Someone collapses on the bus.', key: 'e.emergency', who: 'e.ambulance', say: 'e.callamb' },
  { en: 'A headache that will not go away.', key: 'ph.headache', who: 's.pharmacy', say: 'ph.hasheadache' },
  { en: 'Your passport is gone.', key: 'e.lostpassport', who: 'e.police', say: 'e.lostpassport' },
  { en: 'You left your phone in a taxi.', key: 'e.lostphone', who: 'e.police', say: 'e.lostphone' },
  { en: 'The power is out in your flat, nowhere else.', key: 'e.electric', who: 'e.electrician', say: 'e.urgent' },
  { en: 'The front door lock of your rented flat breaks.', key: 'e.lock', who: 'e.landlord', say: 'e.broken' },
  { en: 'High fever for two days.', key: 'ph.fever', who: 'ph.doctor', say: 'e.needdoctor' },
  { en: 'A sore throat; you want something from the counter.', key: 'ph.throat', who: 's.pharmacy', say: 'ph.notwell' },
  { en: 'A car hits a cyclist in front of you.', key: 'e.urgent', who: 'e.ambulance', say: 'e.callamb' },
  { en: 'The fridge in your rented flat stops working.', key: 'e.fridge', who: 'e.landlord', say: 'e.broken' },
  { en: 'You feel ill and need to be seen today.', key: 'ph.notwell', who: 'ph.doctor', say: 'e.needdoctor' },
]);
const SAYINGS = [...new Set(CASES.map((c) => c.say))];
/** Sayings that could each fit the same case; and catch-all ones never offered as wrong. */
export const SAY_CLASH = Object.freeze([['ph.hasheadache', 'ph.notwell', 'e.needdoctor', 'e.callamb'], ['e.lostpassport', 'e.lostphone', 'e.callpolice']]);
const GENERIC = ['e.help', 'e.urgent'];
export const sayRivals = (c) => { const g = new Set(SAY_CLASH.filter((x) => x.includes(c.say)).flat()); return SAYINGS.filter((k) => k !== c.say && !g.has(k) && !GENERIC.includes(k)); };
/** Wrong services for a case: none from its own overlap group. */
export const rivalsOf = (c) => { const g = new Set(CLASH.filter((x) => x.includes(c.who)).flat()); return SERVICES.filter((s) => s !== c.who && !g.has(s)); };

const spec = {
  id: 'g4-emergency', title: 'Who Do You Call?', titleHe: 'עֶזְרָה!',
  blurb: 'When something goes wrong far from home, knowing who to ask, and the few words to ask with, is half the battle. Police for theft and lost papers, the pharmacy for small aches, the landlord for what breaks in a rented flat. This is a game, not advice: in a real emergency call the emergency numbers.',
  howTo: ['Read what happened, then choose who helps (keys 1 to 4).', 'Levels 1 and 2 give the situation in English; from level 3 only its Hebrew key word.', 'Levels 4 and 5 add a second step: choose what to say.', 'Level 5 prints everything without vowel points.'],
  levels: [
    { name: 'Who helps? With English', step2: false, en: true, sitEn: true },
    { name: 'Who helps? Hebrew names', step2: false, sitEn: true },
    { name: 'From the key word', step2: false },
    { name: 'And what to say', step2: true },
    { name: 'Bare text, both steps', step2: true, plain: true },
  ],
  par: (l) => 8 * (spec.levels[l - 1].step2 ? 20 : 10),
  seconds: (l) => (l >= 4 ? 200 : 140),
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const scene = A.h('div', { class: 'g4-scene' }), area = A.h('div');
  A.board.replaceChildren(host(A, 'noa', 'Stay calm. Who can help?'), scene, area, draftNote(A, 'Words from the app\'s lessons and phrasebook. Not yet checked by a native speaker. A game, not advice.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  withBank(A, T, (B) => {
    pick(B, SERVICES, CASES.map((c) => c.key), SAYINGS);
    const word = (k, o = {}) => (cfg.plain ? heText(A, stripPoints(B.get(k).he)) : heItem(A, B.get(k), o));
    const deck = sample(CASES, 8, rnd);
    let n = 0;
    const next = () => {
      if (n >= deck.length) { T.end({ won: true }); return; }
      const c = deck[n]; n += 1;
      scene.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Case ${n} of ${deck.length}`), cfg.sitEn ? A.h('p', {}, A.h('strong', {}, c.en)) : null, A.h('p', {}, 'Key word: ', word(c.key)));
      area.replaceChildren(A.h('p', {}, 'Who helps?'), buttons(A, options(c.who, rivalsOf(c), 4, rnd), (k) => word(k, { en: !!cfg.en }), (k) => {
        const ok = grade(A, k === c.who, { right: `Yes: ${B.get(c.who).en}.`, wrong: `Not the ${B.get(k).en} for this.` });
        if (ok) T.later(600, cfg.step2 ? () => saying(c) : next);
        return ok;
      }, { label: 'Who helps' }));
    };
    const saying = (c) => {
      area.replaceChildren(A.h('p', {}, 'What do you say?'), buttons(A, options(c.say, sayRivals(c), 4, rnd), (k) => word(k), (k) => {
        const ok = grade(A, k === c.say, { right: `"${B.get(c.say).en}"`, wrong: `That says "${B.get(k).en}".` });
        if (ok) { say(A, B.get(c.say)); T.later(800, next); }
        return ok;
      }, { label: 'What to say' }));
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
