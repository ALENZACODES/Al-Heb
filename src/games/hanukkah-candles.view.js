// Candle Blow-Out: put the candles in the hanukkiah and light them in the right order, then end the round by blowing out
// the game candles. Order (src/games/hanukkah-candles.js): candles go in right to left; the shamash is lit first, then the
// candles left to right, newest first. The blessings are shown as text only, with the divine Name written ה׳; nothing
// here voices them. The blow-out listens to the microphone only after the learner presses the button, only for loudness,
// and nothing is recorded, kept or sent; a tap does the same job.
import { h } from '../shell/ui.js';
import { createLighting, VISUAL_ORDER, SHAMASH, HOLDERS } from './hanukkah-candles.js';
import { createPage, pageResults, loadHanukkah, byKey, wordLine, fx, sayWord } from './hanukkah-shell.js';

export const STORE_KEY = 'games.hanukkah-candles.v1';
const ID = 'hanukkah-candles';
const ORDINAL = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

/** Loudness (root mean square, 0 to 1) of a block of time-domain bytes centred on 128. Exported for tests. */
export function rms(bytes) {
  if (!bytes?.length) return 0;
  let sum = 0;
  for (const b of bytes) { const v = (b - 128) / 128; sum += v * v; }
  return Math.sqrt(sum / bytes.length);
}

export async function mount(root, ctx) {
  const P = createPage(root, ctx, {
    id: ID, title: 'Candle Blow-Out', titleHe: 'חֲנֻכִּיָּה',
    cast: 'Noa holds the shamash; Ari reads the blessings; Rimon keeps count.',
    blurb: 'Pick a night of Hanukkah. Put the candles in the hanukkiah, light them in the right order, read the blessings, then blow out the game candles to finish.',
    howTo: [
      'Candles go in from the right: night one uses the right-most holder, and each night adds one to its left.',
      'Light the shamash (the helper candle in the middle) first.',
      'Then light from left to right: tonight’s new candle, the left-most one, comes first.',
      'The blessings are shown in Hebrew and English to read; they are not played aloud.',
      'Finish by blowing into the microphone, if you allow it, or by pressing Blow.',
    ],
  });
  let alive = true, C, W, lighting = null, night = 1, mistakes = 0, steps = 0, mic = null, blessingsShown = false;
  try { [C, W] = await Promise.all([loadHanukkah(ctx, 'candles'), loadHanukkah(ctx, 'words')]); }
  catch { P.announce('The hanukkiah could not load. Check the connection and open the game again.'); return () => { alive = false; P.destroy(); }; }
  if (!alive) return () => {};
  const words = byKey(W);
  const menorah = h('div', { class: 'hk-menorah', role: 'group', 'aria-label': 'Hanukkiah: eight holders and the shamash in the middle' });
  const extra = h('div', { class: 'hk-extra' });
  const vocab = h('p', { class: 'muted' }, ...['chanukiya', 'ner', 'shamash', 'nerot'].flatMap((k, i) => [i ? ' · ' : '', words.get(k) ? wordLine(words.get(k)) : '']));

  const holderLabel = (t) => (t === SHAMASH ? 'Shamash' : `Holder ${t} from the right`);
  function paint() {
    const placed = lighting?.placed || new Set(), lit = lighting?.lit || new Set();
    menorah.replaceChildren(...VISUAL_ORDER.map((t) => {
      const isSh = t === SHAMASH;
      const hasCandle = isSh || placed.has(t);
      const isLit = lit.has(t);
      const state = isLit ? 'lit' : hasCandle ? 'candle, not lit' : 'empty';
      return h('button', { type: 'button', class: 'hk-holder' + (isSh ? ' is-shamash' : ''), 'data-holder': String(t), 'aria-label': `${holderLabel(t)}: ${state}`, onclick: () => tap(t) },
        isLit ? h('span', { class: 'hk-flame', 'aria-hidden': 'true' }) : null,
        hasCandle ? h('span', { class: 'hk-candle', 'aria-hidden': 'true' }) : null,
        h('span', { 'aria-hidden': 'true' }, isSh ? 'ש' : String(t)));
    }));
  }
  function prompt() {
    if (!lighting) return '';
    if (lighting.phase === 'place') {
      const left = lighting.night - lighting.placed.size;
      return `Night ${night}: put in ${left} more candle${left === 1 ? '' : 's'}. The next one goes in holder ${lighting.expected} from the right.`;
    }
    if (lighting.phase === 'light') return lighting.expected === SHAMASH ? 'Now light the shamash first.' : `Light holder ${lighting.expected} from the right next (${lighting.lit.size === 1 ? 'the newest candle, on the left' : 'moving right'}).`;
    return '';
  }

  function tap(t) {
    if (!lighting || lighting.phase === 'done') return;
    const phase = lighting.phase;
    if (phase === 'light' && lighting.expected !== SHAMASH && !blessingsShown) { showBlessings(); return; }
    const r = lighting.tap(t);
    if (r.ok) {
      steps++; fx(ctx, phase === 'place' ? 'drop' : 'pop'); paint();
      if (phase === 'light' && t === SHAMASH) { showBlessings(); return; }
      if (r.done) { lightsDone(); return; }
      P.announce(prompt());
      if (phase === 'place' && r.phase === 'light') P.announce('All the candles are in. ' + prompt());
    } else {
      mistakes++; fx(ctx, 'error_soft');
      const why = r.reason === 'shamash-stays' ? 'The shamash already has its own candle. Put the night’s candles in from the right.'
        : r.reason === 'place-order' ? `Candles go in from the right. Try holder ${r.expected} from the right.`
          : r.expected === SHAMASH ? 'Light the shamash first; it lights the others.' : `Light the newest candle first, then move right: holder ${r.expected} from the right.`;
      P.announce(why);
    }
  }

  function showBlessings() {
    blessingsShown = true;
    const list = C.blessings.filter((b) => night === 1 || b.id !== 'shehecheyanu');
    const done = h('button', { type: 'button', class: 'btn', onclick: () => { extra.replaceChildren(); P.announce(prompt()); try { menorah.querySelector(`[data-holder="${lighting.expected}"]`)?.focus?.(); } catch { /* ignore */ } } }, 'I Have Read Them: Light the Candles');
    extra.replaceChildren(h('section', { 'aria-labelledby': `${ID}-bl-h` },
      h('h2', { id: `${ID}-bl-h`, tabindex: '-1' }, 'The Blessings'),
      h('p', { class: 'muted' }, `With the shamash lit and before lighting the candles, these ${list.length === 3 ? 'three blessings are' : 'two blessings are'} said. Read them here; they are not played aloud. The divine Name is written ה׳.`),
      ...list.map((b) => h('div', { class: 'hk-blessing' },
        h('h3', {}, b.name, h('span', { class: 'muted' }, ` · ${b.when}`)),
        h('p', { lang: 'he', dir: 'rtl', class: 'he hk-he' }, b.he),
        h('p', {}, b.en),
        b.variant ? h('p', { class: 'muted' }, b.variant) : null)),
      done));
    P.announce('The shamash is lit. Read the blessings, then light the candles.');
    try { extra.querySelector('h2')?.focus?.(); } catch { /* ignore */ }
  }

  function lightsDone() {
    const blow = h('button', { type: 'button', class: 'btn', onclick: () => blowOne('tap') }, 'Blow (Tap)');
    const micBtn = h('button', { type: 'button', class: 'btn secondary', onclick: () => startMic(micBtn) }, 'Use the Microphone');
    const tip = h('p', { class: 'muted' }, 'The microphone only measures how loud the sound is, on this device. Nothing is recorded, saved or sent.');
    extra.replaceChildren(h('section', { 'aria-labelledby': `${ID}-blow-h` },
      h('h2', { id: `${ID}-blow-h`, tabindex: '-1' }, 'All the Lights Are Lit'),
      h('p', {}, `Night ${night}: the shamash and ${night} candle${night === 1 ? '' : 's'}. `, words.get('or') ? wordLine(words.get('or')) : ''),
      h('p', {}, C.afterNote),
      h('div', { class: 'hk-row' }, blow, micBtn), tip));
    P.announce(`All lit, in the right order. ${C.afterNote} Press Blow, or use the microphone, to finish the round.`);
    sayWord(ctx, words.get('or'));
    try { blow.focus(); } catch { /* ignore */ }
  }

  function blowOne(how) {
    if (!lighting || lighting.phase !== 'done') return;
    const lit = [...menorah.querySelectorAll('.hk-flame')];
    const flame = lit[lit.length - 1];
    if (flame) { flame.remove(); fx(ctx, 'swoosh'); }
    const left = menorah.querySelectorAll('.hk-flame').length;
    P.announce(left ? `${how === 'mic' ? 'Whoosh! ' : ''}${left} flame${left === 1 ? '' : 's'} left.` : 'All the game candles are out.');
    if (!left) finish();
  }

  async function startMic(btn) {
    const md = globalThis.navigator?.mediaDevices;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!md?.getUserMedia || !AC) { P.announce('This browser cannot use the microphone here. Press Blow instead.'); btn.disabled = true; return; }
    try {
      const stream = await md.getUserMedia({ audio: true });
      if (!alive) { stream.getTracks().forEach((t) => t.stop()); return; }
      const ac = new AC(); const src = ac.createMediaStreamSource(stream); const an = ac.createAnalyser(); an.fftSize = 512; src.connect(an);
      const buf = new Uint8Array(an.fftSize); let loudFor = 0, quietFor = 1000;
      const poll = setInterval(() => {
        an.getByteTimeDomainData(buf);
        const level = rms(buf);
        if (level > 0.2) { loudFor += 50; quietFor = 0; } else { quietFor += 50; if (quietFor > 250) loudFor = 0; }
        if (loudFor >= 150) { loudFor = -600; blowOne('mic'); } // one flame per breath; a short pause before the next counts
      }, 50);
      mic = { stop: () => { clearInterval(poll); stream.getTracks().forEach((t) => t.stop()); try { ac.close(); } catch { /* closed */ } } };
      btn.disabled = true; btn.textContent = 'Listening: Blow Now';
      P.announce('Listening for a blow. Blow towards the microphone, one breath per flame.');
    } catch {
      P.announce('The microphone was not allowed. Press Blow instead.');
      btn.disabled = true;
    }
  }
  const stopMic = () => { try { mic?.stop(); } catch { /* already stopped */ } mic = null; };

  function finish() {
    stopMic();
    const score = Math.max(0, steps * 10 - mistakes * 3);
    const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : mistakes <= 5 ? 1 : 0;
    pageResults(P, ctx, {
      id: ID, heading: `Night ${night} Done`, score, stars,
      lines: [mistakes ? `${mistakes} step${mistakes === 1 ? '' : 's'} out of order. Candles in from the right; light the shamash, then the newest candle first.` : 'Every candle in and lit in the right order.', `Score: ${score}.`],
      onAgain: () => (night < HOLDERS ? begin(night + 1) : pickNight()),
    });
  }

  function begin(n) {
    stopMic();
    night = n; lighting = createLighting(n); mistakes = 0; steps = 0; blessingsShown = false;
    P.results.replaceChildren(); extra.replaceChildren(); P.controls.replaceChildren();
    P.board.replaceChildren(h('h2', {}, `The ${ORDINAL[n][0].toUpperCase() + ORDINAL[n].slice(1)} Night`), vocab, menorah, extra);
    paint();
    P.announce(prompt());
    try { menorah.querySelector('[data-holder="1"]')?.focus?.(); } catch { /* ignore */ }
  }
  function pickNight() {
    stopMic(); lighting = null;
    P.results.replaceChildren(); extra.replaceChildren();
    P.board.replaceChildren(h('p', {}, C.order.place), h('p', {}, C.order.light), h('p', {}, C.order.shamash), vocab,
      h('div', { class: 'hk-row', role: 'group', 'aria-label': 'Pick a night' }, ...Array.from({ length: HOLDERS }, (_, i) => h('button', { type: 'button', class: 'btn secondary', onclick: () => begin(i + 1) }, `Night ${i + 1}`))));
    P.controls.replaceChildren();
    P.announce('Pick a night of Hanukkah to light.');
  }
  pickNight();
  return () => { alive = false; stopMic(); P.destroy(); };
}
