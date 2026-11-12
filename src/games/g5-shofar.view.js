// Shofar Echo: the shofar's calls drawn as rhythms (one long blast, three broken blasts, nine short notes). Watch the
// calls light up one by one, then sound them back in the same order. No audio: the rhythm is drawn, and read out in words.
// The top level uses the traditional sets of calls (tekiah, shevarim-teruah, tekiah and the two shorter ones).
import { mountG5, host, track, grade, draftNote, numberKeys, card, heText, button, lock } from './g5-ui.js';
import { loadData, loadVerse, excerpt, refText, g5Data, shuffle, callSequence, echoProgress, beatPicture, BEAT_WORD } from './g5-core.js';

export const STORE_KEY = 'games.g5-shofar.v1';

const spec = {
  id: 'g5-shofar', title: 'Shofar Echo', titleHe: 'שׁוֹפָר',
  blurb: 'On Rosh Hashanah the shofar sounds in set patterns of calls. Watch a pattern light up, then sound it back call by call, like an echo.',
  howTo: ['Watch the calls light up in order (or read them in the list).', 'Then tap the calls in the same order (or press their numbers).', 'A wrong call: watch the pattern once more and try again. A second wrong call shows the answer and moves on.', 'Tekiah is one long blast, shevarim three broken blasts, teruah nine short notes.'],
  levels: [
    { name: 'Two calls, pattern stays', allowed: ['tekiah', 'teruah'], len: 2, rounds: 5, keep: true, names: true },
    { name: 'Three calls from memory', allowed: ['tekiah', 'teruah'], len: 3, rounds: 5, keep: false, names: true },
    { name: 'Shevarim joins: rhythm only', allowed: ['tekiah', 'shevarim', 'teruah'], len: 3, rounds: 5, keep: false, names: false, beatsOnButtons: true },
    { name: 'Four calls, names only', allowed: ['tekiah', 'shevarim', 'teruah'], len: 4, rounds: 5, keep: false, names: false, beatsOnButtons: false },
    { name: 'The traditional sets', sets: true, rounds: 6, keep: false, names: false, beatsOnButtons: false },
  ],
  par: (l, cfg) => cfg.rounds * (cfg.len || 4) * 10,
  seconds: (l, cfg) => 30 + cfg.rounds * 18,
};

/** The calls for one round: random calls, or one of the traditional sets (sometimes ending with tekiah gedolah). */
export function roundCalls(d, cfg, rnd = Math.random) {
  if (!cfg.sets) return callSequence(cfg.len, cfg.allowed, rnd);
  const set = d.sets[Math.floor(rnd() * d.sets.length)];
  const calls = [...set.calls];
  if (rnd() < 0.3) calls[calls.length - 1] = 'gedolah';
  return calls;
}
const sayBeats = (c) => (c.beats[0] === 'short' ? `${c.beats.length} short notes` : c.beats.length > 1 ? `${c.beats.length} broken blasts` : BEAT_WORD[c.beats[0]]);

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd, ctx = A.ctx;
  const pattern = A.h('ol', { class: 'tg-line', 'aria-label': 'The pattern' });
  const prompt = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const pad = A.h('div', { class: 'g5-grid', role: 'group', 'aria-label': 'Shofar calls' });
  const yours = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  const verseLine = A.h('p', { class: 'muted' });
  A.board.replaceChildren(host(A, 'ari', 'Watch the calls, then sound them back.'), prompt, pattern, pad, yours, verseLine,
    draftNote(A, 'Rhythms as many Ashkenazi communities sound them; other communities differ. Call names other than teruah are not in the app\'s word list yet.'));
  numberKeys(A, () => pad);
  loadData(ctx, g5Data('shofar')).then(async (d) => {
    if (!T.live()) return;
    const byId = Object.fromEntries(d.calls.map((c) => [c.id, c]));
    const vs = await Promise.all(d.verses.map((x) => loadVerse(ctx, x.ref)));
    if (!T.live()) return;
    const pick = d.verses[Math.floor(rnd() * d.verses.length)], v = vs[d.verses.indexOf(pick)];
    verseLine.replaceChildren(heText(A, excerpt(v.he, pick.from, pick.to)), ` (${refText(pick.ref)}): ${pick.en}.`);
    const allowed = cfg.sets ? ['tekiah', 'shevarim', 'teruah', 'gedolah'] : cfg.allowed;
    let r = 0;
    const row = (c, on, showName) => A.h('li', { class: 'g5-beats' + (on ? ' is-on' : '') }, showName ? `${c.tr}: ` : '', A.h('span', { 'aria-hidden': 'true' }, beatPicture(c.beats)), A.h('span', { class: 'visually-hidden' }, sayBeats(c)));
    const round = () => {
      if (r >= cfg.rounds) { T.end({ won: true }); return; }
      r += 1;
      const seq = roundCalls(d, cfg, rnd);
      const taps = [];
      let retried = false;
      pad.replaceChildren(); yours.textContent = '';
      prompt.textContent = `Pattern ${r} of ${cfg.rounds}: watch.`;
      const show = (lit) => pattern.replaceChildren(...seq.map((id, k) => row(byId[id], k === lit, cfg.names)));
      const play = (k) => {
        if (A.quiet || k >= seq.length) { show(-1); T.later(A.quiet ? 300 : 500, answer); return; }
        show(k); T.later(750, () => play(k + 1));
      };
      const answer = () => {
        if (!cfg.keep) pattern.replaceChildren(...seq.map(() => A.h('li', { class: 'g5-beats' }, '?')));
        prompt.textContent = `Pattern ${r} of ${cfg.rounds}: your turn. ${seq.length} calls.`;
        pad.replaceChildren(...shuffle(allowed, rnd).map((id) => button(A, card(A, byId[id].he, byId[id].tr, cfg.beatsOnButtons ? beatPicture(byId[id].beats) : null), () => {
          taps.push(id);
          const ok = echoProgress(seq, taps) === taps.length;
          yours.textContent = `You: ${taps.map((x) => byId[x].tr).join(', ')}`;
          if (!ok) {
            lock(pad);
            if (!retried) {
              retried = true; taps.length = 0;
              grade(A, false, { wrong: 'Not that one. Watch the pattern once more and try again.' });
              yours.textContent = ''; prompt.textContent = `Pattern ${r} of ${cfg.rounds}: watch again.`;
              T.later(900, () => play(0)); return;
            }
            grade(A, false, { wrong: `Not that one. The pattern was ${seq.map((x) => byId[x].tr).join(', ')}.` });
            pattern.replaceChildren(...seq.map((id2) => row(byId[id2], false, true)));
            T.later(1600, round); return;
          }
          A.addScore(5); A.sfx('click');
          if (taps.length === seq.length) {
            grade(A, true, { right: `Echoed: ${seq.map((x) => byId[x].tr).join(', ')}.`, points: seq.length * 5 });
            pattern.replaceChildren(...seq.map((id2) => row(byId[id2], false, true)));
            lock(pad); T.later(1000, round);
          }
        })));
      };
      T.later(Math.max(0, A.readyAt - Date.now()), () => play(0));
    };
    round();
  }).catch(() => A.announce('The calls did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
