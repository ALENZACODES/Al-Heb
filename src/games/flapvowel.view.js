// Flap the Vowel: Rimon flies through gates. Each gate is split into lanes, one per vowel mark; a sound is
// called ("bo") and Rimon must pass through the lane whose mark makes it. Tap to flap up; gravity does the rest.
import { mountArcade, randInt } from './arcade.js';
import { CONSONANTS, VOWEL_SOUNDS, syllable } from './syllables.js';
import { pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.flapvowel.v1';

const spec = {
  id: 'flapvowel', title: 'Flap the Vowel', titleHe: 'עוּף!',
  blurb: 'Rimon flies toward a gate with three or four openings, each marked with a vowel. A sound is called. Flap so Rimon passes through the opening whose mark makes that sound.',
  howTo: ['Tap the board, press space or press up to flap. Rimon drifts down between flaps.', 'Read the sound called at the top (for example "bo").', 'Fly through the opening whose vowel mark gives that sound.', 'Ten gates finish the level; a wrong opening costs a life.'],
  levels: [
    { name: '3 openings, slow', lanes: 3, gates: 8, speed: 90, sounds: ['a', 'i', 'o'] },
    { name: '3 openings', lanes: 3, gates: 10, speed: 78, sounds: ['a', 'e', 'o'] },
    { name: '4 openings', lanes: 4, gates: 10, speed: 68, sounds: ['a', 'e', 'i', 'o'] },
    { name: '5 openings', lanes: 5, gates: 12, speed: 60, sounds: ['a', 'e', 'i', 'o', 'u'] },
    { name: '5 openings, fast', lanes: 5, gates: 14, speed: 52, sounds: ['a', 'e', 'i', 'o', 'u'] },
  ],
  par: (l, cfg) => cfg.gates * 10,
  seconds: (l, cfg) => 90,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const marks = VOWEL_SOUNDS.filter((v) => cfg.sounds.includes(v.tr));
  const H = 300, W = 320;
  let y = H / 2, vy = 0, gateX = W, passed = 0, target = null, order = [];
  const call = A.h('p', { class: 'arc-prompt' });
  const sky = A.h('button', { type: 'button', class: 'arc-lane', 'aria-label': 'Flap', style: `height:${H}px;width:100%;max-width:${W}px;display:block;margin:0 auto;padding:0`, onclick: () => flap() });
  const bird = A.h('div', { class: 'arc-faller', style: 'left:12px;right:auto;width:44px;top:0', 'aria-hidden': 'true' }, A.cast('rimon-fly', '', 'arc-sprite-inline'), '🔴');
  const gate = A.h('div', { style: 'position:absolute;top:0;bottom:0;width:48px', 'aria-hidden': 'true' });
  sky.append(bird, gate);
  A.board.replaceChildren(call, sky);
  A.setLives(3);
  const newGate = () => {
    const c = CONSONANTS[randInt(rnd, CONSONANTS.length)];
    const v = marks[randInt(rnd, marks.length)];
    target = syllable(c, v);
    order = pickSeeded(marks, cfg.lanes, rnd);
    gateX = W;
    gate.replaceChildren(...order.map((m) => A.h('div', { class: 'arc-cell', style: `width:48px;height:${H / cfg.lanes - 4}px;margin:2px 0;font-size:1.4rem`, lang: 'he', dir: 'rtl' }, c.he + m.mark)));
    call.textContent = `Fly through "${target.tr}" (${c.name} with ${v.name}). Gate ${passed + 1} of ${cfg.gates}.`;
  };
  const flap = () => { vy = -7.5; if (A.quiet) step(6); };
  const draw = () => { bird.style.top = `${Math.round(y)}px`; gate.style.left = `${Math.round(gateX)}px`; };
  const step = (times = 1) => {
    for (let i = 0; i < times; i++) {
      vy += 0.55; y = Math.max(0, Math.min(H - 44, y + vy)); if (y === 0 || y === H - 44) vy = 0;
      gateX -= 4;
      if (gateX <= 12 && gateX > 8) {
        const lane = Math.min(cfg.lanes - 1, Math.floor((y + 22) / (H / cfg.lanes)));
        const m = order[lane];
        if (m && m.tr === target.vowel.tr) { passed++; A.addScore(10); A.sfx('whoosh'); A.announce(`${target.tr}!`); if (passed >= cfg.gates) { draw(); A.finish({ won: true }); return; } }
        else { A.sfx('miss'); A.announce(`That opening said "${target.consonant.tr}${m?.tr || ''}". You needed "${target.tr}".`); if (A.miss()) { draw(); return; } }
        newGate();
      }
    }
    draw();
  };
  A.keys((k) => { if (k === 'space' || k === 'up') { flap(); return true; } return false; });
  newGate(); draw();
  if (!A.quiet) A.loop(() => step(1), cfg.speed);
  else A.announce('Calm mode: each flap also moves the gate closer.');
}

export const mount = mountArcade(spec, setup);
