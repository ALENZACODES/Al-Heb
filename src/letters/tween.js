// Pose tween: pure interpolation of draft animation poses (docs/anim/README.md) plus a small player.
// Nothing runs on import. playPoses() animates only when it is called (a press), uses requestAnimationFrame,
// shows the last pose at once under prefers-reduced-motion or data-calm, and never loops or restarts by itself.
// Pose files are loaded by the caller on demand; this module does not fetch anything and is not in the first-install cache's path.
// Importable in Node: no DOM access happens at module level.

export const MAX_TOTAL_MS = 3000;
const ARITY = { M: 2, L: 2, C: 6, Z: 0 };

export const easings = {
  linear: (t) => t,
  'ease-in-out': (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2),
  'ease-out': (t) => 1 - (1 - t) ** 3,
};
/** Easing function by contract name; unknown names fall back to ease-in-out. */
export function getEasing(name) { return easings[name] || easings['ease-in-out']; }
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Parse "M 1 2 L 3 4 Z" (absolute M/L/C/Z, whole numbers) into { cmds: 'MLZ', nums: [1,2,3,4] }. Returns null if not that form. */
export function parsePathD(d) {
  const toks = String(d ?? '').trim().split(/[\s,]+/).filter(Boolean);
  let cmds = '';
  const nums = [];
  for (let i = 0; i < toks.length;) {
    const c = toks[i++];
    if (!(c in ARITY)) return null;
    cmds += c;
    for (let k = 0; k < ARITY[c]; k++) {
      const v = Number(toks[i++]);
      if (!Number.isFinite(v)) return null;
      nums.push(v);
    }
  }
  return cmds && cmds[0] === 'M' ? { cmds, nums } : null;
}

/** Can these two path strings be tweened (same command letters in the same order)? */
export function compatible(a, b) {
  const pa = parsePathD(a), pb = parsePathD(b);
  return !!(pa && pb && pa.cmds === pb.cmds);
}

/** Interpolate two compatible path strings. t is clamped to 0..1; t=0 and t=1 return the inputs' exact numbers. Throws if not compatible. */
export function lerpPath(a, b, t) {
  const pa = parsePathD(a), pb = parsePathD(b);
  if (!pa || !pb || pa.cmds !== pb.cmds) throw new Error('paths are not compatible');
  t = clamp01(t);
  const n = pa.nums.map((v, i) => Math.round((v + (pb.nums[i] - v) * t) * 100) / 100);
  let out = [], k = 0;
  for (const c of pa.cmds) { out.push(c); for (let j = 0; j < ARITY[c]; j++) out.push(n[k++]); }
  return out.join(' ');
}

/** Read one pose SVG string into { title, desc, paths: [{id, d, fill, stroke, ...attrs}] }. Regex based, for the draft contract's plain files. */
export function parsePoseSvg(text) {
  const title = ((String(text).match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || '').trim();
  const desc = ((String(text).match(/<desc[^>]*>([\s\S]*?)<\/desc>/) || [])[1] || '').trim();
  const paths = [];
  for (const m of String(text).matchAll(/<path\b([^>]*?)\/?>/g)) {
    const attrs = {};
    for (const a of m[1].matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    paths.push(attrs);
  }
  return { title, desc, paths };
}

/**
 * Check a pose list: [{ time_ms, easing, paths: [{id, d, opacity?}] }, ...]. Returns '' when fine, else the first problem.
 * Same path count and ids, same commands per path, times strictly increasing.
 */
export function validatePoses(poses) {
  if (!Array.isArray(poses) || poses.length < 1) return 'no poses';
  const first = poses[0];
  let prev = -1;
  for (let i = 0; i < poses.length; i++) {
    const p = poses[i];
    if (!Array.isArray(p?.paths) || !p.paths.length) return `pose ${i + 1} has no paths`;
    if (!Number.isFinite(p.time_ms) || p.time_ms <= prev) return `pose ${i + 1} time is not increasing`;
    prev = p.time_ms;
    if (p.paths.length !== first.paths.length) return `pose ${i + 1} has a different path count`;
    for (let k = 0; k < p.paths.length; k++) {
      if (p.paths[k].id !== first.paths[k].id) return `pose ${i + 1} path ${k + 1} has a different id`;
      if (!compatible(first.paths[k].d, p.paths[k].d)) return `pose ${i + 1} path ${k + 1} has different commands`;
    }
  }
  return '';
}

/** Total length in ms after the cap of MAX_TOTAL_MS (longer sets are scaled down, never stretched). */
export function totalMs(poses) {
  const last = poses[poses.length - 1]?.time_ms || 0;
  return Math.min(last, MAX_TOTAL_MS);
}
const scaleOf = (poses) => { const last = poses[poses.length - 1]?.time_ms || 0; return last > MAX_TOTAL_MS ? MAX_TOTAL_MS / last : 1; };

/**
 * The picture at time tMs (0 = first pose, past the end = last pose). Pure.
 * Between pose i and i+1 the progress is eased with the easing of the pose being arrived at (so k6 'ease-out' settles).
 * Returns [{id, d, opacity, ...static attrs of the earlier pose}] in path order.
 */
export function sampleFrame(poses, tMs) {
  const sc = scaleOf(poses);
  const t = Number.isFinite(tMs) ? tMs : 0;
  if (poses.length === 1 || t <= poses[0].time_ms * sc) return poses[0].paths.map((p) => ({ ...p }));
  const lastI = poses.length - 1;
  if (t >= poses[lastI].time_ms * sc) return poses[lastI].paths.map((p) => ({ ...p }));
  let i = 0;
  while (i < lastI - 1 && t >= poses[i + 1].time_ms * sc) i++;
  const a = poses[i], b = poses[i + 1];
  const span = (b.time_ms - a.time_ms) * sc;
  const e = getEasing(b.easing)(clamp01((t - a.time_ms * sc) / span));
  return a.paths.map((pa, k) => {
    const pb = b.paths[k];
    const oa = pa.opacity === undefined ? 1 : Number(pa.opacity), ob = pb.opacity === undefined ? 1 : Number(pb.opacity);
    return { ...pa, d: lerpPath(pa.d, pb.d, e), opacity: Math.round((oa + (ob - oa) * e) * 1000) / 1000 };
  });
}

/** True when motion should be skipped: opts.reduced if given, else prefers-reduced-motion, or data-calm on the host or the page root. */
export function isReduced(host, opts = {}) {
  if (typeof opts.reduced === 'boolean') return opts.reduced;
  try { if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return true; } catch { /* ignore */ }
  try { if (host?.closest?.('[data-calm]')) return true; } catch { /* ignore */ }
  try { if (typeof document !== 'undefined' && document.documentElement?.hasAttribute?.('data-calm')) return true; } catch { /* ignore */ }
  return false;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const running = new WeakMap(); // host -> controller

function ensureSvg(host, poses, pose0) {
  const doc = host.ownerDocument || (typeof document !== 'undefined' ? document : null);
  while (host.firstChild) host.removeChild(host.firstChild);
  const svg = doc.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.setAttribute('aria-hidden', 'true'); // the caption next to the picture carries the meaning
  svg.setAttribute('focusable', 'false');
  const nodes = pose0.paths.map((p) => {
    const n = doc.createElementNS(SVG_NS, 'path');
    for (const [k, v] of Object.entries(p)) if (k !== 'd' && k !== 'opacity') n.setAttribute(k, v);
    svg.appendChild(n);
    return n;
  });
  host.appendChild(svg);
  return nodes;
}
function paint(nodes, frame) {
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].setAttribute('d', frame[i].d);
    nodes[i].setAttribute('opacity', String(frame[i].opacity ?? 1));
  }
}

/**
 * Play poses into host (an element). Call it from a press handler; it never starts by itself.
 * @param {Element} host
 * @param {Array<{time_ms:number, easing?:string, paths:Array<{id:string,d:string,opacity?:string|number}>}>} poses
 * @param {{reduced?:boolean, raf?:Function, caf?:Function, now?:()=>number, onDone?:()=>void}} [opts]
 * @returns {{done:Promise<'finished'|'cancelled'|'still'>, cancel:()=>void, finish:()=>void, readonly reducedMotion:boolean, readonly state:string}}
 *  A second call on the same host cancels the first. With reduced motion, calm mode or poses that cannot be tweened, the last pose is
 *  drawn at once and no frame is requested.
 */
export function playPoses(host, poses, opts = {}) {
  running.get(host)?.cancel();
  const raf = opts.raf || (typeof requestAnimationFrame === 'function' ? requestAnimationFrame.bind(globalThis) : null);
  const caf = opts.caf || (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame.bind(globalThis) : null);
  const now = opts.now || (typeof performance !== 'undefined' ? () => performance.now() : Date.now);
  const bad = validatePoses(poses);
  let state = 'idle', handle = null, resolve;
  const done = new Promise((r) => { resolve = r; });
  const reduced = isReduced(host, opts);
  const ctl = {
    done, reducedMotion: reduced || !!bad,
    get state() { return state; },
    cancel() { if (state !== 'playing') return; state = 'cancelled'; if (handle != null && caf) caf(handle); handle = null; running.delete(host); resolve('cancelled'); },
    finish() { if (state === 'finished' || state === 'still') return; if (handle != null && caf) caf(handle); handle = null; showFinal(); state = state === 'playing' ? 'finished' : state; running.delete(host); resolve('finished'); if (opts.onDone) opts.onDone(); },
  };
  if (bad) { // never throw into the UI; show what we can
    const last = Array.isArray(poses) && poses[poses.length - 1]?.paths?.length ? poses[poses.length - 1] : null;
    if (last) { const n = ensureSvg(host, poses, last); paint(n, last.paths); }
    state = 'still'; resolve('still'); ctl.error = bad; return ctl;
  }
  const nodes = ensureSvg(host, poses, poses[0]);
  const showFinal = () => paint(nodes, poses[poses.length - 1].paths);
  if (reduced || !raf || poses.length === 1) { showFinal(); state = 'still'; resolve('still'); if (opts.onDone) opts.onDone(); return ctl; }
  const total = totalMs(poses);
  paint(nodes, sampleFrame(poses, 0));
  state = 'playing';
  running.set(host, ctl);
  let start = null;
  const step = (ts) => {
    if (state !== 'playing') return;
    const t = typeof ts === 'number' ? ts : now();
    if (start === null) start = t;
    const el = t - start; // a frame is a pure function of elapsed time: a late frame skips ahead, it never replays or flickers
    if (el >= total) { showFinal(); state = 'finished'; handle = null; running.delete(host); resolve('finished'); if (opts.onDone) opts.onDone(); return; }
    paint(nodes, sampleFrame(poses, el));
    handle = raf(step);
  };
  handle = raf(step);
  return ctl;
}

/** Build a pose list from the draft batch JSON records plus the SVG texts: records [{file,pose,time_ms,easing}], texts {file: svgString}. */
export function posesFromRecords(records, texts) {
  return [...records].sort((a, b) => a.pose - b.pose).map((r) => ({
    time_ms: r.time_ms, easing: r.easing, title: parsePoseSvg(texts[r.file] || '').title,
    paths: parsePoseSvg(texts[r.file] || '').paths,
  }));
}
