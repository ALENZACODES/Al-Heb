// Tense Conveyor: verb forms ride a belt toward the end. Sort the one at the front into its chute: he did (the dictionary
// form), is doing (present), he will do (future, starts with י) or to do (starts with ל). Wait too long and it drops off.
import { mountArcade } from './arcade.js';
import { loadG3, tenseDeck, TENSES, gloss } from './g3-core.js';
import { begin, grade, roundKeys, binRow, heText } from './g3-ui.js';

export const STORE_KEY = 'games.g3-conveyor.v1';
const ROUNDS = 12;
const spec = {
  id: 'g3-conveyor', title: 'Tense Conveyor', titleHe: 'זְמַן',
  blurb: 'A Hebrew verb has a form for each job. The dictionary lists it as "he did"; the present means "is doing"; the future starts with yod ("he will do"); the infinitive starts with lamed ("to do"). Read the form at the front of the belt and send it down the right chute before it drops off the end.',
  howTo: ['The form at the front of the belt is outlined. Press its chute, or keys 1 to 4.', 'A wrong chute costs points and the form waits for another try.', 'If a form reaches the end of the belt it drops off and counts as a miss.', 'Level 5 runs the belt faster and adds harder verbs.'],
  levels: [
    { name: 'To … or he will …', keys: ['infinitive', 'future'], band: ['A1', 'A2'], patience: 9 },
    { name: 'Now or later', keys: ['present', 'future'], band: ['A1', 'A2'], patience: 8 },
    { name: 'Did, doing, will do', keys: ['past', 'present', 'future'], band: ['A1', 'A2'], patience: 7 },
    { name: 'All four chutes', keys: ['past', 'present', 'future', 'infinitive'], band: ['A1', 'A2'], patience: 6 },
    { name: 'Fast belt', keys: ['past', 'present', 'future', 'infinitive'], band: ['A1', 'A2', 'B1'], patience: 4 },
  ],
  par: () => ROUNDS * 10,
  seconds: () => 150,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'rimon', 'Read the front form, pick the chute.',
    'Forms come from the app\'s verb list. "He did" is the dictionary form; the present is the masculine singular. Not reviewed by a teacher.');
  const cfg = A.cfg, rnd = A.rnd, bins = TENSES.filter((t) => cfg.keys.includes(t.key));
  let deck = [], at = 0, waited = 0, tried = new Set();
  const belt = A.h('div', { class: 'g3-belt', 'aria-hidden': 'true' });
  const meter = A.h('div', { class: 'g3-meter', role: 'progressbar', 'aria-label': 'Time before the form drops off', 'aria-valuemin': '0', 'aria-valuemax': '100' }, A.h('span', { style: 'inline-size:100%' }));
  const row = binRow(A, bins.map((t) => ({ key: t.key, label: t.en, sub: t.hint })), (k) => sort(k), { label: 'Chutes' });
  area.replaceChildren(belt, meter, row);
  const draw = () => {
    const item = deck[at];
    belt.replaceChildren(...deck.slice(at, at + 4).map((x, i) => A.h('span', { class: 'g3-item' + (i === 0 ? ' is-next' : ''), lang: 'he' }, x.he)));
    big.replaceChildren(item ? heText(A, item.he) : '');
    prompt.textContent = item ? `Form ${at + 1} of ${deck.length}: which chute?` : '';
    for (const b of row.querySelectorAll('button')) b.disabled = tried.has(b.getAttribute('data-key'));
    waited = 0; meter.firstChild.setAttribute('style', 'inline-size:100%');
  };
  const advance = () => { at += 1; tried = new Set(); if (at >= deck.length) T.end({ won: true }); else draw(); };
  const sort = (key) => {
    const item = deck[at];
    if (!item || !T.live()) return;
    const t = TENSES.find((x) => x.key === item.tense), meaning = gloss(item.verb.en);
    if (key === item.tense) {
      grade(A, true, { right: `${item.he}: ${t.en} (${meaning}).`, points: tried.size ? 5 : 10 });
      advance();
    } else {
      tried.add(key);
      grade(A, false, { wrong: `Not that chute. Look at the first letter and the ending of ${item.he}.` });
      draw();
    }
  };
  roundKeys(A, (k) => { const i = Number(k) - 1; const b = row.querySelectorAll('button')[i]; if (b && !b.disabled) { b.click(); return true; } return false; });
  // the belt only moves in the browser (the arcade loop holds still during the countdown and while paused)
  A.loop(() => {
    if (!T.live() || !deck[at]) return;
    waited += 0.1;
    const left = Math.max(0, 1 - waited / cfg.patience);
    meter.firstChild.setAttribute('style', `inline-size:${Math.round(left * 100)}%`);
    if (left <= 0) { grade(A, false, { wrong: `${deck[at].he} dropped off: it was ${TENSES.find((x) => x.key === deck[at].tense).en}.` }); advance(); }
  }, 100);
  loadG3(A.ctx, 'verbs').then((d) => {
    if (!T.live()) return;
    deck = tenseDeck(d.verbs.filter((v) => cfg.band.includes(v.level)), ROUNDS, cfg.keys, rnd);
    draw();
  }).catch(() => A.announce('The verbs did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
