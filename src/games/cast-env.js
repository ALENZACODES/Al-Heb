import { imgOf } from './engine.js';

/** The game's own cast backdrop (assets/games/arcade/<game>/env.webp: Ari, Noa and Rimon on the approved scene), shown as a
 * plain picture above the controls, never behind or over them. If the file cannot load, the approved hall art for
 * fallbackId takes its place. Nothing is shown when the hall art itself is not available. */
export function castEnvNode(h, R, game, fallbackId) {
  const old = fallbackId ? imgOf(R, 'id', fallbackId) : null;
  const hall = old?.src && old.id === fallbackId ? old : null;
  if (!hall) return null; // only where the approved backdrop would show (pictures off or missing: no picture)
  const img = h('img', { class: 'game-env game-env-cast', src: `assets/games/arcade/${game}/env.webp`, alt: hall?.alt || '', width: 1600, height: 600,
    decoding: 'async', 'data-img-id': fallbackId || game, 'data-cast-env': game });
  img.addEventListener('error', () => {
    if (img.dataset.castEnv) { delete img.dataset.castEnv; img.src = hall.src; if (hall.width) img.width = hall.width; if (hall.height) img.height = hall.height; }
    else img.remove();
  });
  return img;
}
