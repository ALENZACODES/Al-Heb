// Secular music controls for game routes only. Hidden on prayer and sacred listen.
import { h } from '../shell/ui.js';
import { gameMusic, musicContextFor } from './music.js';
import { mediaPolicy } from './policy.js';

const CSS = `
#game-music{position:static;z-index:auto;clear:both;margin:1rem 0 0;padding:.45rem .7rem;font-size:.9rem;background:#123d2c;color:#f3e6bf;border:1px solid #b8962e;border-radius:16px;display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;scroll-margin-block:1rem}
#game-music[hidden]{display:none}
#game-music .gm-ico{font-size:1.1rem;line-height:1}
#game-music button,#game-music select{min-block-size:40px;border-radius:999px;border:1px solid #b8962e;background:transparent;color:inherit;padding:.2rem .8rem;font:inherit;cursor:pointer}
#game-music button[aria-pressed="true"]{background:#d4af37;color:#123d2c;font-weight:700}
#game-music select{background:#123d2c;max-inline-size:14rem}
#game-music input[type="range"]{width:5.5rem;accent-color:#d4af37;min-block-size:40px}
#game-music button:focus-visible,#game-music select:focus-visible,#game-music input:focus-visible{outline:3px solid #f3e6bf;outline-offset:2px}
#game-music .status{flex-basis:100%;margin:0;font-size:.75rem;opacity:.8}
#game-music .status:empty{display:none}
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
  if (toggle) toggle.textContent = state.want && state.armed ? 'Stop music' : 'Play music';
  if (toggle) toggle.setAttribute('aria-pressed', state.want && state.armed ? 'true' : 'false');
  if (mute) { mute.textContent = state.muted ? 'Unmute' : 'Mute'; mute.setAttribute('aria-pressed', state.muted ? 'true' : 'false'); }
  if (select && select.value !== state.trackId) select.value = state.trackId;
  if (volume && document.activeElement !== volume) volume.value = String(state.volume);
  if (status) {
    status.textContent = state.error
      ? state.error
        : state.phase === 'paused' && state.speech ? 'Paused while speech plays.'
          : '';
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
  const groups = [...new Set(tracks.map((t) => t.group || 'Music'))];
  const options = groups.length > 1
    ? groups.map((g) => h('optgroup', { label: g }, ...tracks.filter((t) => (t.group || 'Music') === g).map((t) => h('option', { value: t.id }, `${t.title}${t.role ? ' · ' + t.role : ''}`))))
    : tracks.map((t) => h('option', { value: t.id }, t.title));
  const next = () => {
    const now = gameMusic.snapshot(); const i = tracks.findIndex((t) => t.id === now.trackId);
    gameMusic.choose(tracks[(i + 1) % tracks.length].id);
  };
  // Off until turned on; never plays during prayer or sacred listening (see music.js).
  root = h('aside', { id: 'game-music', hidden: true, 'aria-label': 'Game music' },
    h('span', { class: 'gm-ico', 'aria-hidden': 'true' }, '♪'),
    h('button', { type: 'button', 'data-music': 'toggle', 'aria-pressed': 'false', onclick: () => {
      const now = gameMusic.snapshot();
      if (now.want && now.armed) gameMusic.disable();
      else { mediaPolicy.chooseMusic?.(); gameMusic.enable(); }
    } }, 'Play music'),
    h('label', { class: 'visually-hidden', for: 'gm-track' }, 'Track'),
    h('select', { id: 'gm-track', 'data-music': 'track', onchange: (e) => gameMusic.choose(e.target.value) }, ...options),
    h('button', { type: 'button', 'data-music': 'next', 'aria-label': 'Next track', onclick: next }, '⏭'),
    h('button', { type: 'button', 'data-music': 'mute', 'aria-pressed': 'false', onclick: () => gameMusic.mute(!gameMusic.snapshot().muted) }, 'Mute'),
    h('input', { 'data-music': 'volume', type: 'range', min: '0', max: '1', step: '0.05', value: '0.22', 'aria-label': 'Music volume', oninput: (e) => gameMusic.volume(Number(e.target.value)) }),
    h('p', { class: 'status', 'data-music': 'status', role: 'status' }, ''));
  const fine = parent === document.body ? document.querySelector('.fine-print') : null;
  if (fine) fine.before(root); else parent.append(root);
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
