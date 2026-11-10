// On-demand 3D scene for Brain Lab Studio games. Loaded only when a studio game starts, so it is not in the first-install budget.
// CSS 3D tilt, a moving light, depth on the board, and a small canvas particle field. Reduced motion (or a missing canvas) leaves the game in flat 2D.
export function createScene(playEl, board, { reduceMotion = false } = {}) {
  const nop = { react() {}, destroy() {} };
  if (!playEl || reduceMotion) return nop;
  const doc = playEl.ownerDocument;
  if (!doc) return nop;

  playEl.classList.add('lab-fx-on');
  playEl.style.perspective = '1100px';
  playEl.style.perspectiveOrigin = '50% 40%';
  if (board) {
    board.style.transformStyle = 'preserve-3d';
    board.style.transition = 'transform 120ms ease-out';
  }

  const light = doc.createElement('div');
  light.className = 'lab-fx-light';
  light.setAttribute('aria-hidden', 'true');
  light.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:4;border-radius:inherit;background:radial-gradient(420px 280px at 50% 20%, #f2d27c33, transparent 62%);mix-blend-mode:soft-light;transition:background 80ms linear';
  playEl.append(light);

  const canvas = doc.createElement('canvas');
  canvas.className = 'lab-fx-particles';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3';
  playEl.append(canvas);
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) { light.remove(); canvas.remove(); return nop; }

  let w = 0, h = 0, raf = 0, alive = true;
  const bits = [];
  const resize = () => {
    const r = playEl.getBoundingClientRect();
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    w = Math.max(1, Math.floor(r.width));
    h = Math.max(1, Math.floor(r.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const ro = globalThis.ResizeObserver ? new ResizeObserver(resize) : null;
  ro?.observe(playEl);

  const spawn = (ok, n = 14) => {
    const cx = w * 0.5, cy = h * 0.42;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      const sp = 1.6 + Math.random() * 2.8;
      bits.push({
        x: cx, y: cy, z: 40 + Math.random() * 80,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2, vz: (Math.random() - 0.3) * 3,
        life: 1, ok, color: ok ? (Math.random() < 0.5 ? '#f2d27c' : '#fffaf0') : '#a8442f',
        size: 2.2 + Math.random() * 2.4,
      });
    }
  };

  const tick = () => {
    if (!alive) return;
    ctx2d.clearRect(0, 0, w, h);
    const fl = 520;
    for (let i = bits.length - 1; i >= 0; i--) {
      const p = bits[i];
      p.x += p.vx; p.y += p.vy; p.z += p.vz; p.vy += 0.06; p.life -= 0.018;
      if (p.life <= 0 || p.z <= -400) { bits.splice(i, 1); continue; }
      const s = fl / (fl + p.z);
      const px = w * 0.5 + (p.x - w * 0.5) * s;
      const py = h * 0.45 + (p.y - h * 0.45) * s;
      ctx2d.globalAlpha = Math.max(0, p.life) * 0.9;
      ctx2d.fillStyle = p.color;
      ctx2d.beginPath();
      ctx2d.arc(px, py, Math.max(0.6, p.size * s), 0, Math.PI * 2);
      ctx2d.fill();
      // soft glow, still a fill (no CSS keyframes)
      ctx2d.globalAlpha = Math.max(0, p.life) * 0.25;
      ctx2d.beginPath();
      ctx2d.arc(px, py, Math.max(1, p.size * s * 2.4), 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.globalAlpha = 1;
    raf = bits.length ? globalThis.requestAnimationFrame(tick) : 0;
  };

  const onMove = (ev) => {
    if (!alive || !board) return;
    const r = playEl.getBoundingClientRect();
    const nx = ((ev.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((ev.clientY - r.top) / r.height) * 2 - 1;
    const rx = Math.max(-8, Math.min(8, -ny * 7));
    const ry = Math.max(-10, Math.min(10, nx * 9));
    board.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(16px)`;
    light.style.background = `radial-gradient(420px 280px at ${50 + nx * 18}% ${22 + ny * 14}%, #f2d27c3d, transparent 62%)`;
  };
  const onLeave = () => {
    if (board) board.style.transform = 'rotateX(4deg) rotateY(0deg) translateZ(10px)';
    light.style.background = 'radial-gradient(420px 280px at 50% 20%, #f2d27c33, transparent 62%)';
  };
  onLeave();
  playEl.addEventListener('pointermove', onMove);
  playEl.addEventListener('pointerleave', onLeave);

  return {
    react(ok, info = {}) {
      if (!alive) return;
      spawn(!!ok, ok ? (info.run >= 5 ? 22 : 14) : 8);
      if (!raf) raf = globalThis.requestAnimationFrame(tick);
    },
    destroy() {
      alive = false;
      if (raf) globalThis.cancelAnimationFrame(raf);
      raf = 0;
      playEl.removeEventListener('pointermove', onMove);
      playEl.removeEventListener('pointerleave', onLeave);
      ro?.disconnect();
      light.remove();
      canvas.remove();
      playEl.classList.remove('lab-fx-on');
      playEl.style.perspective = '';
      if (board) { board.style.transform = ''; board.style.transformStyle = ''; }
    },
  };
}
