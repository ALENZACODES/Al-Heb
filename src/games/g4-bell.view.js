// Ring the Bell: the bus screen shows "the next stop" and a place name. Ring when the next stop is yours: not too
// early, not too late. From level 3, tell the driver you are getting off, in the form for the rider (Ari or Noa).
import { mountArcade } from './arcade.js';
import { pick, sample, options, stripPoints } from './g4-core.js';
import { begin, withBank, host, heItem, heText, say, grade, draftNote, roundKeys, buttons, ticker, numberKeys } from './g4-ui.js';

export const STORE_KEY = 'games.g4-bell.v1';
const RIDES = 5;
export const STOPS = Object.freeze(['s.market', 's.hospital', 's.beach', 's.hotel', 's.bank', 's.post', 's.pharmacy', 's.restaurant', 's.bakery', 's.mall', 's.university', 's.police', 's.bridge']);

/** A ride: stops in order and the one you want (never the first, so there is always a stop to watch go by). */
export function makeRide(len, rnd = Math.random) {
  const stops = sample(STOPS, len, rnd);
  return { stops, target: 1 + Math.floor(rnd() * (len - 1)) };
}
/** What ringing does when `next` is the stop the screen announces: right, early (yours is later), or late. */
export const ringResult = (ride, next) => (next === ride.target ? 'right' : next < ride.target ? 'early' : 'late');

const spec = {
  id: 'g4-bell', title: 'Ring the Bell', titleHe: 'הַתַּחֲנָה הַבָּאָה',
  blurb: 'Israeli buses show the next stop on a screen above the driver. Press the bell while your stop is the next one. Ring too early and you get off in the wrong place; too late and the bus drives on.',
  howTo: ['Read where you are going, then watch the screen.', 'Press Ring (or the space bar) when the screen shows your stop as the next stop.', 'From level 3 say you are getting off: yored for a man, yoredet for a woman.', 'Levels 4 and 5 give your stop in Hebrew only; level 5 has no vowel points.'],
  levels: [
    { name: 'Slow bus, English stop', len: 5, ms: 2600, en: true },
    { name: 'Longer ride', len: 7, ms: 2200, en: true },
    { name: 'Getting off', len: 7, ms: 2000, en: true, off: true },
    { name: 'Hebrew only', len: 8, ms: 1700, off: true },
    { name: 'Express, no vowels', len: 9, ms: 1400, off: true, plain: true },
  ],
  par: (l) => RIDES * (l >= 3 ? 20 : 10),
  seconds: (l) => 40 + RIDES * Math.ceil((spec.levels[l - 1].len * spec.levels[l - 1].ms) / 1000),
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const task = A.h('div', { class: 'g4-scene' }), screen = A.h('div', { class: 'g4-dark', role: 'status', 'aria-live': 'polite' });
  const area = A.h('div'), line = A.h('ol', { class: 'g4-route', 'aria-label': 'Stops passed' });
  A.board.replaceChildren(host(A, 'rimon', 'Watch the screen. Ring for your stop!'), task, screen, line, area, draftNote(A, 'Place words from the app\'s lessons and word list. Not yet checked by a native speaker.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  withBank(A, T, (B) => {
    pick(B, STOPS, 'b.next', 'b.offM', 'b.offF');
    const show = (k) => heText(A, cfg.plain ? stripPoints(B.get(k).he) : B.get(k).he, { cls: 'g4-he g4-big' });
    let r = 0, ride = null, next = 0, rider = 'ari', done = false;
    const ringBtn = A.h('button', { type: 'button', class: 'btn', onclick: () => ring() }, '🔔 Ring');
    roundKeys(A, (k) => { if (k === 'space' && ringBtn.isConnected !== false && !ringBtn.disabled) { ringBtn.click(); return true; } return false; });
    const endRide = (delay = 900) => { done = true; ringBtn.disabled = true; T.later(delay, start); };
    const off = () => {
      const want = rider === 'ari' ? 'b.offM' : 'b.offF';
      area.replaceChildren(A.h('p', {}, `Tell the driver you are getting off (you are ${rider === 'ari' ? 'Ari' : 'Noa'}):`),
        buttons(A, options(want, ['b.offM', 'b.offF'], 2, rnd), (k) => heItem(A, B.get(k), { en: !!cfg.en }), (k) => {
          const ok = grade(A, k === want, { right: `Yes: ${B.get(want).en}.`, wrong: `That is the form for ${k === 'b.offM' ? 'a man' : 'a woman'}.` });
          if (ok) { say(A, B.get(want)); endRide(700); }
          return ok;
        }, { label: 'Getting off' }));
    };
    function ring() {
      if (done || !ride) return;
      const res = ringResult(ride, next);
      if (res === 'right') {
        grade(A, true, { right: 'Ding! The bus stops at your stop.' });
        say(A, B.get(ride.stops[ride.target]));
        if (cfg.off) { done = true; ringBtn.disabled = true; off(); } else endRide();
      } else grade(A, false, { wrong: res === 'early' ? 'Too early: that is not your stop yet.' : 'That stop is past yours.' });
    }
    const announce = () => {
      screen.replaceChildren(heText(A, cfg.plain ? stripPoints(B.get('b.next').he) : B.get('b.next').he), ': ', show(ride.stops[next]), cfg.en ? A.h('small', { class: 'g4-en', lang: 'en' }, ` (next stop: ${B.get(ride.stops[next]).en})`) : null);
    };
    function start() {
      if (r >= RIDES) { T.end({ won: true }); return; }
      r += 1; done = false; next = 0; rider = r % 2 ? 'ari' : 'noa';
      ride = makeRide(cfg.len, rnd);
      const goal = B.get(ride.stops[ride.target]);
      task.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Ride ${r} of ${RIDES}. You are ${rider === 'ari' ? 'Ari' : 'Noa'}, going to:`),
        A.h('p', {}, cfg.en ? A.h('strong', {}, goal.en) : show(ride.stops[ride.target])));
      line.replaceChildren(); ringBtn.disabled = true; area.replaceChildren(ringBtn);
      const arm = () => { if (A.paused || Date.now() < A.readyAt) T.later(120, arm); else if (!done) ringBtn.disabled = false; }; // nothing to ring during the get-ready count
      arm();
      announce();
      const thisRide = ride;
      ticker(A, T, cfg.ms, () => {
        if (done || ride !== thisRide) return false;
        if (next === ride.target) { grade(A, false, { wrong: 'You rode past your stop. Ring while it is the next stop.' }); endRide(); return false; }
        line.append(A.h('li', {}, heText(A, cfg.plain ? stripPoints(B.get(ride.stops[next]).he) : B.get(ride.stops[next]).he)));
        next += 1;
        if (next >= ride.stops.length) { endRide(); return false; }
        announce();
        return true;
      });
    }
    start();
  });
}

export const mount = mountArcade(spec, setup);
