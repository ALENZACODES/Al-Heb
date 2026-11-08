// Secular music controls for game routes only. Hidden on prayer and sacred listen.
import { h } from '../shell/ui.js';
import { gameMusic, musicContextFor } from './music.js';
import { mediaPolicy } from './policy.js';

const CSS = `
#game-music{position:static;z-index:auto;clear:both;margin:1rem 0 0;padding:.4rem .6rem;font-size:.85rem;background:var(--card,#fff);border:1px solid var(--line,#d7d0c4);border-radius:.75rem;display:grid;gap:.35rem;scroll-margin-block:1rem}
#game-music[hidden]{display:none}
#game-music .music-hint{margin:0;font-size:.78rem}
#game-music .row{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center}
#game-music input[type="range"]{width:5.5rem}
#game-music button,#game-music select,#game-music input{min-block-size:44px}
#game-music button:focus-visible,#game-music select:focus-visible,#game-music input:focus-visible{outline:3px solid #1E4634;outline-offset:2px}
#game-music .status{margin:0}
`;

let root = null;
let wired = false;

function paint(state) {
  if (!root) return;
  const toggle = root.querySelector('[data-music="toggle"]');
  const mute = root.querySelector('[data-music="mute"]');
  const status = root.querySelector('[data-music="status"]');
  const select = root.querySelector('[data-music="track"]');
  const volume = root.querySelector('[data-music="volume"]');
  if (toggle) toggle.textContent = state.want && state.armed ? 'Turn music off' : 'Turn music on';
  if (toggle) toggle.setAttribute('aria-pressed', state.want && state.armed ? 'true' : 'false');
  if (mute) { mute.textContent = state.muted ? 'Unmute' : 'Mute'; mute.setAttribute('aria-pressed', state.muted ? 'true' : 'false'); }
  if (select && select.value !== state.trackId) select.value = state.trackId;
  if (volume && document.activeElement !== volume) volume.value = String(state.volume);
  if (status) {
    status.textContent = state.error
      ? state.error
      : mediaPolicy.quiet() ? 'Music stays off for the first minute.'
        : state.phase === 'playing' ? 'Music is playing.'
          : state.phase === 'starting' ? 'Music is starting.'
            : state.phase === 'blocked' ? 'Music stays off on this screen.'
              : state.phase === 'paused' && state.speech ? 'Music is paused while speech plays.'
                : state.phase === 'paused' ? 'Music is paused.'
                  : 'Music is off.';
  }
}

export function mountGameMusic(parent = document.body) {
  if (root || !parent) return root;
  if (!document.getElementById('game-music-style')) {
    const style = document.createElement('style');
    style.id = 'game-music-style';
    style.textContent = CSS;
    document.head?.append(style);
  }
  const tracks = gameMusic.tracks;
  root = h('aside', { id: 'game-music', hidden: true, 'aria-label': 'Game music' },
    h('p', { class: 'music-hint' }, 'Optional secular music for games. It stays off until you turn it on, and it does not play during prayer or sacred listening.'),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn', 'data-music': 'toggle', 'aria-pressed': 'false', onclick: () => {
        const now = gameMusic.snapshot();
        if (now.want && now.armed) gameMusic.disable();
        else gameMusic.enable();
      } }, 'Turn music on'),
      h('button', { type: 'button', class: 'btn secondary', 'data-music': 'mute', 'aria-pressed': 'false', onclick: () => gameMusic.mute(!gameMusic.snapshot().muted) }, 'Mute'),
      h('label', {}, 'Track ', h('select', { 'data-music': 'track', onchange: (e) => gameMusic.choose(e.target.value) },
        ...tracks.map((t) => h('option', { value: t.id }, t.title)))),
      h('label', {}, 'Volume ', h('input', { 'data-music': 'volume', type: 'range', min: '0', max: '1', step: '0.05', value: '0.22', oninput: (e) => gameMusic.volume(Number(e.target.value)) })),
      h('span', { class: 'status', 'data-music': 'status', role: 'status' }, 'Music is off.')));
  parent.append(root);
  if (!wired) { wired = true; gameMusic.subscribe(paint); }
  return root;
}

/** Show the bar only on a secular game route, and tell the player where it is. */
export function syncGameMusic(route, settings) {
  const ctx = musicContextFor(route, {
    calm: settings?.get?.('calmMode') === true,
    audioFree: settings?.get?.('audioFree') === true,
  });
  mediaPolicy.setRoute(route?.name);
  gameMusic.setContext(ctx);
  if (!root && ctx.game && !ctx.sacred && !ctx.quiet) mountGameMusic();
  if (!root) return;
  const show = ctx.game && !ctx.sacred && !ctx.quiet;
  root.hidden = !show;
  root.setAttribute('aria-hidden', show ? 'false' : 'true');
}
