// Sound Dash: a race against Ari. A sound is called ("sh", "m", "tz"); tap the letter that makes it. Every right answer
// moves you one step toward the finish while Ari jogs along at a steady pace. Letters that share a sound never appear
// on the same board. The letter table is the app's own (src/games/syllables.js), so each card reads one way.
import { mountArcade } from './arcade.js';
import { SOUND_CARDS, soundOptions, shuffle, PT } from './g1-core.js';
import { host, track, draftNote, ensureStyle, he, numberKeys, choiceButtons, loadSyllables, saySyllable } from './g1-ui.js';

export const STORE_KEY = 'games.g1-sounddash.v1';
const FINISH = 10;

const spec = {
  id: 'g1-sounddash', title: 'Sound Dash', titleHe: 'מָהִיר',
  blurb: 'Race Ari to the finish line. A sound is called; tap the letter that makes it. Each right answer is one step for you. Ari runs at a steady pace, faster on each level. In calm mode Ari waits for you.',
  howTo: ['Read the sound at the top (with sound on, you also hear it said as a syllable).', 'Tap its letter, or press its number key.', 'Ten right answers reach the finish. A wrong letter costs a point.', 'Letters with a dot (בּ כּ פּ) are the b, k and p sounds.'],
  levels: [
    { name: 'Four letters, easy jog', choices: 4, ariMs: 5200 },
    { name: 'Five letters', choices: 5, ariMs: 4400 },
    { name: 'Six letters', choices: 6, ariMs: 3800 },
    { name: 'Six letters, quick Ari', choices: 6, ariMs: 3000 },
    { name: 'Eight letters, sprint', choices: 8, ariMs: 2500 },
  ],
  par: () => FINISH * 10,
  seconds: (l, cfg) => Math.round((cfg.ariMs * FINISH) / 1000) + 30,
  needsWords: false, needsLetters: false,
};

/** Who is ahead, in words. */
export const raceLine = (you, ari) => `You ${you} of ${FINISH} · Ari ${ari} of ${FINISH}${you > ari ? ' · you lead' : you < ari ? ' · Ari leads' : ' · level'}`;

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  let you = 0, ari = 0, syllables = [];
  const bar = (n) => A.h('div', { class: 'arc-bar', role: 'img', 'aria-label': `${n} of ${FINISH}` }, A.h('span', { style: `width:${(n / FINISH) * 100}%` }));
  const lanes = A.h('div', { class: 'g1-track' });
  const line = A.h('p', { class: 'muted' });
  const prompt = A.h('p', { class: 'arc-prompt' });
  const area = A.h('div', {});
  const drawRace = () => {
    lanes.replaceChildren(A.h('div', { class: 'g1-lane' }, A.cast('rimon-fly', 'Rimon (you)', 'arc-sprite-inline'), A.h('strong', {}, 'You'), bar(you)),
      A.h('div', { class: 'g1-lane' }, A.cast('ari-side', 'Ari', 'arc-sprite-inline'), A.h('strong', {}, 'Ari'), bar(ari)));
    line.textContent = raceLine(you, ari);
  };
  A.board.replaceChildren(host(A, 'ari-caller', 'Ready, steady… listen!'), lanes, line, prompt, area,
    draftNote(A, 'Israeli sounds. Tet and tav both say t, and kaf with a dot and qof both say k, so they never race on the same board.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  drawRace();
  if (!A.untimed) A.loop(() => { if (!T.live()) return; ari += 1; drawRace(); if (ari >= FINISH) { A.announce('Ari crossed the line first. Try again, you were close!'); T.end({ won: false }); } }, cfg.ariMs);
  const deck = shuffle(SOUND_CARDS, rnd);
  let k = 0;
  const next = () => {
    if (!T.live()) return;
    if (you >= FINISH) { A.addScore(ari < FINISH ? 20 : 0); A.announce(`You crossed the line first, ${you} to ${ari}!`); T.end({ won: true }); return; }
    const answer = deck[k++ % deck.length];
    prompt.replaceChildren(`Which letter says “${answer.tr}”?`);
    saySyllable(A, syllables, answer.he + PT.PATACH);
    area.replaceChildren(choiceButtons(A, soundOptions(answer, SOUND_CARDS, cfg.choices, rnd), {
      render: (c) => he(A, c.he, 'he g1-glyph'), label: 'Letters',
      isRight: (c) => c.tr === answer.tr,
      say: (c, ok) => (ok ? `${answer.name}: “${answer.tr}”. One step.` : `${c.name} says “${c.tr}”.`),
      onRight: () => { you += 1; drawRace(); T.later(350, next); },
    }));
  };
  loadSyllables(A.ctx).then((s) => { syllables = s; }).catch(() => {}).finally(() => { if (T.live()) next(); });
}

export const mount = mountArcade(spec, setup);
