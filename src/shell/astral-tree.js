// A living, ancient Tree of Life. The source is the project's existing fine-art
// homepage tree, not a cartoon made from geometric SVG circles and straight limbs.
// Motion stays in CSS: slow camera drift, constellations and one travelling light ray.
import { h } from './ui.js';

export const ANCIENT_TREE_SRC = 'assets/img/gen/HERO_home_tree.webp';
export const ANCIENT_TREE_DESCRIPTION =
  'An immense, centuries-old olive Tree of Life with a massive hollow, tightly twisted weathered trunk, ' +
  'long exposed roots gripping stone, and silver-green branches beneath a golden astral sky.';

const mounted = new Set();
let observer = null;
let initialized = false;
let queued = false;

function mayMove() {
  return !document.hidden && !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
}

function onFrame() {
  queued = false;
  for (const scene of mounted) {
    if (!scene.isConnected) {
      observer?.unobserve(scene);
      mounted.delete(scene);
      continue;
    }
    const visible = scene.dataset.visible !== '0';
    scene.dataset.paused = visible && mayMove() ? '0' : '1';
    if (!visible || !mayMove()) {
      scene.style.setProperty('--tree-shift', '0px');
      continue;
    }
    const rect = scene.getBoundingClientRect();
    const top = Math.max(-1, Math.min(1, rect.top / Math.max(1, window.innerHeight)));
    scene.style.setProperty('--tree-shift', (-top * 8).toFixed(2) + 'px');
  }
}
function scheduleFrame() {
  if (queued || typeof requestAnimationFrame !== 'function') return;
  queued = true;
  requestAnimationFrame(onFrame);
}
function enableSceneMotion() {
  if (initialized || typeof window === 'undefined' || !window.addEventListener) return;
  initialized = true;
  if (typeof IntersectionObserver === 'function') {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.dataset.visible = entry.isIntersecting ? '1' : '0';
      scheduleFrame();
    }, { threshold: .01 });
  }
  window.addEventListener('scroll', scheduleFrame, { passive: true });
  window.addEventListener('resize', scheduleFrame, { passive: true });
  document.addEventListener('visibilitychange', onFrame);
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.addEventListener?.('change', onFrame);
}

/** Decorative tree sits above, never over, the interactive homepage copy. */
export function astralTreeNode() {
  const scene = h('div', { class: 'astral-scene', role: 'img', 'aria-label': ANCIENT_TREE_DESCRIPTION },
    h('div', { class: 'astral-photo-motion', 'aria-hidden': 'true' },
      h('img', { class: 'astral-tree-photo', src: ANCIENT_TREE_SRC, alt: '',
        width: '1600', height: '914', loading: 'eager', decoding: 'async' })),
    h('div', { class: 'astral-nightfall', 'aria-hidden': 'true' }),
    h('div', { class: 'astral-stars', 'aria-hidden': 'true' }),
    h('div', { class: 'astral-ray', 'aria-hidden': 'true' }),
    h('div', { class: 'astral-ground-light', 'aria-hidden': 'true' })
  );
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    enableSceneMotion();
    mounted.add(scene);
    observer?.observe(scene);
    scheduleFrame();
  }
  return scene;
}
