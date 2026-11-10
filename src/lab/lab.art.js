// Brain Lab artwork (2026-11-10 pack in data/images/brain-lab-2026-11-10). Purely decorative: every picture has empty alt
// text, is hidden from screen readers, loads lazily and removes itself if it fails, so a missing file or an offline
// device never changes what a drill does. Board mats (the *_play files) are not used behind the tiles yet.
import { GAME_IDS } from './lab.core.js';

export const ART_DIR = 'data/images/brain-lab-2026-11-10';
const KINDS = new Set(['cover', 'play', 'win']);

/** Repo-relative path of one drill's picture, or null for an unknown drill or kind. */
export function artPath(gameId, kind) {
  if (!GAME_IDS.includes(gameId) || !KINDS.has(kind)) return null;
  return `${ART_DIR}/LAB_v2_${gameId}_${kind}.webp`;
}
export const NEW_BEST_ART = `${ART_DIR}/LAB_v2_new_best.webp`;
export const WORKOUT_DONE_ART = `${ART_DIR}/LAB_v2_workout_done.webp`;

/** A decorative <img>, or null when there is no path or no DOM. */
export function artImg(h, path, cls) {
  if (!path || typeof h !== 'function') return null;
  try {
    const img = h('img', { src: path, alt: '', 'aria-hidden': 'true', class: `lab-art ${cls || ''}`.trim(), loading: 'lazy', decoding: 'async' });
    if (img && typeof img.addEventListener === 'function') img.addEventListener('error', () => img.remove?.(), { once: true });
    return img;
  } catch { return null; }
}

// ------------------------------------------------------------------ Board mats (the *_play pictures)
// Text never sits on a mat. A board with a mat gives each of its direct children an opaque warm-white backing
// (#fffaf0, the same colour as the tiles), so every letter, number and word keeps the contrast it has without a mat.
// The mat shows only in the margins around them. Three drills use a figure instead of a mat, and Letter Matrix uses
// its picture as the back of a hidden tile.
// Four of the new games place their picture themselves, where its order put it ('own'): Sound Twins on the card face,
// Vowel Rain as the sky the syllables fall through, Taxi Turns as the road, Café Order as the café counter
// (src/lab/lab.games2.js, applyBackground below). A board mat there would hide the road and the sky.
const MAT = Object.freeze({
  hunt: 'mat', siddurflash: 'mat', switch: 'mat', countup: 'mat', calendar: 'mat', pattern: 'mat',
  middle: 'mat', chain: 'mat', twins: 'own', rain: 'own', taxi: 'own', cafe: 'own',
  matrix: 'tileback', soundmatch: 'figure', gematria: 'figure', numberear: 'figure',
});
/** Revised pictures that replace a first version (the first version stays on disk). */
const REVISED = Object.freeze({ switch_play: '_r2', calendar_cover: '_r2' });
export const matKind = (gameId) => MAT[gameId] || null;
export function playArtPath(gameId) {
  const p = artPath(gameId, 'play');
  return p && REVISED[`${gameId}_play`] ? p.replace(/\.webp$/, `${REVISED[`${gameId}_play`]}.webp`) : p;
}
export function coverArtPath(gameId) {
  const p = artPath(gameId, 'cover');
  return p && REVISED[`${gameId}_cover`] ? p.replace(/\.webp$/, `${REVISED[`${gameId}_cover`]}.webp`) : p;
}
function saveData() {
  try { return !!(globalThis.navigator?.connection?.saveData || globalThis.matchMedia?.('(prefers-reduced-data: reduce)')?.matches); } catch { return false; }
}
/**
 * Decorate a drill's play area once its picture has loaded. Nothing changes if the picture fails, if the device asks
 * to save data, or if there is no DOM. Returns true when loading was started.
 */
export function applyMat(gameId, { board, root, ImageCtor = globalThis.Image } = {}) {
  const kind = matKind(gameId), path = kind === 'figure' || kind === 'own' ? null : playArtPath(gameId);
  if (!kind || kind === 'figure' || kind === 'own' || !path || typeof ImageCtor !== 'function' || saveData()) return false;
  try {
    const img = new ImageCtor();
    img.decoding = 'async';
    img.onload = () => {
      try {
        if (kind === 'mat' && board?.classList) { board.style.setProperty('--lab-mat', `url("${path}")`); board.classList.add('has-mat'); }
        if (kind === 'tileback' && root?.style) root.style.setProperty('--lab-tileback', `url("${path}")`);
      } catch { /* decoration only */ }
    };
    img.onerror = () => {};
    img.src = path;
    return true;
  } catch { return false; }
}

// ------------------------------------------------------------------ Tokens, the hero, and pictures a game places itself
// The round tokens of the first ten games and the Brain Lab hero are in the commercial pack (data/images/commercial-2026-11-10).
// The six new games' tokens are still on order; until they arrive their token is the game's letter on a green-and-gold disc.
export const TOKEN_DIR = 'data/images/commercial-2026-11-10';
const TOKENS = new Set(['hunt', 'matrix', 'soundmatch', 'siddurflash', 'switch', 'gematria', 'countup', 'numberear', 'calendar', 'pattern']);
export const tokenArtPath = (gameId) => (TOKENS.has(gameId) ? `${TOKEN_DIR}/LAB_v2_${gameId}.webp` : null);
export const HERO_ART = `${TOKEN_DIR}/LAB_v2_hero.webp`;
/**
 * Show a picture as an element's background once it has loaded, and add a class (default lab-has-art). Nothing changes if the
 * picture fails, if the device asks to save data, or without a DOM, so the element keeps its plain look. Returns true when
 * loading was started.
 */
export function applyBackground(el, path, { cls = 'lab-has-art', ImageCtor = globalThis.Image } = {}) {
  if (!el?.style || !path || typeof ImageCtor !== 'function' || saveData()) return false;
  try {
    const img = new ImageCtor();
    img.decoding = 'async';
    img.onload = () => { try { el.style.backgroundImage = `url("${path}")`; el.classList?.add(cls); } catch { /* decoration only */ } };
    img.onerror = () => {};
    img.src = path;
    return true;
  } catch { return false; }
}
