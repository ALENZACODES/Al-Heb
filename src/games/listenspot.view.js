// @ts-check
// Listen and Spot (#/listenspot, D6): the listening version of Spot It. A word from the learner's lessons plays; tap that word on
// a board of lesson words. Only words whose lesson clip (kind word, id <lesson>-w<n>, data/audio manifests) plays from a file in
// the learner's voice and tradition are asked; the device's speech voice is never used here, so a word with no clip is skipped.
// Each clip is captioned with its manifest label (src/shell/audio-labels.js), so a computer-made voice is never shown as human.
import { h, heSpan } from '../shell/ui.js';
import { recordScore } from './scores.js';
import { playRecordedClip, hasRecordedClip } from './engine.js';
import { lessonPool } from './sprint60.model.js';
import { fileLabel } from '../shell/audio-labels.js';
import { isAudioFree } from '../shell/audiofree.js';
import { injectStyles } from './library.view.js';

export const STORE_KEY = 'games.listenspot.v1';
export const ROUND = 8, BOARD = 6;
export const clipId = (w) => `${w.lesson}-w${w.n}`;
/** Lesson words whose clip plays from a file. Pure apart from asking the player. */
export const audible = (ctx, words) => words.filter((w) => hasRecordedClip(ctx, 'word', clipId(w)));
const starsFor = (right) => (right >= ROUND ? 3 : right >= ROUND - 2 ? 2 : right >= ROUND / 2 ? 1 : 0);

export function mount(root, ctx) {
  injectStyles();
  let alive = true, words = [], targets = [], i = 0, right = 0, missed = false;
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'gb-status' }, 'Getting your lesson words…');
  const caption = h('p', { class: 'muted gb-caption' });
  const board = h('div', {});
  const rnd = Math.random;
  const shuffle = (a) => { const x = [...a]; for (let k = x.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [x[k], x[j]] = [x[j], x[k]]; } return x; };
  const get = (k) => { try { return ctx?.store?.get?.(k) ?? null; } catch { return null; } };
  const set = (k, v) => { try { ctx?.store?.set?.(k, v); } catch { /* storage full or blocked */ } };

  async function play(w) {
    const ok = await playRecordedClip(ctx, 'word', clipId(w));
    let st = null; try { st = ctx?.audio?.status?.('word', clipId(w)); } catch { st = null; }
    caption.textContent = ok ? `Voice: ${fileLabel(st?.entryStatus, st?.tradition, st?.source)}.` : 'This clip did not play. Tap Play again, or skip it.';
  }
  function end() {
    const score = right * 10, stars = starsFor(right), prev = get(STORE_KEY) || {};
    set(STORE_KEY, { best: Math.max(prev.best || 0, score), plays: (prev.plays || 0) + 1, lastStars: stars });
    recordScore(ctx?.store, 'listenspot', score, stars);
    try { globalThis.document?.dispatchEvent?.(new CustomEvent('alef:game-finished', { detail: { stars } })); } catch { /* optional */ }
    board.replaceChildren(h('section', { class: 'card game-results', 'aria-labelledby': 'ls-h' },
      h('h2', { id: 'ls-h', tabindex: '-1' }, `${right} of ${targets.length} spotted on the first tap`),
      h('p', { class: 'game-stars', 'aria-label': `${stars} of 3 stars` }, '★'.repeat(stars) + '☆'.repeat(3 - stars)),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onclick: start }, 'Play again'), h('a', { class: 'btn secondary', href: '#/game-library' }, 'Games Library'))));
    status.textContent = `Round over: ${right} of ${targets.length}.`;
  }
  function ask() {
    if (i >= targets.length) { end(); return; }
    const t = targets[i]; missed = false;
    const others = shuffle(words.filter((w) => w.he !== t.he)).slice(0, BOARD - 1);
    const cells = shuffle([t, ...others]);
    board.replaceChildren(
      h('p', {}, `Word ${i + 1} of ${targets.length}. `, h('button', { type: 'button', class: 'btn', onclick: () => play(t) }, '▶ Play the word')),
      h('div', { class: 'gb-filters', role: 'group', 'aria-label': 'Which word did you hear?' }, ...cells.map((w) => {
        const b = h('button', { type: 'button', class: 'btn secondary gb-spot-cell', onclick: () => {
          if (w.he === t.he) { if (!missed) right++; status.textContent = `Yes: ${t.he} — ${t.en}.`; i++; ask(); }
          else { missed = true; b.setAttribute('disabled', ''); status.textContent = 'Not that one. Play it again and listen once more.'; }
        } }, heSpan(w.he, 'he gb-big'));
        return b;
      })));
    play(t);
  }
  function start() { right = 0; i = 0; targets = shuffle(words).slice(0, ROUND); status.textContent = 'Listen, then tap the word you heard.'; ask(); }

  root.replaceChildren(h('article', { class: 'card game-card gb-lib' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Listen and Spot ', heSpan('שָׁמַע')),
    h('p', {}, 'A word from your lessons plays. Find it on the board. There is no English and no sounds-like help: just your ears and the letters.'),
    status, caption, board));
  (async () => {
    if (isAudioFree(ctx)) { status.textContent = 'Audio is off in your settings, so this listening game cannot play. Turn audio on in Settings to play it.'; return; }
    try {
      const r = await (ctx?.fetchFn ?? fetch)(new URL('../../data/curriculum/lessons.json', import.meta.url));
      if (!r || r.ok === false) throw new Error('lessons');
      const lessons = (await r.json()).lessons || [];
      if (!alive) return;
      const pool = lessonPool(lessons, get('curriculum.progress')?.completed || {}, 80);
      words = audible(ctx, pool.words);
      if (words.length < BOARD) { status.textContent = `Not enough of your lesson words have a clip that plays here (${words.length}). Try again later, or play Word Finder.`; return; }
      status.textContent = `${words.length} of your lesson words have a clip. ${pool.filled ? 'Finish more lessons to bring in your own words; for now they come from the first reading lessons.' : ''}`;
      board.replaceChildren(h('button', { type: 'button', class: 'btn', onclick: start }, 'Start'));
    } catch { if (alive) status.textContent = 'The lesson words did not load. Check the connection and open the game again.'; }
  })();
  return () => { alive = false; try { ctx?.audio?.stop?.(); } catch { /* already stopped */ } };
}
