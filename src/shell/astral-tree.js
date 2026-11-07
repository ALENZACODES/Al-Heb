// Living Tree of Knowledge, built entirely from SVG paths and CSS layers.
// Decorative scene only: no characters, image files, animation libraries or audio.
import { h } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
const C = { sea: '#1F3A5F', red: '#B0373B', olive: '#6B7F3A', gold: '#D9A441', charcoal: '#2B2B2B', cream: '#F6F1E7' };
function s(tag, attrs = {}, ...children) {
  const e = typeof document.createElementNS === 'function' ? document.createElementNS(NS, tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  e.append(...children);
  return e;
}
let seed = 27413;
function rnd() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
const clusters = [
  [278, 265, 112, 78], [389, 187, 134, 100], [510, 133, 142, 94],
  [630, 181, 143, 97], [751, 254, 104, 72], [217, 353, 74, 73],
  [365, 304, 110, 83], [513, 266, 138, 93], [652, 313, 113, 84],
  [789, 352, 73, 69], [447, 360, 92, 62], [567, 364, 112, 69],
];

function makeTree() {
  seed = 27413;
  const svg = s('svg', { class: 'astral-svg', viewBox: '0 0 1000 650', preserveAspectRatio: 'xMidYMid slice', focusable: 'false', 'aria-hidden': 'true' });
  svg.append(
    s('path', { d: 'M0 530Q170 478 370 515T750 506T1000 518V650H0Z', fill: C.sea, opacity: '.4' }),
    s('ellipse', { cx: 505, cy: 605, rx: 380, ry: 33, fill: C.charcoal, opacity: '.26' })
  );
  const growing = s('g', { class: 'astral-growth' });
  growing.append(
    s('path', { d: 'M471 626C483 557 468 495 487 415C501 348 504 298 496 229C510 306 525 367 539 423C552 503 535 552 553 626Z', fill: C.charcoal }),
    s('path', { d: 'M508 476C467 436 437 389 384 340C332 294 268 290 215 310', fill: 'none', stroke: C.charcoal, 'stroke-width': 21, 'stroke-linecap': 'round' }),
    s('path', { d: 'M510 438C546 385 572 338 636 301C693 269 744 279 812 294', fill: 'none', stroke: C.charcoal, 'stroke-width': 23, 'stroke-linecap': 'round' }),
    s('path', { d: 'M499 367C468 306 441 240 393 211C367 186 327 171 282 175', fill: 'none', stroke: C.charcoal, 'stroke-width': 19, 'stroke-linecap': 'round' }),
    s('path', { d: 'M506 341C529 284 542 228 606 191C652 163 706 183 744 205', fill: 'none', stroke: C.charcoal, 'stroke-width': 18, 'stroke-linecap': 'round' }),
    s('path', { d: 'M499 330Q482 242 487 153M518 359Q563 257 557 156', fill: 'none', stroke: C.charcoal, 'stroke-width': 14, 'stroke-linecap': 'round' }),
    s('path', { d: 'M490 615C440 629 420 641 356 639M534 616C579 628 609 644 674 638M491 606Q464 624 453 639M535 601Q560 625 577 640', fill: 'none', stroke: C.charcoal, 'stroke-width': 10, 'stroke-linecap': 'round' })
  );
  const canopy = s('g', { class: 'astral-canopy' });
  for (let i = 0; i < clusters.length; i++) {
    const [cx, cy, rx, ry] = clusters[i];
    const cluster = s('g', { class: 'astral-leaf-cluster' + (i > 8 ? ' astral-extra' : ''), style: `--leaf-delay:${(i * -.43).toFixed(2)}s` });
    // One cluster is one composited layer; its leaves do not individually animate.
    for (let j = 0; j < 15; j++) {
      const angle = rnd() * Math.PI * 2, radius = Math.sqrt(rnd());
      const x = cx + Math.cos(angle) * rx * radius;
      const y = cy + Math.sin(angle) * ry * radius;
      const lean = Math.round(-45 + rnd() * 90);
      const w = 8 + rnd() * 12, ht = 4 + rnd() * 6;
      cluster.append(s('ellipse', {
        cx: x.toFixed(1), cy: y.toFixed(1), rx: w.toFixed(1), ry: ht.toFixed(1),
        transform: `rotate(${lean} ${x.toFixed(1)} ${y.toFixed(1)})`,
        fill: rnd() < .22 ? C.gold : C.olive, opacity: (.72 + rnd() * .28).toFixed(2)
      }));
    }
    canopy.append(cluster);
  }
  const fruit = s('g', { class: 'astral-fruits' });
  [[304,352],[404,276],[578,309],[670,258],[742,371],[501,210],[247,303],[637,370]].forEach(([x,y],i) => {
    const p = s('g', { class: 'astral-fruit' + (i > 5 ? ' astral-extra' : ''), style: `--fruit-delay:${(-i * .71).toFixed(2)}s` });
    p.append(
      s('circle', { cx: x, cy: y + 8, r: 17, fill: C.gold, opacity: '.22' }),
      s('path', { d: `M${x-12} ${y+1} Q${x-18} ${y+15} ${x-8} ${y+26}Q${x} ${y+32} ${x+9} ${y+25}Q${x+18} ${y+14} ${x+12} ${y+1}Q${x} ${y-9} ${x-12} ${y+1}Z`, fill: C.red }),
      s('path', { d: `M${x-8} ${y-6} L${x-12} ${y-13} L${x-3} ${y-10} L${x} ${y-17} L${x+3} ${y-10} L${x+12} ${y-13}L${x+8} ${y-6}Z`, fill: C.gold })
    );
    fruit.append(p);
  });
  growing.append(canopy, fruit);
  svg.append(growing);
  return svg;
}

const mounted = new Set();
let io = null;
let initialized = false;
let framePending = false;
const motionAllowed = () => !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
function updateParallax() {
  framePending = false;
  for (const node of mounted) {
    if (!node.isConnected) { io?.unobserve(node); mounted.delete(node); continue; }
    if (document.hidden || !motionAllowed()) { node.dataset.paused = '1'; node.style.setProperty('--tree-shift', '0px'); continue; }
    if (node.dataset.visible === '0') continue;
    const rect = node.getBoundingClientRect();
    const offset = Math.max(-9, Math.min(9, (rect.top / Math.max(1, innerHeight)) * -9));
    node.style.setProperty('--tree-shift', offset.toFixed(1) + 'px');
    node.dataset.paused = '0';
  }
}
function scheduleParallax() {
  if (framePending) return;
  framePending = true;
  requestAnimationFrame(updateParallax);
}
function installVisibility() {
  if (initialized || typeof window?.addEventListener !== 'function' || typeof requestAnimationFrame !== 'function') return;
  initialized = true;
  if (typeof IntersectionObserver === 'function') {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) { e.target.dataset.visible = e.isIntersecting ? '1' : '0'; e.target.dataset.paused = e.isIntersecting && !document.hidden && motionAllowed() ? '0' : '1'; }
      scheduleParallax();
    }, { threshold: 0.02 });
  }
  window.addEventListener('scroll', scheduleParallax, { passive: true });
  window.addEventListener('resize', scheduleParallax, { passive: true });
  document.addEventListener('visibilitychange', () => {
    for (const node of mounted) node.dataset.paused = document.hidden ? '1' : (node.dataset.visible === '0' || !motionAllowed() ? '1' : '0');
    if (!document.hidden) scheduleParallax();
  });
}

export function astralTreeNode() {
  const scene = h('div', { class: 'astral-scene', role: 'img', 'aria-label': 'The Tree of Knowledge: an olive-and-gold leafy tree with pomegranates under a starry blue-to-gold sky' },
    h('div', { class: 'astral-stars', 'aria-hidden': 'true' }),
    h('div', { class: 'astral-ray', 'aria-hidden': 'true' }),
    makeTree());
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    installVisibility();
    mounted.add(scene);
    io?.observe(scene);
    scheduleParallax();
  }
  return scene;
}
