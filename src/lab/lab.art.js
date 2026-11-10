// Decorative Brain Lab pictures. Every image has empty alt text, is hidden from screen readers,
// loads lazily and removes itself if it fails, so a missing file or an offline device never
// changes what a drill does. Studio art lives under data/images/brain-lab-studio-2026-11-10
// and is fetched on demand (not in the first-install precache).
import { GAME_IDS, gameById } from './lab.core.js';

export const CLASSIC_ART_DIR = 'data/images/brain-lab-2026-11-10';
export const STUDIO_ART_DIR = 'data/images/brain-lab-studio-2026-11-10';
const KINDS = new Set(['cover', 'play', 'win']);

/** Repo-relative path of one drill's picture, or null for an unknown drill or kind. */
export function artPath(gameId, kind) {
  if (!GAME_IDS.includes(gameId) || !KINDS.has(kind)) return null;
  const pack = gameById(gameId)?.pack === 'studio' || gameById(gameId)?.pack === 'claude' ? STUDIO_ART_DIR : CLASSIC_ART_DIR;
  const prefix = pack === STUDIO_ART_DIR ? 'LAB_v3' : 'LAB_v2';
  return `${pack}/${prefix}_${gameId}_${kind}.webp`;
}
export const NEW_BEST_ART = `${STUDIO_ART_DIR}/LAB_v3_new_best.webp`;
export const WORKOUT_DONE_ART = `${CLASSIC_ART_DIR}/LAB_v2_workout_done.webp`;

/** A decorative <img>, or null when there is no path or no DOM. */
export function artImg(h, path, cls) {
  if (!path || typeof h !== 'function') return null;
  try {
    const img = h('img', { src: path, alt: '', 'aria-hidden': 'true', class: `lab-art ${cls || ''}`.trim(), loading: 'lazy', decoding: 'async' });
    if (img && typeof img.addEventListener === 'function') img.addEventListener('error', () => img.remove?.(), { once: true });
    return img;
  } catch { return null; }
}
