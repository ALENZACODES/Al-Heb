// The Aleph opening: the Tree of Life at first light (heaven-sent home hero).
// Original, text-free artwork; all Hebrew, prayers and controls remain live DOM.
// Motion is limited to CSS atmosphere and gentle compositor-friendly parallax.
import { h } from './ui.js';

export const ANCIENT_TREE_SRC = 'assets/img/gen/HERO_home_heaven.1536x1024.webp';
export const ANCIENT_TREE_MOBILE_SRC = 'assets/img/gen/HERO_home_heaven.1024x1536.webp';
export const ANCIENT_TREE_DESCRIPTION =
  'An ancient olive tree on a Jerusalem hillside at first light, its canopy opening into a ' +
  'soft column of golden light, a basket of pomegranates on a low stone wall, and a calm ' +
  'deep-green sky. There is no writing in the picture.';

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
      h('picture', { class: 'astral-tree-picture' },
        h('source', { media: '(max-width: 600px)', srcset: ANCIENT_TREE_MOBILE_SRC, type: 'image/webp' }),
        h('img', { class: 'astral-tree-photo', src: ANCIENT_TREE_SRC, alt: '',
          width: '1600', height: '900', loading: 'eager', decoding: 'async',
          fetchpriority: 'high' }))),
    h('div', { class: 'astral-nightfall', 'aria-hidden': 'true' }),
    h('div', { class: 'astral-harvest-halo', 'aria-hidden': 'true' }),
    h('div', { class: 'astral-stars', 'aria-hidden': 'true' }),
    h('div', { class: 'astral-harvest-motes', 'aria-hidden': 'true' }),
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
