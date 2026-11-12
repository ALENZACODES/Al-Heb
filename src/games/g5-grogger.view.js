// Grogger: words of the Purim story go past, one at a time, the way the Megillah is read aloud. Shake the grogger
// (the noisemaker) every time Haman's name comes up, and keep it still for every other word. Later levels go faster
// and bring in words that look like his name. The Book of Esther itself is not in the app's data yet, so this is a
// word stream, not the Megillah text.
import { mountG5, host, track, draftNote, roundKeys, heText, button } from './g5-ui.js';
import { loadData, g5Data, deal } from './g5-core.js';

export const STORE_KEY = 'games.g5-grogger.v1';

const spec = {
  id: 'g5-grogger', title: 'Grogger', titleHe: 'רַעֲשָׁן',
  blurb: 'When the Megillah is read on Purim, the room drowns out Haman\'s name with noisemakers. Watch the words go by and shake the grogger only when you see his name.',
  howTo: ['Words appear one at a time.', 'Press Shake (or Space) when you see Haman\'s name, הָמָן.', 'Shaking at any other word costs a few points; letting Haman pass costs a few too.', 'Higher levels go faster and add words that look like his name.'],
  levels: [
    { name: 'A slow reading, with English', n: 14, ms: 1700, share: 0.3, english: true, alike: false },
    { name: 'A little faster', n: 16, ms: 1400, share: 0.3, english: false, alike: false },
    { name: 'Look-alike words', n: 18, ms: 1250, share: 0.3, english: false, alike: true },
    { name: 'Fast, with look-alikes', n: 20, ms: 1000, share: 0.25, english: false, alike: true },
    { name: 'Megillah speed', n: 24, ms: 820, share: 0.25, english: false, alike: true },
  ],
  par: (l, cfg) => Math.round(cfg.n * cfg.share) * 10,
  seconds: (l, cfg) => Math.ceil((cfg.n * cfg.ms) / 1000) + 20,
};

/** The stream for one round: Haman cards marked target, other words (and look-alikes when asked) not. */
export function stream(d, cfg, rnd = Math.random) {
  const others = cfg.alike ? [...d.stream, ...d.lookalikes, ...d.lookalikes] : d.stream;
  return deal([d.haman], others, cfg.n, cfg.share, rnd);
}

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const word = A.h('div', { class: 'g5-big', 'aria-live': 'assertive' });
  const sub = A.h('p', { class: 'muted' });
  const meter = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const shake = button(A, 'Shake the grogger', () => hit(), 'btn arc-choice');
  A.board.replaceChildren(host(A, 'rimon', 'Ready with the grogger? Only for Haman!'), word, sub, A.h('div', { class: 'g5-row' }, shake), meter,
    draftNote(A, 'Words from the app\'s Purim page and Purim word pack. Haman\'s name is copied from the page\'s word for hamantasch, אֹזֶן הָמָן.'));
  roundKeys(A, (k) => { if (k === 'space') { hit(); return true; } return false; });
  let cards = [], i = -1, pressed = false, hits = 0, haman = 0;
  function hit() {
    if (!T.live() || i < 0 || i >= cards.length) return;
    const c = cards[i];
    if (pressed) return;
    pressed = true;
    if (c.target) { hits += 1; A.addScore(10); A.sfx('pop'); A.announce('Got him! The room drowns out the name.'); }
    else { A.addScore(-3); A.sfx('miss'); A.miss(); A.announce(`Shh: that was ${c.tr || c.en}, not Haman.`); }
    meter.textContent = `Haman drowned out ${hits} of ${haman} times so far.`;
  }
  const next = () => {
    if (A.paused) { T.later(250, next); return; }
    if (i >= 0 && cards[i]?.target && !pressed) { A.addScore(-3); A.miss(); A.announce('Haman slipped past without a sound.'); }
    i += 1; pressed = false;
    if (i >= cards.length) { meter.textContent = `Haman drowned out ${hits} of ${haman} times.`; T.end({ won: true }); return; }
    const c = cards[i];
    if (c.target) haman += 1;
    word.replaceChildren(heText(A, c.he, 'he'));
    sub.textContent = cfg.english ? c.en : `Word ${i + 1} of ${cards.length}`;
    T.later(cfg.ms, next);
  };
  loadData(A.ctx, g5Data('purim')).then((d) => {
    if (!T.live()) return;
    cards = stream(d, cfg, rnd);
    // the first word waits for the get-ready count, so nothing passes unseen
    T.later(Math.max(0, A.readyAt - Date.now()), next);
  }).catch(() => A.announce('The words did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
